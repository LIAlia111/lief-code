import { useAtomValue } from "@effect/atom-react";
import type { EnvironmentIdentificationMode } from "@lief/contracts";

import { APP_STAGE_LABEL, RELEASE_CHANNEL } from "../branding";
import { resolveServerBackedAppStageLabel } from "../branding.logic";
import { primaryServerConfigAtom } from "../state/server";

export type SidebarStageBackdropVariant = "nightly" | "dev";
export type EnvironmentIdentificationPillLabel = "Dev" | "Nightly";

export function resolveSidebarStageBackdropVariant(
  stageLabel: string,
  mode: EnvironmentIdentificationMode = "artwork",
): SidebarStageBackdropVariant | null {
  if (mode === "nightly-artwork") return "nightly";
  if (mode === "dev-artwork") return "dev";
  if (mode !== "artwork") return null;
  const normalized = stageLabel.trim().toLowerCase();
  if (normalized === "nightly") return "nightly";
  if (normalized === "dev") return "dev";
  return null;
}

export function resolveEnvironmentIdentificationPillLabel(
  stageLabel: string,
): EnvironmentIdentificationPillLabel | null {
  const normalized = stageLabel.trim().toLowerCase();
  // oxlint-disable-next-line lief/no-untranslated-copy -- release channel names
  if (normalized === "dev") return "Dev";
  // oxlint-disable-next-line lief/no-untranslated-copy -- release channel names
  if (normalized === "nightly") return "Nightly";
  return null;
}

export function useEnvironmentStageLabel(): string {
  const primaryServerVersion =
    useAtomValue(primaryServerConfigAtom)?.environment.serverVersion ?? null;

  return resolveServerBackedAppStageLabel({
    primaryServerVersion,
    fallbackStageLabel: APP_STAGE_LABEL,
    releaseChannel: RELEASE_CHANNEL,
  });
}

export function useSidebarStageBackdropVariant(
  mode: EnvironmentIdentificationMode,
): SidebarStageBackdropVariant | null {
  return resolveSidebarStageBackdropVariant(useEnvironmentStageLabel(), mode);
}
