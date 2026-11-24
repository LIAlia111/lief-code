import {
  LIEF_PROJECT_FILE_NAME,
  type EnvironmentId,
  type LiefProjectFile,
  type LiefProjectFileScript,
} from "@lief/contracts";
import { parseLiefProjectFile } from "@lief/shared/liefProjectFile";

import { useProjectFileQuery } from "~/components/files/projectFilesQueryState";

const NO_SCRIPTS: ReadonlyArray<LiefProjectFileScript> = [];

export interface LiefProjectFileState {
  status: "loading" | "missing" | "invalid" | "valid";
  file: LiefProjectFile | null;
  scripts: ReadonlyArray<LiefProjectFileScript>;
}

export function useLiefProjectFileState(
  environmentId: EnvironmentId,
  cwd: string | null,
): LiefProjectFileState {
  const query = useProjectFileQuery(environmentId, cwd ?? "", LIEF_PROJECT_FILE_NAME, cwd !== null);
  const contents = query.data && !query.data.truncated ? query.data.contents : null;
  const isPending = query.isPending;
  if (contents === null) {
    return {
      status: isPending ? "loading" : "missing",
      file: null,
      scripts: NO_SCRIPTS,
    } as const;
  }
  const file = parseLiefProjectFile(contents);
  if (file === null) {
    return { status: "invalid", file: null, scripts: NO_SCRIPTS } as const;
  }
  return { status: "valid", file, scripts: file.scripts ?? NO_SCRIPTS } as const;
}

export function useLiefProjectFileScripts(
  environmentId: EnvironmentId,
  cwd: string | null,
): ReadonlyArray<LiefProjectFileScript> {
  return useLiefProjectFileState(environmentId, cwd).scripts;
}
