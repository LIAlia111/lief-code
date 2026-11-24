import { DEFAULT_SERVER_SETTINGS } from "@lief/contracts";
import { describe, expect, it } from "vite-plus/test";

import "~/index.css";
import { render } from "../../../test/render";
import { testUiLocale } from "../../../test/uiLocale";
import { AboutSettingsPanel } from "./SettingsPanels";
import { SETTINGS_SEARCH_ITEMS } from "./settingsSearch";

describe("anonymous analytics privacy", () => {
  it("is disabled in the default server settings", () => {
    expect(DEFAULT_SERVER_SETTINGS.telemetryEnabled).toBe(false);
  });

  it("is absent from About settings", async () => {
    await using screen = await render(<AboutSettingsPanel />);
    await expect.element(screen.getByText("View licenses", { exact: true })).toBeVisible();
    expect(screen.container.textContent).not.toMatch(/anonymous usage data|ingest\.lief\.codes/i);
  });

  it("is absent from settings search", () => {
    expect(SETTINGS_SEARCH_ITEMS.map(({ id }) => id)).not.toContain("telemetry-opt-in");
  });

  it("does not prompt in Chinese", async () => {
    using _locale = testUiLocale("zh-CN");
    await using screen = await render(<AboutSettingsPanel />);
    await expect.element(screen.getByText("查看许可证", { exact: true })).toBeVisible();
    expect(screen.container.textContent).not.toMatch(/匿名使用数据|ingest\.lief\.codes/i);
  });
});
