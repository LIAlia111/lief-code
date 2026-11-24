import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const toggleVariants = cva(
  "[&_svg]:-mx-0.5 relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-medium text-base text-foreground outline-none transition-colors pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-64 aria-disabled:opacity-64 data-pressed:bg-accent data-pressed:text-accent-foreground sm:text-sm [&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        compact: "h-7 min-w-7 rounded-md px-0.75 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        default: "h-9 min-w-9 px-1.75 sm:h-8 sm:min-w-8",
        lg: "h-10 min-w-10 px-2.25 sm:h-9 sm:min-w-9",
        segmented: "h-6 min-w-0 rounded-md px-2.5 text-xs",
        sm: "h-8 min-w-8 px-1.25 sm:h-7 sm:min-w-7",
        xs: "h-7 min-w-7 rounded-md px-0.75 sm:h-6 sm:min-w-6",
      },
      variant: {
        default: "border-transparent",
        pill: "border-transparent rounded-full px-3 font-normal text-muted-foreground",
        ghost:
          "border-transparent text-foreground disabled:opacity-100 disabled:text-muted-foreground disabled:[&_svg]:opacity-100",
        outline: "border-border bg-card",
        segmented:
          "border-transparent text-muted-foreground hover:text-accent-foreground data-pressed:font-semibold",
      },
    },
  },
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      className={cn(toggleVariants({ className, size, variant }))}
      data-slot="toggle"
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
