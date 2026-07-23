"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  emitAnalyticsConsentChange,
  getAnalyticsConsentServerSnapshot,
  getAnalyticsConsentSnapshot,
  subscribeToAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsent,
} from "./consent";
import { shutdownPostHogClient } from "./posthog-client";

interface AnalyticsConsentContextValue {
  consent: AnalyticsConsent | null;
  hasDecided: boolean;
  acceptAnalytics: () => void;
  declineAnalytics: () => void;
  revokeAnalytics: () => void;
}

const AnalyticsConsentContext = createContext<AnalyticsConsentContextValue | null>(null);

export function AnalyticsConsentProvider({ children }: { children: ReactNode }) {
  const consent = useSyncExternalStore(
    subscribeToAnalyticsConsent,
    getAnalyticsConsentSnapshot,
    getAnalyticsConsentServerSnapshot,
  );

  const acceptAnalytics = useCallback(() => {
    writeAnalyticsConsent("accepted");
    emitAnalyticsConsentChange();
  }, []);

  const declineAnalytics = useCallback(() => {
    writeAnalyticsConsent("declined");
    emitAnalyticsConsentChange();
  }, []);

  const revokeAnalytics = useCallback(() => {
    shutdownPostHogClient();
    writeAnalyticsConsent("declined");
    emitAnalyticsConsentChange();
  }, []);

  const value = useMemo<AnalyticsConsentContextValue>(
    () => ({
      consent,
      hasDecided: consent !== null,
      acceptAnalytics,
      declineAnalytics,
      revokeAnalytics,
    }),
    [acceptAnalytics, consent, declineAnalytics, revokeAnalytics],
  );

  return (
    <AnalyticsConsentContext.Provider value={value}>{children}</AnalyticsConsentContext.Provider>
  );
}

export function useAnalyticsConsent(): AnalyticsConsentContextValue {
  const context = useContext(AnalyticsConsentContext);
  if (!context) {
    throw new Error("useAnalyticsConsent must be used within AnalyticsConsentProvider");
  }

  return context;
}
