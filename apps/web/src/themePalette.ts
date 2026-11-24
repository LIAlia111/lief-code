import "culori/css";
import { converter, parse } from "culori/fn";
import {
  BUILT_IN_THEMES,
  type ThemeAppearance,
  type ThemeColorRole,
  type ThemeColors,
} from "@lief/shared/themePalettes";
import {
  CONTEXT_CHIP_ACCENTS,
  contextChipColorVariable,
  type ContextChipAccentKind,
} from "./lib/contextChipAccents";

export type { ThemeAppearance } from "@lief/shared/themePalettes";
export type ThemePreferenceMode = ThemeAppearance | "system";

type ThemeRgbColor = {
  r: number;
  g: number;
  b: number;
};

type ThemeOklch = { L: number; C: number; h: number };
type ParsedThemeColor = { color: ThemeOklch; alpha: number };

const THEME_WHITE_FOREGROUND: ThemeRgbColor = { r: 255, g: 255, b: 255 };
const THEME_BLACK_FOREGROUND: ThemeRgbColor = { r: 0, g: 0, b: 0 };

const convertToOklch = converter("oklch");

function parseThemeColor(value: unknown): ParsedThemeColor | null {
  if (typeof value !== "string") return null;
  const input = value.trim();
  const parsed = parse(input);
  if (!parsed) return null;
  const color = convertToOklch(parsed);
  const lightness = color.l ?? 0;
  const chroma = color.c ?? 0;
  const hue = color.h ?? 0;
  // Missing CSS components are zero; Culori omits none alpha, so distinguish it from absent alpha.
  const alpha = /\/\s*none\s*\)$/i.test(input) ? 0 : (color.alpha ?? 1);
  if (![lightness, chroma, hue, alpha].every(Number.isFinite)) return null;
  return {
    color: {
      L: Math.min(1, Math.max(0, lightness)),
      C: Math.max(0, chroma),
      h: hue,
    },
    alpha: Math.min(1, Math.max(0, alpha)),
  };
}

function formatThemeColorNumber(value: number, precision: number): string {
  const rounded = Math.abs(value) < 10 ** -precision / 2 ? 0 : value;
  return rounded.toFixed(precision).replace(/(?:\.0+|(?:(\.[0-9]*?)0+))$/, "$1");
}

export function themeColorToHex(value: string): string | null {
  const color = parseThemeColor(value);
  const parsed = color ? { rgb: themeOklchToRgb(color.color), alpha: color.alpha } : null;
  if (!parsed) return null;

  const opaque = themeRgbToHexColor(parsed.rgb);
  if (parsed.alpha >= 1) return opaque;
  const alpha = Math.round(parsed.alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${opaque}${alpha}`;
}

function themeRgbToHexColor(color: ThemeRgbColor): string {
  return `#${[color.r, color.g, color.b]
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function mixThemeRgbColors(
  base: ThemeRgbColor,
  overlay: ThemeRgbColor,
  amount: number,
): ThemeRgbColor {
  return {
    r: base.r + (overlay.r - base.r) * amount,
    g: base.g + (overlay.g - base.g) * amount,
    b: base.b + (overlay.b - base.b) * amount,
  };
}

function themeRelativeLuminance(color: ThemeRgbColor): number {
  const linearize = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * linearize(color.r) + 0.7152 * linearize(color.g) + 0.0722 * linearize(color.b);
}

function linearChannelToSrgb(channel: number, round = true): number {
  const c = channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
  const srgb = Math.min(1, Math.max(0, c)) * 255;
  return round ? Math.round(srgb) : srgb;
}

function oklchToRgbUnclamped({ L, C, h }: ThemeOklch): { r: number; g: number; b: number } {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const bb = C * Math.sin(hr);
  const l = (L + 0.3963377774 * a + 0.2158037573 * bb) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * bb) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * bb) ** 3;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

function mapThemeOklchToSrgbGamut(color: ThemeOklch): ThemeOklch {
  const isInGamut = (C: number) => {
    const linear = oklchToRgbUnclamped({ ...color, C });
    return [linear.r, linear.g, linear.b].every(
      (channel) => channel >= -0.0001 && channel <= 1.0001,
    );
  };
  if (isInGamut(color.C)) return color;

  let low = 0;
  let high = color.C;
  const chromaResolution = 0.000001;
  const steps = Math.max(
    1,
    Math.ceil(Math.log2(Math.max(color.C, chromaResolution)) - Math.log2(chromaResolution)),
  );
  for (let step = 0; step < steps; step += 1) {
    const mid = (low + high) / 2;
    if (isInGamut(mid)) low = mid;
    else high = mid;
  }
  return { ...color, C: low };
}

function themeOklchToRgb(color: ThemeOklch, round = true): ThemeRgbColor {
  const linear = oklchToRgbUnclamped(mapThemeOklchToSrgbGamut(color));
  return {
    r: linearChannelToSrgb(linear.r, round),
    g: linearChannelToSrgb(linear.g, round),
    b: linearChannelToSrgb(linear.b, round),
  };
}

function solveOklchLightness(
  base: ThemeOklch,
  against: ReadonlyArray<ThemeRgbColor>,
  minContrast: number,
  direction: "lighter" | "darker",
): ThemeOklch {
  const contrastOf = (color: ThemeOklch) =>
    Math.min(...against.map((surface) => themeContrastRatio(themeOklchToRgb(color), surface)));
  let low = direction === "lighter" ? base.L : 0;
  let high = direction === "lighter" ? 1 : base.L;
  let candidate = { ...base };
  if (contrastOf(candidate) >= minContrast) return candidate;
  for (let step = 0; step < 18; step += 1) {
    const mid = (low + high) / 2;
    candidate = { ...base, L: mid };
    if (contrastOf(candidate) >= minContrast) {
      if (direction === "lighter") high = mid;
      else low = mid;
    } else {
      if (direction === "lighter") low = mid;
      else high = mid;
    }
  }
  return { ...base, L: direction === "lighter" ? high : low };
}

/** A chip kind's per-theme contrast-solved lightness with `color`'s hue and chroma. */
export function contextChipAccentWithHueOf(
  kind: ContextChipAccentKind,
  color: string,
): string | null {
  const parsed = parseThemeColor(color);
  if (!parsed) return null;
  const { C, h } = parsed.color;
  return `oklch(from var(${contextChipColorVariable(kind)}) l ${formatThemeColorNumber(C, 4)} ${formatThemeColorNumber(h, 2)})`;
}

const CONTEXT_CHIP_CONTRAST = 5;
const CONTEXT_CHIP_MESSAGE_VARIABLE = "--context-chip-message";
const CONTEXT_CHIP_INVALID_VARIABLE = "--context-chip-invalid";

export function contextChipVariables(colors: ThemeColors): Readonly<Record<string, string>> {
  // CSS paints surfaces from their unrounded OKLCH, so measure them unrounded.
  const parsedCanvas = parseThemeColor(colors.canvas);
  const canvas = parsedCanvas ? themeOklchToRgb(parsedCanvas.color, false) : THEME_WHITE_FOREGROUND;
  const onCanvas = (value: string) => {
    const parsed = parseThemeColor(value);
    return parsed
      ? mixThemeRgbColors(canvas, themeOklchToRgb(parsed.color, false), parsed.alpha)
      : canvas;
  };
  const isDark = (color: ThemeRgbColor) => themeRelativeLuminance(color) < 0.179;
  const messageMatchesCanvas = isDark(onCanvas(colors.messageSurface)) === isDark(canvas);
  const surfaces = [canvas, onCanvas(colors.surface), onCanvas(colors.surfaceRaised)];
  if (messageMatchesCanvas) surfaces.push(onCanvas(colors.messageSurface));
  const contrastOnSurfaces = (color: ThemeRgbColor) =>
    Math.min(...surfaces.map((surface) => themeContrastRatio(color, surface)));
  const blackContrast = contrastOnSurfaces(THEME_BLACK_FOREGROUND);
  const whiteContrast = contrastOnSurfaces(THEME_WHITE_FOREGROUND);
  const direction = blackContrast >= whiteContrast ? "darker" : "lighter";
  const minContrast = Math.min(CONTEXT_CHIP_CONTRAST, Math.max(blackContrast, whiteContrast));
  const accents: Array<[string, string]> = [
    ...(Object.entries(CONTEXT_CHIP_ACCENTS) as Array<[ContextChipAccentKind, string]>).map(
      ([kind, accent]): [string, string] => [contextChipColorVariable(kind), accent],
    ),
    [CONTEXT_CHIP_INVALID_VARIABLE, colors.errorForeground],
  ];
  const variables: Record<string, string> = Object.fromEntries(
    accents.flatMap(([variable, accent]) => {
      const parsed = parseThemeColor(accent);
      if (!parsed) return [];
      const solved = solveOklchLightness(parsed.color, surfaces, minContrast, direction);
      return [[variable, themeRgbToHexColor(themeOklchToRgb(solved))]];
    }),
  );
  if (!messageMatchesCanvas) variables[CONTEXT_CHIP_MESSAGE_VARIABLE] = colors.messageForeground;
  return variables;
}

function applyContextChipVariables(root: HTMLElement, colors: ThemeColors): void {
  const variables = contextChipVariables(colors);
  root.style.removeProperty(CONTEXT_CHIP_MESSAGE_VARIABLE);
  root.style.removeProperty(CONTEXT_CHIP_INVALID_VARIABLE);
  for (const [variable, value] of Object.entries(variables)) {
    root.style.setProperty(variable, value);
  }
}

function themeContrastRatio(first: ThemeRgbColor, second: ThemeRgbColor): number {
  const firstLuminance = themeRelativeLuminance(first);
  const secondLuminance = themeRelativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

const APP_THEME_VARIABLES: Readonly<Record<ThemeColorRole, string>> = {
  canvas: "--app-theme-canvas",
  chrome: "--app-theme-chrome",
  toolbar: "--app-theme-toolbar",
  toolbarForeground: "--app-theme-toolbar-foreground",
  toolbarBorder: "--app-theme-toolbar-border",
  toolbarControl: "--app-theme-toolbar-control",
  toolbarControlForeground: "--app-theme-toolbar-control-foreground",
  toolbarControlHover: "--app-theme-toolbar-control-hover",
  surface: "--app-theme-surface",
  surfaceRaised: "--app-theme-surface-raised",
  surfaceOverlay: "--app-theme-surface-overlay",
  text: "--app-theme-text",
  textMuted: "--app-theme-text-muted",
  border: "--app-theme-border",
  input: "--app-theme-input",
  focus: "--app-theme-focus",
  accent: "--app-theme-accent",
  accentForeground: "--app-theme-accent-foreground",
  secondary: "--app-theme-secondary",
  secondaryForeground: "--app-theme-secondary-foreground",
  muted: "--app-theme-muted",
  mutedForeground: "--app-theme-muted-foreground",
  placeholder: "--app-theme-placeholder",
  secondaryLabel: "--app-theme-secondary-label",
  iconMuted: "--app-theme-icon-muted",
  error: "--app-theme-error",
  errorForeground: "--app-theme-error-foreground",
  errorSurface: "--app-theme-error-surface",
  warning: "--app-theme-warning",
  warningForeground: "--app-theme-warning-foreground",
  warningSurface: "--app-theme-warning-surface",
  update: "--app-theme-update",
  updateForeground: "--app-theme-update-foreground",
  updateSurface: "--app-theme-update-surface",
  accentSurface: "--app-theme-accent-surface",
  accentSurfaceForeground: "--app-theme-accent-surface-foreground",
  messageSurface: "--app-theme-message-surface",
  messageForeground: "--app-theme-message-foreground",
  messageAction: "--app-theme-message-action",
  messageActionForeground: "--app-theme-message-action-foreground",
  messageActionHover: "--app-theme-message-action-hover",
  codeBackground: "--app-theme-code-background",
  codeForeground: "--app-theme-code-foreground",
  searchMatchBackground: "--app-theme-search-match-background",
  searchMatchForeground: "--app-theme-search-match-foreground",
  searchMatchActiveBackground: "--app-theme-search-match-active-background",
  searchMatchActiveForeground: "--app-theme-search-match-active-foreground",
  sidebar: "--app-theme-sidebar",
  sidebarForeground: "--app-theme-sidebar-foreground",
  sidebarMutedForeground: "--app-theme-sidebar-muted-foreground",
  sidebarControlSurface: "--app-theme-sidebar-control-surface",
  sidebarRowHover: "--app-theme-sidebar-row-hover",
  sidebarRowActive: "--app-theme-sidebar-row-active",
  sidebarRowSelected: "--app-theme-sidebar-row-selected",
  sidebarBorder: "--app-theme-sidebar-border",
  terminalBackground: "--app-theme-terminal-background",
  terminalForeground: "--app-theme-terminal-foreground",
  terminalCursor: "--app-theme-terminal-cursor",
  terminalSelection: "--app-theme-terminal-selection-background",
  terminalScrollbar: "--app-theme-terminal-scrollbar",
  terminalScrollbarHover: "--app-theme-terminal-scrollbar-hover",
};

export function applyThemePalette(appearance: ThemeAppearance): void {
  const root = document.documentElement;
  const { id, colors } = BUILT_IN_THEMES[appearance];
  root.dataset.themeId = id;
  root.classList.toggle("dark", appearance === "dark");
  for (const role of Object.keys(APP_THEME_VARIABLES) as ThemeColorRole[]) {
    root.style.setProperty(APP_THEME_VARIABLES[role], colors[role]);
  }
  applyContextChipVariables(root, colors);
}
