import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ANALYTICS_CONSENT_DATA_ATTRIBUTE,
  ANALYTICS_CONSENT_KEY,
  emitAnalyticsConsentChange,
  readAnalyticsConsent,
  subscribeToAnalyticsConsent,
  writeAnalyticsConsent,
} from "./consent";

describe("analytics consent storage", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(ANALYTICS_CONSENT_DATA_ATTRIBUTE);
  });

  it("returns null when unset", () => {
    expect(readAnalyticsConsent()).toBeNull();
  });

  it("persists accepted and declined values", () => {
    writeAnalyticsConsent("accepted");
    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("accepted");
    expect(readAnalyticsConsent()).toBe("accepted");
    expect(document.documentElement.getAttribute(ANALYTICS_CONSENT_DATA_ATTRIBUTE)).toBe(
      "accepted",
    );

    writeAnalyticsConsent("declined");
    expect(readAnalyticsConsent()).toBe("declined");
  });

  it("notifies subscribers on emit", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToAnalyticsConsent(listener);
    emitAnalyticsConsentChange();
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    emitAnalyticsConsentChange();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
