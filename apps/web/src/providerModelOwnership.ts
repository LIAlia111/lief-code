import {
  DEFAULT_MODEL_BY_PROVIDER,
  MODEL_SLUG_ALIASES_BY_PROVIDER,
  type ProviderDriverKind,
} from "@lief/contracts";

/**
 * Vendor groups show only that vendor's slugs. A gateway base URL can report
 * other vendors, and those rows must not appear in this provider's picker.
 * `mixed` harnesses list several vendors on purpose and stay unfiltered.
 */
export type ProviderModelOwnershipRule =
  | {
      readonly policy: "vendor";
      readonly namespace: string;
      readonly owns: (slug: string) => boolean;
    }
  | {
      readonly policy: "mixed";
      readonly reason: string;
    };

export const PROVIDER_DRIVERS = [
  "codex",
  "claudeAgent",
  "grok",
  "antigravity",
  "muse",
  "cursor",
  "opencode",
  "kiro",
  "pi",
  "fx",
  "acpRegistry",
] as const;

export type CatalogProviderDriver = (typeof PROVIDER_DRIVERS)[number];

export const PROVIDER_MODEL_OWNERSHIP: Readonly<
  Record<CatalogProviderDriver, ProviderModelOwnershipRule>
> = {
  // GPT, o-series (o1, o3, o4, …), and codex. `openai/` and `openai.` prefixes count.
  codex: { policy: "vendor", namespace: "openai", owns: isOpenAiCatalogModel },
  // claude-*, including Bedrock ids such as us.anthropic.claude-opus-4-6-v1.
  claudeAgent: { policy: "vendor", namespace: "anthropic", owns: isClaudeCatalogModel },
  grok: { policy: "vendor", namespace: "xai", owns: isGrokCatalogModel },
  // Gemini, the antigravity-default alias, and GPT-OSS, which Antigravity publishes itself.
  antigravity: { policy: "vendor", namespace: "google", owns: isAntigravityCatalogModel },
  // muse-* plus the "default" sentinel that defers to the account's model.
  muse: { policy: "vendor", namespace: "meta", owns: isMuseCatalogModel },
  cursor: {
    policy: "mixed",
    reason: "Cursor ships Composer, Claude, GPT, Gemini, and Grok in one catalog.",
  },
  opencode: {
    policy: "mixed",
    reason: "OpenCode is a multi-provider harness; each slug names its upstream vendor.",
  },
  kiro: {
    policy: "mixed",
    reason: "Kiro's CLI catalog officially mixes Claude, Kimi, and the auto/default aliases.",
  },
  pi: {
    policy: "mixed",
    reason: "Pi lists every provider enabled in the user's settings.json.",
  },
  fx: {
    policy: "mixed",
    reason: "fx lists models from every connected backend.",
  },
  acpRegistry: {
    policy: "mixed",
    reason: "Each ACP registry agent brings its own vendor catalog.",
  },
};

export interface OwnedModelCandidate {
  readonly slug: string;
  readonly isCustom?: boolean | undefined;
  readonly isDefault?: boolean | undefined;
  readonly aliases?: ReadonlyArray<string> | undefined;
}

/** Last path segment, with a dotted `openai.` family prefix removed. */
function catalogModelId(slug: string): string {
  const trimmed = slug.trim().toLowerCase();
  const slash = trimmed.lastIndexOf("/");
  const tail = slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
  const parts = tail.split(".");
  const openaiAt = parts.lastIndexOf("openai");
  if (openaiAt >= 0 && openaiAt < parts.length - 1) {
    return parts.slice(openaiAt + 1).join(".");
  }
  return tail;
}

function hasModelFamily(slug: string, family: string): boolean {
  const normalized = slug.trim().toLowerCase();
  if (normalized.length === 0) return false;
  return normalized.split(/[/.:]/).some((part) => part === family || part.startsWith(`${family}-`));
}

function isOpenAiCatalogModel(slug: string): boolean {
  const id = catalogModelId(slug);
  if (id.startsWith("gpt-") || id === "gpt" || /^gpt\d/.test(id)) return true;
  if (id === "chatgpt" || id.startsWith("chatgpt-")) return true;
  if (/^o\d/.test(id)) return true;
  return id === "codex" || id.startsWith("codex-") || id.includes("-codex");
}

function isClaudeCatalogModel(slug: string): boolean {
  return hasModelFamily(slug, "claude");
}

function isGrokCatalogModel(slug: string): boolean {
  return hasModelFamily(slug, "grok");
}

function isAntigravityCatalogModel(slug: string): boolean {
  return (
    hasModelFamily(slug, "gemini") ||
    hasModelFamily(slug, "antigravity") ||
    hasModelFamily(slug, "gpt-oss")
  );
}

function isMuseCatalogModel(slug: string): boolean {
  return hasModelFamily(slug, "muse") || catalogModelId(slug) === "default";
}

function ownershipRule(
  driver: ProviderDriverKind | string,
): ProviderModelOwnershipRule | undefined {
  if (!Object.hasOwn(PROVIDER_MODEL_OWNERSHIP, driver)) return undefined;
  return PROVIDER_MODEL_OWNERSHIP[driver as CatalogProviderDriver];
}

/** Unknown drivers stay unfiltered. A driver missing from the table must be added there. */
export function providerOwnsCatalogModel(
  driver: ProviderDriverKind | string,
  slug: string,
): boolean {
  const rule = ownershipRule(driver);
  if (rule === undefined || rule.policy === "mixed") return true;
  return matchesNamespace(rule, slug) && matchesModelFamily(rule, driver, slug);
}

function matchesNamespace(
  rule: Extract<ProviderModelOwnershipRule, { policy: "vendor" }>,
  slug: string,
): boolean {
  const slash = slug.indexOf("/");
  return slash < 0 || slug.slice(0, slash).trim().toLowerCase() === rule.namespace;
}

function matchesModelFamily(
  rule: Extract<ProviderModelOwnershipRule, { policy: "vendor" }>,
  driver: string,
  slug: string,
): boolean {
  if (rule.owns(slug)) return true;
  // Codex publishes short ids (`5.4`, `5.3`) that resolve to a GPT / codex slug.
  const canonical = staticAliasTarget(driver, slug);
  return canonical !== undefined && rule.owns(canonical);
}

/**
 * A catalog row stays when its slug or any catalog alias belongs to this vendor.
 * Antigravity's current-model row keeps whatever slug the session is on, and
 * points at it with the `antigravity-default` alias.
 */
export function providerOwnsCatalogEntry(
  driver: ProviderDriverKind | string,
  model: OwnedModelCandidate,
): boolean {
  if (model.isCustom === true) return true;
  const rule = ownershipRule(driver);
  if (rule === undefined || rule.policy === "mixed") return true;
  return matchesNamespace(rule, model.slug) && matchesCatalogFamily(rule, driver, model);
}

function matchesCatalogFamily(
  rule: Extract<ProviderModelOwnershipRule, { policy: "vendor" }>,
  driver: string,
  model: OwnedModelCandidate,
): boolean {
  return (
    matchesModelFamily(rule, driver, model.slug) ||
    model.aliases?.some((alias) => matchesModelFamily(rule, driver, alias)) === true
  );
}

export function filterOwnedCatalogModels<Model extends OwnedModelCandidate>(
  driver: string,
  models: ReadonlyArray<Model>,
): Model[] {
  const owned = models.filter((model) => providerOwnsCatalogEntry(driver, model));
  if (owned.length > 0) return owned;
  const rule = ownershipRule(driver);
  return rule?.policy === "vendor"
    ? models.filter((model) => matchesCatalogFamily(rule, driver, model))
    : owned;
}

function staticAliasTarget(driver: ProviderDriverKind | string, slug: string): string | undefined {
  const table = MODEL_SLUG_ALIASES_BY_PROVIDER[driver as ProviderDriverKind];
  if (!table) return undefined;
  const key = slug.trim();
  if (!Object.prototype.hasOwnProperty.call(table, key)) return undefined;
  const canonical = table[key];
  return typeof canonical === "string" && canonical !== key ? canonical : undefined;
}

/**
 * Owned default, else the provider default when a removed row was selected,
 * else the first owned slug.
 */
export function preferredOwnedModelSlug(
  driver: ProviderDriverKind | string,
  models: ReadonlyArray<OwnedModelCandidate>,
  requestedSlug?: string | null,
): string | undefined {
  const owned = filterOwnedCatalogModels(driver, models);
  const marked = owned.find((model) => model.isDefault === true && model.isCustom !== true)?.slug;
  if (marked) return marked;

  const providerDefault = DEFAULT_MODEL_BY_PROVIDER[driver as ProviderDriverKind];
  const requested = requestedSlug?.trim() ?? "";
  const requestedDisowned =
    requested.length > 0 &&
    !providerOwnsCatalogModel(driver, requested) &&
    !owned.some((model) => model.slug === requested || model.aliases?.includes(requested) === true);
  const flagged = models.find((model) => model.isDefault === true && model.isCustom !== true);
  const flaggedDisowned = flagged !== undefined && !owned.includes(flagged);
  if ((requestedDisowned || flaggedDisowned) && providerDefault) {
    const match = owned.find(
      (model) =>
        model.slug === providerDefault || model.aliases?.includes(providerDefault) === true,
    );
    if (match) return match.slug;
  }

  return owned.find((model) => model.isCustom !== true)?.slug ?? owned[0]?.slug;
}
