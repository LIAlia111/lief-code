import { MAX_ISSUE_TRACKER_ADDITIONAL_SCOPES, type IssueTrackerConnection } from "@lief/contracts";
import { mFallback, msg } from "gt-i18n";
import type { MFunctionType } from "gt-i18n/types";

// Tracker packages name their credential and scope in English, so a sentence is translated only
// when it matches a known tracker's whole sentence; any other tracker keeps the English one.
function knownTrackerSentence(
  english: string,
  candidates: ReadonlyArray<string>,
  resolve: MFunctionType,
): string {
  const known = candidates.find((candidate) => mFallback(candidate) === english);
  return known === undefined ? english : resolve(known);
}

const SERVER_TRACKER_DETAILS = [msg("Issues cannot be browsed for this host yet.")];

/** A tracker's `detail` from the issue list, translated when it is a fixed server line. */
export function issueTrackerDetailText(detail: string, resolve: MFunctionType = mFallback): string {
  return knownTrackerSentence(detail, SERVER_TRACKER_DETAILS, resolve);
}

export function issueTrackerScopeOptions(
  tracker: IssueTrackerConnection,
  bound: ReadonlyArray<string>,
): ReadonlyArray<{ readonly key: string; readonly name: string; readonly addable: boolean }> {
  const offered = new Set(tracker.scopes.map((scope) => scope.key));
  const full = bound.length > MAX_ISSUE_TRACKER_ADDITIONAL_SCOPES;
  return [
    ...tracker.scopes,
    ...bound.filter((key) => !offered.has(key)).map((key) => ({ key, name: key })),
  ].map((scope) => ({ ...scope, addable: !full || bound.includes(scope.key) }));
}
