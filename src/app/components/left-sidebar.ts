import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EditorStateService } from '../services/editor-state.service';
import { DEVICE_PRESETS } from '../core/device-presets';
import { BACKGROUND_PRESETS, BackgroundPresetItem } from '../core/background-presets';

@Component({
  selector: 'app-left-sidebar',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="w-80 bg-[#0d111c] border-r border-slate-800/80 flex flex-col shrink-0 select-none overflow-hidden h-full">
      <!-- Nav Tabs -->
      <div class="flex items-center gap-1 p-2 bg-[#090d16] border-b border-slate-800/80 overflow-x-auto text-xs font-medium">
        <button
          type="button"
          (click)="state.activeSidebarTab.set('devices')"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap"
          [class.bg-slate-800]="state.activeSidebarTab() === 'devices'"
          [class.text-white]="state.activeSidebarTab() === 'devices'"
          [class.text-slate-400]="state.activeSidebarTab() !== 'devices'"
        >
          <mat-icon class="text-sm! leading-none!">devices</mat-icon>
          <span>Devices</span>
        </button>

        <button
          type="button"
          (click)="state.activeSidebarTab.set('browser')"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap"
          [class.bg-slate-800]="state.activeSidebarTab() === 'browser'"
          [class.text-white]="state.activeSidebarTab() === 'browser'"
          [class.text-slate-400]="state.activeSidebarTab() !== 'browser'"
        >
          <mat-icon class="text-sm! leading-none!">web</mat-icon>
          <span>Browser</span>
        </button>

        <button
          type="button"
          (click)="state.activeSidebarTab.set('backgrounds')"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap"
          [class.bg-slate-800]="state.activeSidebarTab() === 'backgrounds'"
          [class.text-white]="state.activeSidebarTab() === 'backgrounds'"
          [class.text-slate-400]="state.activeSidebarTab() !== 'backgrounds'"
        >
          <mat-icon class="text-sm! leading-none!">palette</mat-icon>
          <span>Backdrops</span>
        </button>

        <button
          type="button"
          (click)="state.activeSidebarTab.set('annotations')"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap"
          [class.bg-slate-800]="state.activeSidebarTab() === 'annotations'"
          [class.text-white]="state.activeSidebarTab() === 'annotations'"
          [class.text-slate-400]="state.activeSidebarTab() !== 'annotations'"
        >
          <mat-icon class="text-sm! leading-none!">draw</mat-icon>
          <span>Highlight</span>
        </button>

        <button
          type="button"
          (click)="state.activeSidebarTab.set('presets')"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap"
          [class.bg-slate-800]="state.activeSidebarTab() === 'presets'"
          [class.text-white]="state.activeSidebarTab() === 'presets'"
          [class.text-slate-400]="state.activeSidebarTab() !== 'presets'"
        >
          <mat-icon class="text-sm! leading-none!">auto_awesome</mat-icon>
          <span>Motion</span>
        </button>
      </div>

      <!-- Scrollable Tab Content -->
      <div class="flex-1 overflow-y-auto p-3 space-y-4">
        <!-- 1. DEVICES TAB -->
        @if (state.activeSidebarTab() === 'devices') {
          <div>
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">Realistic Device Mockups</h3>
            <div class="grid grid-cols-2 gap-2">
              @for (item of devicePresets; track item.id) {
                <button
                  type="button"
                  (click)="state.selectDevice(item.id)"
                  class="flex flex-col items-start p-2.5 rounded-xl border text-left transition-all group"
                  [class.border-indigo-500]="state.project().device.type === item.id"
                  [class.bg-indigo-950/30]="state.project().device.type === item.id"
                  [class.border-slate-800]="state.project().device.type !== item.id"
                  [class.bg-[#121624]]="state.project().device.type !== item.id"
                  [class.hover:border-slate-700]="state.project().device.type !== item.id"
                >
                  <!-- Device Mockup Miniature Preview -->
                  <div class="w-full h-16 rounded-lg bg-slate-900/90 border border-slate-800/80 mb-2 flex items-center justify-center overflow-hidden relative group-hover:scale-102 transition-transform">
                    @if (item.category === 'laptop') {
                      <div class="w-14 h-9 bg-slate-800 rounded-sm border border-slate-700 relative shadow-sm flex items-center justify-center">
                        <div class="w-11 h-7 bg-slate-950 rounded-xs flex items-center justify-center">
                          <div class="w-1.5 h-0.5 bg-slate-800 rounded-full"></div>
                        </div>
                        <div class="absolute -bottom-1 w-16 h-1 bg-slate-700 rounded-xs"></div>
                      </div>
                    } @else if (item.category === 'mobile') {
                      <div class="w-7 h-12 bg-slate-800 rounded-lg border border-slate-700 relative shadow-sm flex flex-col items-center justify-start pt-1">
                        <div class="w-2.5 h-1 bg-slate-950 rounded-full mb-0.5"></div>
                        <div class="w-5 h-9 bg-slate-950 rounded-md"></div>
                      </div>
                    } @else if (item.category === 'tablet') {
                      <div class="w-12 h-9 bg-slate-800 rounded-md border border-slate-700 relative shadow-sm flex items-center justify-center">
                        <div class="w-10 h-7 bg-slate-950 rounded-xs"></div>
                      </div>
                    } @else if (item.category === 'desktop') {
                      <div class="flex flex-col items-center">
                        <div class="w-14 h-9 bg-slate-800 rounded-xs border border-slate-700 flex items-center justify-center">
                          <div class="w-12 h-7 bg-slate-950 rounded-xs"></div>
                        </div>
                        <div class="w-2 h-2 bg-slate-700"></div>
                        <div class="w-6 h-0.5 bg-slate-600 rounded-xs"></div>
                      </div>
                    } @else {
                      <div class="w-12 h-8 rounded-md bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-center">
                        <mat-icon class="text-indigo-400 text-sm!">aspect_ratio</mat-icon>
                      </div>
                    }
                  </div>

                  <span class="text-xs font-semibold text-slate-200 leading-tight">{{ item.name }}</span>
                  <span class="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{{ item.description }}</span>
                </button>
              }
            </div>

            <!-- Finishes / Colors -->
            <div class="mt-4 pt-3 border-t border-slate-800/80">
              <span class="text-[11px] font-semibold text-slate-300 block mb-2">Chassis Finish & Color</span>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  (click)="state.updateDeviceSettings({ finish: 'space-black' })"
                  class="w-6 h-6 rounded-full bg-[#18181b] border-2 transition-all"
                  [class.border-indigo-500]="state.project().device.finish === 'space-black'"
                  [class.border-transparent]="state.project().device.finish !== 'space-black'"
                  title="Space Black"
                ></button>
                <button
                  type="button"
                  (click)="state.updateDeviceSettings({ finish: 'titanium-natural' })"
                  class="w-6 h-6 rounded-full bg-[#78716c] border-2 transition-all"
                  [class.border-indigo-500]="state.project().device.finish === 'titanium-natural'"
                  [class.border-transparent]="state.project().device.finish !== 'titanium-natural'"
                  title="Natural Titanium"
                ></button>
                <button
                  type="button"
                  (click)="state.updateDeviceSettings({ finish: 'silver' })"
                  class="w-6 h-6 rounded-full bg-[#e4e4e7] border-2 transition-all"
                  [class.border-indigo-500]="state.project().device.finish === 'silver'"
                  [class.border-transparent]="state.project().device.finish !== 'silver'"
                  title="Silver"
                ></button>
                <button
                  type="button"
                  (click)="state.updateDeviceSettings({ finish: 'midnight' })"
                  class="w-6 h-6 rounded-full bg-[#1e293b] border-2 transition-all"
                  [class.border-indigo-500]="state.project().device.finish === 'midnight'"
                  [class.border-transparent]="state.project().device.finish !== 'midnight'"
                  title="Midnight Blue"
                ></button>
                <button
                  type="button"
                  (click)="state.updateDeviceSettings({ finish: 'deep-blue' })"
                  class="w-6 h-6 rounded-full bg-[#1e3a5f] border-2 transition-all"
                  [class.border-indigo-500]="state.project().device.finish === 'deep-blue'"
                  [class.border-transparent]="state.project().device.finish !== 'deep-blue'"
                  title="Deep Blue"
                ></button>
              </div>
            </div>
          </div>
        }

        <!-- 2. BROWSER TAB -->
        @if (state.activeSidebarTab() === 'browser') {
          <div class="space-y-4">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">Browser Simulation</h3>
            
            <div class="grid grid-cols-1 gap-2">
              <button
                type="button"
                (click)="state.selectDevice('chrome-browser')"
                class="flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all"
                [class.border-indigo-500]="state.project().device.type === 'chrome-browser'"
                [class.bg-indigo-950/30]="state.project().device.type === 'chrome-browser'"
                [class.border-slate-800]="state.project().device.type !== 'chrome-browser'"
                [class.bg-[#121624]]="state.project().device.type !== 'chrome-browser'"
              >
                <div class="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                  <mat-icon class="text-indigo-400 text-lg!">language</mat-icon>
                </div>
                <div>
                  <span class="text-xs font-semibold text-slate-200 block">Google Chrome</span>
                  <span class="text-[10px] text-slate-400">Tabs, traffic lights, and lock address bar</span>
                </div>
              </button>

              <button
                type="button"
                (click)="state.selectDevice('safari-browser')"
                class="flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all"
                [class.border-indigo-500]="state.project().device.type === 'safari-browser'"
                [class.bg-indigo-950/30]="state.project().device.type === 'safari-browser'"
                [class.border-slate-800]="state.project().device.type !== 'safari-browser'"
                [class.bg-[#121624]]="state.project().device.type !== 'safari-browser'"
              >
                <div class="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                  <mat-icon class="text-sky-400 text-lg!">explore</mat-icon>
                </div>
                <div>
                  <span class="text-xs font-semibold text-slate-200 block">macOS Safari</span>
                  <span class="text-[10px] text-slate-400">Unified frosted toolbar and centered pill</span>
                </div>
              </button>

              <button
                type="button"
                (click)="state.selectDevice('minimal-browser')"
                class="flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all"
                [class.border-indigo-500]="state.project().device.type === 'minimal-browser'"
                [class.bg-indigo-950/30]="state.project().device.type === 'minimal-browser'"
                [class.border-slate-800]="state.project().device.type !== 'minimal-browser'"
                [class.bg-[#121624]]="state.project().device.type !== 'minimal-browser'"
              >
                <div class="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                  <mat-icon class="text-emerald-400 text-lg!">crop_landscape</mat-icon>
                </div>
                <div>
                  <span class="text-xs font-semibold text-slate-200 block">Minimal Window</span>
                  <span class="text-[10px] text-slate-400">Distraction-free titlebar with traffic lights</span>
                </div>
              </button>
            </div>

            <!-- Browser Parameters -->
            <div class="space-y-3 pt-3 border-t border-slate-800/80 px-1">
              <div>
                <span class="text-[11px] font-medium text-slate-300 block mb-1">Editable Address URL</span>
                <input
                  type="text"
                  [value]="state.project().device.browserUrl"
                  (input)="onBrowserUrlInput($event)"
                  class="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="https://yourwebsite.com"
                />
              </div>

              <div>
                <span class="text-[11px] font-medium text-slate-300 block mb-1">Window Title</span>
                <input
                  type="text"
                  [value]="state.project().device.browserTitle"
                  (input)="onBrowserTitleInput($event)"
                  class="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="App Title"
                />
              </div>

              <div class="flex items-center justify-between">
                <span class="text-[11px] font-medium text-slate-300">Browser Frame Theme</span>
                <div class="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    (click)="state.updateDeviceSettings({ browserTheme: 'dark' })"
                    class="px-2.5 py-1 text-xs rounded-md"
                    [class.bg-slate-800]="state.project().device.browserTheme === 'dark'"
                    [class.text-white]="state.project().device.browserTheme === 'dark'"
                    [class.text-slate-400]="state.project().device.browserTheme !== 'dark'"
                  >Dark</button>
                  <button
                    type="button"
                    (click)="state.updateDeviceSettings({ browserTheme: 'light' })"
                    class="px-2.5 py-1 text-xs rounded-md"
                    [class.bg-slate-800]="state.project().device.browserTheme === 'light'"
                    [class.text-white]="state.project().device.browserTheme === 'light'"
                    [class.text-slate-400]="state.project().device.browserTheme !== 'light'"
                  >Light</button>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- 3. BACKGROUNDS TAB -->
        @if (state.activeSidebarTab() === 'backgrounds') {
          <div>
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">Studio Backdrops & Gradients</h3>
            <div class="grid grid-cols-2 gap-2">
              @for (preset of backgroundPresets; track preset.id) {
                <button
                  type="button"
                  (click)="state.selectBackgroundPreset(preset.id)"
                  class="flex flex-col items-start p-2 rounded-xl border text-left transition-all"
                  [class.border-indigo-500]="state.project().background.presetId === preset.id"
                  [class.bg-indigo-950/20]="state.project().background.presetId === preset.id"
                  [class.border-slate-800]="state.project().background.presetId !== preset.id"
                  [class.bg-[#121624]]="state.project().background.presetId !== preset.id"
                >
                  <div
                    class="w-full h-14 rounded-lg mb-2 shadow-inner border border-white/10"
                    [style.background]="getPresetPreviewStyle(preset)"
                  ></div>
                  <span class="text-xs font-medium text-slate-200">{{ preset.name }}</span>
                </button>
              }
            </div>
          </div>
        }

        <!-- 4. ANNOTATIONS TAB -->
        @if (state.activeSidebarTab() === 'annotations') {
          <div class="space-y-4">
            <!-- Draw on Canvas Mode CTA Card -->
            <div class="p-3 rounded-xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/60 to-slate-900/80 flex flex-col gap-2 shadow-lg">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <mat-icon class="text-indigo-400 text-base!">gesture</mat-icon>
                  <span class="text-xs font-semibold text-white">Draw on Video Frame</span>
                </div>
                <span class="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">Interactive</span>
              </div>
              <p class="text-[11px] text-slate-300">
                Click & drag with your mouse on the video canvas to draw custom height & width highlights!
              </p>
              <div class="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  (click)="state.setDrawingMode(true, 'rounded-rect')"
                  class="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-all"
                  [class.ring-2]="state.isDrawingMode() && state.drawingToolType() === 'rounded-rect'"
                  [class.ring-sky-400]="state.isDrawingMode() && state.drawingToolType() === 'rounded-rect'"
                >
                  <mat-icon class="text-xs! leading-none!">crop_square</mat-icon>
                  <span>Draw Box</span>
                </button>
                <button
                  type="button"
                  (click)="state.setDrawingMode(true, 'spotlight')"
                  class="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium text-xs border border-indigo-500/30 transition-all"
                  [class.ring-2]="state.isDrawingMode() && state.drawingToolType() === 'spotlight'"
                  [class.ring-indigo-400]="state.isDrawingMode() && state.drawingToolType() === 'spotlight'"
                >
                  <mat-icon class="text-xs! leading-none!">highlight</mat-icon>
                  <span>Draw Spotlight</span>
                </button>
              </div>
            </div>

            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">One-Click Highlight Presets</h3>

            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                (click)="state.addAnnotation('spotlight')"
                class="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-[#121624] hover:border-indigo-500/80 transition-all text-center group"
              >
                <div class="w-10 h-10 rounded-lg bg-indigo-950/50 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <mat-icon class="text-indigo-400 text-lg!">highlight</mat-icon>
                </div>
                <span class="text-xs font-semibold text-slate-200">Spotlight</span>
                <span class="text-[10px] text-slate-400 mt-0.5">Dim surrounding area</span>
              </button>

              <button
                type="button"
                (click)="state.addAnnotation('rounded-rect')"
                class="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-[#121624] hover:border-indigo-500/80 transition-all text-center group"
              >
                <div class="w-10 h-10 rounded-lg bg-indigo-950/50 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <mat-icon class="text-indigo-400 text-lg!">crop_square</mat-icon>
                </div>
                <span class="text-xs font-semibold text-slate-200">Neon Rectangle</span>
                <span class="text-[10px] text-slate-400 mt-0.5">Glowing border frame</span>
              </button>

              <button
                type="button"
                (click)="state.addAnnotation('callout')"
                class="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-[#121624] hover:border-indigo-500/80 transition-all text-center group"
              >
                <div class="w-10 h-10 rounded-lg bg-indigo-950/50 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <mat-icon class="text-indigo-400 text-lg!">chat_bubble_outline</mat-icon>
                </div>
                <span class="text-xs font-semibold text-slate-200">Text Callout</span>
                <span class="text-[10px] text-slate-400 mt-0.5">Floating note pill</span>
              </button>

              <button
                type="button"
                (click)="state.addAnnotation('arrow')"
                class="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-[#121624] hover:border-indigo-500/80 transition-all text-center group"
              >
                <div class="w-10 h-10 rounded-lg bg-indigo-950/50 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <mat-icon class="text-indigo-400 text-lg!">north_east</mat-icon>
                </div>
                <span class="text-xs font-semibold text-slate-200">Pointer Arrow</span>
                <span class="text-[10px] text-slate-400 mt-0.5">Direct focus vector</span>
              </button>

              <button
                type="button"
                (click)="state.addAnnotation('ripple')"
                class="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-[#121624] hover:border-indigo-500/80 transition-all text-center group"
              >
                <div class="w-10 h-10 rounded-lg bg-indigo-950/50 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <mat-icon class="text-indigo-400 text-lg!">touch_app</mat-icon>
                </div>
                <span class="text-xs font-semibold text-slate-200">Click Ripple</span>
                <span class="text-[10px] text-slate-400 mt-0.5">Pulsing mouse click</span>
              </button>

              <button
                type="button"
                (click)="state.addAnnotation('blur-box')"
                class="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-[#121624] hover:border-indigo-500/80 transition-all text-center group"
              >
                <div class="w-10 h-10 rounded-lg bg-indigo-950/50 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <mat-icon class="text-indigo-400 text-lg!">blur_on</mat-icon>
                </div>
                <span class="text-xs font-semibold text-slate-200">Redact Box</span>
                <span class="text-[10px] text-slate-400 mt-0.5">Hide passwords & emails</span>
              </button>
            </div>
          </div>
        }

        <!-- 5. PRESETS (MOTION ANIMATIONS) TAB -->
        @if (state.activeSidebarTab() === 'presets') {
          <div class="space-y-3">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">Camera & Zoom Presets</h3>

            <button
              type="button"
              (click)="state.applyMotionPreset('punch-in')"
              class="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-[#121624] hover:border-indigo-500/80 transition-all text-left group"
            >
              <div class="w-10 h-10 rounded-lg bg-indigo-950/50 flex items-center justify-center shrink-0">
                <mat-icon class="text-indigo-400 text-lg!">zoom_in</mat-icon>
              </div>
              <div>
                <span class="text-xs font-semibold text-slate-200 block">Smooth Punch-In</span>
                <span class="text-[10px] text-slate-400">Zooms 2.4x into active focus point and pulls back</span>
              </div>
            </button>

            <button
              type="button"
              (click)="state.applyMotionPreset('cinematic-push')"
              class="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-[#121624] hover:border-indigo-500/80 transition-all text-left group"
            >
              <div class="w-10 h-10 rounded-lg bg-indigo-950/50 flex items-center justify-center shrink-0">
                <mat-icon class="text-indigo-400 text-lg!">slow_motion_video</mat-icon>
              </div>
              <div>
                <span class="text-xs font-semibold text-slate-200 block">Cinematic Push</span>
                <span class="text-[10px] text-slate-400">Slow continuous 1.0x to 1.5x dolly-in</span>
              </div>
            </button>

            <button
              type="button"
              (click)="state.applyMotionPreset('pan-left-right')"
              class="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-[#121624] hover:border-indigo-500/80 transition-all text-left group"
            >
              <div class="w-10 h-10 rounded-lg bg-indigo-950/50 flex items-center justify-center shrink-0">
                <mat-icon class="text-indigo-400 text-lg!">pan_tool</mat-icon>
              </div>
              <div>
                <span class="text-xs font-semibold text-slate-200 block">Pan Left-to-Right</span>
                <span class="text-[10px] text-slate-400">Sweeps smoothly across horizontal UI layout</span>
              </div>
            </button>

            <button
              type="button"
              (click)="state.applyMotionPreset('3d-tilt')"
              class="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-[#121624] hover:border-indigo-500/80 transition-all text-left group"
            >
              <div class="w-10 h-10 rounded-lg bg-indigo-950/50 flex items-center justify-center shrink-0">
                <mat-icon class="text-indigo-400 text-lg!">3d_rotation</mat-icon>
              </div>
              <div>
                <span class="text-xs font-semibold text-slate-200 block">3D Dynamic Tilt</span>
                <span class="text-[10px] text-slate-400">Applies realistic perspective tilt and returns</span>
              </div>
            </button>

            <button
              type="button"
              (click)="state.applyMotionPreset('reset-zoom')"
              class="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-[#121624] hover:border-slate-700 transition-all text-left group"
            >
              <div class="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                <mat-icon class="text-slate-400 text-lg!">zoom_out_map</mat-icon>
              </div>
              <div>
                <span class="text-xs font-semibold text-slate-200 block">Reset to Full Screen</span>
                <span class="text-[10px] text-slate-400">Animates back to 1.0x neutral scale</span>
              </div>
            </button>
          </div>
        }
      </div>
    </aside>
  `,
})
export class LeftSidebarComponent {
  public state = inject(EditorStateService);
  public devicePresets = DEVICE_PRESETS;
  public backgroundPresets = BACKGROUND_PRESETS;

  public getPresetPreviewStyle(preset: BackgroundPresetItem): string {
    const s = preset.settings;
    if (s.type === 'mesh') {
      return `radial-gradient(circle at 30% 30%, ${s.color2}, ${s.color1})`;
    }
    return `linear-gradient(${s.angle}deg, ${s.color1}, ${s.color2}, ${s.color3 || s.color2})`;
  }

  public onBrowserUrlInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.state.updateDeviceSettings({ browserUrl: val });
  }

  public onBrowserTitleInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.state.updateDeviceSettings({ browserTitle: val });
  }
}
