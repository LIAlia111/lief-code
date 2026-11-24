import { useGT } from "gt-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "~/lib/utils";

export type WorkspaceMode = "task" | "board" | "automation";

const MODES = ["task", "board", "automation"] as const;

const WorkspaceModeContext = createContext<
  readonly [WorkspaceMode, (mode: WorkspaceMode) => void] | null
>(null);

export function WorkspaceModeProvider({
  targetKey,
  children,
}: {
  targetKey: string | null;
  children: ReactNode;
}) {
  const [selection, setSelection] = useState<{ targetKey: string | null; mode: WorkspaceMode }>({
    targetKey,
    mode: "task",
  });
  const sameTarget = selection.targetKey === targetKey;
  // The home page opens a draft on its own; that must not close a board the user just opened.
  const mode = sameTarget || selection.targetKey === null ? selection.mode : "task";
  if (!sameTarget) setSelection({ targetKey, mode });
  return (
    <WorkspaceModeContext value={[mode, (next) => setSelection({ targetKey, mode: next })]}>
      {children}
    </WorkspaceModeContext>
  );
}

export function useWorkspaceMode() {
  const shared = useContext(WorkspaceModeContext);
  const standalone = useState<WorkspaceMode>("task");
  return shared ?? standalone;
}

export function WorkspaceModeSwitch({
  value,
  onChange,
}: {
  readonly value: WorkspaceMode;
  readonly onChange: (mode: WorkspaceMode) => void;
}) {
  const gt = useGT();
  const labels: Record<WorkspaceMode, string> = {
    task: gt("Tasks"),
    board: gt("Board", { $context: "workspace task board" }),
    automation: gt("Automation"),
  };
  return (
    <nav aria-label={gt("Workspace")} className="flex h-full items-center justify-center">
      <div className="flex items-center gap-0.5 rounded-lg bg-border p-0.5 [-webkit-app-region:no-drag]">
        {MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={value === mode}
            onClick={() => onChange(mode)}
            className={cn(
              "rounded-composer-control px-2 py-1 text-xs whitespace-nowrap text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4 sm:text-sm lg:px-6",
              value === mode && "bg-card font-medium text-foreground",
            )}
          >
            {labels[mode]}
          </button>
        ))}
      </div>
    </nav>
  );
}
