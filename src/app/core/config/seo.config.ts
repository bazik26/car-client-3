import { BRAND_CONFIG } from '../constants/brand';

export interface SEOConfig {
  title: string;
  description: string;
  keywords: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
}

const DEFAULT_IMAGE = `${BRAND_CONFIG.website}${BRAND_CONFIG.ogImage}`;

export const SEO_CONFIG: Record<string, SEOConfig> = {
  home: {
    title: `${BRAND_CONFIG.name} — европейские автомобили с прозрачной историей`,
    description: `${BRAND_CONFIG.name} подбирает, проверяет и доставляет автомобили из Европы в ${BRAND_CONFIG.city}. Индивидуальные подборы, честные отчеты и легальное оформление под ключ.`,
    keywords: `пригон авто ${BRAND_CONFIG.city}, авто из Европы, ${BRAND_CONFIG.name}, проверить авто по VIN, доставка автомобилей`,
    canonical: `${BRAND_CONFIG.website}/`,
    ogTitle: `${BRAND_CONFIG.name} — премиальный пригон автомобилей`,
    ogDescription: `Команда ${BRAND_CONFIG.shortName} привозит автомобили с прозрачной историей и расширенной гарантией.`,
    ogImage: DEFAULT_IMAGE,
    twitterTitle: `${BRAND_CONFIG.shortName} • Пригон авто из Европы`,
    twitterDescription: `Подбор и доставка автомобилей с гарантией и сервисом ${BRAND_CONFIG.shortName}.`,
    twitterImage: DEFAULT_IMAGE
  },
  search: {
    title: `Каталог автомобилей | ${BRAND_CONFIG.shortName}`,
    description: `Фильтруйте автомобили по бренду, сегменту, бюджету и типу использования. ${BRAND_CONFIG.shortName} обновляет каталог ежедневно.`,
    keywords: `каталог авто, фильтры автомобилей, ${BRAND_CONFIG.shortName}, под заказ`,
    canonical: `${BRAND_CONFIG.website}/catalog`,
    ogTitle: `Найдите автомобиль мечты вместе с ${BRAND_CONFIG.shortName}`,
    ogDescription: `Используйте интеллектуальные фильтры, чтобы подобрать идеальный автомобиль под ваш стиль жизни.`,
    ogImage: DEFAULT_IMAGE
  },
  car: {
    title: `{brand} {model} {year} — купить за {price} ₽ | ${BRAND_CONFIG.shortName}`,
    description: `{brand} {model} {year} года выпуска. Пробег {mileage} км, цена {price} ₽. Подбор, проверка и доставка от ${BRAND_CONFIG.shortName}.`,
    keywords: `{brand} {model}, проверенный автомобиль, ${BRAND_CONFIG.shortName}`,
    canonical: `${BRAND_CONFIG.website}/cars/{id}`,
    ogTitle: `{brand} {model} {year} — доступен в ${BRAND_CONFIG.shortName}`,
    ogDescription: `{brand} {model} {year}. Доставка, растаможка и сопровождение сделки.`,
    ogImage: DEFAULT_IMAGE
  },
  city: {
    title: `Пригон авто в {city} | ${BRAND_CONFIG.shortName}`,
    description: `${BRAND_CONFIG.shortName} организует пригон автомобилей из Европы в {city}. Подбор по бюджету, проверка и доставка под ключ.`,
    keywords: `пригон авто {city}, доставка авто {city}, ${BRAND_CONFIG.shortName}`,
    canonical: `${BRAND_CONFIG.website}/city/{slug}`,
    ogImage: DEFAULT_IMAGE
  },
  contacts: {
    title: `Контакты ${BRAND_CONFIG.shortName}`,
    description: `Свяжитесь с ${BRAND_CONFIG.name}: ${BRAND_CONFIG.phone}, ${BRAND_CONFIG.email}, ${BRAND_CONFIG.address}.`,
    keywords: `контакты ${BRAND_CONFIG.shortName}, телефон ${BRAND_CONFIG.shortName}`,
    canonical: `${BRAND_CONFIG.website}/contacts`,
    ogImage: DEFAULT_IMAGE
  }
};

export function replaceSEOTemplate(template = '', data: Record<string, any> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => (data?.[key] ?? template));
}

export function getSEOConfig(page: string, data: Record<string, any> = {}): SEOConfig {
  const config = SEO_CONFIG[page];
  if (!config) {
    throw new Error(`SEO config not found for page: ${page}`);
  }

  return {
    title: replaceSEOTemplate(config.title, data),
    description: replaceSEOTemplate(config.description, data),
    keywords: replaceSEOTemplate(config.keywords, data),
    canonical: config.canonical ? replaceSEOTemplate(config.canonical, data) : undefined,
    ogTitle: config.ogTitle ? replaceSEOTemplate(config.ogTitle, data) : undefined,
    ogDescription: config.ogDescription ? replaceSEOTemplate(config.ogDescription, data) : undefined,
    ogImage: config.ogImage ? replaceSEOTemplate(config.ogImage, data) : undefined,
    twitterTitle: config.twitterTitle ? replaceSEOTemplate(config.twitterTitle, data) : undefined,
    twitterDescription: config.twitterDescription ? replaceSEOTemplate(config.twitterDescription, data) : undefined,
    twitterImage: config.twitterImage ? replaceSEOTemplate(config.twitterImage, data) : undefined
  };
}
