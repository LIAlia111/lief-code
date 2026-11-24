import { expect } from "e2e";

import { test, WEB } from "./lief.ts";

test(
  "A seeded thread opens by its link and shows its history",
  WEB,
  async ({ lief, app, screen }) => {
    const project = await lief.project("demo");
    const thread = await lief.thread({
      project,
      title: "Earlier work",
      messages: ["first", "second"],
    });
    await lief.open(thread);

    await expect(screen.getByText("second fixture turn complete", { exact: false })).toBeVisible();
    await app.screenshot("thread");
  },
);
