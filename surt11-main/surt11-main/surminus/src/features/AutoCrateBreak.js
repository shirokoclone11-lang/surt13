import { gameManager, settings, inputState, aimState } from '@/core/state.js';
import { translations } from '@/core/obfuscatedNameTranslator.js';
import { inputCommands, PIXI } from '@/utils/constants.js';
import { setAimState, AimState } from '@/core/aimController.js';
import { outer } from '@/core/outer.js';
import { ref_addEventListener } from '@/core/hook.js';
import { collisionHelpers } from '@/utils/math.js';

const getAimbotData = () => {
  try {
    // These will be available after aimbot initializes
    const AimbotModule = globalThis.__AIMBOT_MODULE__ || {};
    return {
      hasValidTarget: AimbotModule.hasValidTarget || (() => false),
      getCurrentTarget: AimbotModule.getCurrentTarget || (() => null),
      isEnemyBehindWall: AimbotModule.isEnemyBehindWall || (() => false),
      getAimbotShootableState: AimbotModule.getAimbotShootableState || (() => false),
    };
  } catch (e) {
    return {
      hasValidTarget: () => false,
      getCurrentTarget: () => null,
      isEnemyBehindWall: () => false,
      getAimbotShootableState: () => false,
    };
  }
};

const CRATE_PATTERNS = [
  'crate_',
  'chest_',
  'case_',
  'locker',
  'deposit',
  'drawers',
  'toilet',
  'gun_mount_01', 'gun_mount_02', 'gun_mount_03', 'gun_mount_04', 'gun_mount_05',
  'planter',
  'rack',
  'stand',
  'book',
  'vending',
  'stone_04', 'stone_05',
  'tree_03', 'tree_03cb', 'tree_03d', 'tree_03f', 'tree_03h', 'tree_03sp', 'tree_03su', 'tree_03sv', 'tree_03w',     
  'bookshelf',
  'towelrack_01',
  'pot',
  'potato',
  'egg',
  'pumpkin',
];

// Configuration
const DEFAULT_DETECTION_RADIUS = 15; // Radius to detect crates
const DEFAULT_ATTACK_RADIUS = 4.5; // Attack when very close (melee range)
const DEFAULT_MOVEMENT_RADIUS = 10; // Move towards crate until within this range
const MELEE_SLOT = 2; // Assuming melee weapon is in slot 2

// ESP Configuration
const ESP_LINE_COLOR = 0xFFFF00; // Yellow
const ESP_LINE_ALPHA = 0.8;
const ESP_LINE_WIDTH = 2;
// Mouse button constant
const PRIMARY_BUTTON = 0;

// State
let currentTarget = null;
let lastAttackTime = 0;
let isAutoAttacking = false;
let lastMeleeSwitchTime = -Infinity; // Start with very old time so first attack doesn't wait
const MELEE_SWITCH_DELAY = 50; // Wait 50ms after switching to melee before attacking

/**
 * Check if an object is a breakable crate/container
 */
function isCrate(obj) {
  if (!obj || obj.dead) return false;
  // Don't require collider - some objects might not have it
  const type = obj.type || '';
  return CRATE_PATTERNS.some(pattern => type.includes(pattern));
}

/**
 * Check if player and object are on same layer
 */
function sameLayer(objLayer, playerLayer) {
  if (objLayer === 2 || objLayer === 3) return true;
  if (playerLayer === 2 || playerLayer === 3) return true;
  return objLayer === playerLayer;
}

const BLOCKING_PATTERNS = [
  'bollard_',
  'sandbags_',
  'hedgehog',
  'silo_',
  'metal_wall_',
  'brick_wall_',
  'concrete_wall_',
  'container_wall_',
  'warehouse_wall_',
];

/**
 * Check if an obstacle is blocking the path to a crate
 */
function isObstacleBlocking(obstacle) {
  if (obstacle.collidable === false) return false;
  if (obstacle.dead) return false;
  
  const type = obstacle.type || '';
  
  if (obstacle.isWall === true || obstacle.destructible === false) {
    // Exception: Don't block if it's the target itself (unlikely here but safe)
    return true;
  }

  return BLOCKING_PATTERNS.some(pattern => type.includes(pattern));
}

/**
 * Find the closest crate to the player
 */
function findClosestCrate(player) {
  const detectionRadius = settings.autoCrateBreak_?.detectionRadius_ ?? DEFAULT_DETECTION_RADIUS;
  const game = gameManager.game;
  const idToObj = game?.[translations.objectCreator_]?.[translations.idToObj_];
  if (!idToObj) return null;
  
  const playerPos = player[translations.visualPos_];
  if (!playerPos) return null;
  
  const playerLayer = player.layer;
  let bestCrate = null;
  let bestDistance = Infinity;
  
  for (const obj of Object.values(idToObj)) {
    if (!isCrate(obj)) continue;
    if (!sameLayer(obj.layer, playerLayer)) continue;
    
    const objPos = obj[translations.visualPos_] || obj.pos;
    if (!objPos) continue;
    
    const distance = Math.hypot(playerPos.x - objPos.x, playerPos.y - objPos.y);
    if (distance > detectionRadius) continue;
    
    // Skip wall check - find all breakable crates in radius, not just visible ones
    // This allows targeting crates through walls
    
    if (distance < bestDistance) {
      bestDistance = distance;
      bestCrate = obj;
    }
  }
  return bestCrate ? { obj: bestCrate, distance: bestDistance } : null;
}

/**
 * Calculate movement direction towards crate
 */
function getMoveDirection(playerPos, cratePos) {
  const dx = cratePos.x - playerPos.x;
  const dy = cratePos.y - playerPos.y;
  const angle = Math.atan2(dy, dx);
  
  return {
    touchMoveActive: true,
    touchMoveLen: 255,
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
}

/**
 * Queue melee weapon switch
 */
function switchToMelee() {
  if (!inputState.queuedInputs_.includes(inputCommands.EquipMelee_)) {
    inputState.queuedInputs_.push(inputCommands.EquipMelee_);
    lastMeleeSwitchTime = performance.now();
  }
}

/**
 * Simulate mouse down for attack
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
 * Simulate mouse up to stop attack
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

/**
 * Initialize settings
 */
export function initAutoCrateBreakSettings() {
  if (!settings.autoCrateBreak_) {
    settings.autoCrateBreak_ = {
      enabled_: false,
      autoSwitchMelee_: true,
      autoAttack_: true,
      detectionRadius_: DEFAULT_DETECTION_RADIUS,
    };
  }
}

/**
 * Draw ESP line to the current target
 */
function drawESPLine(game, me, target) {
  if (!me || !me.container) return;
  const container = me.container;
  const targetId = 'autoCrateESP';
  
  if (!container[targetId]) {
    if (!PIXI.Graphics_) return;
    container[targetId] = new PIXI.Graphics_();
    container.addChild(container[targetId]);
  }

  const graphics = container[targetId];
  if (!graphics) return;
  graphics.clear();

  if (!target || !settings.autoCrateBreak_?.enabled_) return;

  const cratePos = target[translations.visualPos_] || target.pos;
  const mePos = me[translations.visualPos_];
  if (!cratePos || !mePos) return;

  const endX = (cratePos.x - mePos.x) * 16; 
  const endY = (mePos.y - cratePos.y) * 16;

  graphics.lineStyle(ESP_LINE_WIDTH, ESP_LINE_COLOR, ESP_LINE_ALPHA);
  graphics.moveTo(0, 0);
  graphics.lineTo(endX, endY);
}

/**
 * Check if player is currently healing
 * Based on AutoHeal.js mechanism: check activeWeapon in netData
 */
function isPlayerHealing(player) {
  if (!player) return false;
  
  const netData = player[translations.netData_];
  const activeWeapon = netData?.[translations.activeWeapon_];
  
  if (!activeWeapon) return false;
  
  // Check if active weapon is a healing item
  const weaponLower = activeWeapon.toLowerCase();
  return (
    weaponLower.includes('bandage') || 
    weaponLower.includes('health') || 
    weaponLower.includes('medkit') || 
    weaponLower.includes('soda') || 
    weaponLower.includes('pill') ||
    weaponLower.includes('painkiller')
  );
}

/**
 * Main update function
 */
export function updateAutoCrateBreak(player) {
  if (!settings.autoCrateBreak_?.enabled_) {
    currentTarget = null;
    if (isAutoAttacking) {
      simulateMouseUp();
      isAutoAttacking = false;
    }
    drawESPLine(gameManager.game, player, null);
    return null;
  }

  // CANCELLATION: If player is healing, stop auto break
  if (isPlayerHealing(player)) {
    currentTarget = null;
    if (isAutoAttacking) {
      simulateMouseUp();
      isAutoAttacking = false;
    }
    drawESPLine(gameManager.game, player, null);
    return null;
  }

  // CHECK AIMBOT: If aimbot has a valid target and it's shootable, stop crate break
  const aimbot = getAimbotData();
  if (aimbot.hasValidTarget?.()) {
    const aimbotTarget = aimbot.getCurrentTarget?.();
    if (aimbotTarget) {
      const player_ = gameManager.game?.[translations.activePlayer_];
      // Check if target is NOT behind wall or is shootable
      const isNotBehindWall = !aimbot.isEnemyBehindWall?.(player_, aimbotTarget);
      const isShootable = aimbot.getAimbotShootableState?.();
      
      if (isNotBehindWall || isShootable) {
        currentTarget = null;
        if (isAutoAttacking) {
          simulateMouseUp();
          isAutoAttacking = false;
        }
        drawESPLine(gameManager.game, player, null);
        return null;
      }
    }
  }

  // CANCELLATION: If user is manually moving (WASD), stop auto break so they can leave
  const binds = gameManager.game[translations.inputBinds_];
  const isMoving = binds.isBindDown(inputCommands.MoveUp_) || 
                   binds.isBindDown(inputCommands.MoveDown_) || 
                   binds.isBindDown(inputCommands.MoveLeft_) || 
                   binds.isBindDown(inputCommands.MoveRight_);

  if (isMoving) {
    currentTarget = null;
    if (isAutoAttacking) {
      simulateMouseUp();
      isAutoAttacking = false;
    }
    drawESPLine(gameManager.game, player, null);
    return null;
  }

  // Find closest crate
  const crateInfo = findClosestCrate(player);
  if (!crateInfo) {
    currentTarget = null;
    if (isAutoAttacking) {
      simulateMouseUp();
      isAutoAttacking = false;
    }
    drawESPLine(gameManager.game, player, null);
    return null;
  }
  
  currentTarget = crateInfo.obj;
  drawESPLine(gameManager.game, player, currentTarget);
  
  const cratePos = currentTarget[translations.visualPos_] || currentTarget.pos;
  const game = gameManager.game;
  
  const currentWeaponIndex = player[translations.localData_]?.[translations.curWeapIdx_];
  const isMeleeEquipped = currentWeaponIndex === MELEE_SLOT;
  
  const screenPos = game[translations.camera_][translations.pointToScreen_]({
    x: cratePos.x,
    y: cratePos.y,
  });
  
  // Check engagement - start attacking when close enough
  if (crateInfo.distance <= DEFAULT_ATTACK_RADIUS) {
    if (!isMeleeEquipped && settings.autoCrateBreak_?.autoSwitchMelee_) {
      switchToMelee();
    }
    // Continue moving while attacking
    const moveDir = getMoveDirection(player[translations.visualPos_], cratePos);
    return new AimState('crateBreak', { x: screenPos.x, y: screenPos.y }, moveDir, true);
  }
  
  // If within movement range but not attack range - prepare melee
  if (crateInfo.distance <= DEFAULT_MOVEMENT_RADIUS) {
    if (!isMeleeEquipped && settings.autoCrateBreak_?.autoSwitchMelee_) {
      switchToMelee();
    }
  }
  
  // Movement logic - always move towards crate
  const moveDir = getMoveDirection(player[translations.visualPos_], cratePos);
  
  return new AimState('crateBreak', { x: screenPos.x, y: screenPos.y }, moveDir, true);
}

export function getCurrentCrateTarget() {
  return currentTarget;
}

/**
 * Auto attack ticker - runs every 16ms to maintain attack state
 */
function autoCrateAttackTicker() {
  if (!settings.autoCrateBreak_?.enabled_) {
    if (isAutoAttacking) {
      simulateMouseUp();
      isAutoAttacking = false;
    }
    return;
  }

  if (!currentTarget) {
    if (isAutoAttacking) {
      simulateMouseUp();
      isAutoAttacking = false;
    }
    return;
  }

  // Check if we should still be attacking
  const game = gameManager.game;
  if (!game) return;
  
  const player = game[translations.activePlayer_];
  if (!player) return;

  const cratePos = currentTarget[translations.visualPos_] || currentTarget.pos;
  const playerPos = player[translations.visualPos_];
  if (!cratePos || !playerPos) return;

  const distance = Math.hypot(playerPos.x - cratePos.x, playerPos.y - cratePos.y);
  const currentWeaponIndex = player[translations.localData_]?.[translations.curWeapIdx_];
  const isMeleeEquipped = currentWeaponIndex === MELEE_SLOT;

  // Auto-hold attack while in attack range
  if (distance <= DEFAULT_ATTACK_RADIUS && isMeleeEquipped && settings.autoCrateBreak_?.autoAttack_) {
    // Wait a bit after melee switch before attacking
    const timeSinceMeleeSwitch = performance.now() - lastMeleeSwitchTime;
    if (timeSinceMeleeSwitch > MELEE_SWITCH_DELAY) {
      if (!isAutoAttacking) {
        simulateMouseDown();
        isAutoAttacking = true;
      }
    }
  } else if (isAutoAttacking) {
    simulateMouseUp();
    isAutoAttacking = false;
  }
}

export default function autoCrateBreak() {
  initAutoCrateBreakSettings();
  
  // Handle mouse events to properly stop attacking
  const handleMouseUp = () => {
    if (isAutoAttacking) {
      isAutoAttacking = false;
    }
  };
  
  Reflect.apply(ref_addEventListener, outer, ['mouseup', handleMouseUp]);
  
  // Start auto attack ticker to maintain attack state
  setInterval(autoCrateAttackTicker, 16);
}