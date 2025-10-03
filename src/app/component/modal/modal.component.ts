import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent {
  @Input() show: boolean = false;
  @Input() title: string | any = '';
  @Input() content: string | any = '';
  @Input() submitText?: string;
  @Input() submitEnabled: boolean = true;

  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<void>();

  closeModal() {
    this.onClose.emit();
  }

  submitModal() {
    this.onSubmit.emit();
  }
}
