import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { take } from 'rxjs';

import { AppService } from '../../core/services/app.service';
import { SEOService } from '../../core/services/seo.service';
import { ModalService } from '../../shared/services/modal.service';
import { CarCardComponent } from '../../shared/components/car-card/car-card.component';

interface LifestylePreset {
  id: string;
  title: string;
  tag: string;
  patch: Partial<FilterFormValue>;
}

interface FilterFormValue {
  brand: string | null;
  priceMax: number;
  mileageMax: number;
  fuel: string[];
  drive: string[];
  gearbox: string[];
  lifestyle: string[];
}

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CarCardComponent],
  templateUrl: './catalog.page.html',
  styleUrl: './catalog.page.scss'
})
export class CatalogPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly appService = inject(AppService);
  private readonly seoService = inject(SEOService);
  protected readonly modalService = inject(ModalService);

  protected filters!: FormGroup;
  protected isLoading = signal(true);
  protected cars = signal<any[]>([]);
  protected pagination = signal<any | null>(null);
  protected brands = signal<{ title: string; count: number }[]>([]);
  protected filtersOpen = signal(false);
  protected currentPage = signal(1);

  protected readonly lifestylePresets: LifestylePreset[] = [
    {
      id: 'electric',
      title: 'Электро и гибрид',
      tag: 'Для города',
      patch: { fuel: ['Электро', 'Гибрид', 'Гибрид (HEV)', 'Гибрид (PHEV)'] }
    },
    {
      id: 'awd',
      title: 'Полный привод',
      tag: 'Для путешествий',
      patch: { drive: ['Полный'] }
    },
    {
      id: 'comfort',
      title: 'Комфорт',
      tag: 'Для семьи',
      patch: { gearbox: ['Автомат', 'Вариатор'], fuel: ['Бензин', 'Дизель'] }
    },
    {
      id: 'driver',
      title: 'Спорт',
      tag: 'Для драйва',
      patch: { gearbox: ['Автомат', 'Робот'], fuel: ['Бензин'], mileageMax: 60000 }
    }
  ];

  ngOnInit(): void {
    this.seoService.setSEO('search');

    this.filters = this.fb.group({
      brand: [null as string | null],
      priceMax: [3500000],
      mileageMax: [120000],
      fuel: [[] as string[]],
      drive: [[] as string[]],
      gearbox: [[] as string[]],
      lifestyle: [[] as string[]]
    });

    this.loadBrands();
    // На десктопе фильтры применяются автоматически, на мобильных - по кнопке
    this.filters.valueChanges.subscribe(() => {
      if (typeof window !== 'undefined' && window.innerWidth > 768) {
        this.currentPage.set(1); // Сбрасываем на первую страницу при изменении фильтров
        this.query();
      }
    });
    this.query();
  }

  togglePreset(preset: LifestylePreset): void {
    const lifestyle = new Set(this.filters.value.lifestyle ?? []);
    if (lifestyle.has(preset.id)) {
      lifestyle.delete(preset.id);
    } else {
      lifestyle.add(preset.id);
      this.filters.patchValue(preset.patch, { emitEvent: false });
    }
    this.filters.patchValue({ lifestyle: Array.from(lifestyle) });
  }

  resetFilters(): void {
    this.filters.reset({
      brand: null,
      priceMax: 3500000,
      mileageMax: 120000,
      fuel: [],
      drive: [],
      gearbox: [],
      lifestyle: []
    });
    this.currentPage.set(1);
    this.query();
  }

  isSelected(control: 'fuel' | 'drive' | 'gearbox', option: string): boolean {
    const value = this.filters.value[control] ?? [];
    return Array.isArray(value) && value.includes(option);
  }

  toggleMulti(control: 'fuel' | 'drive' | 'gearbox', option: string, checked: boolean): void {
    const current = new Set(this.filters.value[control] ?? []);
    if (checked) current.add(option);
    else current.delete(option);
    this.filters.patchValue({ [control]: Array.from(current) } as Partial<FilterFormValue>);
  }

  toggleFilters(): void {
    this.filtersOpen.update(v => !v);
  }

  closeFilters(): void {
    this.filtersOpen.set(false);
  }

  applyFilters(): void {
    this.currentPage.set(1); // Сбрасываем на первую страницу при применении фильтров
    this.query();
    this.closeFilters();
  }

  getActiveFiltersCount(): number {
    const value = this.filters.value;
    let count = 0;
    if (value.brand) count++;
    if (value.fuel?.length) count += value.fuel.length;
    if (value.drive?.length) count += value.drive.length;
    if (value.gearbox?.length) count += value.gearbox.length;
    if (value.lifestyle?.length) count += value.lifestyle.length;
    if (value.priceMax !== 3500000) count++;
    if (value.mileageMax !== 120000) count++;
    return count;
  }

  getPageNumbers(): number[] {
    const pagination = this.pagination();
    if (!pagination) return [];
    
    const current = this.currentPage();
    const total = pagination.totalPages;
    const pages: number[] = [];
    
    // Показываем максимум 5 страниц вокруг текущей
    let start = Math.max(1, current - 2);
    let end = Math.min(total, current + 2);
    
    // Если мы близко к началу, показываем первые страницы
    if (current <= 3) {
      start = 1;
      end = Math.min(5, total);
    }
    
    // Если мы близко к концу, показываем последние страницы
    if (current >= total - 2) {
      start = Math.max(1, total - 4);
      end = total;
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  private loadBrands(): void {
    this.appService
      .getBrandsAndModelsWithCount()
      .pipe(take(1))
      .subscribe({
        next: (items: any[]) => {
          const mapped = items.map((item) => ({ title: item.title, count: item.count }));
          this.brands.set(mapped);
        },
        error: () => this.brands.set([])
      });
  }

  goToPage(page: number): void {
    const pagination = this.pagination();
    if (!pagination) return;
    
    if (page >= 1 && page <= pagination.totalPages) {
      this.currentPage.set(page);
      this.query();
      // Прокрутка вверх при смене страницы
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  nextPage(): void {
    const pagination = this.pagination();
    if (pagination?.hasNext) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    const pagination = this.pagination();
    if (pagination?.hasPrev) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  private query(): void {
    const value = this.filters.value as FilterFormValue;

    const payload: any = {
      priceEnd: value.priceMax,
      mileageEnd: value.mileageMax,
      fuel: value.fuel?.length ? value.fuel : undefined,
      drive: value.drive?.length ? value.drive : undefined,
      gearbox: value.gearbox?.length ? value.gearbox : undefined
    };

    if (value.brand) payload.brand = value.brand;

    this.isLoading.set(true);

    this.appService
      .searchCars({
        ...payload,
        page: this.currentPage(),
        limit: 12
      })
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const cars = response.cars?.filter((car: any) => !car.deletedAt) ?? [];
          this.cars.set(cars);
          this.pagination.set(response.pagination ?? null);
          this.isLoading.set(false);
        },
        error: () => {
          this.cars.set([]);
          this.pagination.set(null);
          this.isLoading.set(false);
        }
      });
  }
}
