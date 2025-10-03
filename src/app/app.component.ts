import { Component } from '@angular/core';
import { TranscriberService } from './services/transcriber.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  
  deviceInfo: any;
  orientation: string = '';
  downloadSpeed: string | null = null;
  uploadSpeed: string | null = null;

  constructor(
    public transcriber: TranscriberService
  ) {}

}

