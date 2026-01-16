import { gameManager, getUIRoot, inputState, settings } from '@/core/state.js';

import {
  aimOverlays,
  AimState,
  getPing,
  setAimState
} from '@/core/aimController.js';
import { ref_addEventListener } from '@/core/hook.js';
import { translations } from '@/core/obfuscatedNameTranslator.js';
import { outer } from '@/core/outer.js';
import { isLayerSpoofActive, originalLayerValue } from '@/features/LayerSpoofer.js';
import { findBullet, findTeam, findWeapon, inputCommands } from '@/utils/constants.js';
import { collisionHelpers, sameLayer, v2 } from '@/utils/math.js';

const isBypassLayer = (layer) => layer === 2 || layer === 3;

const state = {
  focusedEnemy_: null,
  previousEnemies_: {},
  currentEnemy_: null,
  meleeLockEnemy_: null,
  lastTargetScreenPos_: null,
  lastPredictionTime_: 0,
};

const MELEE_ENGAGE_DISTANCE = 5.5;

const getLocalLayer = (player) => {
  if (isBypassLayer(player.layer)) return player.layer;
  if (isLayerSpoofActive && originalLayerValue !== undefined) return originalLayerValue;
  return player.layer;
};

const meetsLayerCriteria = (targetLayer, localLayer, isLocalOnBypass) => {
  if (isBypassLayer(targetLayer) || isLocalOnBypass) return true;
  return targetLayer === localLayer;
};

// ============================================
// OBSTACLE DETECTION
// ============================================

const BLOCKING_OBSTACLE_PATTERNS = [
  'metal_wall_', 'brick_wall_', 'concrete_wall_', 'stone_wall_',
  'container_wall_', '_wall_int_', 'bank_wall_', 'barn_wall_',
  'cabin_wall_', 'hut_wall_', 'house_wall_', 'mansion_wall_',
  'police_wall_', 'shack_wall_', 'outhouse_wall_', 'teahouse_wall_',
  'warehouse_wall_', 'silo_', 'bollard_', 'sandbags_', 'hedgehog',
];

const NON_BLOCKING_OBSTACLE_PATTERNS = [
  'tree_', 'bush_', 'brush_', 'crate_', 'barrel_', 'refrigerator_',
  'control_panel_', 'chest_', 'case_', 'oven_', 'bed_', 'bookshelf_',
  'couch_', 'table_', 'drawers_', 'window', 'glass_wall_', 'locker_',
  'deposit_box_', 'toilet_', 'pot_', 'planter_', 'pumpkin_', 'potato_',
  'egg_', 'woodpile_', 'decal', 'stone_0',
];

const isObstacleBlocking = (obstacle) => {
  if (obstacle.collidable === false) return false;
  const obstacleType = obstacle.type || '';
  if (obstacle.isWall === true) return true;
  if (obstacle.destructible === false) return true;
  for (const pattern of BLOCKING_OBSTACLE_PATTERNS) {
    if (obstacleType.includes(pattern)) return true;
  }
  for (const pattern of NON_BLOCKING_OBSTACLE_PATTERNS) {
    if (obstacleType.includes(pattern)) return false;
  }
  if (obstacle.health !== undefined && obstacle.health > 200) return true;
  return false;
};

const canCastToPlayer = (localPlayer, targetPlayer, weapon, bullet) => {
  if (!weapon || !bullet) return true;

  const game = gameManager.game;
  const idToObj = game?.[translations.objectCreator_]?.[translations.idToObj_];
  if (!idToObj) return true;

  const BULLET_HEIGHT = 0.25;
  const trueLayer = isLayerSpoofActive && originalLayerValue !== undefined
    ? originalLayerValue
    : localPlayer.layer;

  const playerPos = localPlayer[translations.visualPos_];
  const targetPos = targetPlayer[translations.visualPos_];

  const dx = targetPos.x - playerPos.x;
  const dy = targetPos.y - playerPos.y;
  const aimAngle = Math.atan2(dy, dx);
  const maxDistance = Math.hypot(dx, dy);

  const allObstacles = Object.values(idToObj).filter((obj) => {
    if (!obj.collider) return false;
    if (obj.dead) return false;
    if (obj.height !== undefined && obj.height < BULLET_HEIGHT) return false;
    if (obj.layer !== undefined && !sameLayer(obj.layer, trueLayer)) return false;
    return true;
  });

  const blockingObstacles = allObstacles.filter(isObstacleBlocking);
  if (blockingObstacles.length === 0) return true;

  const baseSpread = (weapon.shotSpread || 0) * (Math.PI / 180);
  const generousSpread = baseSpread * 1.5;
  const rayCount = Math.max(15, Math.ceil((weapon.shotSpread || 0) * 1.5));

  for (let i = 0; i < rayCount; i++) {
    const t = rayCount === 1 ? 0.5 : i / (rayCount - 1);
    const rayAngle = aimAngle - generousSpread / 2 + generousSpread * t;
    const rayDir = v2.create_(Math.cos(rayAngle), Math.sin(rayAngle));
    const endPos = v2.add_(playerPos, v2.mul_(rayDir, maxDistance));

    let blocked = false;
    for (const obstacle of blockingObstacles) {
      const collision = collisionHelpers.intersectSegment_(obstacle.collider, playerPos, endPos);
      if (collision) {
        const distToCollision = v2.length_(v2.sub_(collision.point, playerPos));
        if (distToCollision < maxDistance - 0.5) {
          blocked = true;
          break;
        }
      }
    }
    if (!blocked) return true;
  }
  return false;
};

// ============================================
// KEYBOARD HANDLER
// ============================================

const handleKeydown = (event) => {
  if (event.code !== settings.keybinds_.toggleStickyTarget_) return;
  if (state.focusedEnemy_) {
    state.focusedEnemy_ = null;
    setAimState(new AimState('idle', null, null, true));
    return;
  }
  if (settings.aimbot_.stickyTarget_) {
    state.focusedEnemy_ = state.currentEnemy_;
  }
};

Reflect.apply(ref_addEventListener, outer, ['keydown', handleKeydown]);

let tickerAttached = false;

// ============================================
// UTILS
// ============================================

function getDistance(x1, y1, x2, y2) {
  return (x1 - x2) ** 2 + (y1 - y2) ** 2;
}

function getDistanceReal(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function calcAngle(playerPos, mePos) {
  const dx = mePos.x - playerPos.x;
  const dy = mePos.y - playerPos.y;
  return Math.atan2(dy, dx);
}

// ============================================
// PRÉDICTION AMÉLIORÉE V2
// ============================================

// ============================================
// SMART PREDICTION ENGINE (AI-LIKE)
// ============================================

function predictPosition(enemy, currentPlayer) {
  if (!enemy || !currentPlayer) return null;

  const enemyPos = enemy[translations.visualPos_];
  const playerPos = currentPlayer[translations.visualPos_];
  const now = performance.now();
  const enemyId = enemy.__id;

  // 1. Weapon Ballistics
  const weapon = findWeapon(currentPlayer);
  const bullet = findBullet(weapon);
  const bulletSpeed = bullet?.speed || 100;

  // 2. History Management
  if (!state.previousEnemies_[enemyId]) {
    state.previousEnemies_[enemyId] = { positions: [] };
  }
  const history = state.previousEnemies_[enemyId];
  history.positions.push({ time: now, x: enemyPos.x, y: enemyPos.y });
  // Keep slightly more history for acceleration calc (10 samples)
  while (history.positions.length > 10) history.positions.shift();

  // Need at least 3 points for acceleration
  if (history.positions.length < 3) {
    return gameManager.game[translations.camera_][translations.pointToScreen_](enemyPos);
  }

  // 3. Physics Analysis
  let totalVelX = 0, totalVelY = 0;
  let totalAccX = 0, totalAccY = 0;
  let maxSpeed = 0;
  let directionChanges = 0;
  let samples = 0;

  // Analyze simple velocity first
  const velocities = [];
  for (let i = 1; i < history.positions.length; i++) {
    const p1 = history.positions[i - 1];
    const p2 = history.positions[i];
    const dt = (p2.time - p1.time) / 1000;

    if (dt > 0.001 && dt < 0.2) {
      const vx = (p2.x - p1.x) / dt;
      const vy = (p2.y - p1.y) / dt;
      velocities.push({ vx, vy, dt });

      totalVelX += vx;
      totalVelY += vy;
      maxSpeed = Math.max(maxSpeed, Math.hypot(vx, vy));
      samples++;
    }
  }

  if (samples === 0) return gameManager.game[translations.camera_][translations.pointToScreen_](enemyPos);

  const avgVelX = totalVelX / samples;
  const avgVelY = totalVelY / samples;
  const currentSpeed = Math.hypot(avgVelX, avgVelY);

  // Analyze Acceleration & Zig-Zag
  if (velocities.length >= 2) {
    let prevV = velocities[0];
    for (let i = 1; i < velocities.length; i++) {
      const currV = velocities[i];
      // Acceleration: (V2 - V1) / dt
      const ax = (currV.vx - prevV.vx) / currV.dt;
      const ay = (currV.vy - prevV.vy) / currV.dt;

      totalAccX += ax;
      totalAccY += ay;

      // Zig-Zag Detection: Dot Product of normalized vectors
      // If dot product is negative or low, direction changed significantly
      const dot = (prevV.vx * currV.vx + prevV.vy * currV.vy);
      if (dot < 0) directionChanges += 2; // Hard turn
      else if (dot < 0.5) directionChanges += 1; // Soft turn

      prevV = currV;
    }
  }

  const avgAccX = totalAccX / (samples - 1 || 1);
  const avgAccY = totalAccY / (samples - 1 || 1);

  // 4. Calculate Prediction Components
  const dx = enemyPos.x - playerPos.x;
  const dy = enemyPos.y - playerPos.y;
  const rawDist = Math.hypot(dx, dy);

  // Base Time of Flight
  let t = rawDist / bulletSpeed;
  t += getPing() * 0.5; // Ping comp

  // 5. Adaptive Tuning
  // Bullet Speed curve
  if (bulletSpeed < 80) t *= 0.6; // Shotguns
  else if (bulletSpeed > 150) t *= 0.95; // Snipers/DMRs
  else t *= 0.85; // Standard

  // Zig-Zag Penalty: If enemy is erratic, reduce prediction time to aim closer to current pos (center mass)
  // avoiding leading into a fake turn.
  if (directionChanges > 2) {
    t *= 0.6;
  } else if (directionChanges > 0) {
    t *= 0.8;
  }

  // Distance Cap
  t = Math.min(t, 0.45); // Hard cap

  // 6. Physics Projection (P + Vt + 0.5At^2)
  // We dampen acceleration contribution because game movement is snappy
  const accelWeight = 0.35;

  let predX = enemyPos.x + (avgVelX * t) + (0.5 * avgAccX * t * t * accelWeight);
  let predY = enemyPos.y + (avgVelY * t) + (0.5 * avgAccY * t * t * accelWeight);

  // Velocity Clamping: Don't predict them moving faster than game allows
  // Estimate max plausible displacement based on observed maxSpeed
  const maxDisplacement = maxSpeed * t * 1.5;
  const predDist = Math.hypot(predX - enemyPos.x, predY - enemyPos.y);

  if (predDist > maxDisplacement && maxDisplacement > 0.1) {
    const scale = maxDisplacement / predDist;
    predX = enemyPos.x + (predX - enemyPos.x) * scale;
    predY = enemyPos.y + (predY - enemyPos.y) * scale;
  }

  return gameManager.game[translations.camera_][translations.pointToScreen_]({ x: predX, y: predY });
}

// ============================================
// FIND TARGET - FOV CENTRÉ SUR LE JOUEUR
// ============================================

function findTarget(players, me) {
  const meTeam = findTeam(me);
  const isLocalOnBypassLayer = isBypassLayer(me.layer);
  const localLayer = getLocalLayer(me);
  let enemy = null;
  let minDistance = Infinity;

  // Use actual mouse position (like original code)
  const mousePos = gameManager.game[translations.input_].mousePos;
  const cursorPos = { x: mousePos._x, y: mousePos._y };

  const fovEnabled = settings.aimbot_.fovEnabled_;
  const fovRadius = settings.aimbot_.fov_;
  const fovRadiusSquared = fovRadius * fovRadius;

  for (const player of players) {
    if (!player.active) continue;
    if (player[translations.netData_][translations.dead_]) continue;
    if (!settings.aimbot_.targetKnocked_ && player.downed) continue;
    if (me.__id === player.__id) continue;
    if (!meetsLayerCriteria(player.layer, localLayer, isLocalOnBypassLayer)) continue;
    if (findTeam(player) === meTeam) continue;

    const playerPos = player[translations.visualPos_];
    const screenPos = gameManager.game[translations.camera_][translations.pointToScreen_](playerPos);

    // Distance from mouse cursor (like original)
    const screenDistance = getDistance(screenPos.x, screenPos.y, cursorPos.x, cursorPos.y);

    if (fovEnabled && screenDistance > fovRadiusSquared) continue;

    if (screenDistance < minDistance) {
      minDistance = screenDistance;
      enemy = player;
    }
  }

  return enemy;
}

function findClosestTarget(players, me) {
  const meTeam = findTeam(me);
  const isLocalOnBypassLayer = isBypassLayer(me.layer);
  const localLayer = getLocalLayer(me);
  let enemy = null;
  let minDistance = Infinity;

  for (const player of players) {
    if (!player.active) continue;
    if (player[translations.netData_][translations.dead_]) continue;
    if (!settings.aimbot_.targetKnocked_ && player.downed) continue;
    if (me.__id === player.__id) continue;
    if (!meetsLayerCriteria(player.layer, localLayer, isLocalOnBypassLayer)) continue;
    if (findTeam(player) === meTeam) continue;

    const mePos = me[translations.visualPos_];
    const playerPos = player[translations.visualPos_];
    const distance = getDistance(mePos.x, mePos.y, playerPos.x, playerPos.y);

    if (distance < minDistance) {
      minDistance = distance;
      enemy = player;
    }
  }

  return enemy;
}

// ============================================
// MAIN TICKER
// ============================================

function aimbotTicker() {
  try {
    const game = gameManager.game;
    if (
      !game.initialized ||
      !(settings.aimbot_.enabled_ || settings.meleeLock_.enabled_) ||
      game[translations.uiManager_].spectating
    ) {
      setAimState(new AimState('idle'));
      aimOverlays.hideAll();
      state.lastTargetScreenPos_ = null;
      return;
    }

    const players = game[translations.playerBarn_].playerPool[translations.pool_];
    const me = game[translations.activePlayer_];
    const isLocalOnBypassLayer = isBypassLayer(me.layer);
    let aimUpdated = false;
    let dotTargetPos = null;
    let previewTargetPos = null;
    let isDotTargetShootable = false;

    aimOverlays.updateFovCircle();

    try {
      const currentWeaponIndex = me[translations.localData_][translations.curWeapIdx_];
      const isMeleeEquipped = currentWeaponIndex === 2;
      const isGrenadeEquipped = currentWeaponIndex === 3;
      const isAiming = game[translations.inputBinds_].isBindDown(inputCommands.Fire_);

      // === MELEE LOCK AUTO-SWITCH ===
      const MELEE_AUTO_DISTANCE = 5;

      if (settings.meleeLock_.enabled_) {
        const closestEnemy = findClosestTarget(players, me);

        if (closestEnemy) {
          const mePos = me[translations.visualPos_];
          const enemyPos = closestEnemy[translations.visualPos_];
          const distanceToEnemy = Math.hypot(mePos.x - enemyPos.x, mePos.y - enemyPos.y);

          if (distanceToEnemy <= MELEE_AUTO_DISTANCE) {
            // Direction vers l'ennemi
            const dirToEnemyX = enemyPos.x - mePos.x;
            const dirToEnemyY = enemyPos.y - mePos.y;

            // Direction du mouvement du joueur
            const inputBinds = game[translations.inputBinds_];
            let moveX = 0;
            let moveY = 0;
            if (inputBinds.isBindDown(inputCommands.MoveLeft_)) moveX -= 1;
            if (inputBinds.isBindDown(inputCommands.MoveRight_)) moveX += 1;
            if (inputBinds.isBindDown(inputCommands.MoveUp_)) moveY -= 1;
            if (inputBinds.isBindDown(inputCommands.MoveDown_)) moveY += 1;

            // Calculer si le joueur fuit (dot product négatif = directions opposées)
            const isMoving = moveX !== 0 || moveY !== 0;
            const dotProduct = (dirToEnemyX * moveX) + (dirToEnemyY * (-moveY));
            const isFleeing = isMoving && dotProduct < -0.3; // Fuit si va dans la direction opposée

            if (isFleeing) {
              // Le joueur fuit, delock
              state.meleeLockEnemy_ = null;
            } else {
              // Le joueur ne fuit pas, activer le lock
              state.meleeLockEnemy_ = closestEnemy;

              // Auto-switch vers melee si option activée ET pas déjà équipée
              if (settings.meleeLock_.autoMelee_ && !isMeleeEquipped) {
                inputState.queuedInputs_.push(inputCommands.EquipMelee_);
              }

              // Lock seulement si melee équipée
              if (isMeleeEquipped) {
                const weapon = findWeapon(me);
                const bullet = findBullet(weapon);
                const isMeleeTargetShootable = !settings.aimbot_.wallcheck_ || canCastToPlayer(me, closestEnemy, weapon, bullet);

                if (isMeleeTargetShootable) {
                  const moveAngle = calcAngle(enemyPos, mePos) + Math.PI;
                  const moveDir = {
                    touchMoveActive: true,
                    touchMoveLen: 255,
                    x: Math.cos(moveAngle),
                    y: Math.sin(moveAngle),
                  };
                  const screenPos = game[translations.camera_][translations.pointToScreen_](enemyPos);
                  setAimState(new AimState('meleeLock', { x: screenPos.x, y: screenPos.y }, moveDir, true));
                  aimUpdated = true;
                  aimOverlays.hideAll();
                  state.lastTargetScreenPos_ = null;
                  return;
                }
              }
            }
          } else {
            state.meleeLockEnemy_ = null;
          }
        } else {
          state.meleeLockEnemy_ = null;
        }
      } else {
        state.meleeLockEnemy_ = null;
      }

      // === AIMBOT ===
      if (!settings.aimbot_.enabled_ || isMeleeEquipped || isGrenadeEquipped) {
        setAimState(new AimState('idle'));
        aimOverlays.hideAll();
        state.lastTargetScreenPos_ = null;
        return;
      }

      const canEngageAimbot = isAiming;

      let enemy = state.focusedEnemy_?.active && !state.focusedEnemy_[translations.netData_][translations.dead_]
        ? state.focusedEnemy_
        : null;

      if (enemy) {
        const localLayer = getLocalLayer(me);
        if (!meetsLayerCriteria(enemy.layer, localLayer, isLocalOnBypassLayer)) {
          enemy = null;
          state.focusedEnemy_ = null;
          setAimState(new AimState('idle', null, null, true));
        }
      }

      if (!enemy) {
        if (state.focusedEnemy_) {
          state.focusedEnemy_ = null;
          setAimState(new AimState('idle', null, null, true));
        }
        enemy = findTarget(players, me);
        state.currentEnemy_ = enemy;
      }

      if (enemy) {
        if (enemy !== state.currentEnemy_ && !state.focusedEnemy_) {
          state.currentEnemy_ = enemy;
          delete state.previousEnemies_[enemy.__id];
        }

        const predictedPos = predictPosition(enemy, me);
        if (!predictedPos) {
          setAimState(new AimState('idle'));
          aimOverlays.hideAll();
          state.lastTargetScreenPos_ = null;
          return;
        }

        previewTargetPos = { x: predictedPos.x, y: predictedPos.y };

        const weapon = findWeapon(me);
        const bullet = findBullet(weapon);
        const isTargetShootable = !settings.aimbot_.wallcheck_ || canCastToPlayer(me, enemy, weapon, bullet);

        if (canEngageAimbot && settings.aimbot_.enabled_) {
          if (isTargetShootable) {
            setAimState(
              new AimState('aimbot', { x: predictedPos.x, y: predictedPos.y }, null, true)
            );
            state.lastTargetScreenPos_ = { x: predictedPos.x, y: predictedPos.y };
            aimUpdated = true;

            dotTargetPos = { x: predictedPos.x, y: predictedPos.y };
            isDotTargetShootable = true;
          } else {
            dotTargetPos = { x: predictedPos.x, y: predictedPos.y };
            isDotTargetShootable = false;
          }
        } else {
          dotTargetPos = { x: predictedPos.x, y: predictedPos.y };
          isDotTargetShootable = isTargetShootable;
        }
      } else {
        previewTargetPos = null;
        dotTargetPos = null;
        state.lastTargetScreenPos_ = null;
      }

      if (!aimUpdated) {
        setAimState(new AimState('idle'));
        state.lastTargetScreenPos_ = previewTargetPos
          ? { x: previewTargetPos.x, y: previewTargetPos.y }
          : null;
      }

      let displayPos = dotTargetPos;
      if (!displayPos && previewTargetPos) {
        displayPos = { x: previewTargetPos.x, y: previewTargetPos.y };
      }
      aimOverlays.updateDot(displayPos, isDotTargetShootable, !!state.focusedEnemy_);

    } catch (error) {
      aimOverlays.hideAll();
      setAimState(new AimState('idle', null, null, true));
      state.meleeLockEnemy_ = null;
      state.focusedEnemy_ = null;
      state.currentEnemy_ = null;
      state.lastTargetScreenPos_ = null;
    }
  } catch (error) {
    setAimState(new AimState('idle', null, null, true));
    state.lastTargetScreenPos_ = null;
  }
}

// ============================================
// EXPORT
// ============================================

export default function () {
  const startTicker = () => {
    const uiRoot = getUIRoot();
    if (aimOverlays.ensureInitialized(uiRoot)) {
      if (!tickerAttached) {
        gameManager.pixi._ticker.add(aimbotTicker);
        tickerAttached = true;
      }
    } else {
      requestAnimationFrame(startTicker);
    }
  };

  startTicker();
}