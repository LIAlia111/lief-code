# Appearance

On web and desktop, open **Settings → Appearance** and choose **Day**, **Night**, or **System** (白天、夜晚、跟随系统). These are the only themes. Night is the default. System follows your device’s light or dark appearance. Each browser or desktop app saves its own choice.

Open **Change appearance** in the command palette, or press **Cmd+Option+A** on macOS and **Ctrl+Alt+A** on Windows or Linux. Add **Shift** to cycle through the three options. Customize these shortcuts in **Settings → Keybindings**.

## Composer context

Git-backed projects show branch and worktree controls below the composer while you create a thread.
The controls retreat as the composer docks after you send the first message.

Turn on **Composer context** to keep those controls visible after the thread starts. This preference
applies to the web and desktop clients.

## Math

Turn on **Render math** in **Settings → Appearance** to typeset LaTeX in messages and Markdown
previews on web and desktop. It reads `$…$`, `$$…$$`, `\(…\)`, and `\[…\]`, outside of code.
Fenced `math` blocks also render. Formulas work in tables, including absolute-value bars.
Dollar amounts such as `$5 and $10` stay text; write `\$` to keep any other dollar sign literal.
Wide formulas scroll horizontally while the surrounding text wraps. Copying a formula or
exporting a table preserves the TeX.

The composer keeps TeX source editable, including when rich text is enabled. The Render math
preference is saved separately on each device.

## Motion

The main sidebar, right panel, and terminal drawer open and close immediately by default. Move the
**Panel animations** slider above 0 ms to add motion, up to 400 ms, unless reduced motion is enabled
in your operating system. Moving between threads always snaps to the selected thread's panel state
without replaying its transitions.
