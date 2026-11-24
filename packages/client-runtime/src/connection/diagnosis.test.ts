import { describe, expect, it } from "@effect/vitest";
import { EnvironmentAuthInvalidError } from "@lief/contracts";

import { presentConnectionDiagnosis } from "./diagnosis.ts";
import { mapRemoteEnvironmentError } from "./errors.ts";
import {
  AVAILABLE_CONNECTION_STATE,
  ConnectionBlockedError,
  ConnectionTransientError,
  type ConnectionAttemptError,
  type SupervisorConnectionState,
} from "./model.ts";

const backoff = (lastFailure: ConnectionAttemptError): SupervisorConnectionState => ({
  ...AVAILABLE_CONNECTION_STATE,
  desired: true,
  network: "online",
  phase: "backoff",
  attempt: 3,
  lastFailure,
  retryAt: Date.UTC(2026, 9, 19, 12, 0, 30),
});

const diagnose = (state: SupervisorConnectionState, via: "direct" = "direct") =>
  presentConnectionDiagnosis({ hostLabel: "Mac mini", state, via });

const results = (state: SupervisorConnectionState, via?: "direct") =>
  diagnose(state, via)?.hops.map((hop) => `${hop.hop}:${hop.result}`);

describe("presentConnectionDiagnosis", () => {
  it("reports this device as offline before any other hop", () => {
    const state = {
      ...backoff(new ConnectionTransientError({ reason: "network", detail: "offline" })),
      network: "offline" as const,
    };
    expect(diagnose(state)?.headline).toBe("This device is offline");
    expect(results(state)?.[0]).toBe("device:failed");
  });

  it("tells a host that refused this device's login to sign in again, not to start Lief.code", () => {
    const failure = mapRemoteEnvironmentError(
      new EnvironmentAuthInvalidError({
        code: "auth_invalid",
        reason: "invalid_credential",
        traceId: "trace-1",
      }),
    );
    const steps = diagnose(backoff(failure), "direct")?.steps.join(" ");
    expect(steps).not.toContain("Make sure Lief.code is running");
    expect(steps).toMatch(/pair|sign in/i);
  });

  it("does not report hops as working when the failure names none", () => {
    const failure = new ConnectionBlockedError({
      reason: "authentication",
      detail: "Pair with the environment again.",
    });
    expect(results(backoff(failure))).not.toContainEqual(expect.stringMatching(/:ok$/));
  });
});
