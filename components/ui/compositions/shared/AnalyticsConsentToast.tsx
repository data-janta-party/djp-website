"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/shadcn/button";
import { useAnalyticsConsent } from "@/lib/analytics/analytics-consent-context";
import { isPostHogEnabled } from "@/lib/analytics/posthog-config";

const ANALYTICS_CONSENT_TOAST_ID = "analytics-consent";

/**
 * Shows a Sonner toast for PostHog analytics consent when the visitor has not
 * decided yet. No-op when PostHog is disabled or consent is already stored.
 */
export function AnalyticsConsentToast() {
  const { consent, acceptAnalytics, declineAnalytics } = useAnalyticsConsent();
  const promptedRef = useRef(false);

  useEffect(() => {
    if (!isPostHogEnabled() || consent !== null || promptedRef.current) {
      if (consent !== null) {
        toast.dismiss(ANALYTICS_CONSENT_TOAST_ID);
      }
      return;
    }

    promptedRef.current = true;

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
              We use external analytics cookies to understand how visitors interact with our site. You can decline — no tracking cookies are set until you accept.
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

    return () => {
      toast.dismiss(ANALYTICS_CONSENT_TOAST_ID);
    };
  }, [acceptAnalytics, consent, declineAnalytics]);

  return null;
}
