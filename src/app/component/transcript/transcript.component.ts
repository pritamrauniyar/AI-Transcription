import { 
  Component, 
  Input, 
  ViewChild, 
  ElementRef, 
  AfterViewChecked 
} from '@angular/core';
import { formatAudioTimestamp } from '../../utils/AudioUtils';

export interface Chunk {
  timestamp: [number, number | null];
  text: string;
}

export interface TranscriberData {
  chunks: Chunk[];
  isBusy: boolean;
}

@Component({
  selector: 'app-transcript',
  templateUrl: './transcript.component.html',
  styleUrls: ['./transcript.component.scss']
})
export class TranscriptComponent implements AfterViewChecked {
  @Input() transcribedData?: TranscriberData;

  @ViewChild('transcriptContainer') transcriptContainer!: ElementRef<HTMLDivElement>;

  // This method wraps the imported formatAudioTimestamp so it can be called in the template.
  formatAudioTimestamp(timestamp: number): string {
    return formatAudioTimestamp(timestamp);
  }

  ngAfterViewChecked(): void {
    // Scroll to the bottom when the component updates
    if (this.transcriptContainer) {
      const container = this.transcriptContainer.nativeElement;
      const diff = Math.abs(
        container.offsetHeight + container.scrollTop - container.scrollHeight
      );
      if (diff <= 64) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  exportTXT(): void {
    const chunks = this.transcribedData?.chunks ?? [];
    const text = chunks.map((chunk) => chunk.text).join('').trim();
    const blob = new Blob([text], { type: 'text/plain' });
    this.saveBlob(blob, 'transcript.txt');
  }

  exportJSON(): void {
    let jsonData = JSON.stringify(this.transcribedData?.chunks ?? [], null, 2);
    // Post-process the JSON to make it more readable (using the provided regex)
    const regex = /(    "timestamp": )\[\s+(\S+)\s+(\S+)\s+\]/gm;
    jsonData = jsonData.replace(regex, '$1[$2 $3]');
    const blob = new Blob([jsonData], { type: 'application/json' });
    this.saveBlob(blob, 'transcript.json');
  }
}
