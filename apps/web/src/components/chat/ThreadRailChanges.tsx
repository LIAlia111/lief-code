import { useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";

import { useUiText } from "../../i18n/useUiText";
import type { vcsEnvironment } from "../../state/vcs";
import { ThreadSummaryChanges } from "./ThreadSummaryRail";

const VISIBLE_FILES = 8;

/** Subscribes to the changed files here, so edits re-render the rail and not the chat. */
export function ThreadRailChanges({
  statusAtom,
  onOpenChanges,
}: {
  statusAtom: ReturnType<typeof vcsEnvironment.status>;
  onOpenChanges: () => void;
}) {
  const uiText = useUiText();
  const status = AsyncResult.getOrElse(useAtomValue(statusAtom), () => null);
  const files = status?.workingTree.files ?? [];
  return (
    <div className="flex flex-col gap-1">
      <ThreadSummaryChanges
        files={files.slice(0, VISIBLE_FILES).map((file) => ({
          path: file.path,
          additions: file.insertions,
          deletions: file.deletions,
        }))}
        onOpenChanges={onOpenChanges}
      />
      {files.length > 0 ? (
        <button
          type="button"
          onClick={onOpenChanges}
          className="self-start text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
        >
          {uiText("Open changes panel ({count})", { count: files.length })}
        </button>
      ) : null}
    </div>
  );
}
