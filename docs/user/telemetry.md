# Diagnostics

Lief.code does not send product analytics or crash reports. It can make outbound requests for public metadata and to services you configure, as described below.

The server can send traces, metrics, or logs to an OpenTelemetry receiver you run yourself. Open
**Settings > Maintenance > Diagnostics**, select an environment, and enter each signal's OTLP HTTP
endpoint under **OpenTelemetry export** (for example `http://localhost:4318/v1/traces`). Save, then
restart that environment's server. The receiver must be reachable from the server's machine.
**Test** sends an empty export from the server to check an endpoint before or after you save it;
saved endpoints are checked when the section opens. Checks send authentication headers only to
the signal's currently running endpoint and do not follow redirects. To check a new endpoint
that requires authentication, save it and restart the server first.

`LIEF_OTLP_*_URL` and standard `OTEL_EXPORTER_OTLP_*` environment variables override the saved
settings. An overridden signal shows **Set by environment** and names the variable that set it, and its
**Test** checks the running endpoint instead of the field. For endpoints saved here or set with `LIEF_OTLP_*_URL`, set `LIEF_OTLP_HEADERS` for
receivers that need authentication and `LIEF_OTLP_PROTOCOL=http/protobuf` for receivers that do
not accept JSON. An endpoint set with `OTEL_EXPORTER_OTLP_*` takes its headers and protocol from
`OTEL_EXPORTER_OTLP_HEADERS` and `OTEL_EXPORTER_OTLP_PROTOCOL` instead.

## Other outbound requests

The app also makes requests that are not product analytics:

| Request                             | When it happens                                                                                                                                                                                                                                        | What it sends                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop release metadata            | Automatic checks are off by default. If **Settings → About → Check for updates automatically** is enabled, the desktop checks 15 seconds after startup and every four hours. It uses GitHub Releases or an administrator-configured feed.              | A request for release metadata. Downloading and installing an update requires an action in the app.                                                                           |
| Public model prices                 | Usage-summary warmup runs about 45 seconds after server startup. If the cached public model-price table is missing or stale, or usage pricing is requested, the server fetches or refreshes it; the cache expires after 24 hours.                      | A request for the public price file; it does not include prompts or project data.                                                                                             |
| Provider versions and model catalog | When provider update checks are enabled in Settings, Lief.code checks public provider version metadata and can refresh its public model catalog. Managed Codex installation or update also uses npm registry metadata and GitHub-hosted release files. | Version and catalog requests contain no prompts or project data. Provider package downloads happen as part of installing or updating that provider.                           |
| Link icons                          | A chat, tool row, or browser tab shows a link to a public website.                                                                                                                                                                                     | The client asks Google's favicon service (`google.com/s2`, served from `gstatic.com`) for the site's icon, sending the site's host name. Private and local hosts are skipped. |

Provider CLIs and optional integrations can make their own requests when you use them; their destinations and data depend on the provider or service you configured. This list covers Lief.code's built-in requests, not every request made by those services. For example, an agent turn sends the context needed by the provider you selected.
