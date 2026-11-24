import { assert, it } from "@effect/vitest";

import {
  repositoryPathFromRemoteUrl,
  transportSafeSourceControlErrorValue,
} from "./SourceControlProvider.ts";

it("removes URL credentials, query parameters, and fragments from error transport values", () => {
  assert.strictEqual(
    transportSafeSourceControlErrorValue(
      "https://user:secret@example.test/org/repo/pull/42?token=secret#discussion",
    ),
    "https://example.test/org/repo/pull/42",
  );
});

it.each([
  ["git@github.com:LIAlia111/lief-code.git", "LIAlia111/lief-code"],
  ["github.com:LIAlia111/lief-code.git", "LIAlia111/lief-code"],
  ["gitlab.com:LIAlia111/platform/lief", "LIAlia111/platform/lief"],
  ["https://github.com/LIAlia111/lief-code.git", "LIAlia111/lief-code"],
  ["https://github.com/LIAlia111/lief-code.git?view=compact", "LIAlia111/lief-code"],
  ["https://github.com/LIAlia111/lief-code.git#section", "LIAlia111/lief-code"],
  ["C:/repos/lief", null],
])("reads the repository path of %s", (remoteUrl, expected) => {
  assert.strictEqual(repositoryPathFromRemoteUrl(remoteUrl), expected);
});
