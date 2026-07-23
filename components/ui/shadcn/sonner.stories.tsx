import type { Meta, StoryObj } from "@storybook/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/shadcn/button";

import { Toaster } from "./sonner";

const meta = {
  title: "UI/Shadcn/Sonner",
  component: Toaster,
  tags: ["autodocs"],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div id="sonner-story" className="flex flex-col gap-3 p-4">
      <Button
        id="sonner-story-trigger"
        type="button"
        onClick={() => toast("Event has been created.")}
      >
        Show toast
      </Button>
      <Toaster id="sonner-story-toaster" position="bottom-center" />
    </div>
  ),
};
