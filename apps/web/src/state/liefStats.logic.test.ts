// @effect-diagnostics nodeBuiltinImport:off - Inspect removed source entry points without bundling the renderer.
import * as NodeFS from "node:fs";
import { describe, expect, it } from "vite-plus/test";

const source = (relativePath: string) =>
  NodeFS.readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("retired active-user counting", () => {
  it("does not wire a usage counter into app startup", () => {
    expect(source("../routes/__root.tsx")).not.toMatch(/StatsCoordinator/);
  });

  it("does not render a first-run counting notice", () => {
    expect(source("../components/onboarding/WelcomePage.tsx")).not.toMatch(
      /TelemetryNotice|active users/i,
    );
  });

  it("does not retain a client store that generates installation IDs for counts", () => {
    expect(NodeFS.readdirSync(new URL(".", import.meta.url))).not.toContain("liefStats.ts");
  });

  it("does not retain the heartbeat implementation", () => {
    expect(NodeFS.readdirSync(new URL(".", import.meta.url))).not.toContain("liefStats.logic.ts");
  });

  it("does not advertise the retired counter in update settings", () => {
    expect(source("../components/settings/SettingsPanels.tsx")).not.toMatch(
      /StatsRow|active users/i,
    );
  });
});
