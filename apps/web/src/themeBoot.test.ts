import { describe, expect, it } from "vite-plus/test";
import { BUILT_IN_THEMES } from "@lief/shared/themePalettes";

import indexHtml from "../index.html?raw";
import { readAppearanceModePreference } from "./hooks/useTheme";

const THEME_STORAGE_KEY = "lief:theme";
const LEGACY_MODE_KEY = "lief:theme-appearance-mode";
const LEGACY_SYSTEM_KEY = "lief:theme-follow-system";

const bootScript = (() => {
  const match = indexHtml.match(/<script>([\s\S]*?)<\/script>/);
  if (!match?.[1]) throw new Error("Could not find the inline boot script in index.html");
  return match[1];
})();

type BootResult = {
  isDark: boolean;
  themeId: string | undefined;
  storage: Record<string, string>;
  backgroundColor: string;
  bootVariables: Record<string, string>;
  metaContent: string | null;
};

function runBootScript(options: {
  storage?: Record<string, string>;
  storageThrows?: boolean;
  prefersDark: boolean;
}): BootResult {
  const storage = { ...options.storage };
  const classes = new Set<string>();
  const bootVariables: Record<string, string> = {};
  const meta = {
    content: null as string | null,
    setAttribute(_name: string, value: string) {
      this.content = value;
    },
  };
  const documentElement = {
    dataset: {} as Record<string, string | undefined>,
    classList: {
      add: (name: string) => void classes.add(name),
      remove: (name: string) => void classes.delete(name),
      toggle: (name: string, force?: boolean) => {
        const next = force ?? !classes.has(name);
        if (next) classes.add(name);
        else classes.delete(name);
        return next;
      },
    },
    style: {
      backgroundColor: "",
      setProperty: (name: string, value: string) => {
        bootVariables[name] = value;
      },
    },
  };
  const fakeDocument = {
    documentElement,
    querySelectorAll: (selector: string) => (selector === 'meta[name="theme-color"]' ? [meta] : []),
  };
  const fakeWindow = {
    localStorage: {
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      getItem: (key: string): string | null => {
        if (options.storageThrows) throw new Error("storage blocked");
        return storage[key] ?? null;
      },
    },
    matchMedia: () => ({ matches: options.prefersDark }),
  };

  new Function("window", "document", bootScript)(fakeWindow, fakeDocument);

  return {
    isDark: classes.has("dark"),
    themeId: documentElement.dataset.themeId,
    storage,
    backgroundColor: documentElement.style.backgroundColor,
    bootVariables,
    metaContent: meta.content,
  };
}

describe("index.html boot script", () => {
  it.each([
    { stored: null, prefersDark: false, mode: "dark" },
    { stored: "lief-dark", prefersDark: false, mode: "dark" },
    { stored: "lief-light", prefersDark: true, mode: "light" },
    { stored: "system", prefersDark: false, mode: "system" },
    { stored: "system", prefersDark: true, mode: "system" },
    { stored: "apple", prefersDark: false, mode: "dark" },
    { stored: "lief-chat", prefersDark: false, mode: "dark" },
    { stored: "grove", prefersDark: false, mode: "dark" },
    { stored: "ocean", prefersDark: false, mode: "dark" },
    { stored: "ember", prefersDark: false, mode: "dark" },
    { stored: "iris", prefersDark: false, mode: "dark" },
    { stored: "harbor", prefersDark: false, mode: "dark" },
    { stored: "lief-ember", prefersDark: false, mode: "dark" },
    { stored: "lief-iris", prefersDark: false, mode: "dark" },
    { stored: "lief-chat-dark", prefersDark: false, mode: "dark" },
    { stored: "graphite", prefersDark: false, mode: "dark" },
    { stored: "darkroom", prefersDark: false, mode: "dark" },
    { stored: "imported-theme", prefersDark: false, mode: "dark" },
    { stored: "mist", prefersDark: true, mode: "light" },
    { stored: "porcelain", prefersDark: true, mode: "light" },
    { stored: "light", prefersDark: true, mode: "light" },
    { stored: "apple", prefersDark: true, mode: "light", legacyMode: "light" },
    { stored: "lief-dark", prefersDark: true, mode: "light", legacyMode: "light" },
    { stored: "lief-chat-dark", prefersDark: false, mode: "system", legacySystem: "true" },
    { stored: null, prefersDark: false, mode: "light", legacyMode: "light" },
  ] as const)("boots and migrates $stored to $mode (OS dark: $prefersDark)", (testCase) => {
    const { stored, prefersDark, mode } = testCase;
    const input: Record<string, string> = {};
    if (stored !== null) input[THEME_STORAGE_KEY] = stored;
    if ("legacyMode" in testCase) input[LEGACY_MODE_KEY] = testCase.legacyMode;
    if ("legacySystem" in testCase) input[LEGACY_SYSTEM_KEY] = testCase.legacySystem;
    const appearance = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
    const { id, colors } = BUILT_IN_THEMES[appearance];

    const boot = runBootScript({ storage: input, prefersDark });
    expect(boot.isDark).toBe(appearance === "dark");
    expect(boot.themeId).toBe(id);
    expect(boot.backgroundColor).toBe(colors.chrome);
    expect(boot.metaContent).toBe(colors.chrome);
    expect(boot.bootVariables).toEqual({
      "--boot-background": colors.canvas,
      "--boot-foreground": colors.text,
    });
    expect(boot.storage).toEqual(
      stored === null && mode === "dark"
        ? {}
        : { [THEME_STORAGE_KEY]: mode === "system" ? mode : id },
    );

    const runtime = { ...input };
    const storage = {
      getItem: (key: string) => runtime[key] ?? null,
      setItem: (key: string, value: string) => {
        runtime[key] = value;
      },
      removeItem: (key: string) => {
        delete runtime[key];
      },
    };
    expect(readAppearanceModePreference(storage)).toBe(mode);
    expect(runtime).toEqual(boot.storage);
    expect(readAppearanceModePreference(storage)).toBe(mode);
  });

  it("paints Night when storage is unavailable on a light OS", () => {
    expect(runBootScript({ storageThrows: true, prefersDark: false })).toMatchObject({
      isDark: true,
      themeId: "lief-dark",
      backgroundColor: BUILT_IN_THEMES.dark.colors.chrome,
    });
  });
});
