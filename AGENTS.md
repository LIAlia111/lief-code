# Lief.code

Lief.code is a desktop app (Windows is the tested platform) plus a local web UI for coding agents. A Node WebSocket server wraps provider CLIs and agents (Codex, Claude Code, Cursor, Grok, OpenCode, Antigravity, Kiro, Pi, Muse Code, fx) and serves the local web UI. The desktop app is Electron and bundles that server.

It runs on the machine that owns the workspace. There is no Lief-hosted account or relay, and no product analytics or crash-report service. The app can still make outbound requests for release, pricing, and provider-version data, and providers or optional integrations use their configured services; see [Diagnostics](docs/user/telemetry.md). There is no hosted website, marketing site, or mobile app. Other devices reach a running server over the local network, SSH, or Tailscale.

Source control in the product is GitHub. The maintainer is Lief.

Lief.code is a deeply customized fork. The upstream MIT notice is in the licenses directory.

You can think of Lief.code as a local, bring-your-own-subscription workspace for the provider CLIs you already run.

## What to keep intact

### Performance

Audit changes for performance regressions. Common causes are sending too much data over websockets, CSS animations that spike the GPU, and lists that are hard to render. Make sure a change considers that cost.

### Local first

New features have to work with the desktop app and the local web UI, including when a browser on another machine connects over the LAN, SSH, or Tailscale. Do not add a hosted origin, a cloud account, or a tunnel product.

### Two surfaces

**Desktop** is the primary install. It is an Electron app that bundles the server.

**Web** is the same UI, served by the local `lief` server or by `vp run dev`. The desktop window loads that UI and adds an Electron shell and IPC.

Shared client logic lives in `packages/client-runtime`. There is no React Native client in this repo.

## Design principles

Prefer ambitious ideas, simple systems, and software that feels obvious. Do not preserve complexity just because it already exists. Do not introduce machinery because it looks architecturally impressive. Understand the real constraint, then fight for the smallest model that makes the correct behavior unsurprising.

Channel both "measure twice, cut once" and "yagni". Fight scope creep. Try to honor the intent in both a minimal and realistic fashion.

The rest of this document helps you navigate the codebase and make changes. Treat these instructions as good defaults. The maintainer's preferences override them.

Be careful with the machine you are running on. Do not kill unrelated dev servers, and do not write the live Lief home. See the three ways to hurt yourself.

## A small glossary

Use this language:

- **you** means the agent reading this file and changing Lief.code.
- **maintainer** means Lief, the person maintaining this fork.
- **user** means the person using Lief.code to direct coding agents.
- **agent** means the coding agent a user runs inside Lief.code. Depending on context, that may also include you.
- **provider** means the agent runtime or harness Lief.code talks to, such as Codex, Claude, Cursor, or OpenCode.
- **client** means the local web UI or the desktop app that wraps it.
- **environment** means one running Lief server and the machine, filesystem, provider credentials, and state it owns.
- **project** means an environment-local workspace record rooted at a directory.
- **thread** means the durable conversation and work history for a project.
- **turn** means one user-to-agent cycle, including follow-up work such as checkpointing.
- **Lief home** means the base data directory. Runtime state normally lives below its userdata directory.

## The three ways to hurt yourself

1. **Killing by pattern.** Never `pkill -f`, `pgrep | kill`, or `kill` a PID you found by matching a name, path, or worktree string. Your own agent process has this worktree's path in its argv, and this machine runs several other dev servers at once. Kill only a PID you captured at spawn, or the owner of your port from `ss -H -ltnp` after confirming `/proc/<pid>/cwd` is your worktree.
2. **Writing to the live install.** `~/.lief/userdata` is the real Lief.code database, in use while you work. Reading it and copying from it are fine, and a good way to get real test data (see Test data). Never start a server against it, never open it read-write, never clean it up.
3. **Baking in origins.** Never set `VITE_HTTP_URL` or `VITE_WS_URL` for dev. Dev is single-origin and Vite proxies `/api`, `/ws`, `/oauth`, and `/.well-known`. Setting them bakes localhost into the bundle and silently breaks every remote browser.

## Hit every surface

The most common defect in this repo is a change that works on the path you tested and is missing everywhere else. Before calling frontend work done, walk this list and say which entries applied:

- **Entry points.** A behavior reachable from the chat view is usually also reachable from Settings, the command palette, and a keybinding. Fixing one is not fixing the feature.
- **Clients.** Web, and desktop (wraps web, adds Electron shell/IPC). Shared logic lives in `packages/client-runtime`.
- **Providers.** Codex, Claude, Cursor, Grok, OpenCode, Antigravity, Kiro, Pi, Muse Code, fx, and ACP Registry each have an adapter. Provider-shaped features need a decision per adapter, even if the decision is "not supported here".
- **Agents.** A capability a user can trigger is usually one an agent should reach through MCP tools, and scheduled tasks run the same paths. That only works when it is a service method, not handler code.
- **Contracts.** Anything crossing the wire is typed in `packages/contracts`. Change the schema and the server, web, and desktop all follow.
- **Reverse states.** If you added a way in, add the way out and the way to see it. Snooze needs unsnooze. Close needs reopen. A one-way door is a bug.
- **Connection modes.** Localhost, LAN, SSH, and Tailscale behave differently. Multi-environment cases are real. There is no Lief-hosted relay.
- **Languages.** User-facing text ships in every locale. From `apps/web`, run `vp run i18n:generate`, then translate new keys in `apps/web/src/i18n/translations`. Desktop catalogs live in `apps/desktop/src/i18n/translations` and regenerate with `vp run i18n:generate` in `apps/desktop`. `vp run i18n:check` from the repo root gates the catalogs.
- **Docs.** Check whether the change makes existing guidance inaccurate. Apply the [documentation rules](#documentation) before adding anything.

## Dev servers

- `vp i` installs. Worktrees get this from the lief.json setup script; if module resolution looks broken, it probably did not run.
- Setup runs in the background. While `.lief/setup-running` names a live PID, wait for it and do not run `vp i`. It ends with `.lief/setup-done` or `.lief/setup-failed` (with the error tail). With no marker at all, setup never ran here, so run `vp i` yourself.
- `vp run dev` starts server and web. In a worktree, state defaults to that worktree's gitignored `.lief`, which deliberately outranks an ambient `LIEF_HOME` so you cannot land on shared state by accident. An explicit `--home-dir` still wins. A plain `git clone` is not a worktree: it shares `~/.lief/dev` with the main checkout and is not seeded. To isolate one, run `vp run migrate-dev-db --base-dir <clone>/.lief`, then `vp run dev --home-dir <clone>/.lief`.
- `vp run dev:desktop` starts the Electron client. `dev:server` and `dev:web` start those processes separately.
- Ports derive from the worktree path and are stable across restarts, but read the real ones from the `[dev-runner]` line since occupied ports shift.
- Sharing over the tailnet is three steps: run `vp run dev --share` in the background, wait for the `pairingUrl:` line in its output, then give that full URL to an unpaired browser. Do not wire up `tailscale serve` by hand, open the URL yourself, or consume the pairing link. A browser with the reusable dev cookie can use the bare origin. If a normal one-time token was consumed, mint a fresh one with `node apps/server/src/bin.ts pair`. It carries standard scopes, while the startup URL carries admin scopes needed for Connections settings.
- To reuse web dev auth across worktrees, configure one fixed `LIEF_DEV_AUTH_TOKEN` in the main checkout's gitignored `.env`. The `lief.json` setup links that file into worktrees. Never commit or publish the token or a startup URL. See [Reusable dev credential](docs/operations/development.md#reusable-dev-credential).
- Stop what you started, by the PID you tracked. See rule 1. `vp` does not pass SIGTERM on, so signalling the `vp run dev` PID alone leaves Vite and the server running. Stop the background task with your harness's own stop, which ends the whole tree.
- Run dev servers and builds from your own shell so they end with your session. Do not detach them with `systemd-run`, `nohup`, `setsid`, or `tmux` unless the user asks for one that outlives the session. Detached servers ran for weeks and filled RAM and swap. The dev runner stops itself above `--memory-limit-gb` (half of RAM, at most 16 GiB) on Linux.
- Need a second checkout? `git worktree add` it next to this worktree, not in `/tmp`. Remove it when done.

## Test data

An empty database is a bad test. Seed your worktree's `.lief` with a copy of real data instead of pointing at live state:

- The first `vp run dev` in a worktree does this for you when its database is missing and the source is at most 500 MiB. Larger sources warn and dev starts with an empty database. `--no-seed` or `LIEF_DEV_SEED=0` skips seeding. Manual migration still accepts larger sources and may use substantial disk space before pruning.
- Run `vp run migrate-dev-db` with your dev server stopped to refresh. It rebuilds `<worktree>/.lief/userdata/statev2.sqlite` from a read-only snapshot of `~/.lief/userdata/statev2.sqlite`. It keeps recent projects and their stopped threads, and drops scheduled tasks, pending work, auth sessions, and links to other environments, so your dev server never runs those agents or reaches other machines. Raise `--projects` and `--threads-per-project` for more data.
- Refresh `statev2.sqlite`, not `state.sqlite`. The server copies the V1 `state.sqlite` only when `statev2.sqlite` is missing.
- Bring `secrets` and `settings.json` only if the flow under test needs them.
- Copy in, never symlink. Data flows one way: into your sandbox, never back out.

## Verifying

- Before you push, run `vp run check:changed`. It runs CI's fast checks for changed files: format, lint, knip, typecheck of affected packages and dependents, tests beside changes, and the cross-file checks those miss. CI still runs the full test suites. See [Checks](docs/operations/development.md#checks).
- While you iterate, run `vp test run <files>`. For big files, add `-t "<name>"`.
- Use `vp run typecheck`; it caches per package. Each package runs `effect-tsgo tsrs --noEmit`, the Rust TypeScript 7 checker with Effect's diagnostics built in. There is no `typescript` package to run.
- Run `node -e` snippets from `apps/server` or the owning package. `effect` does not resolve from the repo root.
- Test behavior that can break, such as orchestration and event-sourcing, provider protocol translation, auth and permission guards, persistence and migrations, external-format parsing, race fixes, and the logic a bug fix changed. Leave out tests for what types already guarantee, trivial logic, copy text, smoke runs, mock-call mirrors, callback wiring, and props rendered to static markup.
- Extend before you add. When an existing test or table covers the behavior, add a row or an assertion there. Write a new `it` only when no case fits.
- Test at one layer: the lowest one that fails on `main`. Do not repeat the case in a wrapper test or at each call site.
- Write a browser test only for behavior that needs a real browser: layout and scrolling, focus and pointer input, real workers, or a component wired to its hooks. Logic a component calls gets a unit test beside it (`*.logic.test.ts`). A browser test file spends seconds in CI loading its module graph before its first test runs; a unit test takes milliseconds.
- [Testing](docs/internals/testing.md) carries these same test rules, plus review guidance. Change both together.
- **Do not run repo-wide checks.** No `vp check`, no `vp run -r test`, no `vp run -r typecheck` unless asked. CI owns the full suite.
- Backend behavior changes ship with focused tests for that behavior.
- Proof for a bug fix depends on the bug. Logic, data, state, and protocol bugs get a failing test first (the fewest that fail on `main` for that reason, in an existing case of the module's test file where one fits), then the fix. Purely visual bugs (spacing, colour, alignment, a layout shift) get before/after captures as their proof and no test: do not add UI tests for nitpicks, and do not ask for one in review when a capture already shows it. A server-only fix with no visible surface ships the test plus a short runtime transcript. For a bug a user can reproduce in the web client, `vp run scenarios:prove` shows it failing on base and passing on the fix in the real app; see [Scenarios](docs/operations/scenarios.md).
- The server is event-sourced, and side effects run after the command commits. In tests, drain the effect worker (`OrchestrationEffectWorkerV2.drain`) or await the specific persisted event or `Deferred` that marks the milestone. Never wait on sleeps or polling. A test that needs a timeout to pass is wrong. Concretely:
  - `it.effect` runs on a `TestClock`; `Effect.sleep` only advances through `TestClock.adjust`. `it.live` is wall-clock and only for subprocess or network fixtures.
  - No `yieldNow` or `sleep` polling loops. Await the `Deferred`, take from the `Queue`, or drain the worker.
  - No per-test timeout argument or `retry`. The project timeout is the ceiling, and flaky tests are fixed, not retried.
  - No `performance.now()` or `Date.now()` deltas. Assert on events and counts, not elapsed time.
  - Browser tests assert through `expect.element` or `vi.waitFor`, never `requestAnimationFrame` or `transitionend`.
  - `vi.mock` factories must not spread a real module that pulls in Shiki or the diff workers.
  - `it.skip` and friends need a tracking issue on the line above: `// quarantine: #1234 <why>`.
  - Lint enforces this: `lief/no-test-timeout-or-unreasoned-skip`, `lief/no-frame-waits-in-browser-tests`, `lief/no-wall-clock-in-tests`, `lief/no-real-time-wait-in-tests`, `lief/no-polling-loop-in-tests`.
- Web browser tests are `*.browser.test.tsx` or `*.browser.test.ts` and render with `await using screen = await render(...)` from `apps/web/test/render.tsx`. `lief/require-disposable-render` errors on the old patterns.
  - Acquire what the test drives after mounting (fake timers it advances, spies it sets up after mounting) after the render, so it disposes before the unmount. Anything the first render reads comes before it.
  - A helper that renders and then waits or clicks puts the screen in an `AsyncDisposableStack` and `move()`s it out only on success, so a failed wait still unmounts.
  - `rerender` needs a fresh element on every call.
  - No lifecycle hooks and no module-level mutable state. Shared mock state that `vi.mock` factories read is reset by a `setup()` call at the top of the test.
  - `router` is on by default. Pass `router: false` only with a one-line comment saying why.

  ```tsx
  it("saves on Enter", async () => {
    const onSave = vi.fn();
    using _now = vi.spyOn(Date, "now").mockReturnValue(0);
    await using screen = await render(<TitleEditor onSave={onSave} />, { router: "/threads/1" });
    await userEvent.type(screen.getByRole("textbox"), "Title{Enter}");
    expect(onSave).toHaveBeenCalledWith("Title");
  });
  ```

- User-visible frontend changes should get one integrated pass in the local web UI or the desktop app after the change is integrated. Do not start a second dev server for that pass if one is already running for this worktree.

- Real agent turns cost money. To watch a turn stream through the pipeline and UI, use the free `Replay (dev)` provider that `vp run dev` registers. See [Replay provider](docs/operations/development.md#replay-provider). Use a real provider only when the change depends on that provider's behavior, and then pick its cheapest model, such as Haiku for Claude or Luna for Codex.

## Pull requests

- Never make a PR unless the maintainer explicitly asks you to do so.
- The forge for this repo is GitHub: `https://github.com/LIAlia111/lief-code`.
- Conventional commit titles, plain language: `fix(web): new threads no longer spike CPU`.
- Body: the problem in a sentence or two, then how you fixed it.
- UI changes need before/after images. Motion or timing needs a short video.
- Upload PR evidence to GitHub. Never commit PR-only screenshots or assets such as `.github/pr-assets/`.
- One request is one PR. Split it only when the maintainer asks. Outside contributions follow [CONTRIBUTING.md](CONTRIBUTING.md).

## Documentation

Most code changes do not need an internal documentation change. Agents can read the code.

- `docs/internals/` is for architectural decisions and their reasons, constraints that span components, and implementation traps that are hard to discover from the source. Before adding a paragraph, ask what a maintainer would get wrong without it. If reading the relevant code answers the question, leave it out.
- Do not document every feature, enumerate fields or methods, narrate control flow, maintain file catalogs, or append PR summaries. Types, tests, and code already record the implementation. The glossary defines shared vocabulary; it is not a feature index.
- A local reason the code can't show goes in a short nearby code comment. Use an internal doc when the reasoning crosses boundaries or needs context the code cannot carry well. Link to the relevant source instead of copying it.
- When a documented decision or constraint changes, rewrite or remove the affected text. Do not append another account of the new behavior. A new internal page needs a distinct, durable reason to exist.
- `docs/user/` helps users accomplish tasks. Give each major feature a concise section explaining what it does, how to start, and anything unintuitive. A settings path is useful; descriptions of visible buttons, icons, layouts, animations, or every UI state are not. Before adding text, ask what task or decision it helps the user with.
- Keep user docs in the shipped product's voice, without implementation details or contributor tooling. Update the relevant feature section when how to use it changes. A UI tweak does not need a documentation entry, and a new control does not need its own page.
- Do not document a hosted site, a mobile app, a Lief-hosted account or relay, or product analytics. This edition does not ship them. Describe external requests accurately; see [Diagnostics](docs/user/telemetry.md).
- `docs/operations/` holds maintainer setup, release, and debugging procedures. Keep instructions for operating an installed Lief.code server in the user guides.

## Plans and work artifacts

- Do not commit implementation plans, research notes, or agent scratch files. Keep temporary working material outside the worktree. `.plans/` is gitignored only as a safety net for legacy tooling.
- Track active maintainer work in the GitHub issue that owns it. External proposals follow `CONTRIBUTING.md`.
- A merged PR is the implementation record. Close or update its tracking item when the work lands; do not preserve a second checklist in the repository.

## How it works

Clients send typed WebSocket requests. The server turns them into _commands_. The _orchestrator_ (`apps/server/src/orchestration-v2/Orchestrator.ts`) serializes commands and decides _events_ without doing any I/O. The _event sink_ commits those events, the _projections_ the UI reads, the _command receipt_, and _outbox_ effects in one transaction. The _effect worker_ then runs the effects, such as starting a provider turn or capturing a checkpoint, and feeds results back as commands. Provider CLIs run as subprocesses; per-provider _adapters_ translate their native protocols into orchestration events. Each turn ends with a _checkpoint_, a hidden git ref, so the app can diff and restore.

Architecture and its constraints: `docs/internals/overview.md`. Glossary: `docs/internals/glossary.md`

## Where code lives

- `apps/server` - WebSocket, orchestration, providers, checkpointing. Effect-heavy: read [Effect services](docs/internals/effect-services.md) before adding server code, and `.repos/effect/LLMS.md` for the Effect library itself.
- `apps/web` - React/Vite UI. `apps/desktop` wraps it.
- `packages/contracts` - Effect/Schema contracts plus small derived helpers. No heavy runtime logic.
- `packages/shared` - shared runtime utils, subpath exports, no barrel.
- `packages/client-runtime` - client code shared by the web UI. The desktop app uses that UI.
- `.repos/` - optional read-only upstream references, not committed. Fetch them with `vp run sync:repos`. Never edit or import from them.

## Taste

- Complexity belongs at the adapter boundary. Orchestration stays pure, UI stays dumb.
- Client mutations use `createEnvironmentRpcCommand`. Add protected methods to `CLIENT_GUARDED_RPC_SCOPES` in `packages/contracts/src/clientRpcPermissions.ts` and use the command's `permissionAtom` for UI availability. Grants are checked at execution against the destination environment; the server remains authoritative. Keep raw RPC clients inside `rpc/`, and extend the permission behavior tests when adding a protected method.
- Server features are services; transports stay thin. A `ws.ts` RPC handler, HTTP route, or MCP tool decodes input, calls one service method, and maps errors. See [Effect services](docs/internals/effect-services.md).
- `apps/web/src/components/ui` exports own their look. Pick a `variant` or `size`; do not restyle one with `className`. If none fits and the look is a generic concept, add a variant to the component; a look that belongs to one feature stays in that feature's own component, not in `components/ui`. Layout classes (width, flex, margin, position) belong on the parent. `shadcn/no-restyle` fails lint on violations. See [Web UI](docs/internals/web-ui.md).
- Reusable Effect functions use `Effect.fn("Service.operation")` with a stable span name, not a
  function wrapping `Effect.gen`. Keep `Effect.gen` for inline programs and layer construction.
  Use `Effect.fnUntraced` only when spans would be too frequent (stream chunks, per-event
  projection, tight loops) or duplicate an existing tracing boundary; explain that choice nearby.
  Named `Effect.fn` creates a span; the unnamed form does not. Preserve existing span names and
  options, and pass combinators as additional function-builder arguments.
- Inferred types over annotations. `any` is the enemy.
- Default to no comment. Write one only for a constraint, an external quirk, or an invariant the code can't show, in one line where you can and four at most. Don't restate names or signatures, narrate steps, record history, or explain the fix you just made; the PR carries that. `lief/no-low-value-comments` enforces the length cap and the mechanical cases.
- React effects are for synchronizing with something outside React. Derive in render and act in handlers instead of syncing state, but don't hide real lifecycle work in refs or stores to dodge one. The `lief/no-unreasoned-state-sync` lint rule reports every effect; one that stays states its reason with `// oxlint-disable-next-line lief/no-unreasoned-state-sync -- <why>`.
- People who drive agents all day notice a dropped frame, a lying spinner, and a stale label. No continuously repainting animations; they peg the GPU on high-refresh displays.
- If a rule here fights the task in front of you, say so and get a human sign-off before breaking it.

## Additional tips

- Security is important, but should not be over-indexed on, especially for dev mode and maintainer-only features.
- Before a security audit or triaging a vulnerability report, read [SECURITY.md](SECURITY.md) for how to report an issue. The trust model is local: the person who can start the server can read its home directory.
