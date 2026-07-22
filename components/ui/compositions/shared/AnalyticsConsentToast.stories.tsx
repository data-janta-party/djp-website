import type { Meta, StoryObj } from "@storybook/react";

import { AnalyticsConsentProvider } from "@/lib/analytics/analytics-consent-context";
import { Toaster } from "@/components/ui/shadcn/sonner";

import { AnalyticsConsentToast } from "./AnalyticsConsentToast";

const meta = {
  title: "UI/Compositions/Shared/AnalyticsConsentToast",
  component: AnalyticsConsentToast,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <AnalyticsConsentProvider>
        <Story />
        <Toaster id="storybook-toaster" position="bottom-center" />
      </AnalyticsConsentProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "PostHog analytics consent via Sonner toast. Requires NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN in Storybook to show (or mock isPostHogEnabled).",
      },
    },
  },
} satisfies Meta<typeof AnalyticsConsentToast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
