# AI Transcription

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.0.6.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## AI-Transcription

AI-Transcription is an Angular-based demo / small app that records or accepts audio (file or URL) and performs live transcription. It includes components for recording, playing back audio, managing uploads, and displaying transcribed text. The project uses the browser Web Audio APIs and a local web-worker for audio processing. It also includes integration points to plug in transcription models or external APIs.

This README explains what the project contains, how to run it locally, and how to integrate the transcription functionality into another app.

## Quick summary

- Framework: Angular 18
- Language: TypeScript
- Purpose: Record or load audio and transcribe it (demo wiring ready; add your choice of transcription model/service)

## Prerequisites

- Node.js (v18+ recommended) and npm installed
- Angular CLI (optional, but handy): npm install -g @angular/cli

## Install

From the project root:

```powershell
npm install
```

## Run (development)

Start the dev server and open http://localhost:4200:

```powershell
npm start
```

Notes:
- The `start` script runs `ng serve` as defined in `package.json`.
- The app will hot-reload on code changes.

## Build (production)

```powershell
npm run build
```

Build output is written to the `dist/` folder.

## Project structure (important files)

- `src/app/component/` - main UI components:
	- `audio-recorder` - UI + logic to capture microphone audio
	- `audio-player` - playback of recorded or loaded audio
	- `audio-manager` - upload / select / manage audio files or URLs
	- `live-transcribe` - component that drives live transcription UI
	- `transcribe-button` - control to start/pause transcription
	- `transcript` - displays transcribed text
	- `url-input` - input component for audio URLs
	- `modal`, `progress` - UI helpers
- `src/app/services/transcriber.service.ts` - main service where transcription integration should be implemented or extended
- `src/assets/recorder-processor.js` - AudioWorklet / recorder processor
- `src/assets/worker.js` - background worker used by audio utilities
- `src/app/utils/` - shared utilities (AudioUtils.ts, BlobFix.ts, Constants.ts, worker.util.ts)

## How it works (high level)

1. The recorder component captures audio using the Web Audio API and an AudioWorklet (`recorder-processor.js`) for low-latency processing.
2. Audio frames are sent to a worker (`worker.js`) or passed into the `TranscriberService` for feature extraction and transcription.
3. The `TranscriberService` exposes an API to start/stop transcription and emits partial/final text results for the UI components to display.

## Integrating transcription (how to plug in your model or API)

The project currently includes wiring and placeholders for transcription. To integrate your own transcription model or remote API:

1. Open `src/app/services/transcriber.service.ts`.
2. Implement or replace the methods that handle audio chunks (for example, `sendAudioChunk`, `start`, `stop`) to forward audio to your model or REST/WS endpoint.
3. Emit transcription results via Observables (the service already uses RxJS subjects — follow the existing pattern so UI components subscribe and update automatically).

Integration options:
- Client-side models: use a WASM or JS model (for example, loading an ONNX or WebNN model) and run inference in the browser. See `@xenova/transformers` in `package.json` for an example dependency used in some demos.
- Remote transcription: stream raw audio (PCM) or encoded audio to your server and return transcribed text. Use WebSocket for low-latency streaming.

Security & performance tips:
- Avoid sending raw audio unencrypted over public networks; use HTTPS/WSS.
- For larger apps, move heavy ML inference to a server with GPU acceleration.

## Using components from another Angular app

If you want to reuse parts of this project in another Angular app:

1. Copy the component directory you need (for example, `audio-recorder`) into your app's `src/app/` tree.
2. Also copy dependencies from `src/app/utils/` and `src/assets/` (the `recorder-processor.js` and `worker.js` files) into your host app's `assets` folder and update paths if necessary.
3. Import and provide `TranscriberService` (or your adapted service) in your host app's module providers.
4. Ensure your host app's Angular version is compatible (Angular 18 recommended). Update styles and module imports (Material/CDK) as needed.

## Development tips

- When changing `recorder-processor.js` or `worker.js` remember the dev server may cache service workers or workers; fully reload the page or restart the dev server if changes aren't picked up.
- Use Chrome/Edge for best Web Audio Worklet support during development.

## Tests

Run unit tests with:

```powershell
npm test
```

## Troubleshooting

- Mic not available: make sure the browser has permission to use the microphone and you're using HTTPS or localhost.
- Audio not transcribing: check console logs, ensure `TranscriberService` integration points are implemented, and verify worker messages in DevTools.
 
 
