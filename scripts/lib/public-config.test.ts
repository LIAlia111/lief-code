// @effect-diagnostics nodeBuiltinImport:off - Tests exercise root env file precedence directly.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { loadRepoEnv } from "./public-config.ts";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    NodeFS.rmSync(directory, { recursive: true, force: true });
  }
});

describe("loadRepoEnv", () => {
  it("applies process, root local, and root precedence in that order", () => {
    const repoRoot = makeTemporaryDirectory();
    NodeFS.writeFileSync(
      NodePath.join(repoRoot, ".env"),
      "LIEF_SAMPLE_URL=https://root.example.test\nLIEF_SAMPLE_DATASET=root\n",
    );
    NodeFS.writeFileSync(
      NodePath.join(repoRoot, ".env.local"),
      "LIEF_SAMPLE_URL=https://local.example.test\n",
    );
    expect(loadRepoEnv({ baseEnv: {}, repoRoot }).LIEF_SAMPLE_URL).toBe(
      "https://local.example.test",
    );
    expect(
      loadRepoEnv({
        baseEnv: {
          LIEF_SAMPLE_URL: "https://ci.example.test",
          LIEF_SAMPLE_TOKEN: "ci-token",
        },
        repoRoot,
      }),
    ).toMatchObject({
      LIEF_SAMPLE_URL: "https://ci.example.test",
      LIEF_SAMPLE_DATASET: "root",
      LIEF_SAMPLE_TOKEN: "ci-token",
    });
  });
});

function makeTemporaryDirectory() {
  const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "lief-public-config-"));
  temporaryDirectories.push(directory);
  return directory;
}
