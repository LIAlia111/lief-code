import type { ReactNode } from "react";
import { useUiText } from "~/i18n/useUiText";
import { cn } from "~/lib/utils";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

interface CosmicEffortOption {
  readonly id: string;
  readonly label: string;
  readonly description?: string | undefined;
  readonly isDefault?: boolean | undefined;
}

export function CosmicEffortSlider({
  label,
  options,
  value,
  disabled,
  onChange,
  children,
}: {
  label: string;
  options: ReadonlyArray<CosmicEffortOption>;
  value: string | null | undefined;
  disabled?: boolean;
  onChange: (id: string) => void;
  children?: ReactNode;
}) {
  const uiText = useUiText();
  const selectedIndex = options.findIndex((option) => option.id === value);
  const activeLabel = options[selectedIndex]?.label ?? label;

  return (
    <div data-cosmic-effort-slider className="min-w-0 space-y-1.5 px-1.5 pb-1.5">
      <div className="truncate text-xs font-medium text-muted-foreground">
        {uiText("Reasoning effort · {level}", { level: uiText(activeLabel) })}
      </div>
      {children ?? (
        <div
          role="radiogroup"
          aria-label={label}
          className="flex flex-wrap gap-1 rounded-lg border border-border bg-background p-1"
        >
          {options.map((option, index) => {
            const translatedLabel = uiText(option.label);
            const accessibleLabel = option.isDefault
              ? `${translatedLabel} (Default)`
              : translatedLabel;
            const selected = index === selectedIndex;
            const segment = (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={accessibleLabel}
                disabled={disabled}
                data-effort-row
                data-effort-level
                tabIndex={index === Math.max(0, selectedIndex) ? 0 : -1}
                className={cn(
                  "min-h-7 flex-1 cursor-pointer rounded-md border border-transparent px-2 py-0.5 text-xs text-muted-foreground outline-none enabled:hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
                  selected && "border-border bg-card font-semibold text-foreground",
                )}
                onClick={() => onChange(option.id)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                  const forward = event.key === "ArrowRight";
                  const next = options[index + (forward ? 1 : -1)];
                  if (!next) return;
                  event.preventDefault();
                  event.stopPropagation();
                  onChange(next.id);
                  const sibling = forward
                    ? event.currentTarget.nextElementSibling
                    : event.currentTarget.previousElementSibling;
                  (sibling as HTMLElement | null)?.focus();
                }}
              >
                {translatedLabel}
              </button>
            );
            return option.description ? (
              <Tooltip key={option.id}>
                <TooltipTrigger render={segment} />
                <TooltipPopup side="top" className="max-w-56">
                  {option.description}
                </TooltipPopup>
              </Tooltip>
            ) : (
              segment
            );
          })}
        </div>
      )}
    </div>
  );
}
