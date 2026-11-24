# Prompt links

A prompt link opens Lief.code with a prompt ready to send. Use one to share a prompt on social
media, or to put a one-click fix in a pull request comment.

A link never runs anything. It opens a draft. You read the prompt, then press Send. A link cannot
change your permission mode, branch, or worktree. Your own defaults apply.

## Make a link

Open the command palette and choose **Copy prompt link**. It copies the draft in the composer.
When the project is on GitHub, **Copy prompt link with repo and model** also adds the repository
and the model you picked. Sent messages have a **Copy prompt link** button too.

You can also write a link by hand. The host is the Lief.code server you are connected to, not a public website:

```
https://<your-server>/new?prompt=Rate%20my%20swearing
https://<your-server>/new?prompt=Fix%20the%20build&repo=owner/name&provider=codex&model=gpt-5.5
https://<your-server>/new?pr=owner/name/123&prompt=Fix%20the%20failing%20check
```

| Parameter  | Meaning                                                                       |
| ---------- | ----------------------------------------------------------------------------- |
| `prompt`   | The prompt. Required, except on pull request links. At most 8,000 characters. |
| `repo`     | A GitHub repository, as `owner/name` or its URL.                              |
| `provider` | A provider such as `codex` or `claude`.                                       |
| `model`    | A model of that provider, by its id or name.                                  |
| `pr`       | A GitHub pull request, as `owner/name/123` or its URL.                        |

Encode the prompt for a URL. In JavaScript, use `encodeURIComponent`.

## Open a link

Open the link in a browser that is already connected to that server, or in the desktop app.
There is no public site that chooses an app for you.

- **No `repo`**: the draft opens without a project, on the machine you used last.
- **`repo`**: the draft opens in your most recently used project for that repository. A fork
  counts only for its own owner. When you do not have the repository, choose **Clone** or **Use
  without project**.
- **`provider` and `model`**: used when you have that provider set up. Otherwise your default
  model is used, and Lief.code tells you.
- **`pr`**: opens the thread linked to that pull request on any connected machine, with the prompt
  in its composer. When no thread is linked, the draft goes on the pull request branch in a new
  worktree. Lief.code checks the code out only after you confirm, because the checkout runs your
  setup script on it.

A thread link with a prompt, such as `https://<your-server>/<environment>/<thread>?prompt=…`,
puts the prompt in that thread's composer. If you already typed a draft there, Lief.code asks
before it replaces it.

Lief.code removes characters you cannot see, such as zero-width and hidden tag characters, because
they can hide instructions for the agent. When a prompt had them, Lief.code warns you that it may be
malicious.

## Share a thread

**Copy thread** copies a link such as `https://<your-server>/threads/<environment>/<thread>`. Paste
it anywhere, such as a GitHub comment or your notes. Only someone who can reach the machine that
runs the thread, and who is allowed to open it, can see it. In Lief.code, a thread link in a
message opens the thread in the app.
