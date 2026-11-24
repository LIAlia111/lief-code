import "./liefWordmark.css";
import { useMemoryProposalNotification } from "../settings/useMemoryProposalNotification";

import {
  ArchiveIcon,
  ArrowLeftIcon,
  SettingsIcon,
  EllipsisIcon,
  ArrowRightIcon,
} from "~/components/icons";
import type { ReactNode } from "react";
import { T, useGT } from "gt-react";
import { memo, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEnvironmentIdentificationMode } from "../../hooks/useSettings";

import { useAtomValue } from "@effect/atom-react";
import { shortcutLabelForCommand } from "../../keybindings";
import {
  navigateHistory,
  useCanNavigateHistory,
  type HistoryDirection,
} from "../../navigationHistory";
import { primaryServerKeybindingsAtom } from "../../state/server";
import { cn } from "../../lib/utils";
import { useIssuesSupported, usePullRequestsSupported } from "../../state/environments";

import {
  resolveEnvironmentIdentificationPillLabel,
  resolveSidebarStageBackdropVariant,
  useEnvironmentStageLabel,
} from "../SidebarStageBackdrop";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "../ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "../ui/popover";
import { openRecentWork } from "../../workbenchNavigation";
import { readPullRequestListPreferences } from "../pullRequest/pullRequestListPreferences";
import { readIssueListPreferences } from "../issue/issueListPreferences";
import { isSidebarUtilityPage, useNavigateToMainApp } from "./mainAppLocation";
import { SidebarThreadUndoNotice } from "./SidebarThreadUndoNotice";
import { SidebarProviderUpdatePill } from "./SidebarProviderUpdatePill";
import { SidebarUpdateArchitectureWarning, SidebarUpdatePill } from "./SidebarUpdatePill";
import { observeResize } from "~/lib/observeResize";
export const SidebarChromeHeader = memo(function SidebarChromeHeader({
  isElectron,
  search,
}: {
  isElectron: boolean;
  search: ReactNode;
}) {
  const stageLabel = useEnvironmentStageLabel();
  const environmentIdentificationMode = useEnvironmentIdentificationMode();
  const gt = useGT();
  const backdropVariant = resolveSidebarStageBackdropVariant(
    stageLabel,
    environmentIdentificationMode,
  );
  const pillLabel = backdropVariant
    ? resolveEnvironmentIdentificationPillLabel(stageLabel)
    : environmentIdentificationMode === "pill"
      ? resolveEnvironmentIdentificationPillLabel(stageLabel)
      : null;
  return (
    <div
      className={cn(
        "relative flex h-[var(--workspace-topbar-height)] shrink-0 flex-row items-center gap-2 pr-3",
        isElectron && "drag-region",
      )}
    >
      <div className="relative top-[calc(var(--workspace-controls-top)-env(safe-area-inset-top))] z-10 ml-[calc(var(--workspace-controls-left)+1px-env(safe-area-inset-left))] flex shrink-0 items-center md:hidden">
        <SidebarTrigger
          variant="ghost"
          className="relative top-auto translate-y-0"
          aria-label={gt("Toggle main sidebar")}
        />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <SidebarBrand />
        {pillLabel ? (
          <div className="ml-1 flex h-7 items-center">
            <Badge data-environment-identification="pill" size="sm" variant="secondary">
              {pillLabel}
            </Badge>
          </div>
        ) : null}
      </div>
      {isElectron ? (
        <div className="hidden shrink-0 items-center md:flex">
          <HistoryNavigationButton direction="back" />
          <HistoryNavigationButton direction="forward" />
        </div>
      ) : null}
      <div className="flex shrink-0 items-center">{search}</div>
    </div>
  );
});
export function SidebarBrandWidthProbe({
  isElectron,
  onWidthChange,
}: {
  isElectron: boolean;
  onWidthChange: (width: number) => void;
}) {
  const observeWidth = (probe: HTMLDivElement) => {
    return observeResize(probe, ([entry]) => {
      if (entry) onWidthChange(entry.borderBoxSize[0]?.inlineSize ?? probe.offsetWidth);
    });
  };
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none invisible fixed top-0 left-0 flex w-max border-r border-transparent pr-3"
      ref={observeWidth}
    >
      <div className="ml-[calc(var(--workspace-titlebar-content-left)-var(--liquid-sidebar-inset,0px)+1px)] flex gap-1">
        <SidebarBrandMark />
        <div className={isElectron ? "w-20" : "w-8"} />
      </div>
    </div>
  );
}

function HistoryNavigationButton({ direction }: { direction: HistoryDirection }) {
  const keybindings = useAtomValue(primaryServerKeybindingsAtom);
  const enabled = useCanNavigateHistory(direction);
  const gt = useGT();
  const label = direction === "back" ? gt("Go back") : gt("Go forward");
  const shortcutLabel = shortcutLabelForCommand(
    keybindings,
    direction === "back" ? "navigation.back" : "navigation.forward",
  );
  const Icon = direction === "back" ? ArrowLeftIcon : ArrowRightIcon;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            disabled={!enabled}
            onClick={() => navigateHistory(direction)}
            size="icon-xs"
            variant="ghost-muted"
          />
        }
      >
        <Icon className="size-3.5" />
      </TooltipTrigger>
      <TooltipPopup side="bottom">
        {label}
        {shortcutLabel ? ` (${shortcutLabel})` : ""}
      </TooltipPopup>
    </Tooltip>
  );
}

function SidebarBrand() {
  const gt = useGT();
  return (
    <Link
      aria-label={gt("Lief.code home")}
      data-sidebar-brand=""
      className="sidebar-brand flex h-7 w-fit min-w-0 items-center overflow-hidden rounded-md text-foreground outline-hidden ring-ring focus-visible:ring-2 focus-visible:ring-inset"
      to="/"
    >
      <SidebarBrandMark />
    </Link>
  );
}
function SidebarBrandMark() {
  return (
    <span className="flex min-w-0 items-center gap-2 truncate text-sm font-semibold tracking-tight">
      <img src="/lief-mark.svg" alt="" className="size-6 shrink-0 rounded-md" />
      <span data-lief-wordmark className="truncate">
        Lief.code
      </span>
    </span>
  );
}
const SidebarUtilityMenu = memo(function SidebarUtilityMenu({
  archiveSlot,
}: {
  archiveSlot?: ReactNode;
}) {
  const navigate = useNavigate();
  const navigateToMainApp = useNavigateToMainApp();
  const gt = useGT();
  const { isMobile, setOpenMobile } = useSidebar();
  const isOnUtilityPage = useLocation({
    select: (location) => isSidebarUtilityPage(location.pathname),
  });
  const pullRequestsSupported = usePullRequestsSupported();
  const [moreOpen, setMoreOpen] = useState(false);
  useMemoryProposalNotification();
  const issuesSupported = useIssuesSupported();
  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  const handlePullRequestsClick = () => {
    closeMobileSidebar();
    void navigate({
      to: "/pull-requests",
      search: readPullRequestListPreferences(),
    });
  };
  const handleIssuesClick = () => {
    closeMobileSidebar();
    void navigate({ to: "/issues", search: readIssueListPreferences() });
  };
  const handleSettingsClick = () => {
    closeMobileSidebar();
    void navigate({ to: "/settings" });
  };
  const handleUsageClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
    void navigate({ to: "/usage" });
  };
  const handleBackClick = () => {
    closeMobileSidebar();
    void navigateToMainApp();
  };
  return (
    <SidebarMenu data-sidebar-footer-actions="" className="flex-row flex-wrap items-center">
      {isOnUtilityPage ? (
        <SidebarMenuItem className="min-w-0 flex-1">
          <SidebarMenuButton size="footer" onClick={handleBackClick}>
            <ArrowLeftIcon />
            <span>
              <T>Back</T>
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ) : (
        <>
          <SidebarMenuItem className="flex min-w-0 flex-1 items-center">
            <SidebarMenuButton
              size="footer"
              className="min-w-0 flex-1"
              onClick={handleSettingsClick}
            >
              <SettingsIcon />
              <span>{gt("Settings")}</span>
            </SidebarMenuButton>
            {archiveSlot ? (
              <SidebarMenu className="ms-1 w-auto shrink-0">{archiveSlot}</SidebarMenu>
            ) : (
              <SidebarMenuButton
                aria-label={gt("Archived threads")}
                size="footer-icon"
                className="ms-1 shrink-0"
                onClick={() => {
                  closeMobileSidebar();
                  void navigate({ to: "/settings/archived" });
                }}
              >
                <ArchiveIcon />
              </SidebarMenuButton>
            )}
            <Popover open={moreOpen} onOpenChange={setMoreOpen}>
              <PopoverTrigger
                render={
                  <SidebarMenuButton
                    aria-label={gt("More actions")}
                    size="footer-icon"
                    className="ms-1 shrink-0"
                  />
                }
              >
                <EllipsisIcon />
              </PopoverTrigger>
              <PopoverPopup side="top" align="start" width="sm" padding="compact">
                <PopoverTitle>
                  <T>More actions</T>
                </PopoverTitle>
                <div className="mt-2 flex flex-col items-stretch gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setMoreOpen(false);
                      openRecentWork();
                    }}
                  >
                    <T>Recent and saved for later</T>
                  </Button>
                  {pullRequestsSupported ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setMoreOpen(false);
                        handlePullRequestsClick();
                      }}
                    >
                      <T>Pull Requests</T>
                    </Button>
                  ) : null}
                  {issuesSupported ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setMoreOpen(false);
                        handleIssuesClick();
                      }}
                    >
                      {gt("Issues", { $context: "sidebar link to the list of issues" })}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setMoreOpen(false);
                      handleUsageClick();
                    }}
                  >
                    {gt("Usage")}
                  </Button>
                </div>
              </PopoverPopup>
            </Popover>
          </SidebarMenuItem>
        </>
      )}
      <SidebarUpdatePill />
    </SidebarMenu>
  );
});

export const SidebarChromeFooter = memo(function SidebarChromeFooter({
  archiveSlot,
}: {
  archiveSlot?: ReactNode;
}) {
  return (
    <SidebarFooter>
      <SidebarProviderUpdatePill />
      <SidebarUpdateArchitectureWarning />
      <SidebarMenu>
        <SidebarThreadUndoNotice />
      </SidebarMenu>
      <SidebarUtilityMenu archiveSlot={archiveSlot} />
    </SidebarFooter>
  );
});
