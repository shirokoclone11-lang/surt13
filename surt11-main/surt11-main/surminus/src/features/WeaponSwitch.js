/**
 * ============================================
 * WEAPON SWITCH - Système de changement d'armes rapide
 * ============================================
 *
 * Permet de changer rapidement entre les armes configurées
 * pour maximiser le DPS
 */

import { translations } from '@/core/obfuscatedNameTranslator.js';
import { gameManager, inputState, settings } from '@/core/state.js';
import { gameObjects, inputCommands, isGameReady } from '@/utils/constants.js';

// ============================================
// CONSTANTES
// ============================================

const WEAPON_COMMANDS = [inputCommands.EquipPrimary_, inputCommands.EquipSecondary_];


// Map des armes avec les VRAIS noms du jeu (depuis gunDefs.ts)
const WEAPON_MAP = {
  // Shotguns
  'mp220_': ['mp220'],
  'spas12_': ['spas12'],
  'm870_': ['m870'],
  'saiga_': ['saiga'],
  'super90_': ['m1014'],           // Super 90 = m1014 dans le jeu!
  'usas_': ['usas'],
  'm1100_': ['m1100'],
  // Snipers
  'mosin_': ['mosin'],
  'sv98_': ['sv98'],
  'awc_': ['awc', 'awm'],
  'scout_': ['scout'],
  'model94_': ['model94'],
  'blr_': ['blr'],
  // DMRs - NOMS EXACTS du jeu
  'mk12_': ['mk12'],               // mk12 dans le jeu
  'mk20_': ['scarssr'],            // Mk20 SSR = scarssr dans le jeu!
  'm39_': ['m39'],                 // m39 dans le jeu
  'svd_': ['svd'],                 // svd dans le jeu
  'garand_': ['garand'],           // garand dans le jeu
  // Pistols
  'ot38_': ['ot38'],
  'ots38_': ['ots38'],
  'deagle_': ['deagle'],
  'm9_': ['m9'],
  'm93r_': ['m93r'],
  'm1911_': ['m1911'],
  'p30l_': ['p30l'],
  'flare_gun_': ['flare_gun'],
  'peacemaker_': ['peacemaker'],
  // Others
  'groza_': ['groza'],
  'grozas_': ['grozas'],
  'an94_': ['an94'],
  'm1a1_': ['m1a1'],
};


// ============================================
// ÉTAT
// ============================================

const weaponState = [
  { ammo_: null, type_: '', lastSwitchTime_: 0, lastShotDate_: Date.now() },
  { ammo_: null, type_: '', lastSwitchTime_: 0, lastShotDate_: Date.now() },
];

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

const queueInput = (command) => {
  inputState.queuedInputs_.push(command);
};

const queueWeaponSwitch = (weaponIndex) => {
  queueInput(WEAPON_COMMANDS[weaponIndex]);
};

const queueWeaponCycleAndBack = (firstIndex, secondIndex) => {
  queueWeaponSwitch(firstIndex);
  queueWeaponSwitch(secondIndex);
};

const queueMeleeCycleAndBack = (weaponIndex) => {
  queueInput(inputCommands.EquipMelee_);
  queueWeaponSwitch(weaponIndex);
};

const getAlternateWeaponIndex = (index) => (index === 0 ? 1 : 0);

/**
 * Vérifie si l'arme est dans la liste WeaponSwitch
 */
const isWeaponInList = (weaponType) => {
  if (!weaponType) return false;
  const type = weaponType.toLowerCase().replace(/[-\s]/g, '_');

  for (const [settingKey, aliases] of Object.entries(WEAPON_MAP)) {
    for (const alias of aliases) {
      if (type.includes(alias) || type === alias) {
        return settings.weaponSwitch_?.[settingKey] === true;
      }
    }
  }
  return false;
};

/**
 * Vérifie si le joueur est en train de tirer
 */
const isPlayerFiring = () => {
  try {
    return (
      gameManager.game[translations.touch_]?.shotDetected ||
      gameManager.game[translations.inputBinds_]?.isBindDown(inputCommands.Fire_)
    );
  } catch {
    return false;
  }
};

// ============================================
// LOGIQUE PRINCIPALE
// ============================================

/**
 * Détermine si cette arme doit être gérée par WeaponSwitch
 * @returns 'weaponSwitch' | null
 */
const getHandlerForWeapon = (weaponType) => {
  if (settings.weaponSwitch_?.enabled_ && isWeaponInList(weaponType)) {
    return 'weaponSwitch';
  }
  return null;
};

/**
 * Exécute le switch d'arme
 */
const performSwitch = (currentWeaponIndex, otherWeaponIndex, otherWeapon, handler) => {
  const now = Date.now();

  // Cooldown entre les switch
  if (now - weaponState[currentWeaponIndex].lastSwitchTime_ < 150) {
    return;
  }

  weaponState[currentWeaponIndex].lastSwitchTime_ = now;
  weaponState[otherWeaponIndex].lastSwitchTime_ = now;
  weaponState[currentWeaponIndex].lastShotDate_ = now;

  // WeaponSwitch: switch seulement si l'autre arme est aussi dans la liste ET a des munitions
  if (isWeaponInList(otherWeapon.type) && otherWeapon.ammo > 0) {
    queueWeaponSwitch(otherWeaponIndex);
  } else if (otherWeapon.type !== '') {
    queueWeaponCycleAndBack(otherWeaponIndex, currentWeaponIndex);
  } else {
    queueMeleeCycleAndBack(currentWeaponIndex);
  }
};

/**
 * Tick principal - appelé chaque frame
 */
const weaponManagerTick = () => {
  if (!isGameReady()) return;

  // Vérifier si WeaponSwitch est activé
  if (!settings.weaponSwitch_?.enabled_) {
    return;
  }

  try {
    const game = gameManager.game;
    const player = game[translations.activePlayer_];
    if (!player) return;

    const localData = player[translations.localData_];
    if (!localData) return;

    const currentWeaponIndex = localData[translations.curWeapIdx_];

    // Seulement pour les armes primaires et secondaires (index 0 et 1)
    if (currentWeaponIndex !== 0 && currentWeaponIndex !== 1) return;

    const weapons = localData[translations.weapons_];
    if (!weapons) return;

    const currentWeapon = weapons[currentWeaponIndex];
    if (!currentWeapon) return;

    const currentState = weaponState[currentWeaponIndex];

    // Pas de changement de munitions = pas de tir
    if (currentWeapon.ammo === currentState.ammo_) return;

    const otherWeaponIndex = getAlternateWeaponIndex(currentWeaponIndex);
    const otherWeapon = weapons[otherWeaponIndex];

    // Déterminer quel système gère cette arme
    const handler = getHandlerForWeapon(currentWeapon.type);

    // Vérifier si on doit switch
    const hasFired = currentWeapon.ammo < currentState.ammo_;
    const sameWeaponType = currentWeapon.type === currentState.type_;

    const shouldSwitch = handler && sameWeaponType && hasFired;

    if (shouldSwitch) {
      console.log('[WeaponSwitch] Triggered:', currentWeapon.type, '-> switching');
      performSwitch(currentWeaponIndex, otherWeaponIndex, otherWeapon, handler);
    }

    // Mettre à jour l'état
    currentState.ammo_ = currentWeapon.ammo;
    currentState.type_ = currentWeapon.type;

  } catch (e) {
    console.error('[WeaponSwitch] Error:', e);
  }
};

// ============================================
// EXPORT POUR COMPATIBILITÉ
// ============================================

/**
 * Vérifie si une arme est gérée par WeaponSwitch
 * Utilisé par Desync.js pour éviter les conflits
 */
export const isHandledByWeaponSwitch = (weaponType) => {
  if (!settings.weaponSwitch_?.enabled_) return false;
  return isWeaponInList(weaponType);
};

// ============================================
// INITIALISATION
// ============================================

let initialized = false;

export default function () {
  if (initialized) return;
  initialized = true;

  const checkReady = setInterval(() => {
    if (gameManager?.pixi?._ticker) {
      clearInterval(checkReady);
      gameManager.pixi._ticker.add(weaponManagerTick);
      console.log('🟢 WeaponManager initialized');
    }
  }, 100);
}
