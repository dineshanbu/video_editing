import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTimecode,
  parseTimecode,
  secondsToPixels,
  pixelsToSeconds,
  snapToNearby,
} from './timeline-math.ts';

test('formatTimecode formats seconds to mm:ss.ff accurately', () => {
  assert.equal(formatTimecode(0, 30), '00:00.00');
  assert.equal(formatTimecode(5.5, 30), '00:05.15');
  assert.equal(formatTimecode(65.2, 30), '01:05.06');
});

test('parseTimecode converts timecode string back to seconds', () => {
  const seconds = parseTimecode('01:10.15', 30);
  assert.equal(seconds, 70.5);
});

test('secondsToPixels and pixelsToSeconds are inverse operations', () => {
  const zoom = 1.5;
  const initialSeconds = 4.25;
  const pixels = secondsToPixels(initialSeconds, zoom);
  const calculatedSeconds = pixelsToSeconds(pixels, zoom);
  assert.ok(Math.abs(calculatedSeconds - initialSeconds) < 0.0001);
});

test('snapToNearby snaps when within threshold', () => {
  const snapPoints = [2.0, 5.0, 8.0];
  const result = snapToNearby(2.05, snapPoints, 0.1);
  assert.equal(result.snapped, true);
  assert.equal(result.time, 2.0);

  const noSnap = snapToNearby(3.0, snapPoints, 0.1);
  assert.equal(noSnap.snapped, false);
  assert.equal(noSnap.time, 3.0);
});
