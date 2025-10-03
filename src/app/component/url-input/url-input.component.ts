// src/app/url-input/url-input.component.ts
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-url-input',
  templateUrl: './url-input.component.html',
  styleUrls: ['./url-input.component.scss']
})
export class UrlInputComponent {
  @Input() placeholder: string = 'www.example.com';
  @Input() required: boolean = true;
  @Input() value: string = '';
  @Input() disabled: boolean = false;
  @Input() name: string = '';
  // Add additional inputs as needed
}
