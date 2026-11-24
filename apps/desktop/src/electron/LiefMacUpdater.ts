// @effect-diagnostics nodeBuiltinImport:off -- Streams a large download and spawns a detached installer.
// @effect-diagnostics globalTimers:off -- The download idle timeout aborts a fetch outside the Effect runtime.
/**
 * The ElectronUpdater service for ad-hoc signed Lief.code builds on macOS. It emits the events
 * electron-updater does, so DesktopUpdates and the existing update UI drive it unchanged.
 *
 * @module LiefMacUpdater
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as NodeEvents from "node:events";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import {
  LIEF_BUILD_INFO_FILE,
  LIEF_LATEST_RELEASE_API,
  LiefUpdateError,
  buildLiefInstallScript,
  isLiefUpgrade,
  isTranslocatedAppPath,
  normalizeLiefVersion,
  parseLiefBuildInfo,
  parseLiefRelease,
  verifyFileSha256,
  type LiefBuildInfo,
  type LiefRelease,
} from "../updates/liefUpdate.ts";
import {
  ElectronUpdater,
  ElectronUpdaterCheckForUpdatesError,
  ElectronUpdaterDownloadUpdateError,
  ElectronUpdaterQuitAndInstallError,
} from "./ElectronUpdater.ts";

const CHANNEL = "lief";
const METADATA_TIMEOUT_MS = 20_000;
const DOWNLOAD_IDLE_TIMEOUT_MS = 60_000;

export interface LiefFetchResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  readonly body: ReadableStream<Uint8Array> | null;
  json(): Promise<unknown>;
}

export interface LiefMacUpdaterDeps {
  readonly buildInfo: LiefBuildInfo;
  /** The running macOS application bundle. */
  readonly currentAppPath: string;
  readonly homeDirectory: string;
  readonly pid: number;
  readonly fetch: (
    url: string,
    init: { readonly headers: Record<string, string>; readonly signal: AbortSignal },
  ) => Promise<LiefFetchResponse>;
  /** Runs a system tool (ditto, plutil, codesign, xattr) and resolves with its stdout. */
  readonly execFile: (file: string, args: ReadonlyArray<string>) => Promise<string>;
  /** Starts a process that outlives the app. */
  readonly spawnDetached: (file: string, args: ReadonlyArray<string>) => void;
  readonly quitApp: () => void;
  /** Registers a synchronous last-chance hook on app quit; returns its removal. */
  readonly onWillQuit: (listener: () => void) => () => void;
  readonly now?: () => number;
}

export interface LiefUpdatePaths {
  readonly cacheRoot: string;
  readonly backupRoot: string;
  readonly logPath: string;
}

export function liefUpdatePaths(homeDirectory: string): LiefUpdatePaths {
  const library = NodePath.join(homeDirectory, "Library");
  return {
    cacheRoot: NodePath.join(library, "Caches", "Lief Lief", "updates"),
    backupRoot: NodePath.join(library, "Application Support", "Lief Lief", "update-backup"),
    logPath: NodePath.join(library, "Logs", "Lief Lief", "update.log"),
  };
}

interface PreparedUpdate {
  readonly release: LiefRelease;
  readonly appPath: string;
  readonly versionDir: string;
}

/** Fails unless the app can replace itself without elevated rights. */
function assertReplaceableAppLocation(appPath: string): void {
  if (isTranslocatedAppPath(appPath)) throw new LiefUpdateError("translocated", appPath);
  try {
    NodeFS.accessSync(NodePath.dirname(appPath), NodeFS.constants.W_OK);
    NodeFS.accessSync(appPath, NodeFS.constants.W_OK);
  } catch (cause) {
    throw new LiefUpdateError(
      "not-writable",
      `${NodePath.dirname(appPath)}: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}

async function readBundleIdentifier(
  execFile: LiefMacUpdaterDeps["execFile"],
  appPath: string,
): Promise<string> {
  const output = await execFile("/usr/bin/plutil", [
    "-extract",
    "CFBundleIdentifier",
    "raw",
    "-o",
    "-",
    NodePath.join(appPath, "Contents", "Info.plist"),
  ]);
  return output.trim();
}

async function readBundleCommunityVersion(
  execFile: LiefMacUpdaterDeps["execFile"],
  appPath: string,
): Promise<string | null> {
  try {
    const raw = await NodeFS.promises.readFile(
      NodePath.join(appPath, "Contents", "Resources", LIEF_BUILD_INFO_FILE),
      "utf8",
    );
    const info = parseLiefBuildInfo(raw);
    if (info) return info.communityVersion;
  } catch {}
  try {
    const shortVersion = await execFile("/usr/bin/plutil", [
      "-extract",
      "CFBundleShortVersionString",
      "raw",
      "-o",
      "-",
      NodePath.join(appPath, "Contents", "Info.plist"),
    ]);
    return normalizeLiefVersion(shortVersion.trim());
  } catch {
    return null;
  }
}

/**
 * Extracts and checks a verified zip: one .app, the running app's bundle id, the release's
 * version, a valid code signature, and no quarantine flag. Returns the extracted bundle.
 */
async function prepareLiefUpdate(options: {
  readonly zipPath: string;
  readonly extractDir: string;
  readonly expectedBundleId: string;
  readonly expectedVersion: string;
  readonly execFile: LiefMacUpdaterDeps["execFile"];
}): Promise<string> {
  const { execFile } = options;
  await NodeFS.promises.rm(options.extractDir, { recursive: true, force: true });
  await NodeFS.promises.mkdir(options.extractDir, { recursive: true });
  try {
    await execFile("/usr/bin/ditto", ["-x", "-k", options.zipPath, options.extractDir]);
  } catch (cause) {
    throw new LiefUpdateError("extract-failed", describe(cause));
  }
  const apps = (await NodeFS.promises.readdir(options.extractDir, { withFileTypes: true })).filter(
    (entry) => entry.isDirectory() && entry.name.endsWith(".app"),
  );
  if (apps.length !== 1) {
    throw new LiefUpdateError("extract-failed", `expected one .app, found ${apps.length}`);
  }
  const appPath = NodePath.join(options.extractDir, apps[0]!.name);

  let bundleId: string;
  try {
    bundleId = await readBundleIdentifier(execFile, appPath);
  } catch (cause) {
    throw new LiefUpdateError("bundle-mismatch", describe(cause));
  }
  if (bundleId !== options.expectedBundleId) {
    throw new LiefUpdateError(
      "bundle-mismatch",
      `expected ${options.expectedBundleId}, got ${bundleId}`,
    );
  }

  const version = await readBundleCommunityVersion(execFile, appPath);
  if (version !== options.expectedVersion) {
    throw new LiefUpdateError(
      "version-mismatch",
      `expected ${options.expectedVersion}, got ${version ?? "unknown"}`,
    );
  }

  try {
    await execFile("/usr/bin/codesign", ["--verify", "--deep", "--strict", appPath]);
  } catch (cause) {
    throw new LiefUpdateError("signature-invalid", describe(cause));
  }
  // xattr exits non-zero when nothing carried the flag; the check below is what matters.
  await execFile("/usr/bin/xattr", ["-dr", "com.apple.quarantine", appPath]).catch(() => "");
  const stillQuarantined = await execFile("/usr/bin/xattr", [
    "-p",
    "com.apple.quarantine",
    appPath,
  ]).then(
    () => true,
    () => false,
  );
  if (stillQuarantined) {
    throw new LiefUpdateError("extract-failed", "could not clear com.apple.quarantine");
  }
  return appPath;
}

function describe(cause: unknown): string {
  return (cause instanceof Error ? cause.message : String(cause)).slice(0, 500);
}

async function downloadToFile(options: {
  readonly fetch: LiefMacUpdaterDeps["fetch"];
  readonly url: string;
  readonly filePath: string;
  readonly expectedSize: number;
  readonly onProgress: (progress: {
    percent: number;
    transferred: number;
    total: number;
    bytesPerSecond: number;
  }) => void;
  readonly now: () => number;
}): Promise<void> {
  const controller = new AbortController();
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const armIdleTimer = () => {
    if (idleTimer !== undefined) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => controller.abort(), DOWNLOAD_IDLE_TIMEOUT_MS);
  };
  armIdleTimer();
  const output = NodeFS.createWriteStream(options.filePath);
  const closed = new Promise<void>((resolve, reject) => {
    output.on("close", resolve);
    output.on("error", reject);
  });
  try {
    let response: LiefFetchResponse;
    try {
      response = await options.fetch(options.url, {
        headers: { Accept: "application/octet-stream" },
        signal: controller.signal,
      });
    } catch (cause) {
      throw new LiefUpdateError("network", describe(cause));
    }
    if (!response.ok || !response.body) {
      throw new LiefUpdateError("network", `download HTTP ${response.status}`);
    }
    const total = options.expectedSize;
    const startedAt = options.now();
    let transferred = 0;
    const reader = response.body.getReader();
    for (;;) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (cause) {
        throw new LiefUpdateError("network", describe(cause));
      }
      if (chunk.done) break;
      armIdleTimer();
      transferred += chunk.value.byteLength;
      if (transferred > total) {
        throw new LiefUpdateError("digest-mismatch", "download is larger than the release asset");
      }
      if (!output.write(chunk.value)) {
        await new Promise<void>((resolve) => output.once("drain", resolve));
      }
      const elapsedSeconds = Math.max(0.001, (options.now() - startedAt) / 1000);
      options.onProgress({
        percent: (transferred / total) * 100,
        transferred,
        total,
        bytesPerSecond: Math.round(transferred / elapsedSeconds),
      });
    }
    if (transferred !== total) {
      throw new LiefUpdateError("network", `download ended at ${transferred} of ${total} bytes`);
    }
  } finally {
    if (idleTimer !== undefined) clearTimeout(idleTimer);
    output.end();
    await closed;
  }
}

/** @public */
export function makeLiefMacUpdater(deps: LiefMacUpdaterDeps) {
  const events = new NodeEvents.EventEmitter();
  const paths = liefUpdatePaths(deps.homeDirectory);
  const now = deps.now ?? Date.now;
  const runningVersion = deps.buildInfo.communityVersion;
  let latest: LiefRelease | null = null;
  let prepared: PreparedUpdate | null = null;
  let autoInstallOnAppQuit = false;
  let installerStarted = false;

  const updateInfo = (release: LiefRelease) => ({
    version: release.version,
    releaseName: release.releaseName ?? release.tag,
    releaseNotes: release.releaseNotes ?? undefined,
    ...(release.releaseDate ? { releaseDate: release.releaseDate } : {}),
  });

  const check = async (): Promise<void> => {
    events.emit("checking-for-update");
    let response: LiefFetchResponse;
    try {
      response = await deps.fetch(LIEF_LATEST_RELEASE_API, {
        headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
        signal: AbortSignal.timeout(METADATA_TIMEOUT_MS),
      });
    } catch (cause) {
      throw new LiefUpdateError("network", describe(cause));
    }
    if (!response.ok) {
      throw new LiefUpdateError(
        response.status === 403 || response.status === 429 ? "rate-limited" : "network",
        `releases/latest HTTP ${response.status}`,
      );
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch (cause) {
      throw new LiefUpdateError("invalid-release", describe(cause));
    }
    const release = parseLiefRelease(body);
    // Never offer an equal or older release, also to local builds that already ship newer code.
    if (!isLiefUpgrade(release.version, runningVersion)) {
      latest = null;
      events.emit("update-not-available", { version: release.version });
      return;
    }
    latest = release;
    events.emit("update-available", updateInfo(release));
  };

  const download = async (): Promise<void> => {
    const release = latest;
    if (!release) throw new LiefUpdateError("no-download", "no release found by the last check");
    if (prepared && prepared.release.version === release.version) {
      events.emit("update-downloaded", updateInfo(release));
      return;
    }
    // Refuse early instead of after a 200 MB download.
    assertReplaceableAppLocation(deps.currentAppPath);
    const expectedBundleId = await readBundleIdentifier(deps.execFile, deps.currentAppPath);

    await NodeFS.promises.mkdir(paths.cacheRoot, { recursive: true });
    const versionDir = NodePath.join(paths.cacheRoot, release.version);
    // Drop earlier downloads; only the release being fetched is kept.
    for (const entry of await NodeFS.promises.readdir(paths.cacheRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== release.version) {
        await NodeFS.promises.rm(NodePath.join(paths.cacheRoot, entry.name), {
          recursive: true,
          force: true,
        });
      }
    }
    await NodeFS.promises.rm(versionDir, { recursive: true, force: true });
    await NodeFS.promises.mkdir(versionDir, { recursive: true });
    const zipPath = NodePath.join(versionDir, release.asset.name);
    const partialPath = `${zipPath}.part`;
    await downloadToFile({
      fetch: deps.fetch,
      url: release.asset.url,
      filePath: partialPath,
      expectedSize: release.asset.size,
      now,
      onProgress: (progress) => events.emit("download-progress", progress),
    });
    try {
      await verifyFileSha256(partialPath, release.asset.sha256);
    } catch (error) {
      await NodeFS.promises.rm(versionDir, { recursive: true, force: true });
      throw error;
    }
    await NodeFS.promises.rename(partialPath, zipPath);
    const appPath = await prepareLiefUpdate({
      zipPath,
      extractDir: NodePath.join(versionDir, "app"),
      expectedBundleId,
      expectedVersion: release.version,
      execFile: deps.execFile,
    }).catch(async (error: unknown) => {
      await NodeFS.promises.rm(versionDir, { recursive: true, force: true });
      throw error;
    });
    // The zip is no longer needed once the bundle checks out.
    await NodeFS.promises.rm(zipPath, { force: true });
    prepared = { release, appPath, versionDir };
    events.emit("update-downloaded", updateInfo(release));
  };

  const startInstaller = (relaunch: boolean): void => {
    const update = prepared;
    if (!update || !NodeFS.existsSync(update.appPath)) {
      throw new LiefUpdateError("no-download");
    }
    assertReplaceableAppLocation(deps.currentAppPath);
    const script = buildLiefInstallScript({
      pid: deps.pid,
      currentAppPath: deps.currentAppPath,
      newAppPath: update.appPath,
      backupDir: NodePath.join(paths.backupRoot, runningVersion),
      logPath: paths.logPath,
      cleanupDir: update.versionDir,
      fromVersion: runningVersion,
      toVersion: update.release.version,
      relaunch,
    });
    const scriptPath = NodePath.join(paths.cacheRoot, `install-${update.release.version}.zsh`);
    try {
      NodeFS.mkdirSync(NodePath.dirname(paths.logPath), { recursive: true });
      NodeFS.writeFileSync(scriptPath, script, { mode: 0o700 });
      deps.spawnDetached("/bin/zsh", [scriptPath]);
    } catch (cause) {
      throw new LiefUpdateError("install-failed", describe(cause));
    }
    installerStarted = true;
  };

  const removeWillQuit = deps.onWillQuit(() => {
    if (!autoInstallOnAppQuit || installerStarted || !prepared) return;
    try {
      // The user quit on purpose, so the new version waits for their next launch.
      startInstaller(false);
    } catch {
      // Nothing to report at quit; the download stays and the next session offers it again.
    }
  });

  const ignored = (name: string) =>
    Effect.fn(`LiefMacUpdater.${name}`)(function (_value: unknown) {
      return Effect.void;
    });
  const service = ElectronUpdater.of({
    setFeedURL: ignored("setFeedURL"),
    setAutoDownload: ignored("setAutoDownload"),
    setAutoInstallOnAppQuit: Effect.fn("LiefMacUpdater.setAutoInstallOnAppQuit")(function (value) {
      return Effect.sync(() => {
        autoInstallOnAppQuit = value;
      });
    }),
    setChannel: ignored("setChannel"),
    setAllowPrerelease: ignored("setAllowPrerelease"),
    // Downgrades are never allowed: an older build can lack migrations this one ran.
    allowDowngrade: Effect.succeed(false),
    setAllowDowngrade: ignored("setAllowDowngrade"),
    setFullChangelog: ignored("setFullChangelog"),
    setDisableDifferentialDownload: ignored("setDisableDifferentialDownload"),
    checkForUpdates: Effect.tryPromise({
      try: check,
      catch: (cause) => new ElectronUpdaterCheckForUpdatesError({ channel: CHANNEL, cause }),
    }),
    downloadUpdate: Effect.tryPromise({
      try: download,
      catch: (cause) => new ElectronUpdaterDownloadUpdateError({ channel: CHANNEL, cause }),
    }),
    quitAndInstall: Effect.fn("LiefMacUpdater.quitAndInstall")(function ({
      isSilent,
      isForceRunAfter,
    }) {
      return Effect.try({
        try: () => {
          startInstaller(true);
          deps.quitApp();
        },
        catch: (cause) =>
          new ElectronUpdaterQuitAndInstallError({
            channel: CHANNEL,
            isSilent,
            isForceRunAfter,
            cause,
          }),
      });
    }),
    on: Effect.fn("LiefMacUpdater.on")(function (eventName, listener) {
      const untyped = listener as unknown as (...args: Array<unknown>) => void;
      return Effect.acquireRelease(
        Effect.sync(() => {
          events.on(eventName, untyped);
        }),
        () =>
          Effect.sync(() => {
            events.removeListener(eventName, untyped);
          }),
      ).pipe(Effect.asVoid);
    }),
    liefFeed: {
      runningVersion,
      customBuild: deps.buildInfo.customBuild,
    },
  });
  return { service, dispose: removeWillQuit };
}

/** The Lief build info of a packaged macOS app, or null for every other build. */
export function readLiefBuildInfo(options: {
  readonly platform: NodeJS.Platform;
  readonly isPackaged: boolean;
  readonly resourcesPath: string;
}): LiefBuildInfo | null {
  if (options.platform !== "darwin" || !options.isPackaged) return null;
  try {
    return parseLiefBuildInfo(
      NodeFS.readFileSync(NodePath.join(options.resourcesPath, LIEF_BUILD_INFO_FILE), "utf8"),
    );
  } catch {
    return null;
  }
}

export const layer = (deps: LiefMacUpdaterDeps) =>
  Layer.effect(
    ElectronUpdater,
    Effect.acquireRelease(
      Effect.sync(() => makeLiefMacUpdater(deps)),
      ({ dispose }) => Effect.sync(dispose),
    ).pipe(Effect.map(({ service }) => service)),
  );
