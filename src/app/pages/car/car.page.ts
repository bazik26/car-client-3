import { CommonModule, CurrencyPipe, DatePipe, NgOptimizedImage } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, switchMap } from 'rxjs';

import { AppService } from '../../core/services/app.service';
import { SEOService } from '../../core/services/seo.service';
import { BRAND_CONFIG } from '../../core/constants/brand';
import { ModalService } from '../../shared/services/modal.service';

@Component({
  selector: 'app-car-page',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, NgOptimizedImage, DatePipe],
  templateUrl: './car.page.html',
  styleUrl: './car.page.scss'
})
export class CarPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly appService = inject(AppService);
  private readonly seoService = inject(SEOService);
  protected readonly modalService = inject(ModalService);

  protected readonly brand = BRAND_CONFIG;
  protected car = signal<any | null>(null);
  protected gallery = computed(() => {
    const car = this.car();
    if (!car) {
      return ['/assets/placeholder/car-dark.svg'];
    }

    // Проверяем оба варианта для совместимости
    const files = car.files || car.images || [];
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return ['/assets/placeholder/car-dark.svg'];
    }

    const carId = car.id;
    return files
      .map((file: any) => {
        // Если это строка
        if (typeof file === 'string') {
          const trimmedPath = file.trim();
          return trimmedPath ? this.appService.getFileUrl(trimmedPath, carId) : null;
        }
        // Если это объект
        if (typeof file === 'object' && file !== null) {
          return this.appService.getFileUrl(file, carId);
        }
        return null;
      })
      .filter((url: string | null) => url !== null && url !== '') as string[];
  });
  protected activeImage = signal(0);
  protected imageErrors = signal<Set<number>>(new Set());
  
  // Для свайп-жестов
  private touchStartX = 0;
  private touchStartY = 0;
  private touchEndX = 0;
  private touchEndY = 0;
  private minSwipeDistance = 50;
  
  protected heroImage = computed(() => {
    const images = this.gallery();
    const index = this.activeImage();
    const imageUrl = images[Math.max(0, Math.min(index, images.length - 1))];
    
    // Если текущее изображение с ошибкой, показываем placeholder
    if (this.imageErrors().has(index)) {
      return '/assets/placeholder/car-dark.svg';
    }
    
    return imageUrl || '/assets/placeholder/car-dark.svg';
  });

  onImageError(index: number) {
    this.imageErrors.update(errors => new Set([...errors, index]));
  }

  selectImage(index: number): void {
    this.activeImage.set(index);
    // Убираем ошибку при выборе нового изображения
    this.imageErrors.update(errors => {
      const newErrors = new Set(errors);
      newErrors.delete(index);
      return newErrors;
    });
  }

  // Навигация по изображениям
  nextImage(): void {
    const images = this.gallery();
    if (images.length > 0) {
      const current = this.activeImage();
      const next = (current + 1) % images.length;
      this.selectImage(next);
    }
  }

  prevImage(): void {
    const images = this.gallery();
    if (images.length > 0) {
      const current = this.activeImage();
      const prev = current === 0 ? images.length - 1 : current - 1;
      this.selectImage(prev);
    }
  }

  // Обработчики для свайп-жестов
  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].screenX;
    this.touchStartY = event.changedTouches[0].screenY;
  }

  onTouchEnd(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0].screenX;
    this.touchEndY = event.changedTouches[0].screenY;
    this.handleSwipe();
  }

  private handleSwipe(): void {
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Проверяем, что свайп горизонтальный и достаточно длинный
    if (absDeltaX > this.minSwipeDistance && absDeltaX > absDeltaY) {
      if (deltaX > 0) {
        // Свайп вправо - предыдущее изображение
        this.prevImage();
      } else {
        // Свайп влево - следующее изображение
        this.nextImage();
      }
    }
  }

  protected featureGroups = computed(() => {
    const car = this.car();
    if (!car) return [];

    const groups: Array<{ title: string; features: string[] }> = [];

    const pushGroup = (title: string, values: Array<string | null | undefined>) => {
      const normalized = values.flatMap((value) => {
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
      });
      if (normalized.length) {
        groups.push({ title, features: Array.from(new Set(normalized)) });
      }
    };

    pushGroup('Комфорт и интерьер', [
      car.conditionerType,
      car.windowLifter,
      car.interiorMaterials,
      car.interiorColor,
      car.powerSteering,
      ...(car.group1 ?? [])
    ]);

    pushGroup('Безопасность и ассистенты', [
      ...(car.group5 ?? []),
      ...(car.group8 ?? [])
    ]);

    pushGroup('Экстерьер и оптика', [car.headlights, ...(car.group4 ?? []), ...(car.group7 ?? [])]);

    pushGroup('Дополнительно', [
      car.spareWheel,
      ...(car.group9 ?? []),
      car.memorySeatModule,
      car.seatHeated,
      car.seatVentilation
    ]);

    return groups;
  });

  private sub?: Subscription;

  ngOnInit(): void {
    this.sub = this.route.paramMap
      .pipe(switchMap((params) => this.appService.getCar(params.get('id') as string)))
      .subscribe({
        next: (car) => {
          this.car.set(car);
          this.activeImage.set(0);
          this.seoService.setSEO('car', {
            brand: car.brand,
            model: car.model,
            year: car.year,
            price: car.price?.toLocaleString('ru-RU'),
            mileage: car.mileage?.toLocaleString('ru-RU'),
            id: car.id
          });
        },
        error: () => {
          this.car.set(null);
        }
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
