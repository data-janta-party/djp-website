"use client";

import { Button } from "@/components/ui/shadcn/button";
import { useAnalyticsConsent } from "@/lib/analytics/analytics-consent-context";
import { isPostHogEnabled } from "@/lib/analytics/posthog-config";

/**
 * Fixed bottom consent bar for PostHog analytics.
 *
 * Rendered in the React tree (not via Sonner toast.custom) so it is always
 * visible when the project token is baked into the client and consent is unset.
 */
export function AnalyticsConsentBanner() {
  const { consent, acceptAnalytics, declineAnalytics } = useAnalyticsConsent();

  if (!isPostHogEnabled() || consent !== null) {
    return null;
  }

  return (
    <div
      id="analytics-consent-banner"
      role="dialog"
      aria-modal="false"
      aria-labelledby="analytics-consent-title"
      aria-describedby="analytics-consent-description"
      data-analytics-consent-banner
      className="fixed inset-x-4 bottom-4 z-[9999] mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl sm:inset-x-6 sm:bottom-6 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div id="analytics-consent-copy" className="flex flex-col gap-1">
        <p id="analytics-consent-title" className="text-sm font-semibold">
          Analytics cookies
        </p>
        <p id="analytics-consent-description" className="text-sm text-muted-foreground">
          We use analytics to understand how volunteers use data.janta.party. You can decline —
          no tracking cookies are set until you accept.
        </p>
      </div>
      <div
        id="analytics-consent-actions"
        className="flex shrink-0 flex-col gap-2 sm:flex-row"
      >
        <Button
          id="analytics-consent-decline"
          type="button"
          variant="outline"
          size="sm"
          onClick={declineAnalytics}
        >
          Decline
        </Button>
        <Button
          id="analytics-consent-accept"
          type="button"
          size="sm"
          onClick={acceptAnalytics}
        >
          Accept analytics
        </Button>
      </div>
    </div>
  );
}
