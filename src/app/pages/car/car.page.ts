import { CommonModule, CurrencyPipe, DatePipe, NgOptimizedImage } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, switchMap } from 'rxjs';

import { AppService } from '../../core/services/app.service';
import { SEOService } from '../../core/services/seo.service';
import { BRAND_CONFIG } from '../../core/constants/brand';

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

  protected readonly brand = BRAND_CONFIG;
  protected car = signal<any | null>(null);
  protected gallery = computed(() => {
    const car = this.car();
    if (!car?.files?.length) {
      return ['/assets/placeholder/car-dark.svg'];
    }
    return car.files.map((file: any) => this.appService.getFileUrl(file));
  });
  protected activeImage = signal(0);
  protected heroImage = computed(() => {
    const images = this.gallery();
    const index = this.activeImage();
    return images[Math.max(0, Math.min(index, images.length - 1))];
  });

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

  selectImage(index: number): void {
    this.activeImage.set(index);
  }
}
