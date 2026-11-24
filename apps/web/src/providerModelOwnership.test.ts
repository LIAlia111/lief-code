import { describe, expect, it } from "vite-plus/test";

import {
  filterOwnedCatalogModels,
  PROVIDER_DRIVERS,
  PROVIDER_MODEL_OWNERSHIP,
  preferredOwnedModelSlug,
  providerOwnsCatalogEntry,
  providerOwnsCatalogModel,
} from "./providerModelOwnership";

const model = (slug: string, isDefault = false) => ({
  slug,
  ...(isDefault ? { isDefault: true } : {}),
});

describe("provider model ownership", () => {
  it("names a rule for every built-in provider", () => {
    expect(Object.keys(PROVIDER_MODEL_OWNERSHIP).toSorted()).toEqual(
      [...PROVIDER_DRIVERS].toSorted(),
    );
  });

  it("leaves multi-vendor harnesses unfiltered", () => {
    const mixed = ["cursor", "opencode", "kiro", "pi", "fx", "acpRegistry"] as const;
    for (const driver of mixed) {
      expect(PROVIDER_MODEL_OWNERSHIP[driver].policy).toBe("mixed");
      expect(providerOwnsCatalogModel(driver, "claude-sonnet-4-6")).toBe(true);
      expect(providerOwnsCatalogModel(driver, "gpt-5.4")).toBe(true);
    }
    expect(providerOwnsCatalogModel("cursor", "composer-2")).toBe(true);
    expect(providerOwnsCatalogModel("kiro", "kimi-k3")).toBe(true);
    expect(providerOwnsCatalogModel("kiro", "auto")).toBe(true);
    expect(providerOwnsCatalogModel("pi", "anthropic/claude-sonnet-4")).toBe(true);
    expect(providerOwnsCatalogModel("fx", "vercel/claude-sonnet")).toBe(true);
  });

  it("keeps an unknown driver unfiltered", () => {
    expect(providerOwnsCatalogModel("ollama", "llama3")).toBe(true);
  });

  it("removes Claude models from a Codex catalog", () => {
    const catalog = [
      "claude-sonnet-4-6",
      "claude-opus-4-6",
      "claude-sonnet-4.6",
      "anthropic/claude-sonnet-4-6",
      "us.anthropic.claude-opus-4-6-v1",
      "gemini-3.8-flash",
      "grok-4",
      "kimi-k3",
      "composer-2",
      "gpt-5.4",
      "gpt-5.3-codex",
      "gpt-5.3-codex-spark",
      "gpt-6-astra",
      "gpt-4o",
      "gpt4o",
      "o1-mini",
      "o3",
      "o4-mini",
      "codex-mini",
      "openai.gpt-6-astra",
      "openai/gpt-5.4",
      "copilot/gpt-6.1-sol",
      "antigravity-bridge/gpt-oss-120b-medium",
      "auto/gpt-6-astra",
      "codex/gpt-6.2-sol",
      "us.openai.gpt-5.4",
      "chatgpt-4o-latest",
      "5.4",
      "5.3",
      "5.3-spark",
      "gpt-5-codex",
    ];
    expect(catalog.filter((slug) => providerOwnsCatalogModel("codex", slug))).toEqual([
      "gpt-5.4",
      "gpt-5.3-codex",
      "gpt-5.3-codex-spark",
      "gpt-6-astra",
      "gpt-4o",
      "gpt4o",
      "o1-mini",
      "o3",
      "o4-mini",
      "codex-mini",
      "openai.gpt-6-astra",
      "openai/gpt-5.4",
      "us.openai.gpt-5.4",
      "chatgpt-4o-latest",
      "5.4",
      "5.3",
      "5.3-spark",
      "gpt-5-codex",
    ]);
  });

  it("keeps a row whose slug or alias is this vendor's model", () => {
    expect(providerOwnsCatalogModel("codex", "5.4")).toBe(true);
    expect(providerOwnsCatalogEntry("codex", { slug: "5.4" })).toBe(true);
    expect(
      providerOwnsCatalogEntry("codex", { slug: "claude-sonnet-4-6", aliases: ["claude"] }),
    ).toBe(false);
    expect(providerOwnsCatalogModel("antigravity", "claude-sonnet-4-6")).toBe(false);
    expect(
      providerOwnsCatalogEntry("antigravity", {
        slug: "claude-sonnet-4-6",
        aliases: ["antigravity-default"],
      }),
    ).toBe(true);
    expect(preferredOwnedModelSlug("codex", [model("5.4")], "gpt-5.4")).toBe("5.4");
  });

  it("keeps only that vendor's models for the other single-vendor providers", () => {
    expect(providerOwnsCatalogModel("claudeAgent", "claude-opus-4-6")).toBe(true);
    expect(providerOwnsCatalogModel("claudeAgent", "anthropic/claude-sonnet-4.6")).toBe(true);
    expect(providerOwnsCatalogModel("claudeAgent", "us.anthropic.claude-opus-4-6-v1")).toBe(true);
    expect(providerOwnsCatalogModel("claudeAgent", "gpt-5.4")).toBe(false);
    expect(providerOwnsCatalogModel("claudeAgent", "opus")).toBe(false);

    expect(providerOwnsCatalogModel("grok", "grok-build")).toBe(true);
    expect(providerOwnsCatalogModel("grok", "grok-composer-2.5-fast")).toBe(true);
    expect(providerOwnsCatalogModel("grok", "xai/grok-4")).toBe(true);
    expect(providerOwnsCatalogModel("grok", "claude-sonnet-4-6")).toBe(false);

    expect(providerOwnsCatalogModel("antigravity", "gemini-3.8-flash")).toBe(true);
    expect(providerOwnsCatalogModel("antigravity", "gemini")).toBe(true);
    expect(providerOwnsCatalogModel("antigravity", "gemini-pro-agent")).toBe(true);
    expect(providerOwnsCatalogModel("antigravity", "antigravity-default")).toBe(true);
    expect(providerOwnsCatalogModel("antigravity", "gpt-oss-120b-medium")).toBe(true);
    expect(providerOwnsCatalogModel("antigravity", "claude-opus-4-6")).toBe(false);
    expect(providerOwnsCatalogModel("antigravity", "gpt-5.4")).toBe(false);

    expect(providerOwnsCatalogModel("muse", "muse-wonder-1.0")).toBe(true);
    expect(providerOwnsCatalogModel("muse", "default")).toBe(true);
    expect(providerOwnsCatalogModel("muse", "foreign-model")).toBe(false);
  });

  it.each([
    ["codex", "openai/gpt-5.4", "copilot/gpt-5.4"],
    ["claudeAgent", "anthropic/claude-opus-4-6", "bedrock/claude-opus-4-6"],
    ["grok", "xai/grok-4", "gateway/grok-4"],
    ["antigravity", "google/gpt-oss-120b-medium", "antigravity-bridge/gpt-oss-120b-medium"],
    ["muse", "meta/muse-wonder-1.0", "gateway/muse-wonder-1.0"],
  ])("filters routed rows for %s even when they have a vendor alias", (driver, native, routed) => {
    const routedModel = { slug: routed, aliases: [native] };
    const custom = { slug: "custom/choice", isCustom: true };
    expect(filterOwnedCatalogModels(driver, [routedModel, model(native), custom])).toEqual([
      model(native),
      custom,
    ]);
    expect(filterOwnedCatalogModels(driver, [routedModel, model("unrelated")])).toEqual([
      routedModel,
    ]);
  });

  it("falls back to the provider default when the flagged default belongs to another vendor", () => {
    expect(
      preferredOwnedModelSlug("codex", [
        model("claude-sonnet-4-6", true),
        model("gpt-4o"),
        model("gpt-6-astra"),
      ]),
    ).toBe("gpt-6-astra");
    expect(
      preferredOwnedModelSlug("codex", [model("gpt-4o"), model("gpt-6-astra")], "claude-opus-4-6"),
    ).toBe("gpt-6-astra");
    expect(
      preferredOwnedModelSlug("codex", [model("gpt-4o"), model("gpt-6-astra")], "auto/gpt-6-astra"),
    ).toBe("gpt-6-astra");
    expect(preferredOwnedModelSlug("codex", [model("auto/gpt-6-astra")])).toBe("auto/gpt-6-astra");
    expect(
      preferredOwnedModelSlug("codex", [model("claude-sonnet-4-6", true), model("gpt-4o")]),
    ).toBe("gpt-4o");
    expect(
      preferredOwnedModelSlug("codex", [model("gpt-5.4", true), model("claude-sonnet-4-6")]),
    ).toBe("gpt-5.4");
    expect(
      preferredOwnedModelSlug("cursor", [model("claude-sonnet-4-6", true), model("composer-2")]),
    ).toBe("claude-sonnet-4-6");
  });
});
