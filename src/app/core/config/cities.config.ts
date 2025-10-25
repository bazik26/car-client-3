export interface CityConfig {
  name: string;
  slug: string;
  region: string;
}

export const CITIES: CityConfig[] = [
  { name: 'Санкт-Петербург', slug: 'saint-petersburg', region: 'Ленинградская область' },
  { name: 'Казань', slug: 'kazan', region: 'Республика Татарстан' },
  { name: 'Новосибирск', slug: 'novosibirsk', region: 'Новосибирская область' },
  { name: 'Екатеринбург', slug: 'yekaterinburg', region: 'Свердловская область' },
  { name: 'Ростов-на-Дону', slug: 'rostov-na-donu', region: 'Ростовская область' }
];

export function getCityBySlug(slug: string): CityConfig | undefined {
  return CITIES.find((city) => city.slug === slug);
}
