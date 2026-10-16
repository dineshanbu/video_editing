import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopToolbarComponent } from './components/top-toolbar';
import { LeftSidebarComponent } from './components/left-sidebar';
import { PreviewCanvasComponent } from './components/preview-canvas';
import { PropertiesInspectorComponent } from './components/properties-inspector';
import { TimelineComponent } from './components/timeline';
import { ExportDialogComponent } from './components/export-dialog';
import { EditorStateService } from './services/editor-state.service';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    TopToolbarComponent,
    LeftSidebarComponent,
    PreviewCanvasComponent,
    PropertiesInspectorComponent,
    TimelineComponent,
    ExportDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: {
    '(window:keydown)': 'handleKeyboardShortcuts($event)',
  },
})
export class App {
  public state = inject(EditorStateService);

  public handleKeyboardShortcuts(event: KeyboardEvent): void {
    // Ignore when typing inside input or textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      this.state.togglePlay();
    } else if (event.code === 'ArrowLeft') {
      event.preventDefault();
      this.state.stepFrame(-1);
    } else if (event.code === 'ArrowRight') {
      event.preventDefault();
      this.state.stepFrame(1);
    } else if (event.key === 's' || event.key === 'S') {
      event.preventDefault();
      this.state.splitClipAtPlayhead();
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      if (this.state.selectedKeyframeId()) {
        event.preventDefault();
        this.state.deleteKeyframe(this.state.selectedKeyframeId()!);
      } else if (this.state.selectedAnnotationId()) {
        event.preventDefault();
        this.state.deleteAnnotation(this.state.selectedAnnotationId()!);
      }
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        this.state.redo();
      } else {
        this.state.undo();
      }
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      this.state.redo();
    }
  }
}
