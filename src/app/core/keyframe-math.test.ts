import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEasing,
  interpolateProperty,
  evaluateAnimationState,
  upsertKeyframe,
} from './keyframe-math.ts';
import type { Keyframe, TransformSettings, DeviceSettings } from './models.ts';

test('calculateEasing computes boundary values correctly', () => {
  assert.equal(calculateEasing(0, 'linear'), 0);
  assert.equal(calculateEasing(1, 'linear'), 1);
  assert.equal(calculateEasing(0, 'easeIn'), 0);
  assert.equal(calculateEasing(1, 'easeIn'), 1);
  assert.equal(calculateEasing(0, 'easeInOut'), 0);
  assert.equal(calculateEasing(1, 'easeInOut'), 1);
});

test('calculateEasing easeInOut curve works symmetrically at midpoint', () => {
  const mid = calculateEasing(0.5, 'easeInOut');
  assert.equal(mid, 0.5);
});

test('interpolateProperty returns defaultValue when no keyframes exist', () => {
  const result = interpolateProperty([], 'zoom', 1.0, 5.0);
  assert.equal(result, 1.0);
});

test('interpolateProperty clamps before first and after last keyframe', () => {
  const keyframes: Keyframe[] = [
    { id: '1', time: 2, property: 'zoom', value: 1.0, easing: 'linear' },
    { id: '2', time: 4, property: 'zoom', value: 2.0, easing: 'linear' },
  ];

  assert.equal(interpolateProperty(keyframes, 'zoom', 1.0, 1.0), 1.0);
  assert.equal(interpolateProperty(keyframes, 'zoom', 1.0, 5.0), 2.0);
  assert.equal(interpolateProperty(keyframes, 'zoom', 1.0, 3.0), 1.5);
});

test('evaluateAnimationState returns full state smoothly', () => {
  const baseTransform: TransformSettings = {
    zoom: 1.0,
    focusX: 50,
    focusY: 50,
    panX: 0,
    panY: 0,
    rotation: 0,
    opacity: 1.0,
    borderRadius: 16,
    padding: 32,
    fitMode: 'contain',
  };

  const baseDevice: DeviceSettings = {
    type: 'macbook-pro',
    finish: 'space-black',
    scale: 1.0,
    cornerRadius: 24,
    bezelWidth: 12,
    shadowBlur: 40,
    shadowOpacity: 0.5,
    shadowColor: '#000000',
    shadowOffsetY: 20,
    perspective: 1000,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    reflection: true,
    glareIntensity: 0.15,
    browserUrl: 'https://screenstudio.app',
    browserTitle: 'Screen Studio',
    browserTheme: 'dark',
    showControls: true,
  };

  const keyframes: Keyframe[] = [
    { id: '1', time: 1.0, property: 'zoom', value: 1.0, easing: 'linear' },
    { id: '2', time: 3.0, property: 'zoom', value: 2.5, easing: 'linear' },
  ];

  const state = evaluateAnimationState(keyframes, baseTransform, baseDevice, 2.0);
  assert.equal(state.zoom, 1.75);
  assert.equal(state.focusX, 50);
  assert.equal(state.opacity, 1.0);
});

test('upsertKeyframe adds new keyframe and replaces existing at same time', () => {
  let keyframes: Keyframe[] = [];
  keyframes = upsertKeyframe(keyframes, 'zoom', 1.5, 2.0);
  assert.equal(keyframes.length, 1);
  assert.equal(keyframes[0].value, 1.5);

  // Updating within threshold updates the value
  keyframes = upsertKeyframe(keyframes, 'zoom', 2.2, 2.02);
  assert.equal(keyframes.length, 1);
  assert.equal(keyframes[0].value, 2.2);

  // Adding distinct time adds second keyframe
  keyframes = upsertKeyframe(keyframes, 'zoom', 3.0, 4.0);
  assert.equal(keyframes.length, 2);
});
