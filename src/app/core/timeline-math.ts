/**
 * Formats seconds into MM:SS.ff timecode format
 */
export function formatTimecode(seconds: number, fps = 30): string {
  const safeSeconds = Math.max(0, isNaN(seconds) ? 0 : seconds);
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);
  const frame = Math.floor((safeSeconds % 1) * fps);

  const mm = mins.toString().padStart(2, '0');
  const ss = secs.toString().padStart(2, '0');
  const ff = frame.toString().padStart(2, '0');

  return `${mm}:${ss}.${ff}`;
}

/**
 * Parses timecode string MM:SS.ff or MM:SS to seconds
 */
export function parseTimecode(tc: string, fps = 30): number {
  const parts = tc.trim().split(':');
  if (parts.length === 2) {
    const mins = parseFloat(parts[0]) || 0;
    const secParts = parts[1].split('.');
    const secs = parseFloat(secParts[0]) || 0;
    const frames = secParts.length > 1 ? parseFloat(secParts[1]) || 0 : 0;
    return mins * 60 + secs + frames / fps;
  }
  return 0;
}

/**
 * Converts timeline seconds to pixel position
 */
export function secondsToPixels(seconds: number, zoomScale: number): number {
  // zoomScale 1.0 = 50px per second, zoomScale 2.0 = 100px per second, etc.
  return Math.max(0, seconds) * 60 * zoomScale;
}

/**
 * Converts pixel position to timeline seconds
 */
export function pixelsToSeconds(pixels: number, zoomScale: number): number {
  const pps = 60 * zoomScale;
  return pps > 0 ? Math.max(0, pixels / pps) : 0;
}

/**
 * Snaps a target time to nearby snap points (keyframes, clip edges, playhead)
 */
export function snapToNearby(
  targetTime: number,
  snapPoints: number[],
  thresholdSeconds = 0.15
): { time: number; snapped: boolean; snappedTo?: number } {
  let closestDist = thresholdSeconds;
  let snappedValue = targetTime;
  let didSnap = false;

  for (const point of snapPoints) {
    const dist = Math.abs(point - targetTime);
    if (dist < closestDist) {
      closestDist = dist;
      snappedValue = point;
      didSnap = true;
    }
  }

  return {
    time: didSnap ? snappedValue : targetTime,
    snapped: didSnap,
    snappedTo: didSnap ? snappedValue : undefined,
  };
}
