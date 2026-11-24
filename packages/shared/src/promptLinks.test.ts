import { EnvironmentId, ThreadId } from "@lief/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  buildNewThreadLink,
  parseNewThreadLink,
  parseThreadLinkPrompt,
  promptLinkAppPath,
  promptLinkDeepLink,
  sanitizeLinkedPrompt,
  withoutPromptLinkParams,
} from "./promptLinks.ts";
import { hostedThreadLink } from "./threadLinks.ts";

describe("sanitizeLinkedPrompt", () => {
  it("removes characters a reader cannot see and counts them", () => {
    const tagged = "rate me" + String.fromCodePoint(0xe0041, 0xe0042);
    expect(sanitizeLinkedPrompt(`a\u200Bb\u202Ec\uFEFF${tagged}`)).toEqual({
      text: "abcrate me",
      hiddenCharacters: 5,
    });
    expect(sanitizeLinkedPrompt("a\u2028b\u2029c")).toEqual({
      text: "a\nb\nc",
      hiddenCharacters: 0,
    });
  });

  it("keeps emoji sequences intact", () => {
    const family = "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}";
    const heart = "\u2764\uFE0F";
    expect(sanitizeLinkedPrompt(`${family} ${heart}`)).toEqual({
      text: `${family} ${heart}`,
      hiddenCharacters: 0,
    });
    expect(sanitizeLinkedPrompt("a\u200Db").hiddenCharacters).toBe(1);
    expect(sanitizeLinkedPrompt("\u{1F468}\u200D").hiddenCharacters).toBe(1);
    expect(sanitizeLinkedPrompt("\u{20000}\u200D\u{20001}").hiddenCharacters).toBe(1);
  });
});

describe("parseNewThreadLink", () => {
  it("reads a shared prompt with its optional repository and model", () => {
    const result = parseNewThreadLink(
      "?prompt=Rate+me&repo=https://github.com/LIAlia111/lief-code.git&provider=Codex&model=gpt-5",
    );
    expect(result).toEqual({
      ok: true,
      value: {
        kind: "new",
        prompt: { text: "Rate me", hiddenCharacters: 0 },
        repository: { owner: "LIAlia111", name: "lief-code" },
        provider: "codex",
        model: "gpt-5",
      },
    });
  });

  it("reads a pull request link, whose prompt is optional", () => {
    for (const pr of [
      "LIAlia111/lief-code/42",
      "LIAlia111/lief-code%2342",
      "https://github.com/LIAlia111/lief-code/pull/42/files",
    ]) {
      expect(parseNewThreadLink(`?pr=${pr}`)).toEqual({
        ok: true,
        value: {
          kind: "pull-request",
          pullRequest: { owner: "LIAlia111", name: "lief-code", number: 42 },
          prompt: null,
        },
      });
    }
  });

  it("refuses links it cannot open safely", () => {
    expect(parseNewThreadLink("?repo=a/b").ok).toBe(false);
    expect(parseNewThreadLink("?prompt=%E2%80%8B").ok).toBe(false);
    expect(parseThreadLinkPrompt("?prompt=%E2%80%8B").ok).toBe(false);
    expect(parseNewThreadLink("?prompt=x&repo=../etc").ok).toBe(false);
    expect(parseNewThreadLink(`?prompt=${"x".repeat(8_001)}`).ok).toBe(false);
  });
});

describe("thread links", () => {
  it("reads the prompt and leaves other parameters in place", () => {
    expect(parseThreadLinkPrompt("?prompt=Fix+it")).toEqual({
      ok: true,
      value: { text: "Fix it", hiddenCharacters: 0 },
    });
    expect(parseThreadLinkPrompt("?panel=diff")).toEqual({ ok: true, value: null });
    expect(withoutPromptLinkParams("?prompt=x&panel=diff")).toBe("?panel=diff");
  });
});

describe("link round trips", () => {
  it("builds a link that parses back to the same prompt", () => {
    const link = buildNewThreadLink({
      prompt: "Swear count & rating?",
      repository: { owner: "LIAlia111", name: "lief" },
      provider: "claudeAgent",
      model: "opus",
    });
    const url = new URL(link);
    expect(url.protocol).toBe("lief-code:");
    expect(url.host).toBe("new");
    expect(url.pathname).toBe("");
    const path = promptLinkAppPath(link);
    expect(path).toBe(`/${url.host}${url.pathname}${url.search}`);
    const parsed = parseNewThreadLink(url.search);
    expect(parsed.ok && parsed.value.kind === "new" && parsed.value.prompt.text).toBe(
      "Swear count & rating?",
    );
  });

  it.each(["lief-code://app", "lief-code-dev://app", "null"])(
    "builds an OS-openable prompt link from desktop origin %s",
    (origin) => {
      const link = buildNewThreadLink({ prompt: "Fix it", origin });
      expect(link).toBe("lief-code://new?prompt=Fix+it");
      expect(promptLinkAppPath(link)).toBe("/new?prompt=Fix+it");
    },
  );

  it("opens a copied thread link in the app at that thread", () => {
    const link = hostedThreadLink({
      environmentId: EnvironmentId.make("env-1"),
      threadId: ThreadId.make("mcp:1"),
    });
    const path = promptLinkAppPath(link);
    expect(path).toBe("/env-1/mcp%3A1");
    const deepLink = promptLinkDeepLink(path!);
    expect(deepLink).toBe("lief-code://threads/env-1/mcp%3A1");
    expect(promptLinkAppPath(deepLink)).toBe(path);
  });

  it("maps app scheme and explicitly configured web links to in-app paths", () => {
    const web = "http://127.0.0.1:3000";
    expect(promptLinkAppPath("lief-code://new?prompt=hi")).toBe("/new?prompt=hi");
    expect(promptLinkAppPath("lief-code-dev://threads/env-1/thread-1")).toBe("/env-1/thread-1");
    expect(promptLinkAppPath(`${web}/env-1/thread-1?prompt=go`, web)).toBe(
      "/env-1/thread-1?prompt=go",
    );
    expect(promptLinkAppPath(`${web}/threads/env-1/thread-1`, web)).toBe("/env-1/thread-1");
    expect(promptLinkAppPath(`${web}/threads/env-1/thread-1?prompt=go`, web)).toBe(
      "/env-1/thread-1?prompt=go",
    );
    expect(promptLinkAppPath(buildNewThreadLink({ prompt: "hi", origin: web }), web)).toBe(
      "/new?prompt=hi",
    );
    expect(
      buildNewThreadLink({ prompt: "hi", origin: "https://user:secret@example.test/settings" }),
    ).toBe("https://example.test/new?prompt=hi");
    expect(promptLinkAppPath(`${web}/env-1/thread-1`, web)).toBeNull();
    expect(promptLinkAppPath(`${web}/threads/env-1`, web)).toBeNull();
    expect(promptLinkAppPath(`${web}/settings/general`, web)).toBeNull();
    expect(promptLinkAppPath("https://evil.test/new?prompt=hi", web)).toBeNull();
    expect(promptLinkAppPath("https://app.example.test/new?prompt=hi")).toBeNull();
    expect(promptLinkAppPath(`${web}/new?prompt=hi`, `blob:${web}/id`)).toBeNull();
    expect(promptLinkAppPath("lief-code://user:secret@new?prompt=hi")).toBeNull();
    expect(promptLinkAppPath(String.raw`lief-code://threads/\example.test/thread`)).toBeNull();
    expect(promptLinkAppPath("lief-code://app/index.html")).toBeNull();
  });

  it("maps links in browsers without URL.canParse, such as Safari before 17", () => {
    const canParse = URL.canParse;
    Reflect.deleteProperty(URL, "canParse");
    try {
      expect(promptLinkAppPath("lief-code://new?prompt=hi")).toBe("/new?prompt=hi");
      expect(promptLinkAppPath("lief-code://app/")).toBeNull();
      expect(promptLinkAppPath("not a url")).toBeNull();
    } finally {
      URL.canParse = canParse;
    }
  });
});
