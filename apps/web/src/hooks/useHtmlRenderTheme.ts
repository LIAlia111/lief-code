import { HTML_RENDER_DEFAULT_FONTS, htmlRenderTheme } from "@lief/shared/htmlRender";
import { BUILT_IN_THEMES } from "@lief/shared/themePalettes";

import { appearanceFontStack } from "../appearanceFonts";
import { themeColorToHex } from "../themePalette";
import { useClientSettings } from "./useSettings";
import { useTheme } from "./useTheme";

export function useHtmlRenderTheme() {
  const { resolvedTheme } = useTheme();
  const colors = BUILT_IN_THEMES[resolvedTheme].colors;
  const sans = useClientSettings((settings) => settings.fontFamilySans);
  const mono = useClientSettings((settings) => settings.fontFamilyCode);
  return htmlRenderTheme(
    Object.fromEntries(
      Object.entries(colors).map(([role, color]) => [role, themeColorToHex(color) ?? color]),
    ) as typeof colors,
    resolvedTheme,
    {
      sans: appearanceFontStack(sans, HTML_RENDER_DEFAULT_FONTS.sans),
      mono: appearanceFontStack(mono, HTML_RENDER_DEFAULT_FONTS.mono),
    },
  );
}
