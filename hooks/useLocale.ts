'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

import {
  DEFAULT_LOCALE,
  getMessages,
  isLocale,
  type Locale,
  type Messages,
} from '@/lib/i18n/index';

const STORAGE_KEY = 'locale';

const localeListeners = new Set<() => void>();

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
}

function applyLocale(locale: Locale): void {
  document.documentElement.lang = locale;
  window.localStorage.setItem(STORAGE_KEY, locale);
}

function subscribeToLocale(listener: () => void): () => void {
  localeListeners.add(listener);
  return () => {
    localeListeners.delete(listener);
  };
}

function notifyLocaleListeners(): void {
  for (const listener of localeListeners) {
    listener();
  }
}

export function useLocale(): {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
} {
  const locale = useSyncExternalStore<Locale>(
    subscribeToLocale,
    readStoredLocale,
    () => DEFAULT_LOCALE,
  );

  useEffect(() => {
    applyLocale(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    applyLocale(next);
    notifyLocaleListeners();
  }, []);

  return {
    locale,
    messages: getMessages(locale),
    setLocale,
  };
}
