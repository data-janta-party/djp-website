import type { Meta, StoryObj } from "@storybook/react";

import { AnalyticsConsentProvider } from "@/lib/analytics/analytics-consent-context";

import { AnalyticsConsentBanner } from "./AnalyticsConsentBanner";

const meta = {
  title: "UI/Compositions/Shared/AnalyticsConsentBanner",
  component: AnalyticsConsentBanner,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <AnalyticsConsentProvider>
        <div id="analytics-consent-story" className="min-h-48 bg-background p-4">
          <p id="analytics-consent-story-hint" className="text-sm text-muted-foreground">
            Banner only appears when PostHog is enabled (token present) and consent is unset.
            Clear localStorage key <code>analytics-consent</code> if it does not show.
          </p>
          <Story />
        </div>
      </AnalyticsConsentProvider>
    ),
  ],
} satisfies Meta<typeof AnalyticsConsentBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
