import { expect, it, vi } from "vite-plus/test";

import { render } from "../../../test/render";
import "~/index.css";
import { ThreadSummaryChanges, ThreadSummaryRail } from "./ThreadSummaryRail";

it("arranges the four summary blocks and opens a change from its row", async () => {
  const onOpenFile = vi.fn();
  const onOpenChanges = vi.fn();
  await using screen = await render(
    <ThreadSummaryRail
      environment={<p>Local machine</p>}
      context={<p>18% used</p>}
      quota={<p>Claude</p>}
      changes={
        <ThreadSummaryChanges
          files={[{ path: "settings/Appearance.tsx", additions: 24, deletions: 61 }]}
          onOpenChanges={onOpenChanges}
          onOpenFile={onOpenFile}
        />
      }
    />,
  );
  await expect.element(screen.getByRole("heading", { name: "Environment" })).toBeVisible();
  await expect.element(screen.getByRole("heading", { name: "Context window" })).toBeVisible();
  await expect.element(screen.getByRole("heading", { name: "Quota" })).toBeVisible();
  await expect.element(screen.getByRole("heading", { name: "Changes" })).toBeVisible();
  const rail = screen.container.querySelector("[data-thread-summary-rail]");
  expect(rail?.getAttribute("data-thread-summary-rail")).toBe("");
  expect(getComputedStyle(rail!).width).toBe("300px");
  await screen.getByRole("button", { name: /Appearance\.tsx/ }).click();
  expect(onOpenFile).toHaveBeenCalledWith("settings/Appearance.tsx");
  expect(onOpenChanges).not.toHaveBeenCalled();
  expect(screen.container.textContent).toContain("+24");
  expect(screen.container.textContent).toContain("-61");
});

it("uses the workspace changes handler when a row has no file callback", async () => {
  const onOpenChanges = vi.fn();
  await using screen = await render(
    <ThreadSummaryChanges
      files={[{ path: "src/app.ts", additions: 1, deletions: 0 }]}
      onOpenChanges={onOpenChanges}
    />,
  );
  await screen.getByRole("button", { name: /app\.ts/ }).click();
  expect(onOpenChanges).toHaveBeenCalledOnce();
});

it("says when the worktree has no uncommitted changes", async () => {
  await using screen = await render(
    <ThreadSummaryRail quota={null} changes={<ThreadSummaryChanges files={[]} />} />,
  );
  await expect.element(screen.getByText("No project", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("Unavailable", { exact: true })).toBeVisible();
  expect(screen.container.textContent).toContain("No uncommitted changes");
});
