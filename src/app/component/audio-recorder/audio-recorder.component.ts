import { 
  Component, 
  OnInit, 
  OnDestroy, 
  Output, 
  EventEmitter, 
  ViewChild, 
  ElementRef 
} from '@angular/core';
import { webmFixDuration } from '../../utils/BlobFix';
import { formatAudioTimestamp } from '../../utils/AudioUtils';

function getMimeType(): string | undefined {
  const types = [
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
    "audio/wav",
    "audio/aac",
  ];
  for (let i = 0; i < types.length; i++) {
    if (MediaRecorder.isTypeSupported(types[i])) {
      return types[i];
    }
  }
  return undefined;
}

@Component({
  selector: 'app-audio-recorder',
  templateUrl: './audio-recorder.component.html',
  styleUrls: ['./audio-recorder.component.scss']
})
export class AudioRecorderComponent implements OnInit, OnDestroy {
  @Output() onRecordingComplete: EventEmitter<Blob> = new EventEmitter<Blob>();

  recording: boolean = false;
  duration: number = 0;
  recordedBlob: Blob | null = null;

  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private timerId: any;

  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;

  ngOnInit(): void {
    // No initialization needed.
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }

  // Optional: A getter for window.URL, if you prefer using it in the template.
  public get globalURL() {
    return window.URL;
  }

  // Instead, we add a method to return the object URL.
  getObjectURL(blob: Blob): string {
    return window.URL.createObjectURL(blob);
  }
  
  async startRecording(): Promise<void> {
    // Reset previous recording.
    this.recordedBlob = null;
    const startTime = Date.now();

    try {
      if (!this.stream) {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const mimeType = getMimeType();
      if (!mimeType) {
        throw new Error('No supported MIME type for recording found.');
      }

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
      this.mediaRecorder.addEventListener('dataavailable', async (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
        if (this.mediaRecorder && this.mediaRecorder.state === "inactive") {
          const recDuration = Date.now() - startTime;
          let blob = new Blob(this.chunks, { type: mimeType });
          if (mimeType === "audio/webm") {
            // Fix duration if needed.
            blob = await webmFixDuration(blob, recDuration, blob.type);
          }
          this.recordedBlob = blob;
          this.onRecordingComplete.emit(blob);
          this.chunks = [];
        }
      });

      this.mediaRecorder.start();
      this.recording = true;

      // Start timer to update duration every second.
      this.timerId = setInterval(() => {
        this.duration++;
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.stop();
      this.recording = false;
      this.duration = 0;
      if (this.timerId) {
        clearInterval(this.timerId);
      }
    }
  }

  handleToggleRecording(): void {
    if (this.recording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  // Expose formatted duration for display.
  get formattedDuration(): string {
    return formatAudioTimestamp(this.duration);
  }
}
