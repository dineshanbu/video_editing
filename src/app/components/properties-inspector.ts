import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EditorStateService } from '../services/editor-state.service';
import { AnimatableProperty, EasingType, HighlightAnimationType } from '../core/models';

@Component({
  selector: 'app-properties-inspector',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="w-80 bg-[#0d111c] border-l border-slate-800/80 flex flex-col shrink-0 select-none overflow-hidden h-full">
      <!-- Top Inspector Tabs -->
      <div class="flex items-center gap-1 p-2 bg-[#090d16] border-b border-slate-800/80 overflow-x-auto text-xs font-medium">
        <button
          type="button"
          (click)="state.activeInspectorTab.set('transform')"
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap"
          [class.bg-slate-800]="state.activeInspectorTab() === 'transform'"
          [class.text-white]="state.activeInspectorTab() === 'transform'"
          [class.text-slate-400]="state.activeInspectorTab() !== 'transform'"
        >
          <mat-icon class="text-sm! leading-none!">zoom_in</mat-icon>
          <span>Zoom</span>
        </button>

        <button
          type="button"
          (click)="state.activeInspectorTab.set('device')"
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap"
          [class.bg-slate-800]="state.activeInspectorTab() === 'device'"
          [class.text-white]="state.activeInspectorTab() === 'device'"
          [class.text-slate-400]="state.activeInspectorTab() !== 'device'"
        >
          <mat-icon class="text-sm! leading-none!">phone_iphone</mat-icon>
          <span>Frame</span>
        </button>

        <button
          type="button"
          (click)="state.activeInspectorTab.set('annotations')"
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap"
          [class.bg-slate-800]="state.activeInspectorTab() === 'annotations'"
          [class.text-white]="state.activeInspectorTab() === 'annotations'"
          [class.text-slate-400]="state.activeInspectorTab() !== 'annotations'"
        >
          <mat-icon class="text-sm! leading-none!">layers</mat-icon>
          <span>Layers</span>
        </button>

        <button
          type="button"
          (click)="state.activeInspectorTab.set('pip')"
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap"
          [class.bg-slate-800]="state.activeInspectorTab() === 'pip'"
          [class.text-white]="state.activeInspectorTab() === 'pip'"
          [class.text-slate-400]="state.activeInspectorTab() !== 'pip'"
        >
          <mat-icon class="text-sm! leading-none!">videocam</mat-icon>
          <span>PiP</span>
        </button>

        <button
          type="button"
          (click)="state.activeInspectorTab.set('effects')"
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap"
          [class.bg-slate-800]="state.activeInspectorTab() === 'effects'"
          [class.text-white]="state.activeInspectorTab() === 'effects'"
          [class.text-slate-400]="state.activeInspectorTab() !== 'effects'"
        >
          <mat-icon class="text-sm! leading-none!">tune</mat-icon>
          <span>Effects</span>
        </button>
      </div>

      <!-- Active Keyframe Detail (if selected on timeline) -->
      @if (state.selectedKeyframe()) {
        <div class="p-3 bg-indigo-950/40 border-b border-indigo-900/50 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
              <mat-icon class="text-sm! leading-none! text-indigo-400">diamond</mat-icon>
              <span>Keyframe: {{ state.selectedKeyframe()!.property }}</span>
            </div>
            <button
              type="button"
              (click)="state.deleteKeyframe(state.selectedKeyframe()!.id)"
              class="text-xs text-rose-400 hover:text-rose-300 p-1"
              title="Delete keyframe"
            >
              <mat-icon class="text-sm! leading-none!">delete</mat-icon>
            </button>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span class="text-[10px] text-slate-400 block mb-0.5">Time (s)</span>
              <input
                type="number"
                step="0.1"
                [value]="state.selectedKeyframe()!.time"
                (change)="onKeyframeTimeChange($event)"
                class="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono"
              />
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block mb-0.5">Value</span>
              <input
                type="number"
                step="0.1"
                [value]="state.selectedKeyframe()!.value"
                (change)="onKeyframeValChange($event)"
                class="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono"
              />
            </div>
          </div>

          <div>
            <span class="text-[10px] text-slate-400 block mb-0.5">Easing Motion Curve</span>
            <select
              [value]="state.selectedKeyframe()!.easing"
              (change)="onKeyframeEasingChange($event)"
              class="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none"
            >
              <option value="easeInOut">Ease In Out (Smooth)</option>
              <option value="easeOut">Ease Out (Decelerate)</option>
              <option value="easeIn">Ease In (Accelerate)</option>
              <option value="linear">Linear (Constant)</option>
              <option value="spring">Spring (Elastic Bounce)</option>
              <option value="cubicBezier">Custom Cubic Bézier</option>
            </select>
          </div>
        </div>
      }

      <!-- Inspector Tab Body -->
      <div class="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-300">
        <!-- 1. TRANSFORM TAB -->
        @if (state.activeInspectorTab() === 'transform') {
          <div class="space-y-4">
            <!-- Zoom Factor -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-medium text-slate-200">Camera Zoom</span>
                <div class="flex items-center gap-2">
                  <span class="font-mono tabular-nums text-indigo-400 font-semibold">{{ state.project().transform.zoom.toFixed(2) }}x</span>
                  <button
                    type="button"
                    (click)="state.toggleKeyframeAtPlayhead('zoom', state.project().transform.zoom)"
                    class="p-1 rounded hover:bg-slate-800 transition-colors"
                    [class.text-indigo-400]="hasKeyframeAtPlayhead('zoom')"
                    [class.text-slate-500]="!hasKeyframeAtPlayhead('zoom')"
                    title="Toggle keyframe at current playhead"
                  >
                    <mat-icon class="text-sm! leading-none!">diamond</mat-icon>
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="1.0"
                max="4.0"
                step="0.05"
                [value]="state.project().transform.zoom"
                (input)="onZoomInput($event)"
                class="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <!-- Focus Point X & Y -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-medium text-slate-200">Focus Point X & Y</span>
                <div class="flex items-center gap-2">
                  <span class="font-mono tabular-nums text-slate-400">
                    {{ state.project().transform.focusX }}%, {{ state.project().transform.focusY }}%
                  </span>
                  <button
                    type="button"
                    (click)="state.toggleKeyframeAtPlayhead('focusX', state.project().transform.focusX)"
                    class="p-1 rounded hover:bg-slate-800 transition-colors"
                    [class.text-indigo-400]="hasKeyframeAtPlayhead('focusX')"
                    [class.text-slate-500]="!hasKeyframeAtPlayhead('focusX')"
                    title="Toggle focus keyframe"
                  >
                    <mat-icon class="text-sm! leading-none!">diamond</mat-icon>
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <span class="text-[10px] text-slate-500 block mb-0.5">X Axis ({{ state.project().transform.focusX }}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    [value]="state.project().transform.focusX"
                    (input)="onFocusXInput($event)"
                    class="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <span class="text-[10px] text-slate-500 block mb-0.5">Y Axis ({{ state.project().transform.focusY }}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    [value]="state.project().transform.focusY"
                    (input)="onFocusYInput($event)"
                    class="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
              <p class="text-[10px] text-slate-500 mt-1">Tip: Click directly on the preview video canvas to set focus point</p>
            </div>

            <!-- Pan Shift X & Y -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-medium text-slate-200">Pan Offset</span>
                <div class="flex items-center gap-2">
                  <span class="font-mono tabular-nums text-slate-400">
                    {{ state.project().transform.panX }}px, {{ state.project().transform.panY }}px
                  </span>
                  <button
                    type="button"
                    (click)="state.toggleKeyframeAtPlayhead('panX', state.project().transform.panX)"
                    class="p-1 rounded hover:bg-slate-800 transition-colors"
                    [class.text-indigo-400]="hasKeyframeAtPlayhead('panX')"
                    [class.text-slate-500]="!hasKeyframeAtPlayhead('panX')"
                    title="Toggle pan keyframe"
                  >
                    <mat-icon class="text-sm! leading-none!">diamond</mat-icon>
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <span class="text-[10px] text-slate-500 block mb-0.5">Pan X</span>
                  <input
                    type="range"
                    min="-250"
                    max="250"
                    step="5"
                    [value]="state.project().transform.panX"
                    (input)="onPanXInput($event)"
                    class="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <span class="text-[10px] text-slate-500 block mb-0.5">Pan Y</span>
                  <input
                    type="range"
                    min="-250"
                    max="250"
                    step="5"
                    [value]="state.project().transform.panY"
                    (input)="onPanYInput($event)"
                    class="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <!-- Canvas Rotation -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-medium text-slate-200">Rotation</span>
                <span class="font-mono tabular-nums text-slate-400">{{ state.project().transform.rotation }}°</span>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                step="1"
                [value]="state.project().transform.rotation"
                (input)="onRotationInput($event)"
                class="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <button
              type="button"
              (click)="state.resetTransform()"
              class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
            >
              Reset Transform & Zoom
            </button>
          </div>
        }

        <!-- 2. DEVICE & FRAME TAB -->
        @if (state.activeInspectorTab() === 'device') {
          <div class="space-y-4">
            <!-- Scale -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-medium text-slate-200">Device Scale</span>
                <span class="font-mono tabular-nums text-slate-400">{{ (state.project().device.scale * 100).toFixed(0) }}%</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.2"
                step="0.02"
                [value]="state.project().device.scale"
                (input)="onDeviceScaleInput($event)"
                class="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <!-- Corner Radius & Bezel -->
            <div class="grid grid-cols-2 gap-2">
              <div>
                <span class="text-[10px] text-slate-400 block mb-1">Corner Radius</span>
                <input
                  type="number"
                  [value]="state.project().device.cornerRadius"
                  (input)="onDeviceRadiusInput($event)"
                  class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono"
                />
              </div>
              <div>
                <span class="text-[10px] text-slate-400 block mb-1">Bezel Width</span>
                <input
                  type="number"
                  [value]="state.project().device.bezelWidth"
                  (input)="onDeviceBezelInput($event)"
                  class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono"
                />
              </div>
            </div>

            <!-- 3D Tilt RotateX & RotateY -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-medium text-slate-200">3D Tilt Angle</span>
                <div class="flex items-center gap-2">
                  <span class="font-mono tabular-nums text-slate-400">
                    {{ state.project().device.rotateX }}°, {{ state.project().device.rotateY }}°
                  </span>
                  <button
                    type="button"
                    (click)="state.toggleKeyframeAtPlayhead('rotateX', state.project().device.rotateX)"
                    class="p-1 rounded hover:bg-slate-800 transition-colors"
                    [class.text-indigo-400]="hasKeyframeAtPlayhead('rotateX')"
                    [class.text-slate-500]="!hasKeyframeAtPlayhead('rotateX')"
                    title="Toggle 3D tilt keyframe"
                  >
                    <mat-icon class="text-sm! leading-none!">diamond</mat-icon>
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <span class="text-[10px] text-slate-500 block mb-0.5">Tilt X (Pitch)</span>
                  <input
                    type="range"
                    min="-15"
                    max="15"
                    step="1"
                    [value]="state.project().device.rotateX"
                    (input)="onRotateXInput($event)"
                    class="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <span class="text-[10px] text-slate-500 block mb-0.5">Tilt Y (Yaw)</span>
                  <input
                    type="range"
                    min="-15"
                    max="15"
                    step="1"
                    [value]="state.project().device.rotateY"
                    (input)="onRotateYInput($event)"
                    class="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <!-- Realistic Glass Sheen -->
            <div class="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <span class="font-medium text-slate-200">Glass Reflection & Sheen</span>
              <input
                type="checkbox"
                [checked]="state.project().device.reflection"
                (change)="onReflectionToggle($event)"
                class="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <!-- Soft Ambient Shadow -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-medium text-slate-200">Soft Shadow Blur</span>
                <span class="font-mono tabular-nums text-slate-400">{{ state.project().device.shadowBlur }}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="2"
                [value]="state.project().device.shadowBlur"
                (input)="onShadowBlurInput($event)"
                class="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-medium text-slate-200">Shadow Opacity</span>
                <span class="font-mono tabular-nums text-slate-400">{{ (state.project().device.shadowOpacity * 100).toFixed(0) }}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.05"
                [value]="state.project().device.shadowOpacity"
                (input)="onShadowOpacityInput($event)"
                class="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        }

        <!-- 3. ANNOTATIONS & LAYERS TAB -->
        @if (state.activeInspectorTab() === 'annotations') {
          <div class="space-y-4">
            @if (state.selectedAnnotation()) {
              <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-slate-200 text-xs">
                    {{ state.selectedAnnotation()!.name }}
                  </span>
                  <button
                    type="button"
                    (click)="state.deleteAnnotation(state.selectedAnnotation()!.id)"
                    class="text-rose-400 hover:text-rose-300"
                    title="Delete annotation"
                  >
                    <mat-icon class="text-sm! leading-none!">delete</mat-icon>
                  </button>
                </div>

                @if (state.selectedAnnotation()!.type === 'callout') {
                  <div>
                    <span class="text-[10px] text-slate-400 block mb-1">Callout Text</span>
                    <input
                      type="text"
                      [value]="state.selectedAnnotation()!.text || ''"
                      (input)="onAnnotationTextInput($event)"
                      class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 text-xs"
                    />
                  </div>
                }

                @if (state.selectedAnnotation()!.type === 'spotlight') {
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-[10px] text-slate-400">Background Dim Opacity</span>
                      <span class="font-mono text-[10px] text-indigo-400">
                        {{ ((state.selectedAnnotation()!.dimOpacity || 0.65) * 100).toFixed(0) }}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="0.95"
                      step="0.05"
                      [value]="state.selectedAnnotation()!.dimOpacity || 0.65"
                      (input)="onSpotlightDimInput($event)"
                      class="w-full h-1 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>
                }

                <!-- Stroke Color -->
                <div class="flex items-center justify-between">
                  <span class="text-[10px] text-slate-400">Stroke Accent Color</span>
                  <input
                    type="color"
                    [value]="state.selectedAnnotation()!.strokeColor"
                    (input)="onAnnStrokeColorInput($event)"
                    class="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>

                <!-- Stroke Width -->
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-[10px] text-slate-400">Border Thickness</span>
                    <span class="font-mono text-[10px]">{{ state.selectedAnnotation()!.strokeWidth }}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    [value]="state.selectedAnnotation()!.strokeWidth"
                    (input)="onAnnStrokeWidthInput($event)"
                    class="w-full h-1 bg-slate-800 rounded cursor-pointer"
                  />
                </div>

                <!-- Dimensions: Width & Height -->
                <div class="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <div class="flex items-center justify-between mb-0.5">
                      <span class="text-slate-400">Width</span>
                      <span class="font-mono text-indigo-400 font-semibold">{{ state.selectedAnnotation()!.width.toFixed(0) }}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="1"
                      [value]="state.selectedAnnotation()!.width"
                      (input)="onAnnWidthInput($event)"
                      class="w-full h-1 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <div class="flex items-center justify-between mb-0.5">
                      <span class="text-slate-400">Height</span>
                      <span class="font-mono text-indigo-400 font-semibold">{{ state.selectedAnnotation()!.height.toFixed(0) }}%</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="100"
                      step="1"
                      [value]="state.selectedAnnotation()!.height"
                      (input)="onAnnHeightInput($event)"
                      class="w-full h-1 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <!-- Position: X & Y -->
                <div class="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <div class="flex items-center justify-between mb-0.5">
                      <span class="text-slate-400">Position X</span>
                      <span class="font-mono text-slate-300">{{ state.selectedAnnotation()!.x.toFixed(0) }}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="95"
                      step="1"
                      [value]="state.selectedAnnotation()!.x"
                      (input)="onAnnXInput($event)"
                      class="w-full h-1 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <div class="flex items-center justify-between mb-0.5">
                      <span class="text-slate-400">Position Y</span>
                      <span class="font-mono text-slate-300">{{ state.selectedAnnotation()!.y.toFixed(0) }}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="95"
                      step="1"
                      [value]="state.selectedAnnotation()!.y"
                      (input)="onAnnYInput($event)"
                      class="w-full h-1 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <!-- Highlight Entrance Animation -->
                <div>
                  <span class="text-[10px] text-slate-400 block mb-1">Highlight Animation Style</span>
                  <select
                    [value]="state.selectedAnnotation()!.animationType || 'draw-stroke'"
                    (change)="onAnnAnimationChange($event)"
                    class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 text-xs focus:outline-none"
                  >
                    <option value="draw-stroke">✏️ Animated Pen Stroke Draw</option>
                    <option value="fade-scale">💫 Spring Scale Pop (Zoom in)</option>
                    <option value="spotlight-iris">🔦 Iris Hole Reveal (Expanding)</option>
                    <option value="pulse-glow">✨ Breathing Neon Glow</option>
                    <option value="corner-brackets">🎯 Camera Corner Brackets</option>
                    <option value="float">🌊 Gentle Floating Hover</option>
                    <option value="none">Instant (No Animation)</option>
                  </select>
                </div>

                <!-- Animation Duration -->
                <div>
                  <div class="flex items-center justify-between mb-0.5">
                    <span class="text-[10px] text-slate-400">Animation Duration</span>
                    <span class="font-mono text-[10px] text-indigo-400">{{ (state.selectedAnnotation()!.animationDuration || 0.45).toFixed(2) }}s</span>
                  </div>
                  <input
                    type="range"
                    min="0.15"
                    max="1.5"
                    step="0.05"
                    [value]="state.selectedAnnotation()!.animationDuration || 0.45"
                    (input)="onAnnAnimDurationInput($event)"
                    class="w-full h-1 bg-slate-800 rounded cursor-pointer"
                  />
                </div>

                <!-- Timing -->
                <div class="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span class="text-slate-400 block mb-0.5">Start Time (s)</span>
                    <input
                      type="number"
                      step="0.1"
                      [value]="state.selectedAnnotation()!.startTime"
                      (change)="onAnnStartTimeChange($event)"
                      class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <span class="text-slate-400 block mb-0.5">End Time (s)</span>
                    <input
                      type="number"
                      step="0.1"
                      [value]="state.selectedAnnotation()!.endTime"
                      (change)="onAnnEndTimeChange($event)"
                      class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <!-- Quick Action Buttons: Split & Duplicate -->
                <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                  <button
                    type="button"
                    (click)="state.splitAnnotationAtPlayhead(state.selectedAnnotation()!.id)"
                    class="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 text-[11px] font-medium transition-colors"
                    title="Split highlight at current playhead into two pieces"
                  >
                    <mat-icon class="text-xs! leading-none!">content_cut</mat-icon>
                    <span>Split (Cut)</span>
                  </button>

                  <button
                    type="button"
                    (click)="state.duplicateAnnotation(state.selectedAnnotation()!.id)"
                    class="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-sky-950/40 hover:bg-sky-900/60 text-sky-300 border border-sky-800/50 text-[11px] font-medium transition-colors"
                    title="Duplicate this highlight"
                  >
                    <mat-icon class="text-xs! leading-none!">content_copy</mat-icon>
                    <span>Duplicate</span>
                  </button>
                </div>
              </div>
            }

            <h4 class="text-xs font-semibold text-slate-300">All Timeline Annotations</h4>
            <div class="space-y-1.5">
              @for (ann of state.project().annotations; track ann.id) {
                <button
                  type="button"
                  (click)="state.selectAnnotation(ann.id)"
                  class="w-full flex items-center justify-between p-2 rounded-lg border text-left transition-all"
                  [class.border-indigo-500]="state.selectedAnnotationId() === ann.id"
                  [class.bg-indigo-950/20]="state.selectedAnnotationId() === ann.id"
                  [class.border-slate-800]="state.selectedAnnotationId() !== ann.id"
                  [class.bg-slate-900/60]="state.selectedAnnotationId() !== ann.id"
                >
                  <div class="flex items-center gap-2">
                    <div
                      class="w-2.5 h-2.5 rounded-full"
                      [style.backgroundColor]="ann.strokeColor"
                    ></div>
                    <span class="font-medium text-slate-200">{{ ann.name }}</span>
                  </div>
                  <span class="font-mono text-[10px] text-slate-400">
                    {{ ann.startTime.toFixed(1) }}s - {{ ann.endTime.toFixed(1) }}s
                  </span>
                </button>
              }
            </div>
          </div>
        }

        <!-- 4. PiP TAB -->
        @if (state.activeInspectorTab() === 'pip') {
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="font-medium text-slate-200">Enable Camera / Avatar PiP</span>
              <input
                type="checkbox"
                [checked]="state.project().pip.enabled"
                (change)="onPiPToggle($event)"
                class="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            @if (state.project().pip.enabled) {
              <!-- PiP Corner Position -->
              <div>
                <span class="text-[11px] font-medium text-slate-300 block mb-2">Display Corner</span>
                <div class="grid grid-cols-2 gap-1.5">
                  @for (pos of ['bottom-right', 'bottom-left', 'top-right', 'top-left']; track pos) {
                    <button
                      type="button"
                      (click)="state.updatePiPSettings({ position: $any(pos) })"
                      class="px-2 py-1.5 text-xs rounded-md border text-center transition-all capitalize"
                      [class.border-indigo-500]="state.project().pip.position === pos"
                      [class.bg-indigo-950/30]="state.project().pip.position === pos"
                      [class.border-slate-800]="state.project().pip.position !== pos"
                      [class.bg-slate-900]="state.project().pip.position !== pos"
                    >
                      {{ pos.replace('-', ' ') }}
                    </button>
                  }
                </div>
              </div>

              <!-- Shape -->
              <div>
                <span class="text-[11px] font-medium text-slate-300 block mb-2">PiP Shape</span>
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    (click)="state.updatePiPSettings({ shape: 'squircle' })"
                    class="flex-1 py-1 text-xs rounded-md border text-center"
                    [class.border-indigo-500]="state.project().pip.shape === 'squircle'"
                    [class.bg-slate-800]="state.project().pip.shape === 'squircle'"
                    [class.border-slate-800]="state.project().pip.shape !== 'squircle'"
                  >Squircle</button>
                  <button
                    type="button"
                    (click)="state.updatePiPSettings({ shape: 'circle' })"
                    class="flex-1 py-1 text-xs rounded-md border text-center"
                    [class.border-indigo-500]="state.project().pip.shape === 'circle'"
                    [class.bg-slate-800]="state.project().pip.shape === 'circle'"
                    [class.border-slate-800]="state.project().pip.shape !== 'circle'"
                  >Circle</button>
                  <button
                    type="button"
                    (click)="state.updatePiPSettings({ shape: 'rounded' })"
                    class="flex-1 py-1 text-xs rounded-md border text-center"
                    [class.border-indigo-500]="state.project().pip.shape === 'rounded'"
                    [class.bg-slate-800]="state.project().pip.shape === 'rounded'"
                    [class.border-slate-800]="state.project().pip.shape !== 'rounded'"
                  >Rectangle</button>
                </div>
              </div>

              <!-- Border & Size -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="font-medium text-slate-200">PiP Frame Size</span>
                  <span class="font-mono tabular-nums text-slate-400">{{ state.project().pip.size }}px</span>
                </div>
                <input
                  type="range"
                  min="140"
                  max="320"
                  step="10"
                  [value]="state.project().pip.size"
                  (input)="onPiPSizeInput($event)"
                  class="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div class="flex items-center justify-between">
                <span class="text-[11px] font-medium text-slate-300">Border Color</span>
                <input
                  type="color"
                  [value]="state.project().pip.borderColor"
                  (input)="onPiPBorderColorInput($event)"
                  class="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                />
              </div>
            }
          </div>
        }

        <!-- 5. EFFECTS TAB -->
        @if (state.activeInspectorTab() === 'effects') {
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="font-medium text-slate-200">Camera Motion Blur</span>
              <input
                type="checkbox"
                [checked]="state.project().effects.motionBlur"
                (change)="onMotionBlurToggle($event)"
                class="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-medium text-slate-200">Vignette Shading</span>
                <span class="font-mono tabular-nums text-slate-400">{{ (state.project().effects.vignette * 100).toFixed(0) }}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                [value]="state.project().effects.vignette"
                (input)="onVignetteInput($event)"
                class="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-medium text-slate-200">Film Grain</span>
                <span class="font-mono tabular-nums text-slate-400">{{ (state.project().effects.filmGrain * 100).toFixed(0) }}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.2"
                step="0.01"
                [value]="state.project().effects.filmGrain"
                (input)="onFilmGrainInput($event)"
                class="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        }
      </div>
    </aside>
  `,
})
export class PropertiesInspectorComponent {
  public state = inject(EditorStateService);

  public hasKeyframeAtPlayhead(property: AnimatableProperty): boolean {
    const t = this.state.currentTime();
    return this.state
      .project()
      .keyframes.some((k) => k.property === property && Math.abs(k.time - t) <= 0.08);
  }

  // Keyframe property changes
  public onKeyframeTimeChange(e: Event): void {
    const kf = this.state.selectedKeyframe();
    if (!kf) return;
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateKeyframe(kf.id, { time: Math.max(0, val) });
  }

  public onKeyframeValChange(e: Event): void {
    const kf = this.state.selectedKeyframe();
    if (!kf) return;
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateKeyframe(kf.id, { value: val });
  }

  public onKeyframeEasingChange(e: Event): void {
    const kf = this.state.selectedKeyframe();
    if (!kf) return;
    const val = (e.target as HTMLSelectElement).value as EasingType;
    this.state.updateKeyframe(kf.id, { easing: val });
  }

  // Transform sliders
  public onZoomInput(e: Event): void {
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateTransformSettings({ zoom: val });
  }

  public onFocusXInput(e: Event): void {
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateTransformSettings({ focusX: val });
  }

  public onFocusYInput(e: Event): void {
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateTransformSettings({ focusY: val });
  }

  public onPanXInput(e: Event): void {
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateTransformSettings({ panX: val });
  }

  public onPanYInput(e: Event): void {
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateTransformSettings({ panY: val });
  }

  public onRotationInput(e: Event): void {
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateTransformSettings({ rotation: val });
  }

  // Device sliders
  public onDeviceScaleInput(e: Event): void {
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateDeviceSettings({ scale: val });
  }

  public onDeviceRadiusInput(e: Event): void {
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateDeviceSettings({ cornerRadius: val });
  }

  public onDeviceBezelInput(e: Event): void {
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateDeviceSettings({ bezelWidth: val });
  }

  public onRotateXInput(e: Event): void {
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateDeviceSettings({ rotateX: val });
  }

  public onRotateYInput(e: Event): void {
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateDeviceSettings({ rotateY: val });
  }

  public onReflectionToggle(e: Event): void {
    const val = (e.target as HTMLInputElement).checked;
    this.state.updateDeviceSettings({ reflection: val });
  }

  public onShadowBlurInput(e: Event): void {
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateDeviceSettings({ shadowBlur: val });
  }

  public onShadowOpacityInput(e: Event): void {
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateDeviceSettings({ shadowOpacity: val });
  }

  // Annotation inputs
  public onAnnotationTextInput(e: Event): void {
    const ann = this.state.selectedAnnotation();
    if (!ann) return;
    this.state.updateAnnotation(ann.id, { text: (e.target as HTMLInputElement).value });
  }

  public onSpotlightDimInput(e: Event): void {
    const ann = this.state.selectedAnnotation();
    if (!ann) return;
    this.state.updateAnnotation(ann.id, {
      dimOpacity: parseFloat((e.target as HTMLInputElement).value),
    });
  }

  public onAnnStrokeColorInput(e: Event): void {
    const ann = this.state.selectedAnnotation();
    if (!ann) return;
    this.state.updateAnnotation(ann.id, { strokeColor: (e.target as HTMLInputElement).value });
  }

  public onAnnStrokeWidthInput(e: Event): void {
    const ann = this.state.selectedAnnotation();
    if (!ann) return;
    this.state.updateAnnotation(ann.id, {
      strokeWidth: parseFloat((e.target as HTMLInputElement).value),
    });
  }

  public onAnnStartTimeChange(e: Event): void {
    const ann = this.state.selectedAnnotation();
    if (!ann) return;
    this.state.updateAnnotation(ann.id, {
      startTime: parseFloat((e.target as HTMLInputElement).value),
    });
  }

  public onAnnEndTimeChange(e: Event): void {
    const ann = this.state.selectedAnnotation();
    if (!ann) return;
    this.state.updateAnnotation(ann.id, {
      endTime: parseFloat((e.target as HTMLInputElement).value),
    });
  }

  public onAnnWidthInput(e: Event): void {
    const ann = this.state.selectedAnnotation();
    if (!ann) return;
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateAnnotation(ann.id, { width: val });
  }

  public onAnnHeightInput(e: Event): void {
    const ann = this.state.selectedAnnotation();
    if (!ann) return;
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateAnnotation(ann.id, { height: val });
  }

  public onAnnXInput(e: Event): void {
    const ann = this.state.selectedAnnotation();
    if (!ann) return;
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateAnnotation(ann.id, { x: val });
  }

  public onAnnYInput(e: Event): void {
    const ann = this.state.selectedAnnotation();
    if (!ann) return;
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateAnnotation(ann.id, { y: val });
  }

  public onAnnAnimationChange(e: Event): void {
    const ann = this.state.selectedAnnotation();
    if (!ann) return;
    const val = (e.target as HTMLSelectElement).value as HighlightAnimationType;
    this.state.updateAnnotation(ann.id, { animationType: val });
  }

  public onAnnAnimDurationInput(e: Event): void {
    const ann = this.state.selectedAnnotation();
    if (!ann) return;
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateAnnotation(ann.id, { animationDuration: val });
  }

  // PiP inputs
  public onPiPToggle(e: Event): void {
    const val = (e.target as HTMLInputElement).checked;
    this.state.updatePiPSettings({ enabled: val });
  }

  public onPiPSizeInput(e: Event): void {
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updatePiPSettings({ size: val });
  }

  public onPiPBorderColorInput(e: Event): void {
    const val = (e.target as HTMLInputElement).value;
    this.state.updatePiPSettings({ borderColor: val });
  }

  // Effects inputs
  public onMotionBlurToggle(e: Event): void {
    const val = (e.target as HTMLInputElement).checked;
    this.state.updateEffectsSettings({ motionBlur: val });
  }

  public onVignetteInput(e: Event): void {
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateEffectsSettings({ vignette: val });
  }

  public onFilmGrainInput(e: Event): void {
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.state.updateEffectsSettings({ filmGrain: val });
  }
}
