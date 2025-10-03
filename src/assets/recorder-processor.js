// src/assets/audioWorklet/recorder-processor.js

class RecorderProcessor extends AudioWorkletProcessor {
    process(inputs, outputs) {
      // inputs[0][0] is the mono channel's Float32Array of mic samples
      if (inputs && inputs[0] && inputs[0][0]) {
        // Post the samples to main thread
        this.port.postMessage(inputs[0][0]);
      }
      // Return true to keep processor alive
      return true;
    }
  }
  
  registerProcessor('recorder-processor', RecorderProcessor);
  