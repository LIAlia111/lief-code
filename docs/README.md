# Lief.code docs

Lief.code 是桌面应用（Windows 是经过测试的平台）和本地 Web UI。它运行在自己的机器上；不提供托管账号、云服务、移动端应用或营销网站。远程访问使用 LAN、SSH 或 Tailscale。有关应用可能发起的出站请求，见[诊断](./user/telemetry.md)。

Lief.code is a deeply customized fork. The upstream MIT notice is in the [licenses directory](../licenses/).

## Using Lief.code

界面默认使用简体中文。主工作区为三栏：左侧边栏包含「进行中」「已完成」「分类」，顶部在「任务」「看板」「自动化」之间切换，右侧栏显示「环境」「上下文」「额度」「改动」。外观只有白天、夜晚和跟随系统三种主题，图标使用 Phosphor。模型选择器只显示当前凭据所属厂商的模型。源代码管理仅集成 GitHub。

- [Install Lief.code](./user/install.md)
- [Messages and context](./user/composer.md)
- [Working with threads](./user/thread-sidebar.md)
- [Permission modes](./user/permission-modes.md)
- [Terminal history](./user/terminal.md)
- [Source control](./user/source-control.md)
- [Project settings](./user/project-settings.md)
- [Projects with several repositories](./user/multi-repo-projects.md)
- [Appearance and themes](./user/appearance.md)
- [Keyboard shortcuts](./user/keybindings.md)
- [Voice input](./user/voice-input.md)
- [Text generation models](./user/text-generation.md)
- [SnapShots](./user/snap-shot.md)
- [Visual replies](./user/html-renders.md)
- [Import browser sessions](./user/browser-import.md)
- [Use Lief.code as your default browser](./user/default-browser.md)
- [Devices](./user/devices.md)
- [Usage and limits](./user/usage.md)
- [Secrets](./user/secrets.md)
- [Diagnostics](./user/telemetry.md)
- [Remote access](./user/remote-access.md)
- [Outside agents (MCP)](./user/outside-agents.md)
- [Running in the background](./user/background-service.md)
- [Updating Lief.code](./user/updating.md)
- [Triage an issue](./user/triage.md)
- Provider guides: [Codex](./user/providers-codex.md) · [Claude](./user/providers-claude.md) · [OpenCode](./user/providers-opencode.md) · [Antigravity](./user/providers-antigravity.md) · [Kiro](./user/providers-kiro.md) · [Pi](./user/providers-pi.md) · [Muse Code](./user/providers-muse.md) · [fx](./user/providers-fx.md)

---

## Working on Lief.code

Start with the [development runbook](./operations/development.md) and
[contribution policy](../CONTRIBUTING.md).

Internal notes preserve architectural decisions, constraints, and implementation traps that the
source alone does not explain. Most code changes do not need an internal documentation update. Follow the
[documentation rules](../AGENTS.md#documentation) before adding one.

- [Architecture overview](./internals/overview.md)
- [Glossary](./internals/glossary.md)
- [Connection runtime](./internals/connection-runtime.md)
- [Providers](./internals/providers.md)
- [Adding a provider](./internals/adding-a-provider.md)
- [Pull request file revisions](./internals/pull-request-file-revisions.md)
- [Model classification](./internals/model-manifest.md)
- [Remote environments](./internals/remote.md)
- [Server updates](./internals/server-updates.md)
- [Resource telemetry](./internals/resource-telemetry.md)
- [Environment auth](./internals/environment-auth.md)
- [Assistant citations](./internals/assistant-citations.md)
- [Terminal runtime](./internals/terminal-runtime.md)
- [Devices](./internals/devices.md)
- [Voice input](./internals/voice-input.md)

### Runbooks

- [Development and local builds](./operations/development.md)
- [Scenarios: real-app proof for a fix](./operations/scenarios.md)
- [Release](./operations/release.md)
- [Observability](./operations/observability.md)
