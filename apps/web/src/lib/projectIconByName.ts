import * as Phosphor from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react/lib";
import { createIcon, FolderCodeIcon, type LucideIcon } from "~/components/icons";

import {
  legacyIconAliasExports,
  legacyIconExports,
  legacyPhosphorNames,
} from "./legacyProjectIconNames";
import { projectAppIconByName } from "./projectAppIconByName";

const { SSRBase: _SSRBase, ...catalog } = Phosphor;
const icons = new Map<string, Icon>();
const regularIcons = new WeakMap<Icon, LucideIcon>();
for (const [exportName, icon] of Object.entries(catalog)) {
  if (!exportName.endsWith("Icon")) continue;
  const name = exportName
    .slice(0, -"Icon".length)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
  icons.set(name, icon);
}

const legacyIconKeys = new Set(legacyIconExports);
const legacyAliases = new Map(
  legacyIconAliasExports.map((entry) => {
    const separator = entry.indexOf(":");
    return [entry.slice(0, separator), entry.slice(separator + 1)];
  }),
);

function toLegacyExportName(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function toLegacyIconName(exportName: string): string {
  return (exportName.match(/[A-Z][a-z]*|[0-9]+[a-z]*/g) ?? []).join("-").toLowerCase();
}

function catalogIconByName(name: string): LucideIcon | undefined {
  const icon = icons.get(legacyPhosphorNames.get(name) ?? name);
  if (!icon) return undefined;

  const regularIcon = regularIcons.get(icon) ?? createIcon(icon);
  regularIcons.set(icon, regularIcon);
  return regularIcon;
}

function legacyFamilyIcon(name: string): LucideIcon {
  for (let end = name.lastIndexOf("-"); end > 0; end = name.lastIndexOf("-", end - 1)) {
    const family = name.slice(0, end);
    const icon = projectAppIconByName(family) ?? catalogIconByName(family);
    if (icon) return icon;
  }
  return FolderCodeIcon;
}

export const projectIconNames: ReadonlyArray<string> = [...icons.keys()];
export const legacyProjectIconNames: ReadonlyArray<string> =
  legacyIconExports.map(toLegacyIconName);

export function projectIconByName(name: string): Icon | undefined {
  return projectAppIconByName(name) ?? catalogIconByName(name) ?? legacyProjectIconByName(name);
}

export function legacyProjectIconByName(name: string): LucideIcon | undefined {
  const exportName = toLegacyExportName(name);
  const iconKey = exportName.replace(/^Lucide|Icon$/g, "");
  const canonicalKey = legacyAliases.get(iconKey) ?? iconKey;
  if (!legacyIconKeys.has(canonicalKey)) return undefined;

  const canonicalName = toLegacyIconName(canonicalKey);
  return (
    projectAppIconByName(name) ??
    projectAppIconByName(canonicalName) ??
    catalogIconByName(canonicalName) ??
    legacyFamilyIcon(canonicalName)
  );
}
