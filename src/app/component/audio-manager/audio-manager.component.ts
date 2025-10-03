import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';

export enum AudioSource {
  URL = 'URL',
  FILE = 'FILE',
  RECORDING = 'RECORDING'
}

export interface AudioData {
  buffer: AudioBuffer;
  url: string;
  source: AudioSource;
  mimeType: string;
}

@Component({
  selector: 'app-audio-manager',
  templateUrl: './audio-manager.component.html',
  styleUrls: ['./audio-manager.component.scss']
})
export class AudioManagerComponent implements OnInit, OnDestroy {
  // State variables
  progress: number | undefined;
  audioData: AudioData | undefined;
  audioDownloadUrl: string | undefined;
  downloadSub?: Subscription;
  @Input() transcriber: any; 

  // Modal visibility flags
  showUrlModal = false;
  showRecordModal = false;
  showSettingsModal = false;
  public globalNavigator = window.navigator;


  // URL Modal input
  urlInput: string = 'https://default.audio.url/audio.wav';

  // Constant for audio sample rate
  SAMPLING_RATE = 16000;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    // You might want to subscribe to changes or initialize here.
  }

  ngOnDestroy(): void {
    if (this.downloadSub) {
      this.downloadSub.unsubscribe();
    }
  }

  resetAudio(): void {
    this.audioData = undefined;
    this.audioDownloadUrl = undefined;
  }

  async setAudioFromDownload(data: ArrayBuffer, mimeType: string): Promise<void> {
    const audioCtx = new AudioContext({ sampleRate: this.SAMPLING_RATE });
    const blobUrl = URL.createObjectURL(new Blob([data], { type: 'audio/*' }));
    const decoded = await audioCtx.decodeAudioData(data);
    this.audioData = {
      buffer: decoded,
      url: blobUrl,
      source: AudioSource.URL,
      mimeType: mimeType
    };
  }

  async setAudioFromRecording(data: Blob): Promise<void> {
    this.resetAudio();
    this.progress = 0;
    const blobUrl = URL.createObjectURL(data);
    const fileReader = new FileReader();
    fileReader.onprogress = (event: ProgressEvent<FileReader>) => {
      if (event.lengthComputable) {
        this.progress = event.loaded / event.total;
      }
    };
    fileReader.onloadend = async () => {
      const audioCtx = new AudioContext({ sampleRate: this.SAMPLING_RATE });
      const arrayBuffer = fileReader.result as ArrayBuffer;
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      this.progress = undefined;
      this.audioData = {
        buffer: decoded,
        url: blobUrl,
        source: AudioSource.RECORDING,
        mimeType: data.type
      };
    };
    fileReader.readAsArrayBuffer(data);
  }

  downloadAudioFromUrl(): void {
    if (this.audioDownloadUrl) {
      this.resetAudio();
      this.progress = 0;
      this.downloadSub = this.http.get(this.audioDownloadUrl, {
        responseType: 'arraybuffer',
        reportProgress: true,
        observe: 'events'
      }).subscribe(event => {
        if (event.type === HttpEventType.DownloadProgress) {
          if (event.total) {
            this.progress = event.loaded / event.total;
          }
        }else if (event instanceof HttpResponse) {
          let mimeType = event.headers.get('content-type') || '';
          if (!mimeType || mimeType === 'audio/wave') {
            mimeType = 'audio/wav';
          }
          if (event.body) {
            this.setAudioFromDownload(event.body, mimeType);
          }
          this.progress = undefined;
        }
      }, error => {
        console.log("Request failed or aborted", error);
        this.progress = undefined;
      });
    }
  }

  // --- Handlers for URL Tile ---
  onUrlTileClick(): void {
    this.showUrlModal = true;
  }
  onUrlModalSubmit(): void {
    this.showUrlModal = false;
    this.transcriber.onInputChange();
    this.audioDownloadUrl = this.urlInput;
    this.downloadAudioFromUrl();
  }
  onUrlModalClose(): void {
    this.showUrlModal = false;
  }

  // --- Handlers for File Tile ---
  onFileTileClick(): void {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }
  onFileSelected(event: any): void {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const blobUrl = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onload = async () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const audioCtx = new AudioContext({ sampleRate: this.SAMPLING_RATE });
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      this.transcriber.onInputChange();
      this.audioData = {
        buffer: decoded,
        url: blobUrl,
        source: AudioSource.FILE,
        mimeType: file.type
      };
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  }

  // --- Handlers for Record Tile ---
  onRecordTileClick(): void {
    this.showRecordModal = true;
  }
  onRecordModalSubmit(recordedBlob: any): void {
    this.showRecordModal = false;
    if (recordedBlob) {
      this.transcriber.onInputChange();
      this.setAudioFromRecording(recordedBlob);
    }
  }
  onRecordModalClose(): void {
    this.showRecordModal = false;
  }

  // --- Handlers for Settings Tile ---
  onSettingsTileClick(): void {
    this.showSettingsModal = true;
  }
  onSettingsModalClose(): void {
    this.showSettingsModal = false;
  }
  onSettingsModalSubmit(): void {
    this.showSettingsModal = false;
    // Additional settings submit logic can be added here.
  }
}
