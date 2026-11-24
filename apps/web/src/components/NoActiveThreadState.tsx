import { T } from "gt-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "./ui/empty";
import { WorkspaceEmptyTask } from "./chat/WorkspaceEmptyTask";

export function NoActiveThreadState() {
  return (
    <WorkspaceEmptyTask insideThread>
      <Empty className="flex-1">
        <div className="w-full max-w-lg px-8 py-12">
          <EmptyHeader className="max-w-none">
            <EmptyTitle>
              <T>Pick a thread to continue</T>
            </EmptyTitle>
            <EmptyDescription>
              <T>Select an existing thread or create a new one to get started.</T>
            </EmptyDescription>
          </EmptyHeader>
        </div>
      </Empty>
    </WorkspaceEmptyTask>
  );
}
