import { makeSourceControlDefinitionRegistry } from "@lief/source-control-core/shared/definition";
import * as GitHub from "@lief/source-control-github/shared/definition";

export const builtInSourceControlDefinitions = makeSourceControlDefinitionRegistry([
  GitHub.definition,
]);
