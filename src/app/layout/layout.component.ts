import { Component, HostListener, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import { BRAND_CONFIG } from '../core/constants/brand';
import { ChatWidgetComponent } from '../shared/components/chat-widget/chat-widget.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, ChatWidgetComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent {
  protected readonly brand = BRAND_CONFIG;
  protected isCompactHeader = false;
  protected mobileNav = false;
  protected readonly currentYear = new Date().getFullYear();
  private readonly router = inject(Router);

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
