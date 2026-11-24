import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "~/lib/utils";

function Switch({
  className,
  size = "default",
  mixed = false,
  ...props
}: SwitchPrimitive.Root.Props & { size?: "default" | "sm"; mixed?: boolean }) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center rounded-full bg-border p-0.5 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-checked:not-data-[mixed]:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-64",
        size === "sm" ? "h-4.5 w-7.5 sm:h-4 sm:w-6.5" : "h-5.5 w-9.5 sm:h-4.5 sm:w-7.5",
        className,
      )}
      data-size={size}
      data-slot="switch"
      data-mixed={mixed ? "" : undefined}
      // Base UI overwrites aria-checked even with undefined; pass it only for mixed state.
      {...(mixed ? { "aria-checked": "mixed" as const } : {})}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block shrink-0 rounded-full bg-muted-foreground shadow-2xs transition-transform duration-150",
          !mixed && "data-checked:bg-primary-foreground",
          size === "sm"
            ? "size-3.5 data-checked:translate-x-3 sm:size-3 sm:data-checked:translate-x-2.5"
            : "size-4.5 data-checked:translate-x-4 sm:size-3.5 sm:data-checked:translate-x-3",
          mixed && "opacity-70",
          mixed &&
            (size === "sm"
              ? "translate-x-1.5 data-checked:translate-x-1.5 sm:translate-x-1.25 sm:data-checked:translate-x-1.25"
              : "translate-x-2 data-checked:translate-x-2 sm:translate-x-1.5 sm:data-checked:translate-x-1.5"),
        )}
        data-slot="switch-thumb"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
