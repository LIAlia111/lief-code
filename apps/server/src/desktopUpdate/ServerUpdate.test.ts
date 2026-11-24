import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import type { ManagedPolicyDocument } from "@lief/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ServerConfig from "../config.ts";
import * as ManagedPolicy from "../policy/ManagedPolicy.ts";
import * as DesktopAppUpdate from "./DesktopAppUpdate.ts";
import * as ServerSelfUpdate from "./ServerUpdate.ts";

const makeHarness = (
  options: {
    mode?: "web" | "desktop";
    desktopAppUpdate?: DesktopAppUpdate.DesktopAppUpdate["Service"];
    policy?: ManagedPolicyDocument;
  } = {},
) =>
  ServerSelfUpdate.ServerSelfUpdate.pipe(
    Effect.provide(
      ServerSelfUpdate.layer.pipe(
        Layer.provide(
          Layer.succeed(
            DesktopAppUpdate.DesktopAppUpdate,
            options.desktopAppUpdate ?? {
              available: false,
              run: () => Effect.die("Unexpected update"),
              commit: () => Effect.die("Unexpected commit"),
            },
          ),
        ),
        Layer.provide(ManagedPolicy.layerTest(options.policy)),
        Layer.provide(
          Layer.effect(
            ServerConfig.ServerConfig,
            ServerConfig.ServerConfig.pipe(
              Effect.map((config) => ({ ...config, mode: options.mode ?? "web" })),
            ),
          ).pipe(
            Layer.provide(
              ServerConfig.layerTest(process.cwd(), { prefix: "lief-desktop-update-" }),
            ),
          ),
        ),
        Layer.provide(NodeServices.layer),
      ),
    ),
  );

it.effect("delegates desktop-managed updates to the desktop app when available", () =>
  Effect.gen(function* () {
    const stages: string[] = [];
    const selfUpdate = yield* makeHarness({
      mode: "desktop",
      desktopAppUpdate: {
        available: true,
        run: (reportProgress) =>
          reportProgress("downloading").pipe(
            Effect.andThen(reportProgress("installing")),
            Effect.as({ targetVersion: "1.2.0", method: "desktop-app" as const }),
          ),
        commit: () => Effect.never,
      },
    });
    const result = yield* selfUpdate.update({ targetVersion: "1.1.0" }, (stage) =>
      Effect.sync(() => void stages.push(stage)),
    );
    expect(result).toEqual({ targetVersion: "1.2.0", method: "desktop-app" });
    expect(stages).toEqual(["downloading", "installing"]);
  }),
);

it.effect("refuses updates without a desktop update owner", () =>
  Effect.gen(function* () {
    const selfUpdate = yield* makeHarness();
    const error = yield* selfUpdate.update({ targetVersion: "1.2.0" }).pipe(Effect.flip);
    expect(error.reason).toContain("desktop app");
  }),
);

it("a host crosses tracks only to a release that knows its whole database", () => {
  const cross = (
    serverVersion: string,
    targetVersion: string,
    targetDatabaseMigration: number | undefined,
    databaseMigration = 72,
  ) =>
    ServerSelfUpdate.trackSwitchBlockReason({
      serverVersion,
      targetVersion,
      targetDatabaseMigration,
      databaseMigration: () => databaseMigration,
    });
  const nightly = "0.1.4-nightly.20261027.3796";

  expect(cross(nightly, "0.1.4", 72)).toBeNull();
  // Another client moved this host to a newer Nightly after the switch was planned.
  expect(cross(nightly, "0.1.4", 72, 73)).toContain("does not support yet");
  expect(cross(nightly, "0.1.4", undefined)).toContain("Cannot confirm");
  // A Stable tag can carry a migration the latest Nightly lacks.
  expect(cross("0.1.4", nightly, 72, 73)).toContain("does not support yet");
  expect(cross("0.1.3", "0.1.4", undefined)).toBeNull();
  // A database that exists but cannot be read proves nothing.
  expect(
    ServerSelfUpdate.trackSwitchBlockReason({
      serverVersion: nightly,
      targetVersion: "0.1.4",
      targetDatabaseMigration: 72,
      databaseMigration: () => undefined,
    }),
  ).toContain("Cannot confirm");
});
