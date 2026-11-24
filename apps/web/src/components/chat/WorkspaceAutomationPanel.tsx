import { useState } from "react";
import { ScheduledTasksSettings } from "../settings/ScheduledTasksSettings";
import { SettingsScopeProvider } from "../settings/SettingsScopeContext";
import type { SettingsScopeSearch } from "../settings/settingsScope";

export function WorkspaceAutomationPanel() {
  const [search, setSearch] = useState<SettingsScopeSearch>({});
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <SettingsScopeProvider search={search} onChange={setSearch}>
        <ScheduledTasksSettings />
      </SettingsScopeProvider>
    </div>
  );
}
