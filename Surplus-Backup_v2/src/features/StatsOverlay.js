/**
 * StatsOverlay - FPS/Kills display (Like TargetInfo implementation)
 */
import { outer } from '@/core/outer.js';
import { gameManager } from '@/core/state.js';

let overlay = null;
let initialized = false;

let frameCount = 0;
let lastFpsUpdate = 0;
let currentFps = 0;

// Créer l'overlay HTML
function createOverlay() {
  if (overlay) return;

  overlay = outer.document.createElement('div');
  overlay.id = 'stats-overlay';

  overlay.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: linear-gradient(135deg, rgba(15,15,15,0.9) 0%, rgba(30,30,30,0.9) 100%);
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #444;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 12px;
    z-index: 99999;
    pointer-events: none;
    user-select: none;
    min-width: 80px;
  `;

  outer.document.body.appendChild(overlay);
  console.log('🟢 StatsOverlay created');
}

// Récupérer les kills depuis l'UI du jeu
function getKills() {
  try {
    const killEl = outer.document.querySelector('.ui-player-kills');
    if (killEl) {
      return killEl.textContent || '0';
    }
  } catch { }
  return '0';
}

// Mise à jour de l'overlay (appelé par setInterval pour le rendu)
function updateDisplay() {
  if (!overlay) return;

  const kills = getKills();

  overlay.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:4px;">
      <div style="display:flex;justify-content:space-between;gap:15px;">
        <span style="color:#2196F3;font-weight:bold;">FPS</span>
        <span style="color:#fff;">${currentFps}</span>
      </div>
      <div style="display:flex;justify-content:space-between;gap:15px;">
        <span style="color:#FF5722;font-weight:bold;">Kills</span>
        <span style="color:#fff;">${kills}</span>
      </div>
    </div>
  `;
}

// Boucle FPS avec requestAnimationFrame (mesure les vrais FPS)
function fpsLoop() {
  frameCount++;
  const now = performance.now();

  if (now - lastFpsUpdate >= 1000) {
    currentFps = frameCount;
    frameCount = 0;
    lastFpsUpdate = now;
  }

  requestAnimationFrame(fpsLoop);
}

// Initialisation
export default function init() {
  if (initialized) return;
  initialized = true;

  createOverlay();

  // Boucle FPS avec requestAnimationFrame (mesure précise)
  requestAnimationFrame(fpsLoop);

  // Update display à 10Hz (suffisant pour l'affichage)
  setInterval(updateDisplay, 100);

  console.log('🟢 StatsOverlay initialized');
}
