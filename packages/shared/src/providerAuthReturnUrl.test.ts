import { describe, expect, it } from "vite-plus/test";
import { providerAuthReturnUrl } from "./providerAuthReturnUrl.ts";

describe("provider auth return destinations", () => {
  it.each(["lief-code", "lief-code-dev"])(
    "returns to %s Welcome and the selected settings instance",
    (scheme) => {
      expect(providerAuthReturnUrl(`${scheme}://app/welcome?code=secret#agents:machine-id`)).toBe(
        `${scheme}://app/welcome#agents:machine-id`,
      );
      expect(
        providerAuthReturnUrl(`${scheme}://app/settings/providers?instanceId=work&code=secret`),
      ).toBe(`${scheme}://app/settings/providers?instanceId=work`);
    },
  );
  it.each([
    "lief-code://attacker/welcome",
    "lief-code://app/welcome/../evil",
    String.raw`lief-code://app/settings/..\outside`,
    "lief-code://app/settings/%2foutside",
    "http://0.0.0.0:3000/welcome",
    "https://attacker.example/welcome",
    "https://app.example.test/welcome",
  ])("rejects %s", (url) => expect(providerAuthReturnUrl(url)).toBeUndefined());

  it("preserves a local web return destination", () => {
    expect(providerAuthReturnUrl("http://127.0.0.1:3000/welcome?code=secret")).toBe(
      "http://127.0.0.1:3000/welcome",
    );
  });
});
