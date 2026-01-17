import { settings } from '@/core/state.js';
import { gameManager } from '@/core/state.js';
import { translations } from '@/core/obfuscatedNameTranslator.js';
import { v2 } from '@/utils/math.js';

// ============================================================================
// GRENADE EVADE CONSTANTS
// ============================================================================

export const GRENADE_EXPLOSION_RADIUS = 20;
export const GRENADE_SAFE_DISTANCE = GRENADE_EXPLOSION_RADIUS + 20;
export const GRENADE_EVADE_SPEED = 255;
export const GRENADE_BASE_RADIUS = 15;
export const ANTI_GRENADE_EVADE_DISTANCE = 25;
export const ANTI_GRENADE_CHECK_INTERVAL = 50;

export const GRENADE_EXPLOSION_PATTERNS = [
  'frag',
  'explosion_frag',
  'smoke',
  'explosion_smoke',
  'gas',
  'concussion',
];

// ============================================================================
// STATE
// ============================================================================

const state = {
  nearestGrenade_: null,
  lastGrenadeCheckTime_: 0,
  grenadeEvasionAngle_: null,
};

// ============================================================================
// LAYER UTILITY
// ============================================================================

const isBypassLayer = (layer) => layer === 2 || layer === 3;

const meetsLayerCriteria = (targetLayer, localLayer, isLocalOnBypass) => {
  if (isBypassLayer(targetLayer)) return true;
  return targetLayer === localLayer;
};

// ============================================================================
// GRENADE DETECTION & EVASION LOGIC
// ============================================================================

/**
 * Find all grenades nearby that could threaten player
 */
export function findNearbyGrenades(playerPos, layer, maxDistance = GRENADE_SAFE_DISTANCE * 1.5) {
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

/**
 * Calculate best direction to evade from grenades
 */
export function calculateGrenadeEvadeDirection(playerPos, grenades) {
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

/**
 * Find grenades with advanced filtering and danger zone calculation
 */
export function findGrenades(me) {
  const game = gameManager.game;
  const idToObj = game?.[translations.objectCreator_]?.[translations.idToObj_];
  if (!idToObj) return [];
  
  const mePos = me[translations.visualPos_];
  const isLocalOnBypassLayer = isBypassLayer(me.layer);
  const localLayer = me.layer;
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

/**
 * Get evasion direction from nearest grenades
 */
export function getGrenadeEvasionDirection(grenades, mePos) {
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

/**
 * Update grenade detection and evasion state
 * Should be called periodically from aimbotTicker
 */
export function updateGrenadeEvasionState(me) {
  const now = performance.now();
  
  // Only check grenades periodically to save performance
  if (now - state.lastGrenadeCheckTime_ > ANTI_GRENADE_CHECK_INTERVAL) {
    if (settings.meleeLock_?.antiExplosion_) {
      const grenades = findGrenades(me);
      state.nearestGrenade_ = grenades.length > 0 ? grenades[0] : null;
      
      // Calculate evasion direction if needed
      if (grenades.length > 0) {
        const mePos = me[translations.visualPos_];
        state.grenadeEvasionAngle_ = getGrenadeEvasionDirection(grenades, mePos);
      } else {
        state.grenadeEvasionAngle_ = null;
      }
    } else {
      state.nearestGrenade_ = null;
      state.grenadeEvasionAngle_ = null;
    }
    
    state.lastGrenadeCheckTime_ = now;
  }
  
  return {
    nearestGrenade: state.nearestGrenade_,
    evasionAngle: state.grenadeEvasionAngle_,
  };
}

/**
 * Get current grenade state
 */
export function getGrenadeState() {
  return {
    nearestGrenade: state.nearestGrenade_,
    evasionAngle: state.grenadeEvasionAngle_,
    lastCheckTime: state.lastGrenadeCheckTime_,
  };
}

/**
 * Check if position is in danger zone
 */
export function isInGrenadesDangerZone(playerPos, grenades) {
  if (!grenades || grenades.length === 0) return false;
  
  for (const grenade of grenades) {
    const distance = Math.hypot(playerPos.x - grenade.pos.x, playerPos.y - grenade.pos.y);
    if (distance <= GRENADE_SAFE_DISTANCE) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if critical danger from grenades
 */
export function isCriticalGrenadeThreaty(playerPos, grenades) {
  if (!grenades || grenades.length === 0) return false;
  
  for (const grenade of grenades) {
    const distance = Math.hypot(playerPos.x - grenade.pos.x, playerPos.y - grenade.pos.y);
    if (distance <= GRENADE_EXPLOSION_RADIUS * 0.8) {
      return true;
    }
  }
  
  return false;
}
