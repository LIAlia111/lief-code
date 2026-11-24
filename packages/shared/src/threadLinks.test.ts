import { describe, expect, it, vi } from "vite-plus/test";
import { EnvironmentId, ThreadId, type ScopedThreadRef } from "@lief/contracts";
import { mFallback } from "gt-i18n";
import type { MFunctionType } from "gt-i18n/types";

import {
  formatHostedThreadLink,
  formatThreadLink,
  guessThreadLinkRef,
  hostedThreadLink,
  parseThreadLinkHref,
  threadLinkCandidates,
  threadLinkRefs,
} from "./threadLinks.ts";
import { relabelThreadLinks } from "./threadLinksCopy.ts";

const ref = (environmentId: string, threadId = "chat-1") => ({
  environmentId: EnvironmentId.make(environmentId),
  threadId: ThreadId.make(threadId),
});
const v1 = (threadId: string) => ({ environmentId: null, threadId: ThreadId.make(threadId) });
const local = EnvironmentId.make("local");
const titlesIn =
  (titles: Record<string, Record<string, string>>) =>
  ({ environmentId, threadId }: ScopedThreadRef) =>
    titles[environmentId]?.[threadId];
const japanese: MFunctionType = (encodedMsg, options) => {
  const english = mFallback(encodedMsg, options);
  return (
    english === "Thread no longer available" ? "スレッドは利用できなくなりました" : english
  ) as typeof english;
};

describe("thread link destinations", () => {
  it("names a v1 link's thread in the message's environment, as written and then decoded", () => {
    expect(threadLinkCandidates(v1("provider%3A1"), local)).toEqual([
      ref("local", "provider%3A1"),
      ref("local", "provider:1"),
    ]);
  });

  it("opens the unique matching chat in another environment for a v1 link", () => {
    const destination = ref("remote");
    expect(guessThreadLinkRef(v1("chat-1"), [ref("local", "other-chat"), destination])).toEqual(
      destination,
    );
  });

  it("opens a v2 link only in its own environment", () => {
    const there = ref("there", "a%3A1");
    expect(threadLinkCandidates(there, local)).toEqual([there, ref("there", "a:1")]);
    expect(guessThreadLinkRef(there, [ref("elsewhere", "a%3A1"), ref("elsewhere", "a:1")])).toBe(
      null,
    );
  });

  it("leaves ambiguous or missing destinations unresolved", () => {
    const link = v1("provider%3A1");
    const literal = ref("remote", "provider%3A1");
    const decoded = ref("remote", "provider:1");
    expect(
      guessThreadLinkRef(link, [literal, ref("other-remote", literal.threadId), decoded]),
    ).toBeNull();
    expect(guessThreadLinkRef(link, [decoded, ref("other-remote", decoded.threadId)])).toBeNull();
    expect(guessThreadLinkRef(link, [ref("remote", "other-chat")])).toBeNull();
  });
});

describe("thread links", () => {
  it("takes the ids verbatim, percent escapes included", () => {
    expect(parseThreadLinkHref("lief-thread://v1/mcp:1234")).toEqual(v1("mcp:1234"));
    expect(parseThreadLinkHref("lief-thread://v1/thread:delegated-task:mcp%3A1")).toEqual(
      v1("thread:delegated-task:mcp%3A1"),
    );
    expect(parseThreadLinkHref("lief-thread://v2/env-1/thread:a/b%3A1")).toEqual(
      ref("env-1", "thread:a/b%3A1"),
    );
  });

  it("rejects other links and an empty id", () => {
    expect(parseThreadLinkHref("https://example.test")).toBeNull();
    expect(parseThreadLinkHref("lief-thread://v1/")).toBeNull();
    expect(parseThreadLinkHref("lief-thread://v1/ ")).toBeNull();
    expect(parseThreadLinkHref("lief-thread://v2/env-1")).toBeNull();
    expect(parseThreadLinkHref("lief-thread://v2/env-1/")).toBeNull();
    expect(parseThreadLinkHref("lief-thread://v2//chat-1")).toBeNull();
  });

  it("resolves a percent-encoded id when the id as written names no thread", () => {
    const title = titlesIn({ local: { "thread:project:1": "Decoded", "provider%3A1": "Literal" } });
    expect(
      relabelThreadLinks(
        "[a](lief-thread://v1/thread%3Aproject%3A1) [b](lief-thread://v1/provider%3A1)",
        local,
        title,
      ),
    ).toBe("[Decoded](lief-thread://v1/thread:project:1) [Literal](lief-thread://v1/provider%3A1)");
    const untitled = titlesIn({ local: { "a%3A1": "", "a:1": "Other" } });
    expect(relabelThreadLinks("[Kept](lief-thread://v1/a%3A1)", local, untitled)).toBe(
      "[Kept](lief-thread://v1/a%3A1)",
    );
  });

  it("titles a v2 link from its own environment and writes it with that title", () => {
    const title = titlesIn({ local: { t1: "Here" }, there: { t1: "There" } });
    expect(
      relabelThreadLinks(
        "<lief-thread://v2/there/t1> and [old](lief-thread://v2/local/t1)",
        local,
        title,
      ),
    ).toBe("[There](lief-thread://v2/there/t1) and [Here](lief-thread://v2/local/t1)");
  });

  it("reads an angle-bracketed destination as the labeled link, not an autolink", () => {
    const title = titlesIn({ local: { t1: "Here" }, there: { t1: "There" } });
    expect(
      relabelThreadLinks(
        "[old](<lief-thread://v2/there/t1>) and [older](<lief-thread://v2/local/t1>)",
        local,
        title,
      ),
    ).toBe("[There](lief-thread://v2/there/t1) and [Here](lief-thread://v2/local/t1)");
    expect(
      relabelThreadLinks("[Kept label](<lief-thread://v2/local/t1>)", local, () => undefined),
    ).toBe("Kept label");
    expect(threadLinkRefs("[a](<lief-thread://v2/there/t2>)", local)).toEqual([ref("there", "t2")]);
    for (const threadId of ["mcp:launch:qa(1)", "mcp:launch:qa)"]) {
      const thread = ref("there", threadId);
      const link = formatThreadLink(thread, "Original");
      expect(link).toBe(`[Original](<lief-thread://v2/there/${threadId}>)`);
      expect(threadLinkRefs(link, local)).toEqual([thread]);
      expect(relabelThreadLinks(link, local, () => "Renamed")).toBe(
        `[Renamed](<lief-thread://v2/there/${threadId}>)`,
      );
      expect(relabelThreadLinks(link, local, () => undefined)).toBe("Original");
    }
  });

  it("turns a v2 link it cannot resolve into plain text, never the raw link", () => {
    expect(
      relabelThreadLinks(
        "<lief-thread://v2/there/t1>, <lief-thread://v2/local/t1>, [Old title](lief-thread://v2/there/t1)",
        local,
        () => undefined,
      ),
    ).toBe("Thread on another machine, Thread no longer available, Old title");
    expect(relabelThreadLinks("[Old](lief-thread://v1/t1)", local, () => undefined)).toBe(
      "[Old](lief-thread://v1/t1)",
    );
    expect(
      relabelThreadLinks("See <lief-thread://v1/gone>", local, () => undefined, japanese),
    ).toBe("See スレッドは利用できなくなりました");
  });

  it("leaves links inside code spans and fences as written", () => {
    const markdown = [
      "Live [old](lief-thread://v1/t1), literal `[old](lief-thread://v1/t1)`.",
      "```md",
      "<lief-thread://v2/local/t1>",
      "```",
      "After <lief-thread://v2/local/t1>",
    ].join("\n");
    expect(relabelThreadLinks(markdown, local, () => "New")).toBe(
      [
        "Live [New](lief-thread://v1/t1), literal `[old](lief-thread://v1/t1)`.",
        "```md",
        "<lief-thread://v2/local/t1>",
        "```",
        "After [New](lief-thread://v2/local/t1)",
      ].join("\n"),
    );
  });

  it("lists the threads a message's links can name, outside code", () => {
    expect(
      threadLinkRefs(
        "<lief-thread://v2/there/t1> [a](lief-thread://v1/t%3A2) `<lief-thread://v2/code/lief>`",
        local,
      ),
    ).toEqual([ref("there", "t1"), ref("local", "t%3A2"), ref("local", "t:2")]);
  });

  it("lists a message's thread links on runtimes whose matchAll omits named groups, such as Hermes", () => {
    const matchAll = String.prototype.matchAll;
    using _hermes = vi.spyOn(String.prototype, "matchAll").mockImplementation(function (
      this: string,
      regexp: RegExp,
    ) {
      return matchAll.call(this, regexp).map((match) => {
        delete match.groups;
        return match;
      });
    });
    expect(
      threadLinkRefs("<lief-thread://v2/local/t1> [a](lief-thread://v2/there/t2)", local),
    ).toEqual([ref("local", "t1"), ref("there", "t2")]);
  });

  it("writes a titleless autolink that opens that exact thread", () => {
    const link = formatThreadLink(ref("env-1", "thread:delegated-task:mcp%3A1"));
    expect(link).toBe("<lief-thread://v2/env-1/thread:delegated-task:mcp%3A1>");
    expect(parseThreadLinkHref(link.slice(1, -1))).toEqual(
      ref("env-1", "thread:delegated-task:mcp%3A1"),
    );
  });

  it("formats a label that would otherwise break the Markdown link", () => {
    expect(formatThreadLink(ref("e", "t1"), "Fix [ci] \\ build")).toBe(
      "[Fix ci build](lief-thread://v2/e/t1)",
    );
    expect(formatThreadLink(ref("e", "t1"), " ] ")).toBe("<lief-thread://v2/e/t1>");
  });
});

describe("hosted thread links", () => {
  it("escapes every id character a sentence or path could claim, and reads it back", () => {
    const thread = ref("env.1", "thread:delegated/mcp%3A1.");
    const link = hostedThreadLink(thread);
    expect(link).toBe("lief-code://threads/env%2E1/thread%3Adelegated%2Fmcp%253A1%2E");
    expect(parseThreadLinkHref(link)).toEqual(thread);
    expect(hostedThreadLink(thread, "http://127.0.0.1:3000/")).toBe(
      "http://127.0.0.1:3000/threads/env%2E1/thread%3Adelegated%2Fmcp%253A1%2E",
    );
    expect(hostedThreadLink(thread, "https://user:secret@example.test/settings")).toBe(
      "https://example.test/threads/env%2E1/thread%3Adelegated%2Fmcp%253A1%2E",
    );
  });

  it("reads only a bare thread path in an app deep link", () => {
    expect(parseThreadLinkHref("lief-code://threads/env-1/thread-1")).toEqual(
      ref("env-1", "thread-1"),
    );
    expect(parseThreadLinkHref("lief-code://threads/env-1/thread-1?prompt=go")).toBeNull();
    expect(parseThreadLinkHref("lief-code://threads/env-1/thread-1/extra")).toBeNull();
    expect(parseThreadLinkHref("lief-code://threads/env-1")).toBeNull();
    expect(parseThreadLinkHref("lief-code://env-1/thread-1")).toBeNull();
    expect(parseThreadLinkHref("https://app.example.test/threads/env-1/thread-1")).toBeNull();
    expect(parseThreadLinkHref("https://evil.test/threads/env-1/thread-1")).toBeNull();
  });

  it("writes a copied link a reader can follow, labeled when it has a title", () => {
    expect(formatHostedThreadLink(ref("e", "t1"), "Fix [ci]")).toBe(
      "[Fix ci](lief-code://threads/e/t1)",
    );
    expect(formatHostedThreadLink(ref("e", "t1"), " ")).toBe("lief-code://threads/e/t1");
    for (const origin of ["lief-code://app", "lief-code-dev://app", "null"]) {
      const target = hostedThreadLink(ref("e", "t1"), origin);
      expect(target).toBe("lief-code://threads/e/t1");
      expect(parseThreadLinkHref(target)).toEqual(ref("e", "t1"));
    }
    expect(
      relabelThreadLinks(
        formatHostedThreadLink(ref("e", "t1"), "Old title"),
        ref("e").environmentId,
        titlesIn({ e: { t1: "Current title" } }),
      ),
    ).toContain("Current title");
  });

  it("titles app deep links in every Markdown form and writes them as v2 links", () => {
    const title = titlesIn({ there: { t1: "There" } });
    expect(
      relabelThreadLinks(
        [
          "See lief-code://threads/there/t1.",
          "[old](lief-code://threads/there/t1)",
          "<lief-code://threads/there/t1>",
          "`lief-code://threads/there/t1`",
          "lief-code://threads/there/t1?prompt=go",
        ].join("\n"),
        local,
        title,
      ),
    ).toBe(
      [
        "See [There](lief-thread://v2/there/t1).",
        "[There](lief-thread://v2/there/t1)",
        "[There](lief-thread://v2/there/t1)",
        "`lief-code://threads/there/t1`",
        "lief-code://threads/there/t1?prompt=go",
      ].join("\n"),
    );
    expect(relabelThreadLinks("lief-code://threads/there/t1", local, () => undefined)).toBe(
      "Thread on another machine",
    );
    expect(threadLinkRefs("Open lief-code://threads/there/t%3A1", local)).toEqual([
      ref("there", "t:1"),
    ]);
  });

  it("leaves an app deep link that is part of another link as written", () => {
    const hosted = "lief-code://threads/there/t1";
    const relabeled = "[There](lief-thread://v2/there/t1)";
    const title = titlesIn({ there: { t1: "There" } });
    for (const [markdown, expected] of [
      [`https://example.com/?next=${hosted}`],
      [`[Example](https://example.com/?next=${hosted})`],
      [`[ ${hosted} ](https://example.com)`],
      [`[${hosted}](<https://example.com/a b> "Title")`],
      [`[a](https://example.com/x_(y)) ${hosted}`, `[a](https://example.com/x_(y)) ${relabeled}`],
      [`(${hosted}) **${hosted}**`, `(${relabeled}) **${relabeled}**`],
      [`[[[ [old](${hosted})`, `[[[ ${relabeled}`],
      [`\\\\[old](${hosted})`, `\\\\${relabeled}`],
      [`\\\\\\\\[old](${hosted})`, `\\\\\\\\${relabeled}`],
      [`\\[old](${hosted})`, `\\[old](${relabeled})`],
      [`\\[ ${hosted} ](https://example.com)`, `\\[ ${relabeled} ](https://example.com)`],
      ["\\[old](lief-thread://v2/there/t1) \\<lief-thread://v2/there/t1>"],
    ] as const) {
      expect(relabelThreadLinks(markdown, local, title)).toBe(expected ?? markdown);
      expect(threadLinkRefs(markdown, local)).toEqual(
        expected === undefined ? [] : [ref("there", "t1")],
      );
    }
  });
});
