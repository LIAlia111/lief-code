import { Field as FieldPrimitive } from "@base-ui/react/field";
import { mergeProps } from "@base-ui/react/merge-props";
import type * as React from "react";

import { cn } from "~/lib/utils";

type TextareaProps = React.ComponentProps<"textarea"> & {
  size?: "sm" | "default" | "lg" | number;
  unstyled?: boolean;
};

function Textarea({
  className,
  size = "default",
  unstyled = false,
  rows,
  ...props
}: TextareaProps) {
  return (
    <span
      className={
        cn(
          !unstyled &&
            "relative inline-flex w-full rounded-lg border border-border bg-background text-base text-foreground transition-[border-color,box-shadow] has-focus-visible:border-primary has-focus-visible:ring-2 has-focus-visible:ring-inset has-focus-visible:ring-primary/15 has-aria-invalid:border-destructive has-focus-visible:has-aria-invalid:ring-destructive/15 has-disabled:opacity-60 sm:text-sm",
          className,
        ) || undefined
      }
      data-size={size}
      data-slot="textarea-control"
      data-unstyled={unstyled || undefined}
    >
      <FieldPrimitive.Control
        render={(defaultProps) => (
          <textarea
            className={cn(
              "field-sizing-content max-h-64 w-full rounded-[inherit] px-[calc(--spacing(3)-1px)] py-[calc(--spacing(1.5)-1px)] caret-primary outline-none focus:outline-none focus-visible:outline-none wrap-anywhere",
              rows === undefined && "min-h-17.5 max-sm:min-h-20.5",
              size === "sm" && "px-[calc(--spacing(2.5)-1px)] py-[calc(--spacing(1)-1px)]",
              size === "sm" && rows === undefined && "min-h-16.5 max-sm:min-h-19.5",
              size === "lg" && "py-[calc(--spacing(2)-1px)]",
              size === "lg" && rows === undefined && "min-h-18.5 max-sm:min-h-21.5",
            )}
            // field-sizing: content ignores `rows`, so an explicit row count sets the minimum height.
            style={
              rows === undefined
                ? undefined
                : {
                    minHeight: `calc(${rows}lh + 2 * (var(--spacing) * ${size === "sm" ? 1 : size === "lg" ? 2 : 1.5} - 1px))`,
                  }
            }
            data-slot="textarea"
            rows={rows}
            {...mergeProps(defaultProps, props)}
          />
        )}
      />
    </span>
  );
}

export { Textarea, type TextareaProps };
