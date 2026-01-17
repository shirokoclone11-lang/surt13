// ============================================
// DESYNC - OPTIMAL WEAPON SWITCHING
// Basé sur le système de Free Switch (nouvelle mécanique)
// ============================================

import { translations } from '@/core/obfuscatedNameTranslator.js';
import { gameManager, inputState, settings } from '@/core/state.js';
import { isHandledByWeaponSwitch } from '@/features/AutoSwitch.js';
import { gameObjects, inputCommands, isGameReady } from '@/utils/constants.js';

// ============================================
// FREE SWITCH CONSTANTS
// ============================================
const FREE_SWITCH_DELAY = 0.25; // 250ms
const FREE_SWITCH_COOLDOWN = 1.0; // 1000ms

// ============================================
// WEAPON DATA
// ============================================

// Switch delays (en secondes)
const SWITCH_DELAYS = {
  // Snipers - 1s
  'sv98': 1.0,
  'mosin': 1.0,
  'awc': 1.0,
  'scout': 1.0,
  'blr': 1.0,
  'model94': 1.0,

  // Shotguns lents - 0.9s
  'm870': 0.9,
  'm1100': 0.9,
  'saiga': 0.9,

  // AR/SMG/Shotguns - 0.75s
  'mp5': 0.75,
  'mac10': 0.75,
  'ump9': 0.75,
  'vector': 0.75,
  'ak47': 0.75,
  'scar': 0.75,
  'groza': 0.75,
  'grozas': 0.75,
  'an94': 0.75,
  'spas12': 0.75,
  'super90': 0.75,
  'usas': 0.75,
  'm39': 0.75,
  'svd': 0.75,
  'mk12': 0.75,
  'garand': 0.75,
  'famas': 0.75,
  'hk416': 0.75,
  'm4a1': 0.75,
  'dp28': 0.75,
  'bar': 0.75,
  'pkp': 0.75,
  'm249': 0.75,
  'qbb97': 0.75,
  'l86': 0.75,
  'scarssr': 0.75,

  // Pistols non-9mm - 0.3s
  'mp220': 0.3,
  'deagle': 0.3,
  'ot38': 0.3,
  'ots38': 0.3,
  'm1911': 0.3,
  'p30l': 0.3,
  'peacemaker': 0.3,
  'flare_gun': 0.3,

  // 9mm Pistols - 0.25s
  'm9': 0.25,
  'glock': 0.25,
  'm93r': 0.25,
  'vss': 0.25,
  'scorpion': 0.25,
};

// Deploy groups - armes avec le même groupe ne peuvent pas bénéficier de free switch
const DEPLOY_GROUPS = {
  // Snipers
  'sv98': 'sniper',
  'mosin': 'sniper',
  'awc': 'sniper',
  'scout': 'sniper',
  'blr': 'sniper',
  'model94': 'sniper',

  // Shotguns
  'm870': 'shotgun',
  'm1100': 'shotgun',
  'saiga': 'shotgun',
  'spas12': 'shotgun',
  'super90': 'shotgun',
  'usas': 'shotgun',

  // AR/DMR
  'ak47': 'rifle',
  'scar': 'rifle',
  'groza': 'rifle',
  'grozas': 'rifle',
  'an94': 'rifle',
  'm39': 'rifle',
  'svd': 'rifle',
  'mk12': 'rifle',
  'garand': 'rifle',
  'famas': 'rifle',
  'hk416': 'rifle',
  'm4a1': 'rifle',
  'scarssr': 'rifle',

  // SMG
  'mp5': 'smg',
  'mac10': 'smg',
  'ump9': 'smg',
  'vector': 'smg',

  // LMG
  'dp28': 'lmg',
  'bar': 'lmg',
  'pkp': 'lmg',
  'm249': 'lmg',
  'qbb97': 'lmg',
  'l86': 'lmg',

  // Pistols
  'mp220': 'pistol',
  'deagle': 'pistol',
  'ot38': 'pistol',
  'ots38': 'pistol',
  'm1911': 'pistol',
  'p30l': 'pistol',
  'peacemaker': 'pistol',
  'flare_gun': 'pistol',
  'm9': 'pistol',
  'glock': 'pistol',
  'm93r': 'pistol',
  'vss': 'pistol',
  'scorpion': 'pistol',
};

// ============================================
// STATE
// ============================================

const desyncState = {
  active_: false,
  currentCycle_: null,
  cycleIndex_: 0,
  lastSwitchTime_: 0,
  lastFreeSwitch_: 0,
  lastWeapon0_: null,
  lastWeapon1_: null,
  lastWeaponIndex_: -1,
  lastShotTime_: 0,
  fireTimer_: 0,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getSwitchDelay = (weaponType) => {
  if (!weaponType) return 0.75;
  const type = weaponType.toLowerCase().replace(/[-_\s]/g, '');

  for (const [key, delay] of Object.entries(SWITCH_DELAYS)) {
    if (type.includes(key) || key.includes(type)) {
      return delay;
    }
  }

  // Fallback: lire depuis gameObjects
  try {
    const weapon = gameObjects[weaponType];
    if (weapon?.switchDelay) return weapon.switchDelay;
  } catch { }

  return 0.75;
};

const getDeployGroup = (weaponType) => {
  if (!weaponType) return null;
  const type = weaponType.toLowerCase().replace(/[-_\s]/g, '');
  
  for (const [key, group] of Object.entries(DEPLOY_GROUPS)) {
    if (type.includes(key) || key.includes(type)) {
      return group;
    }
  }
  return null;
};

const getEffectiveSwitchDelay = (oldWeaponType, newWeaponType, canFreeSwitchNow) => {
  // Si c'est vers melee/throwables, effective delay = 0
  // (on simule avec primary/secondary seulement)

  if (!canFreeSwitchNow) {
    return getSwitchDelay(newWeaponType);
  }

  // Vérifier les deploy groups
  const oldGroup = getDeployGroup(oldWeaponType);
  const newGroup = getDeployGroup(newWeaponType);

  // Si même groupe et que switch delay > 250ms, applique switch delay
  // Sinon, free switch = 250ms
  if (oldGroup && newGroup && oldGroup === newGroup) {
    return getSwitchDelay(newWeaponType);
  }

  return FREE_SWITCH_DELAY;
};

const getWeaponFireDelay = (weaponType) => {
  try {
    const weapon = gameObjects[weaponType];
    return weapon?.fireDelay || 0.1;
  } catch {
    return 0.1;
  }
};

const isDesyncCompatible = (weaponType) => {
  if (!weaponType) return false;
  const type = weaponType.toLowerCase();

  // Armes qui bénéficient du desync (tir lent)
  const compatiblePatterns = [
    'sv98', 'mosin', 'awc', 'scout', 'blr', 'model94', // Snipers
    'm870', 'saiga', 'spas12', 'super90', 'm1100', 'usas', // Shotguns
    'mp220', // Double barrel pistol
    'deagle', 'ot38', 'ots38', 'peacemaker', // Pistols lents
    'garand', 'm39', 'svd', 'mk12', 'scarssr', // DMRs
  ];

  return compatiblePatterns.some(p => type.includes(p));
};

// ============================================
// OPTIMAL TIMING CALCULATION
// Basé sur Free Switch mechanics
// ============================================

/**
 * Calcule l'attente optimale entre 2 tirs basée sur free switch
 * Retourne un cycle de tirs et switchs
 */
const generateOptimalCycle = (weapon0Type, weapon1Type) => {
  const delay0 = getSwitchDelay(weapon0Type);
  const delay1 = getSwitchDelay(weapon1Type);
  const fireDelay0 = getWeaponFireDelay(weapon0Type);
  const fireDelay1 = getWeaponFireDelay(weapon1Type);
  const group0 = getDeployGroup(weapon0Type);
  const group1 = getDeployGroup(weapon1Type);
  const differentGroups = group0 !== group1;

  // ============================================
  // CAS SPÉCIAUX DOCUMENTÉS
  // ============================================

  // MP220 (0.3) + M870 (0.9) - Triple shot
  if ((delay0 === 0.3 && delay1 === 0.9) || (delay0 === 0.9 && delay1 === 0.3)) {
    const fastIdx = delay0 === 0.3 ? 0 : 1;
    const slowIdx = delay0 === 0.3 ? 1 : 0;
    return [
      { weapon: fastIdx, shoot: true, wait: 0.25 },  // shoot fastIdx
      { weapon: slowIdx, shoot: true, wait: 0.25 },  // switch + shoot slowIdx (free switch 0.25)
      { weapon: fastIdx, shoot: true, wait: 0.30 },  // shoot fastIdx again
    ];
  }

  // MP220 (0.3) + SPAS (0.75) - Double shot
  if ((delay0 === 0.3 && delay1 === 0.75) || (delay0 === 0.75 && delay1 === 0.3)) {
    const fastIdx = delay0 === 0.3 ? 0 : 1;
    const slowIdx = delay0 === 0.3 ? 1 : 0;
    return [
      { weapon: fastIdx, shoot: true, wait: 0.25 },
      { weapon: slowIdx, shoot: true, wait: 0.25 },
      { weapon: fastIdx, shoot: true, wait: 0.30 },
    ];
  }

  // M870 (0.9) + SPAS (0.75) - Double pump
  if ((delay0 === 0.9 && delay1 === 0.75) || (delay0 === 0.75 && delay1 === 0.9)) {
    const pump1Idx = delay0 === 0.9 ? 0 : 1;
    const pump2Idx = delay0 === 0.9 ? 1 : 0;
    return [
      { weapon: pump1Idx, shoot: true, wait: 0.90 },  // shoot pump1
      { weapon: pump2Idx, shoot: true, wait: 0.25 },  // free switch + shoot pump2 (0.25)
      { weapon: pump1Idx, shoot: true, wait: 0.90 },  // shoot pump1
    ];
  }

  // M870 (0.9) + Sniper (1.0)
  if ((delay0 === 0.9 && delay1 === 1.0) || (delay0 === 1.0 && delay1 === 0.9)) {
    const slowShotIdx = delay0 === 0.9 ? 1 : 0;
    const fastShotIdx = delay0 === 0.9 ? 0 : 1;
    return [
      { weapon: fastShotIdx, shoot: true, wait: 0.90 },
      { weapon: slowShotIdx, shoot: true, wait: 0.25 },  // free switch (0.25)
      { weapon: fastShotIdx, shoot: true, wait: 0.90 },
    ];
  }

  // SPAS (0.75) + Sniper (1.0)
  if ((delay0 === 0.75 && delay1 === 1.0) || (delay0 === 1.0 && delay1 === 0.75)) {
    const spasIdx = delay0 === 0.75 ? 0 : 1;
    const sniperIdx = delay0 === 0.75 ? 1 : 0;
    return [
      { weapon: spasIdx, shoot: true, wait: 0.75 },
      { weapon: sniperIdx, shoot: true, wait: 0.25 },  // free switch (0.25)
      { weapon: spasIdx, shoot: true, wait: 0.75 },
      { weapon: sniperIdx, shoot: true, wait: 0.25 },
    ];
  }

  // Sniper (1.0) + Pistol rapide (0.25-0.3)
  if ((delay0 === 1.0 && delay1 <= 0.3) || (delay0 <= 0.3 && delay1 === 1.0)) {
    const sniperIdx = delay0 === 1.0 ? 0 : 1;
    const pistolIdx = delay0 === 1.0 ? 1 : 0;
    return [
      { weapon: pistolIdx, shoot: true, wait: 0.30 },
      { weapon: pistolIdx, shoot: true, wait: 0.30 },
      { weapon: pistolIdx, shoot: true, wait: 0.30 },
      { weapon: sniperIdx, shoot: true, wait: 0.10 },  // sniper double-shot
    ];
  }

  // ============================================
  // FALLBACK - Cycle simple basé sur Free Switch
  // ============================================
  
  // Pour 2 armes de délais différents
  if (Math.abs(delay0 - delay1) > 0.01) {
    const fasterIdx = delay0 < delay1 ? 0 : 1;
    const slowerIdx = delay0 < delay1 ? 1 : 0;
    const fasterDelay = Math.min(delay0, delay1);
    const slowerDelay = Math.max(delay0, delay1);

    return [
      { weapon: fasterIdx, shoot: true, wait: fasterDelay },
      { weapon: slowerIdx, shoot: true, wait: FREE_SWITCH_DELAY },  // free switch
      { weapon: fasterIdx, shoot: true, wait: fasterDelay },
    ];
  }

  // 2 armes avec même délai
  return [
    { weapon: 0, shoot: true, wait: delay0 },
    { weapon: 1, shoot: true, wait: FREE_SWITCH_DELAY },
    { weapon: 0, shoot: true, wait: delay0 },
  ];
};

// ============================================
// MAIN LOGIC - EXECUTE DESYNC CYCLE
// ============================================

const WEAPON_COMMANDS = [inputCommands.EquipPrimary_, inputCommands.EquipSecondary_];

const switchWeapon = (weaponIndex) => {
  inputState.queuedInputs_.push(WEAPON_COMMANDS[weaponIndex]);
};

const shootWeapon = () => {
  // Queue tir (simulé via inputState)
  inputState.mouseDown_ = true;
  inputState.mouseDown_ = false;
};

const handleDesync = () => {
  if (!isGameReady() || !settings.desync_?.enabled_) {
    desyncState.active_ = false;
    desyncState.currentCycle_ = null;
    return;
  }

  try {
    const game = gameManager.game;
    const player = game[translations.activePlayer_];
    const localData = player[translations.localData_];
    const currentWeaponIndex = localData[translations.curWeapIdx_];
    const weapons = localData[translations.weapons_];

    // Seulement pour armes 0 et 1
    if (currentWeaponIndex !== 0 && currentWeaponIndex !== 1) {
      desyncState.active_ = false;
      return;
    }

    const weapon0 = weapons[0];
    const weapon1 = weapons[1];

    if (!weapon0 || !weapon1) {
      desyncState.active_ = false;
      return;
    }

    // Vérifier si les armes ont changé
    if (weapon0.type !== desyncState.lastWeapon0_ || weapon1.type !== desyncState.lastWeapon1_) {
      desyncState.lastWeapon0_ = weapon0.type;
      desyncState.lastWeapon1_ = weapon1.type;
      desyncState.currentCycle_ = null;
      desyncState.cycleIndex_ = 0;
      desyncState.lastSwitchTime_ = Date.now();
      desyncState.lastFreeSwitch_ = Date.now();
    }

    // Vérifier si WeaponSwitch gère ces armes (priorité à WeaponSwitch)
    if (isHandledByWeaponSwitch(weapon0.type) || isHandledByWeaponSwitch(weapon1.type)) {
      desyncState.active_ = false;
      return;
    }

    // Vérifier si les 2 armes sont compatibles avec Desync
    if (!isDesyncCompatible(weapon0.type) && !isDesyncCompatible(weapon1.type)) {
      desyncState.active_ = false;
      return;
    }

    // Activer le desync
    desyncState.active_ = true;

    // Générer le cycle si nécessaire
    if (!desyncState.currentCycle_) {
      desyncState.currentCycle_ = generateOptimalCycle(weapon0.type, weapon1.type);
      desyncState.cycleIndex_ = 0;
      desyncState.lastSwitchTime_ = Date.now();
      desyncState.lastFreeSwitch_ = Date.now();
    }

    const now = Date.now();
    const cycle = desyncState.currentCycle_;
    if (!cycle || cycle.length === 0) return;

    const currentStep = cycle[desyncState.cycleIndex_];
    const timeSinceLastSwitch = (now - desyncState.lastSwitchTime_) / 1000;
    const timeSinceFreeSwitch = (now - desyncState.lastFreeSwitch_) / 1000;

    // Vérifier si c'est le moment d'exécuter cette étape
    if (timeSinceLastSwitch >= currentStep.wait) {
      // Switch vers l'arme si nécessaire
      if (currentWeaponIndex !== currentStep.weapon) {
        switchWeapon(currentStep.weapon);

        // Mettre à jour le free switch timer
        if (timeSinceFreeSwitch >= FREE_SWITCH_COOLDOWN) {
          desyncState.lastFreeSwitch_ = now;
        }
      }

      // Passer à l'étape suivante
      desyncState.cycleIndex_ = (desyncState.cycleIndex_ + 1) % cycle.length;
      desyncState.lastSwitchTime_ = now;
    }

  } catch (e) {
    desyncState.active_ = false;
  }
};

// ============================================
// EXPORT
// ============================================

export const isDesyncActive = () => desyncState.active_;

let initialized = false;

export default function () {
  if (initialized) return;
  initialized = true;

  const checkReady = setInterval(() => {
    if (gameManager?.pixi?._ticker) {
      clearInterval(checkReady);
      gameManager.pixi._ticker.add(handleDesync);
    }
  }, 100);
}
