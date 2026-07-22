import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  reset: vi.fn(),
  capture: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: posthogMock,
}));

import {
  capturePostHogPageView,
  initPostHogClient,
  resetPostHogClientStateForTests,
  shutdownPostHogClient,
} from "./posthog-client";

describe("posthog-client", () => {
  beforeEach(() => {
    resetPostHogClientStateForTests();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = "phc_test";
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env.NODE_ENV = "test";
    delete process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    resetPostHogClientStateForTests();
  });

  it("initializes once when enabled", () => {
    initPostHogClient();
    initPostHogClient();

    expect(posthogMock.init).toHaveBeenCalledTimes(1);
    expect(posthogMock.opt_in_capturing).toHaveBeenCalledTimes(1);
    expect(posthogMock.init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({
        api_host: "/ingest",
        opt_out_capturing_by_default: true,
      }),
    );
  });

  it("captures pageviews only after init", () => {
    capturePostHogPageView("https://data.janta.party/");
    expect(posthogMock.capture).not.toHaveBeenCalled();

    initPostHogClient();
    capturePostHogPageView("https://data.janta.party/");
    expect(posthogMock.capture).toHaveBeenCalledWith("$pageview", {
      $current_url: "https://data.janta.party/",
    });
  });

  it("shuts down and opts out", () => {
    initPostHogClient();
    shutdownPostHogClient();
    expect(posthogMock.opt_out_capturing).toHaveBeenCalledTimes(1);
    expect(posthogMock.reset).toHaveBeenCalledTimes(1);

    capturePostHogPageView("https://data.janta.party/");
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });
});
