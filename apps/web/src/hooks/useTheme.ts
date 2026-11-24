import { BUILT_IN_THEMES, type ThemeId } from "@lief/shared/themePalettes";
import { useSyncExternalStore } from "react";
import { safeErrorLogAttributes } from "@lief/client-runtime/errors";

import { applyThemePalette, type ThemeAppearance, type ThemePreferenceMode } from "../themePalette";

type ThemePreference = ThemeId | "system";

const STORAGE_KEY = "lief:theme";
const LEGACY_MODE_KEY = "lief:theme-appearance-mode";
const LEGACY_SYSTEM_KEY = "lief:theme-follow-system";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

export function readAppearanceModePreference(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
): ThemePreferenceMode {
  let stored: string | null;
  let mode: ThemePreferenceMode;
  let legacyMode: string | null;
  let legacySystem: string | null;
  try {
    stored = storage.getItem(STORAGE_KEY);
    legacyMode = storage.getItem(LEGACY_MODE_KEY);
    legacySystem = storage.getItem(LEGACY_SYSTEM_KEY);
    mode =
      legacyMode === "light" || legacyMode === "dark" || legacyMode === "system"
        ? legacyMode
        : stored === "system" || legacySystem === "true"
          ? "system"
          : stored === "lief-light" ||
              stored === "light" ||
              stored === "porcelain" ||
              stored === "mist"
            ? "light"
            : "dark";
  } catch {
    return "dark";
  }

  const preference = mode === "system" ? mode : BUILT_IN_THEMES[mode].id;
  try {
    if (stored !== preference && (stored !== null || mode !== "dark")) {
      storage.setItem(STORAGE_KEY, preference);
    }
    if (legacyMode !== null) storage.removeItem(LEGACY_MODE_KEY);
    if (legacySystem !== null) storage.removeItem(LEGACY_SYSTEM_KEY);
  } catch {}
  return mode;
}

function getStoredMode(): ThemePreferenceMode {
  try {
    return readAppearanceModePreference(window.localStorage);
  } catch {
    return "dark";
  }
}

const THEME_COLOR_META_NAME = "theme-color";
const DYNAMIC_THEME_COLOR_SELECTOR = 'meta[name="theme-color"][data-dynamic-theme-color="true"]';

function ensureThemeColorMetaTag(): HTMLMetaElement {
  let element = document.querySelector<HTMLMetaElement>(DYNAMIC_THEME_COLOR_SELECTOR);
  if (element) {
    return element;
  }

  element = document.createElement("meta");
  element.name = THEME_COLOR_META_NAME;
  element.setAttribute("data-dynamic-theme-color", "true");
  document.head.append(element);
  return element;
}

function normalizeThemeColor(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim().toLowerCase();
  if (
    !normalizedValue ||
    normalizedValue === "transparent" ||
    normalizedValue === "rgba(0, 0, 0, 0)" ||
    normalizedValue === "rgba(0 0 0 / 0)"
  ) {
    return null;
  }

  return value?.trim() ?? null;
}

function resolveBrowserChromeSurface(): HTMLElement {
  return (
    document.querySelector<HTMLElement>("main[data-slot='sidebar-inset']") ??
    document.querySelector<HTMLElement>("[data-slot='sidebar-inner']") ??
    document.body
  );
}

export function syncBrowserChromeTheme() {
  if (typeof document === "undefined" || typeof getComputedStyle === "undefined") return;
  const rootStyles = getComputedStyle(document.documentElement);
  const themeChromeColor = document.documentElement.dataset.themeId
    ? normalizeThemeColor(rootStyles.getPropertyValue("--app-chrome-background"))
    : null;
  const surfaceColor = normalizeThemeColor(
    getComputedStyle(resolveBrowserChromeSurface()).backgroundColor,
  );
  const fallbackColor = normalizeThemeColor(getComputedStyle(document.body).backgroundColor);
  const backgroundColor = themeChromeColor ?? surfaceColor ?? fallbackColor;
  if (!backgroundColor) return;

  document.documentElement.style.backgroundColor = backgroundColor;
  document.body.style.backgroundColor = backgroundColor;
  const themeColorMetas = document.querySelectorAll<HTMLMetaElement>(
    `meta[name="${THEME_COLOR_META_NAME}"]`,
  );
  if (themeColorMetas.length === 0) {
    ensureThemeColorMetaTag().setAttribute("content", backgroundColor);
    return;
  }
  for (const element of themeColorMetas) {
    element.setAttribute("content", backgroundColor);
  }
}

const DEFAULT_SNAPSHOT = {
  theme: BUILT_IN_THEMES.dark.id,
  resolvedTheme: "dark" as ThemeAppearance,
  appearanceMode: "dark" as ThemePreferenceMode,
};

let snapshot = DEFAULT_SNAPSHOT;
let lastDesktopMode: ThemePreferenceMode | null = null;
let paintedAppearance: ThemeAppearance | undefined;
const listeners = new Set<() => void>();

async function syncDesktopTheme(mode: ThemePreferenceMode): Promise<void> {
  const bridge = window.desktopBridge;
  if (!bridge || typeof bridge.setTheme !== "function" || lastDesktopMode === mode) return;
  lastDesktopMode = mode;
  try {
    await bridge.setTheme(mode);
  } catch (cause) {
    console.error("Failed to sync appearance to the desktop shell.", safeErrorLogAttributes(cause));
    if (lastDesktopMode === mode) lastDesktopMode = null;
  }
}

function applyAppearance(mode: ThemePreferenceMode, suppressTransitions = false): void {
  const resolvedTheme =
    mode === "system" ? (window.matchMedia?.(MEDIA_QUERY)?.matches ? "dark" : "light") : mode;
  const theme = BUILT_IN_THEMES[resolvedTheme].id;
  if (paintedAppearance !== resolvedTheme) {
    const root = document.documentElement;
    if (suppressTransitions) root.classList.add("no-transitions");
    applyThemePalette(resolvedTheme);
    paintedAppearance = resolvedTheme;
    syncBrowserChromeTheme();
    if (suppressTransitions) {
      // Commit the palette while transitions are disabled.
      void root.offsetHeight;
      requestAnimationFrame(() => root.classList.remove("no-transitions"));
    }
  }
  void syncDesktopTheme(mode);
  if (snapshot.appearanceMode === mode && snapshot.resolvedTheme === resolvedTheme) return;
  snapshot = { theme, resolvedTheme, appearanceMode: mode };
  for (const listener of listeners) listener();
}

function handleSystemChange(): void {
  if (snapshot.appearanceMode === "system") applyAppearance("system", true);
}

function handleStorageChange(event: StorageEvent): void {
  if (event.key === STORAGE_KEY || event.key === null) applyAppearance(getStoredMode(), true);
}

let removeWindowListeners: (() => void) | undefined;

function subscribe(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  listeners.add(listener);
  if (removeWindowListeners === undefined) {
    const media = window.matchMedia?.(MEDIA_QUERY);
    media?.addEventListener("change", handleSystemChange);
    window.addEventListener("storage", handleStorageChange);
    removeWindowListeners = () => {
      media?.removeEventListener("change", handleSystemChange);
      window.removeEventListener("storage", handleStorageChange);
    };
    handleSystemChange();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      removeWindowListeners?.();
      removeWindowListeners = undefined;
    }
  };
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  applyAppearance(getStoredMode());
}

export function getThemeSnapshot() {
  return snapshot;
}

export function getRenderedAppearance(): ThemeAppearance {
  return snapshot.resolvedTheme;
}

export function subscribeRenderedAppearance(listener: () => void): () => void {
  return subscribe(listener);
}

export function useRenderedAppearance(): ThemeAppearance {
  return useSyncExternalStore(subscribe, getRenderedAppearance, () => "dark");
}

export function setAppearanceMode(mode: ThemePreferenceMode): boolean {
  if (typeof window === "undefined") return false;
  const preference: ThemePreference = mode === "system" ? mode : BUILT_IN_THEMES[mode].id;
  try {
    window.localStorage.setItem(STORAGE_KEY, preference);
  } catch (cause) {
    console.error("Failed to save appearance preference.", safeErrorLogAttributes(cause));
    return false;
  }
  applyAppearance(mode, true);
  return true;
}

export function useTheme() {
  const appearance = useSyncExternalStore(subscribe, getThemeSnapshot, () => DEFAULT_SNAPSHOT);
  return { ...appearance, setAppearanceMode };
}
