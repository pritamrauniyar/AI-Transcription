import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { TranscriberService } from '../../services/transcriber.service';

@Component({
  selector: 'app-live-transcribe',
  templateUrl: './live-transcribe.component.html',
  styleUrls: ['./live-transcribe.component.scss']
})
export class LiveTranscribeComponent implements OnInit, OnDestroy {

  liveTranscript: string = '';
  isLiveTranscribing: boolean = false;
  showSettingsModal: boolean = false;

  private transcriptSubscription!: Subscription;
  private lastTranscriptLength: number = 0;

  private audioContext: AudioContext | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;

  // How many seconds per chunk you want
  private chunkDurationSec = 5;

  // leftover buffer that we’ll keep appending new samples to
  private leftover: Float32Array = new Float32Array();
  private sampleRate = 16000; // set after AudioContext is created

  constructor(public transcriberService: TranscriberService) {}

  ngOnInit(): void {
    // Subscribe to transcripts from the transcriberService
    this.transcriptSubscription = this.transcriberService.transcript$.subscribe(output => {
      if (output && output.text) {
        const newText = output.text;
        const incremental = newText.slice(this.lastTranscriptLength);
        if (incremental) {
          this.liveTranscript += incremental + '\n';
        }
        this.lastTranscriptLength = newText.length;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.transcriptSubscription) {
      this.transcriptSubscription.unsubscribe();
    }
    this.stopLiveTranscription();
  }

  async startLiveTranscription(): Promise<void> {
    try {
      // Request mic permission
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create AudioContext (forcing 16 kHz may cause silence in some environments)
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.sampleRate = this.audioContext.sampleRate;

      // Load our audio worklet processor script
      // Make sure the path matches where Angular serves it
      await this.audioContext.audioWorklet.addModule('../../../assets/recorder-processor.js');

      // Create AudioWorkletNode
      this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'recorder-processor');

      // Listen for Float32Array chunks from the processor
      this.leftover = new Float32Array(); // reset leftover
      const chunkSampleCount = Math.floor(this.sampleRate * this.chunkDurationSec);

      this.audioWorkletNode.port.onmessage = (event) => {
        const incoming = event.data as Float32Array;
        if (!incoming || incoming.length === 0) {
          return;
        }
        // Append to leftover
        this.leftover = this.appendFloat32Array(this.leftover, incoming);

        // While leftover is at least chunkSampleCount, slice out a chunk
        while (this.leftover.length >= chunkSampleCount) {
          // 1) Take the first chunkSampleCount samples
          const chunkData = this.leftover.slice(0, chunkSampleCount);

          // 2) Remove them from leftover
          this.leftover = this.leftover.slice(chunkSampleCount);

          // 3) Convert chunkData -> AudioBuffer
          const audioBuffer = this.float32ToAudioBuffer(chunkData, this.sampleRate);

          // 4) Send to transcriber
          this.transcriberService.start(audioBuffer);
        }
      };

      // Create MediaStreamAudioSource
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);

      // Connect the mic to our worklet node
      this.mediaStreamSource.connect(this.audioWorkletNode);

      // (Optional) hear yourself
      // this.audioWorkletNode.connect(this.audioContext.destination);

      this.isLiveTranscribing = true;

    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  }

  
  async startLiveTranscriptionWithInterval(): Promise<void>{
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    let audioChunks: Blob[] = [];
  
    const startRecording = () => {
        if (!this.stream) {
            console.error('No media stream available');
            return;
          }
      const freshStream = new MediaStream(this.stream);
        const mediaRecorder = new MediaRecorder(freshStream, { mimeType: 'audio/webm' });
  
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
  
        mediaRecorder.onstop = async () => {
  
            if (audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                audioChunks = [];
  
                try {
                    const audioData = await audioBlob.arrayBuffer();
                    const float32Data = await this.decodeAndResampleAudio(audioData, 16000);
                    const audioBuffer = this.float32ToAudioBuffer(float32Data, 16000);
                    this.transcriberService.start(audioBuffer);
                } catch (error) {
                    console.error('❌ Transcription failed:', error);
                }
            }

            if (freshStream.active) {
                startRecording();
            }
        };
  
        mediaRecorder.start();
        setTimeout(() => mediaRecorder.stop(), 3000);
    };
  
    startRecording();
  }

  private async decodeAndResampleAudio(audioData: ArrayBuffer, targetSampleRate: number): Promise<Float32Array> {
    const tempAudioContext = new AudioContext();
    try {
        const decodedBuffer = await tempAudioContext.decodeAudioData(audioData);
        
        // Create mono buffer by mixing all channels
        const monoBuffer = tempAudioContext.createBuffer(
            1,
            decodedBuffer.length,
            decodedBuffer.sampleRate
        );
        const monoData = new Float32Array(decodedBuffer.length);
        
        // Mix all channels
        for (let channel = 0; channel < decodedBuffer.numberOfChannels; channel++) {
            const channelData = decodedBuffer.getChannelData(channel);
            for (let i = 0; i < channelData.length; i++) {
                monoData[i] += channelData[i];
            }
        }
        
        // Average the channels
        monoData.forEach((val, index) => {
            monoData[index] = val / decodedBuffer.numberOfChannels;
        });
        
        monoBuffer.copyToChannel(monoData, 0);

        // Resample using OfflineAudioContext
        const offlineContext = new OfflineAudioContext(
            1,
            Math.ceil(decodedBuffer.duration * targetSampleRate),
            targetSampleRate
        );

        const bufferSource = offlineContext.createBufferSource();
        bufferSource.buffer = monoBuffer;
        bufferSource.connect(offlineContext.destination);
        bufferSource.start(0);

        const renderedBuffer = await offlineContext.startRendering();
        return renderedBuffer.getChannelData(0);
    } finally {
        tempAudioContext.close();
    }
}


  /**
   * Stop the real-time transcription
   * Flush any leftover partial chunk that hasn't reached 5 seconds
   */
  stopLiveTranscription(): void {
    // If we have leftover samples, send them now
    if (this.leftover && this.leftover.length > 0) {
      const audioBuffer = this.float32ToAudioBuffer(this.leftover, this.sampleRate);
      this.transcriberService.start(audioBuffer);
    }

    // Disconnect & cleanup
    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }

    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.isLiveTranscribing = false;
  }

  toggleLiveTranscription(): void {
    if (this.isLiveTranscribing) {
      this.stopLiveTranscription();
    } else {
      this.startLiveTranscription();
    }
  }

  onSettingsTileClick(): void {
    this.showSettingsModal = true;
  }

  onSettingsModalClose(): void {
    this.showSettingsModal = false;
  }

  onSettingsModalSubmit(): void {
    this.showSettingsModal = false;
  }

  /**
   * Append one Float32Array to another
   */
  private appendFloat32Array(a: Float32Array, b: Float32Array): Float32Array {
    const c = new Float32Array(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
  }

  /**
   * Convert a Float32Array to an AudioBuffer at the given sample rate
   */
  private float32ToAudioBuffer(floatData: Float32Array, rate: number): AudioBuffer {
    if (!this.audioContext) {
      // fallback approach if context is gone
      const offlineContext = new OfflineAudioContext(1, floatData.length, rate);
      const buffer = offlineContext.createBuffer(1, floatData.length, rate);
      buffer.copyToChannel(floatData, 0);
      return buffer;
    }

    const buffer = this.audioContext.createBuffer(1, floatData.length, rate);
    buffer.copyToChannel(floatData, 0, 0);
    return buffer;
  }
}
