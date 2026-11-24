import type { ComponentProps, ReactNode } from "react";

import { cn } from "~/lib/utils";
import { isElectron } from "../../env";
import { WorkspacePageHeader } from "../WorkspacePageHeader";
import { QuotaTopbar } from "../usage/QuotaTopbar";
import { WorkspaceAutomationPanel } from "./WorkspaceAutomationPanel";
import { WorkspaceBoardPlaceholder } from "./WorkspaceBoardPlaceholder";
import { WorkspaceModeSwitch, type WorkspaceMode } from "./WorkspaceModeSwitch";

export function WorkspaceTaskHeader({
  mode,
  onModeChange,
  showQuota,
  draggable = isElectron,
  reserveNativeControls,
  children,
}: {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  showQuota: boolean;
  draggable?: boolean;
  reserveNativeControls?: boolean;
  children?: ReactNode;
}) {
  return (
    <WorkspacePageHeader
      electron={isElectron}
      draggable={draggable}
      reserveNativeControls={reserveNativeControls ?? isElectron}
      showQuota={false}
      data-chat-header=""
      data-workspace-mode-header=""
      className="workspace-task-header"
    >
      <div className="workspace-task-header-actions">
        {showQuota ? <QuotaTopbar appearance="compact" /> : null}
      </div>
      <WorkspaceModeSwitch value={mode} onChange={onModeChange} />
      {children}
    </WorkspacePageHeader>
  );
}

export function WorkspaceTaskSurface({
  mode,
  embedded,
  className,
  children,
  ...props
}: ComponentProps<"section"> & { mode: WorkspaceMode; embedded?: boolean }) {
  return (
    <section
      {...props}
      data-chat-layout-card=""
      data-workspace-task-surface={embedded ? undefined : ""}
      className={cn("workspace-task-surface", className)}
    >
      {children}
      {mode !== "task" ? (
        <div className="col-span-full row-span-full flex min-h-0">
          {mode === "board" ? <WorkspaceBoardPlaceholder /> : <WorkspaceAutomationPanel />}
        </div>
      ) : null}
    </section>
  );
}
