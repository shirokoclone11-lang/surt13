import { settings, getUIRoot, inputState, aimState } from '@/core/state.js';
import { findTeam, findBullet, findWeapon, inputCommands } from '@/utils/constants.js';
import { gameManager } from '@/core/state.js';
import { translations } from '@/core/obfuscatedNameTranslator.js';
import { ref_addEventListener } from '@/core/hook.js';
import {
  AimState,
  setAimState,
  getCurrentAimPosition,
  aimOverlays,
} from '@/core/aimController.js';
import { outerDocument, outer } from '@/core/outer.js';
import { v2, collisionHelpers, sameLayer, ballistics } from '@/utils/math.js';
import { updateAutoCrateBreak } from '@/features/AutoCrateBreak.js';

// ============================================================================
// STATE & CONFIGURATION
// ============================================================================

const isBypassLayer = (layer) => layer === 2 || layer === 3;

const state = {
  focusedEnemy_: null,
  previousEnemies_: {},
  currentEnemy_: null,
  meleeLockEnemy_: null,
  meleeLockTargetId_: null,
  meleeLockStartTime_: null,
  velocityBuffer_: {},
  velocityCleanupFrame_: 0, // Track frame count for periodic cleanup
  lastTargetScreenPos_: null,
  canAutoFire_: true,
  isCurrentEnemyShootable_: false,
  targetPriority_: {},
  currentLootTarget_: null,
  isSwitchingToMelee_: false,
  isMeleeAutoAttacking_: false,
  nearestGrenade_: null,
  lastGrenadeCheckTime_: 0,
  grenadeEvasionAngle_: null,
  collisionCacheFrame_: 0, // Cache invalidation frame counter
  lastCachedObstacles_: null, // Cache obstacles between frames
};

// Melee constants
const MELEE_ENGAGE_DISTANCE = 5.5;
const MELEE_DETECTION_DISTANCE = 7.5;
const MELEE_LOCK_HYSTERESIS = 1.0;
const MELEE_PREDICTION_TIME = 0.15;

// Grenade constants
const GRENADE_EXPLOSION_RADIUS = 20;
const GRENADE_SAFE_DISTANCE = GRENADE_EXPLOSION_RADIUS + 20;
const GRENADE_EVADE_SPEED = 255;
const GRENADE_BASE_RADIUS = 15;
const ANTI_GRENADE_EVADE_DISTANCE = 25;
const ANTI_GRENADE_CHECK_INTERVAL = 50;

const GRENADE_EXPLOSION_PATTERNS = [
  'frag',
  'explosion_frag',
  'smoke',
  'explosion_smoke',
  'gas',
  'concussion',
];

const PRIMARY_BUTTON = 0;
let tickerAttached = false;
let meleeLockAutoAttackTickerId = null;


// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Simulate mouse down for melee attack
 */
function simulateMouseDown() {
  const mouseDownEvent = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    view: outer,
    button: PRIMARY_BUTTON,
  });
  outer.dispatchEvent(mouseDownEvent);
}

/**
 * Simulate mouse up to stop melee attack
 */
function simulateMouseUp() {
  const mouseUpEvent = new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: true,
    view: outer,
    button: PRIMARY_BUTTON,
  });
  outer.dispatchEvent(mouseUpEvent);
}

const getLocalLayer = (player) => player.layer;

const meetsLayerCriteria = (targetLayer, localLayer, isLocalOnBypass) => {
  if (isBypassLayer(targetLayer)) return true;
  return targetLayer === localLayer;
};

/** Calculate aim angle from point to screen center */
const computeAimAngle = (point) => {
  if (!point) return 0;
  const centerX = outer.innerWidth / 2;
  const centerY = outer.innerHeight / 2;
  return Math.atan2(point.y - centerY, point.x - centerX);
};

/** Normalize angle using v2 utility */
const normalizeAngle = (angle) => v2.normalizeAngle_(angle);

/** Queue input command to input state */
const queueInput = (command) => inputState.queuedInputs_.push(command);

/** Calculate squared distance (faster for comparisons) */
const getDistance = (x1, y1, x2, y2) => v2.distanceSqr_(x1, y1, x2, y2);

/** Calculate angle from one position to another */
const calcAngle = (playerPos, targetPos) => v2.angleTowards_(playerPos, targetPos);

/** Extract level from object ID string */
const getLevel = (id) => {
  if (typeof id !== 'string') return 0;
  const match = id.match(/0(\d)$/);
  return match ? parseInt(match[1], 10) : 0;
};

// ============================================================================
// OBSTACLE & COLLISION DETECTION
// ============================================================================

const BLOCKING_OBSTACLE_PATTERNS = [
  'metal_wall_',
  'brick_wall_',
  'concrete_wall_',
  'stone_wall_',
  'container_wall_',
  '_wall_int_',
  'bank_wall_',
  'barn_wall_',
  'cabin_wall_',
  'hut_wall_',
  'house_wall_',
  'mansion_wall_',
  'police_wall_',
  'shack_wall_',
  'outhouse_wall_',
  'teahouse_wall_',
  'warehouse_wall_',
  'silo_',
  'bollard_',
  'sandbags_',
  'hedgehog',
  'stone_01',
  'stone_02',
  'stone_03',
  'stone_04',
  'stone_05',
  'stone_06',
  'stone_07',
  'stone_08',
  'stone_09',
  'stone_0',
  'tree_',
  'glass_wall_',
  'locker_',
  'deposit_box_',
];

const NON_BLOCKING_OBSTACLE_PATTERNS = [
  'bush_',
  'brush_',
  'crate_',
  'barrel_',
  'refrigerator_',
  'control_panel_',
  'chest_',
  'case_',
  'oven_',
  'bed_',
  'bookshelf_',
  'couch_',
  'table_',
  'drawers_',
  'window',
  'toilet_',
  'pot_',
  'planter_',
  'pumpkin_',
  'potato_',
  'egg_',
  'woodpile_',
  'decal',

];

const isObstacleBlocking = (obstacle) => {
  if (obstacle.collidable === false) return false;
  if (obstacle.isWall === true) return true;
  if (obstacle.destructible === false) return true;

  const obstacleType = obstacle.type || '';

  // Check blocking patterns first (more likely)
  for (const pattern of BLOCKING_OBSTACLE_PATTERNS) {
    if (obstacleType.includes(pattern)) return true;
  }

  // Check non-blocking patterns (stop checking if found)
  for (const pattern of NON_BLOCKING_OBSTACLE_PATTERNS) {
    if (obstacleType.includes(pattern)) return false;
  }

  // High health obstacles usually block
  return obstacle.health !== undefined && obstacle.health > 200;
};

const canCastToPlayer = (localPlayer, targetPlayer, weapon, bullet) => {
  if (!weapon || !bullet) return true;

  const game = gameManager.game;
  const idToObj = game?.[translations.objectCreator_]?.[translations.idToObj_];
  if (!idToObj) return true;

  const BULLET_HEIGHT = 0.25;
  const trueLayer = localPlayer.layer;
  const playerPos = localPlayer[translations.visualPos_];
  const targetPos = targetPlayer[translations.visualPos_];

  const dx = targetPos.x - playerPos.x;
  const dy = targetPos.y - playerPos.y;
  const maxDistance = Math.hypot(dx, dy);
  
  // If target is very close, don't do expensive collision checks
  if (maxDistance < 3) return true;
  
  const aimAngle = Math.atan2(dy, dx);
  const dir = v2.create_(Math.cos(aimAngle), Math.sin(aimAngle));
  const baseSpread = (weapon.shotSpread || 0) * (Math.PI / 180);
  const generousSpread = baseSpread * 1.5;

  // Adaptive ray count: reduced and optimized
  const rayCount = Math.min(
    Math.ceil((weapon.shotSpread || 0) * 1.2) + 5,
    20 // Cap at 20 rays (was potentially 30+)
  );

  // Cache and reuse obstacle filtering
  let blockingObstacles = state.lastCachedObstacles_;
  if (!blockingObstacles || state.collisionCacheFrame_ > 5) {
    blockingObstacles = Object.values(idToObj).filter((obj) => {
      if (!obj.collider || obj.dead) return false;
      if (obj.height !== undefined && obj.height < BULLET_HEIGHT) return false;
      if (obj.layer !== undefined && !sameLayer(obj.layer, trueLayer)) return false;
      return isObstacleBlocking(obj);
    });
    state.lastCachedObstacles_ = blockingObstacles;
    state.collisionCacheFrame_ = 0;
  } else {
    state.collisionCacheFrame_++;
  }

  if (blockingObstacles.length === 0) return true;

  // Early exit: check middle ray first (most likely to be unblocked)
  const middleRayAngle = aimAngle;
  const middleRayDir = v2.create_(Math.cos(middleRayAngle), Math.sin(middleRayAngle));
  const middleEndPos = v2.add_(playerPos, v2.mul_(middleRayDir, maxDistance));
  
  let middleRayBlocked = false;
  for (const obstacle of blockingObstacles) {
    const collision = collisionHelpers.intersectSegment_(obstacle.collider, playerPos, middleEndPos);
    if (collision) {
      const distToCollision = v2.length_(v2.sub_(collision.point, playerPos));
      if (distToCollision < maxDistance - 0.75) {
        middleRayBlocked = true;
        break;
      }
    }
  }
  
  // If middle ray is clear, target is definitely shootable
  if (!middleRayBlocked) return true;

  // Only check remaining rays if middle ray is blocked
  let unblocked = 0;
  const requiredUnblocked = Math.max(2, Math.ceil(rayCount * 0.3));
  
  for (let i = 0; i < rayCount; i++) {
    if (i === Math.floor(rayCount / 2)) continue; // Skip middle ray, already checked
    
    const t = rayCount === 1 ? 0.5 : i / (rayCount - 1);
    const rayAngle = aimAngle - generousSpread / 2 + generousSpread * t;
    const rayDir = v2.create_(Math.cos(rayAngle), Math.sin(rayAngle));
    const endPos = v2.add_(playerPos, v2.mul_(rayDir, maxDistance));
    
    let blocked = false;
    for (const obstacle of blockingObstacles) {
      const collision = collisionHelpers.intersectSegment_(obstacle.collider, playerPos, endPos);
      if (collision) {
        const distToCollision = v2.length_(v2.sub_(collision.point, playerPos));
        if (distToCollision < maxDistance - 0.75) {
          blocked = true;
          break;
        }
      }
    }

    if (!blocked) {
      unblocked++;
      // Early exit if we have enough clear rays
      if (unblocked >= requiredUnblocked) return true;
    }
  }

  return unblocked >= requiredUnblocked;
};

// ============================================================================
// POSITION PREDICTION
// ============================================================================

function predictPosition(enemy, currentPlayer) {
  if (!enemy || !currentPlayer) return null;

  const enemyPos = enemy[translations.visualPos_];
  const currentPlayerPos = currentPlayer[translations.visualPos_];
  const enemyId = enemy.__id;
  const history = state.previousEnemies_[enemyId] ?? (state.previousEnemies_[enemyId] = []);
  const now = performance.now();
  
  history.push([now, { x: enemyPos.x, y: enemyPos.y }]);
  
  // Keep only recent history to prevent memory bloat
  if (history.length > 12) history.shift();

  // Need minimum samples for velocity calculation
  if (history.length < 3) {
    return gameManager.game[translations.camera_][translations.pointToScreen_]({
      x: enemyPos.x,
      y: enemyPos.y,
    });
  }

  // Calculate velocity from recent samples (last 3 samples = ~33ms window)
  const oldestIdx = Math.max(0, history.length - 3);
  const newestIdx = history.length - 1;
  const oldPos = history[oldestIdx][1];
  const newPos = history[newestIdx][1];
  const timeDiff = (history[newestIdx][0] - history[oldestIdx][0]) / 1000;
  
  let velocityX = 0;
  let velocityY = 0;
  
  if (timeDiff > 0.001) {
    velocityX = (newPos.x - oldPos.x) / timeDiff;
    velocityY = (newPos.y - oldPos.y) / timeDiff;
  }

  // Clamp velocity to reasonable range
  const velMag = Math.hypot(velocityX, velocityY);
  if (velMag > 2000) {
    const scale = 2000 / velMag;
    velocityX *= scale;
    velocityY *= scale;
  }

  // Get ballistics parameters
  const weapon = findWeapon(currentPlayer);
  const bullet = findBullet(weapon);
  const bulletSpeed = bullet?.speed || 1000;

  // Use quadratic ballistics solver
  const targetVel = { x: velocityX, y: velocityY };
  const t = ballistics.quadraticIntercept_(currentPlayerPos, enemyPos, targetVel, bulletSpeed);
  
  if (t === null) {
    return gameManager.game[translations.camera_][translations.pointToScreen_](enemyPos);
  }

  // Apply prediction level smoothing
  const predictionLevel = settings.aimbot_.predictionLevel_ ?? 1.0;
  const predictedPos = {
    x: enemyPos.x + velocityX * t * predictionLevel,
    y: enemyPos.y + velocityY * t * predictionLevel,
  };

  return gameManager.game[translations.camera_][translations.pointToScreen_](predictedPos);
}

function getAdaptiveMeleeDistance(enemy) {
  return MELEE_ENGAGE_DISTANCE;
}

/** Find all grenades nearby that could threaten player */
function findNearbyGrenades(playerPos, layer, maxDistance = GRENADE_SAFE_DISTANCE * 1.5) {
  const game = gameManager.game;
  const idToObj = game?.[translations.objectCreator_]?.[translations.idToObj_];
  if (!idToObj) return [];
  
  const grenades = [];
  const isLocalOnBypass = isBypassLayer(layer);
  
  for (const obj of Object.values(idToObj)) {
    const isGrenade = (obj.__type === 9 && obj.type !== 'smoke') || (obj.smokeEmitter && obj.explodeParticle);
    if (!isGrenade || obj.dead || !obj.pos) continue;
    
    // Check layer compatibility
    const grenadeOnBypass = isBypassLayer(obj.layer);
    if (!isLocalOnBypass && !grenadeOnBypass && obj.layer !== layer) continue;
    
    const distance = Math.hypot(playerPos.x - obj.pos.x, playerPos.y - obj.pos.y);
    if (distance <= maxDistance) {
      grenades.push({
        pos: obj.pos,
        distance: distance,
        type: obj.type || 'frag',
      });
    }
  }
  
  return grenades;
}

/** Calculate best direction to evade from grenades */
function calculateGrenadeEvadeDirection(playerPos, grenades) {
  if (grenades.length === 0) return null;
  
  let awayX = 0;
  let awayY = 0;
  
  for (const grenade of grenades) {
    const dx = playerPos.x - grenade.pos.x;
    const dy = playerPos.y - grenade.pos.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist < 0.1) {
      // Inside grenade - flee away HARD
      awayX += (dx / (dist + 0.1)) * 10;
      awayY += (dy / (dist + 0.1)) * 10;
    } else {
      // Weight by inverse distance
      const weight = 1 / (dist + 1);
      awayX += (dx / dist) * weight;
      awayY += (dy / dist) * weight;
    }
  }
  
  const magnitude = Math.hypot(awayX, awayY);
  return magnitude < 0.1 ? null : Math.atan2(awayY / magnitude, awayX / magnitude);
}


function findGrenades(me) {
  const game = gameManager.game;
  const idToObj = game?.[translations.objectCreator_]?.[translations.idToObj_];
  if (!idToObj) return [];
  
  const mePos = me[translations.visualPos_];
  const isLocalOnBypassLayer = isBypassLayer(me.layer);
  const localLayer = getLocalLayer(me);
  const maxThreatDistance = ANTI_GRENADE_EVADE_DISTANCE * 2; // Check grenades within 18 units
  
  const grenades = [];
  
  for (const obj of Object.values(idToObj)) {
    if (!obj || obj.dead) continue;
    
    const objType = obj.type || '';
    
    // Check if object is a grenade/explosive
    const isGrenade = GRENADE_EXPLOSION_PATTERNS.some(pattern => objType.includes(pattern));
    if (!isGrenade) continue;
    
    // Check layer compatibility
    if (obj.layer !== undefined && !meetsLayerCriteria(obj.layer, localLayer, isLocalOnBypassLayer)) {
      continue;
    }
    
    const objPos = obj[translations.visualPos_];
    if (!objPos) continue;
    
    // Calculate distance
    const distance = Math.hypot(mePos.x - objPos.x, mePos.y - objPos.y);
    
    // Only consider nearby grenades
    if (distance > maxThreatDistance) continue;
    
    // Determine explosion radius (some grenades might have different radiuses)
    const explosionRadius = obj.explosionRadius || GRENADE_BASE_RADIUS;
    
    grenades.push({
      object: obj,
      position: objPos,
      distance: distance,
      explosionRadius: explosionRadius,
      dangerZone: explosionRadius + 1 // Add safety margin
    });
  }
  
  return grenades.sort((a, b) => a.distance - b.distance);
}

function getGrenadeEvasionDirection(grenades, mePos) {
  // Calculate direction to evade from nearest grenades
  if (!grenades || grenades.length === 0) return null;
  
  // Get the nearest grenade that threatens us
  let threatGrenade = null;
  for (const grenade of grenades) {
    if (grenade.distance <= grenade.dangerZone) {
      threatGrenade = grenade;
      break;
    }
  }
  
  if (!threatGrenade) return null;
  const grenadePos = threatGrenade.position;
  const dx = mePos.x - grenadePos.x;
  const dy = mePos.y - grenadePos.y;
  const dist = Math.hypot(dx, dy);
  
  if (dist < 0.1) {
    // We're on top of grenade, run in random direction
    return Math.random() * Math.PI * 2;
  }
  
  // Direction away from grenade
  return Math.atan2(dy, dx);
}


function findTarget(players, me) {
  const meTeam = findTeam(me);
  const isLocalOnBypassLayer = isBypassLayer(me.layer);
  const localLayer = getLocalLayer(me);
  let bestTarget = null;
  let bestScore = -Infinity;
  const fovRadiusSquared = settings.aimbot_.fov_ ** 2;
  const currentTime = performance.now();

  for (const player of players) {
    if (!player.active) continue;
    if (player[translations.netData_][translations.dead_]) continue;
    if (!settings.aimbot_.targetKnocked_ && player.downed) continue;
    if (me.__id === player.__id) continue;
    if (!meetsLayerCriteria(player.layer, localLayer, isLocalOnBypassLayer)) continue;
    if (findTeam(player) === meTeam && !settings.aimbot_.aimAllies_) continue;

    const screenPos = gameManager.game[translations.camera_][translations.pointToScreen_]({
      x: player[translations.visualPos_].x,
      y: player[translations.visualPos_].y,
    });

    const distance = getDistance(
      screenPos.x,
      screenPos.y,
      gameManager.game[translations.input_].mousePos._x,
      gameManager.game[translations.input_].mousePos._y
    );

    if (distance > fovRadiusSquared) continue;
    const screenDistance = Math.sqrt(distance);
    const distanceFactor = Math.exp(-screenDistance / 120);
    const isCurrent = player === state.currentEnemy_;
    const continuityBonus = isCurrent ? 0.02 : 0;
    
    // Simple final score (no shootability check - aim at all enemies equally)
    const score = distanceFactor + continuityBonus;

    if (score > bestScore) {
      bestScore = score;
      bestTarget = player;
    }
  }

  return bestTarget;
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
    
    // Skip teammates unless melee attackAllies or aimbot aimAllies is enabled
    if (findTeam(player) === meTeam && !(settings.meleeLock_.attackAllies_ || settings.aimbot_.aimAllies_)) continue;

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

function isLootTargetable(lootObject) {
  // Check if object is a valid loot item to target
  if (!lootObject || lootObject.dead) return false;
  if (!lootObject.collider) return false;
  if (lootObject.layer === undefined) return false;
  
  const objectType = lootObject.type || '';
  
  // List of loot items we can shoot
  const LOOT_PATTERNS = [
    'crate_',
    'chest_',
    'barrel_',
    'bookshelf_',
    'drawers_',
    'locker_',
    'deposit_box_',
    'refrigerator_',
    'control_panel_',
    'case_',
    'oven_',
    'bed_',
    'couch_',
    'table_',
    'window',
    'pot_',
    'planter_',
  ];
  
  return LOOT_PATTERNS.some(pattern => objectType.includes(pattern));
}

function findMeleeLootTarget(me) {
  // Find closest destructible loot object for melee targeting
  if (!settings.meleeLock_.enabled_) return null;
  
  const game = gameManager.game;
  const idToObj = game?.[translations.objectCreator_]?.[translations.idToObj_];
  if (!idToObj) return null;
  
  const mePos = me[translations.visualPos_];
  const isLocalOnBypassLayer = isBypassLayer(me.layer);
  const localLayer = getLocalLayer(me);
  const meleeLockDistance = MELEE_ENGAGE_DISTANCE + MELEE_LOCK_HYSTERESIS;
  
  let bestLoot = null;
  let bestDistance = Infinity;
  
  for (const obj of Object.values(idToObj)) {
    if (!isLootTargetable(obj)) continue;
    if (obj.layer !== undefined && !meetsLayerCriteria(obj.layer, localLayer, isLocalOnBypassLayer)) {
      continue;
    }
    
    const objPos = obj[translations.visualPos_];
    if (!objPos) continue;
    
    // Calculate distance in game space
    const distance = Math.hypot(mePos.x - objPos.x, mePos.y - objPos.y);
    
    // Only consider objects within melee range
    if (distance > meleeLockDistance) continue;
    
    if (distance < bestDistance) {
      bestDistance = distance;
      bestLoot = obj;
    }
  }
  
  return bestLoot;
}

function findLootTarget(me) {
  if (!settings.aimbot_.enabled_) return null;
  
  const game = gameManager.game;
  const idToObj = game?.[translations.objectCreator_]?.[translations.idToObj_];
  if (!idToObj) return null;
  
  const mePos = me[translations.visualPos_];
  const isLocalOnBypassLayer = isBypassLayer(me.layer);
  const localLayer = getLocalLayer(me);
  const fovRadiusSquared = settings.aimbot_.fov_ ** 2;
  
  let bestLoot = null;
  let bestScore = -Infinity;
  
  for (const obj of Object.values(idToObj)) {
    if (!isLootTargetable(obj)) continue;
    
    // Check layer compatibility
    if (obj.layer !== undefined && !meetsLayerCriteria(obj.layer, localLayer, isLocalOnBypassLayer)) {
      continue;
    }
    
    const objPos = obj[translations.visualPos_];
    if (!objPos) continue;
    
    // Get screen position
    const screenPos = gameManager.game[translations.camera_][translations.pointToScreen_]({
      x: objPos.x,
      y: objPos.y,
    });
    
    const distance = getDistance(
      screenPos.x,
      screenPos.y,
      gameManager.game[translations.input_].mousePos._x,
      gameManager.game[translations.input_].mousePos._y
    );
    
    // Must be within FOV
    if (distance > fovRadiusSquared) continue;
    
    // Calculate distance in game space
    const gameDist = getDistance(mePos.x, mePos.y, objPos.x, objPos.y);
    const screenDistance = Math.sqrt(distance);
    
    // Simple scoring: prefer closer loot items
    const score = -screenDistance + (gameDist < 100 ? 50 : 0); // Boost nearby items
    
    if (score > bestScore) {
      bestScore = score;
      bestLoot = obj;
    }
  }
  
  return bestLoot;
}
function isTargetingAlly(me) {
  if (!state.currentEnemy_ || !me) return false;
  const meTeam = findTeam(me);
  const targetTeam = findTeam(state.currentEnemy_);
  return meTeam === targetTeam;
}

/**
 * Ticker for melee lock autoattack - maintains continuous fire hold while conditions are met
 * Pattern: simulateMouseDown on active, simulateMouseUp when conditions end
 */
function meleeLockAutoAttackTicker() {
  try {
    const game = gameManager.game;
    if (!game || !game.initialized) {
      // Stop attacking if game not initialized
      if (state.isMeleeAutoAttacking_) {
        simulateMouseUp();
        state.isMeleeAutoAttacking_ = false;
      }
      return;
    }

    const me = game[translations.activePlayer_];
    if (!me) {
      if (state.isMeleeAutoAttacking_) {
        simulateMouseUp();
        state.isMeleeAutoAttacking_ = false;
      }
      return;
    }

    // Check if melee autoattack should be active
    const hasValidEnemy = state.meleeLockEnemy_ && 
      state.meleeLockEnemy_.active && 
      !state.meleeLockEnemy_[translations.netData_]?.[translations.dead_];
    
    const shouldAttack = settings.aimbot_.automatic_ && 
      settings.meleeLock_.autoAttack_ &&
      settings.meleeLock_.enabled_ &&
      hasValidEnemy;

    const currentWeaponIndex = game[translations.activePlayer_][translations.localData_][translations.curWeapIdx_];
    const isMeleeEquipped = currentWeaponIndex === 2;

    console.log(`[MeleeLockTicker] hasEnemy=${hasValidEnemy}, shouldAttack=${shouldAttack}, automatic=${settings.aimbot_.automatic_}, autoAttack=${settings.meleeLock_.autoAttack_}, enabled=${settings.meleeLock_.enabled_}, melee=${isMeleeEquipped}, isAttacking=${state.isMeleeAutoAttacking_}`);

    if (shouldAttack && isMeleeEquipped) {
      // Start or maintain attack
      if (!state.isMeleeAutoAttacking_) {
        console.log('[MeleeLockTicker] FIRING - simulateMouseDown()');
        simulateMouseDown();
        state.isMeleeAutoAttacking_ = true;
      }
    } else {
      // Stop attack
      if (state.isMeleeAutoAttacking_) {
        console.log('[MeleeLockTicker] STOPPED - simulateMouseUp()');
        simulateMouseUp();
        state.isMeleeAutoAttacking_ = false;
      }
    }
  } catch (error) {
    console.error('[MeleeLockTicker] Error:', error);
    // On error, safely stop attacking
    if (state.isMeleeAutoAttacking_) {
      simulateMouseUp();
      state.isMeleeAutoAttacking_ = false;
    }
  }
}

function aimbotTicker() {
  try {
    const game = gameManager.game;
    if (
      !game.initialized ||
      !(settings.aimbot_.enabled_ || settings.meleeLock_.enabled_) ||
      game[translations.uiManager_].spectating
    ) {
      setAimState(new AimState('idle'));
      aimOverlays.updateHUD(null);
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
    
    // Check for grenades if anti-explosion is enabled
    const now = performance.now();
    if (settings.meleeLock_.antiExplosion_ && now - state.lastGrenadeCheckTime_ > ANTI_GRENADE_CHECK_INTERVAL) {
      const grenades = findGrenades(me);
      state.nearestGrenade_ = grenades.length > 0 ? grenades[0] : null;
      state.lastGrenadeCheckTime_ = now;
      
      // Calculate evasion direction if needed
      if (grenades.length > 0) {
        const mePos = me[translations.visualPos_];
        state.grenadeEvasionAngle_ = getGrenadeEvasionDirection(grenades, mePos);
      } else {
        state.grenadeEvasionAngle_ = null;
      }
    }

    try {
      const currentWeaponIndex =
        game[translations.activePlayer_][translations.localData_][translations.curWeapIdx_];
      const isMeleeEquipped = currentWeaponIndex === 2;
      const isGrenadeEquipped = currentWeaponIndex === 3;
      const isAiming = game[translations.inputBinds_].isBindDown(inputCommands.Fire_);
      
      const isGrenadeCooking = isGrenadeEquipped && isAiming;
      const hasEnemyNearby = state.currentEnemy_ && 
        state.currentEnemy_.active && 
        !state.currentEnemy_[translations.netData_][translations.dead_];
      
      // In blatant mode, aim automatically without clicking. Otherwise require clicking or automatic mode
      const shouldAim = settings.aimbot_.blatant_ || isAiming || (settings.aimbot_.automatic_ && hasEnemyNearby);
      
      const wantsMeleeLock = settings.meleeLock_.enabled_ && 
        (settings.aimbot_.blatant_ || settings.aimbot_.automatic_ || isAiming);
      
      // AUTO CRATE BREAK: Move to and break crates automatically
      const crateBreakState = updateAutoCrateBreak(me);
      if (crateBreakState && settings.autoCrateBreak_?.enabled_) {
        // Auto Crate Break takes control
        setAimState(crateBreakState);
        aimOverlays.hideAll();
        state.lastTargetScreenPos_ = null;
        aimState.silentAimAngle_ = null;
        return; // Skip all other aim logic
      }
      
      // Anti-grenade: Check for nearby grenades
      const mePos = me[translations.visualPos_];
      const nearbyGrenades = findNearbyGrenades(mePos, me.layer);
      const grenadeEvadeDir = calculateGrenadeEvadeDirection(mePos, nearbyGrenades);
      const shouldEvadeGrenade = grenadeEvadeDir !== null;

      let meleeEnemy = state.meleeLockEnemy_;
      if (wantsMeleeLock) {
        let targetStillValid = false;
        if (meleeEnemy) {
          // Check both if the target is still valid AND if we should stick with it (hysteresis)
          if (meleeEnemy.active !== undefined) {
            targetStillValid = meleeEnemy.active && !meleeEnemy[translations.netData_]?.[translations.dead_];
          } else {
            targetStillValid = !meleeEnemy.dead;
          }
          
          // Apply hysteresis to prevent rapid target switching
          if (targetStillValid && state.meleeLockTargetId_ === meleeEnemy.__id) {
            // Same target - check if it's still in reasonable range
            const mePos = me[translations.visualPos_];
            const enemyPos = meleeEnemy[translations.visualPos_];
            const distance = Math.hypot(mePos.x - enemyPos.x, mePos.y - enemyPos.y);
            const hysteresisDistance = MELEE_DETECTION_DISTANCE + MELEE_LOCK_HYSTERESIS * 2;
            
            targetStillValid = distance <= hysteresisDistance;
          }
        }
        
        if (!targetStillValid) {
          meleeEnemy = findClosestTarget(players, me);
          if (!meleeEnemy) {
            const lootTarget = findMeleeLootTarget(me);
            if (lootTarget) {
              meleeEnemy = lootTarget;
            }
          }
          
          state.meleeLockEnemy_ = meleeEnemy;
          state.meleeLockTargetId_ = meleeEnemy?.__id || null;
          state.meleeLockStartTime_ = meleeEnemy ? performance.now() : null;
        }
      } else {
        meleeEnemy = null;
        state.meleeLockEnemy_ = null;
        state.meleeLockTargetId_ = null;
        state.meleeLockStartTime_ = null;
      }

      let distanceToMeleeEnemy = Infinity;
      let predictedMeleePos = null;
      let isMeleeLootTarget = false;
      
      if (meleeEnemy) {
        const mePos = me[translations.visualPos_];
        const enemyPos = meleeEnemy[translations.visualPos_];
        
        // Calculate base distance
        distanceToMeleeEnemy = Math.hypot(mePos.x - enemyPos.x, mePos.y - enemyPos.y);
        
        // Check if this is a loot object vs a player
        // Players have 'active' property, loot objects don't
        isMeleeLootTarget = meleeEnemy.active === undefined;
        
        // Use enemy current position directly
        predictedMeleePos = enemyPos;
      }

      // Improved: Extended detection range + hysteresis for smoother engagement
      const adaptiveEngageDistance = meleeEnemy ? getAdaptiveMeleeDistance(meleeEnemy) : MELEE_ENGAGE_DISTANCE;
      const meleeTargetInRange = distanceToMeleeEnemy <= adaptiveEngageDistance + MELEE_LOCK_HYSTERESIS;
      const meleeTargetDetected = distanceToMeleeEnemy <= MELEE_DETECTION_DISTANCE + MELEE_LOCK_HYSTERESIS;
      
      // In blatant mode with auto melee, extend detection range significantly
      // This allows auto-switch to happen from further away
      const blatantMeleeDistance = MELEE_DETECTION_DISTANCE * 1.5; // ~11 units instead of 7.5
      const isBlatantMeleeRange = settings.aimbot_.blatant_ && 
        settings.meleeLock_.autoMelee_ && 
        distanceToMeleeEnemy <= blatantMeleeDistance;

      // Auto-switch to melee if enabled and target in range
      if (
        wantsMeleeLock &&
        settings.meleeLock_.autoMelee_ &&
        !isMeleeEquipped &&
        (meleeTargetInRange || isBlatantMeleeRange) &&
        meleeEnemy
      ) {
        queueInput(inputCommands.EquipMelee_);
        state.isSwitchingToMelee_ = true; // Mark that we're switching to melee
      }

      // Reset flag if we already have melee equipped or target is out of range
      if (isMeleeEquipped || (!meleeTargetInRange && !isBlatantMeleeRange)) {
        state.isSwitchingToMelee_ = false;
      }

      // Melee lock is active if: wants melee, has enemy/loot in range, target is valid
      // Also allow engagement if we just queued melee switch and are waiting for it to complete
      const meleeLockActive = wantsMeleeLock && (meleeTargetInRange || isBlatantMeleeRange) && meleeEnemy && 
        (isMeleeEquipped || state.isSwitchingToMelee_);

      if (meleeLockActive) {
        const mePos = me[translations.visualPos_];
        const enemyPos = meleeEnemy[translations.visualPos_];
        
        // Use predicted position if available, otherwise use current position
        const targetPos = predictedMeleePos || enemyPos;

        const weapon = findWeapon(me);
        const bullet = findBullet(weapon);
        
        // Never attack loot objects
        if (isMeleeLootTarget) {
          // Skip loot objects completely - don't attack them
          return;
        }

        // For enemies, check wallcheck setting
        let isMeleeTargetShootable = !settings.aimbot_.wallcheck_ || canCastToPlayer(me, meleeEnemy, weapon, bullet);

        if (isMeleeTargetShootable) {
          // Calculate movement direction to intercept target
          // Move TOWARDS the enemy
          const moveAngle = calcAngle(mePos, targetPos);
          let finalMoveAngle = moveAngle;
          
          // Anti-explosion: Override movement if critical danger
          if (settings.meleeLock_.antiExplosion_ && nearbyGrenades.length > 0) {
            // Check if any grenade is in immediate danger zone
            for (const grenade of nearbyGrenades) {
              if (grenade.distance <= GRENADE_EXPLOSION_RADIUS * 0.8) {
                // CRITICAL: Inside explosion radius - evade immediately
                finalMoveAngle = grenadeEvadeDir;
                break;
              }
            }
          }
          
          const moveDir = {
            touchMoveActive: true,
            touchMoveLen: 255,
            x: Math.cos(finalMoveAngle),
            y: Math.sin(finalMoveAngle),
          };

          const screenPos = game[translations.camera_][translations.pointToScreen_]({
            x: targetPos.x,
            y: targetPos.y,
          });
          
          setAimState(new AimState('meleeLock', { x: screenPos.x, y: screenPos.y }, moveDir, true));
          aimUpdated = true;
          aimOverlays.hideAll();
          state.lastTargetScreenPos_ = null;
        }
        
        // Note: Melee autoattack is now handled by meleeLockAutoAttackTicker
        // It will trigger simulateMouseDown/Up based on conditions
        
        // Early return if we set up melee lock (either shootable or not)
        if (isMeleeTargetShootable || settings.aimbot_.automatic_) {
          return;
        }
      }

      // Improved: More gradual target loss with detection range
      if (wantsMeleeLock && !meleeTargetDetected) {
        state.meleeLockEnemy_ = null;
      }

      // Also disable if grenade equipped without cooking
      if (!settings.aimbot_.enabled_ || meleeLockActive ) {
        setAimState(new AimState('idle'));
        aimOverlays.hideAll();
        state.lastTargetScreenPos_ = null;
        return;
      }

      const canEngageAimbot = shouldAim;

      let enemy =
        state.focusedEnemy_?.active &&
          !state.focusedEnemy_[translations.netData_][translations.dead_]
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
        const mePos = me[translations.visualPos_];
        const enemyPos = enemy[translations.visualPos_];
        const distanceToEnemy = Math.hypot(mePos.x - enemyPos.x, mePos.y - enemyPos.y);

        if (enemy !== state.currentEnemy_ && !state.focusedEnemy_) {
          state.currentEnemy_ = enemy;
          state.previousEnemies_[enemy.__id] = [];
          state.velocityBuffer_[enemy.__id] = [];
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
        const bulletRange = bullet?.distance || Infinity;

        // Check if target is within bullet range
        // Blatant mode: aim regardless of walls. Otherwise check shootability
        const canAimAtTarget = distanceToEnemy <= bulletRange &&
          (settings.aimbot_.blatant_ || !settings.aimbot_.wallcheck_ || canCastToPlayer(me, enemy, weapon, bullet));
        
        // For actual shooting, ALWAYS check if target is truly shootable (not blocked by walls)
        // AutoFire must always respect actual walls regardless of wallcheck setting
        const isTargetShootable =
          distanceToEnemy <= bulletRange &&
          canCastToPlayer(me, enemy, weapon, bullet);
        
        // Update state for AutoFire to check
        state.isCurrentEnemyShootable_ = isTargetShootable;
        
        // Calculate direction and target info for HUD
        const dx = enemyPos.x - mePos.x;
        const dy = enemyPos.y - mePos.y;
        const direction = Math.atan2(dy, dx);
        const targetName = enemy.nameText?._text || enemy.name || 'Unknown';
        
        // Get equipment levels from netData
        const netData = enemy[translations.netData_];
        
        // Dynamic detection of equipment keys (Scan enemy netData)
        if (!translations.helmet_ || !translations.vest_ || !translations.backpack_) {
            for (const key in netData) {
                const val = netData[key];
                if (typeof val === 'string') {
                    if (!translations.helmet_ && val.includes('helmet')) {
                        translations.helmet_ = key;
                    }
                    if (!translations.vest_ && val.includes('chest')) {
                        translations.vest_ = key;
                    }
                    if (!translations.backpack_ && val.includes('backpack')) {
                        translations.backpack_ = key;
                    }
                }
            }
        }
        
        // Helper keys for equipment
        const helmetKey = translations.helmet_ || 'm_helmet';
        const chestKey = translations.vest_ || 'm_chest';
        const backpackKey = translations.backpack_ || 'm_backpack';

        const helmetType = netData?.[helmetKey] || '';
        const chestType = netData?.[chestKey] || '';
        const backpackType = netData?.[backpackKey] || 'backpack00';
        const activeWeapon = netData?.[translations.activeWeapon_] || '';
        
        const helmetLevel = getLevel(helmetType);
        const chestLevel = getLevel(chestType);
        const bagLevel = getLevel(backpackType);
        
        const targetInfo = {
          direction,
          targetName,
          targetPos: enemyPos,
          distance: distanceToEnemy,
          helmetLevel,
          chestLevel,
          bagLevel,
          activeWeapon,
        };
        
        // Update HUD with target info
        aimOverlays.updateHUD(targetInfo);

        if (
          canEngageAimbot &&
          (settings.aimbot_.enabled_ || (settings.meleeLock_.enabled_ && distanceToEnemy <= 8))
        ) {
          if (canAimAtTarget) {
            setAimState(
              new AimState('aimbot', { x: predictedPos.x, y: predictedPos.y }, null, true)
            );
            state.lastTargetScreenPos_ = { x: predictedPos.x, y: predictedPos.y };
            aimUpdated = true;
            const aimSnapshot = aimState.lastAimPos_;
            dotTargetPos = aimSnapshot
              ? { x: aimSnapshot.clientX, y: aimSnapshot.clientY }
              : { x: predictedPos.x, y: predictedPos.y };
            isDotTargetShootable = isTargetShootable;
          } else {
            dotTargetPos = { x: predictedPos.x, y: predictedPos.y };
            isDotTargetShootable = false;
          }
        } else {
          dotTargetPos = { x: predictedPos.x, y: predictedPos.y };
          isDotTargetShootable = isTargetShootable;
        }
        
      } else {
        // No enemy found, update HUD to null
        aimOverlays.updateHUD(null);
        const lootTarget = findLootTarget(me);
        if (lootTarget) {
          state.currentLootTarget_ = lootTarget;
          
          const lootPos = lootTarget[translations.visualPos_];
          const lootScreenPos = gameManager.game[translations.camera_][translations.pointToScreen_]({
            x: lootPos.x,
            y: lootPos.y,
          });
          
          const distanceToLoot = Math.hypot(lootPos.x - mePos.x, lootPos.y - mePos.y);
          
          if (canEngageAimbot && settings.aimbot_.enabled_) {
            const weapon = findWeapon(me);
            const bullet = findBullet(weapon);
            const bulletRange = bullet?.distance || Infinity;
            
            // Check if loot is within bullet range
            // Blatant mode: aim regardless of walls. Otherwise check shootability
            const canAimAtLoot = distanceToLoot <= bulletRange &&
              (settings.aimbot_.blatant_ || !settings.aimbot_.wallcheck_ || canCastToPlayer(me, lootTarget, weapon, bullet));
            
            const isLootShootable = distanceToLoot <= bulletRange &&
              canCastToPlayer(me, lootTarget, weapon, bullet);
            
            if (canAimAtLoot) {
              setAimState(
                new AimState('aimbot', { x: lootScreenPos.x, y: lootScreenPos.y }, null, true)
              );
              state.lastTargetScreenPos_ = { x: lootScreenPos.x, y: lootScreenPos.y };
              aimUpdated = true;
              const aimSnapshot = aimState.lastAimPos_;
              dotTargetPos = aimSnapshot
                ? { x: aimSnapshot.clientX, y: aimSnapshot.clientY }
                : { x: lootScreenPos.x, y: lootScreenPos.y };
              isDotTargetShootable = isLootShootable;
              previewTargetPos = { x: lootScreenPos.x, y: lootScreenPos.y };
            } else {
              dotTargetPos = { x: lootScreenPos.x, y: lootScreenPos.y };
              isDotTargetShootable = false;
              previewTargetPos = { x: lootScreenPos.x, y: lootScreenPos.y };
            }
          }
        } else {
          state.currentLootTarget_ = null;
        }
        
        if (!aimUpdated) {
          previewTargetPos = null;
          dotTargetPos = null;
        }
      }

      if (!aimUpdated) {
        // Check for grenade auto-evasion even when not aiming
        if (settings.meleeLock_.antiExplosion_ && nearbyGrenades.length > 0 && grenadeEvadeDir !== null) {
          // Check if in danger zone
          let inDangerZone = false;
          for (const grenade of nearbyGrenades) {
            if (grenade.distance <= GRENADE_SAFE_DISTANCE) {
              inDangerZone = true;
              break;
            }
          }
          
          if (inDangerZone) {
            const evadeDir = {
              touchMoveActive: true,
              touchMoveLen: 255,
              x: Math.cos(grenadeEvadeDir),
              y: Math.sin(grenadeEvadeDir),
            };
            
            setAimState(new AimState('idle', null, evadeDir, true));
            aimOverlays.hideAll();
            state.lastTargetScreenPos_ = null;
            return;
          }
        }
        
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
    setAimState(new AimState({ mode: 'idle', immediate: true }));
    state.lastTargetScreenPos_ = null;
  }
}

/**
 * Cleanup obsolete velocity data to prevent memory leaks
 * Called periodically to clear tracking for disconnected players
 */
function cleanupObsoleteVelocityData() {
  const game = gameManager.game;
  if (!game) return;

  const playerBarn = game?.[translations.playerBarn_];
  const playerPool = playerBarn?.playerPool?.[translations.pool_];
  const activePlayerIds = new Set();

  if (Array.isArray(playerPool)) {
    playerPool.forEach(p => {
      if (p && p.__id) activePlayerIds.add(p.__id);
    });
  }

  // Remove velocity data for disconnected players
  for (const playerId in state.velocityBuffer_) {
    if (!activePlayerIds.has(parseInt(playerId))) {
      delete state.velocityBuffer_[playerId];
    }
  }

  for (const playerId in state.previousEnemies_) {
    if (!activePlayerIds.has(parseInt(playerId))) {
      delete state.previousEnemies_[playerId];
    }
  }
}

export default function () {
  const startTicker = () => {
    const uiRoot = getUIRoot();
    if (aimOverlays.ensureInitialized(uiRoot)) {
      if (!tickerAttached) {
        gameManager.pixi._ticker.add(aimbotTicker);
        if (!meleeLockAutoAttackTickerId) {
          meleeLockAutoAttackTickerId = setInterval(meleeLockAutoAttackTicker, 16);
        }
        tickerAttached = true;
      }
    } else {
      requestAnimationFrame(startTicker);
    }
  };

  startTicker();
}

export function hasValidTarget() {
  return state.currentEnemy_ && 
    state.currentEnemy_.active && 
    !state.currentEnemy_[translations.netData_][translations.dead_];
}

export function getAimbotShootableState() {
  return state.isCurrentEnemyShootable_;
}

export function isTargetingLoot() {
  return state.currentLootTarget_ !== null;
}

export function getCurrentTarget() {
  return state.currentEnemy_;
}

export function isEnemyBehindWall(localPlayer, targetPlayer) {
  return !canCastToPlayer(localPlayer, targetPlayer, null, null);
}
// Expose to global scope to avoid circular dependency with AutoCrateBreak
if (typeof globalThis !== 'undefined') {
  globalThis.__AIMBOT_MODULE__ = {
    hasValidTarget,
    getCurrentTarget,
    isEnemyBehindWall,
    getAimbotShootableState,
  };
}