import { VoiceTranscriptionDestination } from "@lief/contracts";
import * as Schema from "effect/Schema";
import {
  readLocalStorageValue,
  useLocalStorage,
  writeLocalStorageValue,
} from "../hooks/useLocalStorage";
import { randomUUID } from "../lib/utils";

// Separate keys: a stale window saving ordinary preferences must not restore either grant.
const AUDIO_KEY = "lief:voice-audio-grant:v1";
const CLEANUP_KEY = "lief:voice-cleanup-grant:v1";
// "device" is Apple Speech in the macOS desktop app. Audio stays on this device, so it stays out of the shared contract.
const AudioDestination = Schema.Union([
  VoiceTranscriptionDestination,
  Schema.Struct({ kind: Schema.Literal("device") }),
]);
export type AudioDestination = typeof AudioDestination.Type;
const Grant = Schema.Struct({ id: Schema.String, destination: AudioDestination });
const AudioGrant = Schema.NullOr(Grant);
const sameGrant = Schema.toEquivalence(AudioGrant);
const SavedChoice = Schema.Union([AudioGrant, Schema.Literal("off")]);
const AudioChoice = SavedChoice;
type AudioChoice = typeof AudioChoice.Type;
const CleanupGrant = Schema.NullOr(Schema.String);
const decodeChoice = Schema.decodeSync(Schema.fromJsonString(AudioChoice));

export function useAudioChoice() {
  return useLocalStorage(AUDIO_KEY, null, AudioChoice)[0];
}

export function chooseAudioDestination(destination: AudioDestination | null) {
  writeLocalStorageValue(
    AUDIO_KEY,
    destination ? { id: randomUUID(), destination } : "off",
    null,
    AudioChoice,
  );
}

// Bind this recording to this act of consent, even if the user later reselects the same destination.
export function bindAudioGrant(id: string) {
  try {
    let cachedRaw: string | null = null;
    let choice: AudioChoice = null;
    const current = () => {
      const raw = window.localStorage.getItem(AUDIO_KEY);
      if (raw !== cachedRaw) {
        choice = raw ? decodeChoice(raw) : null;
        cachedRaw = raw;
      }
      const active = choice;
      return active === "off" ? null : active;
    };
    const bound = current();
    if (bound?.id !== id) return () => false;
    return () => {
      try {
        return sameGrant(current(), bound);
      } catch {
        return false;
      }
    };
  } catch {
    return () => false;
  }
}

export function useCleanupGrant() {
  return useLocalStorage(CLEANUP_KEY, null, CleanupGrant)[0];
}
export function readCleanupGrant() {
  return readLocalStorageValue(CLEANUP_KEY, null, CleanupGrant);
}
export function chooseTranscriptCleanup(enabled: boolean) {
  writeLocalStorageValue(CLEANUP_KEY, enabled ? randomUUID() : null, null, CleanupGrant);
}
