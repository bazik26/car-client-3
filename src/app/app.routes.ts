import { Routes } from '@angular/router';

import { LayoutComponent } from './layout/layout.component';
import { HomePage } from './pages/home/home.page';
import { CatalogPage } from './pages/catalog/catalog.page';
import { CarPage } from './pages/car/car.page';
import { ContactsPage } from './pages/contacts/contacts.page';
import { CityPage } from './pages/city/city.page';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'home',
        component: HomePage
      },
      {
        path: 'catalog',
        component: CatalogPage
      },
      {
        path: 'cars/:id',
        component: CarPage
      },
      {
        path: 'contacts',
        component: ContactsPage
      },
      {
        path: 'city/:slug',
        component: CityPage
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
