export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export type Resolution = '720p' | '1080p' | '1440p' | '4K';

export type DeviceType =
  | 'macbook-pro'
  | 'macbook-air'
  | 'iphone-16-pro'
  | 'galaxy-s24'
  | 'ipad-pro'
  | 'studio-display'
  | 'thinkpad'
  | 'chrome-browser'
  | 'safari-browser'
  | 'minimal-browser'
  | 'none';

export type DeviceFinish =
  | 'titanium-natural'
  | 'titanium-black'
  | 'titanium-silver'
  | 'space-black'
  | 'silver'
  | 'midnight'
  | 'deep-blue';

export interface DeviceSettings {
  type: DeviceType;
  finish: DeviceFinish;
  scale: number; // 0.6 - 1.5
  cornerRadius: number;
  bezelWidth: number;
  shadowBlur: number;
  shadowOpacity: number;
  shadowColor: string;
  shadowOffsetY: number;
  perspective: number;
  rotateX: number; // 3D tilt
  rotateY: number; // 3D pan
  rotateZ: number; // 3D roll
  reflection: boolean;
  glareIntensity: number;
  browserUrl: string;
  browserTitle: string;
  browserTheme: 'dark' | 'light';
  showControls: boolean;
}

export type BackgroundType = 'gradient' | 'mesh' | 'solid' | 'abstract' | 'image';

export interface BackgroundSettings {
  type: BackgroundType;
  presetId: string;
  name: string;
  color1: string;
  color2: string;
  color3?: string;
  angle: number;
  blur: number;
  noise: number;
  vignette: number;
  speed: number;
  imageUrl?: string;
}

export interface TransformSettings {
  zoom: number; // 1.0 to 4.0
  focusX: number; // 0 - 100 percentage
  focusY: number; // 0 - 100 percentage
  panX: number; // px offset
  panY: number; // px offset
  rotation: number; // deg
  opacity: number; // 0 - 1
  borderRadius: number;
  padding: number;
  fitMode: 'contain' | 'cover' | 'fill';
}

export type AnimatableProperty =
  | 'zoom'
  | 'focusX'
  | 'focusY'
  | 'panX'
  | 'panY'
  | 'rotation'
  | 'rotateX'
  | 'rotateY'
  | 'opacity';

export type EasingType =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'cubicBezier'
  | 'spring';

export interface Keyframe {
  id: string;
  time: number; // seconds
  property: AnimatableProperty;
  value: number;
  easing: EasingType;
  bezierHandles?: [number, number, number, number]; // [x1, y1, x2, y2]
}

export type AnnotationType =
  | 'spotlight'
  | 'rounded-rect'
  | 'ellipse'
  | 'arrow'
  | 'callout'
  | 'ripple'
  | 'loupe'
  | 'blur-box'
  | 'number-badge';

export type HighlightAnimationType =
  | 'draw-stroke'
  | 'fade-scale'
  | 'pulse-glow'
  | 'spotlight-iris'
  | 'corner-brackets'
  | 'float'
  | 'none';

export interface Annotation {
  id: string;
  type: AnnotationType;
  name: string;
  startTime: number;
  endTime: number;
  x: number; // 0-100% of video
  y: number; // 0-100% of video
  width: number; // 0-100%
  height: number; // 0-100%
  rotation?: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  glow: boolean;
  glowColor: string;
  text?: string;
  stepNumber?: number;
  dimOpacity?: number; // for spotlight: 0.1 - 0.95
  zoomFactor?: number; // for loupe: 1.5 - 3.5
  pulse?: boolean;
  animationType?: HighlightAnimationType;
  animationDuration?: number; // seconds, default 0.45s
}

export interface PiPSettings {
  enabled: boolean;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'custom';
  x: number; // px
  y: number; // px
  size: number; // width in px
  shape: 'circle' | 'rounded' | 'squircle';
  borderWidth: number;
  borderColor: string;
  shadow: boolean;
  sourceType: 'sample-avatar' | 'webcam' | 'custom-video';
  videoUrl?: string;
}

export interface VideoClip {
  id: string;
  name: string;
  sourceUrl: string;
  duration: number;
  startTime: number;
  trimIn: number;
  trimOut: number;
  volume: number;
  isMuted: boolean;
  speed: number;
  naturalWidth: number;
  naturalHeight: number;
}

export interface Project {
  id: string;
  title: string;
  aspectRatio: AspectRatio;
  width: number;
  height: number;
  fps: 24 | 30 | 60;
  duration: number;
  clips: VideoClip[];
  keyframes: Keyframe[];
  annotations: Annotation[];
  device: DeviceSettings;
  background: BackgroundSettings;
  transform: TransformSettings;
  pip: PiPSettings;
  effects: {
    motionBlur: boolean;
    bloom: boolean;
    filmGrain: number; // 0 - 1
    vignette: number; // 0 - 1
    brightness: number; // 0.5 - 1.5
    contrast: number; // 0.5 - 1.5
    saturation: number; // 0 - 2
  };
}

export interface ExportProgress {
  status: 'idle' | 'rendering' | 'encoding' | 'completed' | 'error';
  progress: number; // 0 - 100
  currentFrame: number;
  totalFrames: number;
  estimatedTimeRemaining: string;
  outputBlobUrl?: string;
  errorMessage?: string;
  fileSizeBytes?: number;
}
