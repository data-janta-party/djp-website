import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ANALYTICS_CONSENT_KEY } from "@/lib/analytics/consent";
import { AnalyticsConsentProvider } from "@/lib/analytics/analytics-consent-context";

const toastCustom = vi.fn();
const toastDismiss = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    custom: (...args: unknown[]) => toastCustom(...args),
    dismiss: (...args: unknown[]) => toastDismiss(...args),
  },
}));

vi.mock("@/lib/analytics/posthog-config", () => ({
  isPostHogEnabled: () => true,
}));

import { AnalyticsConsentToast } from "./AnalyticsConsentToast";

function renderToast() {
  return render(
    <AnalyticsConsentProvider>
      <AnalyticsConsentToast />
    </AnalyticsConsentProvider>,
  );
}

describe("AnalyticsConsentToast", () => {
  beforeEach(() => {
    localStorage.clear();
    toastCustom.mockClear();
    toastDismiss.mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it("prompts with a Sonner toast when consent is undecided", async () => {
    renderToast();

    await vi.advanceTimersByTimeAsync(60);

    await waitFor(() => {
      expect(toastCustom).toHaveBeenCalledTimes(1);
    });
  });

  it("does not prompt when consent is already stored", async () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, "accepted");
    renderToast();

    await vi.advanceTimersByTimeAsync(60);

    await waitFor(() => {
      expect(toastDismiss).toHaveBeenCalled();
    });
    expect(toastCustom).not.toHaveBeenCalled();
  });
});
