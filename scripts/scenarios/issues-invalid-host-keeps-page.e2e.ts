import { expect } from "e2e";

import { test, WEB } from "./lief.ts";

test("An invalid host filter keeps the Issues page open", WEB, async ({ lief, app, browser }) => {
  await lief.project("demo");
  await lief.open("/issues?host=true");

  await app.screenshot("issues-invalid-host");
  await expect(browser.locator("h1")).toHaveText("Issues");
});
