# FAQ

## Is Lief.code a harness?

No. A harness is what turns an LLM into an agent: it gives the model tools, a way to call them, runs them, and hands the results back. Claude Code is a harness with its own interface. Codex is the same split: the app plus the Codex App Server. Lief.code uses those harnesses. It is not a harness, and it does not work without one.

Bring your own: Claude Code, Codex, Cursor, Grok, OpenCode, Google Antigravity, Kiro, Pi, Muse Code, or fx. [Provider setup](./install.md#providers)

## Why use Lief.code instead of Claude Code or the Codex app?

Lief.code is a local desktop and web workspace for provider CLIs you already run.

- Bring your own subscription. Claude, Codex, and the other installed providers.
- Run the server on a machine you control and open it from the desktop app, or from a browser on the same machine, the LAN, Tailscale, or SSH.
- The project is MIT licensed. Lief.code is a deeply customized fork. The upstream MIT notice is in the licenses directory.

[Install](./install.md)

## Can I use Lief.code with my Claude Code subscription?

Yes.

## How much does Lief.code cost?

Nothing to Lief. You bring your own provider subscription and pay that provider as you already do. The app is MIT licensed. [Install](./install.md)

## Why is my Claude 5-hour limit draining so fast?

It shouldn't anymore. Lief.code drives Claude through Anthropic's Agent SDK, and Anthropic's 5h meter used to charge Agent SDK usage about 1.7x more than using Claude Code directly. Weekly limits were never affected. Since v0.1.7, Claude in Lief.code drains your 5h limit at the same rate as Claude Code. Still seeing it? [Update Lief.code](./updating.md) on the machine that runs your agents.

## How do I use Lief.code remotely?

Agents run on the machine hosting Lief.code. Connect through the desktop app or a browser using a pairing link over LAN or Tailscale. [Remote access](./remote-access.md)

## Will I get banned for using my subscription?

Lief.code talks to the provider CLIs and official ACP bindings you configure. Whether that use is allowed is the provider's own terms. This project does not grant an exception.

## Can I add a bunch of accounts for one provider?

A separate work account is fine. Setup for two: [Codex](./providers-codex.md#use-multiple-accounts) · [Claude](./providers-claude.md#separate-accounts-or-configurations). For a bigger pool, manage it outside Lief.code. After you set up a hub, Lief.code can show its pooled limits under Usage. [Connect a hub](./usage.md#connect-a-cliproxyapi-hub)

## Can I use an API key or OpenRouter instead of a subscription?

Yes. Add another provider instance in Settings and give it its own keys and endpoint. Claude has a full OpenRouter recipe. Your subscription setup stays untouched. [OpenRouter](./providers-claude.md#openrouter) · [Provider instances](./install.md#providers)

## Does Lief.code support local models?

No. Lief.code is a serious developer tool. Locally runnable models are not capable of meaningful engineering work.

## Does my code go to Lief servers?

No. Lief.code has no hosted servers of its own and sends no product analytics. Your code and prompts go from your machine to the provider you configured. LAN, Tailscale, and SSH carry the connection between your devices and that machine. The app can also request public update, pricing, and provider-version metadata, and optional integrations can contact their configured services. [Diagnostics](./telemetry.md)

## Worktrees are eating my disk. How do I clean them up?

Open **Settings → Worktrees → Cleanup** and turn on automatic worktree cleanup. You can also run it now from there. [Storage cleanup](./project-settings.md#storage-cleanup)

## Is there voice input?

Yes, in the desktop app and the local web UI. On macOS 26 or later, the desktop app can use Apple Speech under **On this Mac**, or you can choose an environment to transcribe. The transcript goes into your draft for review. See [Voice input](./voice-input.md).

## Does it work on Windows, Mac, and Linux?

The maintained desktop build is Windows first. The repo also has macOS and Linux packaging scripts. Windows can run agents inside WSL. There is no `lief` binary for Intel Macs; use the desktop app there, or build the server from source. [Install](./install.md)

## Why is my provider not showing up?

Almost always, the CLI is not installed or not on the `PATH` of the machine that runs the server. Log in on that machine first, like `codex login` or `claude auth login`. Still missing? Point **Binary path** at it in provider settings. Version managers often cause this. [Provider setup](./install.md#providers)
