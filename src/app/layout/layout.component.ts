import { Component, HostListener, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { BRAND_CONFIG } from '../core/constants/brand';
import { ChatWidgetComponent } from '../shared/components/chat-widget/chat-widget.component';
import { AppService } from '../core/services/app.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, ChatWidgetComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent implements OnInit, OnDestroy {
  protected readonly brand = BRAND_CONFIG;
  protected isCompactHeader = false;
  protected mobileNav = false;
  protected readonly currentYear = new Date().getFullYear();
  private readonly router = inject(Router);
  private readonly appService = inject(AppService);
  protected unprocessedLeadsCount = signal(0);
  private leadsCheckSubscription?: Subscription;

  ngOnInit(): void {
    // Проверяем количество необработанных лидов сразу
    this.checkUnprocessedLeads();
    
    // Проверяем каждые 30 секунд
    this.leadsCheckSubscription = interval(30000).subscribe(() => {
      this.checkUnprocessedLeads();
    });
  }

  ngOnDestroy(): void {
    if (this.leadsCheckSubscription) {
      this.leadsCheckSubscription.unsubscribe();
    }
  }

  private checkUnprocessedLeads(): void {
    this.appService.getUnprocessedLeadsCount().pipe(
      catchError(() => of({ count: 0 }))
    ).subscribe({
      next: (response) => {
        this.unprocessedLeadsCount.set(response.count || 0);
      }
    });
  }

  @HostListener('window:scroll')
  onScroll() {
    if (typeof window === 'undefined') return;
    this.isCompactHeader = window.scrollY > 12;
  }

  toggleMobileNav(): void {
    this.mobileNav = !this.mobileNav;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = this.mobileNav ? 'hidden' : 'auto';
    }
  }

  closeMobileNav(): void {
    this.mobileNav = false;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'auto';
    }
  }

  navigate(anchor: string): void {
    this.closeMobileNav();
    
    // Если это якорная ссылка на главной странице
    if (this.router.url === '/home') {
      this.scrollTo(anchor);
    } else {
      // Переходим на главную страницу и затем к якорю
      this.router.navigate(['/home']).then(() => {
        setTimeout(() => this.scrollTo(anchor), 100);
      });
    }
  }

  navigateToPage(route: string): void {
    this.closeMobileNav();
    this.router.navigate([route]);
  }

  private scrollTo(anchor: string): void {
    if (typeof document !== 'undefined') {
      const element = document.getElementById(anchor);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
}
