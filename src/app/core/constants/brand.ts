export const BRAND_CONFIG = {
  name: 'ООО "АвтоЗнатоки"',
  shortName: 'АвтоЗнатоки',
  email: 'auto-c-cars@yandex.ru',
  phone: '+7 (985) 263-41-64',
  phoneLink: 'tel:+79852634164',
  currency: '₽',
  address: '183039, Мурманская область, г. Мурманск, ул. Академика Книповича, д. 23, офис 119',
  city: 'Мурманск',
  region: 'Мурманская область',
  country: 'Россия',
  inn: '6658571727',
  website: 'https://avtoznatoki.ru',
  ogImage: '/assets/og/avtoznatoki.svg',
  coordinates: {
    latitude: 68.9585,
    longitude: 33.0827
  },
  // Дополнительный офис
  offices: [
    {
      city: 'Мурманск',
      address: '183039, Мурманская область, г. Мурманск, ул. Академика Книповича, д. 23, офис 119',
      coordinates: { latitude: 68.9585, longitude: 33.0827 }
    },
    {
      city: 'Екатеринбург',
      address: '620026, Свердловская область, г. Екатеринбург, ул. Белинского, д. 83, офис 416',
      coordinates: { latitude: 56.8389, longitude: 60.6057 }
    }
  ]
} as const;
