import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AppService } from '../../../core/services/app.service';

@Component({
  selector: 'app-car-card',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, NgOptimizedImage],
  templateUrl: './car-card.component.html',
  styleUrl: './car-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CarCardComponent {
  private readonly appService = inject(AppService);

  private readonly _car = signal<any | null>(null);

  @Input()
  set car(value: any) {
    this._car.set(value);
    // Сбрасываем ошибку при изменении автомобиля
    this.imageError.set(false);
  }

  get car() {
    return this._car();
  }

  heroImage = computed(() => {
    const car = this._car();
    if (!car) {
      return '/assets/placeholder/car-dark.svg';
    }

    // Проверяем оба варианта для совместимости
    const files = car.files || car.images || [];
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return '/assets/placeholder/car-dark.svg';
    }

    const firstFile = files[0];
    
    // Если это строка (старый формат)
    if (typeof firstFile === 'string') {
      const trimmedPath = firstFile.trim();
      if (!trimmedPath) {
        return '/assets/placeholder/car-dark.svg';
      }
      return this.appService.getFileUrl(trimmedPath, car.id);
    }

    // Если это объект с path/filename
    if (typeof firstFile === 'object' && firstFile !== null) {
      const url = this.appService.getFileUrl(firstFile, car.id);
      return url || '/assets/placeholder/car-dark.svg';
    }

    return '/assets/placeholder/car-dark.svg';
  });

  imageError = signal(false);

  onImageError() {
    this.imageError.set(true);
  }

  getImageSrc(): string {
    if (this.imageError()) {
      return '/assets/placeholder/car-dark.svg';
    }
    return this.heroImage();
  }

  badge = computed(() => {
    const car = this._car();
    if (!car) return null;

    if (car.isSold) return { text: 'Продан', tone: 'sold' };
    if (car.promo) return { text: 'Выгодное предложение', tone: 'promo' };
    if (car.mileage && car.mileage < 15000) return { text: 'Почти новый', tone: 'fresh' };
    return null;
  });

  formatSpec(car: any): string {
    const bits = [car.year, car.engine ? `${car.engine} л` : null, car.powerValue ? `${car.powerValue} л.с.` : null];
    return bits.filter(Boolean).join(' • ');
  }
}
