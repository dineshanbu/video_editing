import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EditorStateService } from '../services/editor-state.service';
import { VideoCompositionRenderer } from '../core/renderer';
import { Annotation, HighlightAnimationType } from '../core/models';

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

@Component({
  selector: 'app-preview-canvas',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="flex-1 flex flex-col bg-[#070a12] relative overflow-hidden select-none min-w-0">
      <!-- Floating Top Canvas Quick Mode Bar -->
      <div class="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-[#0d121f]/90 border border-slate-700/80 backdrop-blur-md rounded-xl p-1 shadow-xl">
        <!-- Select / Focus Tool -->
        <button
          type="button"
          (click)="state.setDrawingMode(false)"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          [class.bg-indigo-600]="!state.isDrawingMode()"
          [class.text-white]="!state.isDrawingMode()"
          [class.text-slate-400]="state.isDrawingMode()"
          [class.hover:text-slate-200]="state.isDrawingMode()"
          title="Select and resize highlights, or click to set zoom focus point"
        >
          <mat-icon class="text-sm! leading-none!">near_me</mat-icon>
          <span>Select & Resize</span>
        </button>

        <div class="h-4 w-px bg-slate-700 mx-0.5"></div>

        <!-- Draw Highlight Box Button -->
        <button
          type="button"
          (click)="state.setDrawingMode(true, 'rounded-rect')"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          [class.bg-sky-600]="state.isDrawingMode() && state.drawingToolType() === 'rounded-rect'"
          [class.text-white]="state.isDrawingMode() && state.drawingToolType() === 'rounded-rect'"
          [class.text-slate-400]="!state.isDrawingMode() || state.drawingToolType() !== 'rounded-rect'"
          [class.hover:text-slate-200]="!state.isDrawingMode() || state.drawingToolType() !== 'rounded-rect'"
          title="Click and drag on the video to draw a highlight box"
        >
          <mat-icon class="text-sm! leading-none!">crop_square</mat-icon>
          <span>Draw Highlight</span>
        </button>

        <!-- Draw Spotlight Button -->
        <button
          type="button"
          (click)="state.setDrawingMode(true, 'spotlight')"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          [class.bg-indigo-600]="state.isDrawingMode() && state.drawingToolType() === 'spotlight'"
          [class.text-white]="state.isDrawingMode() && state.drawingToolType() === 'spotlight'"
          [class.text-slate-400]="!state.isDrawingMode() || state.drawingToolType() !== 'spotlight'"
          [class.hover:text-slate-200]="!state.isDrawingMode() || state.drawingToolType() !== 'spotlight'"
          title="Click and drag on the video to draw spotlight focus hole"
        >
          <mat-icon class="text-sm! leading-none!">highlight</mat-icon>
          <span>Draw Spotlight</span>
        </button>

        <!-- Draw Arrow Button -->
        <button
          type="button"
          (click)="state.setDrawingMode(true, 'arrow')"
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
          [class.bg-emerald-600]="state.isDrawingMode() && state.drawingToolType() === 'arrow'"
          [class.text-white]="state.isDrawingMode() && state.drawingToolType() === 'arrow'"
          [class.text-slate-400]="!state.isDrawingMode() || state.drawingToolType() !== 'arrow'"
          [class.hover:text-slate-200]="!state.isDrawingMode() || state.drawingToolType() !== 'arrow'"
          title="Click and drag on the video to draw an arrow"
        >
          <mat-icon class="text-sm! leading-none!">north_east</mat-icon>
          <span>Arrow</span>
        </button>
      </div>

      <!-- Main Canvas Container with Drag & Drop -->
      <div
        #canvasContainer
        class="flex-1 flex items-center justify-center p-4 relative overflow-hidden"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
      >
        <!-- Canvas wrapper matching rendered canvas element aspect and dimensions -->
        <div
          #canvasWrapper
          class="relative inline-flex items-center justify-center max-w-full max-h-full cursor-default"
          (mousedown)="onWrapperMouseDown($event)"
          (mousemove)="onWrapperMouseMove($event)"
          (mouseup)="onWrapperMouseUp()"
          (mouseleave)="onWrapperMouseLeave()"
        >
          <!-- Canvas Element -->
          <canvas
            #previewCanvas
            class="shadow-2xl rounded-lg max-w-full max-h-full object-contain border border-slate-800/60 block"
            [class.cursor-crosshair]="state.isDrawingMode()"
          ></canvas>

          <!-- Interactive Highlight Selection & Resize Handles Overlay -->
          @if (activeSelectedAnnotation(); as ann) {
            <div
              class="absolute border-2 border-indigo-400 pointer-events-auto rounded-sm transition-shadow z-20 group"
              [style.left.%]="ann.x"
              [style.top.%]="ann.y"
              [style.width.%]="ann.width"
              [style.height.%]="ann.height"
              [style.cursor]="isMovingAnnotation ? 'grabbing' : 'grab'"
              (mousedown)="onAnnotationBoxMouseDown($event, ann)"
            >
              <!-- Floating Mini-Action Bar right above the highlight box -->
              <div
                class="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 border border-indigo-500/60 rounded-lg px-2 py-1 shadow-2xl text-[11px] whitespace-nowrap z-30 pointer-events-auto"
                (mousedown)="$event.stopPropagation()"
              >
                <!-- Dimension Readout -->
                <span class="font-mono text-indigo-300 font-semibold px-1">
                  W: {{ ann.width.toFixed(0) }}% × H: {{ ann.height.toFixed(0) }}%
                </span>

                <div class="h-3 w-px bg-slate-700 mx-0.5"></div>

                <!-- Split at Playhead button -->
                <button
                  type="button"
                  (click)="state.splitAnnotationAtPlayhead(ann.id)"
                  class="flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-slate-800 text-amber-300 transition-colors"
                  title="Split this highlight into two at the current playhead"
                >
                  <mat-icon class="text-xs! leading-none!">content_cut</mat-icon>
                  <span>Split</span>
                </button>

                <!-- Duplicate button -->
                <button
                  type="button"
                  (click)="state.duplicateAnnotation(ann.id)"
                  class="flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-slate-800 text-sky-300 transition-colors"
                  title="Duplicate this highlight"
                >
                  <mat-icon class="text-xs! leading-none!">content_copy</mat-icon>
                  <span>Duplicate</span>
                </button>

                <!-- Animation Type Pill -->
                <select
                  [value]="ann.animationType || 'draw-stroke'"
                  (change)="onAnnotationAnimationChange($event, ann.id)"
                  class="bg-slate-800 border border-slate-700 text-slate-200 text-[10px] rounded px-1.5 py-0.5 focus:outline-none"
                  title="Select highlight entrance animation"
                >
                  <option value="draw-stroke">✏️ Draw Stroke</option>
                  <option value="fade-scale">💫 Spring Pop</option>
                  <option value="spotlight-iris">🔦 Iris Reveal</option>
                  <option value="pulse-glow">✨ Breathing Glow</option>
                  <option value="corner-brackets">🎯 Target Lock</option>
                  <option value="none">Instant</option>
                </select>

                <!-- Delete button -->
                <button
                  type="button"
                  (click)="state.deleteAnnotation(ann.id)"
                  class="p-0.5 rounded hover:bg-rose-950 text-rose-400 hover:text-rose-300 transition-colors ml-0.5"
                  title="Delete highlight"
                >
                  <mat-icon class="text-xs! leading-none!">delete</mat-icon>
                </button>
              </div>

              <!-- 8 Interactive Corner & Edge Resize Handles -->
              <!-- Top-Left -->
              <div
                class="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                (mousedown)="onHandleMouseDown($event, 'nw')"
              ></div>
              <!-- Top -->
              <div
                class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-ns-resize shadow-md hover:scale-125 transition-transform"
                (mousedown)="onHandleMouseDown($event, 'n')"
              ></div>
              <!-- Top-Right -->
              <div
                class="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                (mousedown)="onHandleMouseDown($event, 'ne')"
              ></div>
              <!-- Right -->
              <div
                class="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-ew-resize shadow-md hover:scale-125 transition-transform"
                (mousedown)="onHandleMouseDown($event, 'e')"
              ></div>
              <!-- Bottom-Right -->
              <div
                class="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                (mousedown)="onHandleMouseDown($event, 'se')"
              ></div>
              <!-- Bottom -->
              <div
                class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-ns-resize shadow-md hover:scale-125 transition-transform"
                (mousedown)="onHandleMouseDown($event, 's')"
              ></div>
              <!-- Bottom-Left -->
              <div
                class="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                (mousedown)="onHandleMouseDown($event, 'sw')"
              ></div>
              <!-- Left -->
              <div
                class="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-ew-resize shadow-md hover:scale-125 transition-transform"
                (mousedown)="onHandleMouseDown($event, 'w')"
              ></div>
            </div>
          }

          <!-- Live Drawing Box Preview while user is dragging mouse to draw size -->
          @if (isActivelyDrawing) {
            <div
              class="absolute border-2 border-dashed border-sky-400 bg-sky-500/15 pointer-events-none rounded-md z-20"
              [style.left.%]="drawnRectMinX"
              [style.top.%]="drawnRectMinY"
              [style.width.%]="drawnRectW"
              [style.height.%]="drawnRectH"
            >
              <!-- Live Dimensions Tag -->
              <div class="absolute -top-7 left-0 bg-sky-950/90 border border-sky-400 text-white font-mono text-[10px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                W: {{ drawnRectW.toFixed(0) }}% × H: {{ drawnRectH.toFixed(0) }}%
              </div>
            </div>
          }
        </div>

        <!-- Hidden Offscreen Video Element (accessible to browser media pipeline for decoding) -->
        <!-- Note: low opacity inside container to prevent Chrome from optimizing out video frame decoding -->
        <video
          #hiddenVideo
          style="position: absolute; bottom: 0; left: 0; width: 4px; height: 4px; opacity: 0.01; pointer-events: none; z-index: -10;"
          playsinline
          muted
          preload="auto"
          (loadedmetadata)="onVideoMetadataLoaded($event)"
          (loadeddata)="onVideoLoadedData($event)"
          (canplay)="onVideoCanPlay()"
          (seeked)="onVideoSeeked()"
          (ended)="onVideoEnded()"
        ></video>

        <!-- Drag Over Highlight Overlay -->
        @if (isDraggingOver()) {
          <div class="absolute inset-4 rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-950/60 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 z-30 pointer-events-none">
            <mat-icon class="text-indigo-400 text-4xl! mb-2">file_upload</mat-icon>
            <span class="text-sm font-bold text-white">Drop video here</span>
            <span class="text-xs text-indigo-300 mt-1">MP4, WebM, MOV screen recordings</span>
          </div>
        }

        <!-- Focus Point Indicator overlay when zooming and not drawing -->
        @if (!state.isDrawingMode() && state.project().transform.zoom > 1.05 && !activeSelectedAnnotation()) {
          <div
            class="absolute pointer-events-none w-8 h-8 -ml-4 -mt-4 border-2 border-indigo-400 rounded-full flex items-center justify-center animate-pulse"
            [style.left.%]="state.project().transform.focusX"
            [style.top.%]="state.project().transform.focusY"
          >
            <div class="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
          </div>
        }

        <!-- Toast Feedback Notification -->
        @if (state.toastMessage(); as toast) {
          <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-indigo-500/50 text-slate-100 text-xs px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 pointer-events-none animate-bounce">
            <mat-icon class="text-sm! text-indigo-400 leading-none!">info</mat-icon>
            <span>{{ toast }}</span>
          </div>
        }
      </div>

      <!-- Floating Quick Player Controls Bar -->
      <div class="h-12 bg-[#0c101b] border-t border-slate-800/80 px-4 flex items-center justify-between gap-4 shrink-0 z-10">
        <!-- Left: Playback controls -->
        <div class="flex items-center gap-1.5">
          <!-- Step 1 Frame Backward -->
          <button
            type="button"
            (click)="state.stepFrame(-1)"
            class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            title="Step 1 frame backward (Left Arrow)"
            aria-label="Step 1 frame backward"
          >
            <mat-icon class="text-base! leading-none!">skip_previous</mat-icon>
          </button>

          <!-- Play / Pause -->
          <button
            type="button"
            (click)="state.togglePlay()"
            class="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 transition-all"
            [title]="state.isPlaying() ? 'Pause (Space)' : 'Play (Space)'"
            [attr.aria-label]="state.isPlaying() ? 'Pause' : 'Play'"
          >
            <mat-icon class="text-lg! leading-none!">
              {{ state.isPlaying() ? 'pause' : 'play_arrow' }}
            </mat-icon>
          </button>

          <!-- Step 1 Frame Forward -->
          <button
            type="button"
            (click)="state.stepFrame(1)"
            class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            title="Step 1 frame forward (Right Arrow)"
            aria-label="Step 1 frame forward"
          >
            <mat-icon class="text-base! leading-none!">skip_next</mat-icon>
          </button>

          <div class="h-4 w-px bg-slate-800 mx-2"></div>

          <!-- Playback Speed -->
          <div class="flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded-md p-0.5 text-[11px] font-medium">
            @for (spd of [0.5, 1.0, 1.5, 2.0]; track spd) {
              <button
                type="button"
                (click)="state.setPlaybackSpeed(spd)"
                class="px-1.5 py-0.5 rounded transition-colors"
                [class.bg-slate-800]="state.playbackSpeed() === spd"
                [class.text-white]="state.playbackSpeed() === spd"
                [class.text-slate-400]="state.playbackSpeed() !== spd"
              >
                {{ spd }}x
              </button>
            }
          </div>
        </div>

        <!-- Center: Current Resolution & Frame Info -->
        <div class="flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap shrink-0">
          <span class="font-mono text-slate-300">{{ state.project().width }}×{{ state.project().height }}</span>
          <span class="text-slate-600">·</span>
          <span>{{ state.project().fps }} FPS</span>
          <span class="text-slate-600">·</span>
          <span class="text-indigo-400 font-medium">
            Zoom {{ state.project().transform.zoom.toFixed(1) }}x
          </span>
        </div>

        <!-- Right: Actions -->
        <div class="flex items-center gap-2">
          <!-- Reset Zoom button -->
          <button
            type="button"
            (click)="state.resetTransform()"
            class="px-2.5 py-1 text-xs rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1"
            title="Fit zoom to 1.0x"
          >
            <mat-icon class="text-xs! leading-none!">fit_screen</mat-icon>
            <span>Reset View</span>
          </button>
        </div>
      </div>
    </main>
  `,
})
export class PreviewCanvasComponent implements OnInit, OnDestroy {
  public state = inject(EditorStateService);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('previewCanvas', { static: true })
  public canvasRef!: ElementRef<HTMLCanvasElement>;

  @ViewChild('canvasWrapper', { static: true })
  public canvasWrapperRef!: ElementRef<HTMLDivElement>;

  @ViewChild('hiddenVideo', { static: true })
  public videoRef!: ElementRef<HTMLVideoElement>;

  public isDraggingOver = signal(false);

  // Active annotation for bounding box
  public activeSelectedAnnotation = computed<Annotation | null>(() => {
    return this.state.selectedAnnotation();
  });

  // Interactive drawing state
  public isActivelyDrawing = false;
  public drawStartX = 0;
  public drawStartY = 0;
  public drawCurrentX = 0;
  public drawCurrentY = 0;

  public get drawnRectMinX(): number {
    return Math.min(this.drawStartX, this.drawCurrentX);
  }
  public get drawnRectMinY(): number {
    return Math.min(this.drawStartY, this.drawCurrentY);
  }
  public get drawnRectW(): number {
    return Math.max(1, Math.abs(this.drawCurrentX - this.drawStartX));
  }
  public get drawnRectH(): number {
    return Math.max(1, Math.abs(this.drawCurrentY - this.drawStartY));
  }

  // Interactive resize and move state
  public isResizingHandle = false;
  public activeHandle: ResizeHandle | null = null;
  public isMovingAnnotation = false;
  public moveStartMouseX = 0;
  public moveStartMouseY = 0;
  public initialAnnX = 0;
  public initialAnnY = 0;
  public initialAnnW = 0;
  public initialAnnH = 0;

  private renderer = new VideoCompositionRenderer();
  private animationFrameId: number | null = null;
  private lastTimestamp = 0;

  constructor() {
    // React to video URL or Stream changes
    effect(() => {
      const url = this.state.uploadedVideoUrl();
      const stream = this.state.uploadedVideoStream();
      const video = this.videoRef?.nativeElement;
      if (!video) return;

      if (stream) {
        video.srcObject = stream;
        video.muted = true;
        video.play().catch((err) => { void err; });
      } else if (url && url !== 'stream') {
        video.srcObject = null;
        // IMPORTANT: Never set crossOrigin on blob URLs
        video.removeAttribute('crossorigin');
        video.muted = true;
        video.src = url;
        video.load();
        // Force initial frame decode
        video.currentTime = 0.001;
      } else if (!url) {
        video.srcObject = null;
        video.src = '';
      }
    });

    // React to Play / Pause state
    effect(() => {
      const isPlaying = this.state.isPlaying();
      const video = this.videoRef?.nativeElement;
      if (!video || !this.state.uploadedVideoUrl()) return;

      if (isPlaying) {
        if (video.paused) {
          video.play().catch((err) => { void err; });
        }
      } else {
        if (!video.paused) {
          video.pause();
        }
      }
    });

    // React to manual timeline scrubbing while paused
    effect(() => {
      const time = this.state.currentTime();
      const video = this.videoRef?.nativeElement;
      if (!video || !this.state.uploadedVideoUrl() || this.state.isPlaying()) return;

      const safeTime = Math.max(0.001, time);
      if (Math.abs(video.currentTime - safeTime) > 0.05) {
        video.currentTime = safeTime;
      }
    });
  }

  public ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.startRenderLoop();
    }
  }

  public ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  public onVideoMetadataLoaded(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (!video || !video.duration || isNaN(video.duration)) return;

    video.muted = true;
    const dur = Math.max(1, Math.round(video.duration * 10) / 10);
    this.state.project.update((p) => ({
      ...p,
      duration: dur,
      clips: [
        {
          ...p.clips[0],
          name: this.state.uploadedVideoName() || 'Uploaded Video',
          duration: dur,
          trimOut: dur,
          naturalWidth: video.videoWidth || 1920,
          naturalHeight: video.videoHeight || 1080,
        },
      ],
    }));

    if (video.currentTime === 0) {
      video.currentTime = 0.001;
    }
    this.renderFrame();
  }

  public onVideoLoadedData(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (video && video.videoWidth > 0) {
      this.renderFrame();
    }
  }

  public onVideoCanPlay(): void {
    this.renderFrame();
  }

  public onVideoSeeked(): void {
    this.renderFrame();
  }

  public onVideoEnded(): void {
    this.state.pause();
    this.state.seek(0);
  }

  private startRenderLoop(): void {
    const loop = (timestamp: number) => {
      if (!this.lastTimestamp) this.lastTimestamp = timestamp;
      const deltaTime = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      // Advance playhead if playing
      if (this.state.isPlaying()) {
        const video = this.videoRef?.nativeElement;
        const hasCustomVideo = this.state.uploadedVideoUrl() && video;

        if (hasCustomVideo && !video.paused) {
          if (video.currentTime >= this.state.project().duration) {
            this.state.seek(0);
            video.currentTime = 0.001;
          } else {
            this.state.currentTime.set(video.currentTime);
          }
        } else {
          const speed = this.state.playbackSpeed();
          const nextTime = this.state.currentTime() + deltaTime * speed;
          const duration = this.state.project().duration;

          if (nextTime >= duration) {
            this.state.seek(0);
            if (hasCustomVideo) video.currentTime = 0.001;
          } else {
            this.state.seek(nextTime);
            if (hasCustomVideo && Math.abs(video.currentTime - nextTime) > 0.2) {
              video.currentTime = nextTime;
            }
          }
        }
      }

      this.renderFrame();
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private renderFrame(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const project = this.state.project();
    if (canvas.width !== project.width || canvas.height !== project.height) {
      canvas.width = project.width;
      canvas.height = project.height;
    }

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const video = this.state.uploadedVideoUrl() ? this.videoRef.nativeElement : null;
    const sample = this.state.activeSample();

    this.renderer.render(
      ctx,
      project,
      this.state.currentTime(),
      video,
      sample
    );
  }

  // --- Mouse coordinates helper ---
  private getCanvasPercentCoords(event: MouseEvent): { pctX: number; pctY: number } | null {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    const clientX = event.clientX - rect.left;
    const clientY = event.clientY - rect.top;

    const pctX = Math.max(0, Math.min(100, (clientX / rect.width) * 100));
    const pctY = Math.max(0, Math.min(100, (clientY / rect.height) * 100));
    return { pctX, pctY };
  }

  // --- Wrapper Mouse Event Handlers ---
  public onWrapperMouseDown(event: MouseEvent): void {
    const coords = this.getCanvasPercentCoords(event);
    if (!coords) return;

    if (this.state.isDrawingMode()) {
      // Start actively drawing height and width!
      event.preventDefault();
      this.isActivelyDrawing = true;
      this.drawStartX = coords.pctX;
      this.drawStartY = coords.pctY;
      this.drawCurrentX = coords.pctX;
      this.drawCurrentY = coords.pctY;
      return;
    }

    // If not drawing and user clicked on empty canvas area
    if (!this.isMovingAnnotation && !this.isResizingHandle) {
      // Check if user clicked on another highlight at current time
      const t = this.state.currentTime();
      const activeAnns = this.state.project().annotations.filter((a) => t >= a.startTime && t <= a.endTime);
      const clickedAnn = activeAnns.reverse().find((a) => {
        return (
          coords.pctX >= a.x &&
          coords.pctX <= a.x + a.width &&
          coords.pctY >= a.y &&
          coords.pctY <= a.y + a.height
        );
      });

      if (clickedAnn) {
        this.state.selectAnnotation(clickedAnn.id);
        this.state.activeInspectorTab.set('annotations');
        return;
      }

      // If clicked empty canvas, set zoom focus point or clear annotation selection
      if (this.state.selectedAnnotationId()) {
        this.state.selectAnnotation(null);
      } else {
        this.state.updateTransformSettings({
          focusX: Math.round(coords.pctX),
          focusY: Math.round(coords.pctY),
        });
      }
    }
  }

  public onWrapperMouseMove(event: MouseEvent): void {
    const coords = this.getCanvasPercentCoords(event);
    if (!coords) return;

    if (this.isActivelyDrawing) {
      this.drawCurrentX = coords.pctX;
      this.drawCurrentY = coords.pctY;
      return;
    }

    const ann = this.state.selectedAnnotation();
    if (!ann) return;

    if (this.isMovingAnnotation) {
      const deltaX = coords.pctX - this.moveStartMouseX;
      const deltaY = coords.pctY - this.moveStartMouseY;
      const newX = Math.max(0, Math.min(100 - ann.width, this.initialAnnX + deltaX));
      const newY = Math.max(0, Math.min(100 - ann.height, this.initialAnnY + deltaY));
      this.state.updateAnnotation(ann.id, {
        x: Math.round(newX * 10) / 10,
        y: Math.round(newY * 10) / 10,
      });
      return;
    }

    if (this.isResizingHandle && this.activeHandle) {
      const handle = this.activeHandle;
      let newX = this.initialAnnX;
      let newY = this.initialAnnY;
      let newW = this.initialAnnW;
      let newH = this.initialAnnH;

      if (handle.includes('e')) {
        newW = Math.max(4, coords.pctX - newX);
      }
      if (handle.includes('w')) {
        const rightEdge = this.initialAnnX + this.initialAnnW;
        newX = Math.min(rightEdge - 4, coords.pctX);
        newW = rightEdge - newX;
      }
      if (handle.includes('s')) {
        newH = Math.max(3, coords.pctY - newY);
      }
      if (handle.includes('n')) {
        const bottomEdge = this.initialAnnY + this.initialAnnH;
        newY = Math.min(bottomEdge - 3, coords.pctY);
        newH = bottomEdge - newY;
      }

      this.state.updateAnnotation(ann.id, {
        x: Math.round(newX * 10) / 10,
        y: Math.round(newY * 10) / 10,
        width: Math.round(newW * 10) / 10,
        height: Math.round(newH * 10) / 10,
      });
    }
  }

  public onWrapperMouseUp(): void {
    if (this.isActivelyDrawing) {
      this.isActivelyDrawing = false;
      const minX = Math.min(this.drawStartX, this.drawCurrentX);
      const minY = Math.min(this.drawStartY, this.drawCurrentY);
      const w = Math.max(4, Math.abs(this.drawCurrentX - this.drawStartX));
      const h = Math.max(3, Math.abs(this.drawCurrentY - this.drawStartY));

      const tool = this.state.drawingToolType();
      this.state.addAnnotation(tool, {
        x: Math.round(minX * 10) / 10,
        y: Math.round(minY * 10) / 10,
        width: Math.round(w * 10) / 10,
        height: Math.round(h * 10) / 10,
        animationType: tool === 'spotlight' ? 'spotlight-iris' : 'draw-stroke',
        animationDuration: 0.45,
      });

      // Exit drawing mode back to select mode so user can immediately resize or split
      this.state.setDrawingMode(false);
      return;
    }

    if (this.isMovingAnnotation || this.isResizingHandle) {
      this.isMovingAnnotation = false;
      this.isResizingHandle = false;
      this.activeHandle = null;
    }
  }

  public onWrapperMouseLeave(): void {
    if (this.isActivelyDrawing) {
      this.onWrapperMouseUp();
    }
    this.isMovingAnnotation = false;
    this.isResizingHandle = false;
    this.activeHandle = null;
  }

  // --- Handle resize mouse down ---
  public onHandleMouseDown(event: MouseEvent, handle: ResizeHandle): void {
    event.stopPropagation();
    event.preventDefault();
    const coords = this.getCanvasPercentCoords(event);
    if (!coords) return;

    const ann = this.state.selectedAnnotation();
    if (!ann) return;

    this.isResizingHandle = true;
    this.activeHandle = handle;
    this.moveStartMouseX = coords.pctX;
    this.moveStartMouseY = coords.pctY;
    this.initialAnnX = ann.x;
    this.initialAnnY = ann.y;
    this.initialAnnW = ann.width;
    this.initialAnnH = ann.height;
  }

  // --- Annotation box drag move ---
  public onAnnotationBoxMouseDown(event: MouseEvent, ann: Annotation): void {
    event.stopPropagation();
    event.preventDefault();
    const coords = this.getCanvasPercentCoords(event);
    if (!coords) return;

    this.isMovingAnnotation = true;
    this.moveStartMouseX = coords.pctX;
    this.moveStartMouseY = coords.pctY;
    this.initialAnnX = ann.x;
    this.initialAnnY = ann.y;
    this.initialAnnW = ann.width;
    this.initialAnnH = ann.height;
  }

  // --- Change annotation animation ---
  public onAnnotationAnimationChange(event: Event, annId: string): void {
    const sel = event.target as HTMLSelectElement;
    this.state.updateAnnotation(annId, {
      animationType: sel.value as HighlightAnimationType,
    });
    this.state.showToast(`Animation set to: ${sel.options[sel.selectedIndex].text}`);
  }

  // --- Drag and drop support ---
  public onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver.set(true);
  }

  public onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver.set(false);
  }

  public onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        this.state.loadUserVideo(file);
      }
    }
  }
}
