/**
 * ============================================
 * AUTO RELOAD
 * ============================================
 */

import { gameManager, inputState, settings } from '@/core/state.js';
import { translations } from '@/core/obfuscatedNameTranslator.js';
import { isGameReady, inputCommands, gameObjects, findWeapon } from '@/utils/constants.js';
import { canCastToPlayer } from '@/features/Aimbot.js';

let initialized = false;
let reloadTimer = 0;

/**
 * Check if any enemy is visible (not behind wall)
 */
function hasVisibleEnemy(player) {
  try {
    const game = gameManager.game;
    if (!game) return false;
    
    const playerManager = game[translations.playerManager_];
    const players = playerManager?.[translations.players_];
    if (!players || players.length === 0) return false;
    
    const playerId = player.__id;
    const playerPos = player[translations.visualPos_];
    const playerLayer = player.layer;
    
    const localData = player[translations.localData_];
    const curIdx = localData?.[translations.curWeapIdx_];
    const weapons = localData?.[translations.weapons_];
    
    if (curIdx === null || !weapons) return false;
    const activeWeapon = weapons[curIdx];
    if (!activeWeapon) return false;
    
    const weaponDef = gameObjects?.[activeWeapon.type];
    
    // Check each enemy
    for (const enemy of players) {
      if (!enemy.active || enemy.__id === playerId) continue;
      if (enemy[translations.netData_]?.[translations.dead_]) continue;
      
      const enemyPos = enemy[translations.visualPos_];
      if (!enemyPos) continue;
      
      // Check if we can shoot this enemy (not behind wall)
      const canShoot = canCastToPlayer(player, enemy, weaponDef, findWeapon(activeWeapon.type));
      if (canShoot) {
        return true; // Found visible enemy
      }
    }
    
    return false; // No visible enemies
  } catch {
    return false;
  }
}

function autoReloadTick() {
  const arSettings = settings.autoReload_;
  if (!arSettings?.enabled_) return;

  if (!gameManager.game) return;
  const game = gameManager.game;
  const player = game[translations.activePlayer_];

  if (!player || !player.active) return;

  const netData = player[translations.netData_];
  if (netData?.[translations.dead_] || player.downed) return;

  const localData = player[translations.localData_];
  if (!localData) return;

  const curIdx = localData[translations.curWeapIdx_];
  const weapons = localData[translations.weapons_];

  if (curIdx === null || !weapons) return;

  const activeWeapon = weapons[curIdx];
  if (!activeWeapon) return;

  // Ensure it's a primary or secondary gun (slots 0 and 1)
  if (curIdx > 1) return;

  // Needed for Max Clip
  if (!gameObjects) return;

  const weaponDef = gameObjects[activeWeapon.type];
  if (!weaponDef || !weaponDef.maxClip) return;

  const maxClip = weaponDef.maxClip;
  const currentAmmo = activeWeapon.ammo;

  const percentage = (currentAmmo / maxClip) * 100;
  const threshold = arSettings.threshold_ || 0;

  // Only reload if ammo is low AND (no visible enemy OR enemy behind wall)
  if (percentage <= threshold) {
    const hasVisible = hasVisibleEnemy(player);
    
    // Safe to reload if no visible enemies
    if (!hasVisible) {
      const now = Date.now();
      if (now - reloadTimer > 500) {
        inputState.queuedInputs_.push(inputCommands.Reload_);
        reloadTimer = now;
      }
    }
  }
}

export default function () {
  if (initialized) return;
  initialized = true;

  const checkReady = setInterval(() => {
    if (gameManager?.pixi?._ticker) {
      clearInterval(checkReady);
      gameManager.pixi._ticker.add(autoReloadTick);
    }
  }, 500);
}
