export const ANALYTICS_CONSENT_KEY = "analytics-consent";

export const ANALYTICS_CONSENT_DATA_ATTRIBUTE = "data-analytics-consent";

export type AnalyticsConsent = "accepted" | "declined";

function applyAnalyticsConsentToDocument(consent: AnalyticsConsent): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute(ANALYTICS_CONSENT_DATA_ATTRIBUTE, consent);
}

const analyticsConsentListeners = new Set<() => void>();

export function readAnalyticsConsent(): AnalyticsConsent | null {
  try {
    const stored = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (stored === "accepted" || stored === "declined") {
      return stored;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeAnalyticsConsent(consent: AnalyticsConsent): void {
  try {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
    applyAnalyticsConsentToDocument(consent);
  } catch {
    // Ignore storage failures (private browsing, quota, etc.).
  }
}

export function emitAnalyticsConsentChange(): void {
  for (const listener of analyticsConsentListeners) {
    listener();
  }
}

export function subscribeToAnalyticsConsent(onStoreChange: () => void): () => void {
  analyticsConsentListeners.add(onStoreChange);
  return () => {
    analyticsConsentListeners.delete(onStoreChange);
  };
}

export function getAnalyticsConsentSnapshot(): AnalyticsConsent | null {
  return readAnalyticsConsent();
}

export function getAnalyticsConsentServerSnapshot(): AnalyticsConsent | null {
  return null;
}

/**
 * Blocking inline script for the document head.
 * Mirrors locale bootstrap so stored consent is visible before React hydrates.
 */
export const ANALYTICS_CONSENT_INIT_SCRIPT = `(function(){try{var stored=localStorage.getItem('${ANALYTICS_CONSENT_KEY}');if(stored==='accepted'||stored==='declined'){document.documentElement.setAttribute('${ANALYTICS_CONSENT_DATA_ATTRIBUTE}',stored);}}catch(e){}})();`;
