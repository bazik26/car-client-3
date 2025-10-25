import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AppService } from '../../core/services/app.service';
import { SEOService } from '../../core/services/seo.service';
import { BRAND_CONFIG } from '../../core/constants/brand';

@Component({
  selector: 'app-contacts-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contacts.page.html',
  styleUrl: './contacts.page.scss'
})
export class ContactsPage {
  private readonly fb = inject(FormBuilder);
  private readonly appService = inject(AppService);
  private readonly seoService = inject(SEOService);

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

  constructor() {
    this.seoService.setSEO('contacts');
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
      },
      error: () => {
        this.sending = false;
      }
    });
  }
}
