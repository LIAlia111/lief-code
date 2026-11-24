import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/utils";
import { COLLAPSED_SIDEBAR_TITLEBAR_INSET_CLASS } from "../workspaceTitlebar";
import { QuotaTopbar } from "./usage/QuotaTopbar";

export function WorkspacePageHeader({
  electron = false,
  draggable = electron,
  reserveNativeControls = electron,
  showQuota = true,
  className,
  children,
  ...props
}: Omit<ComponentPropsWithoutRef<"header">, "draggable"> & {
  readonly electron?: boolean;
  /** Whether the window can be moved by this header. */
  readonly draggable?: boolean;
  readonly reserveNativeControls?: boolean;
  readonly showQuota?: boolean;
}) {
  return (
    <header
      data-liquid-workspace-header=""
      className={cn(
        "@container/quota-header flex h-[var(--workspace-topbar-height)]! min-h-[var(--workspace-topbar-height)]! max-h-[var(--workspace-topbar-height)]! shrink-0 items-center gap-3 pl-(--workspace-gutter-start) pr-(--workspace-gutter-end) [[data-panel-animations=true]_&]:motion-safe:transition-[padding-left,padding-right] [[data-panel-animations=true]_&]:motion-safe:duration-(--panel-animation-duration) [[data-panel-animations=true]_&]:motion-safe:ease-out",
        draggable && "drag-region",
        reserveNativeControls && "wco:pr-(--workspace-native-controls-inset)",
        COLLAPSED_SIDEBAR_TITLEBAR_INSET_CLASS,
        className,
      )}
      {...props}
    >
      {children}
      {showQuota ? <QuotaTopbar /> : null}
    </header>
  );
}
