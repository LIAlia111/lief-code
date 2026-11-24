import { converter } from "culori/fn";
import { describe, expect, it } from "vite-plus/test";

import "~/index.css";
import { BUILT_IN_THEMES } from "@lief/shared/themePalettes";
import { applyThemePalette } from "./themePalette";

const toRgb = converter("rgb");

function paintedChannels(variable: string, canvas: readonly number[] = [0, 0, 0]): number[] {
  const probe = document.createElement("div");
  probe.style.backgroundColor = `var(${variable})`;
  document.body.append(probe);
  try {
    const color = toRgb(getComputedStyle(probe).backgroundColor)!;
    const alpha = color.alpha ?? 1;
    return [color.r, color.g, color.b].map(
      (channel, index) => (channel * alpha + (canvas[index]! / 255) * (1 - alpha)) * 255,
    );
  } finally {
    probe.remove();
  }
}

describe("painted Lief theme colors", () => {
  it("match the chip surfaces index.css paints", () => {
    try {
      for (const appearance of ["light", "dark"] as const) {
        applyThemePalette(appearance);
        const colors = BUILT_IN_THEMES[appearance].colors;
        const canvas = paintedChannels("--background");
        for (const [variable, role] of [
          ["--background", "canvas"],
          ["--card", "surface"],
          ["--surface-raised", "surfaceRaised"],
          ["--message-surface", "messageSurface"],
        ] as const) {
          const expected = toRgb(colors[role])!;
          const painted = paintedChannels(variable, canvas);
          [expected.r, expected.g, expected.b].forEach((channel, index) => {
            expect(Math.abs(channel * 255 - painted[index]!), `${appearance} ${role}`).toBeLessThan(
              1.5,
            );
          });
        }
      }
    } finally {
      applyThemePalette("dark");
    }
  });
});
