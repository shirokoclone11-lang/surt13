import { translations } from '@/core/obfuscatedNameTranslator.js';
import { outer } from '@/core/outer.js';
import { aimState, gameManager, settings } from '@/core/state.js';
import { v2 } from '@/utils/math.js';

export class AimState {
  constructor(mode = 'idle', targetScreenPos = null, moveDir = null, immediate = false) {
    this.mode_ = mode;
    this.targetScreenPos_ = targetScreenPos;
    this.moveDir_ = moveDir;
    this.immediate_ = immediate;
  }
}

// ============================================
// CONSTANTES - OPTIMISÉES POUR SNAP RAPIDE
// ============================================

const MIN_DURATION_MS = 0;
const MAX_EXTRA_DURATION_MS = 60; // Très court
const EPSILON = 1e-4;
const MIN_INTERPOLATION_DISTANCE = 2;
const MIN_INTERPOLATION_ANGLE = Math.PI / 180;

const controllerState = {
  initialized_: false,
  mode_: 'idle',
  baselinePos_: { x: 0, y: 0 },
  currentPos_: null,
  targetPos_: null,
  animation_: null,
  overrideActive_: false,
  currentMoveDir_: null,
  targetMoveDir_: null,
  moveAnimation_: null,
  isInterpolating_: false,
  idleReleaseTimeout_: null,
};

// ============================================
// UTILS
// ============================================

const clonePoint = (point) => (point ? { x: point.x, y: point.y } : null);

const positionsDiffer = (a, b) => {
  if (!a && !b) return false;
  if (!a || !b) return true;
  return Math.abs(a.x - b.x) > EPSILON || Math.abs(a.y - b.y) > EPSILON;
};

const cloneMoveDir = (dir) =>
  dir
    ? {
      touchMoveActive: dir.touchMoveActive,
      touchMoveLen: dir.touchMoveLen,
      x: dir.x,
      y: dir.y,
    }
    : null;

const moveDirsEqual = (a, b) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.touchMoveActive === b.touchMoveActive &&
    Math.abs(a.touchMoveLen - b.touchMoveLen) <= EPSILON &&
    Math.abs(a.x - b.x) <= EPSILON &&
    Math.abs(a.y - b.y) <= EPSILON
  );
};

const getScreenCenter = () => ({
  x: outer.innerWidth / 2,
  y: outer.innerHeight / 2,
});

const computeAngle = (point, center) => Math.atan2(point.y - center.y, point.x - center.x);
const normalizeAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
const angleDifference = (from, to) => Math.abs(normalizeAngle(to - from));

// ============================================
// EASING - ULTRA RAPIDE
// ============================================

// Snap quasi-instantané - 90% du mouvement en 20% du temps
const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

// ============================================
// DURÉE - MINIMAL
// ============================================

const computeDuration = (start, end) => {
  if (!start || !end) return 0;

  const smooth = settings.aimbot_.smooth_;

  // Smooth ≤ 15 = INSTANT
  if (smooth <= 15) return 0;

  const distance = Math.hypot(end.x - start.x, end.y - start.y);

  // Petite distance = instant
  if (distance < 20) return 0;

  // Smooth 16-100 = 10ms à 60ms max
  const distanceFactor = Math.min(distance / 400, 1);
  return distanceFactor * MAX_EXTRA_DURATION_MS * (smooth / 100);
};

// ============================================
// BODY ROTATION
// ============================================

const updateBodyRotation = () => {
  if (!controllerState.overrideActive_ || controllerState.mode_ === 'idle') return;
  const gm = gameManager?.game;
  if (!gm?.initialized) return;
  const player = gm[translations.activePlayer_];
  const body = player?.bodyContainer;
  const target = controllerState.currentPos_;
  if (!body || !target) return;
  const center = getScreenCenter();
  const angle = Math.atan2(target.y - center.y, target.x - center.x);
  body.rotation = angle || 0;
};

// ============================================
// APPLY STATE
// ============================================

const applyAimStateSnapshot = (pos) => {
  if (pos) {
    controllerState.overrideActive_ = true;
    controllerState.currentPos_ = clonePoint(pos);
    aimState.lastAimPos_ = { clientX: pos.x, clientY: pos.y };
  } else {
    controllerState.overrideActive_ = false;
    controllerState.currentPos_ = null;
    aimState.lastAimPos_ = null;
  }
};

const clearIdleReleaseTimeout = () => {
  if (controllerState.idleReleaseTimeout_ !== null) {
    clearTimeout(controllerState.idleReleaseTimeout_);
    controllerState.idleReleaseTimeout_ = null;
  }
};

const scheduleIdleRelease = (duration) => {
  clearIdleReleaseTimeout();
  controllerState.idleReleaseTimeout_ = setTimeout(
    () => {
      controllerState.idleReleaseTimeout_ = null;
      if (controllerState.mode_ === 'idle') {
        controllerState.animation_ = null;
        applyAimStateSnapshot(null);
      }
    },
    Math.max(0, duration)
  );
};

// ============================================
// MOVE DIR UPDATE
// ============================================

const updateMoveDir = (now) => {
  const animation = controllerState.moveAnimation_;
  if (animation) {
    const { startDir, targetDir, startTime, duration } = animation;
    const progress = duration <= 0 ? 1 : v2.clamp01_((now - startTime) / duration);
    const eased = easeOutExpo(progress);
    let working;

    if (!startDir && targetDir) {
      working = {
        touchMoveActive: true,
        touchMoveLen: targetDir.touchMoveLen * eased,
        x: targetDir.x * eased,
        y: targetDir.y * eased,
      };
    } else if (startDir && targetDir) {
      working = {
        touchMoveActive: true,
        touchMoveLen: startDir.touchMoveLen + (targetDir.touchMoveLen - startDir.touchMoveLen) * eased,
        x: startDir.x + (targetDir.x - startDir.x) * eased,
        y: startDir.y + (targetDir.y - startDir.y) * eased,
      };
    } else if (startDir && !targetDir) {
      const fade = 1 - eased;
      working = {
        touchMoveActive: fade > EPSILON,
        touchMoveLen: startDir.touchMoveLen * fade,
        x: startDir.x * fade,
        y: startDir.y * fade,
      };
    } else {
      working = null;
    }

    controllerState.currentMoveDir_ = working;
    if (progress >= 1 - EPSILON) {
      controllerState.moveAnimation_ = null;
      controllerState.currentMoveDir_ = targetDir ? cloneMoveDir(targetDir) : null;
    }
  }

  if (
    controllerState.currentMoveDir_?.touchMoveActive &&
    controllerState.currentMoveDir_.touchMoveLen > EPSILON
  ) {
    aimState.aimTouchMoveDir_ = cloneMoveDir(controllerState.currentMoveDir_);
  } else {
    aimState.aimTouchMoveDir_ = null;
  }
};

// ============================================
// STEP - MAIN LOOP (SANS PRÉDICTION ICI)
// ============================================

const step = (now = performance.now()) => {
  if (!controllerState.initialized_) return;

  let snapshot = null;
  const animation = controllerState.animation_;
  let interpolationActive = false;

  if (animation) {
    const { startPos, targetPos, startTime, duration } = animation;

    // Durée = 0 -> SNAP DIRECT
    if (duration <= 0) {
      snapshot = clonePoint(targetPos);
      controllerState.animation_ = null;
    } else {
      const progress = v2.clamp01_((now - startTime) / duration);
      const eased = easeOutExpo(progress);

      // Interpolation simple, PAS DE PRÉDICTION ICI
      // La prédiction est faite dans Aimbot.js
      snapshot = {
        x: startPos.x + (targetPos.x - startPos.x) * eased,
        y: startPos.y + (targetPos.y - startPos.y) * eased,
      };

      if (progress < 1 - EPSILON && controllerState.mode_ !== 'idle') {
        interpolationActive = true;
      }

      if (progress >= 1 - EPSILON) {
        controllerState.animation_ = null;
        if (controllerState.mode_ === 'idle') {
          snapshot = null;
        } else {
          controllerState.targetPos_ = clonePoint(targetPos);
          snapshot = clonePoint(targetPos);
        }
      }
    }
  } else if (controllerState.mode_ !== 'idle' && controllerState.targetPos_) {
    // Pas d'animation, juste snap à la target
    snapshot = clonePoint(controllerState.targetPos_);
  }

  controllerState.isInterpolating_ = interpolationActive;
  applyAimStateSnapshot(snapshot);
  updateMoveDir(now);
  updateBodyRotation();
};

// ============================================
// AXIS MANAGEMENT
// ============================================

const getAxisValue = (axis, fallback) => {
  if (!controllerState.overrideActive_) return fallback;
  const current = controllerState.currentPos_;
  if (!current) return fallback;
  return axis === 'x' ? current.x : current.y;
};

const updateBaselineAxis = (axis, value) => {
  controllerState.baselinePos_ = {
    ...controllerState.baselinePos_,
    [axis]: value,
  };

  if (controllerState.mode_ !== 'idle') return;

  if (!controllerState.overrideActive_) {
    controllerState.currentPos_ = null;
    controllerState.animation_ = null;
    return;
  }

  const now = performance.now();
  step(now);

  const baselinePoint = clonePoint(controllerState.baselinePos_);
  const current = controllerState.currentPos_ ?? baselinePoint;

  if (!positionsDiffer(current, baselinePoint)) {
    clearIdleReleaseTimeout();
    controllerState.animation_ = null;
    controllerState.targetPos_ = null;
    applyAimStateSnapshot(null);
    return;
  }

  const duration = computeDuration(current, baselinePoint);

  controllerState.animation_ = {
    startPos: clonePoint(current),
    targetPos: baselinePoint,
    startTime: now,
    duration,
  };
  scheduleIdleRelease(duration);
};

// ============================================
// INIT
// ============================================

export const initializeAimController = () => {
  if (controllerState.initialized_) return;
  const gm = gameManager?.game;
  const ticker = gameManager?.pixi?._ticker;
  if (!gm || !ticker) return;

  const input = gm[translations.input_];
  const mousePos = input?.mousePos;
  if (!mousePos) {
    outer.requestAnimationFrame(initializeAimController);
    return;
  }

  const initialX = mousePos._x ?? mousePos.x ?? outer.innerWidth / 2;
  const initialY = mousePos._y ?? mousePos.y ?? outer.innerHeight / 2;
  controllerState.baselinePos_ = { x: initialX, y: initialY };

  const define = (axis) => ({
    configurable: true,
    get() {
      return getAxisValue(axis, this[`_${axis}`]);
    },
    set(value) {
      this[`_${axis}`] = value;
      updateBaselineAxis(axis, value);
    },
  });

  Object.defineProperty(mousePos, 'x', define('x'));
  Object.defineProperty(mousePos, 'y', define('y'));

  ticker.add(() => step());
  controllerState.initialized_ = true;
};

// ============================================
// SET AIM STATE - POINT D'ENTRÉE
// ============================================

export function setAimState(aimStateObj) {
  if (!controllerState.initialized_) return;

  const { mode_, targetScreenPos_, moveDir_, immediate_ } = aimStateObj;
  const normalizedMode = mode_ ?? 'idle';
  const now = performance.now();

  step(now);

  if (normalizedMode === 'idle') {
    clearIdleReleaseTimeout();
    const baseline = clonePoint(controllerState.baselinePos_);
    const start = controllerState.currentPos_ ?? clonePoint(baseline);
    const needsInterpolation = !immediate_ && positionsDiffer(start, baseline);

    if (needsInterpolation) {
      const duration = computeDuration(start, baseline);
      controllerState.animation_ = {
        startPos: clonePoint(start),
        targetPos: clonePoint(baseline),
        startTime: now,
        duration,
      };
      scheduleIdleRelease(duration);
    } else {
      controllerState.animation_ = null;
      applyAimStateSnapshot(null);
    }
    controllerState.mode_ = 'idle';
    controllerState.targetPos_ = null;
  } else {
    clearIdleReleaseTimeout();

    const resolvedTarget = targetScreenPos_
      ? { x: targetScreenPos_.x, y: targetScreenPos_.y }
      : clonePoint(controllerState.baselinePos_);

    const start = controllerState.currentPos_ ?? clonePoint(controllerState.baselinePos_);
    const targetChanged = positionsDiffer(resolvedTarget, controllerState.targetPos_);
    const modeChanged = normalizedMode !== controllerState.mode_;

    if (modeChanged || targetChanged) {
      // SNAP si immediate_ ou smooth bas
      const shouldSnap = immediate_ || settings.aimbot_.smooth_ <= 15;
      const duration = shouldSnap ? 0 : computeDuration(start, resolvedTarget);

      if (shouldSnap) {
        // SNAP INSTANTANÉ - pas d'animation
        controllerState.animation_ = null;
        controllerState.targetPos_ = clonePoint(resolvedTarget);
        applyAimStateSnapshot(resolvedTarget);
      } else {
        controllerState.animation_ = {
          startPos: clonePoint(start),
          targetPos: clonePoint(resolvedTarget),
          startTime: now,
          duration,
        };
        controllerState.targetPos_ = clonePoint(resolvedTarget);
      }
    } else if (controllerState.animation_) {
      // Update target en cours d'animation
      controllerState.animation_.targetPos = clonePoint(resolvedTarget);
    } else {
      // Pas d'animation mais target change légèrement -> update direct
      controllerState.targetPos_ = clonePoint(resolvedTarget);
      applyAimStateSnapshot(resolvedTarget);
    }

    controllerState.mode_ = normalizedMode;
  }

  const desiredMoveDir = cloneMoveDir(moveDir_);
  if (!moveDirsEqual(desiredMoveDir, controllerState.targetMoveDir_)) {
    controllerState.moveAnimation_ = {
      startDir: cloneMoveDir(controllerState.currentMoveDir_),
      targetDir: desiredMoveDir,
      startTime: now,
      duration: controllerState.animation_?.duration ?? 30,
    };
    controllerState.targetMoveDir_ = desiredMoveDir;
  }

  step(now);
}

// ============================================
// EXPORTS
// ============================================

let lastPing;

export function getPing() {
  if (gameManager.game.pings.length == 0) return lastPing ?? 0;
  let slice = Reflect.apply(Array.prototype.slice, gameManager.game.pings, [-5]);
  let sum = slice.reduce((a, b) => a + b);
  lastPing = sum / slice.length / 1000;
  return lastPing;
}

export const getCurrentAimPosition = () => clonePoint(controllerState.currentPos_);
export const isAimInterpolating = () => controllerState.isInterpolating_;
export const getAimMode = () => controllerState.mode_;

// ============================================
// OVERLAYS
// ============================================

const overlayState = {
  aimbotDot_: null,
  fovCircle_: null,
  initialized_: false,
};

const ensureOverlays = (uiRoot) => {
  if (!uiRoot) return false;

  if (!overlayState.aimbotDot_) {
    const outerDocument = outer.document;
    overlayState.aimbotDot_ = outerDocument.createElement('div');
    overlayState.aimbotDot_.classList.add('aimbot-dot');
    // Ensure visibility for debugging
    overlayState.aimbotDot_.style.zIndex = '999999';
    overlayState.aimbotDot_.style.pointerEvents = 'none';
    uiRoot.appendChild(overlayState.aimbotDot_);
  }

  if (!overlayState.fovCircle_) {
    const outerDocument = outer.document;
    overlayState.fovCircle_ = outerDocument.createElement('div');
    overlayState.fovCircle_.classList.add('aimbot-fov-circle');
    uiRoot.appendChild(overlayState.fovCircle_);
  }

  overlayState.initialized_ = true;
  return true;
};

const updateAimbotDot = (displayPos, isDotTargetShootable, isFocusedEnemy) => {
  if (!overlayState.aimbotDot_) return;

  if (displayPos && settings.aimbot_.showDot_) {
    const { x, y } = displayPos;

    overlayState.aimbotDot_.style.left = `${x}px`;
    overlayState.aimbotDot_.style.top = `${y}px`;

    if (!isDotTargetShootable) {
      overlayState.aimbotDot_.style.backgroundColor = 'gray';
      overlayState.aimbotDot_.style.boxShadow = '0 0 0.5rem rgba(128, 128, 128, 0.5)';
    } else if (isFocusedEnemy) {
      overlayState.aimbotDot_.style.backgroundColor = 'rgb(190, 12, 185)';
      overlayState.aimbotDot_.style.boxShadow = '0 0 0.5rem rgba(190, 12, 185, 0.5)';
    } else {
      overlayState.aimbotDot_.style.backgroundColor = 'red';
      overlayState.aimbotDot_.style.boxShadow = '0 0 0.5rem rgba(255, 0, 0, 0.5)';
    }

    overlayState.aimbotDot_.style.display = 'block';
  } else {
    overlayState.aimbotDot_.style.display = 'none';
  }
};

const updateFovCircle = () => {
  if (!overlayState.fovCircle_) return;

  const game = gameManager?.game;
  if (!game?.initialized) {
    overlayState.fovCircle_.style.display = 'none';
    return;
  }

  // Afficher seulement si FOV activé ET showFov activé
  if (!settings.aimbot_.fovEnabled_ || !settings.aimbot_.showFov_) {
    overlayState.fovCircle_.style.display = 'none';
    return;
  }

  const fovRadius = settings.aimbot_.fov_;

  // Centré sur la position de la souris (comme le code original)
  const input = game[translations.input_];
  const mousePos = input?.mousePos;
  const cursorX = mousePos?._x ?? outer.innerWidth / 2;
  const cursorY = mousePos?._y ?? outer.innerHeight / 2;

  overlayState.fovCircle_.style.width = `${fovRadius * 2}px`;
  overlayState.fovCircle_.style.height = `${fovRadius * 2}px`;
  overlayState.fovCircle_.style.left = `${cursorX}px`;
  overlayState.fovCircle_.style.top = `${cursorY}px`;
  overlayState.fovCircle_.style.display = 'block';
};

const hideAllOverlays = () => {
  if (overlayState.aimbotDot_) overlayState.aimbotDot_.style.display = 'none';
  if (overlayState.fovCircle_) overlayState.fovCircle_.style.display = 'none';
};

export const aimOverlays = {
  ensureInitialized: ensureOverlays,
  updateDot: updateAimbotDot,
  updateFovCircle: updateFovCircle,
  hideAll: hideAllOverlays,
};