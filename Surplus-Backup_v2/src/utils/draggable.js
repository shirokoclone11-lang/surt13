/**
 * Utilitaire pour rendre un élément HTML déplaçable
 * Sauvegarde automatiquement la position dans localStorage
 */

import { outer } from '@/core/outer.js';

const POSITIONS_KEY = 'surplus_overlay_positions';

/**
 * Charge les positions sauvegardées
 */
function loadPositions() {
  try {
    const stored = outer.localStorage.getItem(POSITIONS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Sauvegarde une position
 */
function savePosition(id, position) {
  try {
    const positions = loadPositions();
    positions[id] = position;
    outer.localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
  } catch {
    // Ignore les erreurs de sauvegarde
  }
}

/**
 * Rend un élément déplaçable avec sauvegarde de position
 * @param {HTMLElement} element - L'élément à rendre déplaçable
 * @param {string} id - Identifiant unique pour sauvegarder la position
 * @param {Object} options - Options de configuration
 * @param {boolean} options.resetOnDoubleClick - Réinitialiser la position sur double-clic (défaut: true)
 */
export function makeDraggable(element, id, options = {}) {
  const { resetOnDoubleClick = true } = options;

  if (!element || !id) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialX = 0;
  let initialY = 0;

  // Restaurer la position sauvegardée
  const positions = loadPositions();
  const savedPos = positions[id];

  if (savedPos) {
    element.style.left = savedPos.left;
    element.style.top = savedPos.top;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    element.style.transform = 'none';
  }

  // Rendre l'élément cliquable
  element.style.pointerEvents = 'auto';
  element.style.cursor = 'move';

  const onMouseDown = (e) => {
    // Ignorer le clic droit
    if (e.button !== 0) return;

    isDragging = true;

    const rect = element.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    initialX = rect.left;
    initialY = rect.top;

    // Empêcher la sélection de texte
    e.preventDefault();
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const newX = initialX + deltaX;
    const newY = initialY + deltaY;

    // Limiter aux bords de l'écran
    const maxX = outer.innerWidth - element.offsetWidth;
    const maxY = outer.innerHeight - element.offsetHeight;

    const clampedX = Math.max(0, Math.min(newX, maxX));
    const clampedY = Math.max(0, Math.min(newY, maxY));

    element.style.left = clampedX + 'px';
    element.style.top = clampedY + 'px';
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    element.style.transform = 'none';
  };

  const onMouseUp = () => {
    if (isDragging) {
      isDragging = false;

      // Sauvegarder la position
      savePosition(id, {
        left: element.style.left,
        top: element.style.top,
      });
    }
  };

  const onDoubleClick = () => {
    if (resetOnDoubleClick) {
      // Réinitialiser la position
      element.style.left = '';
      element.style.top = '';
      element.style.right = '';
      element.style.bottom = '';
      element.style.transform = '';

      // Supprimer la position sauvegardée
      const positions = loadPositions();
      delete positions[id];
      try {
        outer.localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
      } catch {
        // Ignore
      }
    }
  };

  // Attacher les événements
  element.addEventListener('mousedown', onMouseDown);
  outer.addEventListener('mousemove', onMouseMove);
  outer.addEventListener('mouseup', onMouseUp);

  if (resetOnDoubleClick) {
    element.addEventListener('dblclick', onDoubleClick);
  }

  // Retourner une fonction de nettoyage
  return () => {
    element.removeEventListener('mousedown', onMouseDown);
    outer.removeEventListener('mousemove', onMouseMove);
    outer.removeEventListener('mouseup', onMouseUp);
    if (resetOnDoubleClick) {
      element.removeEventListener('dblclick', onDoubleClick);
    }
  };
}
