import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EditorStateService } from '../services/editor-state.service';
import { AspectRatio } from '../core/models';
import { formatTimecode } from '../core/timeline-math';

@Component({
  selector: 'app-top-toolbar',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="h-14 bg-[#0d111c] border-b border-slate-800/80 px-5 flex items-center justify-between gap-3 select-none shrink-0 z-20">
      <!-- Zone 1: Brand & Project Name -->
      <div class="flex items-center gap-3 shrink-0">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <mat-icon class="text-white text-lg! leading-none!">movie_filter</mat-icon>
          </div>
          <span class="font-bold text-base tracking-tight text-white whitespace-nowrap">StudioMotion</span>
        </div>

        <div class="h-4 w-px bg-slate-800 mx-1"></div>

        <!-- Sample Footage Selector -->
        <div class="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
          <button
            type="button"
            (click)="state.selectSampleRecording('saas-dashboard')"
            class="px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap"
            [class.bg-indigo-600]="state.activeSampleId() === 'saas-dashboard'"
            [class.text-white]="state.activeSampleId() === 'saas-dashboard'"
            [class.text-slate-400]="state.activeSampleId() !== 'saas-dashboard'"
            [class.hover:text-slate-200]="state.activeSampleId() !== 'saas-dashboard'"
          >
            SaaS App
          </button>
          <button
            type="button"
            (click)="state.selectSampleRecording('code-ide')"
            class="px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap"
            [class.bg-indigo-600]="state.activeSampleId() === 'code-ide'"
            [class.text-white]="state.activeSampleId() === 'code-ide'"
            [class.text-slate-400]="state.activeSampleId() !== 'code-ide'"
            [class.hover:text-slate-200]="state.activeSampleId() !== 'code-ide'"
          >
            Code IDE
          </button>
          <button
            type="button"
            (click)="state.selectSampleRecording('mobile-app')"
            class="px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap"
            [class.bg-indigo-600]="state.activeSampleId() === 'mobile-app'"
            [class.text-white]="state.activeSampleId() === 'mobile-app'"
            [class.text-slate-400]="state.activeSampleId() !== 'mobile-app'"
            [class.hover:text-slate-200]="state.activeSampleId() !== 'mobile-app'"
          >
            Mobile App
          </button>
        </div>
      </div>

      <!-- Zone 2: Navigation / Controls -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- Import Video File -->
        <label
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 cursor-pointer transition-colors whitespace-nowrap"
          title="Import MP4/WebM video recording"
        >
          <mat-icon class="text-sm! leading-none!">file_upload</mat-icon>
          <span>Import Video</span>
          <input
            type="file"
            accept="video/*"
            class="hidden"
            (change)="onFileInput($event)"
          />
        </label>

        <!-- Record Screen -->
        <button
          type="button"
          (click)="state.startScreenCapture()"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 transition-colors whitespace-nowrap"
          [class.ring-2]="state.isRecordingScreen()"
          [class.ring-rose-500]="state.isRecordingScreen()"
          title="Capture your screen live"
        >
          <mat-icon class="text-sm! text-rose-400 leading-none!">screen_record</mat-icon>
          <span>Capture Screen</span>
        </button>

        <div class="h-4 w-px bg-slate-800 mx-1"></div>

        <!-- Aspect Ratio Controls -->
        <div class="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          @for (ratio of aspectRatios; track ratio.id) {
            <button
              type="button"
              (click)="state.setAspectRatio(ratio.id)"
              class="px-2 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap"
              [class.bg-slate-800]="state.project().aspectRatio === ratio.id"
              [class.text-white]="state.project().aspectRatio === ratio.id"
              [class.text-slate-400]="state.project().aspectRatio !== ratio.id"
              [title]="ratio.name"
            >
              {{ ratio.label }}
            </button>
          }
        </div>

        <div class="h-4 w-px bg-slate-800 mx-1"></div>

        <!-- Undo & Redo -->
        <button
          type="button"
          (click)="state.undo()"
          class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <mat-icon class="text-base! leading-none!">undo</mat-icon>
        </button>
        <button
          type="button"
          (click)="state.redo()"
          class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          <mat-icon class="text-base! leading-none!">redo</mat-icon>
        </button>
      </div>

      <!-- Zone 3: Timecode & Primary CTA (Export) -->
      <div class="flex items-center gap-3 shrink-0">
        <!-- Live Timecode Display -->
        <div class="flex items-center gap-2 font-mono tabular-nums text-xs px-2.5 py-1 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-300">
          <span class="text-indigo-400 font-semibold">{{ formattedCurrentTime }}</span>
          <span class="text-slate-600">/</span>
          <span class="text-slate-400">{{ formattedTotalDuration }}</span>
        </div>

        <!-- Export Video Button -->
        <button
          type="button"
          (click)="state.isExportDialogOpen.set(true)"
          class="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white shadow-md shadow-indigo-600/25 transition-all whitespace-nowrap"
        >
          <mat-icon class="text-sm! leading-none!">ios_share</mat-icon>
          <span>Export Video</span>
        </button>
      </div>
    </header>
  `,
})
export class TopToolbarComponent {
  public state = inject(EditorStateService);

  public aspectRatios: { id: AspectRatio; label: string; name: string }[] = [
    { id: '16:9', label: '16:9', name: '16:9 Landscape' },
    { id: '9:16', label: '9:16', name: '9:16 Story / Shorts' },
    { id: '1:1', label: '1:1', name: '1:1 Square' },
    { id: '4:5', label: '4:5', name: '4:5 Feed Portrait' },
  ];

  public get formattedCurrentTime(): string {
    return formatTimecode(this.state.currentTime(), this.state.project().fps);
  }

  public get formattedTotalDuration(): string {
    return formatTimecode(this.state.project().duration, this.state.project().fps);
  }

  public onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.state.loadUserVideo(input.files[0]);
      input.value = '';
    }
  }
}
