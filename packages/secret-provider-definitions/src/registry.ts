import { makeSecretProviderDefinitionRegistry } from "@lief/secret-provider-core/shared/definition";
import * as OnePassword from "@lief/secret-provider-onepassword/shared/definition";

export const builtInSecretProviderDefinitions = makeSecretProviderDefinitionRegistry([
  OnePassword.definition,
]);
