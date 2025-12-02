import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AppService } from '../../../core/services/app.service';
import { BRAND_CONFIG } from '../../../core/constants/brand';

@Component({
  selector: 'app-contact-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact-modal.component.html',
  styleUrl: './contact-modal.component.scss'
})
export class ContactModalComponent {
  @Output() close = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly appService = inject(AppService);

  protected readonly brand = BRAND_CONFIG;
  protected sent = false;
  protected sending = false;
  protected form = this.fb.group({
    firstName: ['', Validators.required],
    phone: ['', Validators.required],
    email: ['', [Validators.email]],
    messenger: ['Телефон'],
    message: ['Хочу подобрать автомобиль']
  });

  closeModal(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.sending = true;
    this.appService.contactUs({ ...this.form.value, domain: this.brand.website }).subscribe({
      next: () => {
        this.sending = false;
        this.sent = true;
        this.form.reset({ messenger: 'Телефон' });
        
        // Автоматически закрываем через 3 секунды после успеха
        setTimeout(() => this.closeModal(), 3000);
      },
      error: () => {
        this.sending = false;
      }
    });
  }
}

