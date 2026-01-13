// src/features/Spinbot.js

import { ref_addEventListener } from '@/core/hook.js';
import { translations } from '@/core/obfuscatedNameTranslator.js';
import { outer } from '@/core/outer.js';
import { gameManager, settings } from '@/core/state.js';

class SpinbotManager {
  constructor() {
    this.angle = 0;
    this.timeoutId = null;
    this.isShooting = false;
    this.directionIndex = 0; // Track which direction we're on (for 2/3/4 dir modes)
    this.loop = this.loop.bind(this);
  }

  start() {
    if (this.timeoutId) return;
    console.log('🔵 Spinbot initialized');
    this.loop();
  }

  stop() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  loop() {
    if (!settings.spinbot_?.enabled_) {
      // Idle check when disabled
      this.timeoutId = setTimeout(this.loop, 500);
      return;
    }

    this.update();

    const delay = settings.spinbot_?.delay_ ?? 16;
    // Ensure delay is at least 1ms to prevent freeze
    const safeDelay = Math.max(1, delay);

    this.timeoutId = setTimeout(this.loop, safeDelay);
  }

  rad(degrees) {
    return degrees * (Math.PI / 180);
  }

  update() {
    if (!settings.spinbot_?.enabled_) return;

    // Ne pas spinner si on tire
    if (this.isShooting) return;

    const game = gameManager?.game;
    if (!game?.initialized) return;

    const input = game[translations.input_];
    if (!input?.mousePos) return;

    // Angle de spin (1-360)
    const spinSpeed = settings.spinbot_?.speed_ || 120;

    // Mode handling
    if (settings.spinbot_?.spinTwoDirections_) {
      // Horizontal flip with rotation (0, 180)
      this.angle += spinSpeed;
      // Snap to nearest 180 degree
      const snapped = Math.round(this.angle / 180) * 180;
      this.angle = snapped % 360;
    } else if (settings.spinbot_?.spinThreeDirections_) {
      // Triangle with rotation (0, 120, 240)
      this.angle += spinSpeed * 1.5; // Faster rotation
      // Snap to nearest 120 degree
      const snapped = Math.round(this.angle / 120) * 120;
      this.angle = snapped % 360;
    } else if (settings.spinbot_?.spinAllDirections_) {
      // Square with rotation (0, 90, 180, 270)
      this.angle += spinSpeed * 1.5; // Faster rotation
      // Snap to nearest 90 degree
      const snapped = Math.round(this.angle / 90) * 90;
      this.angle = snapped % 360;
    } else if (settings.spinbot_?.realistic_) {
      // Realistic: Random jitter +/- 45 degrees
      const jitter = (Math.random() - 0.5) * 90;
      this.angle += spinSpeed + jitter;
    } else {
      // Default continuous spin
      this.angle += spinSpeed;
    }

    // Incrémenter l'angle
    // this.angle is updated above

    // Calculer la position
    const newX = Math.cos(this.rad(this.angle)) * 100 + outer.innerWidth / 2;
    const newY = Math.sin(this.rad(this.angle)) * 100 + outer.innerHeight / 2;

    // Modifier mousePos
    input.mousePos._x = newX;
    input.mousePos._y = newY;
  }

  toggle() {
    const newState = !settings.spinbot_.enabled_;
    settings.spinbot_.enabled_ = newState;
    // Settings auto-save via state.js persistence
    console.log('🔵 Spinbot toggled:', newState);
  }
}

export const spinbot = new SpinbotManager();

// Gestion des événements souris
const handleMouseDown = (e) => {
  if (e.button === 0) {
    spinbot.isShooting = true;
  }
};

const handleMouseUp = (e) => {
  if (e.button === 0) {
    spinbot.isShooting = false;
  }
};

const handleMouseMove = (e) => {
  if (settings.spinbot_?.enabled_ && !spinbot.isShooting) {
    e.stopPropagation();
    e.preventDefault();
  }
};

// Export de la fonction d'initialisation (comme les autres features)
export default function () {
  Reflect.apply(ref_addEventListener, outer, ['mousedown', handleMouseDown]);
  Reflect.apply(ref_addEventListener, outer, ['mouseup', handleMouseUp]);
  Reflect.apply(ref_addEventListener, outer, ['mousemove', handleMouseMove, true]);

  spinbot.start();
}
