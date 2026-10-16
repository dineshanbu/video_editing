import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EditorStateService } from '../services/editor-state.service';
import { Resolution } from '../core/models';
import { VideoExportEngine } from '../core/export-engine';

@Component({
  selector: 'app-export-dialog',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state.isExportDialogOpen()) {
      <div class="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-[#0f1422] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                <mat-icon class="text-base! leading-none!">ios_share</mat-icon>
              </div>
              <div>
                <h2 class="text-sm font-bold text-white">Export Video</h2>
                <p class="text-[11px] text-slate-400">Frame-by-frame rendering with accurate keyframes</p>
              </div>
            </div>
            @if (exportEngineProgress().status !== 'rendering') {
              <button
                type="button"
                (click)="closeDialog()"
                class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <mat-icon class="text-base! leading-none!">close</mat-icon>
              </button>
            }
          </div>

          <!-- Body -->
          <div class="p-6 space-y-5 text-xs text-slate-300">
            @if (exportEngineProgress().status === 'idle') {
              <!-- Resolution Cards -->
              <div>
                <span class="font-medium text-slate-200 block mb-2">Target Resolution</span>
                <div class="grid grid-cols-2 gap-2">
                  @for (res of resolutions; track res.id) {
                    <button
                      type="button"
                      (click)="selectedResolution.set(res.id)"
                      class="flex flex-col items-start p-3 rounded-xl border text-left transition-all"
                      [class.border-indigo-500]="selectedResolution() === res.id"
                      [class.bg-indigo-950/30]="selectedResolution() === res.id"
                      [class.border-slate-800]="selectedResolution() !== res.id"
                      [class.bg-slate-900/60]="selectedResolution() !== res.id"
                    >
                      <div class="flex items-center justify-between w-full">
                        <span class="font-bold text-slate-200">{{ res.label }}</span>
                        @if (res.recommended) {
                          <span class="text-[9px] font-semibold text-indigo-400 uppercase tracking-wide">Standard</span>
                        }
                      </div>
                      <span class="text-[10px] text-slate-400 mt-0.5">{{ res.dims }}</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Framerate -->
              <div>
                <span class="font-medium text-slate-200 block mb-2">Framerate</span>
                <div class="grid grid-cols-3 gap-2">
                  @for (fps of [30, 60, 24]; track fps) {
                    <button
                      type="button"
                      (click)="selectedFps.set($any(fps))"
                      class="py-2 rounded-lg border text-center font-medium transition-all"
                      [class.border-indigo-500]="selectedFps() === fps"
                      [class.bg-indigo-950/30]="selectedFps() === fps"
                      [class.text-white]="selectedFps() === fps"
                      [class.border-slate-800]="selectedFps() !== fps"
                      [class.bg-slate-900/60]="selectedFps() !== fps"
                      [class.text-slate-400]="selectedFps() !== fps"
                    >
                      {{ fps }} FPS
                    </button>
                  }
                </div>
              </div>

              <!-- Summary Card -->
              <div class="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1.5 text-[11px]">
                <div class="flex items-center justify-between text-slate-400">
                  <span>Aspect Ratio</span>
                  <span class="text-slate-200 font-medium">{{ state.project().aspectRatio }}</span>
                </div>
                <div class="flex items-center justify-between text-slate-400">
                  <span>Composition Duration</span>
                  <span class="text-slate-200 font-medium">{{ state.project().duration }} seconds</span>
                </div>
                <div class="flex items-center justify-between text-slate-400">
                  <span>Estimated Output Frames</span>
                  <span class="text-slate-200 font-medium font-mono">
                    {{ state.project().duration * selectedFps() }} frames
                  </span>
                </div>
                <div class="flex items-center justify-between text-slate-400">
                  <span>Encoding Codec</span>
                  <span class="text-slate-200 font-medium">VP9 / High Profile</span>
                </div>
              </div>
            } @else if (exportEngineProgress().status === 'rendering' || exportEngineProgress().status === 'encoding') {
              <!-- In-Progress Render Progress -->
              <div class="py-6 flex flex-col items-center text-center space-y-4">
                <div class="w-14 h-14 rounded-full bg-indigo-950/60 border border-indigo-500/50 flex items-center justify-center animate-pulse">
                  <mat-icon class="text-indigo-400 text-2xl!">hourglass_top</mat-icon>
                </div>

                <div>
                  <h3 class="text-sm font-bold text-white mb-1">
                    {{ exportEngineProgress().status === 'rendering' ? 'Rendering Video Frames' : 'Finalizing Video Package' }}
                  </h3>
                  <p class="text-xs text-slate-400">
                    Frame {{ exportEngineProgress().currentFrame }} of {{ exportEngineProgress().totalFrames }}
                    ({{ exportEngineProgress().progress }}%)
                  </p>
                </div>

                <!-- Progress Bar -->
                <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    class="bg-indigo-500 h-full rounded-full transition-all duration-150"
                    [style.width.%]="exportEngineProgress().progress"
                  ></div>
                </div>

                <span class="text-[11px] text-slate-500 font-mono">
                  {{ exportEngineProgress().estimatedTimeRemaining }}
                </span>
              </div>
            } @else if (exportEngineProgress().status === 'completed') {
              <!-- Completed State -->
              <div class="py-6 flex flex-col items-center text-center space-y-4">
                <div class="w-14 h-14 rounded-full bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                  <mat-icon class="text-2xl!">check_circle</mat-icon>
                </div>

                <div>
                  <h3 class="text-sm font-bold text-white mb-1">Rendering Finished Successfully!</h3>
                  <p class="text-xs text-slate-400">
                    Your desktop recording with device mockup and keyframe animations is ready.
                  </p>
                  @if (exportEngineProgress().fileSizeBytes) {
                    <span class="text-[11px] text-slate-500 font-mono mt-1 block">
                      Size: {{ (exportEngineProgress().fileSizeBytes! / (1024 * 1024)).toFixed(1) }} MB
                    </span>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Footer Buttons -->
          <div class="px-6 py-4 bg-[#0a0d16] border-t border-slate-800/80 flex items-center justify-end gap-3">
            @if (exportEngineProgress().status === 'idle') {
              <button
                type="button"
                (click)="closeDialog()"
                class="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="startExport()"
                class="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5"
              >
                <mat-icon class="text-sm! leading-none!">play_circle</mat-icon>
                <span>Start Render</span>
              </button>
            } @else if (exportEngineProgress().status === 'rendering') {
              <button
                type="button"
                (click)="cancelExport()"
                class="px-4 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors"
              >
                Cancel Render
              </button>
            } @else if (exportEngineProgress().status === 'completed') {
              <button
                type="button"
                (click)="closeDialog()"
                class="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <a
                [href]="exportEngineProgress().outputBlobUrl"
                download="studiomotion_export.webm"
                class="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5"
              >
                <mat-icon class="text-sm! leading-none!">download</mat-icon>
                <span>Download Video</span>
              </a>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class ExportDialogComponent {
  public state = inject(EditorStateService);
  private exportEngine = new VideoExportEngine();

  public selectedResolution = signal<Resolution>('1080p');
  public selectedFps = signal<24 | 30 | 60>(30);

  public exportEngineProgress = signal(this.state.exportProgress());

  public resolutions = [
    { id: '1080p' as Resolution, label: '1080p Full HD', dims: '1920 × 1080', recommended: true },
    { id: '4K' as Resolution, label: '4K Ultra HD', dims: '3840 × 2160', recommended: false },
    { id: '1440p' as Resolution, label: '1440p QHD', dims: '2560 × 1440', recommended: false },
    { id: '720p' as Resolution, label: '720p HD', dims: '1280 × 720', recommended: false },
  ];

  public closeDialog(): void {
    this.exportEngine.cancel();
    this.exportEngineProgress.set({
      status: 'idle',
      progress: 0,
      currentFrame: 0,
      totalFrames: 0,
      estimatedTimeRemaining: '',
    });
    this.state.isExportDialogOpen.set(false);
  }

  public async startExport(): Promise<void> {
    const res = this.selectedResolution();
    const fps = this.selectedFps();
    const project = this.state.project();

    const videoEl = this.state.uploadedVideoUrl()
      ? (document.querySelector('video') as HTMLVideoElement | null)
      : null;

    try {
      await this.exportEngine.exportVideo(
        project,
        res,
        fps,
        videoEl,
        this.state.activeSample(),
        (prog) => {
          this.exportEngineProgress.set(prog);
        }
      );
    } catch {
      this.exportEngineProgress.set({
        status: 'idle',
        progress: 0,
        currentFrame: 0,
        totalFrames: 0,
        estimatedTimeRemaining: '',
      });
    }
  }

  public cancelExport(): void {
    this.exportEngine.cancel();
    this.closeDialog();
  }
}
