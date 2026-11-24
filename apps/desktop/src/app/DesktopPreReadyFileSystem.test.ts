import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as HostProcess from "@lief/shared/HostProcess";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";

import * as DesktopPreReadyFileSystem from "./DesktopPreReadyFileSystem.ts";
import * as DesktopUserData from "./DesktopUserData.ts";

it.layer(NodeServices.layer)("DesktopPreReadyFileSystem", (it) => {
  it.effect.skipIf(HostProcess.Platform.defaultValue() === "win32" || process.getuid?.() === 0)(
    "fails instead of treating an unreadable profile as missing",
    () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const root = yield* fileSystem.makeTempDirectoryScoped({ prefix: "lief-pre-ready-fs-" });
        const profile = yield* DesktopUserData.resolveUserDataPath({
          appDataDirectory: root,
          isDevelopment: false,
        }).pipe(Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({}))));
        yield* fileSystem.makeDirectory(profile);
        yield* fileSystem.chmod(root, 0o000);
        yield* Effect.addFinalizer(() => fileSystem.chmod(root, 0o700).pipe(Effect.orDie));

        const error = yield* FileSystem.FileSystem.use((preReady) => preReady.exists(profile)).pipe(
          Effect.provide(DesktopPreReadyFileSystem.layer),
          Effect.flip,
        );

        assert.strictEqual(error.reason._tag, "PermissionDenied");
      }),
  );
});
