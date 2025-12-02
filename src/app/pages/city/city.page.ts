import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap, take } from 'rxjs';

import { AppService } from '../../core/services/app.service';
import { SEOService } from '../../core/services/seo.service';
import { BRAND_CONFIG } from '../../core/constants/brand';
import { ModalService } from '../../shared/services/modal.service';
import { getCityBySlug } from '../../core/config/cities.config';
import { CarCardComponent } from '../../shared/components/car-card/car-card.component';

@Component({
  selector: 'app-city-page',
  standalone: true,
  imports: [CommonModule, RouterLink, CarCardComponent],
  templateUrl: './city.page.html',
  styleUrl: './city.page.scss'
})
export class CityPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly appService = inject(AppService);
  private readonly seoService = inject(SEOService);
  protected readonly modalService = inject(ModalService);

  protected city = signal(getCityBySlug('kazan'));
  protected cars = signal<any[]>([]);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug') ?? '';
      const city = getCityBySlug(slug) ?? getCityBySlug('kazan');
      this.city.set(city);

      this.seoService.setSEO('city', {
        city: city?.name,
        slug: city?.slug
      });
    });

    this.appService
      .getCars({ limit: 8, random: true })
      .pipe(take(1))
      .subscribe({
        next: (cars) => this.cars.set(cars.filter((car) => !car.deletedAt)),
        error: () => this.cars.set([])
      });
  }
}
