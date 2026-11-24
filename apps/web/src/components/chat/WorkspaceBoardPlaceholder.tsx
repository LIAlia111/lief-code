import { T, useGT } from "gt-react";

export function WorkspaceBoardPlaceholder() {
  const gt = useGT();
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-center">
      <div className="max-w-sm">
        <h2 className="m-0 text-base font-medium text-foreground">
          {gt("Board", { $context: "workspace task board" })}
        </h2>
        <p className="mb-0 mt-2 text-sm text-muted-foreground">
          <T>Coming Soon</T>
        </p>
      </div>
    </div>
  );
}
