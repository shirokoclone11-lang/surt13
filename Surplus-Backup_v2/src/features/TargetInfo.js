/**
 * ============================================
 * TARGET INFO - Affiche les infos de l'ennemi ciblé
 * Nom, Distance, Arme, Casque, Armure, Sac
 * ============================================
 */

import { translations } from '@/core/obfuscatedNameTranslator.js';
import { outer } from '@/core/outer.js';
import { gameManager, settings } from '@/core/state.js';

let overlay = null;
let initialized = false;

// Créer l'overlay HTML
function createOverlay() {
  if (overlay) return;

  // Position initiale ou sauvegardée
  const savedPos = outer.localStorage.getItem('surplus_target_info_pos');
  let startX = null;
  let startY = null;

  if (savedPos) {
    try {
      const parsed = JSON.parse(savedPos);
      if (parsed.x !== undefined && parsed.y !== undefined) {
        startX = parsed.x;
        startY = parsed.y;
      }
    } catch (e) { }
  }

  overlay = outer.document.createElement('div');
  overlay.id = 'targetinfo-overlay';

  // Utiliser les positions sauvegardées ou le défaut (centré verticalement à droite)
  const cssTop = startY !== null ? `${startY}px` : '50%';
  const cssLeft = startX !== null ? `${startX}px` : 'auto';
  const cssRight = startX !== null ? 'auto' : '15px';
  const cssTransform = startY !== null ? 'none' : 'translateY(-50%)';

  overlay.style.cssText = `
    position: fixed;
    top: ${cssTop};
    left: ${cssLeft};
    right: ${cssRight};
    transform: ${cssTransform};
    background: linear-gradient(135deg, rgba(15,15,15,0.95) 0%, rgba(30,30,30,0.95) 100%);
    color: white;
    padding: 12px 16px;
    border-radius: 10px;
    border: 2px solid #ff4444;
    box-shadow: 0 0 20px rgba(255,68,68,0.3);
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 12px;
    z-index: 99999;
    pointer-events: auto; /* Activé pour le drag */
    cursor: move;
    user-select: none;
    min-width: 160px;
    display: none;
  `;

  // Gestion du Drag & Drop
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  overlay.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = overlay.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    overlay.style.opacity = '0.9';
    e.stopPropagation();
  });

  outer.window.addEventListener('mousemove', (e) => {
    if (!isDragging || !overlay) return;

    // Si on drag, on enlève le transform centré pour passer en position absolue
    overlay.style.transform = 'none';
    overlay.style.right = 'auto';

    const newX = e.clientX - dragOffsetX;
    const newY = e.clientY - dragOffsetY;

    overlay.style.left = `${newX}px`;
    overlay.style.top = `${newY}px`;
  });

  outer.window.addEventListener('mouseup', () => {
    if (isDragging && overlay) {
      isDragging = false;
      overlay.style.opacity = '1';

      // Sauvegarde de la position
      const rect = overlay.getBoundingClientRect();
      const pos = { x: rect.left, y: rect.top };
      outer.localStorage.setItem('surplus_target_info_pos', JSON.stringify(pos));
    }
  });

  outer.document.body.appendChild(overlay);
}

// Obtenir le nom d'affichage de l'arme
function getWeaponName(type) {
  if (!type) return '---';
  const t = type.toLowerCase();

  const map = {
    'mp5': 'MP5', 'mac10': 'MAC-10', 'ump9': 'UMP9', 'vector': 'Vector',
    'ak47': 'AK-47', 'scar': 'SCAR-H', 'an94': 'AN-94', 'groza': 'Groza',
    'dp28': 'DP-28', 'm249': 'M249', 'pkm': 'PKM', 'qbb97': 'QBB-97',
    'mosin': 'Mosin', 'sv98': 'SV-98', 'awc': 'AWM-S', 'scout': 'Scout',
    'model94': 'Model 94', 'blr': 'BLR 81',
    'mk12': 'Mk 12', 'mk20': 'Mk 20', 'm39': 'M39 EMR', 'svd': 'SVD-63', 'garand': 'Garand',
    'mp220': 'MP220', 'm870': 'M870', 'spas12': 'SPAS-12', 'super90': 'Super 90',
    'saiga': 'Saiga-12', 'usas': 'USAS-12', 'm1100': 'M1100',
    'deagle': 'DEagle', 'ot38': 'OT-38', 'ots38': 'OTs-38', 'm9': 'M9',
    'm93r': 'M93R', 'm1911': 'M1911', 'p30l': 'P30L', 'peacemaker': 'Peacemaker',
    'flare_gun': 'Flare Gun', 'flare': 'Flare Gun',
    'fists': 'Fists', 'karambit': 'Karambit', 'katana': 'Katana', 'pan': 'Pan',
    'machete': 'Machete', 'kukri': 'Kukri', 'bayonet': 'Bayonet',
    'famas': 'FAMAS', 'hk416': 'HK416', 'm4a1': 'M4A1-S', 'qbz83': 'QBZ-83',
    'bar': 'BAR M1918', 'm1a1': 'M1A1', 'grozas': 'Groza-S',
  };

  for (const [key, name] of Object.entries(map)) {
    if (t.includes(key)) return name;
  }
  return type.replace(/_/g, ' ');
}

// Extraire le niveau d'un équipement (0-4)
function extractLevel(value) {
  if (typeof value === 'number') return Math.min(4, Math.max(0, value));
  if (typeof value === 'string') {
    const match = value.match(/(\d+)/);
    if (match) return Math.min(4, Math.max(0, parseInt(match[1])));
  }
  return 0;
}

// Trouver les équipements dans netData
function getEquipment(netData) {
  let helmet = 0, armor = 0, backpack = 0;

  if (!netData) return { helmet, armor, backpack };

  // Parcourir toutes les propriétés
  for (const key in netData) {
    try {
      const val = netData[key];
      const keyLower = key.toLowerCase();

      // Vérifier par nom de propriété
      if (keyLower.includes('helmet') || keyLower === 'he') {
        helmet = extractLevel(val);
      }
      if (keyLower.includes('chest') || keyLower.includes('armor') || keyLower === 'ch') {
        armor = extractLevel(val);
      }
      if (keyLower.includes('backpack') || keyLower.includes('pack') || keyLower === 'bp') {
        backpack = extractLevel(val);
      }

      // Vérifier par valeur string
      if (typeof val === 'string') {
        const valLower = val.toLowerCase();
        if (valLower.includes('helmet') && helmet === 0) {
          helmet = extractLevel(val);
        }
        if ((valLower.includes('chest') || valLower.includes('vest')) && armor === 0) {
          armor = extractLevel(val);
        }
        if (valLower.includes('backpack') && backpack === 0) {
          backpack = extractLevel(val);
        }
      }
    } catch (e) { }
  }

  return { helmet, armor, backpack };
}

// Générer les barres de niveau (■■■■ pour Lv4)
function getLevelBars(level) {
  const colors = ['#666', '#4ade80', '#60a5fa', '#c084fc', '#fbbf24']; // Gris, Vert, Bleu, Violet, Or
  const color = colors[level] || colors[0];
  const maxBars = level === 4 ? 4 : 3;

  let bars = '';
  for (let i = 1; i <= maxBars; i++) {
    if (i <= level) {
      bars += `<span style="color:${color}">■</span>`;
    } else {
      bars += `<span style="color:#333">□</span>`;
    }
  }
  return bars;
}

// Trouver l'équipe d'un joueur
function getTeam(player) {
  try {
    const teamInfo = gameManager.game[translations.playerBarn_]?.teamInfo;
    if (!teamInfo) return null;

    for (const teamId of Object.keys(teamInfo)) {
      if (teamInfo[teamId].playerIds?.includes(player.__id)) {
        return teamId;
      }
    }
  } catch (e) { }
  return null;
}

// Mise à jour de l'overlay
function update() {
  if (!overlay) return;

  // Désactivé ?
  if (!settings.targetInfo_?.enabled_) {
    overlay.style.display = 'none';
    return;
  }

  // Jeu prêt ?
  const game = gameManager?.game;
  if (!game?.initialized) {
    overlay.style.display = 'none';
    return;
  }

  // Joueur local
  const me = game[translations.activePlayer_];
  if (!me) {
    overlay.style.display = 'none';
    return;
  }

  // Position du joueur
  const myPos = me[translations.visualPos_] || me.pos;
  if (!myPos) {
    overlay.style.display = 'none';
    return;
  }

  // Mon équipe
  const myTeam = getTeam(me);

  // Trouver les joueurs
  const playerBarn = game[translations.playerBarn_];
  const pool = playerBarn?.playerPool;
  if (!pool) {
    overlay.style.display = 'none';
    return;
  }

  // Essayer différentes façons d'accéder au pool
  let players = pool[translations.pool_] || pool.pool || pool.p || [];
  if (!Array.isArray(players)) {
    players = Object.values(pool).find(v => Array.isArray(v)) || [];
  }

  // Trouver l'ennemi le plus proche
  let closest = null;
  let minDist = 50 * 50; // 50m max

  for (const p of players) {
    try {
      if (!p?.active) continue;
      if (p.__id === me.__id) continue;

      // Vérifier si mort
      const nd = p[translations.netData_];
      if (nd?.[translations.dead_] || p.dead) continue;

      // Même équipe ?
      if (myTeam && getTeam(p) === myTeam) continue;

      // Position
      const pos = p[translations.visualPos_] || p.pos;
      if (!pos) continue;

      // Distance
      const dx = pos.x - myPos.x;
      const dy = pos.y - myPos.y;
      const dist = dx * dx + dy * dy;

      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    } catch (e) { }
  }

  // Pas d'ennemi ?
  if (!closest) {
    overlay.style.display = 'none';
    return;
  }

  // Récupérer les infos
  const nd = closest[translations.netData_];
  const name = closest.nameText?._text || closest.name || '???';
  const weapon = getWeaponName(nd?.[translations.activeWeapon_]);
  const dist = Math.sqrt(minDist).toFixed(0);
  const isKnocked = closest.downed || false;
  const equip = getEquipment(nd);

  // Badge knocked
  const knockedBadge = isKnocked
    ? `<div style="background:#ff4444;color:#fff;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:bold;text-align:center;margin-bottom:8px;">⚠️ KNOCKED</div>`
    : '';

  // Afficher
  overlay.innerHTML = `
    <div style="text-align:center;margin-bottom:8px;">
      <div style="color:#ff4444;font-weight:bold;font-size:14px;text-shadow:0 0 10px rgba(255,68,68,0.5);">🎯 ${name}</div>
      <div style="color:#00d4ff;font-size:11px;margin-top:2px;">${dist}m</div>
    </div>
    ${knockedBadge}
    <div style="border-top:1px solid #333;padding-top:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="color:#888;">🔫 Arme</span>
        <span style="color:#fff;font-weight:500;">${weapon}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="color:#888;">⛑️ Casque</span>
        <span>${getLevelBars(equip.helmet)} <span style="color:#888;font-size:10px;">Lv${equip.helmet}</span></span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="color:#888;">🛡️ Armure</span>
        <span>${getLevelBars(equip.armor)} <span style="color:#888;font-size:10px;">Lv${equip.armor}</span></span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="color:#888;">🎒 Sac</span>
        <span>${getLevelBars(equip.backpack)} <span style="color:#888;font-size:10px;">Lv${equip.backpack}</span></span>
      </div>
    </div>
  `;
  overlay.style.display = 'block';
}

// Initialisation
export default function init() {
  if (initialized) return;
  initialized = true;

  createOverlay();
  setInterval(update, 100);

  console.log('🟢 TargetInfo initialized');
}
