import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-transcribe-button',
  templateUrl: './transcribe-button.component.html',
  styleUrls: ['./transcribe-button.component.scss']
})
export class TranscribeButtonComponent {
  @Input() isModelLoading: boolean = false;
  @Input() isTranscribing: boolean = false;
  @Output() buttonClick = new EventEmitter<Event>();

  onClick(event: Event): void {
    // Only emit click if neither transcribing nor model loading.
    if (!this.isTranscribing && !this.isModelLoading) {
      this.buttonClick.emit(event);
    }
  }
}
