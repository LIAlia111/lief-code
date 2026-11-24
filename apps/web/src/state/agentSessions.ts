import { WS_METHODS } from "@lief/contracts";
import {
  createEnvironmentRpcCommand,
  createEnvironmentRpcQueryAtomFamily,
} from "@lief/client-runtime/state/runtime";

import { connectionAtomRuntime } from "../connection/runtime";

export const agentSessionScan = createEnvironmentRpcQueryAtomFamily(connectionAtomRuntime, {
  label: "environment-data:agent-sessions:scan",
  tag: WS_METHODS.agentSessionsScan,
  staleTimeMs: 30000,
  idleTtlMs: 5 * 60000,
});

export const agentSessionImport = createEnvironmentRpcCommand(connectionAtomRuntime, {
  label: "environment-data:agent-sessions:import",
  tag: WS_METHODS.agentSessionsImport,
});
export const agentSessionRescan = createEnvironmentRpcCommand(connectionAtomRuntime, {
  label: "environment-data:agent-sessions:rescan",
  tag: WS_METHODS.agentSessionsScan,
});
