/**
 * ============================================
 * WEAPON PREDICTION CONFIG
 * Configuration de prédiction par arme
 * 
 * Modifiez les valeurs ci-dessous pour ajuster
 * la précision de l'aimbot pour chaque arme
 * ============================================
 * 
 * predictionMultiplier: Multiplicateur de prédiction (1.0 = normal)
 *   - Plus haut = vise plus en avance
 *   - Plus bas = vise plus près de la position actuelle
 * 
 * distanceReduction: Réduction à longue distance
 *   - { start: 30, factor: 0.9 } = à partir de 30m, réduire de 10%
 *   - null = pas de réduction
 * 
 * maxPredictionTime: Temps max de prédiction en secondes
 *   - Plus haut = permet plus de prédiction à très longue distance
 */

// ========================================
// TOGGLE GLOBAL - COMPENSATION VITESSE JOUEUR
// ========================================
// Mettre à false si cela cause des problèmes
export const SELF_VELOCITY_COMPENSATION = true; // true = activé, false = désactivé
export const SELF_VELOCITY_MULTIPLIER = 0.5; // 0.5 = 50% de compensation (conservative)

// === CONFIG PAR CATÉGORIE D'ARME ===
const CATEGORY_DEFAULTS = {
  shotgun: {
    predictionMultiplier: 0.5,
    distanceReduction: null, // Courte portée, pas besoin
    maxPredictionTime: 0.15,
  },
  sniper: {
    predictionMultiplier: 0.95,
    distanceReduction: { start: 50, factor: 0.9 },
    maxPredictionTime: 0.5,
  },
  dmr: {
    predictionMultiplier: 1.15, // Augmenté pour viser plus en avance
    distanceReduction: { start: 50, factor: 0.95 },
    maxPredictionTime: 0.5,
  },
  ar: {
    predictionMultiplier: 1.0,
    distanceReduction: { start: 45, factor: 0.92 },
    maxPredictionTime: 0.42,
  },
  smg: {
    predictionMultiplier: 0.9,
    distanceReduction: { start: 30, factor: 0.88 },
    maxPredictionTime: 0.35,
  },
  pistol: {
    predictionMultiplier: 0.85,
    distanceReduction: { start: 25, factor: 0.85 },
    maxPredictionTime: 0.3,
  },
  lmg: {
    predictionMultiplier: 0.95,
    distanceReduction: { start: 40, factor: 0.9 },
    maxPredictionTime: 0.4,
  },
};

// === CONFIG PAR ARME SPÉCIFIQUE ===
// Les armes listées ici remplacent les valeurs de leur catégorie
export const WEAPON_PREDICTION_CONFIG = {
  // ========== SHOTGUNS ==========
  mp220: { ...CATEGORY_DEFAULTS.shotgun },
  spas12: { ...CATEGORY_DEFAULTS.shotgun },
  m870: { ...CATEGORY_DEFAULTS.shotgun },
  saiga: { ...CATEGORY_DEFAULTS.shotgun, predictionMultiplier: 0.45 }, // Plus rapide
  m1014: { ...CATEGORY_DEFAULTS.shotgun }, // Super 90
  usas: { ...CATEGORY_DEFAULTS.shotgun, predictionMultiplier: 0.4 },
  m1100: { ...CATEGORY_DEFAULTS.shotgun },

  // ========== SNIPERS ==========
  mosin: { ...CATEGORY_DEFAULTS.sniper },
  sv98: { ...CATEGORY_DEFAULTS.sniper },
  awc: { ...CATEGORY_DEFAULTS.sniper, predictionMultiplier: 0.92 }, // AWM-S
  awm: { ...CATEGORY_DEFAULTS.sniper, predictionMultiplier: 0.92 },
  scout: { ...CATEGORY_DEFAULTS.sniper, predictionMultiplier: 0.93 },
  model94: { ...CATEGORY_DEFAULTS.sniper, predictionMultiplier: 0.9 },
  blr: { ...CATEGORY_DEFAULTS.sniper, predictionMultiplier: 0.9 },

  // ========== DMR ==========
  mk12: { ...CATEGORY_DEFAULTS.dmr },
  scarssr: { ...CATEGORY_DEFAULTS.dmr }, // Mk20 SSR
  m39: { ...CATEGORY_DEFAULTS.dmr },
  svd: { ...CATEGORY_DEFAULTS.dmr, predictionMultiplier: 0.98 },
  garand: { ...CATEGORY_DEFAULTS.dmr },

  // ========== ASSAULT RIFLES ==========
  ak47: { ...CATEGORY_DEFAULTS.ar },
  scar: { ...CATEGORY_DEFAULTS.ar, predictionMultiplier: 1.02 }, // Un peu plus
  an94: { ...CATEGORY_DEFAULTS.ar },
  groza: { ...CATEGORY_DEFAULTS.ar, predictionMultiplier: 0.98 },
  grozas: { ...CATEGORY_DEFAULTS.ar, predictionMultiplier: 0.98 },
  famas: { ...CATEGORY_DEFAULTS.ar },
  hk416: { ...CATEGORY_DEFAULTS.ar },
  m4a1: { ...CATEGORY_DEFAULTS.ar, predictionMultiplier: 1.02 },
  qbz83: { ...CATEGORY_DEFAULTS.ar },
  bar: { ...CATEGORY_DEFAULTS.ar, predictionMultiplier: 0.95 },
  m1a1: { ...CATEGORY_DEFAULTS.ar, predictionMultiplier: 0.92 },

  // ========== SMG ==========
  mp5: { ...CATEGORY_DEFAULTS.smg },
  mac10: { ...CATEGORY_DEFAULTS.smg, predictionMultiplier: 0.85 },
  ump9: { ...CATEGORY_DEFAULTS.smg },
  vector: { ...CATEGORY_DEFAULTS.smg, predictionMultiplier: 0.88 },

  // ========== LMG ==========
  dp28: { ...CATEGORY_DEFAULTS.lmg },
  m249: { ...CATEGORY_DEFAULTS.lmg },
  pkm: { ...CATEGORY_DEFAULTS.lmg, predictionMultiplier: 0.92 },
  qbb97: { ...CATEGORY_DEFAULTS.lmg },

  // ========== PISTOLS ==========
  deagle: { ...CATEGORY_DEFAULTS.pistol, predictionMultiplier: 0.9 },
  ot38: { ...CATEGORY_DEFAULTS.pistol },
  ots38: { ...CATEGORY_DEFAULTS.pistol, predictionMultiplier: 0.88 },
  m9: { ...CATEGORY_DEFAULTS.pistol },
  m93r: { ...CATEGORY_DEFAULTS.pistol },
  m1911: { ...CATEGORY_DEFAULTS.pistol },
  p30l: { ...CATEGORY_DEFAULTS.pistol, predictionMultiplier: 0.88 },
  peacemaker: { ...CATEGORY_DEFAULTS.pistol, predictionMultiplier: 0.82 },
  flare_gun: { ...CATEGORY_DEFAULTS.pistol, predictionMultiplier: 0.3 }, // Très lent
};

// === FONCTION UTILITAIRE ===
/**
 * Obtient la config de prédiction pour une arme
 * @param {string} weaponType - Type d'arme (ex: "ak47", "mp220")
 * @returns {object} Config de prédiction
 */
export function getWeaponPredictionConfig(weaponType) {
  if (!weaponType) return CATEGORY_DEFAULTS.ar; // Default

  const type = weaponType.toLowerCase().replace(/[-\s]/g, '');

  // Chercher correspondance exacte
  if (WEAPON_PREDICTION_CONFIG[type]) {
    return WEAPON_PREDICTION_CONFIG[type];
  }

  // Chercher correspondance partielle
  for (const [key, config] of Object.entries(WEAPON_PREDICTION_CONFIG)) {
    if (type.includes(key) || key.includes(type)) {
      return config;
    }
  }

  // Fallback par catégorie basée sur le nom
  if (type.includes('shotgun') || type.includes('pump')) return CATEGORY_DEFAULTS.shotgun;
  if (type.includes('sniper') || type.includes('rifle')) return CATEGORY_DEFAULTS.sniper;
  if (type.includes('smg') || type.includes('sub')) return CATEGORY_DEFAULTS.smg;
  if (type.includes('pistol') || type.includes('gun')) return CATEGORY_DEFAULTS.pistol;
  if (type.includes('lmg') || type.includes('machine')) return CATEGORY_DEFAULTS.lmg;

  // Default AR
  return CATEGORY_DEFAULTS.ar;
}

/**
 * Calcule le temps de prédiction ajusté
 * @param {number} baseTime - Temps de vol de base
 * @param {number} distance - Distance à la cible
 * @param {number} ping - Ping en secondes
 * @param {object} config - Config de l'arme
 * @returns {number} Temps de prédiction ajusté
 */
export function calculatePredictionTime(baseTime, distance, ping, config) {
  let t = baseTime * config.predictionMultiplier;

  // Réduction distance si configurée
  if (config.distanceReduction && distance > config.distanceReduction.start) {
    t *= config.distanceReduction.factor;
  }

  // Limite max (avec bonus ping)
  const maxTime = config.maxPredictionTime + ping * 0.5;
  return Math.max(0, Math.min(t, maxTime));
}
