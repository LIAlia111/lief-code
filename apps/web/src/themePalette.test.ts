import { describe, expect, it } from "vite-plus/test";
import { converter } from "culori/fn";
import { BUILT_IN_THEMES } from "@lief/shared/themePalettes";

import { CONTEXT_CHIP_ACCENTS, contextChipColorVariable } from "./lib/contextChipAccents";
import { contextChipVariables, themeColorToHex } from "./themePalette";

function asHex(value: string): string {
  const hex = themeColorToHex(value);
  if (!hex) throw new Error(`Expected a theme color, received ${value}`);
  return hex.slice(0, 7);
}

function contrastRatio(first: string, second: string): number {
  const toRgb = (value: string) => {
    const hex = asHex(value).slice(1);
    return [0, 1, 2].map(
      (channel) => Number.parseInt(hex.slice(channel * 2, channel * 2 + 2), 16) / 255,
    );
  };
  const luminance = (value: string) =>
    toRgb(value)
      .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index]!, 0);
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("built-in themes", () => {
  it("keeps built-in search pairs readable and distinct from inline code", () => {
    const toRgb = converter("rgb");
    const toOklab = converter("oklab");
    const paint = (value: string, surface: string) => {
      const color = toRgb(value)!;
      const back = toRgb(surface)!;
      const alpha = color.alpha ?? 1;
      return toOklab({
        mode: "rgb",
        r: color.r * alpha + back.r * (1 - alpha),
        g: color.g * alpha + back.g * (1 - alpha),
        b: color.b * alpha + back.b * (1 - alpha),
      });
    };
    const distance = (first: string, second: string, canvas: string) => {
      const a = paint(first, canvas);
      const b = paint(second, canvas);
      return Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b);
    };
    const palettes = Object.values(BUILT_IN_THEMES).map((theme) => theme.colors);
    for (const colors of palettes) {
      expect(
        contrastRatio(colors.searchMatchForeground, colors.searchMatchBackground),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(colors.searchMatchActiveForeground, colors.searchMatchActiveBackground),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        distance(colors.searchMatchBackground, colors.searchMatchActiveBackground, colors.canvas),
      ).toBeGreaterThan(0.14);
      for (const background of [colors.muted, colors.messageSurface, colors.codeBackground]) {
        expect(distance(colors.searchMatchBackground, background, colors.canvas)).toBeGreaterThan(
          0.08,
        );
        expect(
          distance(colors.searchMatchActiveBackground, background, colors.canvas),
        ).toBeGreaterThan(0.08);
      }
    }
  });
});

describe("context chip colors", () => {
  it.each([
    ["#ffffff", 5],
    ["#777777", 4.5],
  ] as const)(
    "chooses readable chip lightness on %s when the text is medium gray",
    (surface, minimum) => {
      const colors = {
        ...BUILT_IN_THEMES.light.colors,
        canvas: surface,
        surface,
        surfaceRaised: surface,
        messageSurface: surface,
        text: "#767676",
        messageForeground: "#767676",
      };
      for (const color of Object.values(contextChipVariables(colors))) {
        expect(contrastRatio(color, surface)).toBeGreaterThanOrEqual(minimum);
      }
    },
  );

  const toOklch = converter("oklch");
  const toRgb = converter("rgb");
  // Surfaces stay unrounded, as CSS paints them; the chip is the 8-bit hex the solver returns.
  const paintedContrastRatio = (chip: string, surface: string, canvas: string) => {
    const channels = (value: string) => {
      const rgb = toRgb(value)!;
      return [rgb.r, rgb.g, rgb.b].map((channel) => Math.min(1, Math.max(0, channel)));
    };
    const back = channels(canvas);
    const alpha = toRgb(surface)!.alpha ?? 1;
    const painted = channels(surface).map(
      (channel, index) => back[index]! * (1 - alpha) + channel * alpha,
    );
    const luminance = (rgb: number[]) =>
      rgb
        .map((channel) =>
          channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
        )
        .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index]!, 0);
    const first = luminance(channels(asHex(chip)));
    const second = luminance(painted);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  };
  const palettes = Object.values(BUILT_IN_THEMES).map((theme) => theme.colors);

  it("reads at 5:1 on every chip surface of every built-in theme and keeps each hue", () => {
    for (const colors of palettes) {
      const variables = contextChipVariables(colors);
      expect(variables["--context-chip-message"]).toBeUndefined();
      for (const [kind, accent] of Object.entries(CONTEXT_CHIP_ACCENTS)) {
        const chip =
          variables[contextChipColorVariable(kind as keyof typeof CONTEXT_CHIP_ACCENTS)]!;
        for (const surface of [
          colors.canvas,
          colors.surface,
          colors.surfaceRaised,
          colors.messageSurface,
        ]) {
          expect(paintedContrastRatio(chip, surface, colors.canvas)).toBeGreaterThanOrEqual(5);
        }
        const solved = toOklch(chip)!;
        if ((solved.c ?? 0) > 0.04) {
          const drift = Math.abs((((solved.h ?? 0) - toOklch(accent)!.h! + 540) % 360) - 180);
          expect(drift).toBeLessThan(4);
        }
      }
    }
  });

  it("solves the invalid state's error color to 5:1 on every chip surface", () => {
    for (const colors of palettes) {
      const invalid = contextChipVariables(colors)["--context-chip-invalid"];
      expect(invalid).toBeDefined();
      for (const surface of [
        colors.canvas,
        colors.surface,
        colors.surfaceRaised,
        colors.messageSurface,
      ]) {
        expect(paintedContrastRatio(invalid!, surface, colors.canvas)).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it("leaves a bubble with opposite-shade text out of the shared solve", () => {
    const colors = {
      ...BUILT_IN_THEMES.light.colors,
      messageSurface: "#1b4ed8",
      messageForeground: "#ffffff",
    };
    const variables = contextChipVariables(colors);
    expect(variables["--context-chip-message"]).toBe("#ffffff");
    for (const kind of Object.keys(CONTEXT_CHIP_ACCENTS) as Array<
      keyof typeof CONTEXT_CHIP_ACCENTS
    >) {
      expect(
        contrastRatio(variables[contextChipColorVariable(kind)]!, colors.canvas),
      ).toBeGreaterThanOrEqual(5);
    }
    expect(toOklch(variables[contextChipColorVariable("file")])!.c).toBeGreaterThan(0.08);
  });
});
