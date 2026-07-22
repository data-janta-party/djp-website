"use client";

import type { ReactNode } from "react";
import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

import { AnalyticsConsentToast } from "@/components/ui/compositions/shared/AnalyticsConsentToast";
import { Toaster } from "@/components/ui/shadcn/sonner";
import {
  AnalyticsConsentProvider,
  useAnalyticsConsent,
} from "@/lib/analytics/analytics-consent-context";
import {
  attachPostHogErrorHandlers,
  capturePostHogPageView,
  initPostHogClient,
} from "@/lib/analytics/posthog-client";

function PostHogPageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.toString();

  useEffect(() => {
    initPostHogClient();
    return attachPostHogErrorHandlers();
  }, []);

  useEffect(() => {
    initPostHogClient();

    if (!pathname) {
      return;
    }

    const pathWithQuery = searchQuery ? `${pathname}?${searchQuery}` : pathname;
    capturePostHogPageView(`${window.location.origin}${pathWithQuery}`);
  }, [pathname, searchQuery]);

  return null;
}

function PostHogProvider({ children }: { children: ReactNode }) {
  const { consent } = useAnalyticsConsent();
  const accepted = consent === "accepted";

  useEffect(() => {
    if (!accepted) {
      return;
    }
    initPostHogClient();
  }, [accepted]);

  const content = (
    <>
      {accepted ? (
        <Suspense fallback={null}>
          <PostHogPageViews />
        </Suspense>
      ) : null}
      {children}
    </>
  );

  if (!accepted) {
    return content;
  }

  return <PHProvider client={posthog}>{content}</PHProvider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AnalyticsConsentProvider>
      <PostHogProvider>
        {children}
        {/* Toaster must mount before AnalyticsConsentToast fires toast.custom */}
        <Toaster
          id="app-toaster"
          position="bottom-center"
          richColors
          closeButton
          // Above film chrome / sticky nav; Sonner defaults can sit under fixed UI.
          style={{ zIndex: 100_000 }}
        />
        <AnalyticsConsentToast />
      </PostHogProvider>
    </AnalyticsConsentProvider>
  );
}
