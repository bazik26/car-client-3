import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideChatWidget } from '@cars/chat-widget-lib';
import { environment } from '../environments/environment';
import { BRAND_CONFIG } from './core/constants/brand';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),
    provideChatWidget({
      apiUrl: environment.API_URL,
      projectId: environment.PROJECT_ID as 'office_1' | 'office_2',
      brand: {
        name: BRAND_CONFIG.name,
        shortName: BRAND_CONFIG.shortName
      },
      projectSource: 'car-market-client'
    })
  ]
};
