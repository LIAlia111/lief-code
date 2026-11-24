import "~/index.css";
import { StrictMode, type ReactNode } from "react";
import { EnvironmentId, ThreadId, type ScopedThreadRef } from "@lief/contracts";
import { expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { act, render } from "../../../test/render";
import { selectThreadPanelOpen, useRightPanelStore } from "../../rightPanelStore";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "../ui/menu";
import { PopoverCreateHandle } from "../ui/popover";
import { ChatCanvasContext } from "./ChatCanvasContext";
import { resolveChatCanvasLayout } from "./chatCanvasLayout";
import { ThreadDetailsCard } from "./ThreadDetailsCard";

const threadA: ScopedThreadRef = {
  environmentId: EnvironmentId.make("environment"),
  threadId: ThreadId.make("thread-a"),
};
const threadB: ScopedThreadRef = {
  environmentId: EnvironmentId.make("environment"),
  threadId: ThreadId.make("thread-b"),
};
const container = { width: 1200, height: 800 };
const placement = { x: 908, y: 0, right: 12, width: 280, height: 400 } as const;

function setup() {
  useRightPanelStore.setState({ threadPanelVisibilityByThreadKey: {} });
  for (const ref of [threadA, threadB])
    useRightPanelStore.getState().setThreadPanelOpen(ref, "inline", true);
  const anchor = document.createElement("div");
  document.body.append(anchor);
  return {
    anchor: { current: anchor },
    handle: PopoverCreateHandle(),
    [Symbol.dispose]: () => anchor.remove(),
  };
}

const popoverOpen = (threadRef: ScopedThreadRef) =>
  selectThreadPanelOpen(
    useRightPanelStore.getState().threadPanelVisibilityByThreadKey,
    threadRef,
    "popover",
  );

function Card({
  threadRef,
  inline,
  fixture,
  rows = 1,
  automationRows = 0,
  serverOverflowRows = 0,
  toolbar,
}: {
  threadRef: ScopedThreadRef;
  inline: boolean;
  fixture: ReturnType<typeof setup>;
  /** Rows of 100px shown at full density. Compact always takes 50px. */
  rows?: number;
  /** Rows of 100px in an automations list shown at full density. */
  automationRows?: number;
  /** Rows of 100px that expanded server lists add, which density ignores. */
  serverOverflowRows?: number;
  toolbar?: ReactNode;
}) {
  return (
    // The web root renders in StrictMode, which re-runs ref callbacks on every mount.
    <StrictMode>
      <ChatCanvasContext
        value={{
          container,
          lane: { padding: 48, minChatWidth: 640 },
          layout: resolveChatCanvasLayout({ container, preview: null }),
          previewKey: null,
          registerTimeline: () => {},
          measureDetailsCard: () => {},
          detailsCardTopInset: 0,
          preferredDetailsCard: placement,
          detailsCardPlacement: inline ? placement : null,
        }}
      >
        <ThreadDetailsCard
          threadRef={threadRef}
          anchor={fixture.anchor}
          handle={fixture.handle}
          contentKey={String(rows)}
        >
          {(density) => (
            <>
              {toolbar}
              <p style={{ height: density === "full" ? rows * 100 : 50 }}>
                Details for {threadRef.threadId}
              </p>
              {density === "full" && automationRows > 0 ? (
                <section data-thread-automations-panel style={{ height: automationRows * 100 }} />
              ) : null}
              {density === "full" && serverOverflowRows > 0 ? (
                <div
                  data-thread-details-server-overflow
                  style={{ height: serverOverflowRows * 100 }}
                />
              ) : null}
            </>
          )}
        </ThreadDetailsCard>
      </ChatCanvasContext>
    </StrictMode>
  );
}

it("stays open once opened", async () => {
  using fixture = setup();
  await using _screen = await render(<Card threadRef={threadB} inline={false} fixture={fixture} />);
  await act(() => useRightPanelStore.getState().setThreadPanelOpen(threadB, "popover", true));
  await expect.element(page.getByText("Details for thread-b")).toBeVisible();
  expect(popoverOpen(threadB)).toBe(true);
});

it("keeps menus opened from the details popover reachable over its content", async () => {
  using fixture = setup();
  fixture.anchor.current.style.cssText =
    "position:fixed;top:40px;left:40px;width:500px;height:24px";
  const select = vi.fn();
  await using _screen = await render(
    <Card
      threadRef={threadB}
      inline={false}
      fixture={fixture}
      rows={3}
      toolbar={
        <Menu>
          <MenuTrigger>Run context</MenuTrigger>
          <MenuPopup align="start">
            <MenuItem onClick={select}>New worktree</MenuItem>
          </MenuPopup>
        </Menu>
      }
    />,
  );
  await act(() => useRightPanelStore.getState().setThreadPanelOpen(threadB, "popover", true));
  await userEvent.click(page.getByRole("button", { name: "Run context" }));
  const item = page.getByRole("menuitem", { name: "New worktree" });
  await expect.element(item).toBeVisible();
  await vi.waitFor(() => {
    const element = item.element();
    const rect = element.getBoundingClientRect();
    const popover = document.querySelector("[data-thread-details-card]")!.getBoundingClientRect();
    const hitX = rect.left + rect.width / 2;
    const hitY = rect.top + rect.height / 2;
    expect(hitX).toBeGreaterThan(popover.left);
    expect(hitX).toBeLessThan(popover.right);
    expect(hitY).toBeGreaterThan(popover.top);
    expect(hitY).toBeLessThan(popover.bottom);
    expect(element.contains(document.elementFromPoint(hitX, hitY))).toBe(true);
  });
  await userEvent.click(item);
  expect(select).toHaveBeenCalledOnce();
});

it("closes a popup left open when the card switches inline, and reopens from the flag", async () => {
  using fixture = setup();
  await using screen = await render(<Card threadRef={threadB} inline={false} fixture={fixture} />);
  const setOpen = (open: boolean) =>
    act(() => useRightPanelStore.getState().setThreadPanelOpen(threadB, "popover", open));
  await setOpen(true);
  await expect.element(page.getByText("Details for thread-b")).toBeVisible();

  useRightPanelStore.getState().setThreadPanelOpen(threadB, "inline", false);
  await screen.rerender(<Card threadRef={threadB} inline fixture={fixture} />);
  await expect.element(page.getByText("Details for thread-b")).not.toBeInTheDocument();
  await setOpen(false);

  await screen.rerender(<Card threadRef={threadB} inline={false} fixture={fixture} />);
  await expect.element(page.getByText("Details for thread-b")).not.toBeInTheDocument();
  await setOpen(true);
  await expect.element(page.getByText("Details for thread-b")).toBeVisible();
});

it("does not reopen the popover when the card returns from inline mode", async () => {
  using fixture = setup();
  await using screen = await render(<Card threadRef={threadB} inline={false} fixture={fixture} />);
  await act(() => useRightPanelStore.getState().setThreadPanelOpen(threadB, "popover", true));
  await expect.element(page.getByText("Details for thread-b")).toBeVisible();

  useRightPanelStore.getState().setThreadPanelOpen(threadB, "inline", false);
  await screen.rerender(<Card threadRef={threadB} inline fixture={fixture} />);
  await expect.element(page.getByText("Details for thread-b")).not.toBeInTheDocument();

  await screen.rerender(<Card threadRef={threadB} inline={false} fixture={fixture} />);
  await expect.element(page.getByText("Details for thread-b")).not.toBeInTheDocument();
  expect(popoverOpen(threadB)).toBe(false);
});

it("removes the leaving thread's popup on a thread switch", async () => {
  using fixture = setup();
  await using screen = await render(<Card threadRef={threadB} inline={false} fixture={fixture} />);
  await act(() => useRightPanelStore.getState().setThreadPanelOpen(threadB, "popover", true));
  await expect.element(page.getByText("Details for thread-b")).toBeVisible();

  await screen.rerender(<Card threadRef={threadA} inline={false} fixture={fixture} />);
  await expect.element(page.getByText("Details for thread-b")).not.toBeInTheDocument();
  await expect.element(page.getByText("Details for thread-a")).not.toBeInTheDocument();
});

it("reopens after a normal close", async () => {
  using fixture = setup();
  await using _screen = await render(<Card threadRef={threadB} inline={false} fixture={fixture} />);
  const setOpen = (open: boolean) =>
    act(() => useRightPanelStore.getState().setThreadPanelOpen(threadB, "popover", open));
  await setOpen(true);
  await expect.element(page.getByText("Details for thread-b")).toBeVisible();
  await setOpen(false);
  await expect.element(page.getByText("Details for thread-b")).not.toBeInTheDocument();
  await setOpen(true);
  await expect.element(page.getByText("Details for thread-b")).toBeVisible();
});

it("returns to full density when hidden items make the content fit", async () => {
  using fixture = setup();
  await using screen = await render(<Card threadRef={threadB} inline fixture={fixture} rows={6} />);
  const card = page.getByRole("region", { name: "Thread details" });
  await expect.element(card).toHaveAttribute("data-density", "compact");

  await screen.rerender(<Card threadRef={threadB} inline fixture={fixture} rows={2} />);
  await expect.element(card).toHaveAttribute("data-density", "full");
});

it("keeps full density when many automations make the content tall", async () => {
  using fixture = setup();
  await using _screen = await render(
    <Card threadRef={threadB} inline fixture={fixture} rows={2} automationRows={6} />,
  );
  await expect.element(page.getByText("Details for thread-b")).toBeVisible();
  await expect
    .element(page.getByRole("region", { name: "Thread details" }))
    .toHaveAttribute("data-density", "full");
});

it("stays full while expanded server rows overflow", async () => {
  using fixture = setup();
  await using _screen = await render(
    <Card threadRef={threadB} inline fixture={fixture} rows={2} serverOverflowRows={4} />,
  );
  await expect
    .element(page.getByRole("region", { name: "Thread details" }))
    .toHaveAttribute("data-density", "full");
});
