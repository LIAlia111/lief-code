import { describe, expect, it } from "vite-plus/test";

import { PRIVACY_POLICY_URL } from "./legalLinks";

describe("legal links", () => {
  it("points the privacy link at the shipped diagnostics and data collection guidance", () => {
    expect(PRIVACY_POLICY_URL).toBe(
      "https://github.com/LIAlia111/lief-code/blob/main/docs/user/telemetry.md",
    );
  });
});
