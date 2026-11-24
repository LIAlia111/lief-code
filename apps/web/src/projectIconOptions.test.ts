import { describe, expect, it } from "vite-plus/test";

import { AlarmClockCheck, ArrowDown01, Layers3, MessageSquareDashedIcon } from "~/components/icons";
import { lucideIconByName, lucideIconNames } from "./lib/lucideIconByName";
import { projectIconByName } from "./lib/projectIconByName";
import { filterProjectIconNames, firstEmoji, isValidProjectMonogram } from "./projectIconOptions";

describe("projectIconOptions", () => {
  it("resolves every offered icon name, including saved legacy spellings", () => {
    for (const name of filterProjectIconNames("")) expect(projectIconByName(name)).toBeDefined();
    expect(lucideIconNames).toContain("file-archive");
    expect(lucideIconNames.filter((name) => !lucideIconByName(name))).toEqual([]);
    expect(projectIconByName("layers-3")).toBe(Layers3);
    expect(projectIconByName("arrow-down-01")).toBe(ArrowDown01);
    expect(projectIconByName("arrow-down-0-1")).toBe(ArrowDown01);
    expect(projectIconByName("alarm-check")).toBe(AlarmClockCheck);
    expect(filterProjectIconNames("game controller")).toContain("game-controller");
    expect(projectIconByName("message-square-dashed")).toBe(MessageSquareDashedIcon);
    const fileZip = projectIconByName("file-zip");
    expect(fileZip).toBeDefined();
    expect(projectIconByName("file-archive")).toBe(fileZip);
    expect(projectIconByName("github")).toBe(projectIconByName("github-logo"));
    expect(lucideIconByName("file-archive-icon")).toBe(fileZip);
    expect(lucideIconByName("lucide-alarm-check")).toBe(AlarmClockCheck);
    expect(lucideIconByName("create-lucide-icon")).toBeUndefined();
    expect(projectIconByName("create-lucide-icon")).toBeUndefined();
  });

  it("extracts one complete emoji grapheme", () => {
    expect(firstEmoji("  👩🏽‍💻 hello")).toBe("👩🏽‍💻");
    expect(firstEmoji("🇺🇸 project")).toBe("🇺🇸");
    expect(firstEmoji("1️⃣ project")).toBe("1️⃣");
    expect(firstEmoji("plain text")).toBeNull();
  });

  it("allows monograms of at most two characters", () => {
    for (const [text, valid] of [
      ["T", true],
      ["Lf", true],
      ["E\u0301E\u0301", true],
      ["ABC", false],
    ] as const) {
      expect(isValidProjectMonogram(text), text).toBe(valid);
    }
  });
});
