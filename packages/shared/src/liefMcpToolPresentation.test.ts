import { describe, expect, it } from "vite-plus/test";

import {
  LIEF_MCP_TOOL_NAMES,
  resolveLiefMcpSummaryAction,
  resolveLiefMcpToolDefinition,
  resolveLiefMcpToolPresentation,
} from "./liefMcpToolPresentation.ts";

describe("resolveLiefMcpToolPresentation", () => {
  it("recognizes every Lief tool across provider prefixes and completion suffixes", () => {
    for (const tool of LIEF_MCP_TOOL_NAMES) {
      const presentation = resolveLiefMcpToolPresentation(tool);
      for (const prefix of [
        "mcp__lief-code__",
        "mcp__lief_code__",
        "mcp__lief__",
        "Lief-code.",
        "lief.",
        "lief-code-direct.",
        "mcp__lief_code_direct__",
        "lief_code/",
        "lief:",
        "mcp_lief-code_",
        "Lief.code ",
        "lief-code · ",
      ]) {
        expect(resolveLiefMcpToolPresentation(`${prefix}${tool} completed`), tool).toEqual(
          presentation,
        );
      }
      expect(resolveLiefMcpToolPresentation(`mcp__another-server__${tool}`), tool).toBeNull();
    }
  });

  it("matches OpenCode 2's per-thread server names, whose thread ids hold underscores", () => {
    expect(
      resolveLiefMcpToolPresentation("lief-code-thread_opencode2-adapter_delegate_task")
        ?.displayName,
    ).toBe("Delegate a child task");
    expect(
      resolveLiefMcpToolPresentation("lief-code-thread_opencode2-adapter_not_a_tool"),
    ).toBeNull();
  });
});

describe("resolveLiefMcpToolDefinition", () => {
  it("labels an action tool call as the action it ran", () => {
    expect(
      resolveLiefMcpToolDefinition("mcp__lief-code__preview_act", { action: "type" })?.labels,
    ).toEqual(resolveLiefMcpToolDefinition("preview_type")?.labels);
    expect(
      resolveLiefMcpToolDefinition("lief_thread_transfer", { action: "fork" })?.displayName,
    ).toBe(resolveLiefMcpToolDefinition("lief_thread_fork")?.displayName);
    expect(resolveLiefMcpToolDefinition("preview_act", { action: "unknown" })?.labels[2]).toBe(
      "Used",
    );
  });
});

describe("resolveLiefMcpSummaryAction", () => {
  it("summarizes an action tool by the action each call ran", () => {
    expect(resolveLiefMcpSummaryAction("mcp__lief-code__lief_queue", { action: "list" })).toBe(
      "queue-list",
    );
    expect(resolveLiefMcpSummaryAction("lief_queue", { action: "edit" })).toBe("queue-edit");
    expect(resolveLiefMcpSummaryAction("lief_thread_transfer", { action: "status" })).toBe(
      "thread-transfers",
    );
    expect(resolveLiefMcpSummaryAction("lief_thread_configure", {})).toBe("thread-configuration");
    expect(resolveLiefMcpSummaryAction("schedule_task", { scheduledTaskId: "task-1" })).toBe(
      "schedule-update",
    );
    expect(resolveLiefMcpSummaryAction("delegate_task", { task: "x" })).toBe("delegate");
  });
});
