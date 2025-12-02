import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private readonly _isContactModalOpen = signal(false);

  readonly isContactModalOpen = this._isContactModalOpen.asReadonly();

  openContactModal(): void {
    this._isContactModalOpen.set(true);
    // Блокируем скролл body
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }

  closeContactModal(): void {
    this._isContactModalOpen.set(false);
    // Восстанавливаем скролл body
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }
}

