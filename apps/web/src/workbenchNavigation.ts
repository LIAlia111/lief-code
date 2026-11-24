const RESUME_EVENT = "lief:open-recent-work";

export function openRecentWork() {
  window.dispatchEvent(new Event(RESUME_EVENT));
}

export function onOpenRecentWork(listener: () => void) {
  window.addEventListener(RESUME_EVENT, listener);
  return () => window.removeEventListener(RESUME_EVENT, listener);
}
