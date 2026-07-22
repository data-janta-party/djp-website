import posthog from "posthog-js";

import { getPostHogHost, getPostHogKey, isPostHogEnabled } from "./posthog-config";

let postHogInitialized = false;
let postHogErrorHandlersAttached = false;

export function initPostHogClient(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!isPostHogEnabled() || postHogInitialized) {
    return;
  }

  const key = getPostHogKey();
  if (!key) {
    return;
  }

  posthog.init(key, {
    // First-party proxy (see next.config rewrites) avoids ad-blockers + CSP issues.
    api_host: "/ingest",
    ui_host: getPostHogHost(),
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    opt_out_capturing_by_default: true,
    session_recording: {
      maskAllInputs: true,
      maskInputOptions: {
        password: true,
        email: true,
        tel: true,
      },
      maskTextSelector: "[data-sensitive], [data-ph-mask]",
    },
  });

  posthog.opt_in_capturing();
  postHogInitialized = true;
}

export function resetPostHogClientStateForTests(): void {
  if (process.env.NODE_ENV !== "test") {
    return;
  }

  postHogInitialized = false;
  postHogErrorHandlersAttached = false;
}

export function shutdownPostHogClient(): void {
  if (typeof window === "undefined" || !postHogInitialized) {
    return;
  }

  posthog.opt_out_capturing();
  posthog.reset();
  postHogInitialized = false;
  postHogErrorHandlersAttached = false;
}

export function capturePostHogPageView(url: string): void {
  if (!postHogInitialized) {
    return;
  }

  posthog.capture("$pageview", { $current_url: url });
}

function capturePostHogException(
  error: unknown,
  properties?: Record<string, unknown>,
): void {
  if (!postHogInitialized) {
    return;
  }

  posthog.captureException(error, properties);
}

function getErrorFromEvent(event: ErrorEvent): unknown {
  return event.error ?? event.message;
}

export function attachPostHogErrorHandlers(): () => void {
  if (typeof window === "undefined" || postHogErrorHandlersAttached) {
    return () => undefined;
  }

  const onError = (event: ErrorEvent) => {
    capturePostHogException(getErrorFromEvent(event), { source: "window.error" });
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    capturePostHogException(event.reason, { source: "unhandledrejection" });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
  postHogErrorHandlersAttached = true;

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
    postHogErrorHandlersAttached = false;
  };
}
