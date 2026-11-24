/** Lines for the summary rail's collapsed environment block. */
export function threadSummaryEnvironmentLines(input: {
  readonly autoEnvironmentLabel?: string | null | undefined;
  readonly isPrimary: boolean;
  readonly environmentLabel?: string | null | undefined;
  readonly projectTitle?: string | null | undefined;
  readonly projectPath: string;
  readonly localMachineLabel: string;
  readonly fallbackMachineLabel: string;
}): { readonly machine: string; readonly detail: string } {
  const auto = input.autoEnvironmentLabel?.trim() ?? "";
  const label = input.environmentLabel?.trim() ?? "";
  const machine =
    auto.length > 0
      ? auto
      : input.isPrimary
        ? input.localMachineLabel
        : label.length > 0
          ? label
          : input.fallbackMachineLabel;
  const title = input.projectTitle?.trim() ?? "";
  const detail = title.length > 0 ? `${title} · ${input.projectPath}` : input.projectPath;
  return { machine, detail };
}
