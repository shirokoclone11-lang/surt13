import { gameManager, settings, inputState } from '@/core/state.js';
import { translations } from '@/core/obfuscatedNameTranslator.js';
import { inputCommands } from '@/utils/constants.js';

let initialized = false;

function autoLootTick() {
  if (!settings.autoLoot_?.enabled_) return;
  if (!gameManager.game?.initialized) return;

  const g = gameManager.game;
  const player = g[translations.activePlayer_];
  if (!player || !player.active || player[translations.netData_]?.[translations.dead_]) return;

  const lootBarn = g[translations.lootBarn_];
  if (!lootBarn) return;

  // lootBarn might be an object containing lootPool, or the pool itself?
  // Translator heuristic was: "lootBarn: '1-3-1-0-5'" or detected by property name.
  // Usually lootBarn has a property (e.g. pool, or loot) that is an array.
  // Let's assume standard structure: lootBarn.lootPool OR lootBarn.pool

  let pool = lootBarn.lootPool || lootBarn.pool || lootBarn[translations.pool_];

  // If we can't find the pool directly, try to finding array property
  if (!pool) {
    const vals = Object.values(lootBarn);
    pool = vals.find(v => Array.isArray(v));
  }

  if (!pool || !Array.isArray(pool)) return;

  const pPos = player[translations.pos_];

  // Configurable radius? Standard interaction radius is usually around 1-2.
  const LOOT_RADIUS = 2.5; // Slightly larger than strict interaction radius to be safe

  let shouldLoot = false;

  for (const item of pool) {
    if (!item.active) continue;

    const iPos = item[translations.pos_];
    const dist = Math.hypot(pPos.x - iPos.x, pPos.y - iPos.y);

    if (dist <= LOOT_RADIUS) {
      shouldLoot = true;
      break; // Found one item, just spam loot
    }
  }

  if (shouldLoot) {
    if (!inputState.queuedInputs_.includes(inputCommands.Loot_)) {
      inputState.queuedInputs_.push(inputCommands.Loot_);
    }
  }
}

export default function () {
  if (initialized) return;
  initialized = true;

  const checkReady = setInterval(() => {
    if (gameManager?.pixi?._ticker) {
      clearInterval(checkReady);
      gameManager.pixi._ticker.add(autoLootTick);
      console.log('🟢 AutoLoot initialized');
    }
  }, 500);
}
