import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DeviceDetectorService } from 'ngx-device-detector';
import { SpeedTestModule } from 'ng-speed-test';
import { ModalComponent } from './component/modal/modal.component';
import { UrlInputComponent } from './component/url-input/url-input.component';
import { AudioManagerComponent } from './component/audio-manager/audio-manager.component';
import { HttpClientModule } from '@angular/common/http';
import { AudioPlayerComponent } from './component/audio-player/audio-player.component';
import { AudioRecorderComponent } from './component/audio-recorder/audio-recorder.component';
import { ProgressComponent } from './component/progress/progress.component';
import { TranscribeButtonComponent } from './component/transcribe-button/transcribe-button.component';
import { TranscriptComponent } from './component/transcript/transcript.component';
import { FormsModule } from '@angular/forms';
import { LiveTranscribeComponent } from './component/live-transcribe/live-transcribe.component';

@NgModule({
  declarations: [
    AppComponent,
    ModalComponent,
    UrlInputComponent,
    AudioManagerComponent,
    AudioPlayerComponent,
    AudioRecorderComponent,
    ProgressComponent,
    TranscribeButtonComponent,
    TranscriptComponent,
    LiveTranscribeComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    SpeedTestModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [
    DeviceDetectorService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
