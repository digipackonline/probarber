import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useI18n, LANGUAGES, CURRENCIES, COUNTRIES, LanguageCode, CurrencyCode, CountryCode } from '../lib/i18n';

export function LanguageSelector() {
  const { language, setLanguage, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === language);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm"
        aria-label={t('common.language')}
      >
        <Globe className="w-4 h-4" aria-hidden="true" />
        <span>{currentLang?.nativeName || 'Español'}</span>
        <ChevronDown className="w-3 h-3" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 py-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-zinc-800 transition-colors ${
                language === lang.code ? 'text-amber-400' : 'text-zinc-300'
              }`}
            >
              <span>{lang.nativeName}</span>
              {language === lang.code && <Check className="w-4 h-4" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CurrencySelector() {
  const { currency, setCurrency, formatCurrency, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentCurr = CURRENCIES.find(c => c.code === currency);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm"
        aria-label={t('common.currency')}
      >
        <span className="font-medium">{currentCurr?.symbol}$</span>
        <span>{currentCurr?.code}</span>
        <ChevronDown className="w-3 h-3" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
          {CURRENCIES.map((curr) => (
            <button
              key={curr.code}
              onClick={() => {
                setCurrency(curr.code);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-zinc-800 transition-colors ${
                currency === curr.code ? 'text-amber-400' : 'text-zinc-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">{curr.symbol}</span>
                <span>{curr.name}</span>
              </span>
              {currency === curr.code && <Check className="w-4 h-4" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CountrySelector() {
  const { country, setCountry, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentCountry = COUNTRIES.find(c => c.code === country);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm"
        aria-label={t('common.country')}
      >
        <span>{currentCountry?.flag || '📍'}</span>
        <span>{currentCountry?.name || country}</span>
        <ChevronDown className="w-3 h-3" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
          {COUNTRIES.map((cty) => (
            <button
              key={cty.code}
              onClick={() => {
                setCountry(cty.code);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-zinc-800 transition-colors ${
                country === cty.code ? 'text-amber-400' : 'text-zinc-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{cty.flag || '📍'}</span>
                <span>{cty.name}</span>
              </span>
              {country === cty.code && <Check className="w-4 h-4" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Combined locale selector for settings page
export function LocaleSettings() {
  const { language, setLanguage, currency, setCurrency, country, setCountry, t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          {t('onboarding.barbershopName') || 'Idioma'}
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as LanguageCode)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          {t('common.country')}
        </label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value as CountryCode)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
        >
          {COUNTRIES.map((cty) => (
            <option key={cty.code} value={cty.code}>
              {cty.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          {t('common.currency')}
        </label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
        >
          {CURRENCIES.map((curr) => (
            <option key={curr.code} value={curr.code}>
              {curr.symbol} - {curr.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
