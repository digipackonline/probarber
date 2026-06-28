import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export type LanguageCode = 'es' | 'pt-BR' | 'en';
export type CurrencyCode = 'ARS' | 'BRL' | 'USD' | 'MXN' | 'CLP' | 'COP' | 'PEN' | 'UYU';
export type CountryCode = 'AR' | 'BR' | 'US' | 'MX' | 'CL' | 'CO' | 'PE' | 'UY';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

export interface Currency {
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimalPlaces: number;
}

export interface Country {
  code: CountryCode;
  name: string;
  currencyCode: CurrencyCode;
  phonePrefix: string;
  flag?: string;
}

export interface RegionalPrice {
  currencyCode: CurrencyCode;
  priceMonthly: number;
  priceYearly: number;
}

// Import translations statically
import translationsES from './translations/es.json';
import translationsPT from './translations/pt-BR.json';
import translationsEN from './translations/en.json';

const TRANSLATIONS: Record<LanguageCode, Record<string, any>> = {
  'es': translationsES,
  'pt-BR': translationsPT,
  'en': translationsEN
};

export const LANGUAGES: Language[] = [
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: 'es' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', flag: 'br' },
  { code: 'en', name: 'English', nativeName: 'English', flag: 'us' }
];

export const CURRENCIES: Currency[] = [
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', decimalPlaces: 2 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimalPlaces: 2 },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2 },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', decimalPlaces: 2 },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', decimalPlaces: 0 },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', decimalPlaces: 0 },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', decimalPlaces: 2 },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$', decimalPlaces: 2 }
];

export const COUNTRIES: Country[] = [
  { code: 'AR', name: 'Argentina', currencyCode: 'ARS', phonePrefix: '+54' },
  { code: 'BR', name: 'Brasil', currencyCode: 'BRL', phonePrefix: '+55' },
  { code: 'US', name: 'Estados Unidos', currencyCode: 'USD', phonePrefix: '+1' },
  { code: 'MX', name: 'México', currencyCode: 'MXN', phonePrefix: '+52' },
  { code: 'CL', name: 'Chile', currencyCode: 'CLP', phonePrefix: '+56' },
  { code: 'CO', name: 'Colombia', currencyCode: 'COP', phonePrefix: '+57' },
  { code: 'PE', name: 'Perú', currencyCode: 'PEN', phonePrefix: '+51' },
  { code: 'UY', name: 'Uruguay', currencyCode: 'UYU', phonePrefix: '+598' }
];

// Currency to country mapping
const CURRENCY_COUNTRY_MAP: Record<CurrencyCode, CountryCode> = {
  'ARS': 'AR',
  'BRL': 'BR',
  'USD': 'US',
  'MXN': 'MX',
  'CLP': 'CL',
  'COP': 'CO',
  'PEN': 'PE',
  'UYU': 'UY'
};

interface I18nContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  country: CountryCode;
  setCountry: (country: CountryCode) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatCurrency: (amount: number, currencyCode?: CurrencyCode) => string;
  formatDate: (date: Date | string, format?: 'short' | 'long') => string;
  languages: Language[];
  currencies: Currency[];
  countries: Country[];
  getCurrencyForCountry: (countryCode: CountryCode) => CurrencyCode;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEYS = {
  LANGUAGE: 'barberpro_language',
  CURRENCY: 'barberpro_currency',
  COUNTRY: 'barberpro_country'
};

function detectBrowserLanguage(): LanguageCode {
  if (typeof navigator === 'undefined') return 'es';

  const browserLang = navigator.language || (navigator as any).userLanguage;
  if (!browserLang) return 'es';

  const langCode = browserLang.toLowerCase();

  if (langCode.startsWith('pt')) {
    if (langCode === 'pt-br' || langCode === 'pt') return 'pt-BR';
    return 'pt-BR';
  }
  if (langCode.startsWith('en')) return 'en';
  if (langCode.startsWith('es')) return 'es';

  return 'es';
}

function detectCountryFromTimezone(): CountryCode | null {
  if (typeof Intl === 'undefined') return null;

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (tz.startsWith('America/Argentina') || tz === 'America/Buenos_Aires') return 'AR';
    if (tz.startsWith('America/Sao_Paulo') || tz.includes('Brasilia')) return 'BR';
    if (tz.startsWith('America/Mexico')) return 'MX';
    if (tz.startsWith('America/Santiago')) return 'CL';
    if (tz.startsWith('America/Bogota')) return 'CO';
    if (tz.startsWith('America/Lima')) return 'PE';
    if (tz.startsWith('America/Montevideo')) return 'UY';
    if (tz.startsWith('America/') && (tz.includes('New_York') || tz.includes('Los_Angeles') || tz.includes('Chicago'))) return 'US';

    return null;
  } catch {
    return null;
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof window === 'undefined') return 'es';
    const stored = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    if (stored && TRANSLATIONS[stored as LanguageCode]) return stored as LanguageCode;
    return detectBrowserLanguage();
  });

  const [country, setCountryState] = useState<CountryCode>(() => {
    if (typeof window === 'undefined') return 'AR';
    const stored = localStorage.getItem(STORAGE_KEYS.COUNTRY);
    if (stored && COUNTRIES.find(c => c.code === stored)) return stored as CountryCode;
    const detected = detectCountryFromTimezone();
    return detected || 'AR';
  });

  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window === 'undefined') return 'ARS';
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENCY);
    if (stored && CURRENCIES.find(c => c.code === stored)) return stored as CurrencyCode;
    return CURRENCY_COUNTRY_MAP[country] || 'ARS';
  });

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
      document.documentElement.lang = lang;
    }
  }, []);

  const setCurrency = useCallback((curr: CurrencyCode) => {
    setCurrencyState(curr);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CURRENCY, curr);
    }
  }, []);

  const setCountry = useCallback((cty: CountryCode) => {
    setCountryState(cty);
    const defaultCurrency = COUNTRIES.find(c => c.code === cty)?.currencyCode || 'ARS';
    setCurrencyState(defaultCurrency);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.COUNTRY, cty);
      localStorage.setItem(STORAGE_KEYS.CURRENCY, defaultCurrency);
    }
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = TRANSLATIONS[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }

    if (typeof value !== 'string') return key;

    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
        return params[paramKey]?.toString() || '';
      });
    }

    return value;
  }, [language]);

  const formatCurrency = useCallback((amount: number, currencyCode?: CurrencyCode): string => {
    const curr = CURRENCIES.find(c => c.code === (currencyCode || currency));
    if (!curr) return amount.toString();

    const formatted = amount.toFixed(curr.decimalPlaces);

    return `${curr.symbol}${Number(formatted).toLocaleString(language === 'es' ? 'es-AR' : language === 'pt-BR' ? 'pt-BR' : 'en-US', {
      minimumFractionDigits: curr.decimalPlaces,
      maximumFractionDigits: curr.decimalPlaces
    })}`;
  }, [currency, language]);

  const formatDate = useCallback((date: Date | string, format: 'short' | 'long' = 'short'): string => {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (format === 'short') {
      return d.toLocaleDateString(language === 'es' ? 'es-AR' : language === 'pt-BR' ? 'pt-BR' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }

    return d.toLocaleDateString(language === 'es' ? 'es-AR' : language === 'pt-BR' ? 'pt-BR' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [language]);

  const getCurrencyForCountry = useCallback((countryCode: CountryCode): CurrencyCode => {
    return COUNTRIES.find(c => c.code === countryCode)?.currencyCode || 'USD';
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value: I18nContextType = {
    language,
    setLanguage,
    currency,
    setCurrency,
    country,
    setCountry,
    t,
    formatCurrency,
    formatDate,
    languages: LANGUAGES,
    currencies: CURRENCIES,
    countries: COUNTRIES,
    getCurrencyForCountry
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}

