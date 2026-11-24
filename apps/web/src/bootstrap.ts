// Shared dev chunks need the React refresh preamble first. Catch failures before React mounts.
void import("./main")
  .then(({ startup }) => startup)
  .catch(async (error: unknown) => {
    try {
      const { showBootError } = await import("./lib/bootError");
      await showBootError(error);
    } catch {
      const fallback = document.getElementById("boot-shell-fallback");
      if (fallback) {
        const card = document.getElementById("boot-shell-card");
        if (card) card.hidden = true;
        fallback.hidden = false;
      }
    }
  });
