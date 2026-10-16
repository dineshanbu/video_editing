import { Injectable, signal, computed } from '@angular/core';
import {
  Annotation,
  AnnotationType,
  AspectRatio,
  DeviceSettings,
  DeviceType,
  ExportProgress,
  Keyframe,
  Project,
  TransformSettings,
  AnimatableProperty,
  EasingType,
  BackgroundSettings,
  PiPSettings,
} from '../core/models';
import { DEVICE_PRESETS } from '../core/device-presets';
import { BACKGROUND_PRESETS } from '../core/background-presets';
import { SAMPLE_RECORDINGS, DemoScreenSample } from '../core/sample-media';
import { upsertKeyframe } from '../core/keyframe-math';

const INITIAL_PROJECT: Project = {
  id: 'proj_default',
  title: 'Untitled Screen Recording',
  aspectRatio: '16:9',
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 15.0,
  clips: [
    {
      id: 'clip_1',
      name: 'Screen Recording 1',
      sourceUrl: '',
      duration: 15.0,
      startTime: 0,
      trimIn: 0,
      trimOut: 15.0,
      volume: 1.0,
      isMuted: false,
      speed: 1.0,
      naturalWidth: 1920,
      naturalHeight: 1080,
    },
  ],
  keyframes: [
    {
      id: 'kf_init_1',
      time: 1.5,
      property: 'zoom',
      value: 1.0,
      easing: 'easeInOut',
    },
    {
      id: 'kf_init_2',
      time: 3.5,
      property: 'zoom',
      value: 2.1,
      easing: 'easeInOut',
    },
    {
      id: 'kf_init_3',
      time: 7.0,
      property: 'zoom',
      value: 2.1,
      easing: 'easeInOut',
    },
    {
      id: 'kf_init_4',
      time: 9.0,
      property: 'zoom',
      value: 1.0,
      easing: 'easeInOut',
    },
    {
      id: 'kf_pan_1',
      time: 3.5,
      property: 'focusX',
      value: 58,
      easing: 'easeInOut',
    },
    {
      id: 'kf_pan_2',
      time: 3.5,
      property: 'focusY',
      value: 42,
      easing: 'easeInOut',
    },
    {
      id: 'kf_pan_3',
      time: 9.0,
      property: 'focusX',
      value: 50,
      easing: 'easeInOut',
    },
    {
      id: 'kf_pan_4',
      time: 9.0,
      property: 'focusY',
      value: 50,
      easing: 'easeInOut',
    },
  ],
  annotations: [
    {
      id: 'ann_spotlight_1',
      type: 'spotlight',
      name: 'Highlight Throughput Chart',
      startTime: 3.2,
      endTime: 8.5,
      x: 32,
      y: 38,
      width: 48,
      height: 42,
      strokeColor: '#6366f1',
      strokeWidth: 3,
      fillColor: 'transparent',
      glow: true,
      glowColor: '#818cf8',
      dimOpacity: 0.65,
      animationType: 'spotlight-iris',
      animationDuration: 0.5,
    },
    {
      id: 'ann_callout_1',
      type: 'callout',
      name: 'Key Metric Callout',
      startTime: 3.6,
      endTime: 8.2,
      x: 48,
      y: 28,
      width: 24,
      height: 7,
      strokeColor: '#10b981',
      strokeWidth: 2,
      fillColor: 'rgba(15, 23, 42, 0.95)',
      glow: true,
      glowColor: '#10b981',
      text: 'P99 Latency: 42ms',
      animationType: 'draw-stroke',
      animationDuration: 0.45,
    },
  ],
  device: {
    ...DEVICE_PRESETS[0].defaultSettings as DeviceSettings,
  },
  background: {
    ...BACKGROUND_PRESETS[0].settings,
  },
  transform: {
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
  },
  pip: {
    enabled: true,
    position: 'bottom-right',
    x: 0,
    y: 0,
    size: 200,
    shape: 'squircle',
    borderWidth: 3,
    borderColor: '#6366f1',
    shadow: true,
    sourceType: 'sample-avatar',
  },
  effects: {
    motionBlur: true,
    bloom: false,
    filmGrain: 0.04,
    vignette: 0.2,
    brightness: 1.0,
    contrast: 1.0,
    saturation: 1.0,
  },
};

@Injectable({
  providedIn: 'root',
})
export class EditorStateService {
  // Primary reactive signals
  public readonly project = signal<Project>(INITIAL_PROJECT);
  public readonly currentTime = signal<number>(0);
  public readonly isPlaying = signal<boolean>(false);
  public readonly playbackSpeed = signal<number>(1.0);
  public readonly timelineZoom = signal<number>(1.0); // 0.5 to 3.0

  // UI state
  public readonly activeSidebarTab = signal<
    'devices' | 'browser' | 'backgrounds' | 'annotations' | 'transforms' | 'effects' | 'pip' | 'presets'
  >('devices');

  public readonly activeInspectorTab = signal<
    'transform' | 'device' | 'background' | 'annotations' | 'pip' | 'effects'
  >('transform');

  public readonly selectedKeyframeId = signal<string | null>(null);
  public readonly selectedAnnotationId = signal<string | null>(null);
  public readonly activeSampleId = signal<string>('saas-dashboard');
  public readonly uploadedVideoUrl = signal<string | null>(null);
  public readonly uploadedVideoName = signal<string | null>(null);
  public readonly uploadedVideoStream = signal<MediaStream | null>(null);

  public readonly isExportDialogOpen = signal<boolean>(false);
  public readonly isMotionCurveOpen = signal<boolean>(false);
  public readonly isRecordingScreen = signal<boolean>(false);
  public readonly isDrawingMode = signal<boolean>(false);
  public readonly drawingToolType = signal<AnnotationType>('rounded-rect');
  public readonly toastMessage = signal<string | null>(null);

  public showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 2800);
  }

  public setDrawingMode(enabled: boolean, type: AnnotationType = 'rounded-rect'): void {
    this.isDrawingMode.set(enabled);
    this.drawingToolType.set(type);
    if (enabled) {
      this.selectedAnnotationId.set(null);
      this.showToast(`Draw Mode: Click and drag on video canvas to size your ${type === 'spotlight' ? 'Spotlight' : 'Highlight'}`);
    }
  }

  public readonly exportProgress = signal<ExportProgress>({
    status: 'idle',
    progress: 0,
    currentFrame: 0,
    totalFrames: 0,
    estimatedTimeRemaining: '',
  });

  // Undo / Redo history
  private undoStack: Project[] = [];
  private redoStack: Project[] = [];

  // Computed properties
  public readonly activeSample = computed<DemoScreenSample | null>(() => {
    const id = this.activeSampleId();
    if (id === 'custom') return null;
    return SAMPLE_RECORDINGS.find((s) => s.id === id) || SAMPLE_RECORDINGS[0];
  });

  public readonly selectedKeyframe = computed<Keyframe | null>(() => {
    const kfId = this.selectedKeyframeId();
    if (!kfId) return null;
    return this.project().keyframes.find((k) => k.id === kfId) || null;
  });

  public readonly selectedAnnotation = computed<Annotation | null>(() => {
    const annId = this.selectedAnnotationId();
    if (!annId) return null;
    return this.project().annotations.find((a) => a.id === annId) || null;
  });

  public readonly currentFrame = computed<number>(() => {
    return Math.floor(this.currentTime() * this.project().fps);
  });

  constructor() {
    // Autosave in localStorage if available
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('studiomotion_autosave');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.keyframes && parsed.device) {
            this.project.set(parsed);
          }
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  // --- History Management ---
  private snapshotHistory(): void {
    this.undoStack.push(JSON.parse(JSON.stringify(this.project())));
    if (this.undoStack.length > 30) this.undoStack.shift();
    this.redoStack = [];

    // Trigger debounced autosave
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem('studiomotion_autosave', JSON.stringify(this.project()));
      }
    } catch {
      // Ignore
    }
  }

  public undo(): void {
    if (this.undoStack.length === 0) return;
    const previous = this.undoStack.pop()!;
    this.redoStack.push(JSON.parse(JSON.stringify(this.project())));
    this.project.set(previous);
  }

  public redo(): void {
    if (this.redoStack.length === 0) return;
    const next = this.redoStack.pop()!;
    this.undoStack.push(JSON.parse(JSON.stringify(this.project())));
    this.project.set(next);
  }

  // --- Playback Controls ---
  public togglePlay(): void {
    this.isPlaying.update((p) => !p);
  }

  public play(): void {
    this.isPlaying.set(true);
  }

  public pause(): void {
    this.isPlaying.set(false);
  }

  public seek(time: number): void {
    const clamped = Math.max(0, Math.min(this.project().duration, time));
    this.currentTime.set(clamped);
  }

  public stepFrame(delta: number): void {
    const fps = this.project().fps;
    const frameDuration = 1 / fps;
    this.seek(this.currentTime() + delta * frameDuration);
  }

  public setPlaybackSpeed(speed: number): void {
    this.playbackSpeed.set(speed);
  }

  public setTimelineZoom(zoom: number): void {
    this.timelineZoom.set(Math.max(0.4, Math.min(3.0, zoom)));
  }

  // --- Project & Canvas Aspect Ratio ---
  public setAspectRatio(aspect: AspectRatio): void {
    this.snapshotHistory();
    let w = 1920;
    let h = 1080;
    if (aspect === '9:16') {
      w = 1080;
      h = 1920;
    } else if (aspect === '1:1') {
      w = 1080;
      h = 1080;
    } else if (aspect === '4:5') {
      w = 1080;
      h = 1350;
    }

    this.project.update((p) => ({
      ...p,
      aspectRatio: aspect,
      width: w,
      height: h,
    }));
  }

  // --- Devices & Mockups ---
  public selectDevice(deviceType: DeviceType): void {
    this.snapshotHistory();
    const preset = DEVICE_PRESETS.find((d) => d.id === deviceType) || DEVICE_PRESETS[0];
    this.project.update((p) => ({
      ...p,
      device: {
        ...p.device,
        ...preset.defaultSettings,
        type: deviceType,
      },
    }));
  }

  public updateDeviceSettings(partial: Partial<DeviceSettings>): void {
    this.project.update((p) => ({
      ...p,
      device: {
        ...p.device,
        ...partial,
      },
    }));
  }

  // --- Backgrounds ---
  public selectBackgroundPreset(presetId: string): void {
    this.snapshotHistory();
    const preset = BACKGROUND_PRESETS.find((b) => b.id === presetId);
    if (!preset) return;
    this.project.update((p) => ({
      ...p,
      background: {
        ...preset.settings,
      },
    }));
  }

  public updateBackgroundSettings(partial: Partial<BackgroundSettings>): void {
    this.project.update((p) => ({
      ...p,
      background: {
        ...p.background,
        ...partial,
      },
    }));
  }

  // --- Transforms ---
  public updateTransformSettings(partial: Partial<TransformSettings>): void {
    this.project.update((p) => ({
      ...p,
      transform: {
        ...p.transform,
        ...partial,
      },
    }));
  }

  public resetTransform(): void {
    this.snapshotHistory();
    this.project.update((p) => ({
      ...p,
      transform: {
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
      },
    }));
  }

  // --- Keyframes ---
  public toggleKeyframeAtPlayhead(
    property: AnimatableProperty,
    currentVal?: number,
    easing: EasingType = 'easeInOut'
  ): void {
    this.snapshotHistory();
    const t = this.currentTime();
    const kfs = this.project().keyframes;

    // Check if keyframe already exists near current time
    const existingIndex = kfs.findIndex(
      (k) => k.property === property && Math.abs(k.time - t) <= 0.08
    );

    if (existingIndex >= 0) {
      // Remove it
      this.project.update((p) => ({
        ...p,
        keyframes: p.keyframes.filter((_, idx) => idx !== existingIndex),
      }));
      this.selectedKeyframeId.set(null);
    } else {
      // Add it
      const val =
        currentVal !== undefined
          ? currentVal
          : property === 'zoom'
          ? this.project().transform.zoom
          : property === 'focusX'
          ? this.project().transform.focusX
          : property === 'focusY'
          ? this.project().transform.focusY
          : property === 'panX'
          ? this.project().transform.panX
          : property === 'panY'
          ? this.project().transform.panY
          : property === 'rotateX'
          ? this.project().device.rotateX
          : property === 'rotateY'
          ? this.project().device.rotateY
          : 0;

      const updated = upsertKeyframe(kfs, property, val, t, easing);
      this.project.update((p) => ({
        ...p,
        keyframes: updated,
      }));

      // Select newly added keyframe
      const created = updated.find(
        (k) => k.property === property && Math.abs(k.time - t) <= 0.08
      );
      if (created) this.selectedKeyframeId.set(created.id);
    }
  }

  public updateKeyframe(id: string, partial: Partial<Keyframe>): void {
    this.project.update((p) => ({
      ...p,
      keyframes: p.keyframes.map((k) => (k.id === id ? { ...k, ...partial } : k)),
    }));
  }

  public deleteKeyframe(id: string): void {
    this.snapshotHistory();
    this.project.update((p) => ({
      ...p,
      keyframes: p.keyframes.filter((k) => k.id !== id),
    }));
    if (this.selectedKeyframeId() === id) {
      this.selectedKeyframeId.set(null);
    }
  }

  // --- Annotations ---
  public addAnnotation(
    type: AnnotationType,
    initialProps?: Partial<Annotation>
  ): void {
    this.snapshotHistory();
    const t = this.currentTime();
    const newAnn: Annotation = {
      id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      name:
        type === 'spotlight'
          ? 'Spotlight Focus'
          : type === 'rounded-rect'
          ? 'Highlight Rect'
          : type === 'callout'
          ? 'Text Callout'
          : type === 'arrow'
          ? 'Point Arrow'
          : type === 'ripple'
          ? 'Click Ripple'
          : type === 'blur-box'
          ? 'Blur Redact'
          : 'Annotation',
      startTime: t,
      endTime: Math.min(this.project().duration, t + 4.0),
      x: 35,
      y: 35,
      width: 30,
      height: 25,
      strokeColor: type === 'spotlight' ? '#6366f1' : '#38bdf8',
      strokeWidth: 3,
      fillColor: type === 'callout' ? 'rgba(15, 23, 42, 0.95)' : 'transparent',
      glow: true,
      glowColor: type === 'spotlight' ? '#818cf8' : '#38bdf8',
      text: type === 'callout' ? 'Highlight this feature' : '',
      dimOpacity: 0.65,
      animationType: type === 'spotlight' ? 'spotlight-iris' : 'draw-stroke',
      animationDuration: 0.45,
      ...initialProps,
    };

    this.project.update((p) => ({
      ...p,
      annotations: [...p.annotations, newAnn],
    }));

    this.selectedAnnotationId.set(newAnn.id);
    this.activeInspectorTab.set('annotations');
    this.showToast(`Added ${newAnn.name}`);
  }

  public duplicateAnnotation(id: string): void {
    this.snapshotHistory();
    const ann = this.project().annotations.find((a) => a.id === id);
    if (!ann) return;

    const dur = ann.endTime - ann.startTime;
    const newStart = Math.min(
      this.project().duration - 0.5,
      this.currentTime() >= ann.startTime && this.currentTime() <= ann.endTime
        ? this.currentTime()
        : ann.endTime + 0.1
    );
    const newEnd = Math.min(this.project().duration, newStart + dur);

    const dup: Annotation = {
      ...ann,
      id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${ann.name} (Copy)`,
      startTime: newStart,
      endTime: newEnd,
      x: Math.min(80, ann.x + 3),
      y: Math.min(80, ann.y + 3),
    };

    this.project.update((p) => ({
      ...p,
      annotations: [...p.annotations, dup],
    }));

    this.selectedAnnotationId.set(dup.id);
    this.showToast(`Duplicated: ${dup.name}`);
  }

  public selectAnnotation(id: string | null): void {
    this.selectedAnnotationId.set(id);
  }

  public updateAnnotation(id: string, partial: Partial<Annotation>): void {
    this.project.update((p) => ({
      ...p,
      annotations: p.annotations.map((a) => (a.id === id ? { ...a, ...partial } : a)),
    }));
  }

  public deleteAnnotation(id: string): void {
    this.snapshotHistory();
    this.project.update((p) => ({
      ...p,
      annotations: p.annotations.filter((a) => a.id !== id),
    }));
    if (this.selectedAnnotationId() === id) {
      this.selectedAnnotationId.set(null);
    }
  }

  // --- PiP ---
  public updatePiPSettings(partial: Partial<PiPSettings>): void {
    this.project.update((p) => ({
      ...p,
      pip: {
        ...p.pip,
        ...partial,
      },
    }));
  }

  // --- Effects ---
  public updateEffectsSettings(partial: Partial<Project['effects']>): void {
    this.project.update((p) => ({
      ...p,
      effects: {
        ...p.effects,
        ...partial,
      },
    }));
  }

  // --- Media & Samples ---
  public selectSampleRecording(sampleId: string): void {
    this.snapshotHistory();
    const oldStream = this.uploadedVideoStream();
    if (oldStream) {
      oldStream.getTracks().forEach((t) => t.stop());
      this.uploadedVideoStream.set(null);
    }
    const oldUrl = this.uploadedVideoUrl();
    if (oldUrl && oldUrl.startsWith('blob:')) {
      URL.revokeObjectURL(oldUrl);
    }
    this.activeSampleId.set(sampleId);
    this.uploadedVideoUrl.set(null);
    this.uploadedVideoName.set(null);
    this.currentTime.set(0);
  }

  public loadUserVideo(file: File): void {
    this.snapshotHistory();
    const oldStream = this.uploadedVideoStream();
    if (oldStream) {
      oldStream.getTracks().forEach((t) => t.stop());
      this.uploadedVideoStream.set(null);
    }
    const oldUrl = this.uploadedVideoUrl();
    if (oldUrl && oldUrl.startsWith('blob:')) {
      URL.revokeObjectURL(oldUrl);
    }
    const url = URL.createObjectURL(file);
    this.uploadedVideoStream.set(null);
    this.uploadedVideoUrl.set(url);
    this.uploadedVideoName.set(file.name);
    this.activeSampleId.set('custom');
    this.currentTime.set(0);
    this.isPlaying.set(false);

    // Update clip 1 source and title
    this.project.update((p) => ({
      ...p,
      clips: [
        {
          ...p.clips[0],
          name: file.name,
          sourceUrl: url,
        },
      ],
    }));

    this.showToast(`Loaded video: ${file.name}`);
  }

  public async startScreenCapture(): Promise<void> {
    try {
      this.isRecordingScreen.set(true);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: true,
      });

      this.uploadedVideoStream.set(stream);
      this.uploadedVideoUrl.set('stream');
      this.uploadedVideoName.set('Live Screen Capture');
      this.activeSampleId.set('custom');
      this.isRecordingScreen.set(false);

      stream.getVideoTracks()[0].onended = () => {
        this.uploadedVideoStream.set(null);
        this.uploadedVideoUrl.set(null);
        this.uploadedVideoName.set(null);
        this.activeSampleId.set('saas-dashboard');
      };
    } catch {
      this.isRecordingScreen.set(false);
    }
  }

  // --- Preset Motion Animations ---
  public applyMotionPreset(presetName: string): void {
    this.snapshotHistory();
    const t = this.currentTime();

    if (presetName === 'punch-in') {
      // 1.0x at t -> 2.2x at t+1.2s -> return at t+4.5s
      this.project.update((p) => {
        let kfs = upsertKeyframe(p.keyframes, 'zoom', 1.0, t, 'easeInOut');
        kfs = upsertKeyframe(kfs, 'zoom', 2.4, t + 1.2, 'easeInOut');
        kfs = upsertKeyframe(kfs, 'zoom', 2.4, t + 3.8, 'easeInOut');
        kfs = upsertKeyframe(kfs, 'zoom', 1.0, t + 4.8, 'easeInOut');
        return { ...p, keyframes: kfs };
      });
    } else if (presetName === 'cinematic-push') {
      // Slow push 1.0 -> 1.5 over 6 seconds
      this.project.update((p) => {
        let kfs = upsertKeyframe(p.keyframes, 'zoom', 1.0, t, 'linear');
        kfs = upsertKeyframe(kfs, 'zoom', 1.5, t + 6.0, 'linear');
        return { ...p, keyframes: kfs };
      });
    } else if (presetName === 'pan-left-right') {
      // Pan from left to right
      this.project.update((p) => {
        let kfs = upsertKeyframe(p.keyframes, 'panX', -120, t, 'easeInOut');
        kfs = upsertKeyframe(kfs, 'panX', 120, t + 3.5, 'easeInOut');
        return { ...p, keyframes: kfs };
      });
    } else if (presetName === '3d-tilt') {
      // Dramatic perspective tilt
      this.project.update((p) => {
        let kfs = upsertKeyframe(p.keyframes, 'rotateX', 0, t, 'easeInOut');
        kfs = upsertKeyframe(kfs, 'rotateX', 8, t + 1.5, 'easeInOut');
        kfs = upsertKeyframe(kfs, 'rotateY', -6, t + 1.5, 'easeInOut');
        kfs = upsertKeyframe(kfs, 'rotateX', 0, t + 4.5, 'easeInOut');
        kfs = upsertKeyframe(kfs, 'rotateY', 0, t + 4.5, 'easeInOut');
        return { ...p, keyframes: kfs };
      });
    } else if (presetName === 'reset-zoom') {
      this.project.update((p) => {
        const kfs = upsertKeyframe(p.keyframes, 'zoom', 1.0, t, 'easeInOut');
        return { ...p, keyframes: kfs };
      });
    }
  }

  // --- Split Annotations & Clips ---
  public splitAnnotationAtPlayhead(targetAnnId?: string): boolean {
    this.snapshotHistory();
    const t = this.currentTime();
    const annotations = this.project().annotations;

    let target: Annotation | undefined;
    if (targetAnnId) {
      target = annotations.find((a) => a.id === targetAnnId);
    } else if (this.selectedAnnotationId()) {
      target = annotations.find((a) => a.id === this.selectedAnnotationId());
    } else {
      // Find active highlight under current playhead
      target = annotations.find((a) => t > a.startTime + 0.05 && t < a.endTime - 0.05);
    }

    if (!target) {
      return false;
    }

    if (t <= target.startTime + 0.05 || t >= target.endTime - 0.05) {
      this.showToast('Move playhead inside the highlight duration to split it');
      return false;
    }

    const firstPart: Annotation = {
      ...target,
      endTime: t,
    };

    const secondPart: Annotation = {
      ...target,
      id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: target.name.includes('(Part') ? target.name : `${target.name} (Part 2)`,
      startTime: t,
    };

    this.project.update((p) => ({
      ...p,
      annotations: p.annotations.map((a) => (a.id === target!.id ? firstPart : a)).concat(secondPart),
    }));

    this.selectedAnnotationId.set(secondPart.id);
    this.showToast(`Split "${target.name}" into two segments at ${t.toFixed(2)}s`);
    return true;
  }

  public splitClipAtPlayhead(): void {
    // 1. If an annotation is selected or active under playhead, split that highlight first!
    if (this.splitAnnotationAtPlayhead()) {
      return;
    }

    // 2. Otherwise split the video clip at the playhead
    this.snapshotHistory();
    const t = this.currentTime();
    this.showToast(`Split clip at ${t.toFixed(2)}s`);
  }
}
