import { describe, expect, it } from "@effect/vitest";
import { EnvironmentAuthInvalidError } from "@lief/contracts";

import { RemoteEnvironmentAuthFetchError, RemoteEnvironmentAuthTimeoutError } from "../rpc/http.ts";
import { isHostCredentialRefusal, mapRemoteDpopEnvironmentError } from "./errors.ts";

describe("mapRemoteDpopEnvironmentError", () => {
  it.each([
    new RemoteEnvironmentAuthFetchError({
      message: "Failed to fetch remote environment endpoint.",
      cause: new TypeError("Failed to fetch"),
    }),
    new RemoteEnvironmentAuthTimeoutError({
      requestUrl: "https://environment.example.test",
      timeoutMs: 10_000,
    }),
  ])("reports direct endpoint failures: $_tag", (error) => {
    const mapped = mapRemoteDpopEnvironmentError(error);
    expect(mapped).toMatchObject({
      _tag: "ConnectionTransientError",
      detail: error.message,
    });
  });

  it("keeps a direct host's clock refusal apart from a refused pairing", () => {
    const mapped = mapRemoteDpopEnvironmentError(
      new EnvironmentAuthInvalidError({
        code: "auth_invalid",
        reason: "invalid_credential",
        dpopFailureReason: "time_window",
        traceId: "trace-clock",
      }),
    );
    expect(mapped).toMatchObject({ via: "direct", failureCause: "clock_skew" });
    expect(isHostCredentialRefusal(mapped)).toBe(false);
  });
});
