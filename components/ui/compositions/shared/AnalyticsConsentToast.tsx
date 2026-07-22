"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/shadcn/button";
import { useAnalyticsConsent } from "@/lib/analytics/analytics-consent-context";
import { isPostHogEnabled } from "@/lib/analytics/posthog-config";

const ANALYTICS_CONSENT_TOAST_ID = "analytics-consent";

/**
 * Shows a Sonner toast for PostHog analytics consent when the visitor has not
 * decided yet. No-op when PostHog is disabled or consent is already stored.
 *
 * Deferred with setTimeout so the Toaster sibling has mounted its effect
 * (toast.custom is a no-op if no toaster is registered yet).
 */
export function AnalyticsConsentToast() {
  const { consent, acceptAnalytics, declineAnalytics } = useAnalyticsConsent();

  useEffect(() => {
    if (!isPostHogEnabled()) {
      return;
    }

    if (consent !== null) {
      toast.dismiss(ANALYTICS_CONSENT_TOAST_ID);
      return;
    }

    let cancelled = false;
    // Wait for Toaster's mount effect + one paint. Strict Mode remount cancels
    // the first timer and schedules again so the toast still appears.
    const timer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }

      toast.custom(
        (toastId) => (
          <div
            id="analytics-consent-toast"
            role="dialog"
            aria-labelledby="analytics-consent-title"
            aria-describedby="analytics-consent-description"
            data-analytics-consent-toast
            className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg"
          >
            <div id="analytics-consent-copy" className="flex flex-col gap-1">
              <p id="analytics-consent-title" className="text-sm font-semibold">
                Analytics cookies
              </p>
              <p id="analytics-consent-description" className="text-sm text-muted-foreground">
                We use analytics to understand how volunteers use data.janta.party. You can
                decline — no tracking cookies are set until you accept.
              </p>
            </div>
            <div id="analytics-consent-actions" className="flex flex-wrap justify-end gap-2">
              <Button
                id="analytics-consent-decline"
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  declineAnalytics();
                  toast.dismiss(toastId);
                }}
              >
                Decline
              </Button>
              <Button
                id="analytics-consent-accept"
                type="button"
                size="sm"
                onClick={() => {
                  acceptAnalytics();
                  toast.dismiss(toastId);
                }}
              >
                Accept analytics
              </Button>
            </div>
          </div>
        ),
        {
          id: ANALYTICS_CONSENT_TOAST_ID,
          duration: Infinity,
          dismissible: false,
        },
      );
    }, 50);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      // Do not dismiss here: Strict Mode remount would wipe the toast before
      // the second schedule. Dismiss when consent becomes non-null (above).
    };
  }, [acceptAnalytics, consent, declineAnalytics]);

  return null;
}
