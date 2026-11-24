import { describe, expect, it } from "vite-plus/test";

import { threadSummaryEnvironmentLines } from "./ThreadSummaryRail.logic";

const labels = { localMachineLabel: "Local machine", fallbackMachineLabel: "Run on" };

describe("threadSummaryEnvironmentLines", () => {
  it("uses the local short label and the project title with the path", () => {
    expect(
      threadSummaryEnvironmentLines({
        isPrimary: true,
        environmentLabel: "This laptop",
        projectTitle: "lief-code",
        projectPath: "D:\\code\\lief",
        ...labels,
      }),
    ).toEqual({ machine: "Local machine", detail: "lief-code · D:\\code\\lief" });
  });

  it("prefers the auto-balance label over the local short label", () => {
    expect(
      threadSummaryEnvironmentLines({
        autoEnvironmentLabel: "Auto balance",
        isPrimary: true,
        environmentLabel: "This laptop",
        projectTitle: "",
        projectPath: "/work/lief",
        ...labels,
      }),
    ).toEqual({ machine: "Auto balance", detail: "/work/lief" });
  });

  it("uses another machine's own label", () => {
    expect(
      threadSummaryEnvironmentLines({
        isPrimary: false,
        environmentLabel: "Build server",
        projectTitle: null,
        projectPath: "/srv/lief",
        ...labels,
      }).machine,
    ).toBe("Build server");
  });

  it("falls back when a remote machine has no label", () => {
    expect(
      threadSummaryEnvironmentLines({
        isPrimary: false,
        environmentLabel: "  ",
        projectPath: "/srv/lief",
        ...labels,
      }).machine,
    ).toBe("Run on");
  });
});
