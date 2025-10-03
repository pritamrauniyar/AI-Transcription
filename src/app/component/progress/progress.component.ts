import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-progress',
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.scss']
})
export class ProgressComponent implements OnInit {
  // Inputs for the progress text and percentage
  @Input() text: string = '';
  @Input() percentage: number = 0;

  constructor() { }

  ngOnInit(): void {
    // Ensure percentage is not undefined
    if (this.percentage == null) {
      this.percentage = 0;
    }
  }
}
