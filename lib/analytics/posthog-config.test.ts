import { afterEach, describe, expect, it } from "vitest";

import { getPostHogHost, getPostHogKey, isPostHogEnabled } from "./posthog-config";

describe("posthog-config", () => {
  const originalProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const originalKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const originalHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalProjectToken === undefined) {
      delete process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    } else {
      process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = originalProjectToken;
    }
    if (originalKey === undefined) {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    } else {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = originalKey;
    }
    if (originalHost === undefined) {
      delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    } else {
      process.env.NEXT_PUBLIC_POSTHOG_HOST = originalHost;
    }
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("prefers NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN over the legacy key", () => {
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = "  phc_project_token  ";
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_legacy_key";
    expect(getPostHogKey()).toBe("phc_project_token");
  });

  it("falls back to NEXT_PUBLIC_POSTHOG_KEY", () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "  phc_test_key  ";
    expect(getPostHogKey()).toBe("phc_test_key");
  });

  it("defaults host to US ingest", () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    expect(getPostHogHost()).toBe("https://us.i.posthog.com");
  });

  it("disables PostHog in test env even when a key is set", () => {
    process.env.NODE_ENV = "test";
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    expect(isPostHogEnabled()).toBe(false);
  });
});
