const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

export function getPostHogKey(): string | null {
  const key =
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  return key ? key : null;
}

export function getPostHogHost(): string {
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
  return host || DEFAULT_POSTHOG_HOST;
}

export function isPostHogEnabled(): boolean {
  if (process.env.NODE_ENV === "test") {
    return false;
  }

  return Boolean(getPostHogKey());
}
