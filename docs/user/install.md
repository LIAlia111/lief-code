# Install Lief.code

Lief.code is a local Windows desktop app. Windows is the tested platform. Download the installer from GitHub Releases, or build it from source using the [maintainer release guide](../operations/release.md) and [development setup](../operations/development.md#first-checkout).

## Download for Windows

Download the `.exe` installer from [GitHub Releases](https://github.com/LIAlia111/lief-code/releases) and run it. The per-user installer installs under `%LOCALAPPDATA%\Programs\lief`. The release page contains the published installer and any update metadata attached to that release.

## Build from source

For a local Windows x64 build, follow [Release (local packaging)](../operations/release.md#build-the-windows-x64-installer). Source setup and development commands are in [Development](../operations/development.md#first-checkout).

### The `lief` command

The desktop app includes the `lief` command-line tool. A new install sets it up
on first launch; after an update, or any time, choose **Install** next to
**lief command** in **Settings → About**. On macOS and Linux it adds a `lief` link
in `~/.local/bin` (or `~/bin`); on Windows it adds the app's command folder to
your `PATH`. Open a new terminal afterwards. If the folder is not on your
`PATH`, **Add to PATH** on the Welcome page or in **Settings → About** adds one
line to your shell's startup file. **Remove** takes it off, and the app does not
add it again. If you already have another `lief`, it stays as it is.

### Windows Subsystem for Linux

Choose a WSL distro in **Settings → Sharing & access** to run agents and projects
there. Install the provider CLIs inside that distro. Lief.code installs its own
server runtime there automatically; the first launch after an app update can
take longer.

### Open a project from a terminal

With the desktop app already running on the same machine:

```bash
lief app
```

This opens a new thread for the current directory, adding the project if needed.
Pass a path, such as `lief app ../my-project`, to open another directory. It requires
the desktop app, so a standalone server or an SSH session is not enough. If the
command cannot reach the app, start or update the desktop app and try again.

### Drop a folder on the sidebar

Drag one or more folders from Finder, Explorer, or your file manager onto the
sidebar. Each one opens as a project on this computer, the same as `lief app`.
Files dropped on a thread still attach to that thread. Browsers do not share
folder paths, so in the web app use **Add project** instead.

## Providers

Open **Settings → Providers** in the web or desktop app, select the environment,
and enable the provider you want. Installation, login, and configuration belong
to that environment's machine, even when you connect from another computer.

| Provider    | Install and authenticate                                                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex       | [Connect with ChatGPT](./providers-codex.md#connect-with-chatgpt), or install [Codex CLI](https://developers.openai.com/codex/cli) and run `codex login`. |
| Claude      | Install [Claude Code](https://claude.com/product/claude-code), then run `claude auth login`.                                                              |
| Cursor      | Install [Cursor CLI](https://cursor.com/cli), then run `agent login`.                                                                                     |
| Grok Build  | Install [Grok Build CLI](https://x.ai/cli), then run `grok login`.                                                                                        |
| Kiro        | Install [Kiro CLI](https://kiro.dev/docs/cli/), then run `kiro-cli login`.                                                                                |
| OpenCode    | Install [OpenCode](https://opencode.ai), then run `opencode auth login`.                                                                                  |
| Antigravity | Install and sign in with Google from Lief.code's provider settings.                                                                                       |
| Pi          | Install [Pi](./providers-pi.md#set-up-pi) with Node.js 22.19 or newer, then run `pi` and `/login`.                                                        |
| Muse Code   | Install [Muse Code](https://dev.meta.ai/docs/muse-code) on the server, run `muse login`, then enable it in Settings → Providers.                          |
| fx          | Install [fx](https://fx.sh) with `curl -fsSL https://fx.sh/setup.sh \| bash`, then run `fx login`.                                                        |

Provider CLIs must be on the server's `PATH`. If Lief.code cannot find one, set its
**Binary path** in provider settings, especially when using a version manager.
Cursor's executable is `cursor-agent`, although its login command is
`agent login`. Codex connected through ChatGPT and Antigravity can use their
managed runtimes without a `PATH` entry.

Lief.code warns when a provider version has known compatibility problems with your
release. Check **Settings → Providers** on that environment for the recommended
version or range. When its package manager supports installing a specific version,
you can install the recommendation there. Otherwise use the provider's installer
on the environment's machine. An unlisted version is unverified.

When a provider CLI is behind its latest release, its provider card shows the
available version. **Update now** runs the installer that owns the CLI
(Homebrew, mise, or a global npm, pnpm, Yarn, Bun, Volta, or Vite+ install), or
the CLI's own update command when Lief.code cannot tell. Claude, Codex, and
OpenCode installs Lief.code cannot identify stay manual: update them through the
installer you used. Lief.code runs `mise upgrade`
only for a tool your mise config requests as `latest` when the provider's binary
path is a mise shim or under the tool's `installs/<tool>/latest` link; update a
pinned version, or a path into one version's directory, through mise yourself.
Update a CLI installed with Nix through Nix.
Cursor and Antigravity update with Lief.code. Homebrew and Chocolatey installs
compare against the version their package manager offers, which can trail the
npm release; update Claude installed with Chocolatey through Chocolatey.

The managed runtimes for Antigravity and for Codex connected through ChatGPT
first install the release Lief.code tested. When Lief.code finds a newer compatible
release, their setup in **Settings → Providers** offers an update.

Add another provider instance for a separate account or configuration. Each
instance can have its own environment variables, such as API keys or a custom
base URL. Mark secret values as sensitive; after saving, Lief.code does not display
their original values.

For provider-specific setup and accounts, see [Codex](./providers-codex.md),
[Claude](./providers-claude.md), [OpenCode](./providers-opencode.md),
[Antigravity](./providers-antigravity.md), [Kiro](./providers-kiro.md),
[Pi](./providers-pi.md), [Muse Code](./providers-muse.md), and [fx](./providers-fx.md).

### Provider check timeouts

If a provider works in its CLI but Lief.code reports a timeout while checking it,
allow more time in the Lief server's environment. For example, give Codex and
Claude readiness checks 60 seconds:

```bash
LIEF_CODEX_PROBE_TIMEOUT_MS=60000 LIEF_CLAUDE_PROBE_TIMEOUT_MS=60000 lief serve
```

For a remote environment, set these on the machine running the Lief server.
Keep them in your launcher or service configuration to retain them across
updates, then restart the server. For systemd, add
`Environment=LIEF_CODEX_PROBE_TIMEOUT_MS=60000` under `[Service]` in a service
override, reload systemd, and restart the service. Provider instances can also
set their own overrides in Settings → Providers.

Each variable extends that provider's readiness-probe deadlines; a phase whose
default is already longer keeps its default. Providers with several phases can
take longer than one deadline in total. Values must be whole milliseconds no
greater than 2147483647; unset or invalid values keep the defaults.

| Provider            | Environment variable                 |
| ------------------- | ------------------------------------ |
| Codex               | `LIEF_CODEX_PROBE_TIMEOUT_MS`        |
| Claude              | `LIEF_CLAUDE_PROBE_TIMEOUT_MS`       |
| Cursor              | `LIEF_CURSOR_PROBE_TIMEOUT_MS`       |
| Antigravity         | `LIEF_ANTIGRAVITY_PROBE_TIMEOUT_MS`  |
| Grok                | `LIEF_GROK_PROBE_TIMEOUT_MS`         |
| Kiro                | `LIEF_KIRO_PROBE_TIMEOUT_MS`         |
| fx                  | `LIEF_FX_PROBE_TIMEOUT_MS`           |
| Pi                  | `LIEF_PI_PROBE_TIMEOUT_MS`           |
| Muse Code           | `LIEF_MUSE_PROBE_TIMEOUT_MS`         |
| OpenCode            | `LIEF_OPENCODE_PROBE_TIMEOUT_MS`     |
| ACP Registry agents | `LIEF_ACP_REGISTRY_PROBE_TIMEOUT_MS` |

Longer deadlines also take longer to report a stalled check. These overrides
cover readiness and discovery, including OpenCode server startup. Usage and
config enrichment retain their own shorter limits. Turn execution, package
installation, update checks, and shutdown limits keep their existing behavior.

## Next steps

- [Working with threads](./thread-sidebar.md): start tasks and organize parallel work.
- [Permission modes](./permission-modes.md): choose when agents ask before acting.
- [Remote access](./remote-access.md): connect from another device.
- [Running in the background](./background-service.md): keep a host available.
- [Updating Lief.code](./updating.md): update the app and connected servers.
- [Managed policy](./managed-policy.md): configure Lief.code for everyone on a machine.
