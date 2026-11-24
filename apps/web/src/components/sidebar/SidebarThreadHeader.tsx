import { useGT } from "gt-react";
import { FolderPlusIcon, PlusIcon, SearchIcon, XIcon } from "~/components/icons";
import { useUiText } from "../../i18n/useUiText";
import {
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { Button } from "../ui/button";
import { SidebarInput, SidebarMenuButton } from "../ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

export interface SidebarThreadHeaderProps {
  hasProjects: boolean;
  projectScope: ReactNode;
  onNewProject: () => void;
  onNewThread: (event: ReactMouseEvent) => void;
  newThreadDisabled: boolean;
  newThreadShortcutLabel: string | null | undefined;
  newThreadInProjectShortcutLabel: string | null | undefined;
  showNewThreadInProjectHint: boolean;
  searchOpen: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  isSearching: boolean;
  searchResultCount: number;
  activeSearchResultIndex: number;
  onClearSearch: () => void;
}

export function SidebarThreadHeader({
  hasProjects,
  projectScope,
  onNewProject,
  onNewThread,
  newThreadDisabled,
  newThreadShortcutLabel,
  newThreadInProjectShortcutLabel,
  showNewThreadInProjectHint,
  searchOpen,
  searchInputRef,
  searchQuery,
  onSearchQueryChange,
  onSearchKeyDown,
  isSearching,
  searchResultCount,
  activeSearchResultIndex,
  onClearSearch,
}: SidebarThreadHeaderProps) {
  const gt = useGT();
  const text = useUiText();
  const attachSearchInput = (input: HTMLInputElement | null) => {
    searchInputRef.current = input;
    input?.focus();
  };
  const resultsVisible = isSearching && searchResultCount > 0;
  // Shrinking results can remove the active option; never leave aria-activedescendant pointing at it.
  const activeResultExists = resultsVisible && activeSearchResultIndex < searchResultCount;
  const newThreadLabel = newThreadShortcutLabel
    ? `${text("New task")} (${newThreadShortcutLabel})`
    : text("New task");

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <SidebarHeaderIconButton
            label={text("New task")}
            size="toolbar"
            tooltip={
              showNewThreadInProjectHint ? (
                <span className="flex flex-col gap-0.5">
                  <span>{newThreadLabel}</span>
                  <span className="text-muted-foreground">
                    {newThreadInProjectShortcutLabel
                      ? gt("New thread in current project: Shift+click ({shortcut})", {
                          shortcut: newThreadInProjectShortcutLabel,
                        })
                      : gt("New thread in current project: Shift+click")}
                  </span>
                </span>
              ) : (
                newThreadLabel
              )
            }
            disabled={newThreadDisabled}
            onClick={onNewThread}
          >
            <PlusIcon />
            <span>{text("New task")}</span>
          </SidebarHeaderIconButton>
        </div>
        {hasProjects ? (
          <>
            {projectScope}
            <SidebarHeaderIconButton label={gt("Add project")} onClick={onNewProject}>
              <FolderPlusIcon />
            </SidebarHeaderIconButton>
          </>
        ) : null}
      </div>
      {searchOpen ? (
        <div id="sidebar-thread-search" className="flex items-center gap-1">
          <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-sidebar-border px-2 py-1.5 text-sm font-medium text-sidebar-muted-foreground hover:bg-sidebar-row-hover hover:text-sidebar-foreground focus-within:bg-sidebar-row-hover focus-within:text-sidebar-foreground focus-within:ring-1 focus-within:ring-inset focus-within:ring-ring/70">
            <SearchIcon className="size-4 shrink-0 text-(--sidebar-icon-color)" />
            <SidebarInput
              ref={attachSearchInput}
              nativeInput
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
              onKeyDown={onSearchKeyDown}
              placeholder={gt("Search", { $context: "search field placeholder" })}
              aria-label={gt("Search threads")}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={resultsVisible}
              aria-controls={resultsVisible ? "sidebar-thread-search-results" : undefined}
              aria-activedescendant={
                activeResultExists
                  ? `sidebar-thread-search-result-${activeSearchResultIndex}`
                  : undefined
              }
              className="min-w-0 flex-1"
            />
            {isSearching ? (
              <Button
                type="button"
                size="icon-micro"
                variant="ghost-muted"
                className="shrink-0"
                aria-label={gt("Clear thread search")}
                onClick={() => {
                  onClearSearch();
                  searchInputRef.current?.focus();
                }}
              >
                <XIcon className="size-3" />
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SidebarHeaderIconButton({
  label,
  tooltip = label,
  children,
  ...rest
}: {
  label: string;
  tooltip?: ReactNode;
  children?: ReactNode;
} & Omit<
  ComponentProps<typeof SidebarMenuButton>,
  "children" | "tooltip" | "isActive" | "aria-label"
>) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <SidebarMenuButton
            size="toolbar-icon"
            variant="hover-border"
            type="button"
            aria-label={label}
            {...rest}
          />
        }
      >
        {children}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
        />
      </TooltipTrigger>
      <TooltipPopup side="top">{tooltip}</TooltipPopup>
    </Tooltip>
  );
}
