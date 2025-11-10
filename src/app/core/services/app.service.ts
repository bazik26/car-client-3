import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AppService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = environment.API_URL;

  getBrandsAndModels(): Observable<any> {
    return this.http.get(`${this.API_URL}/cars/all-brands-and-models`).pipe(map((res) => res));
  }

  getBrandsAndModelsWithCount(): Observable<any> {
    return this.http.get(`${this.API_URL}/cars/brands-and-models-with-count`).pipe(map((res) => res));
  }

  getCars(options: { limit?: number; sortBy?: string; sortOrder?: 'ASC' | 'DESC'; random?: boolean } = {}): Observable<any[]> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      params = params.append(key, String(value));
    });

    return this.http.get<any[]>(`${this.API_URL}/cars`, { params }).pipe(map((cars: any[]) => cars || []));
  }

  searchCars(payload: any): Observable<any> {
    return this.http.post(`${this.API_URL}/cars/search`, payload).pipe(map((res) => res));
  }

  getCar(id: number | string): Observable<any> {
    return this.http.get(`${this.API_URL}/cars/car/${id}`).pipe(map((res) => res));
  }

  getSoldCars(limit = 12): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/cars/sold`, { params: { limit } }).pipe(map((cars) => cars || []));
  }

  contactUs(payload: any): Observable<any> {
    return this.http.post(`${this.API_URL}/contact-us`, payload).pipe(map((res) => res));
  }

  getFileUrl(image: { path?: string; filename?: string; car?: { id?: number } } | string, carId?: number): string {
    if (!image) {
      return '';
    }

    // Если это строка, обрабатываем как путь
    if (typeof image === 'string') {
      const path = image.trim();
      if (!path) {
        return '';
      }
      if (/^https?:\/\//i.test(path)) {
        return path;
      }
      // Если это путь вида /cars/123/images/file.jpg, используем как есть
      if (path.startsWith('/cars/')) {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${this.API_URL}${cleanPath}`;
      }
      // Если это просто filename и есть carId, формируем правильный путь
      // Используем формат /cars/:carId/:filename согласно контроллеру
      if (carId) {
        return `${this.API_URL}/cars/${carId}/${path}`;
      }
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `${this.API_URL}${cleanPath}`;
    }

    // Если это объект
    const filename = image.filename || image.path || '';
    const id = carId || image.car?.id;

    if (!filename) {
      return '';
    }

    // Если это полный URL, возвращаем как есть
    if (/^https?:\/\//i.test(filename)) {
      return filename;
    }

    // Если есть carId, формируем правильный путь к изображению
    // Используем формат /cars/:carId/:filename согласно контроллеру
    if (id) {
      return `${this.API_URL}/cars/${id}/${filename}`;
    }

    // Fallback: используем path как есть
    const cleanPath = filename.startsWith('/') ? filename : `/${filename}`;
    const normalizedPath = cleanPath.replace(/\/+/g, '/');
    
    return `${this.API_URL}${normalizedPath}`;
  }

  getUnprocessedLeadsCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.API_URL}/leads/stats/unprocessed-count`).pipe(map((res) => res));
  }
}
