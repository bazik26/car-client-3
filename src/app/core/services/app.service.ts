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
      // Если path содержит старый домен shop-ytb-client, заменяем на наш API
      if (path.includes('shop-ytb-client.onrender.com')) {
        const relativePath = path.replace(/https?:\/\/shop-ytb-client\.onrender\.com/, '');
        const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
        return `${this.API_URL}${normalizedPath}`;
      }
      // Если полный URL (другой домен) - используем как есть
      if (/^https?:\/\//i.test(path)) {
        return path;
      }
      // Если это путь вида /cars/001918/file.jpg, используем как есть
      if (path.startsWith('/cars/') || path.startsWith('cars/')) {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${this.API_URL}${cleanPath}`;
      }
      // Если это просто имя файла (без слешей) и есть carId, формируем путь с padding
      if (carId && !path.includes('/') && !path.startsWith('images/')) {
        const paddedCarId = String(carId).padStart(6, '0');
        return `${this.API_URL}/cars/${paddedCarId}/${path}`;
      }
      // Fallback: используем как есть (ServeStaticModule раздает файлы из /images по корню)
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return `${this.API_URL}${normalizedPath}`;
    }

    // Если это объект - используем логику как в car-client
    const path = image.path || image.filename || '';

    if (!path) {
      return '';
    }

    // Если path содержит старый домен shop-ytb-client, заменяем на наш API
    if (path.includes('shop-ytb-client.onrender.com')) {
      const relativePath = path.replace(/https?:\/\/shop-ytb-client\.onrender\.com/, '');
      const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
      return `${this.API_URL}${normalizedPath}`;
    }

    // Если полный URL (другой домен) - используем как есть
    if (path.startsWith('http')) {
      return path;
    }

    // Если path уже содержит путь к папке cars, используем как есть
    if (path.includes('cars/') || path.startsWith('/cars/')) {
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `${this.API_URL}${cleanPath}`;
    }

    // Если это просто имя файла (без слешей) и есть carId, формируем путь с padding
    // Файлы находятся в images/cars/001912/filename.jpg, доступны через /cars/001912/filename.jpg
    if (carId && !path.includes('/') && !path.startsWith('images/')) {
      const paddedCarId = String(carId).padStart(6, '0');
      return `${this.API_URL}/cars/${paddedCarId}/${path}`;
    }

    // Относительный путь - добавляем API_URL
    // Убираем 'images/' из начала пути, так как ServeStaticModule раздаёт файлы из /images по корню
    let cleanPath = path;
    if (cleanPath.startsWith('images/')) {
      cleanPath = cleanPath.replace('images/', '');
    }
    const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    return `${this.API_URL}${normalizedPath}`;
  }

  getUnprocessedLeadsCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.API_URL}/leads/stats/unprocessed-count`).pipe(map((res) => res));
  }
}
