import { gameManager, settings } from '@/core/state.js';
import { translations } from '@/core/obfuscatedNameTranslator.js';

// Selectors extracted from HaxReich and updated
const SELECTORS = {
  deathRestart: '#ui-stats-options .ui-stats-restart.btn-green.btn-darken.menu-option',
  gameQuit: '#btn-game-quit.btn-quit.btn-game-menu.btn-darken',
  settingsTab: '#ui-game-tab-settings',
  playButton: '#btns-quick-start .btn-green.btn-darken.menu-option.btn-custom-mode-main.btn-mode-desert',
  gameUI: '#game-ui',
  uiStats: '#ui-stats',
  uiStatsOptions: '#ui-stats-options'
};

function tryClick(selector) {
  const el = document.querySelector(selector);
  if (el) {
    el.click();
    return true;
  }
  return false;
}

function isInGame() {
  const inGameUI = document.querySelector(SELECTORS.gameUI) !== null;
  const noStats = document.querySelector(SELECTORS.uiStats) === null;
  const quitVisible = document.querySelector(SELECTORS.gameQuit) !== null;

  return (inGameUI || noStats) || quitVisible;
}

function checkAutoRespawn() {
  if (!settings.autoRespawn_?.enabled_) return;

  // 1. Check for Death Screen "Play Again"
  if (tryClick(SELECTORS.deathRestart)) {
    console.log('[AutoRespawn] Found Death Screen Restart. Clicking...');
    setTimeout(() => {
      // If clicking restart didn't work or we need to quit first (HaxReich logic)
      tryClick(SELECTORS.gameQuit);
    }, 500);
    return;
  }

  // 2. If we are NOT in game, try to click PLAY
  if (!isInGame()) {
    // Try finding the main play button
    // Note: HaxReich targets 'btn-mode-desert', we might want a more generic one or user-selected
    // Trying generic first, then fallback
    let clicked = tryClick('#btn-start-mode-0'); // Solo
    if (!clicked) clicked = tryClick(SELECTORS.playButton); // Custom/Event

    if (clicked) {
      console.log('[AutoRespawn] Clicking Play...');
    }
  }
}

let interval = null;

export default function initAutoRespawn() {
  if (interval) clearInterval(interval);
  interval = setInterval(checkAutoRespawn, 1000);
  console.log('[Features] Auto Respawn initialized');
}
