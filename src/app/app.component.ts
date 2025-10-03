import { Component, OnInit } from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { SpeedTestService } from 'ng-speed-test';
import { TranscriberService } from './services/transcriber.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'speed-and-device-details';
  
  deviceInfo: any;
  orientation: string = '';
  downloadSpeed: string | null = null;
  uploadSpeed: string | null = null;

  constructor(
    private deviceService: DeviceDetectorService,
    private speedTestService: SpeedTestService,
    public transcriber: TranscriberService
  ) {}

  ngOnInit() {
    //uncomment this
    // Get device details
    // this.deviceInfo = this.deviceService.getDeviceInfo();
    // console.log(this.deviceInfo);
    // this.orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';

    // // Get download speed with error handling
    // this.speedTestService.getMbps().subscribe({ 
    //   next: (speed: number) => {
    //     this.downloadSpeed = speed.toFixed(2);
    //   },
    //   error: (err: any) => {
    //     console.error('Error fetching download speed:', err);
    //     this.downloadSpeed = 'Error';
    //   }
    // });

    // Get upload speed with error handling
    // this.speedTestService.getUploadMbps$().subscribe({ // Correct method name might be `getUploadMbps$()`
    //   next: (speed: number) => {
    //     this.uploadSpeed = speed.toFixed(2);
    //   },
    //   error: (err: any) => {  // Added typing for `err`
    //     console.error('Error fetching upload speed:', err);
    //     this.uploadSpeed = 'Error';
    //   }
    // });
    //uncomment this
    // this.speedTestService.isOnline().subscribe(
    //   (isOnline) => {
    //     if (isOnline === false) {
    //       console.log('Network unavailable.');
    //     }
    //   }
    // );
  }

  isDesktop(): boolean {
    return this.deviceService.isDesktop();
  }

  isMobile(): boolean {
    return this.deviceService.isMobile();
  }

  isTablet(): boolean {
    return this.deviceService.isTablet();
  }
  // src/app/app.component.ts
  isModalOpen = false;

  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  submitModal() {
    console.log('Modal submitted!');
    this.isModalOpen = false;
  }
}

