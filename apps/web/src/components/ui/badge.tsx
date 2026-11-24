import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const badgeVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-transparent font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-64 [&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-3.5 sm:[&_svg:not([class*='size-'])]:size-3 [&_svg]:pointer-events-none [&_svg]:shrink-0 [button&,a&]:cursor-pointer [button&,a&]:pointer-coarse:after:absolute [button&,a&]:pointer-coarse:after:size-full [button&,a&]:pointer-coarse:after:min-h-11 [button&,a&]:pointer-coarse:after:min-w-11",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        control: "h-7 min-w-7 px-1.75 text-sm sm:h-6 sm:min-w-6 sm:text-xs",
        default: "h-5.5 min-w-5.5 px-0.75 text-sm sm:h-4.5 sm:min-w-4.5 sm:text-xs",
        lg: "h-6.5 min-w-6.5 px-1.25 text-base sm:h-5.5 sm:min-w-5.5 sm:text-sm",
        // Fractional leading rounds font metrics and raises fixed-height labels, especially under zoom.
        sm: "h-5 min-w-5 px-0.75 text-xs leading-none sm:h-4 sm:min-w-4 sm:text-3xs",
      },
      variant: {
        default: "bg-accent text-primary [button&,a&]:hover:bg-primary/15",
        destructive: "bg-destructive text-white [button&,a&]:hover:bg-destructive/90",
        error: "bg-destructive/8 text-destructive-foreground dark:bg-destructive/16",
        info: "bg-info/8 text-info-foreground dark:bg-info/16",
        outline: "border-border bg-transparent text-muted-foreground [button&,a&]:hover:bg-accent",
        secondary: "bg-muted text-secondary-foreground [button&,a&]:hover:bg-accent",
        success: "bg-success/15 text-success-foreground",
        warning: "bg-warning/18 text-warning-foreground",
        label:
          "bg-[color-mix(in_srgb,var(--label)_8%,transparent)] text-[color-mix(in_srgb,var(--label)_30%,var(--color-foreground))] dark:bg-[color-mix(in_srgb,var(--label)_12%,transparent)] dark:text-[color-mix(in_srgb,var(--label)_45%,var(--color-foreground))]",
      },
    },
  },
);

interface BadgeProps extends useRender.ComponentProps<"span"> {
  variant?: VariantProps<typeof badgeVariants>["variant"];
  size?: VariantProps<typeof badgeVariants>["size"];
}

function Badge({ className, variant, size, render, ...props }: BadgeProps) {
  const defaultProps = {
    className: cn(badgeVariants({ className, size, variant })),
    "data-slot": "badge",
  };

  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(defaultProps, props),
    render,
  });
}

export { Badge, badgeVariants };
