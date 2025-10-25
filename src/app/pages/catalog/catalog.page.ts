import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { take } from 'rxjs';

import { AppService } from '../../core/services/app.service';
import { SEOService } from '../../core/services/seo.service';
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

  protected filters!: FormGroup;
  protected isLoading = signal(true);
  protected cars = signal<any[]>([]);
  protected pagination = signal<any | null>(null);
  protected brands = signal<{ title: string; count: number }[]>([]);

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
    this.filters.valueChanges.subscribe(() => this.query());
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
        page: 1,
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
