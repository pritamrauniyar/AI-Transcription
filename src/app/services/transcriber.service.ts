
import { Injectable } from '@angular/core';
import Constants from '../utils/Constants';
import { BehaviorSubject } from 'rxjs';

export interface ProgressItem {
  file: string;
  loaded: number;
  progress: number;
  total: number;
  name: string;
  status: string;
}

export interface TranscriberUpdateData {
  data: [
    string,
    { chunks: { text: string; timestamp: [number, number | null] }[] }
  ];
  text: string;
}

export interface TranscriberCompleteData {
  data: {
    text: string;
    chunks: { text: string; timestamp: [number, number | null] }[];
  };
}

export interface TranscriberData {
  isBusy: boolean;
  text: string;
  chunks: { text: string; timestamp: [number, number | null] }[];
}

export interface Transcriber {
  onInputChange: () => void;
  isBusy: boolean;
  isModelLoading: boolean;
  progressItems: ProgressItem[];
  start: (audioData: AudioBuffer | undefined) => void;
  output?: TranscriberData;
  model: string;
  setModel: (model: string) => void;
  multilingual: boolean;
  setMultilingual: (value: boolean) => void;
  quantized: boolean;
  setQuantized: (value: boolean) => void;
  subtask: string;
  setSubtask: (subtask: string) => void;
  language?: string;
  setLanguage: (language: string) => void;
}

@Injectable({
  providedIn: 'root'
})
export class TranscriberService implements Transcriber {
  // State properties:
  transcript?: TranscriberData;
  isBusy = false;
  isModelLoading = false;
  progressItems: ProgressItem[] = [];

  // Settings with defaults from Constants
  model: string = Constants.DEFAULT_MODEL;
  subtask: string = Constants.DEFAULT_SUBTASK;
  quantized: boolean = Constants.DEFAULT_QUANTIZED;
  multilingual: boolean = Constants.DEFAULT_MULTILINGUAL;
  language: string = Constants.DEFAULT_LANGUAGE;

  // Create the Worker instance
  private worker: Worker;

  private transcriptSubject = new BehaviorSubject<TranscriberData | undefined>(undefined);
  
  // Expose an observable for components to subscribe to.
  transcript$ = this.transcriptSubject.asObservable();
  
  constructor() {
    // Change the worker creation path:
    this.worker = new Worker(new URL('../../assets/worker.js', import.meta.url), {
      type: 'module'
    });
    // Listen for messages from the worker
    this.worker.addEventListener('message', this.handleWorkerMessage.bind(this));
  }

  // Method to reset the transcript when input changes.
  onInputChange = (): void => {
    this.transcript = undefined;
  };

  // Method to start processing the audio.
  start(audioData: AudioBuffer | undefined): void {
    if (audioData) {
      this.transcript = undefined;
      this.isBusy = true;

      let audio: Float32Array;
      if (audioData.numberOfChannels === 2) {
        const SCALING_FACTOR = Math.sqrt(2);
        const left = audioData.getChannelData(0);
        const right = audioData.getChannelData(1);
        audio = new Float32Array(left.length);
        for (let i = 0; i < audioData.length; i++) {
          audio[i] = SCALING_FACTOR * (left[i] + right[i]) / 2;
        }
      } else {
        audio = audioData.getChannelData(0);
      }

      // Post a message to the worker with the parameters.
      this.worker.postMessage({
        audio,
        model: this.model,
        multilingual: this.multilingual,
        quantized: this.quantized,
        subtask: this.multilingual ? this.subtask : null,
        language: this.multilingual && this.language !== 'auto' ? this.language : null
      });
    }
  }

  // Private method to handle messages from the worker.
  private handleWorkerMessage(event: MessageEvent): void {
    const message = event.data;
    switch (message.status) {
      case 'progress':
        this.progressItems = this.progressItems.map(item => {
          if (item.file === message.file) {
            return { ...item, progress: message.progress };
          }
          return item;
        });
        break;
      case 'update': {
        const updateMessage = message as TranscriberUpdateData;
        this.transcript = {
          isBusy: true,
          text: updateMessage.data[0],
          chunks: updateMessage.data[1].chunks,
        };
        this.transcriptSubject.next({
            isBusy: true,
            text: updateMessage.data[0],
            chunks: updateMessage.data[1].chunks,
          });
        break;
      }
      case 'complete': {
        const completeMessage = message as TranscriberCompleteData;
        this.transcript = {
          isBusy: false,
          text: completeMessage.data.text,
          chunks: completeMessage.data.chunks,
        };
        this.transcriptSubject.next({
            isBusy: false,
            text: completeMessage.data.text,
            chunks: completeMessage.data.chunks,
          });
        this.isBusy = false;
        break;
      }
      case 'initiate':
        this.isModelLoading = true;
        this.progressItems.push(message);
        break;
      case 'ready':
        this.isModelLoading = false;
        break;
      case 'error':
        this.isBusy = false;
        alert(
          `${message.data.message} This is most likely because you are using Safari on an M1/M2 Mac. Please try again from Chrome, Firefox, or Edge.\n\nIf this is not the case, please file a bug report.`
        );
        break;
      case 'done':
        this.progressItems = this.progressItems.filter(item => item.file !== message.file);
        break;
      default:
        // Other messages can be ignored.
        break;
    }
  }

  // Setter methods for settings.
  setModel(model: string): void {
    this.model = model;
  }
  setMultilingual(value: boolean): void {
    this.multilingual = value;
  }
  setQuantized(value: boolean): void {
    this.quantized = value;
  }
  setSubtask(subtask: string): void {
    this.subtask = subtask;
  }
  setLanguage(language: string): void {
    this.language = language;
  }

  // Expose the output transcript via a getter.
  get output(): TranscriberData | undefined {
    return this.transcript;
  }
}
