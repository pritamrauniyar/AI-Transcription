import { 
  Component, 
  Input, 
  ViewChild, 
  ElementRef, 
  OnChanges, 
  SimpleChanges, 
  AfterViewInit 
} from '@angular/core';

@Component({
  selector: 'app-audio-player',
  templateUrl: './audio-player.component.html',
  styleUrls: ['./audio-player.component.scss']
})
export class AudioPlayerComponent implements OnChanges, AfterViewInit {
  @Input() audioUrl: string = '';
  @Input() mimeType: string = '';

  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;
  @ViewChild('audioSource') audioSource!: ElementRef<HTMLSourceElement>;

  ngAfterViewInit(): void {
    // Ensure the audio is loaded after the view initializes.
    this.updateAudioSource();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // If the audioUrl changes, update the source and reload the audio.
    if (changes['audioUrl'] && !changes['audioUrl'].firstChange) {
      this.updateAudioSource();
    }
  }

  updateAudioSource(): void {
    if (this.audioPlayer && this.audioSource) {
      // Update the <source> element's src attribute.
      this.audioSource.nativeElement.src = this.audioUrl;
      // Call load() on the audio element to update the media.
      this.audioPlayer.nativeElement.load();
    }
  }
}
