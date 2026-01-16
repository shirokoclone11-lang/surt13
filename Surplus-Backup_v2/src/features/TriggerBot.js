/**
 * ============================================
 * TRIGGERBOT - Tire automatiquement quand un ennemi est visé
 * ============================================
 */

import { gameManager, getUIRoot, settings } from '@/core/state.js';
import { translations } from '@/core/obfuscatedNameTranslator.js';
import { outer } from '@/core/outer.js';
import { findBullet, findWeapon } from '@/utils/constants.js';
import { collisionHelpers, sameLayer, v2 } from '@/utils/math.js';
import { isLayerSpoofActive, originalLayerValue } from '@/features/LayerSpoofer.js';

const state = {
  lastCheckTime_: 0,
  targetLocked_: false,
  shouldShoot_: false,
  lastShotTime_: 0,
  isSemiAuto_: false,
};

// ============================================
// OVERLAYS
// ============================================

const overlayState = {
  fovCircle_: null,
  initialized_: false,
};

const ensureOverlays = (uiRoot) => {
  if (!uiRoot) return false;

  if (!overlayState.fovCircle_) {
    const outerDocument = outer.document;
    overlayState.fovCircle_ = outerDocument.createElement('div');
    overlayState.fovCircle_.classList.add('triggerbot-fov-circle');
    uiRoot.appendChild(overlayState.fovCircle_);
  }

  overlayState.initialized_ = true;
  return true;
};

const updateFovCircle = () => {
  if (!overlayState.fovCircle_) return;

  const game = gameManager?.game;
  if (!game?.initialized) {
    overlayState.fovCircle_.style.display = 'none';
    return;
  }

  if (!settings.triggerBot_.enabled_ || !settings.triggerBot_.showFov_) {
    overlayState.fovCircle_.style.display = 'none';
    return;
  }

  const fovRadius = settings.triggerBot_.fov_;

  // Centré sur la souris (crosshair au centre de l'écran)
  const centerX = outer.innerWidth / 2;
  const centerY = outer.innerHeight / 2;

  overlayState.fovCircle_.style.width = `${fovRadius * 2}px`;
  overlayState.fovCircle_.style.height = `${fovRadius * 2}px`;
  overlayState.fovCircle_.style.left = `${centerX}px`;
  overlayState.fovCircle_.style.top = `${centerY}px`;
  overlayState.fovCircle_.style.display = 'block';
};

const hideAllOverlays = () => {
  if (overlayState.fovCircle_) overlayState.fovCircle_.style.display = 'none';
};

export const triggerBotOverlays = {
  ensureInitialized: ensureOverlays,
  updateFovCircle: updateFovCircle,
  hideAll: hideAllOverlays,
};

// ============================================
// OBSTACLE DETECTION (LINE OF SIGHT)
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
// WEAPON TYPE DETECTION
// ============================================

const SEMI_AUTO_WEAPONS = [
  // Shotguns
  'mp220', 'spas12', 'm870', 'saiga', 'super90', 'usas', 'm1100',
  // Bolt-action snipers
  'mosin', 'sv98', 'awc', 'scout', 'model94', 'blr',
  // Semi-auto snipers/DMRs
  'mk12', 'mk20', 'm39', 'svd', 'garand',
  // Pistols
  'ot38', 'ots38', 'deagle', 'm9', 'm1911', 'p30l', 'flare_gun', 'peacemaker',
];

function isWeaponSemiAuto(weapon) {
  if (!weapon) return false;
  const weaponType = weapon.type || '';
  return SEMI_AUTO_WEAPONS.some(name => weaponType.includes(name));
}

// ============================================
// TARGET DETECTION
// ============================================

// Vérifier si on vise un ennemi
function getEnemyAtCrosshair() {
  if (!gameManager.game?.initialized) return null;

  const game = gameManager.game;
  const me = game[translations.activePlayer_];
  if (!me) return null;

  const myPos = me[translations.visualPos_] || me[translations.pos_];
  if (!myPos) return null;

  // Position du crosshair (centre de l'écran)
  const crosshairX = outer.innerWidth / 2;
  const crosshairY = outer.innerHeight / 2;

  // Mon équipe
  const myTeam = getTeam(me);

  // Trouver les joueurs
  const playerBarn = game[translations.playerBarn_];
  const pool = playerBarn?.playerPool;
  if (!pool) return null;

  let players = pool[translations.pool_] || pool.pool || pool.p || [];
  if (!Array.isArray(players)) {
    players = Object.values(pool).find(v => Array.isArray(v)) || [];
  }

  // Chercher l'ennemi le plus proche du crosshair (en pixels)
  let bestTarget = null;
  const fovRadius = settings.triggerBot_?.fov_ || 80;
  const fovRadiusSquared = fovRadius * fovRadius;
  let minDistance = Infinity;

  for (const p of players) {
    try {
      if (!p?.active) continue;
      if (p.__id === me.__id) continue;

      // Vérifier si mort
      const nd = p[translations.netData_];
      if (nd?.[translations.dead_] || p.dead) continue;

      // Même équipe ? Skip
      if (myTeam && getTeam(p) === myTeam) continue;

      // NOTE: Plus de restriction de layer - on peut viser les ennemis en dessous/dessus

      // Position en pixels à l'écran
      const pos = p[translations.visualPos_] || p.pos;
      if (!pos) continue;

      const screenPos = game[translations.camera_][translations.pointToScreen_](pos);
      if (!screenPos) continue;

      // Distance en pixels du crosshair
      const dx = screenPos.x - crosshairX;
      const dy = screenPos.y - crosshairY;
      const distanceSquared = dx * dx + dy * dy;

      // Si dans le FOV et plus proche que le précédent
      if (distanceSquared <= fovRadiusSquared && distanceSquared < minDistance) {
        minDistance = distanceSquared;
        bestTarget = p;
      }
    } catch (e) { }
  }

  return bestTarget;
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

// ============================================
// MAIN TICKER
// ============================================

// Fonction principale du triggerbot
function triggerBotTick() {
  try {
    const game = gameManager.game;

    if (!game?.initialized || !settings.triggerBot_?.enabled_) {
      state.targetLocked_ = false;
      state.shouldShoot_ = false;
      hideAllOverlays();
      return;
    }

    // Mettre à jour le FOV visuel
    updateFovCircle();

    const me = game[translations.activePlayer_];
    if (!me) {
      state.shouldShoot_ = false;
      return;
    }

    // Déterminer le type d'arme
    const weapon = findWeapon(me);
    const bullet = findBullet(weapon);
    state.isSemiAuto_ = isWeaponSemiAuto(weapon);

    const now = Date.now();
    const reactionDelay = settings.triggerBot_?.delay_ || 50; // Délai de réaction en ms

    // Vérifier si on a un ennemi sous la visée
    const enemy = getEnemyAtCrosshair();

    if (enemy) {
      // Vérifier la ligne de vue (pas d'obstacle entre nous et l'ennemi)
      const hasLineOfSight = canCastToPlayer(me, enemy, weapon, bullet);

      if (!hasLineOfSight) {
        // Obstacle détecté - ne pas tirer
        state.targetLocked_ = false;
        state.shouldShoot_ = false;
        return;
      }

      // Ennemi détecté avec ligne de vue claire
      if (!state.targetLocked_) {
        // Première détection, attendre le délai de réaction
        state.targetLocked_ = true;
        state.lastCheckTime_ = now;
        state.shouldShoot_ = false;
        return;
      }

      // Vérifier si le délai de réaction est écoulé
      if (now - state.lastCheckTime_ >= reactionDelay) {
        if (state.isSemiAuto_) {
          // Pour armes semi-auto: tirer avec un délai entre chaque tir
          const fireRate = weapon?.fireDelay || 150;
          if (now - state.lastShotTime_ >= fireRate) {
            state.shouldShoot_ = true;
            state.lastShotTime_ = now;
          } else {
            state.shouldShoot_ = false;
          }
        } else {
          // Pour armes auto: tir continu
          state.shouldShoot_ = true;
        }
      }
    } else {
      // Plus d'ennemi sous la visée
      state.targetLocked_ = false;
      state.shouldShoot_ = false;
    }
  } catch (error) {
    state.shouldShoot_ = false;
    hideAllOverlays();
  }
}

// ============================================
// PACKET APPLICATION
// ============================================

// Fonction pour appliquer le tir au packet
export function applyTriggerBot(packet) {
  if (!state.shouldShoot_) return;
  if (!settings.triggerBot_?.enabled_) return;

  if (state.isSemiAuto_) {
    // Pour armes semi-auto: pulse unique
    packet.shootStart = true;
    // Ne pas mettre shootHold pour forcer un tir unique
  } else {
    // Pour armes auto: tir continu
    packet.shootStart = true;
    packet.shootHold = true;
  }
}

// ============================================
// INITIALIZATION
// ============================================

let initialized = false;
export default function init() {
  if (initialized) return;
  initialized = true;

  const startTicker = () => {
    const uiRoot = getUIRoot();
    if (triggerBotOverlays.ensureInitialized(uiRoot)) {
      if (gameManager?.pixi?._ticker) {
        gameManager.pixi._ticker.add(triggerBotTick);
        console.log('🟢 TriggerBot initialized');
      } else {
        requestAnimationFrame(startTicker);
      }
    } else {
      requestAnimationFrame(startTicker);
    }
  };

  startTicker();
}
