import type * as React from "react";

import { cn } from "~/lib/utils";

function Kbd({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"kbd"> & {
  /** `outline` draws a physical key, so the hint stays distinct inside surrounding text. */
  variant?: "default" | "outline";
}) {
  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center gap-1 rounded-sm border border-b-2 border-border px-1 font-mono text-2xs text-muted-foreground [&_svg:not([class*='size-'])]:size-3",
        variant === "outline" ? "px-1.5" : "bg-card",
        className,
      )}
      data-slot="kbd"
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn("inline-flex items-center gap-1", className)}
      data-slot="kbd-group"
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
