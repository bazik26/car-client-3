import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

import { getSEOConfig } from '../config/seo.config';

@Injectable({ providedIn: 'root' })
export class SEOService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  setSEO(pageKey: string, data: Record<string, any> = {}): void {
    const config = getSEOConfig(pageKey, data);

    this.title.setTitle(config.title);
    this.meta.updateTag({ name: 'description', content: config.description });
    this.meta.updateTag({ name: 'keywords', content: config.keywords });

    if (config.canonical) {
      this.upsertLinkTag('canonical', config.canonical);
    }

    if (config.ogTitle) {
      this.meta.updateTag({ property: 'og:title', content: config.ogTitle });
    }
    if (config.ogDescription) {
      this.meta.updateTag({ property: 'og:description', content: config.ogDescription });
    }
    if (config.ogImage) {
      this.meta.updateTag({ property: 'og:image', content: config.ogImage });
    }

    if (config.twitterTitle) {
      this.meta.updateTag({ name: 'twitter:title', content: config.twitterTitle });
    }
    if (config.twitterDescription) {
      this.meta.updateTag({ name: 'twitter:description', content: config.twitterDescription });
    }
    if (config.twitterImage) {
      this.meta.updateTag({ name: 'twitter:image', content: config.twitterImage });
    }
  }

  private upsertLinkTag(rel: string, href: string) {
    const existing = this.document.querySelector(`link[rel="${rel}"]`);
    if (existing) {
      existing.setAttribute('href', href);
    } else {
      const link = this.document.createElement('link');
      link.setAttribute('rel', rel);
      link.setAttribute('href', href);
      this.document.head.appendChild(link);
    }
  }
}
