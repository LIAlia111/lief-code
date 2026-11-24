import { RefreshIcon } from "~/components/ui/refresh-icon";
import { scopeProjectRef } from "@lief/client-runtime/environment";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { T } from "gt-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { WorkspaceEmptyTask } from "../components/chat/WorkspaceEmptyTask";
import { useWorkspaceMode } from "../components/chat/WorkspaceModeSwitch";
import { NoProjectsHero } from "../components/NoProjectsHero";
import { sortScopedProjectsForSidebar } from "../components/Sidebar.logic";
import { Button } from "../components/ui/button";
import { HostedEmptyState } from "../components/HostedEmptyState";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "../components/ui/empty";
import { useNewThreadHandler } from "../hooks/useHandleNewThread";
import {
  readProject,
  useAllEnvironmentShellsBootstrapped,
  useProjects,
  useVisibleThreadShells,
} from "../state/entities";
import { useEnvironments } from "../state/environments";

function ChatIndexRouteView() {
  const { authGateState } = Route.useRouteContext();
  const { environments, isReady } = useEnvironments();

  if (authGateState.status === "hosted-static") {
    if (!isReady) return <WorkspaceEmptyTask />;
    if (environments.length === 0) return <HostedEmptyState />;
  }

  return <IndexDraftLanding />;
}

function IndexDraftLanding() {
  const projects = useProjects();
  const threads = useVisibleThreadShells();
  const bootstrapped = useAllEnvironmentShellsBootstrapped();
  const handleNewThread = useNewThreadHandler();
  const [workspaceMode] = useWorkspaceMode();
  const router = useRouter();
  // Read at effect time; this page can stay mounted while the router is already navigating away.
  const isStillOnIndex = useEffectEvent(() => router.state.location.pathname === "/");
  const startedAttemptRef = useRef<number | null>(null);
  const [startState, setStartState] = useState({ failed: false, retryRequest: 0 });

  const mostRecentProject =
    sortScopedProjectsForSidebar(
      projects.filter((project) => project.archivedAt == null),
      threads,
      "updated_at",
    )[0] ?? null;
  const attempt = startState.retryRequest;

  // oxlint-disable-next-line lief/no-unreasoned-state-sync -- starts a draft thread in the most recent project and navigates to it while still on the index
  useEffect(() => {
    // Starting a draft after the user has left would replace the page they picked.
    if (
      workspaceMode !== "task" ||
      mostRecentProject === null ||
      startedAttemptRef.current === attempt ||
      !isStillOnIndex()
    ) {
      return;
    }
    const projectRef = scopeProjectRef(mostRecentProject.environmentId, mostRecentProject.id);
    if (readProject(projectRef) === null) {
      return;
    }
    startedAttemptRef.current = attempt;
    void handleNewThread(projectRef, { replace: true })
      .then((opened) => {
        if (opened === null) {
          setStartState((state) => ({ ...state, retryRequest: state.retryRequest + 1 }));
        }
      })
      .catch(() => {
        setStartState((state) => ({ ...state, failed: true }));
      });
  }, [attempt, handleNewThread, mostRecentProject, workspaceMode]);

  return (
    <WorkspaceEmptyTask
      environment={
        mostRecentProject ? (
          <>
            <div>{mostRecentProject.title}</div>
            <div className="break-all text-xs text-muted-foreground">
              {mostRecentProject.workspaceRoot}
            </div>
          </>
        ) : undefined
      }
    >
      {mostRecentProject !== null ? (
        startState.failed ? (
          <DraftStartError
            onRetry={() => {
              setStartState((state) => ({
                failed: false,
                retryRequest: state.retryRequest + 1,
              }));
            }}
          />
        ) : null
      ) : bootstrapped ? (
        <NoProjectsHero inWorkspace />
      ) : null}
    </WorkspaceEmptyTask>
  );
}

function DraftStartError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <Empty className="flex-1">
      <EmptyHeader className="max-w-md">
        <EmptyTitle>
          <T>Couldn’t start a new thread</T>
        </EmptyTitle>
        <EmptyDescription>
          <T>The project is still available. Try opening the draft again.</T>
        </EmptyDescription>
        <div className="mt-5 flex justify-center">
          <Button size="sm" onClick={onRetry}>
            <RefreshIcon size="md" />
            <T>Try again</T>
          </Button>
        </div>
      </EmptyHeader>
    </Empty>
  );
}

export const Route = createFileRoute("/_chat/")({
  component: ChatIndexRouteView,
});
