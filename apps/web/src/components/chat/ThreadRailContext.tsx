import type { ContextWindowSnapshot } from "@lief/client-runtime/state/context-window";
import { useMessages } from "gt-react";

import { useUiText } from "../../i18n/useUiText";
import { formatContextWindowTokens } from "../../lib/contextWindow";
import { cn } from "../../lib/utils";
import { formatContextWindowCompactionMessage } from "./compaction.logic";

/** The context window as the rail shows it: used share, token counts, and one bar. */
export function ThreadRailContext({ usage }: { readonly usage: ContextWindowSnapshot }) {
  const uiText = useUiText();
  const messages = useMessages();
  const maxTokens = usage.maxTokens != null && usage.maxTokens > 0 ? usage.maxTokens : null;
  const used =
    maxTokens !== null && usage.usedPercentage !== null
      ? Math.round(Math.max(0, Math.min(100, usage.usedPercentage)))
      : null;
  const usedTokens = formatContextWindowTokens(usage.usedTokens);
  const threshold = usage.autoCompactThreshold ?? null;
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">
          {used === null ? usedTokens : uiText("{percent}% used", { percent: used })}
        </span>
        {maxTokens === null ? null : (
          <span className="text-xs text-muted-foreground">
            {usedTokens} / {formatContextWindowTokens(maxTokens)}
          </span>
        )}
      </div>
      {used === null ? null : (
        <div
          role="progressbar"
          aria-label={uiText("{percent}% used", { percent: used })}
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1 overflow-hidden rounded-full bg-border"
        >
          <div
            className={cn(
              "h-full rounded-full",
              used >= 90 ? "bg-destructive" : used >= 80 ? "bg-warning" : "bg-primary",
            )}
            style={{ width: `${used}%` }}
          />
        </div>
      )}
      {threshold !== null && threshold > 0 ? (
        <span className="text-xs text-muted-foreground">
          {formatContextWindowCompactionMessage(threshold, messages)}
        </span>
      ) : null}
    </div>
  );
}
