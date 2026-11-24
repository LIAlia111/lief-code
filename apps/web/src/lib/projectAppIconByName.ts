// oxlint-disable-next-line eslint/no-restricted-imports -- Saved project icon names can reference any former app glyph.
import * as appIcons from "~/components/icons";
import type { LucideIcon } from "~/components/icons";

const { createIcon: _createIcon, ...glyphs } = appIcons;
const icons = new Map<string, LucideIcon>();
for (const [exportName, icon] of Object.entries(glyphs)) {
  icons.set(exportName.replace(/Icon$/, "").toLowerCase(), icon);
}

export function projectAppIconByName(name: string): LucideIcon | undefined {
  return icons.get(name === "alarm-check" ? "alarmclockcheck" : name.replaceAll("-", ""));
}
