import {
  ServerSelfUpdateError,
  type ServerSelfUpdateInput,
  type ServerSelfUpdateProgressEvent,
  type ServerSelfUpdateProgressStage,
  type ServerSelfUpdateResult,
} from "@lief/contracts";

import * as Context from "effect/Context";

import * as Effect from "effect/Effect";

import * as Layer from "effect/Layer";

import * as Queue from "effect/Queue";

import * as Stream from "effect/Stream";

import { crossesReleaseTrack } from "@lief/shared/cliRelease";

import packageJson from "../../package.json" with { type: "json" };

import * as ServerConfig from "../config.ts";

import * as DesktopAppUpdate from "../desktopUpdate/DesktopAppUpdate.ts";

import { databaseMigrationHead } from "../persistence/databaseMigrationHead.ts";

import * as ManagedPolicy from "../policy/ManagedPolicy.ts";

import { managedUpdateRefusal } from "../policy/managedUpdates.ts";

export class ServerSelfUpdate extends Context.Service<
  ServerSelfUpdate,
  {
    readonly update: (
      input: ServerSelfUpdateInput,
      reportProgress?: (
        stage: ServerSelfUpdateProgressStage,
      ) => Effect.Effect<void, ServerSelfUpdateError>,
      onHandoffAccepted?: () => Effect.Effect<void>,
    ) => Effect.Effect<ServerSelfUpdateResult, ServerSelfUpdateError>;
    readonly commitDesktopUpdate: (
      requestId: string,
      onHandoffAccepted?: () => Effect.Effect<void>,
    ) => Effect.Effect<never, ServerSelfUpdateError>;
  }
>()("lief-code/desktopUpdate/ServerUpdate/ServerSelfUpdate") {}

/** The client checks this when planning; the host checks again because its database may have
 * moved on since (another client updated it). Stable and Nightly each build their own commits,
 * so crossing tracks needs the target release to know every migration this database holds. */
export function trackSwitchBlockReason(input: {
  readonly serverVersion: string;
  readonly targetVersion: string;
  readonly targetDatabaseMigration: number | undefined;
  /** Read only for a crossing; undefined when the database cannot be read. */
  readonly databaseMigration: () => number | undefined;
}): string | null {
  if (!crossesReleaseTrack(input.serverVersion, input.targetVersion)) return null;
  const databaseMigration = input.databaseMigration();
  if (input.targetDatabaseMigration === undefined || databaseMigration === undefined) {
    return `Cannot confirm this database works with lief-code@${input.targetVersion}. Switch tracks from Settings → About → Update track, which checks it first.`;
  }
  return input.targetDatabaseMigration < databaseMigration
    ? `This database has changes lief-code@${input.targetVersion} does not support yet; it stays on this release.`
    : null;
}

const make = Effect.gen(function* () {
  const serverConfig = yield* ServerConfig.ServerConfig;
  const desktopAppUpdate = yield* DesktopAppUpdate.DesktopAppUpdate;
  const policy = yield* ManagedPolicy.ManagedPolicy;
  return ServerSelfUpdate.of({
    update: Effect.fn("ServerSelfUpdate.update")(function* (
      input,
      reportProgress = () => Effect.void,
    ) {
      const refusal = managedUpdateRefusal(policy.document);
      if (refusal !== undefined) return yield* new ServerSelfUpdateError({ reason: refusal });
      if (serverConfig.mode !== "desktop" || !desktopAppUpdate.available) {
        return yield* new ServerSelfUpdateError({
          reason: "Update this installation through the Lief.code desktop app.",
        });
      }
      const crossing =
        input.channel === undefined
          ? null
          : trackSwitchBlockReason({
              serverVersion: packageJson.version,
              targetVersion: input.targetVersion,
              targetDatabaseMigration: input.targetDatabaseMigration,
              databaseMigration: () => databaseMigrationHead(serverConfig.dbPath),
            });
      if (crossing !== null) return yield* new ServerSelfUpdateError({ reason: crossing });
      return yield* desktopAppUpdate.run(
        reportProgress,
        input.channel === undefined
          ? undefined
          : { channel: input.channel, targetVersion: input.targetVersion },
      );
    }),
    commitDesktopUpdate: Effect.fn("ServerSelfUpdate.commitDesktopUpdate")(
      function (requestId, onHandoffAccepted) {
        return desktopAppUpdate.commit(requestId, onHandoffAccepted);
      },
    ),
  });
});

export const layer = Layer.effect(ServerSelfUpdate, make);

// The update outlives client sockets; progress offers to a closed queue are ignored.
export const updateProgressStream = (
  selfUpdate: ServerSelfUpdate["Service"],
  input: ServerSelfUpdateInput,
) =>
  Stream.callback<ServerSelfUpdateProgressEvent, ServerSelfUpdateError>((queue) => {
    const offer = (event: ServerSelfUpdateProgressEvent) =>
      Queue.offer(queue, event).pipe(Effect.ignore);

    return selfUpdate
      .update(input, (stage) => offer({ type: "progress", stage }))
      .pipe(
        Effect.flatMap((result) => offer({ type: "complete", result })),
        Effect.catchTags({
          ServerSelfUpdateError: (error) => Queue.fail(queue, error).pipe(Effect.ignore),
        }),
        Effect.andThen(Queue.end(queue).pipe(Effect.ignore)),
        Effect.forkDetach,
      );
  });
