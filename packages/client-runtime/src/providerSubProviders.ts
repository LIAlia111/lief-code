import type { ServerProviderSubProvider } from "@lief/contracts";

export interface SubProviderGroup<Model> {
  readonly subProvider: ServerProviderSubProvider;
  readonly models: ReadonlyArray<Model>;
}
