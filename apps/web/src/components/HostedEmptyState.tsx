import { Link } from "@tanstack/react-router";
import { T } from "gt-react";
import { type ReactNode } from "react";

import { DESKTOP_DOWNLOAD_URL } from "~/branding";
import { isLocalEnvironmentDisabled } from "../localEnvironment";
import { InstallLiefCommands } from "./InstallLiefCommands";
import { Button } from "./ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "./ui/empty";
import { WorkspaceEmptyTask } from "./chat/WorkspaceEmptyTask";

/** Home screen before a computer is added. */
export function HostedEmptyState() {
  const localEnvironmentOff = isLocalEnvironmentDisabled();

  return (
    <WorkspaceEmptyTask>
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyTitle>
            {localEnvironmentOff ? <T>This computer is off</T> : <T>No computer connected</T>}
          </EmptyTitle>
          <EmptyDescription>
            {localEnvironmentOff ? (
              <T>Turn it back on, or connect a different computer.</T>
            ) : (
              <T>Your agents run on your computer. Start Lief.code there first.</T>
            )}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {localEnvironmentOff ? (
            <Button render={<Link to="/settings/connections" />} size="sm">
              <T>Open Environments</T>
            </Button>
          ) : (
            <ol className="w-full space-y-4 text-left">
              <PairingSteps />
            </ol>
          )}
        </EmptyContent>
      </Empty>
    </WorkspaceEmptyTask>
  );
}

function PairingSteps() {
  return (
    <>
      <SetupStep number={1}>
        <RunOnComputer command="lief pair" />
      </SetupStep>
      <SetupStep number={2}>
        <Button render={<Link to="/settings/connections" />} size="sm">
          <T>Add pairing link</T>
        </Button>
      </SetupStep>
    </>
  );
}

function SetupStep({
  number,
  children,
}: {
  readonly number: number;
  readonly children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="w-2 shrink-0 pt-1 text-muted-foreground">{number}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

function RunOnComputer({ command }: { readonly command: string }) {
  return (
    <>
      <p>
        <T>Run on your computer:</T>
      </p>
      <InstallLiefCommands command={command} className="mt-2" />
      <a
        className="mt-2 inline-block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        href={DESKTOP_DOWNLOAD_URL}
        target="_blank"
        rel="noreferrer noopener"
      >
        <T>Or download the desktop app</T>
      </a>
    </>
  );
}
