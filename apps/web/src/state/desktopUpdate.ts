import { useAtomValue } from "@effect/atom-react";
import type { DesktopBridge, DesktopUpdateState } from "@lief/contracts";
import * as Effect from "effect/Effect";
import * as Queue from "effect/Queue";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Atom } from "effect/reactivity";
import { msg } from "gt-react";
import { useEffect } from "react";
import { create } from "zustand";

import { m } from "../i18n/messages";

type DesktopUpdateBridge = Pick<DesktopBridge, "getUpdateState" | "onUpdateState">;

const INITIAL_STATE_READ_ATTEMPT_COUNT = 3;

export class DesktopUpdateStateReadError extends Schema.TaggedError<DesktopUpdateStateReadError>()(
  "DesktopUpdateStateReadError",
  {
    attemptCount: Schema.Number,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return m(
      msg("Failed to read the initial desktop update state after {count} attempts.", {
        count: this.attemptCount,
      }),
    );
  }
}

function getDesktopUpdateBridge(): DesktopUpdateBridge | undefined {
  return typeof window === "undefined" ? undefined : window.desktopBridge;
}

export function createDesktopUpdateStateAtom(getBridge: () => DesktopUpdateBridge | undefined) {
  const updates = Stream.callback<DesktopUpdateState | null>((queue) =>
    Effect.gen(function* () {
      const bridge = getBridge();
      if (!bridge) {
        Queue.offerUnsafe(queue, null);
        return yield* Effect.never;
      }

      let receivedUpdate = false;
      yield* Effect.acquireRelease(
        Effect.sync(() =>
          bridge.onUpdateState((state) => {
            receivedUpdate = true;
            Queue.offerUnsafe(queue, state);
          }),
        ),
        (unsubscribe) => Effect.sync(unsubscribe),
      );

      const initialState = yield* Effect.tryPromise({
        try: () => bridge.getUpdateState(),
        catch: (cause) =>
          new DesktopUpdateStateReadError({
            attemptCount: INITIAL_STATE_READ_ATTEMPT_COUNT,
            cause,
          }),
      }).pipe(
        Effect.retry({ times: INITIAL_STATE_READ_ATTEMPT_COUNT - 1 }),
        Effect.catchTags({
          DesktopUpdateStateReadError: (error) =>
            Effect.logError(error.message, {
              error,
              errorTag: error._tag,
              attemptCount: error.attemptCount,
            }).pipe(Effect.as(null)),
        }),
      );
      if (!receivedUpdate && initialState !== null) {
        Queue.offerUnsafe(queue, initialState);
      }

      return yield* Effect.never;
    }),
  );

  return Atom.make(updates, { initialValue: null }).pipe(
    Atom.keepAlive,
    Atom.withLabel("desktop:update-state"),
  );
}

export const desktopUpdateStateAtom = createDesktopUpdateStateAtom(getDesktopUpdateBridge);

export function useDesktopUpdateState(): DesktopUpdateState | null {
  return AsyncResult.getOrElse(useAtomValue(desktopUpdateStateAtom), () => null);
}

const AUTOMATIC_UPDATE_KEY = "lief-code:automatic-desktop-updates";

function initialAutomaticUpdates(): boolean {
  try {
    return localStorage.getItem(AUTOMATIC_UPDATE_KEY) === "true";
  } catch {
    return false;
  }
}

export const useDesktopAutomaticUpdates = create<{
  readonly enabled: boolean;
  readonly setEnabled: (enabled: boolean) => void;
}>((set) => ({
  enabled: initialAutomaticUpdates(),
  setEnabled: (enabled) => {
    set({ enabled });
    try {
      localStorage.setItem(AUTOMATIC_UPDATE_KEY, String(enabled));
    } catch {
      return;
    }
  },
}));

export function DesktopAutomaticUpdates() {
  const enabled = useDesktopAutomaticUpdates((state) => state.enabled);
  // oxlint-disable-next-line lief/no-unreasoned-state-sync -- Apply the saved preference in the desktop process.
  useEffect(() => {
    void window.desktopBridge?.setUpdateAutomaticChecks?.(enabled);
  }, [enabled]);
  return null;
}
