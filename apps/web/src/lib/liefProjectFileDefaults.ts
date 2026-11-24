import { LIEF_PROJECT_FILE_NAME, type EnvironmentId, type LiefProjectFile } from "@lief/contracts";
import { parseLiefProjectFile } from "@lief/shared/liefProjectFile";
import { executeAtomQuery } from "@lief/client-runtime/state/runtime";

import {
  getProjectFileQueryAtom,
  resolveProjectFileQueryData,
} from "~/components/files/projectFilesQueryState";
import { appAtomRegistry } from "~/rpc/atomRegistry";

export async function readLiefProjectFile(
  environmentId: EnvironmentId,
  workspaceRoot: string,
): Promise<LiefProjectFile | null> {
  const result = await executeAtomQuery(
    appAtomRegistry,
    getProjectFileQueryAtom(environmentId, workspaceRoot, LIEF_PROJECT_FILE_NAME),
    { reportDefect: false, reportFailure: false },
  );
  const data = resolveProjectFileQueryData(
    environmentId,
    workspaceRoot,
    LIEF_PROJECT_FILE_NAME,
    result._tag === "Success" ? result.value : null,
  );
  if (data === null || data.exists === false || data.truncated) return null;
  return parseLiefProjectFile(data.contents);
}
