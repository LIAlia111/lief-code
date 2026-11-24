# Release (local packaging)

This guide is for maintainers packaging Lief.code on Windows. Windows is the tested platform. The app is a local Electron desktop app; builds and releases are created manually.

## Prerequisites

For the Windows x64 build, install:

- Node.js 26 and pnpm through Corepack.
- Rust stable with the `x86_64-pc-windows-msvc` target (`rustup target add x86_64-pc-windows-msvc`).
- Python 3.
- Visual Studio 2022 Build Tools with **Desktop development with C++**, a Windows 10/11 SDK, and the MSVC x64 Spectre-mitigated libraries.

The build script checks for Rust/Cargo and its target, Python 3, Visual Studio C++ tools, a Windows SDK, and the Spectre libraries.

## Build the Windows x64 installer

From the repository root on Windows:

```powershell
corepack enable
pnpm install
vp run dist:desktop:win:x64
```

The command builds the desktop bundle, stages it, and invokes electron-builder with publishing disabled. It copies generated artifacts to the repository's `release/` directory. The installer name follows `Lief.code-${version}-${arch}.${ext}`, for example `Lief.code-1.2.3-x64.exe`. The staging build directory is temporary; `release/` is the output directory.

Other packaging scripts present in the root `package.json` are `vp run dist:desktop:win:arm64`, `vp run dist:desktop:dmg` (also `:arm64` and `:x64` variants), and `vp run dist:desktop:linux`. These targets are available in code but are untested by this guide.

## Build options

The script reads these `LIEF_DESKTOP_*` environment variables:

- `LIEF_DESKTOP_PLATFORM`, `LIEF_DESKTOP_TARGET`, `LIEF_DESKTOP_ARCH`, `LIEF_DESKTOP_VERSION`, and `LIEF_DESKTOP_OUTPUT_DIR` select the target, version, and output location.
- `LIEF_DESKTOP_SKIP_BUILD` uses existing build outputs; `LIEF_DESKTOP_KEEP_STAGE` preserves temporary staging files.
- `LIEF_DESKTOP_SIGNED` enables optional signing with local credentials; `LIEF_DESKTOP_VERBOSE` streams subprocess output.
- `LIEF_DESKTOP_MOCK_UPDATES` and `LIEF_DESKTOP_MOCK_UPDATE_SERVER_PORT` configure mock update builds.
- `LIEF_DESKTOP_WSL_RUNTIME` supplies a Linux CLI archive to embed as the Windows app's WSL runtime.
- `LIEF_DESKTOP_REUSE_RESOURCE_MONITOR` reuses a prebuilt resource monitor. `LIEF_DESKTOP_REUSE_LINUX_CAPTURE_HELPERS` reuses Linux capture helpers.
- `LIEF_DESKTOP_UNTRUSTED_BUNDLE` skips the packaged bundle self-check. `LIEF_DESKTOP_WEB_ASSET_BRAND` overrides the web asset brand.

Most builds should leave these unset. In particular, reuse and untrusted-bundle options are for specialized build flows.

## Publish manually

1. Open [Releases](https://github.com/LIAlia111/lief-code/releases) for `LIAlia111/lief-code` and create a release for the version being shipped.
2. Upload the `.exe` from `release/`. If the build produced channel metadata such as `latest.yml` (stable) or `nightly.yml` (nightly), and `.blockmap` files, attach those files from the same output directory too.
3. Publish the release and confirm the expected files are listed on its release page.

The desktop updater is configured at build time to use GitHub Releases for `LIAlia111/lief-code`. The build command itself passes `--publish never`; it does not upload files or create a release. A manually published installer can be downloaded from Releases. In-app update availability depends on the corresponding updater metadata and blockmap assets being present in the release; inspect the generated `release/` files before publishing.
