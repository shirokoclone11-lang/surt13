import { FONT_NAME, ref_addEventListener } from '@/core/hook.js';
import { outer, outerDocument, shadowRoot } from '@/core/outer.js';
import { markConfigLoaded, settings, setUIRoot } from '@/core/state.js';
import DiscordNotification from '@/ui/components/DiscordNotification.jsx';
import Menu from '@/ui/components/Menu.jsx';
import BotManager from '@/ui/components/BotManager.jsx';
import { globalStylesheet } from '@/ui/components/styles.css';
import { encryptDecrypt } from '@/utils/crypto.js';
import { initStore, read } from '@/utils/store.js';
import ReactDOM from 'react-dom/client';

export let menuElement;

let reactRoot = null;
let notificationRoot = null;
let setMenuVisible = () => { };
let menuVersion = '';
let settingsLoaded = false;

const renderMenu = () => {
  if (!reactRoot || !settingsLoaded) return;
  reactRoot.render(
    <>
      <Menu
        settings={settings}
        onSettingChange={handleSettingChange}
        onClose={() => setMenuVisible(false)}
        version={menuVersion}
      />
      <BotManager version={menuVersion} />
    </>
  );
};

const checkIfNotificationShown = () => {
  return settings.misc_.discordNotifShown_ === true;
};

const renderNotification = () => {
  if (!notificationRoot || !settingsLoaded) return;

  if (!checkIfNotificationShown()) {
    notificationRoot.render(
      <DiscordNotification settings={settings} onSettingChange={handleSettingChange} />
    );
  }
};

function handleSettingChange(updater) {
  updater(settings);
  renderMenu();
}

const attachFont = async () => {
  const base =
    'https://cdn.rawgit.com/mfd/f3d96ec7f0e8f034cc22ea73b3797b59/raw/856f1dbb8d807aabceb80b6d4f94b464df461b3e/';
  const fonts = [
    { name: FONT_NAME, file: 'GothamPro.woff2', weight: 200, style: 'normal' },
    { name: FONT_NAME, file: 'GothamPro-Italic.woff2', weight: 200, style: 'italic' },
    { name: FONT_NAME, file: 'GothamPro-Medium.woff2', weight: 400, style: 'normal' },
    { name: FONT_NAME, file: 'GothamPro-MediumItalic.woff2', weight: 400, style: 'italic' },
    { name: FONT_NAME, file: 'GothamPro-Bold.woff2', weight: 600, style: 'normal' },
  ];

  const loadPromises = fonts.map(async (font) => {
    try {
      const fontFace = new FontFace(font.name, `url(${base}${font.file})`, {
        weight: font.weight.toString(),
        style: font.style,
      });
      await fontFace.load();
      outerDocument.fonts.add(fontFace);
    } catch (e) {
      // Font loading failed, continue anyway
    }
  });

  await Promise.all(loadPromises);
};

const toggleSetting = (getter, setter) => {
  const newValue = !getter(settings);
  setter(settings, newValue);
  renderMenu();
};

const registerKeyboardShortcuts = () => {
  Reflect.apply(ref_addEventListener, outer, [
    'keydown',
    (event) => {
      // Empêcher les raccourcis si on est dans un input
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      const code = event.code;

      // Toggle Menu
      if (code === settings.keybinds_.toggleMenu_) {
        const menu = shadowRoot?.querySelector('#ui');
        if (!menu) return;
        const hidden = menu.style.display === 'none';
        menu.style.display = hidden ? '' : 'none';
        return;
      }

      // Toggle Aimbot
      if (code === settings.keybinds_.toggleAimbot_) {
        toggleSetting(
          (s) => s.aimbot_.enabled_,
          (s, v) => (s.aimbot_.enabled_ = v)
        );
        console.log('🎯 Aimbot:', settings.aimbot_.enabled_ ? 'ON' : 'OFF');
        return;
      }

      // Toggle X-Ray
      if (code === settings.keybinds_.toggleXray_) {
        toggleSetting(
          (s) => s.xray_.enabled_,
          (s, v) => (s.xray_.enabled_ = v)
        );
        console.log('👁️ X-Ray:', settings.xray_.enabled_ ? 'ON' : 'OFF');
        return;
      }

      // Toggle ESP
      if (code === settings.keybinds_.toggleESP_) {
        toggleSetting(
          (s) => s.esp_.enabled_,
          (s, v) => (s.esp_.enabled_ = v)
        );
        console.log('📡 ESP:', settings.esp_.enabled_ ? 'ON' : 'OFF');
        return;
      }

      // Toggle Grenade Timer
      if (code === settings.keybinds_.toggleGrenadeTimer_) {
        toggleSetting(
          (s) => s.grenadeTimer_.enabled_,
          (s, v) => (s.grenadeTimer_.enabled_ = v)
        );
        console.log('💣 Grenade Timer:', settings.grenadeTimer_.enabled_ ? 'ON' : 'OFF');
        return;
      }
    },
  ]);
};

const createUI = () => {
  const styleElement = outerDocument.createElement('style');
  styleElement.textContent = globalStylesheet.replace(/GothamPro/g, FONT_NAME);
  shadowRoot.appendChild(styleElement);

  const menuContainer = outerDocument.createElement('div');
  shadowRoot.appendChild(menuContainer);
  reactRoot = ReactDOM.createRoot(menuContainer);
  menuElement = menuContainer;

  const notificationContainer = outerDocument.createElement('div');
  shadowRoot.appendChild(notificationContainer);
  notificationRoot = ReactDOM.createRoot(notificationContainer);

  setMenuVisible = (visible) => {
    const menu = shadowRoot.querySelector('#ui');
    if (menu) menu.style.display = visible ? '' : 'none';
  };

  setUIRoot(shadowRoot);
};

const scheduleSettingsLoad = () => {
  setTimeout(() => {
    try {
      initStore();
      const stored = read();
      if (stored !== null && stored !== undefined && stored !== '') {
        const decrypted = encryptDecrypt(stored);
        const parsed = JSON.parse(decrypted);
        settings._deserialize(parsed);
        console.log('✅ Settings loaded successfully');
      } else {
        console.log('ℹ️ No saved settings found, using defaults');
      }
    } catch (e) {
      console.error('❌ Failed to load settings:', e);
      // Use default settings
    } finally {
      markConfigLoaded();
      settingsLoaded = true;
      renderMenu();
      renderNotification();
    }
  }, 100);
};

const fetchVersion = () => {
  menuVersion = VERSION;
  if (settingsLoaded) renderMenu();
};

export default async function initUI() {
  await attachFont();
  createUI();
  registerKeyboardShortcuts();
  scheduleSettingsLoad();
  fetchVersion();
}