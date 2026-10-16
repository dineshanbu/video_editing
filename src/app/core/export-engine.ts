import { ExportProgress, Project, Resolution } from './models';
import { VideoCompositionRenderer } from './renderer';
import { DemoScreenSample } from './sample-media';

export class VideoExportEngine {
  private renderer: VideoCompositionRenderer;
  private isCancelled = false;

  constructor() {
    this.renderer = new VideoCompositionRenderer();
  }

  public cancel(): void {
    this.isCancelled = true;
  }

  /**
   * Renders the project to a downloadable video blob
   */
  public async exportVideo(
    project: Project,
    resolution: Resolution,
    fps: 24 | 30 | 60,
    videoElement: HTMLVideoElement | null,
    activeSample: DemoScreenSample | null,
    onProgress: (progress: ExportProgress) => void
  ): Promise<string> {
    this.isCancelled = false;

    // Determine dimensions based on resolution and aspect ratio
    const dims = this.getDimensions(resolution, project.aspectRatio);
    const exportProject: Project = {
      ...project,
      width: dims.width,
      height: dims.height,
      fps,
    };

    const canvas = document.createElement('canvas');
    canvas.width = dims.width;
    canvas.height = dims.height;
    const ctx = canvas.getContext('2d', { alpha: false })!;

    // Select supported mimeType
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];

    let selectedMimeType = 'video/webm';
    for (const type of mimeTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        selectedMimeType = type;
        break;
      }
    }

    const stream = canvas.captureStream(fps);
    const recordedChunks: Blob[] = [];

    const recorder = new MediaRecorder(stream, {
      mimeType: selectedMimeType,
      videoBitsPerSecond: resolution === '4K' ? 35_000_000 : resolution === '1440p' ? 20_000_000 : 12_000_000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    recorder.start(100);

    const totalDuration = Math.max(1, project.duration);
    const totalFrames = Math.max(1, Math.floor(totalDuration * fps));
    const frameIntervalMs = 1000 / fps;
    const startTime = performance.now();

    onProgress({
      status: 'rendering',
      progress: 0,
      currentFrame: 0,
      totalFrames,
      estimatedTimeRemaining: 'Calculating...',
    });

    // Frame-by-frame rendering loop
    for (let frame = 0; frame <= totalFrames; frame++) {
      if (this.isCancelled) {
        recorder.stop();
        stream.getTracks().forEach((track) => track.stop());
        throw new Error('Export was cancelled by user');
      }

      const currentTime = Math.min(totalDuration, frame / fps);
      if (videoElement && !isNaN(currentTime)) {
        videoElement.currentTime = Math.max(0.001, currentTime);
      }

      // Render frame onto export canvas
      this.renderer.render(ctx, exportProject, currentTime, videoElement, activeSample);

      // Estimate remaining time
      const elapsed = (performance.now() - startTime) / 1000;
      const progressPercent = Math.min(99, Math.round((frame / totalFrames) * 100));
      const fpsRendered = frame > 0 ? frame / elapsed : 1;
      const remainingFrames = totalFrames - frame;
      const remSecs = Math.max(0, Math.round(remainingFrames / fpsRendered));

      onProgress({
        status: 'rendering',
        progress: progressPercent,
        currentFrame: frame,
        totalFrames,
        estimatedTimeRemaining: `${remSecs}s remaining`,
      });

      // Allow MediaRecorder and canvas stream to digest the frame
      await new Promise((resolve) => setTimeout(resolve, Math.max(4, Math.floor(frameIntervalMs * 0.4))));
    }

    onProgress({
      status: 'encoding',
      progress: 99,
      currentFrame: totalFrames,
      totalFrames,
      estimatedTimeRemaining: 'Finalizing video package...',
    });

    return new Promise<string>((resolve, reject) => {
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordedChunks, { type: selectedMimeType });
        const blobUrl = URL.createObjectURL(blob);

        onProgress({
          status: 'completed',
          progress: 100,
          currentFrame: totalFrames,
          totalFrames,
          estimatedTimeRemaining: 'Complete',
          outputBlobUrl: blobUrl,
          fileSizeBytes: blob.size,
        });

        resolve(blobUrl);
      };

      recorder.onerror = (err) => {
        reject(err);
      };

      recorder.stop();
    });
  }

  private getDimensions(
    res: Resolution,
    ratio: string
  ): { width: number; height: number } {
    let baseDim = 1920;
    if (res === '720p') baseDim = 1280;
    else if (res === '1080p') baseDim = 1920;
    else if (res === '1440p') baseDim = 2560;
    else if (res === '4K') baseDim = 3840;

    if (ratio === '16:9') {
      return { width: baseDim, height: Math.round((baseDim * 9) / 16) };
    }
    if (ratio === '9:16') {
      const h = baseDim;
      return { width: Math.round((h * 9) / 16), height: h };
    }
    if (ratio === '1:1') {
      const s = Math.min(1920, baseDim);
      return { width: s, height: s };
    }
    if (ratio === '4:5') {
      const h = baseDim;
      return { width: Math.round((h * 4) / 5), height: h };
    }

    return { width: 1920, height: 1080 };
  }
}
