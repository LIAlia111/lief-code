import type { ReactNode } from "react";

import { useUiText } from "../../i18n/useUiText";
import { cn } from "~/lib/utils";
import { StartTruncatedPath } from "../StartTruncatedPath";
import { DiffStatLabel } from "./DiffStatLabel";

const SECTIONS = ["environment", "context", "quota", "changes"] as const;

type SummarySection = (typeof SECTIONS)[number];

/**
 * Right-hand summary column. It only arranges the four blocks.
 * Callers pass the existing environment, context, quota, and changes views.
 */
export function ThreadSummaryRail({
  environment,
  context,
  quota,
  changes,
}: {
  readonly environment?: ReactNode;
  readonly context?: ReactNode;
  readonly quota: ReactNode;
  readonly changes: ReactNode;
}) {
  const uiText = useUiText();
  const bodies: Record<SummarySection, ReactNode> = {
    environment: environment ?? (
      <span className="text-muted-foreground">{uiText("No project")}</span>
    ),
    context: context ?? <span className="text-muted-foreground">{uiText("Unavailable")}</span>,
    quota,
    changes,
  };
  const titles: Record<SummarySection, string> = {
    environment: uiText("Environment"),
    context: uiText("Context window"),
    quota: uiText("Quota"),
    changes: uiText("Changes"),
  };
  return (
    <aside
      data-thread-summary-rail=""
      aria-label={uiText("Thread summary")}
      className="thread-summary-rail col-start-2 row-start-1 row-span-2 min-h-0 overflow-y-auto border-s border-border px-4.5 py-4 text-lief-body text-foreground"
    >
      {SECTIONS.map((section, index) => (
        <section
          key={section}
          data-thread-summary-section={section}
          aria-label={titles[section]}
          className={cn(
            "min-w-0",
            section === "quota" && "relative",
            index < SECTIONS.length - 1 && "mb-4 border-b border-border pb-4",
          )}
        >
          <h4
            className={cn(
              "mb-2 text-xs font-medium text-muted-foreground",
              section === "quota" && "flex min-h-7 items-center pe-9",
            )}
          >
            {titles[section]}
          </h4>
          {bodies[section]}
        </section>
      ))}
    </aside>
  );
}

export interface ThreadSummaryChangeFile {
  readonly path: string;
  readonly additions: number;
  readonly deletions: number;
}

/** Workspace change rows. Stats and open handlers come from the existing diff path. */
export function ThreadSummaryChanges({
  files,
  onOpenChanges,
  onOpenFile,
}: {
  readonly files: readonly ThreadSummaryChangeFile[];
  readonly onOpenChanges?: (() => void) | undefined;
  readonly onOpenFile?: ((path: string) => void) | undefined;
}) {
  const uiText = useUiText();
  if (files.length === 0) {
    return <p className="m-0 text-muted-foreground">{uiText("No uncommitted changes")}</p>;
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
      {files.map((file) => {
        const open = () => {
          if (onOpenFile) onOpenFile(file.path);
          else onOpenChanges?.();
        };
        const interactive = onOpenFile !== undefined || onOpenChanges !== undefined;
        const body = (
          <>
            <StartTruncatedPath path={file.path} className="min-w-0 flex-1 text-lief-body" />
            <DiffStatLabel additions={file.additions} deletions={file.deletions} layout="inline" />
          </>
        );
        return (
          <li key={file.path} className="min-w-0">
            {interactive ? (
              <button
                type="button"
                onClick={open}
                className="flex w-full min-w-0 items-baseline justify-between gap-3 rounded-lg border border-transparent bg-transparent px-0.5 py-1 text-left text-lief-body text-foreground outline-none hover:border-border focus-visible:border-border"
              >
                {body}
              </button>
            ) : (
              <div className="flex min-w-0 items-baseline justify-between gap-3 px-0.5 py-1">
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
