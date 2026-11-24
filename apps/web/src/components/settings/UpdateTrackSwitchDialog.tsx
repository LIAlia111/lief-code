import type { DesktopUpdateChannel } from "@lief/contracts";
import { T, useGT, useMessages, Var } from "gt-react";
import { useState } from "react";
import { channelSwitchLabel } from "../sidebar/updateEverything.logic";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";

export function UpdateTrackSwitchDialog({
  channel,
  onClose,
}: {
  readonly channel: DesktopUpdateChannel;
  readonly onClose: () => void;
}) {
  const gt = useGT();
  const messages = useMessages();
  const label = channelSwitchLabel(channel, messages);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changeChannel = async () => {
    const bridge = window.desktopBridge;
    if (!bridge) return;
    setPending(true);
    setError(null);
    try {
      await bridge.setUpdateChannel(channel);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : gt("The update track did not change."));
    }
    setPending(false);
  };
  return (
    <AlertDialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <T>
              Switch to <Var>{label}</Var>
            </T>
          </AlertDialogTitle>
          <AlertDialogDescription>{gt("Switches this app’s update track.")}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogClose disabled={pending} render={<Button variant="outline" />}>
            <T>Cancel</T>
          </AlertDialogClose>
          <Button disabled={pending} onClick={() => void changeChannel()}>
            {gt("Switch to {label}", { label })}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
