import { useState } from "react";
import { expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import { render } from "../../../test/render";
import { CosmicEffortSlider } from "./CosmicEffortSlider";

const options = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium", isDefault: true },
  { id: "high", label: "High" },
];

function Harness() {
  const [value, setValue] = useState("medium");
  return (
    <CosmicEffortSlider label="Thinking" options={options} value={value} onChange={setValue} />
  );
}

it("renders labeled effort radio segments and marks the selected default", async () => {
  await using screen = await render(<Harness />, { router: false }); // no routes involved
  const group = screen.getByRole("radiogroup", { name: "Thinking" });
  const medium = screen.getByRole("radio", { name: "Medium (Default)" });
  await expect.element(group.getByRole("radio")).toHaveLength(3);
  await expect.element(medium).toHaveAttribute("aria-checked", "true");
  await expect.element(medium).toHaveAttribute("tabindex", "0");
  await expect
    .element(screen.getByRole("radio", { name: "Low" }))
    .toHaveAttribute("tabindex", "-1");
  await expect.element(screen.getByText("Reasoning effort · Medium")).toBeInTheDocument();
});

it("changes the selected effort with segment clicks and arrow keys", async () => {
  await using screen = await render(<Harness />, { router: false }); // no routes involved
  const low = screen.getByRole("radio", { name: "Low" });
  const medium = screen.getByRole("radio", { name: "Medium (Default)" });
  const high = screen.getByRole("radio", { name: "High" });

  await userEvent.click(low);
  await expect.element(low).toHaveAttribute("aria-checked", "true");
  await expect.element(screen.getByText("Reasoning effort · Low")).toBeInTheDocument();

  await userEvent.click(medium);
  await userEvent.keyboard("{ArrowRight}");
  await expect.element(high).toHaveAttribute("aria-checked", "true");
  await expect.element(screen.getByText("Reasoning effort · High")).toBeInTheDocument();

  await userEvent.keyboard("{ArrowLeft}");
  await expect.element(medium).toHaveAttribute("aria-checked", "true");
  await expect.element(screen.getByText("Reasoning effort · Medium")).toBeInTheDocument();
});
