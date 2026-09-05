export interface CountryInfo {
  name: string;
  nativeName?: string;
  cca2: string;
  flagEmoji: string;
  flagSvgUrl: string;
  capital: string;
  population: number;
  currency: string;
  timezone: string;
  region: string;
}

const CACHE_PREFIX = 'rest_country_v5_';

// Pre-defined static data to avoid external network/CORS issues
const DEFAULT_VN_INFO: CountryInfo = {
  name: 'Việt Nam',
  nativeName: 'Việt Nam',
  cca2: 'VN',
  flagEmoji: '🇻🇳',
  flagSvgUrl: 'https://flagcdn.com/vn.svg',
  capital: 'Hà Nội',
  population: 102300000,
  currency: 'VND',
  timezone: 'UTC+07:00',
  region: 'Asia'
};

// Convert ISO 3166-1 alpha-2 country code to Unicode Flag Emoji
export const getFlagEmoji = (countryCode: string): string => {
  const code = (countryCode || 'VN').toUpperCase();
  if (code.length !== 2) return '🇻🇳';
  const codePoints = [...code].map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export const fetchCountryInfo = async (countryCode: string = 'VN'): Promise<CountryInfo> => {
  const code = (countryCode || 'VN').toUpperCase();
  if (code === 'VN') {
    return DEFAULT_VN_INFO;
  }

  const cacheKey = `${CACHE_PREFIX}${code}`;

  // 1. Check local cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {}

  // 2. Fetch from public REST Countries v3.1 API (CORS friendly, no key needed)
  try {
    const res = await fetch(`https://restcountries.com/v3.1/alpha/${code}`);
    if (res.ok) {
      const data = await res.json();
      const country = Array.isArray(data) ? data[0] : data;

      if (country) {
        const currencyKey = country.currencies ? Object.keys(country.currencies)[0] : 'VND';
        const nativeNameKey = country.name?.nativeName ? Object.keys(country.name.nativeName)[0] : '';
        const nativeName = nativeNameKey ? country.name.nativeName[nativeNameKey]?.common : country.name?.common;

        const info: CountryInfo = {
          name: country.name?.common || country.name?.official || code,
          nativeName: nativeName || country.name?.common || code,
          cca2: code,
          flagEmoji: country.flag || getFlagEmoji(code),
          flagSvgUrl: country.flags?.svg || `https://flagcdn.com/${code.toLowerCase()}.svg`,
          capital: country.capital?.[0] || 'N/A',
          population: country.population || 0,
          currency: currencyKey,
          timezone: country.timezones?.[0] || 'UTC+07:00',
          region: country.region || 'Asia'
        };

        try {
          localStorage.setItem(cacheKey, JSON.stringify(info));
        } catch (e) {}

        return info;
      }
    }
  } catch (err) {
    // Silently fallback without spamming console
  }

  // Generic fallback
  const fallbackInfo: CountryInfo = {
    name: code,
    nativeName: code,
    cca2: code,
    flagEmoji: getFlagEmoji(code),
    flagSvgUrl: `https://flagcdn.com/${code.toLowerCase()}.svg`,
    capital: 'N/A',
    population: 0,
    currency: 'USD',
    timezone: 'UTC+07:00',
    region: 'Global'
  };

  try {
    localStorage.setItem(cacheKey, JSON.stringify(fallbackInfo));
  } catch (e) {}

  return fallbackInfo;
};
