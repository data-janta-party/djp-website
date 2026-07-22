import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Toaster } from "./sonner";

describe("Toaster", () => {
  it("renders the sonner region", () => {
    render(<Toaster id="test-toaster" />);
    // Sonner mounts a list region for toasts.
    expect(document.querySelector("[data-sonner-toaster]") ?? screen.queryByRole("region")).toBeTruthy();
  });
});
