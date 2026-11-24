import { assert, describe, it } from "@effect/vitest";

import {
  LIEF_CODE_DEVICE_TOOL_INSTRUCTIONS,
  LIEF_CODE_DEVICE_TOOL_INSTRUCTIONS_WITH_TOOL_SEARCH,
  LIEF_CODE_ORCHESTRATION_INSTRUCTIONS,
  liefAcpPromptWithInstructions,
  liefOrchestrationPrompt,
  liefOrchestrationSystemPrompt,
} from "./orchestrationInstructions.ts";

describe("Lief device instructions", () => {
  it("route device work through device_open and give Claude the line that loads the tools", () => {
    for (const intent of ["`device_list`", "`device_open`", "`agent-device`", "ssh", "`hostId`"]) {
      assert.include(LIEF_CODE_DEVICE_TOOL_INSTRUCTIONS, intent);
    }
    assert.notInclude(LIEF_CODE_DEVICE_TOOL_INSTRUCTIONS, "ToolSearch");
    const loadLine =
      " Load them with ToolSearch `select:mcp__lief-code__device_list,mcp__lief-code__device_open,mcp__lief-code__device_screenshot,mcp__lief-code__device_close`.";
    assert.include(LIEF_CODE_DEVICE_TOOL_INSTRUCTIONS_WITH_TOOL_SEARCH, loadLine);
    assert.equal(
      LIEF_CODE_DEVICE_TOOL_INSTRUCTIONS_WITH_TOOL_SEARCH.replace(loadLine, ""),
      LIEF_CODE_DEVICE_TOOL_INSTRUCTIONS,
    );
  });

  it("open the app before the returned command's snapshots, screenshots and input", () => {
    assert.include(
      LIEF_CODE_DEVICE_TOOL_INSTRUCTIONS,
      "its snapshots, screenshots and input need `open <app>` first,",
    );
  });

  it("keep the failure rule from taking over or closing a session another thread holds", () => {
    // agent-device's DEVICE_IN_USE advice is to rerun with the owner's --session or close it first.
    assert.include(
      LIEF_CODE_DEVICE_TOOL_INSTRUCTIONS,
      "follow its advice once, but never reuse or close another session; if it still fails,",
    );
  });

  it("reach OpenCode and Cursor only when the session holds device access", () => {
    assert.include(liefOrchestrationSystemPrompt(true, true), LIEF_CODE_DEVICE_TOOL_INSTRUCTIONS);
    assert.notInclude(liefOrchestrationSystemPrompt(true, false), "## Lief.code devices");
    assert.isUndefined(liefOrchestrationSystemPrompt(false, true));

    const firstRun = (hasDeviceTools: boolean) =>
      liefOrchestrationPrompt({
        prompt: "Check the login screen.",
        hasLiefMcp: true,
        hasDeviceTools,
        orchestrationDelivered: false,
        deviceInstructionsDelivered: false,
      });
    assert.include(firstRun(true), LIEF_CODE_DEVICE_TOOL_INSTRUCTIONS);
    assert.notInclude(firstRun(false), "## Lief.code devices");

    const laterRun = (deviceInstructionsDelivered: boolean) =>
      liefOrchestrationPrompt({
        prompt: "Check the login screen.",
        hasLiefMcp: true,
        hasDeviceTools: true,
        orchestrationDelivered: true,
        deviceInstructionsDelivered,
      });
    assert.include(laterRun(false), LIEF_CODE_DEVICE_TOOL_INSTRUCTIONS);
    assert.notInclude(laterRun(false), LIEF_CODE_ORCHESTRATION_INSTRUCTIONS.trim());
    assert.equal(laterRun(true), "Check the login screen.");

    // A provider's own guidance reaches a conversation that already had the rest.
    const providerRun = (providerInstructionsDelivered: boolean) =>
      liefOrchestrationPrompt({
        prompt: "Check the login screen.",
        hasLiefMcp: true,
        hasDeviceTools: false,
        orchestrationDelivered: true,
        deviceInstructionsDelivered: false,
        providerInstructions: "Mark awaited shells.",
        providerInstructionsDelivered,
      });
    assert.include(providerRun(false), "Mark awaited shells.");
    assert.notInclude(providerRun(false), LIEF_CODE_ORCHESTRATION_INSTRUCTIONS.trim());
    assert.equal(providerRun(true), "Check the login screen.");
  });

  it("reach ACP agents again when device access changes mid-thread", () => {
    const state = { interactionMode: "default", hasLiefMcp: true, hasDeviceTools: false } as const;
    const withDevices = liefAcpPromptWithInstructions({
      prompt: "Check the login screen.",
      state: { ...state, hasDeviceTools: true },
      previousState: state,
    });
    assert.include(withDevices, LIEF_CODE_DEVICE_TOOL_INSTRUCTIONS);
    assert.equal(
      liefAcpPromptWithInstructions({ prompt: "Again.", state, previousState: state }),
      "Again.",
    );
    assert.notInclude(
      liefAcpPromptWithInstructions({ prompt: "Hi.", state }),
      "## Lief.code devices",
    );
  });
});
