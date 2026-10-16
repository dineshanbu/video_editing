import {
  Annotation,
  BackgroundSettings,
  DeviceSettings,
  PiPSettings,
  Project,
} from './models';
import { evaluateAnimationState, EvaluatedAnimationState } from './keyframe-math';
import { DemoScreenSample, SAMPLE_RECORDINGS } from './sample-media';

export class VideoCompositionRenderer {
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  private screenBufferCanvas: HTMLCanvasElement | null = null;
  private screenBufferCtx: CanvasRenderingContext2D | null = null;

  constructor() {
    // Canvases will be lazily created on first client-side render
  }

  private ensureCanvases(): boolean {
    if (typeof document === 'undefined') return false;
    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: false });
    }
    if (!this.screenBufferCanvas) {
      this.screenBufferCanvas = document.createElement('canvas');
      this.screenBufferCtx = this.screenBufferCanvas.getContext('2d', { alpha: false });
    }
    return !!(this.offscreenCanvas && this.offscreenCtx && this.screenBufferCanvas && this.screenBufferCtx);
  }

  /**
   * Main rendering method. Draws the entire composition at timestamp t to targetCtx
   */
  public render(
    targetCtx: CanvasRenderingContext2D,
    project: Project,
    time: number,
    videoElement?: HTMLVideoElement | null,
    activeSample?: DemoScreenSample | null,
    pipVideoElement?: HTMLVideoElement | null
  ): void {
    if (!this.ensureCanvases()) return;
    const width = project.width;
    const height = project.height;

    if (this.offscreenCanvas!.width !== width || this.offscreenCanvas!.height !== height) {
      this.offscreenCanvas!.width = width;
      this.offscreenCanvas!.height = height;
    }

    const ctx = this.offscreenCtx!;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Render Background
    this.renderBackground(ctx, project.background, width, height, time);

    // 2. Evaluate Animated Properties at time t
    const animState = evaluateAnimationState(
      project.keyframes,
      project.transform,
      project.device,
      time
    );

    // 3. Render Device / Browser / Frame with Video & Annotations
    this.renderDeviceAndContent(
      ctx,
      project,
      animState,
      time,
      videoElement,
      activeSample
    );

    // 4. Render Picture-in-Picture
    if (project.pip.enabled) {
      this.renderPiP(ctx, project.pip, width, height, pipVideoElement);
    }

    // 5. Post-Processing Effects (Vignette, Film Grain)
    this.renderPostEffects(ctx, project, width, height);

    ctx.restore();

    // Blit to target canvas
    if (this.offscreenCanvas) {
      targetCtx.drawImage(this.offscreenCanvas, 0, 0);
    }
  }

  private renderBackground(
    ctx: CanvasRenderingContext2D,
    bg: BackgroundSettings,
    w: number,
    h: number,
    t: number
  ): void {
    if (bg.type === 'solid') {
      ctx.fillStyle = bg.color1;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    if (bg.type === 'gradient' || bg.type === 'abstract') {
      const angleRad = (bg.angle * Math.PI) / 180;
      const diag = Math.sqrt(w * w + h * h) / 2;
      const cx = w / 2;
      const cy = h / 2;

      const x1 = cx - Math.cos(angleRad) * diag;
      const y1 = cy - Math.sin(angleRad) * diag;
      const x2 = cx + Math.cos(angleRad) * diag;
      const y2 = cy + Math.sin(angleRad) * diag;

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, bg.color1);
      grad.addColorStop(0.5, bg.color2);
      grad.addColorStop(1, bg.color3 || bg.color2);

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      if (bg.presetId === 'studio-acoustic') {
        // Draw elegant vertical micro-slats
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
      }
      return;
    }

    if (bg.type === 'mesh') {
      // Dynamic aurora glowing mesh
      ctx.fillStyle = bg.color1;
      ctx.fillRect(0, 0, w, h);

      const orb1X = w * 0.35 + Math.sin(t * 0.4 * bg.speed) * w * 0.15;
      const orb1Y = h * 0.3 + Math.cos(t * 0.3 * bg.speed) * h * 0.12;
      const r1 = Math.max(w, h) * 0.55;

      const grad1 = ctx.createRadialGradient(orb1X, orb1Y, 10, orb1X, orb1Y, r1);
      grad1.addColorStop(0, bg.color2);
      grad1.addColorStop(1, 'transparent');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, w, h);

      const orb2X = w * 0.7 + Math.cos(t * 0.5 * bg.speed) * w * 0.15;
      const orb2Y = h * 0.7 + Math.sin(t * 0.35 * bg.speed) * h * 0.15;
      const r2 = Math.max(w, h) * 0.45;

      const grad2 = ctx.createRadialGradient(orb2X, orb2Y, 10, orb2X, orb2Y, r2);
      grad2.addColorStop(0, bg.color3 || '#06b6d4');
      grad2.addColorStop(1, 'transparent');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, w, h);
    }
  }

  public getScreenGeometry(project: Project): {
    dx: number;
    dy: number;
    targetDeviceW: number;
    targetDeviceH: number;
    screenX: number;
    screenY: number;
    screenW: number;
    screenH: number;
    screenRadius: number;
  } {
    const cw = project.width;
    const ch = project.height;
    const device = project.device;
    const baseScale = device.scale;

    let targetDeviceW = cw * 0.82 * baseScale;
    let targetDeviceH = targetDeviceW / (16 / 10);

    if (device.type === 'iphone-16-pro' || device.type === 'galaxy-s24') {
      targetDeviceH = ch * 0.88 * baseScale;
      targetDeviceW = targetDeviceH * (9 / 19.5);
    } else if (device.type === 'ipad-pro') {
      targetDeviceW = cw * 0.75 * baseScale;
      targetDeviceH = targetDeviceW * (3 / 4);
    } else if (device.type === 'none') {
      targetDeviceW = cw * baseScale;
      targetDeviceH = ch * baseScale;
    }

    const dx = -targetDeviceW / 2;
    const dy = -targetDeviceH / 2;

    let screenX = dx;
    let screenY = dy;
    let screenW = targetDeviceW;
    let screenH = targetDeviceH;
    let screenRadius = device.cornerRadius || 16;

    const isBrowser =
      device.type === 'chrome-browser' ||
      device.type === 'safari-browser' ||
      device.type === 'minimal-browser';

    const isLaptop = device.type === 'macbook-pro' || device.type === 'macbook-air';
    const isPhone = device.type === 'iphone-16-pro' || device.type === 'galaxy-s24';

    if (isBrowser) {
      const headerH = device.type === 'minimal-browser' ? 36 : 46;
      screenX = dx;
      screenY = dy + headerH;
      screenW = targetDeviceW;
      screenH = targetDeviceH - headerH;
      screenRadius = 4;
    } else if (isLaptop) {
      const bezel = device.bezelWidth || 14;
      const topBezel = bezel + 4;
      screenX = dx + bezel;
      screenY = dy + topBezel;
      screenW = targetDeviceW - bezel * 2;
      screenH = targetDeviceH - bezel * 2 - 8;
      screenRadius = 8;
    } else if (isPhone) {
      const bezel = device.bezelWidth || 10;
      screenX = dx + bezel;
      screenY = dy + bezel;
      screenW = targetDeviceW - bezel * 2;
      screenH = targetDeviceH - bezel * 2;
      screenRadius = Math.max(12, device.cornerRadius - bezel);
    } else if (device.type === 'studio-display') {
      const bezel = 18;
      screenX = dx + bezel;
      screenY = dy + bezel;
      screenW = targetDeviceW - bezel * 2;
      screenH = targetDeviceH - bezel * 2 - 32; // bottom chin
      screenRadius = 4;
    } else if (device.type === 'none') {
      screenRadius = 0;
    }

    return { dx, dy, targetDeviceW, targetDeviceH, screenX, screenY, screenW, screenH, screenRadius };
  }

  public evaluateAnimationAtTime(project: Project, time: number): EvaluatedAnimationState {
    return evaluateAnimationState(
      project.keyframes,
      project.transform,
      project.device,
      time
    );
  }

  /**
   * Converts mouse canvas pixel coordinates (0..canvas.width, 0..canvas.height)
   * to inner video screen percentage (0..100%, 0..100%).
   */
  public canvasPixelsToScreenPercent(
    canvasPixelX: number,
    canvasPixelY: number,
    project: Project,
    time: number
  ): { x: number; y: number } {
    const cw = project.width;
    const ch = project.height;
    const geom = this.getScreenGeometry(project);
    const anim = this.evaluateAnimationAtTime(project, time);

    // 1. Invert global canvas rotation around center
    const theta = (anim.rotation * Math.PI) / 180;
    const tx = canvasPixelX - cw / 2;
    const ty = canvasPixelY - ch / 2;
    const unrotatedX = tx * Math.cos(-theta) - ty * Math.sin(-theta);
    const unrotatedY = tx * Math.sin(-theta) + ty * Math.cos(-theta);

    // 2. Relative to screen buffer origin
    const zoomedX = unrotatedX - geom.screenX;
    const zoomedY = unrotatedY - geom.screenY;

    // 3. Invert Zoom & Pan
    const fx = (anim.focusX / 100) * geom.screenW;
    const fy = (anim.focusY / 100) * geom.screenH;
    const zoom = Math.max(0.1, anim.zoom);

    const contentX = fx + (zoomedX - fx - anim.panX) / zoom;
    const contentY = fy + (zoomedY - fy - anim.panY) / zoom;

    const pctX = Math.max(0, Math.min(100, (contentX / geom.screenW) * 100));
    const pctY = Math.max(0, Math.min(100, (contentY / geom.screenH) * 100));
    return { x: pctX, y: pctY };
  }

  /**
   * Converts inner video screen percentage (0..100%, 0..100%)
   * to canvas pixel coordinates (0..canvas.width, 0..canvas.height).
   */
  public screenPercentToCanvasPixels(
    screenPctX: number,
    screenPctY: number,
    project: Project,
    time: number
  ): { x: number; y: number } {
    const cw = project.width;
    const ch = project.height;
    const geom = this.getScreenGeometry(project);
    const anim = this.evaluateAnimationAtTime(project, time);

    const fx = (anim.focusX / 100) * geom.screenW;
    const fy = (anim.focusY / 100) * geom.screenH;
    const contentX = (screenPctX / 100) * geom.screenW;
    const contentY = (screenPctY / 100) * geom.screenH;

    const zoomedX = fx + anim.panX + (contentX - fx) * anim.zoom;
    const zoomedY = fy + anim.panY + (contentY - fy) * anim.zoom;

    const unrotatedX = geom.screenX + zoomedX;
    const unrotatedY = geom.screenY + zoomedY;

    const theta = (anim.rotation * Math.PI) / 180;
    const canvasX = cw / 2 + unrotatedX * Math.cos(theta) - unrotatedY * Math.sin(theta);
    const canvasY = ch / 2 + unrotatedX * Math.sin(theta) + unrotatedY * Math.cos(theta);
    return { x: canvasX, y: canvasY };
  }

  /**
   * Computes the bounding box of an annotation on the rendered canvas in canvas percentages (0..100%)
   */
  public getAnnotationCanvasBoundingBox(
    ann: Annotation,
    project: Project,
    time: number
  ): { leftPct: number; topPct: number; widthPct: number; heightPct: number } {
    const p1 = this.screenPercentToCanvasPixels(ann.x, ann.y, project, time);
    const p2 = this.screenPercentToCanvasPixels(ann.x + ann.width, ann.y + ann.height, project, time);

    const left = Math.min(p1.x, p2.x);
    const top = Math.min(p1.y, p2.y);
    const width = Math.abs(p2.x - p1.x);
    const height = Math.abs(p2.y - p1.y);

    return {
      leftPct: (left / project.width) * 100,
      topPct: (top / project.height) * 100,
      widthPct: Math.max(1, (width / project.width) * 100),
      heightPct: Math.max(1, (height / project.height) * 100),
    };
  }

  private renderDeviceAndContent(
    ctx: CanvasRenderingContext2D,
    project: Project,
    anim: EvaluatedAnimationState,
    time: number,
    videoElement?: HTMLVideoElement | null,
    activeSample?: DemoScreenSample | null
  ): void {
    const cw = project.width;
    const ch = project.height;
    const device = project.device;
    const geom = this.getScreenGeometry(project);

    ctx.save();

    // Center pivot
    ctx.translate(cw / 2, ch / 2);

    // Apply global canvas-level transforms (perspective, tilt, rotation)
    ctx.rotate((anim.rotation * Math.PI) / 180);

    const dx = geom.dx;
    const dy = geom.dy;
    const targetDeviceW = geom.targetDeviceW;
    const targetDeviceH = geom.targetDeviceH;

    // 1. Draw Realistic Soft Drop Shadow
    if (device.shadowOpacity > 0 && device.type !== 'none') {
      ctx.save();
      ctx.shadowColor = `rgba(0, 0, 0, ${device.shadowOpacity})`;
      ctx.shadowBlur = device.shadowBlur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = device.shadowOffsetY;
      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
      ctx.beginPath();
      ctx.roundRect(dx, dy, targetDeviceW, targetDeviceH, device.cornerRadius || 16);
      ctx.fill();
      ctx.restore();
    }

    const screenX = geom.screenX;
    const screenY = geom.screenY;
    const screenW = geom.screenW;
    const screenH = geom.screenH;
    const screenRadius = geom.screenRadius;

    // 3. Draw Device Outer Chassis & Frame Background
    this.renderDeviceChassis(ctx, device, dx, dy, targetDeviceW, targetDeviceH);

    // 4. Render Video Content inside Screen Bounds
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(screenX, screenY, screenW, screenH, screenRadius);
    ctx.clip();

    // Prepare Screen Buffer for Zoom / Pan
    this.renderScreenContent(
      screenW,
      screenH,
      anim,
      time,
      project.annotations,
      videoElement,
      activeSample
    );

    if (this.screenBufferCanvas) {
      ctx.drawImage(this.screenBufferCanvas, screenX, screenY, screenW, screenH);
    }

    // Screen Glass Reflection / Sheen
    if (device.reflection && device.glareIntensity > 0) {
      const glareGrad = ctx.createLinearGradient(screenX, screenY, screenX + screenW, screenY + screenH);
      glareGrad.addColorStop(0, `rgba(255, 255, 255, ${device.glareIntensity * 0.9})`);
      glareGrad.addColorStop(0.35, `rgba(255, 255, 255, ${device.glareIntensity * 0.2})`);
      glareGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = glareGrad;
      ctx.fillRect(screenX, screenY, screenW, screenH);
    }

    ctx.restore();

    // 5. Draw Device Hardware Accents (Notch, Dynamic Island, Browser UI)
    this.renderDeviceOverlays(
      ctx,
      device,
      dx,
      dy,
      targetDeviceW,
      targetDeviceH,
      screenX,
      screenY,
      screenW
    );

    ctx.restore();
  }

  private renderDeviceChassis(
    ctx: CanvasRenderingContext2D,
    device: DeviceSettings,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    if (device.type === 'none') return;

    // Metallic chassis finishes
    let chassisColor1 = '#1c1c1e';
    let chassisColor2 = '#0d0d0f';

    if (device.finish === 'titanium-natural') {
      chassisColor1 = '#847e77';
      chassisColor2 = '#4a4642';
    } else if (device.finish === 'silver') {
      chassisColor1 = '#e4e4e7';
      chassisColor2 = '#a1a1aa';
    } else if (device.finish === 'midnight') {
      chassisColor1 = '#1e2430';
      chassisColor2 = '#0f141d';
    } else if (device.finish === 'deep-blue') {
      chassisColor1 = '#1e3a5f';
      chassisColor2 = '#0c1b2f';
    }

    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, chassisColor1);
    grad.addColorStop(0.5, chassisColor2);
    grad.addColorStop(1, chassisColor1);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, device.cornerRadius || 16);
    ctx.fill();

    // Realistic Edge Chamfer Rim
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // If Studio Display, draw stand chin & base below
    if (device.type === 'studio-display') {
      // Stand neck
      ctx.fillStyle = '#71717a';
      ctx.fillRect(x + w / 2 - 28, y + h, 56, 50);
      // Stand foot
      ctx.fillStyle = '#a1a1aa';
      ctx.beginPath();
      ctx.roundRect(x + w / 2 - 70, y + h + 45, 140, 10, 4);
      ctx.fill();
    }
  }

  private renderDeviceOverlays(
    ctx: CanvasRenderingContext2D,
    device: DeviceSettings,
    x: number,
    y: number,
    w: number,
    h: number,
    screenX: number,
    screenY: number,
    screenW: number
  ): void {
    const isBrowser =
      device.type === 'chrome-browser' ||
      device.type === 'safari-browser' ||
      device.type === 'minimal-browser';

    if (isBrowser) {
      this.renderBrowserHeader(ctx, device, x, y, w, screenY - y);
      return;
    }

    if (device.type === 'iphone-16-pro') {
      // Dynamic Island Pill
      const pillW = 92;
      const pillH = 25;
      const pillX = screenX + screenW / 2 - pillW / 2;
      const pillY = screenY + 11;

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fill();

      // Camera lens specular
      ctx.fillStyle = '#1c2d37';
      ctx.beginPath();
      ctx.arc(pillX + 22, pillY + pillH / 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4f7797';
      ctx.beginPath();
      ctx.arc(pillX + 22, pillY + pillH / 2, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (device.type === 'galaxy-s24') {
      // Punch hole camera
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(screenX + screenW / 2, screenY + 14, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (device.type === 'macbook-pro') {
      // Display Notch
      const notchW = 100;
      const notchH = 16;
      const notchX = screenX + screenW / 2 - notchW / 2;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.roundRect(notchX, screenY, notchW, notchH, [0, 0, 6, 6]);
      ctx.fill();

      // Camera circle
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(notchX + notchW / 2, screenY + 7, 3, 0, Math.PI * 2);
      ctx.fill();

      // Bottom hinge thumb notch
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(x + w / 2 - 42, y + h - 5, 84, 5, [0, 0, 3, 3]);
      ctx.fill();
    }
  }

  private renderBrowserHeader(
    ctx: CanvasRenderingContext2D,
    device: DeviceSettings,
    x: number,
    y: number,
    w: number,
    headerH: number
  ): void {
    const isDark = device.browserTheme === 'dark';
    ctx.fillStyle = isDark ? '#1e1e24' : '#f1f3f5';
    ctx.beginPath();
    ctx.roundRect(x, y, w, headerH, [device.cornerRadius || 14, device.cornerRadius || 14, 0, 0]);
    ctx.fill();

    // Divider line
    ctx.fillStyle = isDark ? '#2e2e38' : '#e2e8f0';
    ctx.fillRect(x, y + headerH - 1, w, 1);

    // Traffic light buttons
    const dotY = y + headerH / 2;
    const dots = [
      { color: '#ff5f56', border: '#e0443e' },
      { color: '#ffbd2e', border: '#dea123' },
      { color: '#27c93f', border: '#1aab29' },
    ];

    dots.forEach((dot, i) => {
      ctx.beginPath();
      ctx.arc(x + 18 + i * 18, dotY, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = dot.color;
      ctx.fill();
      ctx.strokeStyle = dot.border;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    if (device.type === 'minimal-browser') {
      if (device.browserTitle) {
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.font = '500 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(device.browserTitle, x + w / 2, dotY + 4);
        ctx.textAlign = 'start';
      }
      return;
    }

    // Chrome / Safari URL bar capsule
    const urlX = x + 90;
    const urlW = Math.min(420, w - 180);
    const urlH = 26;
    const urlY = dotY - urlH / 2;

    ctx.fillStyle = isDark ? '#121217' : '#ffffff';
    ctx.beginPath();
    ctx.roundRect(urlX, urlY, urlW, urlH, urlH / 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#2e2e38' : '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Lock icon
    ctx.fillStyle = '#10b981';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('🔒', urlX + 10, urlY + 17);

    // URL text
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '11px system-ui, sans-serif';
    const displayUrl = device.browserUrl || 'https://studiomotion.io';
    ctx.fillText(displayUrl, urlX + 28, urlY + 17);
  }

  private renderScreenContent(
    w: number,
    h: number,
    anim: EvaluatedAnimationState,
    time: number,
    annotations: Annotation[],
    videoElement?: HTMLVideoElement | null,
    activeSample?: DemoScreenSample | null
  ): void {
    if (!this.screenBufferCanvas || !this.screenBufferCtx) return;

    if (this.screenBufferCanvas.width !== w || this.screenBufferCanvas.height !== h) {
      this.screenBufferCanvas.width = w;
      this.screenBufferCanvas.height = h;
    }

    const sctx = this.screenBufferCtx;
    sctx.save();
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = 'high';

    // Clear buffer
    sctx.fillStyle = '#0b0f19';
    sctx.fillRect(0, 0, w, h);

    // Apply Zoom & Pan with Focus Point
    sctx.save();

    // Focus center in screen pixels
    const fx = (anim.focusX / 100) * w;
    const fy = (anim.focusY / 100) * h;

    // Shift to focus point, scale, shift back, and apply pan offset
    sctx.translate(fx + anim.panX, fy + anim.panY);
    sctx.scale(anim.zoom, anim.zoom);
    sctx.translate(-fx, -fy);

    // Draw video or sample screen recording
    const hasVideo =
      videoElement &&
      (videoElement.readyState >= 1 || videoElement.videoWidth > 0 || videoElement.currentTime > 0);

    if (hasVideo && videoElement) {
      try {
        const vw = videoElement.videoWidth || w;
        const vh = videoElement.videoHeight || h;
        const vAspect = vw / vh;
        const sAspect = w / h;

        let drawX = 0;
        let drawY = 0;
        let drawW = w;
        let drawH = h;

        // Cover fit without distortion
        if (vAspect > sAspect) {
          drawW = h * vAspect;
          drawX = (w - drawW) / 2;
        } else {
          drawH = w / vAspect;
          drawY = (h - drawH) / 2;
        }

        sctx.drawImage(videoElement, drawX, drawY, drawW, drawH);
      } catch {
        // Fallback placeholder while video texture decodes
        this.renderVideoLoadingState(sctx, w, h, 'Buffering video frame...');
      }
    } else if (activeSample) {
      activeSample.drawFrame(sctx, w, h, time);
    } else if (videoElement) {
      // User uploaded video that is preparing first frame
      try {
        sctx.drawImage(videoElement, 0, 0, w, h);
      } catch {
        this.renderVideoLoadingState(sctx, w, h, 'Preparing video playback...');
      }
    } else {
      SAMPLE_RECORDINGS[0].drawFrame(sctx, w, h, time);
    }

    // Render Annotations inside the zoomed coordinate space so they stay locked to screen features!
    this.renderAnnotations(sctx, annotations, w, h, time);

    sctx.restore();
    sctx.restore();
  }

  private renderVideoLoadingState(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    message: string
  ): void {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Card
    const cardW = 280;
    const cardH = 90;
    const cx = (w - cardW) / 2;
    const cy = (h - cardH) / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(cx, cy, cardW, cardH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(message, w / 2, cy + 38);

    ctx.fillStyle = '#818cf8';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('Press Play or scrub timeline', w / 2, cy + 62);
    ctx.textAlign = 'start';
  }

  private renderAnnotations(
    ctx: CanvasRenderingContext2D,
    annotations: Annotation[],
    w: number,
    h: number,
    t: number
  ): void {
    const active = annotations.filter((a) => t >= a.startTime && t <= a.endTime);

    for (const ann of active) {
      const ax = (ann.x / 100) * w;
      const ay = (ann.y / 100) * h;
      const aw = (ann.width / 100) * w;
      const ah = (ann.height / 100) * h;

      const elapsed = t - ann.startTime;
      const remaining = ann.endTime - t;
      const animDur = Math.max(0.1, ann.animationDuration || 0.45);
      const entryProg = Math.min(1, Math.max(0, elapsed / animDur));
      const exitProg = Math.min(1, Math.max(0, remaining / 0.2));
      const overallAlpha = Math.min(entryProg, exitProg);
      const animType = ann.animationType || (ann.type === 'spotlight' ? 'spotlight-iris' : 'draw-stroke');

      ctx.save();

      // Fade-scale or float animation transform
      if (animType === 'fade-scale') {
        const easeScale = 0.85 + 0.15 * (1 - Math.pow(1 - entryProg, 3));
        ctx.translate(ax + aw / 2, ay + ah / 2);
        ctx.scale(easeScale, easeScale);
        ctx.translate(-(ax + aw / 2), -(ay + ah / 2));
        ctx.globalAlpha = overallAlpha;
      } else if (animType === 'float') {
        const floatY = Math.sin(elapsed * 2.5) * 4;
        ctx.translate(0, floatY);
        ctx.globalAlpha = overallAlpha;
      } else {
        ctx.globalAlpha = exitProg;
      }

      if (ann.type === 'spotlight') {
        // Spotlight iris expansion animation
        let holeAx = ax;
        let holeAy = ay;
        let holeAw = aw;
        let holeAh = ah;

        let curDim = ann.dimOpacity || 0.65;

        if (animType === 'spotlight-iris' || animType === 'draw-stroke') {
          const irisEase = 1 - Math.pow(1 - entryProg, 3);
          holeAw = aw * irisEase;
          holeAh = ah * irisEase;
          holeAx = ax + (aw - holeAw) / 2;
          holeAy = ay + (ah - holeAh) / 2;
          curDim = (ann.dimOpacity || 0.65) * irisEase;
        }

        // Dim outer screen while keeping highlighted box crystal clear
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${curDim * exitProg})`;
        ctx.beginPath();
        // Outer rect
        ctx.rect(0, 0, w, h);
        // Cut out inner hole
        ctx.roundRect(holeAx, holeAy, holeAw, holeAh, 8);
        ctx.fill('evenodd');

        // Soft neon border around hole
        ctx.strokeStyle = ann.strokeColor || '#6366f1';
        let strokeW = ann.strokeWidth || 3;
        let glowBlur = 15;

        if (ann.pulse || animType === 'pulse-glow') {
          const pulseVal = Math.sin(elapsed * 4) * 0.5 + 0.5;
          glowBlur = 12 + pulseVal * 16;
          strokeW = (ann.strokeWidth || 3) * (1 + 0.2 * pulseVal);
        }

        ctx.lineWidth = strokeW;
        ctx.shadowColor = ann.glowColor || '#6366f1';
        ctx.shadowBlur = glowBlur;
        ctx.stroke();
        ctx.restore();
      } else if (ann.type === 'rounded-rect') {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(ax, ay, aw, ah, 10);

        if (ann.fillColor && ann.fillColor !== 'transparent') {
          ctx.fillStyle = ann.fillColor;
          ctx.fill();
        }

        let strokeW = ann.strokeWidth || 3;
        let glowBlur = ann.glow ? 16 : 0;

        if (ann.pulse || animType === 'pulse-glow') {
          const pulseVal = Math.sin(elapsed * 4) * 0.5 + 0.5;
          glowBlur = 10 + pulseVal * 18;
          strokeW = (ann.strokeWidth || 3) * (1 + 0.25 * pulseVal);
        }

        ctx.strokeStyle = ann.strokeColor;
        ctx.lineWidth = strokeW;
        if (ann.glow || glowBlur > 0) {
          ctx.shadowColor = ann.glowColor || ann.strokeColor;
          ctx.shadowBlur = glowBlur;
        }

        // Animated draw stroke
        if (animType === 'draw-stroke') {
          const perimeter = 2 * (aw + ah);
          const drawEase = 1 - Math.pow(1 - entryProg, 3);
          const drawnLength = perimeter * drawEase;
          ctx.setLineDash([drawnLength, perimeter]);
          ctx.stroke();

          // Draw glowing pen tip while drawing
          if (entryProg < 0.98) {
            ctx.setLineDash([]);
            const tipPoint = this.getRectPerimeterPoint(ax, ay, aw, ah, drawnLength);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = ann.glowColor || '#38bdf8';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(tipPoint.x, tipPoint.y, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.stroke();
        }

        // Corner brackets animation if enabled
        if (animType === 'corner-brackets') {
          this.drawCornerBrackets(ctx, ax, ay, aw, ah, ann.strokeColor, entryProg);
        }

        ctx.restore();
      } else if (ann.type === 'ellipse') {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(ax + aw / 2, ay + ah / 2, aw / 2, ah / 2, 0, 0, Math.PI * 2);

        if (ann.fillColor && ann.fillColor !== 'transparent') {
          ctx.fillStyle = ann.fillColor;
          ctx.fill();
        }

        ctx.strokeStyle = ann.strokeColor;
        ctx.lineWidth = ann.strokeWidth;
        if (ann.glow) {
          ctx.shadowColor = ann.glowColor;
          ctx.shadowBlur = 16;
        }

        if (animType === 'draw-stroke') {
          const perimeter = Math.PI * (aw + ah);
          const drawEase = 1 - Math.pow(1 - entryProg, 3);
          ctx.setLineDash([perimeter * drawEase, perimeter]);
        }

        ctx.stroke();
        ctx.restore();
      } else if (ann.type === 'arrow') {
        // Directed arrow
        ctx.save();
        ctx.strokeStyle = ann.strokeColor;
        ctx.fillStyle = ann.strokeColor;
        ctx.lineWidth = ann.strokeWidth;
        if (ann.glow) {
          ctx.shadowColor = ann.glowColor;
          ctx.shadowBlur = 12;
        }

        const startX = ax;
        const startY = ay;
        const fullEndX = ax + aw;
        const fullEndY = ay + ah;

        const arrowProg = animType === 'draw-stroke' ? 1 - Math.pow(1 - entryProg, 3) : 1.0;
        const endX = startX + (fullEndX - startX) * arrowProg;
        const endY = startY + (fullEndY - startY) * arrowProg;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrow head
        if (arrowProg > 0.4) {
          const angle = Math.atan2(endY - startY, endX - startX);
          const headLen = Math.max(12, ann.strokeWidth * 3);
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headLen * Math.cos(angle - Math.PI / 6),
            endY - headLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            endX - headLen * Math.cos(angle + Math.PI / 6),
            endY - headLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      } else if (ann.type === 'callout') {
        // Floating pill callout
        ctx.save();
        ctx.fillStyle = ann.fillColor || 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        ctx.roundRect(ax, ay, aw, ah, 8);
        ctx.fill();
        ctx.strokeStyle = ann.strokeColor || '#6366f1';
        ctx.lineWidth = ann.strokeWidth || 2;
        if (ann.glow) {
          ctx.shadowColor = ann.glowColor || '#6366f1';
          ctx.shadowBlur = 12;
        }
        ctx.stroke();

        if (ann.text) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '600 13px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(ann.text, ax + aw / 2, ay + ah / 2 + 5);
        }
        ctx.restore();
      } else if (ann.type === 'ripple') {
        // Expanding ripple
        const progress = ((t - ann.startTime) * 2) % 1;
        const r = progress * Math.max(aw, ah);
        const alpha = Math.max(0, 1 - progress);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = ann.strokeColor || '#6366f1';
        ctx.lineWidth = ann.strokeWidth || 3;
        ctx.beginPath();
        ctx.arc(ax + aw / 2, ay + ah / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (ann.type === 'blur-box') {
        // Blur / privacy redact box
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.beginPath();
        ctx.roundRect(ax, ay, aw, ah, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('REDACTED', ax + aw / 2, ay + ah / 2 + 4);
      }

      ctx.restore();
    }
  }

  private getRectPerimeterPoint(
    x: number,
    y: number,
    w: number,
    h: number,
    d: number
  ): { x: number; y: number } {
    if (d <= w) {
      return { x: x + d, y: y };
    }
    d -= w;
    if (d <= h) {
      return { x: x + w, y: y + d };
    }
    d -= h;
    if (d <= w) {
      return { x: x + w - d, y: y + h };
    }
    d -= w;
    return { x: x, y: y + h - Math.min(h, d) };
  }

  private drawCornerBrackets(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
    progress: number
  ): void {
    const len = Math.min(w * 0.35, Math.min(h * 0.35, 18 * progress));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 4 + len);
    ctx.lineTo(x - 4, y - 4);
    ctx.lineTo(x - 4 + len, y - 4);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + w + 4 - len, y - 4);
    ctx.lineTo(x + w + 4, y - 4);
    ctx.lineTo(x + w + 4, y - 4 + len);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + w + 4, y + h + 4 - len);
    ctx.lineTo(x + w + 4, y + h + 4);
    ctx.lineTo(x + w + 4 - len, y + h + 4);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x - 4 + len, y + h + 4);
    ctx.lineTo(x - 4, y + h + 4);
    ctx.lineTo(x - 4, y + h + 4 - len);
    ctx.stroke();
  }

  private renderPiP(
    ctx: CanvasRenderingContext2D,
    pip: PiPSettings,
    cw: number,
    ch: number,
    videoElement?: HTMLVideoElement | null
  ): void {
    const size = pip.size || 220;
    const margin = 36;
    let px = cw - size - margin;
    let py = ch - size - margin;

    if (pip.position === 'bottom-left') {
      px = margin;
      py = ch - size - margin;
    } else if (pip.position === 'top-right') {
      px = cw - size - margin;
      py = margin;
    } else if (pip.position === 'top-left') {
      px = margin;
      py = margin;
    } else if (pip.position === 'custom') {
      px = pip.x;
      py = pip.y;
    }

    ctx.save();

    // Shadow
    if (pip.shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 12;
    }

    // Clip shape
    ctx.beginPath();
    if (pip.shape === 'circle') {
      ctx.arc(px + size / 2, py + size / 2, size / 2, 0, Math.PI * 2);
    } else {
      ctx.roundRect(px, py, size, size, pip.shape === 'squircle' ? 36 : 18);
    }
    ctx.fillStyle = '#1e1e28';
    ctx.fill();

    ctx.clip();

    if (videoElement && videoElement.readyState >= 2) {
      ctx.drawImage(videoElement, px, py, size, size);
    } else {
      // Draw professional presenter avatar simulation
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(px, py, size, size);

      // Gradient studio backdrop
      const avatarGrad = ctx.createRadialGradient(
        px + size / 2,
        py + size / 2,
        10,
        px + size / 2,
        py + size / 2,
        size / 2
      );
      avatarGrad.addColorStop(0, '#4338ca');
      avatarGrad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = avatarGrad;
      ctx.fillRect(px, py, size, size);

      // Presenter Head & Body Silhouette
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      // Head
      ctx.arc(px + size / 2, py + size * 0.42, size * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Shoulders
      ctx.beginPath();
      ctx.ellipse(px + size / 2, py + size * 0.9, size * 0.35, size * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Border
    if (pip.borderWidth > 0) {
      ctx.save();
      ctx.strokeStyle = pip.borderColor || '#6366f1';
      ctx.lineWidth = pip.borderWidth;
      ctx.beginPath();
      if (pip.shape === 'circle') {
        ctx.arc(px + size / 2, py + size / 2, size / 2, 0, Math.PI * 2);
      } else {
        ctx.roundRect(px, py, size, size, pip.shape === 'squircle' ? 36 : 18);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderPostEffects(
    ctx: CanvasRenderingContext2D,
    project: Project,
    w: number,
    h: number
  ): void {
    // Vignette
    if (project.effects.vignette > 0) {
      const radius = Math.max(w, h) * 0.75;
      const grad = ctx.createRadialGradient(w / 2, h / 2, radius * 0.4, w / 2, h / 2, radius);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, `rgba(0, 0, 0, ${project.effects.vignette * 0.8})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
