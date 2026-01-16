import { outer } from '@/core/outer.js';
import { encryptDecrypt } from '@/utils/crypto.js';
import { initStore, write } from '@/utils/store.js';

export const aimState = {
  lastAimPos_: null,
  aimTouchMoveDir_: null,
  aimTouchDistanceToEnemy_: null,
  reset() {
    this.lastAimPos_ = null;
    this.aimTouchMoveDir_ = null;
    this.aimTouchDistanceToEnemy_ = null;
  },
};

export const inputState = {
  queuedInputs_: [],
  useItem_: null,
  toMouseLen_: 0,
};

export let gameManager;
export const setGameManager = (gm) => {
  gameManager = gm;
  if (DEV) {
    try {
      outer.gameManager = gm;
    } catch { }
  }
};

export const defaultSettings = {
  aimbot_: {
    enabled_: false,
    smooth_: 50,
    targetKnocked_: true,
    stickyTarget_: true,
    showDot_: true,
    wallcheck_: true,
    fov_: 80,
    fovEnabled_: true,  // ← AJOUTE
    showFov_: true,
  },
  meleeLock_: {
    enabled_: true,
    autoMelee_: true,
  },
  mobileMovement_: {
    enabled_: false,
    smooth_: 50,
  },
  autoFire_: {
    enabled_: true,
  },
  triggerBot_: {
    enabled_: false,
    delay_: 50,
    fov_: 80,
    showFov_: true,
  },
  xray_: {
    enabled_: true,
    smokeOpacity_: 50,
    darkerSmokes_: true,
    treeOpacity_: 50,
    removeCeilings_: true,
  },
  esp_: {
    visibleNametags_: true,
    enabled_: true,
    players_: true,
    grenades_: {
      explosions_: true,
      trajectory_: true,
    },
    flashlights_: {
      own_: true,
      others_: true,
      trajectory_: true,
    },
  },
  autoLoot_: {
    enabled_: true,
  },
  desync_: {
    enabled_: false,
  },
  mapHighlights_: {
    enabled_: true,
    smallerTrees_: true,
  },
  infiniteZoom_: {
    enabled_: true,
  },
  grenadeTimer_: {
    enabled_: true,
  },
  targetInfo_: {
    enabled_: true,
  },
  autoHeal_: {
    enabled_: false,
    bandageThreshold_: 75,
    kitThreshold_: 50,
    boostKeepMax_: false,
    enemyCheck_: true,
    enemyDistance_: 25,
    movementCheck_: false,
  },
  followBot_: {
    enabled_: true,
    mode_: 'off',
    followMaster_: false,
  },
  autoRespawn_: {
    enabled_: false,
  },
  autoReload_: {
    enabled_: false,
    threshold_: 0,
  },
  weaponSwitch_: {
    enabled_: true,
    // Shotguns
    mp220_: true,
    spas12_: true,
    m870_: true,
    saiga_: true,
    super90_: true,
    usas_: true,
    m1100_: true,
    // Snipers
    mosin_: true,
    sv98_: true,
    awc_: true,
    scout_: true,
    model94_: true,
    blr_: true,
    // DMRs
    mk12_: true,
    mk20_: true,
    m39_: true,
    svd_: true,
    garand_: true,
    // Pistolets
    ot38_: true,
    ots38_: true,
    deagle_: true,
    m9_: true,
    m93r_: true,
    m1911_: true,
    p30l_: true,
    flare_gun_: true,
    peacemaker_: true,
    // Autres
    groza_: false,
    grozas_: false,
    an94_: false,
    m1a1_: false,
  },
  layerSpoof_: {
    enabled_: true,
  },
  keybinds_: {
    toggleMenu_: 'ShiftRight',
    toggleAimbot_: 'KeyB',
    toggleStickyTarget_: 'KeyN',
    toggleLayerSpoof_: 'KeyT',
    toggleXray_: 'KeyX',
    toggleESP_: 'KeyV',
    toggleGrenadeTimer_: 'KeyG',
    toggleSpinbot_: 'KeyY',  // ← AJOUTE
  },
  misc_: {
    discordNotifShown_: false,
  },
  spinbot_: {
    enabled_: false,
    speed_: 50,
    delay_: 16, // Default ~60fps
    keybind_: 'KeyY',
    realistic_: false,
    spin3_: false,
    spin4_: false
  },
};

const settingsKeys = {
  aimbot_: {
    _k: 'ab',
    enabled_: 'e',
    smooth_: 's',
    targetKnocked_: 'tk',
    stickyTarget_: 'st',
    showDot_: 'sd',
    wallcheck_: 'wc',
    fov_: 'fv',
    fovEnabled_: 'fe',  // ← AJOUTE
    showFov_: 'sf',
  },
  meleeLock_: {
    _k: 'ml',
    enabled_: 'e',
    autoMelee_: 'am',
  },
  mobileMovement_: {
    _k: 'mm',
    enabled_: 'e',
    smooth_: 's',
  },
  autoFire_: {
    _k: 'af',
    enabled_: 'e',
  },
  triggerBot_: {
    _k: 'tb',
    enabled_: 'e',
    delay_: 'd',
    fov_: 'f',
    showFov_: 'sf',
  },
  xray_: {
    _k: 'xr',
    enabled_: 'e',
    smokeOpacity_: 'so',
    treeOpacity_: 'to',
    removeCeilings_: 'rc',
    darkerSmokes_: 'ds',
  },
  esp_: {
    _k: 'es',
    visibleNametags_: 'vn',
    enabled_: 'e',
    players_: 'p',
    flashlights_: {
      _k: 'fl',
      own_: 'o',
      others_: 'ot',
      trajectory_: 't',
    },
    grenades_: {
      _k: 'gr',
      explosions_: 'ex',
      trajectory_: 't',
    },
  },
  mapHighlights_: {
    _k: 'mh',
    enabled_: 'e',
    smallerTrees_: 'st',
  },
  desync_: {
    _k: 'ds',
    enabled_: 'e',
  },
  autoLoot_: {
    _k: 'al',
    enabled_: 'e',
  },
  infiniteZoom_: {
    _k: 'iz',
    enabled_: 'e',
  },
  grenadeTimer_: {
    _k: 'gt',
    enabled_: 'e',
  },
  targetInfo_: {
    _k: 'ti',
    enabled_: 'e',
  },
  autoHeal_: {
    _k: 'ah',
    enabled_: 'e',
    bandageThreshold_: 'bt',
    kitThreshold_: 'kt',
    boostKeepMax_: 'bm',
    enemyCheck_: 'ec',
    enemyDistance_: 'ed',
    movementCheck_: 'mc',
  },
  followBot_: {
    _k: 'fb',
    enabled_: 'e',
    mode_: 'm',
    followMaster_: 'fm',
    teamCode_: 'tc',
  },
  autoRespawn_: {
    _k: 'are',
    enabled_: 'e',
  },
  autoReload_: {
    _k: 'ar',
    enabled_: 'e',
    threshold_: 't',
  },
  weaponSwitch_: {
    _k: 'ws',
    enabled_: 'e',
    mp220_: 'a1',
    spas12_: 'a2',
    m870_: 'a3',
    saiga_: 'a4',
    super90_: 'a5',
    usas_: 'a6',
    m1100_: 'a7',
    mosin_: 'b1',
    sv98_: 'b2',
    awc_: 'b3',
    scout_: 'b4',
    model94_: 'b5',
    blr_: 'b6',
    mk12_: 'c1',
    mk20_: 'c2',
    m39_: 'c3',
    svd_: 'c4',
    garand_: 'c5',
    ot38_: 'd1',
    ots38_: 'd2',
    deagle_: 'd3',
    m9_: 'd4',
    m93r_: 'd5',
    m1911_: 'd6',
    p30l_: 'd7',
    flare_gun_: 'd8',
    peacemaker_: 'd9',
    groza_: 'e1',
    grozas_: 'e2',
    an94_: 'e3',
    m1a1_: 'e4',
  },
  layerSpoof_: {
    _k: 'ls',
    enabled_: 'e',
  },
  keybinds_: {
    _k: 'kb',
    toggleMenu_: 'tm',
    toggleAimbot_: 'ta',
    toggleStickyTarget_: 'ts',
    toggleLayerSpoof_: 'tl',
    toggleXray_: 'tx',
    toggleESP_: 'te',
    toggleGrenadeTimer_: 'tg',
    toggleSpinbot_: 'tb',  // ← AJOUTE
  },
  misc_: {
    _k: 'mi',
    discordNotifShown_: 'dn',
  },
  spinbot_: {
    _k: 'sb',
    enabled_: 'e',
    enabled_: 'e',
    speed_: 's',
    delay_: 'd',
    keybind_: 'k',
    realistic_: 'r',
    spin3_: 's3',
    spin4_: 's4',
  },
  spinbot_: {
    _k: 'sb',
    enabled_: 'e',
    enabled_: 'e',
    speed_: 's',
    delay_: 'd',
    keybind_: 'k',
    realistic_: 'r',
    spin3_: 's3',
    spin4_: 's4',
  },
};

const createSettings = (keys, defaults) => {
  const store = {};
  const obj = {};

  const build = (k, d, storePath) => {
    const result = {};
    for (const prop in k) {
      if (prop === '_k') continue;
      const key = k[prop];
      const defaultVal = d?.[prop];
      if (typeof key === 'object' && key._k) {
        result[prop] = build(key, defaultVal, storePath + '.' + prop);
      } else {
        const fullPath = storePath + '.' + prop;
        if (typeof defaultVal === 'number') {
          store[fullPath] = defaultVal;
        } else if (typeof defaultVal === 'string') {
          store[fullPath] = defaultVal;
        } else {
          store[fullPath] = Boolean(defaultVal);
        }
        Object.defineProperty(result, prop, {
          get() {
            return store[fullPath];
          },
          set(v) {
            if (typeof store[fullPath] === 'number') {
              store[fullPath] = typeof v === 'number' ? v : 0;
            } else if (typeof store[fullPath] === 'string') {
              store[fullPath] = typeof v === 'string' ? v : '';
            } else {
              store[fullPath] = Boolean(v);
            }
            // write(settings._serialize()); // REMOVED for performance (handled by interval)
          },
        });
      }
    }
    return result;
  };

  for (const section in keys) {
    obj[section] = build(keys[section], defaults[section], section);
  }

  const serialize = () => {
    const compact = {};
    for (const section in keys) {
      const sectionKey = keys[section]._k;
      compact[sectionKey] = {};
      const serializeGroup = (k, path, target) => {
        for (const prop in k) {
          if (prop === '_k') continue;
          const key = k[prop];
          const fullPath = path + '.' + prop;
          if (typeof key === 'object' && key._k) {
            target[key._k] = {};
            serializeGroup(key, fullPath, target[key._k]);
          } else {
            target[key] = store[fullPath];
          }
        }
      };
      serializeGroup(keys[section], section, compact[sectionKey]);
    }
    return compact;
  };

  const deserialize = (data) => {
    if (!data) return;
    const deserializeGroup = (k, d, prefix) => {
      for (const prop in k) {
        if (prop === '_k') continue;
        const key = k[prop];
        if (typeof key === 'object' && key._k) {
          if (d && d[key._k]) {
            deserializeGroup(key, d[key._k], prefix + '.' + prop);
          }
        } else {
          const value = d?.[key];
          if (value !== undefined) {
            const fullPath = prefix + '.' + prop;
            if (typeof store[fullPath] === 'number') {
              store[fullPath] = typeof value === 'number' ? value : 0;
            } else if (typeof store[fullPath] === 'string') {
              store[fullPath] = typeof value === 'string' ? value : '';
            } else {
              store[fullPath] = Boolean(value);
            }
          }
        }
      }
    };

    for (const topKey in keys) {
      const topData = data[keys[topKey]._k];
      deserializeGroup(keys[topKey], topData, topKey);
    }
  };

  obj._serialize = serialize;
  obj._deserialize = deserialize;

  return obj;
};

export const settings = createSettings(settingsKeys, defaultSettings);

// UI Root management
let uiRoot;

export const setUIRoot = (root) => {
  uiRoot = root;
};

export const getUIRoot = () => uiRoot;

// Config persistence
let configLoaded = false;
let isUpdatingConfig = false;
let lastConfig;
const stringify = JSON.stringify;
let updateTimer = null;

export const markConfigLoaded = () => {
  configLoaded = true;
};

export const isConfigLoaded = () => configLoaded;

const updateConfig = () => {
  if (!configLoaded || isUpdatingConfig) return;
  isUpdatingConfig = true;

  initStore();

  const serialized = settings._serialize();
  const config = stringify(serialized);
  if (config !== lastConfig) {
    const encrypted = encryptDecrypt(config);
    const success = write(encrypted);
    if (success) {
      lastConfig = config;
    }
  }
  isUpdatingConfig = false;
};

export const startConfigPersistence = () => {
  if (updateTimer === null) {
    initStore();
    updateTimer = setInterval(() => {
      updateConfig();
    }, 250);
  }
};

export const loadSettings = (data) => {
  if (data && typeof data === 'object') {
    settings._deserialize(data);
  }
};

startConfigPersistence();