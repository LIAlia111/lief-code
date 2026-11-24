import { ProjectId, SourceControlProviderKind } from "@lief/contracts";
import { describe, expect, it } from "vite-plus/test";

import { pullRequestSyncKey } from "./pullRequestSyncKey.ts";

describe("pullRequestSyncKey", () => {
  const reference = { projectId: ProjectId.make("project"), repository: "Acme/Web", number: 7 };
  it("resolves hostless and explicit references to the same GitHub repository key", () => {
    const identity = {
      canonicalKey: "github.example.test/Acme/Web",
      provider: SourceControlProviderKind.make("github"),
      name: "Web",
      displayName: "Acme/Web",
      locator: {
        source: "git-remote" as const,
        remoteName: "origin",
        remoteUrl: "git@github.example.test:Acme/Web.git",
      },
    };
    const expected = { host: "github.example.test", repository: "acme/web", number: 7 };
    expect(pullRequestSyncKey(reference, identity)).toEqual(expected);
    expect(pullRequestSyncKey({ ...reference, host: "GitHub.Example.Test" }, identity)).toEqual(
      expected,
    );
  });
  it("requires an explicit host without a checkout", () => {
    expect(pullRequestSyncKey({ ...reference, host: "GitHub.com" })).toEqual({
      host: "github.com",
      repository: "acme/web",
      number: 7,
    });
    expect(pullRequestSyncKey(reference)).toBeNull();
  });
});
