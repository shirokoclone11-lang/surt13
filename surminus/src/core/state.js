import { encryptDecrypt } from '@/utils/crypto.js';
import { initStore, write } from '@/utils/store.js';
import { outer } from '@/core/outer.js';
import AdBlocker from '@/features/AdBlocker';

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
    enabled_: true,
    targetKnocked_: true,
    showDot_: true,
    wallcheck_: false,
    automatic_: true,
    autoSwitch_: false,
  },
  AdBlocker_: {
    enabled_: true,
  },
  meleeLock_: {
    enabled_: true,
    autoMelee_: false,
    autoAttack_: true,
    attackAllies_: false,
    antiExplosion_: true,
  },
  autoCrateBreak_: {
    enabled_: true,
    autoSwitchMelee_: true,
    autoAttack_: true,
    detectionRadius_: 10,
  },
  autoFire_: {
    enabled_: true,
  },
  autoHeal_: {
    enabled_: true,
    bandageThreshold_: 85,
    kitThreshold_: 50,
    enemyCheck_: true,
    enemyDistance_: 15,
    boostKeepMax_: true,
    boostThreshold_: 75,
  },
  mapESP_: {
    enabled_: false,
  },
  playerRadar_: {
    enabled_: false,
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
  mapHighlights_: {
    enabled_: true,
    smallerTrees_: true,
  },
  blurBackground_: {
    enabled_: true,
  },
  autoSwitch_: {
    enabled_: true,
    useOneGun_: false,
  },
  weaponSwitch_: {
    enabled_: false,
    mp220_: false,
    spas12_: false,
    m870_: false,
    saiga_: false,
    super90_: false,
    usas_: false,
    m1100_: false,
    mosin_: false,
    sv98_: false,
    awc_: false,
    scout_: false,
    model94_: false,
    blr_: false,
    mk12_: false,
    mk20_: false,
    m39_: false,
    svd_: false,
    garand_: false,
    ot38_: false,
    ots38_: false,
    deagle_: false,
    m9_: false,
    m93r_: false,
    m1911_: false,
    p30l_: false,
    flare_gun_: false,
    peacemaker_: false,
    groza_: false,
    grozas_: false,
    an94_: false,
    m1a1_: false,
  },
  spinbot_: {
    enabled_: false,
    speed_: 180,
    realistic_: true,
    spinThreeDirections_: false,
    spinAllDirections_: false,
    spinTwoDirections_: false,
  },
  panHero_: {
    enabled_: false,
    detectRadius_: 10,
    lootPan_: true,
    turnWithoutPan_: false,
    displayRadius_: false,
  },
  desync_: {
    enabled_: false,
  },
  aimbotHud_: {
    enabled_: true,
    x_: 10,
    y_: 300,
  },
  keybinds_: {
    toggleMenu_: 'ShiftRight',
    toggleAimbot_: 'KeyB',
    toggleAutomatic_: 'KeyI',
    toggleSpinbot_: 'KeyO',
  },
  misc_: {
    discordNotifShown_: false,
  },
  ui_: {
    menuStyle_: 'surplus',
  },
};

const settingsKeys = {
  aimbot_: {
    _k: '\t',
    enabled_: '𝅷',
    targetKnocked_: 'tk',
    showDot_: 'sd',
    wallcheck_: 'wc',
    automatic_: 'am',
  },
  adBlocker_: {
    _k: 'ab',
    enabled_: 'e',
  },
  meleeLock_: {
    _k: '󠁑',
    enabled_: '󠁧',
    autoMelee_: '󠁢',
    attackAllies_: '󠁣',
    antiExplosion_: '󠁥',
  },
  autoCrateBreak_: {
    _k: 'acb',
    enabled_: 'e',
    autoSwitchMelee_: 'asm',
    autoAttack_: 'aa',
    detectionRadius_: 'dr',
  },
  autoFire_: {
    _k: '󠄸',
    enabled_: '󠄴',
  },
  autoHeal_: {
    _k: 'ah',
    enabled_: 'a',
    bandageThreshold_: 'b',
    kitThreshold_: 'c',
    enemyCheck_: 'd',
    enemyDistance_: 'e',
    boostKeepMax_: 'g',
    boostThreshold_: 'h',
    
  },
  mapESP_: {
    _k: '󠄹',
    enabled_: '󠄵',
  },
  playerRadar_: {
    _k: '󠄺',
    enabled_: '󠄶',
  },
  xray_: {
    _k: '󠅔',
    enabled_: '󠅑',
    smokeOpacity_: '󠅢',
    treeOpacity_: '󠅿',
    removeCeilings_: '󠆛',
    darkerSmokes_: '󠆸',
  },
  esp_: {
    _k: '󠇍',
    visibleNametags_: '󠇓',
    enabled_: '󠇥',
    players_: '󠇯',
    flashlights_: {
      _k: '󠇮',
      own_: '󠅬',
      others_: '󠅰',
      trajectory_: '󠅝',
    },
    grenades_: {
      _k: '󠅎',
      explosions_: '󠅋',
      trajectory_: '󠄼',
    },
  },
  mapHighlights_: {
    _k: '󠄩',
    enabled_: '󠄞',
    smallerTrees_: '󠄚',
  },
  blurBackground_: {
    _k: '󠄤',
    enabled_: '󠄥',
  },
  autoLoot_: {
    _k: '󠄏',
    enabled_: '󠄏󠄏',
  },
  autoSwitch_: {
    _k: '󠄎󠄎',
    enabled_: '󠄃',
    useOneGun_: '󠄃󠄃',
  },
  weaponSwitch_: {
    _k: 'ws',
    enabled_: 'e',
    mp220_: 'mp220',
    spas12_: 'spas12',
    m870_: 'm870',
    saiga_: 'saiga',
    super90_: 'super90',
    usas_: 'usas',
    m1100_: 'm1100',
    mosin_: 'mosin',
    sv98_: 'sv98',
    awc_: 'awc',
    scout_: 'scout',
    model94_: 'model94',
    blr_: 'blr',
    mk12_: 'mk12',
    mk20_: 'mk20',
    m39_: 'm39',
    svd_: 'svd',
    garand_: 'garand',
    ot38_: 'ot38',
    ots38_: 'ots38',
    deagle_: 'deagle',
    m9_: 'm9',
    m93r_: 'm93r',
    m1911_: 'm1911',
    p30l_: 'p30l',
    flare_gun_: 'flare_gun',
    peacemaker_: 'peacemaker',
    groza_: 'groza',
    grozas_: 'grozas',
    an94_: 'an94',
    m1a1_: 'm1a1',
  },
  spinbot_: {
    _k: '󠄎󠄐',
    enabled_: '󠄃󠄍',
    speed_: '󠄃󠄎',
    realistic_: '󠄃󠄏',
    spinThreeDirections_: '󠄃󠄒',
    spinAllDirections_: '󠄃󠄑',
    spinTwoDirections_: '󠄃󠄓',
  },
  panHero_: {
    _k: '󠄎󠄓',
    enabled_: '󠄃󠄕',
    detectRadius_: '󠄃󠄖',
    lootPan_: '󠄃󠄗',
    turnWithoutPan_: '󠄃󠄘',
    displayRadius_: '󠄃󠄙',
  },
  desync_: {
    _k: '󠄎󠄒',
    enabled_: '󠄃󠄔',
  },
  aimbotHud_: {
    _k: '󠈄',
    enabled_: '󠈅',
    x_: '󠈆',
    y_: '󠈇',
  },
  keybinds_: {
    _k: 'a',
    toggleMenu_: 'b',
    toggleAimbot_: 'c',
    toggleAutomatic_: 'e',
    toggleSpinbot_: 'f',
  },
  misc_: {
    _k: 'z',
    discordNotifShown_: 'z1',
  },
  ui_: {
    _k: 'ui',
    menuStyle_: 'ms',
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
          },
          enumerable: true,
        });
      }
    }
    return result;
  };

  for (const topKey in keys) {
    obj[topKey] = build(keys[topKey], defaults[topKey], topKey);
  }

  const serialize = () => {
    const serializeGroup = (k, prefix) => {
      const result = {};
      for (const prop in k) {
        if (prop === '_k') continue;
        const key = k[prop];
        if (typeof key === 'object' && key._k) {
          result[key._k] = serializeGroup(key, prefix + '.' + prop);
        } else {
          const fullPath = prefix + '.' + prop;
          result[key] = store[fullPath];
        }
      }
      return result;
    };

    const result = {};
    for (const topKey in keys) {
      result[keys[topKey]._k] = serializeGroup(keys[topKey], topKey);
    }
    return result;
  };

  const deserialize = (data) => {
    if (!data || typeof data !== 'object') return;

    const deserializeGroup = (k, d, prefix) => {
      if (!d || typeof d !== 'object') return;
      for (const prop in k) {
        if (prop === '_k') continue;
        const key = k[prop];
        if (typeof key === 'object' && key._k) {
          const nested = d[key._k];
          deserializeGroup(key, nested, prefix + '.' + prop);
        } else {
          const value = d[key];
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

let uiRoot;

export const setUIRoot = (root) => {
  uiRoot = root;
};

export const getUIRoot = () => uiRoot;

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
