import { AuthEnvironmentScope, AuthEnvironmentScopes } from "@lief/contracts";
import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";

const RetiredScopes = Schema.Literals(["relay:read", "relay:write", "relay:configure"]);

// Older local credentials included relay permissions; discard only those retired grants.
export const PersistedAuthScopes = Schema.Array(
  Schema.Union([AuthEnvironmentScope, RetiredScopes]),
).pipe(
  Schema.decodeTo(
    AuthEnvironmentScopes,
    SchemaTransformation.transform<
      AuthEnvironmentScopes,
      ReadonlyArray<AuthEnvironmentScope | typeof RetiredScopes.Type>
    >({
      decode: (scopes) =>
        scopes.filter(
          (scope): scope is AuthEnvironmentScope =>
            scope !== "relay:read" && scope !== "relay:write" && scope !== "relay:configure",
        ),
      encode: (scopes) => scopes,
    }),
  ),
);
