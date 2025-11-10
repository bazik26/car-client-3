import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { AppService } from '../../core/services/app.service';
import { SEOService } from '../../core/services/seo.service';
import { BRAND_CONFIG } from '../../core/constants/brand';

import { CarCardComponent } from '../../shared/components/car-card/car-card.component';

interface ShowcaseFilter {
  id: string;
  title: string;
  subtitle: string;
  predicate: (car: any) => boolean;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink, CarCardComponent, NgOptimizedImage],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss'
})
export class HomePage implements OnInit {
  private readonly appService = inject(AppService);
  private readonly seoService = inject(SEOService);

  protected readonly brand = BRAND_CONFIG;
  protected isLoading = signal(true);
  protected highlighted = signal<any[]>([]);
  protected popular = signal<any[]>([]);
  protected soldRecently = signal<any[]>([]);
  protected bestOffer = signal<any>(null);
  protected fallbackCar = signal<any>(null);

  protected showcaseFilters: ShowcaseFilter[] = [
    {
      id: 'city',
      title: 'Городской такт',
      subtitle: 'Компактные гибриды и бензиновые авто до 2 литров',
      predicate: (car) => (car.engine ?? 0) <= 2.0 && ['Гибрид', 'Гибрид (HEV)', 'Бензин'].includes(car.fuel || '')
    },
    {
      id: 'family',
      title: 'Для семьи',
      subtitle: 'Кроссоверы и минивэны с просторным салоном',
      predicate: (car) => ['Кроссовер', 'Минивэн', 'Внедорожник'].some(type => (car.bodyType || '').includes(type)) || (car.group1 || []).includes('Третий ряд сидений')
    },
    {
      id: 'executive',
      title: 'Бизнес-класс',
      subtitle: 'Седаны и купе с мощностью от 250 л.с.',
      predicate: (car) => (car.powerValue ?? 0) >= 250
    }
  ];

  protected selectedFilter = signal<ShowcaseFilter | null>(this.showcaseFilters[0]);

  protected filteredCars = computed(() => {
    const filter = this.selectedFilter();
    const cars = this.highlighted();

    if (!filter) return cars;
    const filtered = cars.filter((car) => filter.predicate(car));
    return filtered.length ? filtered : cars;
  });

  ngOnInit(): void {
    this.seoService.setSEO('home');

    this.appService
      .getCars({ limit: 50, sortBy: 'createdAt', sortOrder: 'DESC' })
      .pipe(take(1))
      .subscribe({
        next: (cars) => {
          const available = cars.filter((car) => !car.isSold && !car.deletedAt);
          this.highlighted.set(available.slice(0, 12));
          this.popular.set(this.shuffle(available).slice(0, 8));
          
          // Находим лучшее предложение
          const bestOffer = this.findBestOffer(available);
          this.bestOffer.set(bestOffer);
          
          this.isLoading.set(false);
        },
        error: () => {
          this.highlighted.set([]);
          this.popular.set([]);
          this.bestOffer.set(null);
          this.isLoading.set(false);
        }
      });

    this.appService
      .getSoldCars(12)
      .pipe(take(1))
      .subscribe({
        next: (cars) => {
          this.soldRecently.set(cars.slice(0, 8));
          // Устанавливаем fallback из проданных машин
          if (cars.length > 0) {
            this.fallbackCar.set(cars[0]);
          }
        },
        error: () => this.soldRecently.set([])
      });
  }

  selectFilter(filter: ShowcaseFilter) {
    this.selectedFilter.set(filter);
  }

  formatPrice(price: number | string): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (!numPrice || isNaN(numPrice)) return 'Цена по запросу';
    
    if (numPrice >= 1000000) {
      return `${(numPrice / 1000000).toFixed(1)}M ₽`;
    } else if (numPrice >= 1000) {
      return `${(numPrice / 1000).toFixed(0)}K ₽`;
    } else {
      return `${numPrice.toLocaleString('ru-RU')} ₽`;
    }
  }

  getCarFeatures(car: any): string {
    if (!car) return '';
    
    const features = [];
    
    // Привод
    if (car.drive) {
      features.push(car.drive);
    }
    
    // Пробег
    if (car.mileage) {
      const mileage = parseInt(car.mileage);
      if (mileage < 1000) {
        features.push(`${mileage} км`);
      } else {
        features.push(`${(mileage / 1000).toFixed(0)}K км`);
      }
    }
    
    // Двигатель
    if (car.engine) {
      features.push(`${car.engine}л`);
    }
    
    // Топливо
    if (car.fuel) {
      features.push(car.fuel);
    }
    
    // Местоположение
    if (car.location) {
      features.push(`В наличии в ${car.location}`);
    }
    
    return features.join(' • ') || 'Подробности уточняйте';
  }

  private findBestOffer(cars: any[]): any | null {
    if (!cars.length) return null;

    const currentYear = new Date().getFullYear();
    
    // Сначала ищем идеальные предложения
    let candidates = cars.filter(car => {
      const year = parseInt(car.year) || 0;
      const price = parseFloat(car.price) || 0;
      const mileage = parseInt(car.mileage) || 0;
      
      return year >= currentYear - 2 && 
             price > 500000 && price < 15000000 && 
             mileage <= 30000 &&
             !car.isAccident;
    });

    // Если нет идеальных, ищем хорошие предложения
    if (!candidates.length) {
      candidates = cars.filter(car => {
        const year = parseInt(car.year) || 0;
        const price = parseFloat(car.price) || 0;
        const mileage = parseInt(car.mileage) || 0;
        
        return year >= currentYear - 4 && 
               price > 300000 && price < 20000000 && 
               mileage <= 80000 &&
               !car.isAccident;
      });
    }

    // Если все еще нет, берем любые свежие машины
    if (!candidates.length) {
      candidates = cars.filter(car => {
        const year = parseInt(car.year) || 0;
        return year >= currentYear - 5 && !car.isAccident;
      });
    }

    // Если совсем ничего нет, берем любую машину
    if (!candidates.length) {
      candidates = cars;
    }

    // Сортируем по алгоритму "выгодности"
    return candidates.sort((a, b) => {
      const yearA = parseInt(a.year) || 0;
      const yearB = parseInt(b.year) || 0;
      const priceA = parseFloat(a.price) || 0;
      const priceB = parseFloat(b.price) || 0;
      const mileageA = parseInt(a.mileage) || 0;
      const mileageB = parseInt(b.mileage) || 0;
      
      // Алгоритм оценки:
      // 1. Свежесть (год) - 40% веса
      // 2. Низкий пробег - 30% веса  
      // 3. Разумная цена - 20% веса
      // 4. Популярная марка - 10% веса
      
      const popularBrands = ['BMW', 'Mercedes', 'Audi', 'Toyota', 'Lexus', 'Porsche'];
      const brandBonusA = popularBrands.includes(a.brand) ? 50 : 0;
      const brandBonusB = popularBrands.includes(b.brand) ? 50 : 0;
      
      const scoreA = (yearA * 40) - (mileageA / 1000) - (priceA / 100000) + brandBonusA;
      const scoreB = (yearB * 40) - (mileageB / 1000) - (priceB / 100000) + brandBonusB;
      
      return scoreB - scoreA;
    })[0];
  }

  private shuffle<T>(items: T[]): T[] {
    return items
      .map((item) => ({ item, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ item }) => item);
  }

  getCarImageUrl(car: any): string {
    if (!car) return '/assets/placeholder/car-dark.svg';
    const files = car.files || car.images || [];
    if (files.length === 0) return '/assets/placeholder/car-dark.svg';
    const firstFile = files[0];
    if (typeof firstFile === 'string') {
      return this.appService.getFileUrl(firstFile, car.id);
    }
    return this.appService.getFileUrl(firstFile, car.id) || '/assets/placeholder/car-dark.svg';
  }

  getDiscountedPrice(price: number, discountPercent: number): number {
    if (!price) return 0;
    return Math.round(price * (1 - discountPercent / 100));
  }
}
