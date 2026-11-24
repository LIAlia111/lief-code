import type { PullRequestChangeBreakdown } from "@lief/contracts";
import { summarizeChangedFiles } from "@lief/shared/changedFileKind";
import type { ProviderFileStats } from "@lief/source-control-core/server/PullRequestProvider";

export function toChangeBreakdown(stats: ProviderFileStats): PullRequestChangeBreakdown {
  if (stats.truncated) return null;
  return summarizeChangedFiles(stats.files);
}
