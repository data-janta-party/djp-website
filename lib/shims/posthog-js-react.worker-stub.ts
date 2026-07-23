import type { ReactNode } from "react";

export function PostHogProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useFeatureFlagEnabled(): boolean {
  return false;
}
