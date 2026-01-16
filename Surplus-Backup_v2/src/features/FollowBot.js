import { gameManager, settings, inputState } from '@/core/state.js';
import { translations } from '@/core/obfuscatedNameTranslator.js';
import { inputCommands, findTeam } from '@/utils/constants.js';
import { outer } from '@/core/outer.js';

const state = {
  isMaster: false,
  isSlave: false,
  channel: null,
  data: null,
  masterId: null,
  slaveId: null,
};

const CHANNEL = 'survevhack_fb';
let lastWeap = -1;
let lastHeal = { hb: false, hh: false, hs: false, hp: false };
let lastHealAction = null;
const debugState = {
  el: null,
  update: (text) => {
    if (!debugState.el) {
      const d = document.createElement('div');
      d.style.position = 'fixed';
      d.style.bottom = '10px';
      d.style.left = '10px';
      d.style.backgroundColor = 'rgba(0,0,0,0.5)';
      d.style.color = '#fff';
      d.style.padding = '5px';
      d.style.fontSize = '12px';
      d.style.zIndex = '999999';
      d.style.pointerEvents = 'none';
      d.id = 'followbot-debug';
      document.body.appendChild(d);
      debugState.el = d;
    }
    debugState.el.innerText = text;
  }
};

function init() {
  state.slaveId = Math.random().toString(36).substr(2, 9);
  console.log('[FollowBot] Initializing. Slave ID:', state.slaveId);

  state.channel = new BroadcastChannel(CHANNEL);
  state.channel.onmessage = (e) => {
    if (state.isSlave && settings.followBot_?.enabled_) {
      state.data = e.data;
      state.masterId = e.data.mid;
      debugState.update(`🤖 SLAVE MODE\nConnected to: ${state.masterId}\nCmd: ${e.data.ml ? 'L' : ''}${e.data.mr ? 'R' : ''}${e.data.mu ? 'U' : ''}${e.data.md ? 'D' : ''}`);

      // Détecter nouvelle action de heal
      const ha = e.data.ha;
      if (ha && ha !== lastHealAction) {
        if (ha === 'bandage') inputState.queuedInputs_.push(23);
        else if (ha === 'healthkit') inputState.queuedInputs_.push(24);
        else if (ha === 'soda') inputState.queuedInputs_.push(25);
        else if (ha === 'painkiller') inputState.queuedInputs_.push(26);
      }
      lastHealAction = ha;
    }
  };
  console.log('[FollowBot] Channel Ready:', CHANNEL);

  // ANTI-FREEZE WORKER
  if (state.isSlave) {
    try {
      const blob = new Blob([`
        setInterval(() => {
          postMessage('tick');
        }, 1000);
      `], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      worker.onmessage = () => { console.log('[AntiFreeze] Tick'); };
      console.log('[FollowBot] Anti-Freeze Worker Started');
    } catch (e) {
      console.error('[FollowBot] Anti-Freeze Failed:', e);
    }
  }
}

function masterTick() {
  if (!state.isMaster || !settings.followBot_?.enabled_) return;
  if (!gameManager.game?.initialized) return;

  const g = gameManager.game;
  const p = g[translations.activePlayer_];
  const ib = g[translations.inputBinds_];
  const inp = g[translations.input_];

  if (!p || !ib || !inp) return;

  let curWeap = 0;
  try {
    curWeap = p[translations.localData_][translations.curWeapIdx_];
  } catch (e) { }

  const pos = p[translations.pos_];
  const aimAngle = Math.atan2(inp.mousePos._y - outer.innerHeight / 2, inp.mousePos._x - outer.innerWidth / 2);

  // Détecter l'action en cours (heal)
  let healAction = null;
  try {
    const ld = p[translations.localData_];
    // Chercher une propriété qui ressemble à une action
    for (const key in ld) {
      const val = ld[key];
      if (val && typeof val === 'object' && val.type) {
        healAction = val.type;
        break;
      }
    }
  } catch (e) { }

  state.channel.postMessage({
    mid: p.__id,
    ml: ib.isBindDown(0),
    mr: ib.isBindDown(1),
    mu: ib.isBindDown(2),
    md: ib.isBindDown(3),
    f: ib.isBindDown(4),
    r: ib.isBindDown(5),
    i: ib.isBindDown(7),
    a: aimAngle,
    w: curWeap,
    mx: pos.x,
    my: pos.y,
    // Action de heal
    ha: healAction,
  });
}

function findMaster() {
  if (!state.masterId) return null;
  const g = gameManager.game;
  const players = g[translations.playerBarn_]?.playerPool?.[translations.pool_];
  const me = g[translations.activePlayer_];
  if (!players || !me) return null;

  for (const p of players) {
    if (!p.active) continue;
    if (p[translations.netData_]?.[translations.dead_]) continue;
    if (p.__id === me.__id) continue;
    if (p.__id === state.masterId) return p;
  }
  return null;
}

function getFormationOffset() {
  const hash = state.slaveId.charCodeAt(0) + state.slaveId.charCodeAt(1);
  const index = hash % 4;

  const offsets = [
    { x: -2, y: 0.5 },
    { x: 2, y: 0.5 },
    { x: -1.5, y: 1.5 },
    { x: 1.5, y: 1.5 },
  ];

  return offsets[index];
}

export function applySlaveInputsToPacket(packet) {
  if (!state.isSlave || !settings.followBot_?.enabled_) return;

  const g = gameManager.game;
  const me = g?.[translations.activePlayer_];
  if (!me) return;

  const d = state.data;
  if (!d) return;

  // === MOUVEMENT ===
  if (settings.followBot_.followMaster_) {
    const master = findMaster();
    if (!master) {
      // Debug log limited
      if (Math.random() < 0.01) console.warn('[FollowBot] Master NOT FOUND in player pool');
    }

    if (master) {
      const mp = master[translations.pos_];
      const sp = me[translations.pos_];

      const offset = getFormationOffset();
      const aimAngle = d.a || 0;

      const behindAngle = aimAngle + Math.PI;
      const targetX = mp.x + Math.cos(behindAngle) * 2 + offset.x;
      const targetY = mp.y + Math.sin(behindAngle) * 2 + offset.y;

      const dx = targetX - sp.x;
      const dy = targetY - sp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0.1) {
        packet.moveRight = dx > 0.05;
        packet.moveLeft = dx < -0.05;
        packet.moveUp = dy > 0.05;
        packet.moveDown = dy < -0.05;
      }

      if (d.ml || d.mr || d.mu || d.md) {
        if (d.ml) packet.moveLeft = true;
        if (d.mr) packet.moveRight = true;
        if (d.mu) packet.moveUp = true;
        if (d.md) packet.moveDown = true;
      }
    }
  } else {
    packet.moveLeft = d.ml;
    packet.moveRight = d.mr;
    packet.moveUp = d.mu;
    packet.moveDown = d.md;
  }

  // === TIR ===
  if (d.f) {
    packet.shootStart = true;
    packet.shootHold = true;
  }

  // === RELOAD & INTERACT ===
  if (d.r && packet.addInput) packet.addInput(5);
  if (d.i && packet.addInput) packet.addInput(7);

  // === CHANGEMENT D'ARME ===
  if (d.w !== undefined && d.w !== lastWeap && packet.addInput) {
    if (d.w === 0) packet.addInput(11);
    else if (d.w === 1) packet.addInput(12);
    else if (d.w === 2) packet.addInput(13);
    else if (d.w === 3) packet.addInput(14);
    lastWeap = d.w;
  }

  // === VISÉE ===
  if (d.a !== undefined) {
    const inp = g[translations.input_];
    if (inp?.mousePos) {
      inp.mousePos._x = outer.innerWidth / 2 + Math.cos(d.a) * 200;
      inp.mousePos._y = outer.innerHeight / 2 + Math.sin(d.a) * 200;
    }
  }
}

export function setMasterMode(v) {
  console.log('[FollowBot] SetMasterMode:', v);
  state.isMaster = v;
  state.isSlave = false;
  state.data = null;
  state.masterId = null;
}

export function setSlaveMode(v) {
  console.log('[FollowBot] SetSlaveMode:', v);
  state.isSlave = v;
  state.isMaster = false;
  lastWeap = -1;
  lastHeal = { hb: false, hh: false, hs: false, hp: false };
}

export function getFollowBotState() {
  return { isMaster: state.isMaster, isSlave: state.isSlave };
}

let done = false;
export default function () {
  if (done) return;
  done = true;
  init();
  const i = setInterval(() => {
    if (gameManager?.pixi?._ticker) {
      clearInterval(i);
      gameManager.pixi._ticker.add(masterTick);
    }
  }, 50);
}
