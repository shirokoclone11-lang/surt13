/**
 * Pan Hero - Automatic pan/laser bullet reflection
 * Detects incoming bullets and aims with pan to reflect them
 */

import { gameManager, settings } from '@/core/state.js';
import { translations } from '@/core/obfuscatedNameTranslator.js';
import { hook } from '@/core/hook.js';

const state = {
  lastTurnTime: Date.now(),
  lastTurnPos: null,
  pixi: null,
};

const STAY_TURNED_FOR = 300; // ms
const PAN_OFFSET = 142; // degrees
const BULLET_CHECK_INTERVAL = 50; // ms

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
 * Check if player has pan equipped
 */
function playerHasPan(player) {
  const weapon = player[translations.netData_]?.[translations.activeWeapon_];
  if (!weapon) return false;
  return weapon.includes('pan') || weapon.includes('lasr_s');
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
 * Aim at position (accounting for pan offset)
 */
function aimAtPosition(game, playerPos, targetPos) {
  const angle = Math.atan2(targetPos.y - playerPos.y, targetPos.x - playerPos.x);
  let normalAngle = -angle * (180 / Math.PI);
  let angleWithPan = normalAngle - PAN_OFFSET;

  const mouseX = Math.cos(vectorMath.rad(angleWithPan)) * 100 + window.innerWidth / 2;
  const mouseY = Math.sin(vectorMath.rad(angleWithPan)) * 100 + window.innerHeight / 2;

  // Update mouse position
  const input = game[translations.input_];
  if (input && input.mousePos) {
    input.mousePos._x = mouseX;
    input.mousePos._y = mouseY;
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
 * Main reflection logic
 */
function reflectBullets(game, player) {
  if (!settings.panHero_?.enabled_) return;

  // Don't reflect while shooting
  const inputBinds = game[translations.inputBinds_];
  const isLeftMouseDown = inputBinds?.isBindDown?.(1) || false; // Left mouse

  if (isLeftMouseDown) {
    return;
  }

  // Check if player has pan (or debug mode enabled)
  if (!settings.panHero_?.turnWithoutPan_ && !playerHasPan(player)) {
    return;
  }

  const playerPos = player[translations.pos_];
  const playerLayer = player.layer;

  if (!playerPos) return;

  // Stay turned toward last detected bullet
  if (
    state.lastTurnPos &&
    Date.now() - state.lastTurnTime < STAY_TURNED_FOR
  ) {
    aimAtPosition(game, playerPos, state.lastTurnPos);
    return;
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
  aimAtPosition(game, playerPos, closestBullet[translations.pos_]);

  state.lastTurnTime = Date.now();
  state.lastTurnPos = closestBullet[translations.pos_];
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
  if (playerHasPan(player)) {
    return;
  }

  // Look for pan in active loot
  const objectCreator = game[translations.objectCreator_];
  if (!objectCreator) return;

  const idToObj = objectCreator[translations.idToObj_];
  if (!idToObj) return;

  for (const obj of Object.values(idToObj)) {
    if (obj.type && obj.type.includes('pan') && obj.active) {
      // Aim at loot and press loot key
      const lootPos = obj[translations.pos_];
      if (lootPos) {
        aimAtPosition(game, player[translations.pos_], lootPos);
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
        reflectBullets(gameManager.game, activePlayer);
      } catch (e) {
        console.error('[PanHero] Error:', e);
      }

      return result;
    };
  });
}
