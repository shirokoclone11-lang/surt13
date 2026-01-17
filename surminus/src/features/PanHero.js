/**
 * Pan Hero - Automatic pan/laser bullet reflection + enemy tracking
 * - Auto-track closest enemy when pan melee is equipped
 * - Reflects incoming bullets
 * - Stops tracking when player fires
 */

import { gameManager, settings } from '@/core/state.js';
import { translations } from '@/core/obfuscatedNameTranslator.js';
import { hook } from '@/core/hook.js';
import { inputCommands } from '@/utils/constants.js';

const state = {
  lastTurnTime: Date.now(),
  lastTurnPos: null,
  pixi: null,
  lastEnemyTrackTime: 0,
};

const STAY_TURNED_FOR = 300; // ms
const ENEMY_TRACK_INTERVAL = 100; // Check for enemies every 100ms
const PAN_ROTATION_OFFSET = 0.78 * Math.PI; // Pan hip image rotation from survev data (~140 degrees)
const BULLET_CHECK_INTERVAL = 50; // ms
const MAX_ENEMY_TRACK_DISTANCE = 200; // Game units (survev scale)

/**
 * Vector math utilities
 */
const vectorMath = {
  magnitude(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  },

  dotProduct(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
  },

  normalize(v) {
    const mag = this.magnitude(v);
    return mag > 0 ? { x: v.x / mag, y: v.y / mag } : { x: 0, y: 0 };
  },

  subtract(v1, v2) {
    return { x: v1.x - v2.x, y: v1.y - v2.y };
  },

  distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  rad(degrees) {
    return degrees * (Math.PI / 180);
  },

  deg(radians) {
    return radians * (180 / Math.PI);
  },
};

/**
 * Check if player has pan melee in backpack or equipment slots
 * Checks both active weapon and backpack inventory
 */
function hasPanMelee(player) {
  if (!player) return false;

  try {
    // Get local data which contains backpack
    const localData = player[translations.localData_];
    if (!localData) return false;

    // Check backpack array (contains all items in inventory)
    const backpack = localData[translations.backpack_];
    if (backpack && Array.isArray(backpack)) {
      for (const item of backpack) {
        if (item && typeof item === 'string' && (item.includes('pan') || item.includes('lasr_s'))) {
          console.log('[PanHero] Found pan in backpack:', item);
          return true;
        }
      }
    }

    // Also check active weapon as fallback
    const netData = player[translations.netData_];
    if (netData) {
      const activeWeapon = netData[translations.activeWeapon_];
      if (activeWeapon && typeof activeWeapon === 'string' && (activeWeapon.includes('pan') || activeWeapon.includes('lasr_s'))) {
        console.log('[PanHero] Found pan in active weapon:', activeWeapon);
        return true;
      }
    }

    // Also check equipment slots more thoroughly
    if (localData) {
      // Check slot 2 (melee)
      const meleeSlot = localData[translations.curWeapIdx_];
      const allWeapons = localData[translations.weapons_];
      if (allWeapons && Array.isArray(allWeapons)) {
        for (const weapon of allWeapons) {
          if (weapon && typeof weapon === 'string' && (weapon.includes('pan') || weapon.includes('lasr_s'))) {
            console.log('[PanHero] Found pan in weapons array:', weapon);
            return true;
          }
        }
      }
    }

    return false;
  } catch (e) {
    console.error('[PanHero] Error checking pan inventory:', e);
    return false;
  }
}

/**
 * Find closest enemy similar to Aimbot
 */
function findClosestEnemy(player, game) {
  if (!player) return null;

  try {
    const playerTeam = findTeam(player);
    const playerLayer = player.layer;
    const mePos = player[translations.visualPos_] || player[translations.pos_];

    if (!mePos) return null;

    const players = game[translations.playerBarn_]?.playerPool[translations.pool_];
    if (!players || !Array.isArray(players)) return null;

    let closestEnemy = null;
    let minDistance = MAX_ENEMY_TRACK_DISTANCE;

    for (const enemy of players) {
      if (!enemy.active) continue;
      if (enemy[translations.netData_]?.[translations.dead_]) continue;
      if (player.__id === enemy.__id) continue;

      // Skip teammates
      if (findTeam(enemy) === playerTeam && !settings.panHero_?.attackAllies_) continue;

      // Check layer compatibility
      if (enemy.layer !== playerLayer) continue;

      const enemyPos = enemy[translations.visualPos_] || enemy[translations.pos_];
      if (!enemyPos) continue;

      const distance = Math.hypot(mePos.x - enemyPos.x, mePos.y - enemyPos.y);

      if (distance < minDistance) {
        minDistance = distance;
        closestEnemy = enemy;
      }
    }

    return closestEnemy;
  } catch (e) {
    console.error('[PanHero] Error finding closest enemy:', e);
    return null;
  }
}

/**
 * Get team of player (for ally detection)
 */
function findTeam(player) {
  if (!player) return null;
  try {
    return player[translations.team_];
  } catch (e) {
    return null;
  }
}

/**
 * Get all bullets from game state
 */
function getBullets(game) {
  try {
    const objectCreator = game[translations.objectCreator_];
    if (!objectCreator || !objectCreator[translations.idToObj_]) return [];

    const idToObj = objectCreator[translations.idToObj_];
    return Object.values(idToObj).filter(obj => {
      return (
        obj.__type === 1 && // Bullet type
        obj.alive &&
        obj[translations.dir_]
      );
    });
  } catch (e) {
    return [];
  }
}

/**
 * Check if bullet is aimed at player (cone detection)
 */
function isBulletAimedAtPlayer(bullet, playerPos, playerRadius = 1.5) {
  try {
    const bulletToPlayer = vectorMath.subtract(playerPos, bullet[translations.pos_]);
    const distance = vectorMath.magnitude(bulletToPlayer);

    if (distance === 0) return true;

    const normalizedBulletDir = vectorMath.normalize(bullet[translations.dir_]);
    const normalizedPlayerDir = vectorMath.normalize(bulletToPlayer);

    // Angle between bullet direction and direction to player
    const alpha = Math.acos(
      Math.max(-1, Math.min(1, vectorMath.dotProduct(normalizedBulletDir, normalizedPlayerDir)))
    );

    // Critical angle (cone angle)
    const beta = Math.asin(Math.max(0, Math.min(1, playerRadius / distance)));

    return alpha <= beta;
  } catch (e) {
    return false;
  }
}

/**
 * Aim at position using pan (synced with Aimbot body rotation)
 */
function aimAtPosition(game, targetPos, player) {
  try {
    // Get screen center
    const center = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };

    // Calculate angle from screen center to target (screen space)
    const angle = Math.atan2(targetPos.y - center.y, targetPos.x - center.x);

    // Set body rotation to face target
    if (player && player.bodyContainer) {
      player.bodyContainer.rotation = angle;
    }

    // Update mouse position to match aim direction
    const mouseX = center.x + Math.cos(angle) * 100;
    const mouseY = center.y + Math.sin(angle) * 100;

    const input = game[translations.input_];
    if (input && input.mousePos) {
      input.mousePos._x = mouseX;
      input.mousePos._y = mouseY;
    }
  } catch (e) {
    console.error('[PanHero] Error aiming at position:', e);
  }
}

/**
 * Draw detection radius visualization
 */
function drawRadius(player, game) {
  if (!settings.panHero_?.displayRadius_) {
    if (state.pixi) {
      state.pixi.clear();
    }
    return;
  }

  if (!state.pixi && player.container) {
    state.pixi = new (game[translations.pixi_]?.Graphics_ || window.PIXI?.Graphics)();
    player.container.addChild(state.pixi);
    player.container.setChildIndex(state.pixi, 0);
  }

  if (state.pixi) {
    state.pixi.clear();
    state.pixi.beginFill(0xff0000, 0);
    state.pixi.lineStyle(1, 0x000000, 0.1);
    state.pixi.drawCircle(0, 0, settings.panHero_?.detectRadius_ * 16);
  }
}

/**
 * Auto-track closest enemy
 */
function trackEnemy(game, player) {
  if (!settings.panHero_?.enabled_) return;

  try {
    // Don't track while shooting - player is in active fire mode
    const inputBinds = game[translations.inputBinds_];
    const isAiming = inputBinds?.isBindDown?.(inputCommands.Fire_) || false;

    if (isAiming) {
      // Stop tracking - player is firing, let manual control take over
      return;
    }

    // Check update interval to avoid excessive updates
    const now = performance.now();
    if (now - state.lastEnemyTrackTime < ENEMY_TRACK_INTERVAL) {
      return;
    }
    state.lastEnemyTrackTime = now;

    // Find closest enemy within range
    const closestEnemy = findClosestEnemy(player, game);
    if (!closestEnemy) {
      return;
    }

    const enemyPos = closestEnemy[translations.visualPos_] || closestEnemy[translations.pos_];
    if (!enemyPos) return;

    // Get camera for world-to-screen conversion
    const camera = game[translations.camera_];
    if (!camera || !camera[translations.pointToScreen_]) {
      console.log('[PanHero] Camera not available');
      return;
    }

    // Convert enemy world position to screen position
    const screenPos = camera[translations.pointToScreen_]({
      x: enemyPos.x,
      y: enemyPos.y,
    });

    if (!screenPos) {
      console.log('[PanHero] Failed to convert enemy position to screen');
      return;
    }

    console.log('[PanHero] Aiming at enemy, screen pos:', screenPos);

    // Aim at enemy using screen position
    aimAtPosition(game, screenPos, player);

    state.lastTurnTime = Date.now();
    state.lastTurnPos = enemyPos;
  } catch (e) {
    console.error('[PanHero] Error in trackEnemy:', e);
  }
}

/**
 * Main reflection logic
 */
function reflectBullets(game, player) {
  if (!settings.panHero_?.enabled_) return;

  // Don't reflect while shooting
  const inputBinds = game[translations.inputBinds_];
  const isLeftMouseDown = inputBinds?.isBindDown?.(inputCommands.Fire_) || false;

  if (isLeftMouseDown) {
    return;
  }

  // Check if player has pan (or debug mode enabled)
  if (!settings.panHero_?.turnWithoutPan_ && !hasPanMelee(player)) {
    return;
  }

  const playerPos = player[translations.visualPos_] || player[translations.pos_];
  const playerLayer = player.layer;

  if (!playerPos) return;

  // Stay turned toward last detected bullet
  if (
    state.lastTurnPos &&
    Date.now() - state.lastTurnTime < STAY_TURNED_FOR
  ) {
    // Convert bullet world position to screen position
    const camera = game[translations.camera_];
    if (camera && camera[translations.pointToScreen_]) {
      const screenPos = camera[translations.pointToScreen_]({
        x: state.lastTurnPos.x,
        y: state.lastTurnPos.y,
      });
      if (screenPos) {
        aimAtPosition(game, screenPos, player);
        return;
      }
    }
  }

  // Get bullets in detection radius
  const bullets = getBullets(game)
    .filter(bullet => {
      const bulletPos = bullet[translations.pos_];
      const bulletLayer = bullet.layer;
      const bulletPlayerId = bullet[translations.playerId_] || bullet.playerId;

      if (!bulletPos) return false;

      const distance = vectorMath.distance(playerPos, bulletPos);

      return (
        bullet.alive &&
        bulletLayer === playerLayer &&
        bulletPlayerId !== player.__id &&
        distance <= settings.panHero_?.detectRadius_ &&
        isBulletAimedAtPlayer(bullet, playerPos, 1.5)
      );
    })
    .sort((a, b) => {
      const distA = vectorMath.distance(playerPos, a[translations.pos_]);
      const distB = vectorMath.distance(playerPos, b[translations.pos_]);
      return distA - distB;
    });

  if (bullets.length === 0) {
    return;
  }

  // Aim at closest bullet
  const closestBullet = bullets[0];
  const bulletPos = closestBullet[translations.pos_];

  // Convert bullet world position to screen position
  const camera = game[translations.camera_];
  if (!camera || !camera[translations.pointToScreen_]) return;

  const screenPos = camera[translations.pointToScreen_]({
    x: bulletPos.x,
    y: bulletPos.y,
  });

  if (!screenPos) return;

  aimAtPosition(game, screenPos, player);

  state.lastTurnTime = Date.now();
  state.lastTurnPos = bulletPos;
}

/**
 * Auto-loot pan
 */
function lootPan(game, player) {
  if (!settings.panHero_?.lootPan_) return;

  // Skip if player is downed
  if (player[translations.netData_]?.[translations.dead_]) {
    return;
  }

  // Don't loot if already have pan
  if (hasPanMelee(player)) {
    return;
  }

  // Look for pan in active loot
  const objectCreator = game[translations.objectCreator_];
  if (!objectCreator) return;

  const idToObj = objectCreator[translations.idToObj_];
  if (!idToObj) return;

  for (const obj of Object.values(idToObj)) {
    if (obj.type && obj.type.includes('pan') && obj.active) {
      // Convert loot world position to screen position
      const lootPos = obj[translations.pos_];
      if (lootPos) {
        const camera = game[translations.camera_];
        if (camera && camera[translations.pointToScreen_]) {
          const screenPos = camera[translations.pointToScreen_]({
            x: lootPos.x,
            y: lootPos.y,
          });
          if (screenPos) {
            aimAtPosition(game, screenPos, player);
          }
        }
      }
      break;
    }
  }
}

export default function () {
  // Hook into game loop
  const originalUpdate = gameManager.game?.update || (() => {});

  hook('PlayerBody', 'update', function (original) {
    return function () {
      const result = original.call(this);

      if (!gameManager.game?.initialized) {
        return result;
      }

      const activePlayer = gameManager.game[translations.activePlayer_];
      if (!activePlayer) {
        return result;
      }

      try {
        // Pan hero logic
        drawRadius(activePlayer, gameManager.game);
        lootPan(gameManager.game, activePlayer);

        // Priority: If an enemy is being tracked, skip bullet reflection
        // Otherwise, check for incoming bullets
        trackEnemy(gameManager.game, activePlayer);
        reflectBullets(gameManager.game, activePlayer);
      } catch (e) {
        console.error('[PanHero] Error:', e);
      }

      return result;
    };
  });
}
