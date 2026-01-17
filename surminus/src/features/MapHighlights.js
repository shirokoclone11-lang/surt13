/**
 * MapHighlights - EXACT REPLICA of Survev Cheat Extension logic
 * Based on decoded strings from Exotic Cheat Client
 */
import { hook } from '@/core/hook.js';
import { settings } from '@/core/state.js';
import { outer } from '@/core/outer.js';

// Exact object types from Exotic Cheat Client (decoded_strings.json lines 791-806)
// Mosin Trees are tree_03 variants from different maps (survev map defs)
const SPECIAL_OBJECTS = [
  'container_01',
  'barn_02',
  'stone_01',
  'tree_01',
  'tree_03',      // Mosin Tree - Base
  'tree_03cb',    // Mosin Tree - Cobalt
  'tree_03d',     // Mosin Tree - Desert
  'tree_03f',     // Mosin Tree - Faction
  'tree_03h',     // Mosin Tree - Halloween
  'tree_03sp',    // Mosin Tree - Spring
  'tree_03su',    // Mosin Tree - Summer
  'tree_03sv',    // Mosin Tree - Savannah
  'tree_03w',     // Mosin Tree - Woods
  'tree_03bh',    // Mosin Tree - Beach (alternative name)
  'stone_04',     // Special stone
  'stone_05',     // Special stone
  'bunker_storm_01'
];

// Color mapping (from decoded_strings colors #FF0000, etc.)
const COLORS = {
  'container_01': 0xFFFF00,     // Yellow
  'barn_02': 0x00FFFF,          // Cyan
  'stone_01': 0x888888,         // Gray
  'tree_01': 0xFF0000,          // Red
  'tree_03': 0xFFFFFF,          // WHITE - Mosin Tree Base
  'tree_03cb': 0xFFFFFF,        // WHITE - Mosin Tree Cobalt
  'tree_03d': 0xFFFFFF,         // WHITE - Mosin Tree Desert
  'tree_03f': 0xFFFFFF,         // WHITE - Mosin Tree Faction
  'tree_03h': 0xFFFFFF,         // WHITE - Mosin Tree Halloween
  'tree_03sp': 0xFFFFFF,        // WHITE - Mosin Tree Spring
  'tree_03su': 0xFFFFFF,        // WHITE - Mosin Tree Summer
  'tree_03sv': 0xFFFFFF,        // WHITE - Mosin Tree Savannah
  'tree_03w': 0xFFFFFF,         // WHITE - Mosin Tree Woods
  'tree_03bh': 0xFFFFFF,        // WHITE - Mosin Tree Beach
  'stone_04': 0xFF00FF,         // Magenta
  'stone_05': 0xFF00FF,         // Magenta
  'bunker_storm_01': 0x9900FF   // Purple
};

// Scale mapping
const SCALES = {
  'container_01': 1,
  'barn_02': 1,
  'stone_01': 6,
  'tree_01': 6,
  'tree_03': 20,
  'tree_03cb': 20,
  'tree_03d': 20,
  'tree_03f': 20,
  'tree_03h': 20,
  'tree_03sp': 20,
  'tree_03su': 20,
  'tree_03sv': 20,
  'tree_03w': 20,
  'tree_03bh': 20,
  'stone_04': 6,
  'stone_05': 6,
  'bunker_storm_01': 2
};

/**
 * Colorize function - EXACT logic from Exotic Cheat Client
 * Accesses: obj.type, shapes, color, scale, zIdx
 */
const colorize = (mapArray) => {
  try {
    mapArray.forEach((entry) => {
      // Access pattern from decoded: entry.obj.type
      if (!entry || !entry.obj || !entry.shapes) return;

      const type = entry.obj.type;

      // Check if type is in our special objects list
      if (!SPECIAL_OBJECTS.includes(type)) return;

      const color = COLORS[type];
      const scale = SCALES[type] || 1;

      // Modify shapes - exact pattern from decoded strings
      entry.shapes.forEach((shape) => {
        shape.color = color;
        shape.scale = scale;
      });

      // Set zIdx to 999 for visibility (from decoded_strings line 813)
      entry.zIdx = 999;
    });
  } catch (e) {
    // %c[Exotic Cheat Client] Map colorize error: (from decoded_strings line 812)
    // Silent fail in production
  }
};

/**
 * Main hook - EXACT method from Exotic Cheat Client
 * Hooks Array.prototype.sort (from decoded_strings line 811)
 */
export default function () {
  hook(outer.Array.prototype, 'sort', {
    apply(original, context, args) {
      try {
        // Check if this is a map render array
        // Pattern: context.some(entry => entry?.obj?.ori != null)
        // The 'ori' property indicates map objects with orientation
        if (settings.mapHighlights_.enabled_ && context.some((entry) => entry?.obj?.ori != null)) {
          colorize(context);
        }
      } catch {
        // Silent fail
      }

      return Reflect.apply(original, context, args);
    },
  });
}