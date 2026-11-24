import { T, msg, useGT, useMessages } from "gt-react";
import { MonitorIcon, MoonIcon, PaletteIcon, SunIcon } from "~/components/icons";

import { useTheme } from "../hooks/useTheme";
import { m } from "../i18n/messages";
import {
  ADDON_ICON_CLASS,
  ITEM_ICON_CLASS,
  type CommandPaletteSubmenuItem,
} from "./CommandPalette.logic";
import { stackedThreadToast, toastManager } from "./ui/toast";

export const APPEARANCE_OPTIONS = [
  { mode: "light", label: msg("Day", { $context: "appearance mode" }), icon: SunIcon },
  { mode: "dark", label: msg("Night", { $context: "appearance mode" }), icon: MoonIcon },
  { mode: "system", label: msg("System", { $context: "appearance mode" }), icon: MonitorIcon },
] as const;

export function notifyThemeSaveFailure(): void {
  toastManager.add(
    stackedThreadToast({
      type: "error",
      title: m(msg("Couldn't save theme selection")),
      description: m(msg("Try again.")),
    }),
  );
}

export function useCommandPaletteThemeItems(): CommandPaletteSubmenuItem {
  const { appearanceMode, setAppearanceMode } = useTheme();
  const gt = useGT();
  const messages = useMessages();

  return {
    kind: "submenu",
    value: "action:change-theme",
    searchTerms: ["change theme", "change appearance", "light", "dark", "system", "mode"],
    title: gt("Change appearance"),
    icon: <PaletteIcon className={ITEM_ICON_CLASS} />,
    addonIcon: <PaletteIcon className={ADDON_ICON_CLASS} />,
    shortcutCommand: "theme.select",
    groups: [
      {
        value: "appearance",
        label: gt("Change appearance"),
        items: APPEARANCE_OPTIONS.map(({ mode, label, icon: Icon }) => ({
          kind: "action",
          value: "appearance:" + mode,
          title: messages(label),
          searchTerms: [messages(label), mode, "theme", "appearance"],
          icon: <Icon className={ITEM_ICON_CLASS} />,
          titleTrailingContent:
            appearanceMode === mode ? (
              <span className="text-xs text-muted-foreground/70">
                <T context="the theme or mode in use now">Current</T>
              </span>
            ) : undefined,
          run: async () => {
            if (!setAppearanceMode(mode)) notifyThemeSaveFailure();
          },
        })),
      },
    ],
  };
}
