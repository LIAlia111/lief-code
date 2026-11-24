// @effect-diagnostics nodeBuiltinImport:off -- Runs the generated installer against a temporary folder.
import * as NodeChildProcess from "node:child_process";
import * as NodeCrypto from "node:crypto";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  LiefUpdateError,
  appBundleOfResourcesPath,
  buildLiefInstallScript,
  compareLiefVersions,
  isLiefUpgrade,
  isTranslocatedAppPath,
  parseLiefBuildInfo,
  parseLiefRelease,
  parseLiefVersion,
  shellQuote,
  liefUpdateUserMessage,
  verifyFileSha256,
  type LiefInstallScriptOptions,
} from "./liefUpdate.ts";

const DIGEST = "835e69d69e12ca075d2aef5a6b9f1733318a8743876e072ddbc4c6c3f6af6884";

/** Shaped like GitHub's real `releases/latest` response for v1.2.1. */
const githubRelease = (version = "1.2.2", overrides: Record<string, unknown> = {}) => ({
  tag_name: `v${version}`,
  name: `Lief.code v${version}`,
  draft: false,
  prerelease: false,
  published_at: "2026-11-22T09:50:42Z",
  body: `# Lief.code v${version}\n\n## 新增\n1. **改进**：说明`,
  assets: [
    {
      name: "SHA256SUMS.txt",
      state: "uploaded",
      size: 101,
      digest: `sha256:${"b".repeat(64)}`,
      browser_download_url: "https://evil.example/SHA256SUMS.txt",
    },
    {
      name: `Lief.code-${version}-arm64.zip`,
      state: "uploaded",
      size: 236887017,
      digest: `sha256:${DIGEST}`,
      browser_download_url: "https://evil.example/app.zip",
    },
  ],
  ...overrides,
});

describe("Lief versions", () => {
  it("parses plain public versions and rejects upstream and prerelease ones", () => {
    expect(parseLiefVersion("1.2.1")).toEqual([1, 2, 1]);
    expect(parseLiefVersion("v1.10.0")).toEqual([1, 10, 0]);
    expect(parseLiefVersion("0.1.11")).toBeNull();
    expect(parseLiefVersion("0.1.11-nightly.20261122.4756")).toBeNull();
    expect(parseLiefVersion("1.2.2-beta.1")).toBeNull();
    expect(parseLiefVersion("C109-lief")).toBeNull();
  });

  it("compares numerically and only offers strictly newer releases", () => {
    expect(compareLiefVersions("1.10.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareLiefVersions("1.2.1", "v1.2.1")).toBe(0);
    expect(compareLiefVersions("1.2.0", "1.2.1")).toBeLessThan(0);
    expect(compareLiefVersions("1.2.0", "nope")).toBeNull();
    expect(isLiefUpgrade("1.2.2", "1.2.1")).toBe(true);
    expect(isLiefUpgrade("2.0.0", "1.99.99")).toBe(true);
    // Equal or older: never offered, also to local builds carrying newer code.
    expect(isLiefUpgrade("1.2.1", "1.2.1")).toBe(false);
    expect(isLiefUpgrade("1.2.0", "1.2.1")).toBe(false);
    expect(isLiefUpgrade("garbage", "1.2.1")).toBe(false);
  });

  it("reads the community version of a local custom build", () => {
    const info = parseLiefBuildInfo(
      JSON.stringify({ customBuild: "C109-lief", communityVersion: "1.2.1", schema: 105 }),
    );
    expect(info).toEqual({ communityVersion: "1.2.1", customBuild: "C109-lief" });
    expect(parseLiefBuildInfo(JSON.stringify({ customBuild: "C1" }))).toBeNull();
    expect(parseLiefBuildInfo("{not json")).toBeNull();
    expect(parseLiefBuildInfo(JSON.stringify({ communityVersion: "0.1.11" }))).toBeNull();
  });
});

describe("parseLiefRelease", () => {
  it("picks the arm64 zip and its digest and builds the download URL itself", () => {
    const release = parseLiefRelease(githubRelease("1.2.2"));
    expect(release.version).toBe("1.2.2");
    expect(release.tag).toBe("v1.2.2");
    expect(release.asset).toEqual({
      name: "Lief.code-1.2.2-arm64.zip",
      url: "https://github.com/LIAlia111/lief-code/releases/download/v1.2.2/Lief.code-1.2.2-arm64.zip",
      size: 236887017,
      sha256: DIGEST,
    });
    expect(release.releaseNotes).toContain("Lief.code v1.2.2");
    expect(release.releaseDate).toBe("2026-11-22T09:50:42Z");
  });

  it("accepts the asset name without the v prefix", () => {
    const value = githubRelease("1.3.0");
    value.assets[1]!.name = "Lief.code-v1.3.0-macOS-arm64.zip";
    expect(parseLiefRelease(value).asset.name).toBe("Lief.code-v1.3.0-macOS-arm64.zip");
  });

  const rejects = (value: unknown, code: string) => {
    try {
      parseLiefRelease(value);
    } catch (error) {
      expect(error).toBeInstanceOf(LiefUpdateError);
      expect((error as LiefUpdateError).code).toBe(code);
      return;
    }
    throw new Error("expected parseLiefRelease to throw");
  };

  it("rejects drafts, prereleases, upstream tags and malformed responses", () => {
    rejects(null, "invalid-release");
    rejects(githubRelease("1.2.2", { draft: true }), "invalid-release");
    rejects(githubRelease("1.2.2", { prerelease: true }), "invalid-release");
    rejects(githubRelease("1.2.2", { tag_name: "v0.1.11" }), "invalid-release");
    rejects(githubRelease("1.2.2", { tag_name: "1.2.2" }), "invalid-release");
    rejects(githubRelease("1.2.2", { tag_name: "Lief-c48-macos-20261112" }), "invalid-release");
  });

  it("rejects releases whose Mac zip is missing, incomplete or unverifiable", () => {
    rejects(githubRelease("1.2.2", { assets: [] }), "no-mac-asset");
    const variants: Array<Record<string, unknown>> = [
      { digest: undefined },
      { digest: "sha256:XYZ" },
      { digest: `md5:${"a".repeat(32)}` },
      { state: "starter" },
      { size: 0 },
      { name: "Lief.code-1.2.2-x64.zip" },
    ];
    for (const patch of variants) {
      const value = githubRelease("1.2.2");
      Object.assign(value.assets[1]!, patch);
      rejects(value, "no-mac-asset");
    }
  });
});

describe("helpers", () => {
  it("finds the running bundle and spots App Translocation", () => {
    expect(appBundleOfResourcesPath("/Applications/Lief Lief.app/Contents/Resources")).toBe(
      "/Applications/Lief Lief.app",
    );
    expect(appBundleOfResourcesPath("/Users/me/dev/resources")).toBeNull();
    expect(
      isTranslocatedAppPath("/private/var/folders/x/AppTranslocation/ABC/d/Lief Lief.app"),
    ).toBe(true);
    expect(isTranslocatedAppPath("/Applications/Lief Lief.app")).toBe(false);
  });

  it("surfaces the user message from a nested cause", () => {
    const error = new LiefUpdateError("not-writable", "/Applications: EACCES");
    expect(liefUpdateUserMessage({ cause: { cause: error } })).toBe(error.message);
    expect(error.message).not.toContain("EACCES");
    expect(liefUpdateUserMessage(new Error("other"))).toBeNull();
  });

  it("quotes paths for zsh", () => {
    expect(shellQuote("/Applications/Lief Lief.code版.app")).toBe(
      "'/Applications/Lief Lief.code版.app'",
    );
    expect(shellQuote("it's")).toBe(`'it'\\''s'`);
  });
});

const temporaryDirs: string[] = [];
const makeTempDir = () => {
  const dir = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "lief-lief-update-"));
  temporaryDirs.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of temporaryDirs.splice(0)) {
    NodeChildProcess.spawnSync("/bin/chmod", ["-R", "u+w", dir]);
    NodeFS.rmSync(dir, { recursive: true, force: true });
  }
});

describe("verifyFileSha256", () => {
  it("accepts the GitHub digest and rejects any other", async () => {
    const dir = makeTempDir();
    const file = NodePath.join(dir, "update.zip");
    NodeFS.writeFileSync(file, "lief update payload");
    const digest = NodeCrypto.createHash("sha256").update("lief update payload").digest("hex");

    await expect(verifyFileSha256(file, digest)).resolves.toBeUndefined();
    await expect(verifyFileSha256(file, digest.toUpperCase())).resolves.toBeUndefined();
    await expect(verifyFileSha256(file, "0".repeat(64))).rejects.toMatchObject({
      code: "digest-mismatch",
    });
    await expect(verifyFileSha256(file, "not-a-digest")).rejects.toMatchObject({
      code: "digest-mismatch",
    });
    await expect(verifyFileSha256(NodePath.join(dir, "missing.zip"), digest)).rejects.toThrow();
  });
});

const hasZsh = NodeFS.existsSync("/bin/zsh");

interface InstallFixture {
  readonly root: string;
  readonly options: LiefInstallScriptOptions;
  readonly openLog: string;
  run(patch?: Partial<LiefInstallScriptOptions>): { status: number | null; log: string };
  marker(appPath: string): string | null;
}

function makeApp(appPath: string, marker: string, complete = true) {
  NodeFS.mkdirSync(NodePath.join(appPath, "Contents", "Resources"), { recursive: true });
  if (complete) NodeFS.mkdirSync(NodePath.join(appPath, "Contents", "MacOS"), { recursive: true });
  NodeFS.writeFileSync(NodePath.join(appPath, "Contents", "Info.plist"), "<plist/>");
  NodeFS.writeFileSync(NodePath.join(appPath, "Contents", "Resources", "marker"), marker);
}

/** A fake /usr/bin/open that records its argument; `failures` leading calls exit 1. */
function makeFakeOpen(dir: string, failures: number) {
  const openPath = NodePath.join(dir, "fake-open.zsh");
  const openLog = NodePath.join(dir, "open.log");
  const counter = NodePath.join(dir, "open.count");
  NodeFS.writeFileSync(
    openPath,
    `#!/bin/zsh
count=$(cat ${shellQuote(counter)} 2>/dev/null || echo 0)
print $(( count + 1 )) > ${shellQuote(counter)}
if (( count < ${failures} )); then exit 1; fi
print -r -- "$1" >> ${shellQuote(openLog)}
[[ -e ${shellQuote(NodePath.join(dir, "app-exited"))} ]] && print -n yes > ${shellQuote(NodePath.join(dir, "open-saw-exit"))}
`,
    { mode: 0o755 },
  );
  return { openPath, openLog };
}

function makeInstallFixture(options: { openFailures?: number; newAppComplete?: boolean } = {}) {
  // The bundle path includes spaces and non-ASCII characters.
  const root = NodePath.join(makeTempDir(), "家 目录");
  const applications = NodePath.join(root, "Applications");
  const currentAppPath = NodePath.join(applications, "Lief Lief.app");
  const versionDir = NodePath.join(root, "Library", "Caches", "Lief Lief", "updates", "1.2.2");
  const newAppPath = NodePath.join(versionDir, "app", "Lief Lief.app");
  const backupRoot = NodePath.join(
    root,
    "Library",
    "Application Support",
    "Lief Lief",
    "update-backup",
  );
  makeApp(currentAppPath, "old");
  makeApp(newAppPath, "new", options.newAppComplete ?? true);
  // An older backup that a successful install prunes.
  makeApp(NodePath.join(backupRoot, "1.1.0", "Lief Lief.app"), "older");
  const { openPath, openLog } = makeFakeOpen(root, options.openFailures ?? 0);
  const scriptOptions: LiefInstallScriptOptions = {
    pid: 2_147_483_000,
    currentAppPath,
    newAppPath,
    backupDir: NodePath.join(backupRoot, "1.2.1"),
    logPath: NodePath.join(root, "Library", "Logs", "Lief Lief", "update.log"),
    cleanupDir: versionDir,
    fromVersion: "1.2.1",
    toVersion: "1.2.2",
    relaunch: true,
    waitTimeoutSeconds: 5,
    openCommand: openPath,
  };
  const fixture: InstallFixture = {
    root,
    options: scriptOptions,
    openLog,
    run: (patch = {}) => {
      const scriptPath = NodePath.join(root, "install.zsh");
      NodeFS.writeFileSync(scriptPath, buildLiefInstallScript({ ...scriptOptions, ...patch }));
      const result = NodeChildProcess.spawnSync("/bin/zsh", [scriptPath], {
        env: { HOME: root, PATH: "/usr/bin:/bin" },
        timeout: 20_000,
      });
      const log = NodeFS.existsSync(scriptOptions.logPath)
        ? NodeFS.readFileSync(scriptOptions.logPath, "utf8")
        : "";
      return { status: result.status, log };
    },
    marker: (appPath) => {
      const file = NodePath.join(appPath, "Contents", "Resources", "marker");
      return NodeFS.existsSync(file) ? NodeFS.readFileSync(file, "utf8") : null;
    },
  };
  return fixture;
}

/**
 * A process that is not ours, so launchd reaps it on exit like the quitting app; a child of this
 * test would stay a zombie while spawnSync blocks the event loop.
 */
const spawnOrphanSleep = (seconds: number, exitMarker?: string): number =>
  Number(
    NodeChildProcess.spawnSync("/bin/zsh", [
      "-c",
      exitMarker
        ? `{ /bin/sleep ${seconds}; : > ${shellQuote(exitMarker)} } >/dev/null 2>&1 &! print $!`
        : `/bin/sleep ${seconds} >/dev/null 2>&1 &! print $!`,
    ])
      .stdout.toString()
      .trim(),
  );

const opened = (fixture: InstallFixture) =>
  NodeFS.existsSync(fixture.openLog)
    ? NodeFS.readFileSync(fixture.openLog, "utf8").trim().split("\n")
    : [];

describe("buildLiefInstallScript", () => {
  it("is valid zsh, never uses sudo, and quotes every path", () => {
    const fixture = makeInstallFixture();
    const script = buildLiefInstallScript({
      ...fixture.options,
      currentAppPath: "/Applications/Lief Lief.code版's.app",
    });
    expect(script.startsWith("#!/bin/zsh\n")).toBe(true);
    expect(script).not.toMatch(/\bsudo\b/);
    expect(script).toContain(`CURRENT='/Applications/Lief Lief.code版'\\''s.app'`);
    expect(script).toContain("env -i HOME=");
    expect(script).toContain("RELAUNCH=1");
    expect(buildLiefInstallScript({ ...fixture.options, relaunch: false })).toContain("RELAUNCH=0");
    if (hasZsh) {
      const scriptPath = NodePath.join(fixture.root, "syntax.zsh");
      NodeFS.writeFileSync(scriptPath, script);
      expect(NodeChildProcess.spawnSync("/bin/zsh", ["-n", scriptPath]).status).toBe(0);
    }
  });
});

describe.skipIf(!hasZsh)("install script on disk", () => {
  it("waits for the app to quit, swaps the bundle, keeps one backup and relaunches", () => {
    const fixture = makeInstallFixture();
    // The "app" marks its exit; the fake open records whether that happened first.
    const pid = spawnOrphanSleep(0.5, NodePath.join(fixture.root, "app-exited"));
    const { status, log } = fixture.run({ pid });
    expect(NodeFS.readFileSync(NodePath.join(fixture.root, "open-saw-exit"), "utf8")).toBe("yes");

    expect(status).toBe(0);
    expect(fixture.marker(fixture.options.currentAppPath)).toBe("new");
    expect(fixture.marker(NodePath.join(fixture.options.backupDir, "Lief Lief.app"))).toBe("old");
    expect(NodeFS.existsSync(NodePath.join(fixture.options.backupDir, "..", "1.1.0"))).toBe(false);
    expect(NodeFS.existsSync(fixture.options.cleanupDir!)).toBe(false);
    expect(
      NodeFS.readdirSync(NodePath.dirname(fixture.options.currentAppPath)).filter((name) =>
        name.startsWith("."),
      ),
    ).toEqual([]);
    expect(opened(fixture)).toEqual([fixture.options.currentAppPath]);
    expect(log).toContain("waiting for pid");
    expect(log).toContain("update to 1.2.2 finished");
  });

  it("installs without relaunching when the update runs on quit", () => {
    const fixture = makeInstallFixture();
    const { status } = fixture.run({ relaunch: false });
    expect(status).toBe(0);
    expect(fixture.marker(fixture.options.currentAppPath)).toBe("new");
    expect(opened(fixture)).toEqual([]);
  });

  it("changes nothing when the new app is missing", () => {
    const fixture = makeInstallFixture();
    NodeFS.rmSync(fixture.options.newAppPath, { recursive: true });
    const { status, log } = fixture.run();
    expect(status).toBe(1);
    expect(fixture.marker(fixture.options.currentAppPath)).toBe("old");
    expect(log).toContain("not applied");
    expect(opened(fixture)).toEqual([fixture.options.currentAppPath]);
  });

  it("rolls back when the installed app is incomplete", () => {
    const fixture = makeInstallFixture({ newAppComplete: false });
    const { status, log } = fixture.run();
    expect(status).toBe(1);
    expect(fixture.marker(fixture.options.currentAppPath)).toBe("old");
    expect(log).toContain("rolling back");
    expect(log).toContain("rolled back to 1.2.1");
    expect(opened(fixture)).toEqual([fixture.options.currentAppPath]);
  });

  it("rolls back and reopens the previous version when the new app will not open", () => {
    const fixture = makeInstallFixture({ openFailures: 1 });
    const { status, log } = fixture.run();
    expect(status).toBe(1);
    expect(fixture.marker(fixture.options.currentAppPath)).toBe("old");
    expect(log).toContain("could not open the new app");
    expect(opened(fixture)).toEqual([fixture.options.currentAppPath]);
  });

  it("reports instead of escalating when the app folder is not writable", () => {
    const fixture = makeInstallFixture();
    const applications = NodePath.dirname(fixture.options.currentAppPath);
    NodeFS.chmodSync(applications, 0o555);
    try {
      const { status, log } = fixture.run();
      expect(status).toBe(1);
      expect(log).toContain("is the folder writable?");
    } finally {
      NodeFS.chmodSync(applications, 0o755);
    }
    expect(fixture.marker(fixture.options.currentAppPath)).toBe("old");
    expect(fixture.marker(fixture.options.newAppPath)).toBe("new");
  });

  it("gives up without changes when the app never quits", () => {
    const fixture = makeInstallFixture();
    const pid = spawnOrphanSleep(10);
    try {
      const { status, log } = fixture.run({ pid, waitTimeoutSeconds: 1 });
      expect(status).toBe(1);
      expect(log).toContain("did not quit");
    } finally {
      process.kill(pid);
    }
    expect(fixture.marker(fixture.options.currentAppPath)).toBe("old");
    expect(opened(fixture)).toEqual([]);
  });
});
