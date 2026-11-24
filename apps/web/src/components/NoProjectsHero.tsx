import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useUiText } from "~/i18n/useUiText";
import { T, useGT } from "gt-react";
import { MessageSquareDashedIcon, PlusIcon } from "~/components/icons";

import { openCommandPalette } from "../commandPaletteBus";
import { useScratchProject } from "../hooks/useScratchProject";
import { usePrimaryEnvironmentId } from "../state/environments";
import { Button } from "./ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "./ui/empty";
import { WorkspaceEmptyTask } from "./chat/WorkspaceEmptyTask";

export function NoProjectsHero({ inWorkspace = false }: { inWorkspace?: boolean }) {
  const gt = useGT();
  const text = useUiText();
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const { scratchEnvironmentId, startScratchThread } = useScratchProject();
  const scratchTargetEnvironmentId = scratchEnvironmentId(primaryEnvironmentId);

  const content = (
    <Empty size="hero" className="flex-1">
      <div className="w-full max-w-xl px-3 py-6">
        <EmptyHeader className="max-w-none">
          <EmptyTitle>
            <T>What should we work on?</T>
          </EmptyTitle>
          <EmptyDescription>
            {scratchTargetEnvironmentId === null
              ? gt("Add a project to start your first thread.")
              : gt("Add a project, or start without one.")}
          </EmptyDescription>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button size="sm" onClick={() => openCommandPalette({ open: "add-project" })}>
              <PlusIcon className="size-4" />
              <T>Add project</T>
            </Button>
            {scratchTargetEnvironmentId === null ? null : (
              <Button
                size="sm"
                variant="outline"
                disabled={starting}
                onClick={async () => {
                  setStarting(true);
                  await startScratchThread(scratchTargetEnvironmentId).finally(() =>
                    setStarting(false),
                  );
                }}
              >
                <MessageSquareDashedIcon className="size-4" />
                {text(starting ? "Preparing a conversation…" : "Start without a project")}
              </Button>
            )}
          </div>
        </EmptyHeader>
        <div className="lief-start-grid mt-5 grid gap-2 text-left">
          {[
            [
              "Explain a codebase",
              "Open a folder and get a tour",
              "Explain how this codebase is organized.",
            ],
            [
              "Fix a bug",
              "Paste the error and trace its cause",
              "Help me find the cause of this error:",
            ],
            [
              "Write an article",
              "Give a topic and start with an outline",
              "Help me outline an article for this audience:",
            ],
          ].map(([title, description, prompt]) => (
            <button
              key={title}
              type="button"
              className="grid min-w-0 content-start gap-1 rounded-lg border border-border bg-transparent px-2.5 py-2 text-left outline-primary hover:bg-muted/50"
              onClick={() => void navigate({ to: "/new", search: { prompt: text(prompt!) } })}
            >
              <b className="text-xs font-medium">{text(title!)}</b>
              <span className="text-xs text-muted-foreground">{text(description!)}</span>
            </button>
          ))}
        </div>
      </div>
    </Empty>
  );
  return inWorkspace ? content : <WorkspaceEmptyTask>{content}</WorkspaceEmptyTask>;
}
