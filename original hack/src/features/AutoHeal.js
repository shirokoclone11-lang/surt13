import { gameManager, settings, inputState } from '@/core/state.js';
import { translations } from '@/core/obfuscatedNameTranslator.js';
import { isGameReady, inputCommands, findTeam } from '@/utils/constants.js';
import { autoFireEnabled } from '@/features/AutoFire.js';

let initialized = false;

// Per-item cooldown tracking
let lastHealthkitTime = 0;
let lastBandageTime = 0;
let lastPainkillerTime = 0;
let lastSodaTime = 0;

// Cooldown durations (in ms)
const HEALTHKIT_COOLDOWN = 3100;
const BANDAGE_COOLDOWN = 2100;
const PAINKILLER_COOLDOWN = 3100;
const SODA_COOLDOWN = 2100;

let healthProp = null;
let boostProp = null;
let inventoryProp = null;

function resolveProps(localData) {
  if (!localData) return;

  // 1. Resolve Health
  if (!healthProp) {
    const candidates = [];
    for (const k in localData) {
      const v = localData[k];
      if (typeof v === 'number' && v > 5 && v <= 100) candidates.push({ k, v });
    }

    if (candidates.length === 1) {
      healthProp = candidates[0].k;
    } else if (candidates.length > 1) {
      const full = candidates.find(c => Math.abs(c.v - 100) < 0.1);
      if (full) {
        healthProp = full.k;
      } else {
        candidates.sort((a, b) => b.v - a.v);
        healthProp = candidates[0].k;
      }
    }
  }

  // 2. Resolve Boost
  // Boost is a number 0-100, distinct from health, curWeapIdx, and zoom.
  if (!boostProp && healthProp) {
    const candidates = [];
    const ignored = [healthProp, translations.curWeapIdx_, translations.zoom_];

    for (const k in localData) {
      if (ignored.includes(k)) continue;
      const v = localData[k];
      if (typeof v === 'number' && v >= 0 && v <= 100) {
        candidates.push(k);
      }
    }

    // If we find candidates, try to find one that is "boost-like"
    // Often boost is 0 initially.
    // If we have multiple, we might guess.
    // For now, let's take the first reasonable candidate.
    if (candidates.length > 0) {
      if (candidates.length === 1) {
        boostProp = candidates[0];
      } else {
        // If multiple, maybe we can assume boost <= 100
        boostProp = candidates[0];
      }
    }
  }

  // 3. Resolve Inventory
  if (!inventoryProp) {
    for (const k in localData) {
      const v = localData[k];
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        if ('bandage' in v || 'healthkit' in v || 'soda' in v) {
          inventoryProp = k;
          break;
        }
      }
    }
  }
}

function getPlayerHealth(player) {
  const localData = player[translations.localData_];
  if (!localData) return 100;
  if (healthProp && localData[healthProp] !== undefined) return localData[healthProp];
  return 100;
}

function getPlayerBoost(player) {
  const localData = player[translations.localData_];
  if (!localData) return 0;
  if (boostProp && localData[boostProp] !== undefined) return localData[boostProp];
  return 0; // Default to 0 if not found
}

function getInventoryCount(player, item) {
  const localData = player[translations.localData_];
  if (!localData || !inventoryProp) return 0;
  const inv = localData[inventoryProp];
  if (!inv || typeof inv !== 'object') return 0;
  return inv[item] || 0;
}

function isHealing(player) {
  const netData = player[translations.netData_];
  const activeWeapon = netData?.[translations.activeWeapon_];
  if (!activeWeapon) return false;

  const w = activeWeapon.toLowerCase();
  return w.includes('bandage') || w.includes('health') || w.includes('medkit') || w.includes('soda') || w.includes('pill');
}

function isReloading(player) {
  const netData = player[translations.netData_];
  if (!netData) return false;
  
  // Check if weapon is reloading
  // Common reload-related properties to check
  for (const key in netData) {
    const val = netData[key];
    if (typeof val === 'number' && key.toLowerCase().includes('reload')) {
      return val > 0;
    }
  }
  
  // Alternative: check active weapon for reload indicator
  const activeWeapon = netData?.[translations.activeWeapon_];
  if (activeWeapon && typeof activeWeapon === 'string') {
    const w = activeWeapon.toLowerCase();
    return w.includes('reload');
  }
  
  return false;
}

function isFighting(game) {
  if (autoFireEnabled) return true;
  const binds = game[translations.inputBinds_];
  if (binds && binds.isBindDown(inputCommands.Fire_)) return true;
  if (inputState.queuedInputs_.includes(inputCommands.Fire_)) return true;
  return false;
}

function isEnemyNear(game, me, threshold) {
  const players = game[translations.playerBarn_]?.playerPool?.[translations.pool_];
  if (!players) return false;

  const meTeam = findTeam(me);
  const mePos = me[translations.visualPos_];
  const meLayer = me.layer;

  for (const p of players) {
    if (!p.active || p.__id === me.__id) continue;
    if (p[translations.netData_]?.[translations.dead_] || p.downed) continue;

    if (findTeam(p) === meTeam) continue;

    const pPos = p[translations.visualPos_];
    const dist = Math.hypot(pPos.x - mePos.x, pPos.y - mePos.y);

    if (dist < threshold) {
      // Check if enemy is in different layer (cave/underground)
      const isDifferentLayer = p.layer !== undefined && p.layer !== meLayer;
      
      // Enemy is only a threat if same layer
      if (!isDifferentLayer) {
        return true;
      }
    }
  }
  return false;
}

function autoHealTick() {
  const ahSettings = settings.autoHeal_;
  if (!ahSettings?.enabled_) return;

  if (!gameManager.game) return;
  const game = gameManager.game;
  const player = game[translations.activePlayer_];

  if (!player || !player.active) return;

  const netData = player[translations.netData_];
  if (netData?.[translations.dead_] || player.downed) return;

  const localData = player[translations.localData_];
  resolveProps(localData);

  if (!healthProp) return;

  // --- Early Exit Checks (like old code) ---
  
  // Don't auto heal if already healing
  if (isHealing(player)) return;

  // Don't auto heal if weapon is reloading
  if (isReloading(player)) return;

  // Don't auto heal if fighting
  if (isFighting(game)) return;

  // Don't auto heal if enemy near (if enemy check enabled)
  if (ahSettings.enemyCheck_) {
    const dist = ahSettings.enemyDistance_ || 15;
    if (isEnemyNear(game, player, dist)) return;
  }

  const health = getPlayerHealth(player);
  const boost = getPlayerBoost(player);
  const now = Date.now();

  const bandages = getInventoryCount(player, 'bandage');
  const kits = getInventoryCount(player, 'healthkit');
  const sodas = getInventoryCount(player, 'soda');
  const pills = getInventoryCount(player, 'painkiller');

  // Get thresholds from settings
  const bandageThresh = ahSettings.bandageThreshold_ || 75;
  const kitThresh = ahSettings.kitThreshold_ || 50;
  const boostThresh = ahSettings.boostThreshold_ || 75;

  // --- HEALTHKIT: health < kitThreshold ---
  if (health < kitThresh && kits > 0 && now - lastHealthkitTime > HEALTHKIT_COOLDOWN) {
    inputState.useItem_ = 'healthkit';
    lastHealthkitTime = now;
    return;
  }

  // --- BANDAGE: health < bandageThreshold ---
  // If out of healthkits, use bandage even if health < kitThreshold
  // Otherwise, only use bandage if health is in range [kitThresh, bandageThresh)
  const shouldUseBandage = (
    bandages > 0 && 
    now - lastBandageTime > BANDAGE_COOLDOWN &&
    (
      (health < kitThresh && kits === 0) ||  // Out of kits - use bandage at any health
      (health < bandageThresh && health >= kitThresh)  // Have kits - use bandage for top-up
    )
  );
  
  if (shouldUseBandage) {
    inputState.useItem_ = 'bandage';
    lastBandageTime = now;
    return;
  }

  // --- PAINKILLER: boost < 50 ---
  // Painkiller has priority over soda for low boost levels
  if (boost < 50 && pills > 0 && now - lastPainkillerTime > PAINKILLER_COOLDOWN) {
    inputState.useItem_ = 'painkiller';
    lastPainkillerTime = now;
    return;
  }

  // --- SODA: boost < boostThreshold ---
  // Only use soda if:
  // 1. Out of painkillers, OR
  // 2. Boost is between 50-75 (safe range where painkiller isn't needed)
  const shouldUseSoda = (
    sodas > 0 && 
    now - lastSodaTime > SODA_COOLDOWN &&
    boost < boostThresh &&
    (pills === 0 || boost >= 50)  // Either no painkillers, or boost is safe
  );

  if (shouldUseSoda) {
    inputState.useItem_ = 'soda';
    lastSodaTime = now;
    return;
  }
}

export default function () {
  if (initialized) return;
  initialized = true;

  const checkReady = setInterval(() => {
    if (gameManager?.pixi?._ticker) {
      clearInterval(checkReady);
      gameManager.pixi._ticker.add(autoHealTick);
    }
  }, 500);
}
