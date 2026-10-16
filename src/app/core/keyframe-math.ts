import type { AnimatableProperty, EasingType, Keyframe, TransformSettings, DeviceSettings } from './models.ts';

/**
 * Calculates cubic bezier approximation at parameter t with control points [x1, y1, x2, y2]
 */
export function cubicBezier(t: number, x1: number, y1: number, x2: number, y2: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  // Newton-Raphson approximation for parameter x = t
  let guess = t;
  for (let i = 0; i < 5; i++) {
    const currentX =
      3 * (1 - guess) * (1 - guess) * guess * x1 +
      3 * (1 - guess) * guess * guess * x2 +
      guess * guess * guess;
    const diff = currentX - t;
    if (Math.abs(diff) < 0.001) break;
    const slope =
      3 * (1 - guess) * (1 - guess) * x1 +
      6 * (1 - guess) * guess * (x2 - x1) +
      3 * guess * guess * (1 - x2);
    if (Math.abs(slope) < 0.0001) break;
    guess -= diff / slope;
    guess = Math.max(0, Math.min(1, guess));
  }

  // Calculate y from parameter guess
  return (
    3 * (1 - guess) * (1 - guess) * guess * y1 +
    3 * (1 - guess) * guess * guess * y2 +
    guess * guess * guess
  );
}

/**
 * Calculates easing progress [0, 1] for progress t [0, 1]
 */
export function calculateEasing(
  t: number,
  easing: EasingType,
  bezierHandles?: [number, number, number, number]
): number {
  const clamped = Math.max(0, Math.min(1, t));

  switch (easing) {
    case 'linear':
      return clamped;
    case 'easeIn':
      return clamped * clamped;
    case 'easeOut':
      return clamped * (2 - clamped);
    case 'easeInOut':
      return clamped < 0.5
        ? 2 * clamped * clamped
        : -1 + (4 - 2 * clamped) * clamped;
    case 'cubicBezier':
      if (bezierHandles && bezierHandles.length === 4) {
        return cubicBezier(clamped, bezierHandles[0], bezierHandles[1], bezierHandles[2], bezierHandles[3]);
      }
      return cubicBezier(clamped, 0.25, 0.1, 0.25, 1.0); // Standard ease
    case 'spring':
      // Damped harmonic oscillation curve
      return 1 - Math.exp(-6 * clamped) * Math.cos(7 * clamped);
    default:
      return clamped;
  }
}

/**
 * Interpolates a single property at timestamp t
 */
export function interpolateProperty(
  keyframes: Keyframe[],
  property: AnimatableProperty,
  defaultValue: number,
  time: number
): number {
  const propertyKeyframes = keyframes
    .filter((k) => k.property === property)
    .sort((a, b) => a.time - b.time);

  if (propertyKeyframes.length === 0) {
    return defaultValue;
  }

  if (time <= propertyKeyframes[0].time) {
    return propertyKeyframes[0].value;
  }

  const lastKeyframe = propertyKeyframes[propertyKeyframes.length - 1];
  if (time >= lastKeyframe.time) {
    return lastKeyframe.value;
  }

  // Find surrounding keyframes
  for (let i = 0; i < propertyKeyframes.length - 1; i++) {
    const k1 = propertyKeyframes[i];
    const k2 = propertyKeyframes[i + 1];

    if (time >= k1.time && time <= k2.time) {
      const duration = k2.time - k1.time;
      if (duration <= 0.0001) return k2.value;

      const progress = (time - k1.time) / duration;
      const eased = calculateEasing(progress, k1.easing, k1.bezierHandles);
      return k1.value + (k2.value - k1.value) * eased;
    }
  }

  return defaultValue;
}

export interface EvaluatedAnimationState {
  zoom: number;
  focusX: number;
  focusY: number;
  panX: number;
  panY: number;
  rotation: number;
  rotateX: number;
  rotateY: number;
  opacity: number;
}

/**
 * Evaluates all animatable properties at time t given baseline settings and keyframes
 */
export function evaluateAnimationState(
  keyframes: Keyframe[],
  baseTransform: TransformSettings,
  baseDevice: DeviceSettings,
  time: number
): EvaluatedAnimationState {
  return {
    zoom: interpolateProperty(keyframes, 'zoom', baseTransform.zoom, time),
    focusX: interpolateProperty(keyframes, 'focusX', baseTransform.focusX, time),
    focusY: interpolateProperty(keyframes, 'focusY', baseTransform.focusY, time),
    panX: interpolateProperty(keyframes, 'panX', baseTransform.panX, time),
    panY: interpolateProperty(keyframes, 'panY', baseTransform.panY, time),
    rotation: interpolateProperty(keyframes, 'rotation', baseTransform.rotation, time),
    rotateX: interpolateProperty(keyframes, 'rotateX', baseDevice.rotateX, time),
    rotateY: interpolateProperty(keyframes, 'rotateY', baseDevice.rotateY, time),
    opacity: interpolateProperty(keyframes, 'opacity', baseTransform.opacity, time),
  };
}

/**
 * Inserts or updates a keyframe at time t (snapping within threshold)
 */
export function upsertKeyframe(
  keyframes: Keyframe[],
  property: AnimatableProperty,
  value: number,
  time: number,
  easing: EasingType = 'easeInOut',
  threshold = 0.05
): Keyframe[] {
  const roundedTime = Math.round(time * 100) / 100;
  const existingIndex = keyframes.findIndex(
    (k) => k.property === property && Math.abs(k.time - roundedTime) <= threshold
  );

  if (existingIndex >= 0) {
    const updated = [...keyframes];
    updated[existingIndex] = {
      ...updated[existingIndex],
      value,
      easing,
    };
    return updated;
  }

  const newKeyframe: Keyframe = {
    id: `kf_${property}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    time: roundedTime,
    property,
    value,
    easing,
  };

  return [...keyframes, newKeyframe].sort((a, b) => a.time - b.time);
}
