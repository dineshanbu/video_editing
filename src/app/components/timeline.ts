import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EditorStateService } from '../services/editor-state.service';
import { formatTimecode } from '../core/timeline-math';

@Component({
  selector: 'app-timeline',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'onWindowKeyDown($event)',
  },
  template: `
    <footer class="h-64 bg-[#0a0d16] border-t border-slate-800/80 flex flex-col shrink-0 select-none overflow-hidden">
      <!-- 1. Timeline Header Strip -->
      <div class="h-10 bg-[#0d111c] border-b border-slate-800/80 px-4 flex items-center justify-between text-xs font-medium">
        <!-- Left: Playhead controls & split tool -->
        <div class="flex items-center gap-2">
          <!-- Play / Pause -->
          <button
            type="button"
            (click)="state.togglePlay()"
            class="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition-colors"
            [title]="state.isPlaying() ? 'Pause (Space)' : 'Play (Space)'"
          >
            <mat-icon class="text-lg! leading-none!">
              {{ state.isPlaying() ? 'pause' : 'play_arrow' }}
            </mat-icon>
          </button>

          <!-- Step Back & Forward -->
          <button
            type="button"
            (click)="state.stepFrame(-1)"
            class="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Step back 1 frame (Left Arrow)"
          >
            <mat-icon class="text-sm! leading-none!">navigate_before</mat-icon>
          </button>
          <button
            type="button"
            (click)="state.stepFrame(1)"
            class="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Step forward 1 frame (Right Arrow)"
          >
            <mat-icon class="text-sm! leading-none!">navigate_next</mat-icon>
          </button>

          <div class="h-3.5 w-px bg-slate-800 mx-1"></div>

          <!-- Timecode Readout -->
          <span class="font-mono tabular-nums text-indigo-400 font-semibold">
            {{ formattedCurrentTime }}
          </span>
          <span class="text-slate-600">/</span>
          <span class="font-mono tabular-nums text-slate-400">
            {{ formattedTotalDuration }}
          </span>

          <div class="h-3.5 w-px bg-slate-800 mx-1"></div>

          <!-- Split Clip Action -->
          <button
            type="button"
            (click)="state.splitClipAtPlayhead()"
            class="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors text-[11px]"
            title="Split clip at playhead (S)"
          >
            <mat-icon class="text-xs! leading-none!">content_cut</mat-icon>
            <span>Split (S)</span>
          </button>

          <!-- Add Keyframe shortcut -->
          <button
            type="button"
            (click)="state.toggleKeyframeAtPlayhead('zoom', state.project().transform.zoom)"
            class="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-800/40 transition-colors text-[11px]"
            title="Add zoom keyframe at playhead"
          >
            <mat-icon class="text-xs! leading-none!">diamond</mat-icon>
            <span>+ Keyframe</span>
          </button>
        </div>

        <!-- Right: Zoom & Timeline Tools -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1 text-slate-400 text-[11px]">
            <span>Timeline Zoom</span>
            <button
              type="button"
              (click)="zoomTimeline(-0.2)"
              class="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-800 text-slate-300"
            >-</button>
            <span class="font-mono tabular-nums text-[10px] w-8 text-center">{{ (state.timelineZoom() * 100).toFixed(0) }}%</span>
            <button
              type="button"
              (click)="zoomTimeline(0.2)"
              class="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-800 text-slate-300"
            >+</button>
          </div>
        </div>
      </div>

      <!-- 2. Multitrack Workspace Scroll Container -->
      <div
        #timelineScrollArea
        class="flex-1 flex overflow-x-auto overflow-y-hidden relative bg-[#090d16]"
      >
        <!-- Left: Fixed Track Headers -->
        <div class="w-36 bg-[#0c101a] border-r border-slate-800/90 shrink-0 z-20 flex flex-col text-xs font-medium">
          <!-- Ruler Corner Spacer -->
          <div class="h-6 border-b border-slate-800/90 px-3 flex items-center text-[10px] text-slate-500 uppercase tracking-wider">
            TRACKS
          </div>

          <!-- Track 1: Video -->
          <div class="h-11 px-3 border-b border-slate-800/60 flex items-center justify-between text-slate-300">
            <div class="flex items-center gap-1.5">
              <mat-icon class="text-sm! leading-none! text-indigo-400">videocam</mat-icon>
              <span class="truncate">Video 1</span>
            </div>
            <mat-icon class="text-xs! text-slate-600">lock_open</mat-icon>
          </div>

          <!-- Track 2: Keyframes -->
          <div class="h-9 px-3 border-b border-slate-800/60 flex items-center justify-between text-slate-300">
            <div class="flex items-center gap-1.5">
              <mat-icon class="text-sm! leading-none! text-amber-400">diamond</mat-icon>
              <span class="truncate">Keyframes</span>
            </div>
            <span class="text-[10px] font-mono text-slate-500">{{ state.project().keyframes.length }}</span>
          </div>

          <!-- Track 3: Annotations -->
          <div class="h-10 px-3 border-b border-slate-800/60 flex items-center justify-between text-slate-300">
            <div class="flex items-center gap-1.5">
              <mat-icon class="text-sm! leading-none! text-emerald-400">draw</mat-icon>
              <span class="truncate">Highlights</span>
            </div>
            <div class="flex items-center gap-1">
              <button
                type="button"
                (click)="state.splitAnnotationAtPlayhead()"
                class="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-300 transition-colors"
                title="Split highlight at playhead (S)"
              >
                <mat-icon class="text-xs! leading-none!">content_cut</mat-icon>
              </button>
              <span class="text-[10px] font-mono text-slate-500">{{ state.project().annotations.length }}</span>
            </div>
          </div>

          <!-- Track 4: Audio -->
          <div class="h-9 px-3 border-b border-slate-800/60 flex items-center justify-between text-slate-300">
            <div class="flex items-center gap-1.5">
              <mat-icon class="text-sm! leading-none! text-sky-400">volume_up</mat-icon>
              <span class="truncate">Audio</span>
            </div>
            <mat-icon class="text-xs! text-slate-600">music_note</mat-icon>
          </div>
        </div>

        <!-- Right: Tracks & Playhead Surface -->
        <div
          #tracksSurface
          class="flex-1 min-w-[900px] relative h-full cursor-pointer overflow-hidden"
          [style.width.px]="timelineContentWidth"
          (mousedown)="onTracksMouseDown($event)"
        >
          <!-- Timeline Ruler -->
          <div class="h-6 border-b border-slate-800/90 relative bg-[#0a0e19]">
            @for (second of rulerSeconds; track second) {
              <div
                class="absolute top-0 bottom-0 border-l border-slate-800 flex items-start pl-1 pt-0.5 text-[9px] font-mono text-slate-500 pointer-events-none"
                [style.left.%]="(second / state.project().duration) * 100"
              >
                {{ formatRulerTime(second) }}
              </div>
            }
          </div>

          <!-- Track 1 Area: Video Clip -->
          <div class="h-11 border-b border-slate-800/60 relative p-1">
            <div class="w-full h-full rounded-md bg-gradient-to-r from-indigo-900/60 via-indigo-950/80 to-indigo-900/60 border border-indigo-700/50 flex items-center justify-between px-3 relative overflow-hidden">
              <div class="flex items-center gap-2">
                <mat-icon class="text-xs! text-indigo-400">movie</mat-icon>
                <span class="text-xs font-semibold text-slate-200">
                  {{ state.uploadedVideoName() || state.activeSample()?.name || 'Screen Recording' }}
                </span>
              </div>
              <span class="font-mono text-[10px] text-slate-400">15.0s</span>
            </div>
          </div>

          <!-- Track 2 Area: Keyframe Diamonds -->
          <div class="h-10 border-b border-slate-800/60 relative">
            @for (kf of state.project().keyframes; track kf.id) {
              <button
                type="button"
                (click)="onKeyframeClick($event, kf.id)"
                class="absolute -translate-x-1/2 w-4 h-4 flex items-center justify-center cursor-pointer group z-10 bg-transparent border-0 p-0"
                [style.left.%]="(kf.time / state.project().duration) * 100"
                [style.top.px]="getKeyframeTopOffset(kf.property)"
                [title]="kf.property + ': ' + kf.value + ' (' + kf.time + 's)'"
              >
                <div
                  class="w-2.5 h-2.5 rotate-45 border transition-transform group-hover:scale-130 shadow-sm"
                  [class.bg-amber-400]="kf.property === 'zoom'"
                  [class.border-amber-300]="kf.property === 'zoom'"
                  [class.bg-emerald-400]="kf.property === 'focusX' || kf.property === 'focusY'"
                  [class.border-emerald-300]="kf.property === 'focusX' || kf.property === 'focusY'"
                  [class.bg-sky-400]="kf.property === 'panX' || kf.property === 'panY'"
                  [class.border-sky-300]="kf.property === 'panX' || kf.property === 'panY'"
                  [class.bg-rose-400]="kf.property === 'rotateX' || kf.property === 'rotateY'"
                  [class.border-rose-300]="kf.property === 'rotateX' || kf.property === 'rotateY'"
                  [class.ring-2]="state.selectedKeyframeId() === kf.id"
                  [class.ring-white]="state.selectedKeyframeId() === kf.id"
                ></div>
              </button>
            }
          </div>

          <!-- Track 3 Area: Annotations Spans -->
          <div class="h-10 border-b border-slate-800/60 relative p-1">
            @for (ann of state.project().annotations; track ann.id) {
              <button
                type="button"
                (click)="onAnnotationClick($event, ann.id)"
                class="absolute h-8 top-1 rounded-md border flex items-center px-2 cursor-pointer transition-all shadow-sm z-10 truncate text-left"
                [style.left.%]="(ann.startTime / state.project().duration) * 100"
                [style.width.%]="((ann.endTime - ann.startTime) / state.project().duration) * 100"
                [style.borderColor]="ann.strokeColor"
                [class.bg-slate-900]="state.selectedAnnotationId() !== ann.id"
                [class.bg-indigo-950]="state.selectedAnnotationId() === ann.id"
                [class.ring-2]="state.selectedAnnotationId() === ann.id"
                [class.ring-indigo-400]="state.selectedAnnotationId() === ann.id"
              >
                <div
                  class="w-2 h-2 rounded-full mr-1.5 shrink-0"
                  [style.backgroundColor]="ann.strokeColor"
                ></div>
                <span class="text-[11px] font-medium text-slate-200 truncate">{{ ann.name }}</span>
              </button>
            }
          </div>

          <!-- Track 4 Area: Audio Waveform Simulation -->
          <div class="h-9 border-b border-slate-800/60 relative p-1">
            <div class="w-full h-full rounded bg-slate-950 border border-slate-800/80 flex items-center px-2 overflow-hidden gap-1">
              @for (bar of audioBars; track $index) {
                <div
                  class="w-1 bg-sky-500/40 rounded-full"
                  [style.height.%]="bar"
                ></div>
              }
            </div>
          </div>

          <!-- Draggable Playhead Needle -->
          <div
            class="absolute top-0 bottom-0 -ml-2 w-4 pointer-events-none z-30 flex flex-col items-center"
            [style.left.%]="(state.currentTime() / state.project().duration) * 100"
          >
            <!-- Needle Head Handle -->
            <div class="w-3 h-3 bg-rose-500 rotate-45 rounded-xs shadow-md"></div>
            <!-- Needle Stem -->
            <div class="w-0.5 flex-1 bg-rose-500 shadow-sm"></div>
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class TimelineComponent {
  public state = inject(EditorStateService);

  @ViewChild('tracksSurface')
  public tracksSurfaceRef!: ElementRef<HTMLDivElement>;

  public audioBars = Array.from({ length: 120 }, () => Math.floor(Math.random() * 60 + 20));

  public get timelineContentWidth(): number {
    return Math.max(900, 900 * this.state.timelineZoom());
  }

  public get rulerSeconds(): number[] {
    const dur = Math.ceil(this.state.project().duration);
    const step = this.state.timelineZoom() > 1.5 ? 1 : 2;
    const arr: number[] = [];
    for (let s = 0; s <= dur; s += step) {
      arr.push(s);
    }
    return arr;
  }

  public formatRulerTime(s: number): string {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  public get formattedCurrentTime(): string {
    return formatTimecode(this.state.currentTime(), this.state.project().fps);
  }

  public get formattedTotalDuration(): string {
    return formatTimecode(this.state.project().duration, this.state.project().fps);
  }

  public getKeyframeTopOffset(property: string): number {
    if (property === 'zoom') return 6;
    if (property === 'focusX' || property === 'focusY') return 16;
    if (property === 'panX' || property === 'panY') return 24;
    return 30;
  }

  public zoomTimeline(delta: number): void {
    this.state.setTimelineZoom(this.state.timelineZoom() + delta);
  }

  public onTracksMouseDown(event: MouseEvent): void {
    const el = this.tracksSurfaceRef.nativeElement;
    const rect = el.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    this.state.seek(pct * this.state.project().duration);
  }

  public onKeyframeClick(event: MouseEvent, kfId: string): void {
    event.stopPropagation();
    this.state.selectedKeyframeId.set(kfId);
  }

  public onAnnotationClick(event: MouseEvent, annId: string): void {
    event.stopPropagation();
    this.state.selectAnnotation(annId);
  }

  public onWindowKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    if (event.key === 's' || event.key === 'S') {
      event.preventDefault();
      this.state.splitClipAtPlayhead();
    } else if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      this.state.togglePlay();
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      const selectedAnnId = this.state.selectedAnnotationId();
      if (selectedAnnId) {
        event.preventDefault();
        this.state.deleteAnnotation(selectedAnnId);
      } else {
        const selectedKfId = this.state.selectedKeyframeId();
        if (selectedKfId) {
          event.preventDefault();
          this.state.deleteKeyframe(selectedKfId);
        }
      }
    }
  }
}
