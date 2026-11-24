import type { ReactNode } from "react";

import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useUiText } from "../../i18n/useUiText";
import { workspaceAreaProps } from "../../lib/workspaceFocus";
import { RIGHT_PANEL_INLINE_LAYOUT_MEDIA_QUERY } from "../../rightPanelLayout";
import { useEnvironments, usePrimaryEnvironmentId } from "../../state/environments";
import { SidebarInset } from "../ui/sidebar";
import { QuotaTopbar } from "../usage/QuotaTopbar";
import { ThreadSummaryChanges, ThreadSummaryRail } from "./ThreadSummaryRail";
import { useWorkspaceMode } from "./WorkspaceModeSwitch";
import { WorkspaceTaskHeader, WorkspaceTaskSurface } from "./WorkspaceTaskLayout";

export function WorkspaceEmptyTask({
  environment,
  children,
  insideThread = false,
}: {
  environment?: ReactNode;
  children?: ReactNode;
  insideThread?: boolean;
}) {
  const text = useUiText();
  const [mode, setMode] = useWorkspaceMode();
  const narrow = useMediaQuery(RIGHT_PANEL_INLINE_LAYOUT_MEDIA_QUERY);
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const { environments } = useEnvironments();
  const primaryEnvironment =
    environments.find((entry) => entry.environmentId === primaryEnvironmentId) ?? environments[0];
  const showRail = mode === "task" && !narrow;
  const content = (
    <>
      <WorkspaceTaskHeader mode={mode} onModeChange={setMode} showQuota={!showRail} />
      <WorkspaceTaskSurface mode={mode}>
        {mode === "task" ? (
          <div className="col-start-1 row-start-2 flex min-h-0 min-w-0 flex-col overflow-y-auto">
            {children}
          </div>
        ) : null}
        {showRail ? (
          <ThreadSummaryRail
            environment={
              environment ?? (
                <>
                  <div>
                    {primaryEnvironment?.environmentId === primaryEnvironmentId
                      ? text("Local machine")
                      : (primaryEnvironment?.label ?? text("Unavailable"))}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{text("No project")}</div>
                </>
              )
            }
            quota={<QuotaTopbar appearance="rail" />}
            changes={<ThreadSummaryChanges files={[]} />}
          />
        ) : null}
      </WorkspaceTaskSurface>
    </>
  );
  return insideThread ? (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">{content}</div>
  ) : (
    <SidebarInset
      {...workspaceAreaProps("home", 1, text("Home"))}
      role="main"
      className="h-dvh min-h-0 overflow-hidden overscroll-y-none"
    >
      {content}
    </SidebarInset>
  );
}
