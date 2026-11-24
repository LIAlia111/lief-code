import * as Exit from "effect/Exit";
import * as Schema from "effect/Schema";

import { LiefProjectFile } from "@lief/contracts";

import { fromLenientJson } from "./schemaJson.ts";

export const LiefProjectFileFromJson = fromLenientJson(LiefProjectFile);

const decodeLiefProjectFile = Schema.decodeExit(LiefProjectFileFromJson);

export function parseLiefProjectFile(contents: string): LiefProjectFile | null {
  const decoded = decodeLiefProjectFile(contents);
  return Exit.isSuccess(decoded) ? decoded.value : null;
}
