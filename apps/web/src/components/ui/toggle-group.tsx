import type { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "~/lib/utils";
import { Toggle as ToggleComponent, type toggleVariants } from "~/components/ui/toggle";

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants>>({
  size: "default",
  variant: "default",
});

function ToggleGroup({
  className,
  variant = "segmented",
  size: sizeProp,
  orientation = "horizontal",
  children,
  ...props
}: ToggleGroupPrimitive.Props & VariantProps<typeof toggleVariants>) {
  const size =
    sizeProp === undefined ? (variant === "segmented" ? "segmented" : "default") : sizeProp;
  const value = { size, variant };
  return (
    <ToggleGroupPrimitive
      className={cn(
        "flex w-fit *:focus-visible:z-10",
        orientation === "horizontal"
          ? "*:pointer-coarse:after:min-w-auto"
          : "*:pointer-coarse:after:min-h-auto",
        variant === "segmented"
          ? "gap-0.5 rounded-lg border border-border bg-card p-0.75 in-data-[inspector-tabs]:border-0"
          : variant === "default"
            ? "gap-0.5"
            : orientation === "horizontal"
              ? "*:not-first:rounded-s-none *:not-last:rounded-e-none *:not-first:border-s-0"
              : "flex-col *:not-first:rounded-t-none *:not-last:rounded-b-none *:not-first:border-t-0",
        className,
      )}
      data-size={size}
      data-slot="toggle-group"
      data-variant={variant}
      orientation={orientation}
      {...props}
    >
      <ToggleGroupContext value={value}>{children}</ToggleGroupContext>
    </ToggleGroupPrimitive>
  );
}

function Toggle({
  className,
  children,
  variant,
  size,
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  const context = React.use(ToggleGroupContext);

  const resolvedVariant = variant ?? context.variant;
  const resolvedSize = size ?? context.size;

  return (
    <ToggleComponent
      className={className}
      data-size={resolvedSize}
      data-variant={resolvedVariant}
      size={resolvedSize}
      variant={resolvedVariant}
      {...props}
    >
      {children}
    </ToggleComponent>
  );
}

export { ToggleGroup, Toggle, Toggle as ToggleGroupItem };
