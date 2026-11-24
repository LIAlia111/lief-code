import type { DesktopAppBranding } from "@lief/contracts";
import {
  formatAppDisplayName,
  resolveReleaseStageLabel,
  resolveWebAppStageLabel,
} from "./branding.logic";

function readInjectedDesktopAppBranding(): DesktopAppBranding | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.desktopBridge?.getAppBranding() ?? null;
}

const injectedDesktopAppBranding = readInjectedDesktopAppBranding();
export function appBaseName(): string {
  return "Lief.code";
}
// Set by the stable release build (VITE_RELEASE_CHANNEL=stable). Such a build hides the Nightly
// stage even though it carries the upstream nightly version stamp.
export const RELEASE_CHANNEL = import.meta.env.VITE_RELEASE_CHANNEL?.trim().toLowerCase() || null;
const BUILD_STAGE_LABEL =
  injectedDesktopAppBranding?.stageLabel ??
  resolveWebAppStageLabel({
    development: import.meta.env.DEV,
  });
export const APP_STAGE_LABEL = resolveReleaseStageLabel({
  stageLabel: BUILD_STAGE_LABEL,
  releaseChannel: RELEASE_CHANNEL,
});
export function appDisplayName(): string {
  if (injectedDesktopAppBranding && APP_STAGE_LABEL !== "Dev") return appBaseName();
  return formatAppDisplayName({ baseName: appBaseName(), stageLabel: APP_STAGE_LABEL });
}
export const APP_VERSION = import.meta.env.APP_VERSION || "0.0.0";
export const PROJECT_URL = "https://github.com/LIAlia111/lief-code";
export const DESKTOP_DOWNLOAD_URL = `${PROJECT_URL}/releases`;
