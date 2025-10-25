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

  getFileUrl(image: { path?: string; filename?: string }): string {
    if (!image) {
      return '';
    }

    const path = image.path || image.filename || '';

    if (!path) {
      return '';
    }

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.API_URL}${cleanPath}`;
  }
}
