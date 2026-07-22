import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ANALYTICS_CONSENT_KEY } from "@/lib/analytics/consent";
import { AnalyticsConsentProvider } from "@/lib/analytics/analytics-consent-context";

vi.mock("@/lib/analytics/posthog-config", () => ({
  isPostHogEnabled: () => true,
}));

vi.mock("@/lib/analytics/posthog-client", () => ({
  shutdownPostHogClient: vi.fn(),
}));

import { AnalyticsConsentBanner } from "./AnalyticsConsentBanner";

function renderBanner() {
  return render(
    <AnalyticsConsentProvider>
      <AnalyticsConsentBanner />
    </AnalyticsConsentProvider>,
  );
}

describe("AnalyticsConsentBanner", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("renders when analytics is enabled and consent is undecided", () => {
    renderBanner();
    expect(screen.getByRole("dialog", { name: /analytics cookies/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accept analytics/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /decline/i })).toBeInTheDocument();
  });

  it("does not render when consent is already stored", () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, "accepted");
    renderBanner();
    expect(screen.queryByRole("dialog", { name: /analytics cookies/i })).not.toBeInTheDocument();
  });

  it("stores accepted consent when Accept is clicked", async () => {
    const user = userEvent.setup();
    renderBanner();
    await user.click(screen.getByRole("button", { name: /accept analytics/i }));
    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("accepted");
    expect(screen.queryByRole("dialog", { name: /analytics cookies/i })).not.toBeInTheDocument();
  });

  it("stores declined consent when Decline is clicked", async () => {
    const user = userEvent.setup();
    renderBanner();
    await user.click(screen.getByRole("button", { name: /decline/i }));
    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("declined");
    expect(screen.queryByRole("dialog", { name: /analytics cookies/i })).not.toBeInTheDocument();
  });
});
