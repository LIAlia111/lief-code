import { SourceControlProviderKind } from "@lief/contracts";
import { describe, expect, it } from "vite-plus/test";

import { appSignInTargetForRemote, sourceControlClients } from "./sourceControlClients.ts";

const parse = (url: string) => {
  const parsed = sourceControlClients.parseChangeRequestUrl(url);
  if (parsed === null) return null;
  const { repositoryUrl: _repositoryUrl, ...link } = parsed.link;
  return link;
};
const kindOf = (url: string) => sourceControlClients.parseChangeRequestUrl(url)?.definition.kind;

describe("sourceControlClients.parseChangeRequestUrl", () => {
  it("reads a GitHub pull request, lower-casing the repository", () => {
    expect(parse("https://github.com/Acme/Web/pull/123")).toEqual({
      host: "github.com",
      repository: "acme/web",
      number: 123,
    });
  });

  it("reads a GitHub pull request on any host, so GitHub Enterprise works on its own name", () => {
    expect(parse("https://code.github.example.com/acme/web/pull/42")).toEqual({
      host: "code.github.example.com",
      repository: "acme/web",
      number: 42,
    });
    expect(kindOf("https://scm.example.test/acme/web/pull/42")).toBe("github");
    expect(
      sourceControlClients.changeRequestUrlFromReferenceAutolink(
        "https://code.github.example.com/acme/web/issues/42",
      ),
    ).toBe("https://code.github.example.com/acme/web/pull/42");
  });

  it("survives trailing segments, a trailing slash and a query string", () => {
    expect(parse("https://github.com/acme/web/pull/123/files?w=1")).toEqual({
      host: "github.com",
      repository: "acme/web",
      number: 123,
    });
    expect(parse("https://github.com/acme/web/pull/123/")).toEqual({
      host: "github.com",
      repository: "acme/web",
      number: 123,
    });
  });

  it("claims nothing it cannot be sure of", () => {
    for (const link of [
      "https://github.com/acme/web/issues/123",
      "https://github.com/acme/web/commit/0a1b2c3",
      "https://github.com/acme/web",
      "https://github.com/acme/web/pull/abc",
      "https://blog.example.test/2026/updates/archive/pull/3",
      "javascript:alert(1)//github.com/acme/web/pull/1",
      "not a url",
    ]) {
      expect(parse(link), link).toBeNull();
    }
  });
});

describe("sourceControlClients.isSameChangeRequest", () => {
  const linked = "https://github.com/acme/web/pull/42";

  it("matches the same pull request whatever its case or trailing path", () => {
    expect(
      sourceControlClients.isSameChangeRequest(linked, "https://github.com/Acme/Web/pull/42/files"),
    ).toBe(true);
  });
});

describe("change request URLs built from a parsed link", () => {
  it("builds a canonical sibling when the GitHub repository path contains pull", () => {
    const parsed = sourceControlClients.parseChangeRequestUrl(
      "https://github.com/pull/1/pull/42/files",
    )!;
    const sibling = parsed.definition.changeRequestUrl({
      host: parsed.link.host,
      repository: parsed.link.repository,
      number: 43,
      webUrl: parsed.link.repositoryUrl,
    });
    expect(sibling).toBe("https://github.com/pull/1/pull/43");
  });
});

describe("sourceControlClients.recognizeRemote", () => {
  const kindOfRemote = (url: string) => sourceControlClients.recognizeRemote(url)?.kind ?? null;

  it("recognizes a GitHub label in a hostname with other labels", () => {
    expect(kindOfRemote("https://gitlab.github.example/o/r")).toBe("github");
  });

  it("reads a remote no host claims as an unknown host, and a local path as no host", () => {
    expect(
      sourceControlClients.recognizeRemote("https://self-hosted.example.test:8443/group/repo.git"),
    ).toEqual({
      kind: "unknown",
      name: "self-hosted.example.test:8443",
      baseUrl: "https://self-hosted.example.test:8443",
    });
    expect(sourceControlClients.recognizeRemote("git@github-work:owner/repo.git")).toEqual({
      kind: "unknown",
      name: "github-work",
      baseUrl: "https://github-work",
    });
    for (const local of ["/srv/git/repo.git", "C:/repos/project", "file:///srv/git/repo.git", ""]) {
      expect(sourceControlClients.recognizeRemote(local), local).toBeNull();
    }
  });
});

describe("sourceControlClients repository keys", () => {
  // Persisted as `repositoryIdentity.canonicalKey` and in thread pull request keys.
  it.each([
    ["git@github.com:Acme/Web.git", "github.com/acme/web"],
    ["ssh://git@code.example.test:2222/team/project.git", "code.example.test/team/project"],
    ["git@code.example.test:v3/o/p", "code.example.test/v3/o/p"],
    ["code.example.test/v3/o/p/r", "code.example.test/v3/o/p/r"],
    ["C:/repos/project", "c:/repos/project"],
  ])("keys %s as %s", (remote, key) => {
    expect(sourceControlClients.repositoryKeyFromRemote(remote)).toBe(key);
  });

  it("leaves repository keys alone without a provider-specific rule", () => {
    expect(sourceControlClients.canonicalRepositoryKey("code.example.test/team/repo")).toBe(
      "code.example.test/team/repo",
    );
    expect(sourceControlClients.findByRepositoryKey("github.com/acme/web")).toBeUndefined();
  });
});

describe("sourceControlClients project hosts", () => {
  it("uses the repository key's hostname and falls back to the kind without a key", () => {
    const identity = {
      canonicalKey: "code.example.test/team/repo",
      locator: { remoteUrl: "http://code.example.test:3000/team/repo.git" },
    };
    expect(sourceControlClients.changeRequestHost(identity, undefined)).toBe("code.example.test");
    expect(
      sourceControlClients.changeRequestHost(
        { locator: { remoteUrl: "https://x.example/a/b" } },
        "github",
      ),
    ).toBe("github");
  });

  it("selects a repository by its path or by owner and name", () => {
    const repository = {
      displayName: "group/subgroup/service",
      owner: "group",
      name: "service",
    };
    expect(sourceControlClients.repositorySelector(repository)).toBe("group/subgroup/service");
    expect(sourceControlClients.repositorySelector({ owner: "o", name: "r" })).toBe("o/r");
  });

  it.each([
    ["https://github.com/acme/web.git", "https://github.com/me/web.git", true],
    ["git@github.com:acme/web.git", "https://github.com/me/web.git", true],
    ["https://github.com/acme/web.git", "https://gitlab.com/me/web.git", false],
    ["https://github.com/acme/web.git", "https://github.com:8443/me/web.git", false],
    ["git@github.com:acme/web.git", "https://github.com:8443/me/web.git", false],
    ["http://github.com/acme/web.git", "https://github.com/me/web.git", false],
  ] as const)(
    "reads a fork's issues beside upstream %s's only when origin %s is on its server",
    (remoteUrl, originUrl, both) => {
      const identity = {
        canonicalKey: "github.com/acme/web",
        locator: { source: "git-remote" as const, remoteName: "upstream", remoteUrl },
        provider: SourceControlProviderKind.make("github"),
        displayName: "acme/web",
        origin: { canonicalKey: `${new URL(originUrl).hostname}/me/web`, remoteUrl: originUrl },
      };
      expect(sourceControlClients.issueBindings(identity).map((binding) => binding.scope)).toEqual(
        both ? ["acme/web", "me/web"] : ["acme/web"],
      );
    },
  );
});

describe("sourceControlClients.findByPublicDomain", () => {
  it("names the host a link is on, subdomains included", () => {
    const kindOf = (hostname: string) => sourceControlClients.findByPublicDomain(hostname)?.kind;
    expect(kindOf("gist.github.com")).toBe("github");
    expect(kindOf("GitHub.com")).toBe("github");
    expect(kindOf("notgithub.com")).toBeUndefined();
    expect(kindOf("github.com.example")).toBeUndefined();
  });

  it("leaves findByPublicHost to the public host alone", () => {
    expect(sourceControlClients.findByPublicHost("gist.github.com")).toBeUndefined();
  });
});

describe("appSignInTargetForRemote", () => {
  it("names the repository a GitHub remote points at, in the remote's casing", () => {
    for (const remote of [
      "https://github.com/octocat/Hello-World.git",
      "git@github.com:octocat/Hello-World.git",
    ]) {
      expect(appSignInTargetForRemote(remote)?.input).toEqual({
        provider: "github",
        host: "github.com",
        repository: "octocat/Hello-World",
      });
    }
  });

  it("skips hosts the app is not registered on", () => {
    expect(appSignInTargetForRemote("https://ghe.acme.test/acme/web.git")).toBeNull();
    expect(appSignInTargetForRemote("https://gitlab.com/acme/web.git")).toBeNull();
  });
});
