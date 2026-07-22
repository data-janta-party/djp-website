import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AnalyticsConsentProvider,
  useAnalyticsConsent,
} from "./analytics-consent-context";
import { ANALYTICS_CONSENT_KEY } from "./consent";

vi.mock("./posthog-client", () => ({
  shutdownPostHogClient: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <AnalyticsConsentProvider>{children}</AnalyticsConsentProvider>;
}

describe("AnalyticsConsentProvider", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("accepts and declines consent", () => {
    const { result } = renderHook(() => useAnalyticsConsent(), { wrapper });

    expect(result.current.consent).toBeNull();
    expect(result.current.hasDecided).toBe(false);

    act(() => {
      result.current.acceptAnalytics();
    });
    expect(result.current.consent).toBe("accepted");
    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("accepted");

    act(() => {
      result.current.declineAnalytics();
    });
    expect(result.current.consent).toBe("declined");
  });
});
