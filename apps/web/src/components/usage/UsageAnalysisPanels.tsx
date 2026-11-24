import { uiText as copy } from "~/i18n";
import type { EnvironmentId, UsageProviderKind } from "@lief/contracts";
import {
  enumerateHourStarts,
  formatCount,
  formatPercent,
  formatTokens,
  formatUsd,
  makeWindow,
} from "@lief/shared/usageFormat";
import { isModelCostUnknown, type MergedUsage } from "@lief/shared/usageMerge";
import { useState, type ReactNode } from "react";

import { UsageDetailsSheet } from "./UsageDetailsSheet";
import { useUiText } from "~/i18n/useUiText";
import { scopeUsageEnvironments, mergeUsageEnvironments } from "./usageAnalysis";
import { useUsage } from "../../state/usage";
import { modelShare, sortModelsByTokens } from "./usageBreakdown";
import { usageSeries, usageSeriesLabel } from "./usageProviders";
import { Toggle } from "../ui/toggle-group";
import { UsageSegments as ToggleGroup } from "./UsageSegments";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const ACCENT_TIERS = [100, 72, 46, 24] as const;
const accentTier = (index: number) =>
  `color-mix(in srgb, var(--primary) ${ACCENT_TIERS[Math.min(index, 3)]}%, var(--card))`;

type ProviderTotals = {
  readonly provider: UsageProviderKind;
  readonly costUsd: number;
  readonly totalTokens: number;
  readonly inputTokens: number;
  readonly cacheCreationTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
  readonly sessions: number;
  readonly share: number;
};

export function providerTotals(
  merged: MergedUsage,
  rankedProviders: readonly UsageProviderKind[],
  metric: "cost" | "tokens",
): readonly ProviderTotals[] {
  return rankedProviders.map((provider) => {
    const rows = merged.providers.filter((entry) => usageSeries(entry.provider) === provider);
    const modelRows = merged.models.filter((entry) => usageSeries(entry.provider) === provider);
    const sum = (pick: (entry: (typeof rows)[number]) => number) =>
      rows.reduce((total, entry) => total + pick(entry), 0);
    const sumModels = (pick: (entry: (typeof modelRows)[number]) => number) =>
      modelRows.reduce((total, entry) => total + pick(entry), 0);
    return {
      provider,
      costUsd: sum((entry) => entry.costUsd),
      totalTokens: sum((entry) => entry.totalTokens),
      inputTokens: sumModels((entry) => entry.tokens.uncachedInputTokens),
      cacheCreationTokens: sumModels((entry) => entry.tokens.cacheCreationTokens),
      cachedInputTokens: sumModels((entry) => entry.tokens.cachedInputTokens),
      outputTokens: sumModels((entry) => entry.tokens.outputTokens),
      sessions: sum((entry) => entry.sessions),
      share: sum((entry) => (metric === "cost" ? entry.costShare : entry.tokenShare)),
    };
  });
}

/** 圆点 8 + 名称（下行灰色说明）+ 右对齐数值（下行次级值），下方 4 高进度条。 */
export function UsageProviderRows({
  rows,
  metric,
  loadingProviders,
  selectedProvider,
  onSelectProvider,
}: {
  readonly selectedProvider: UsageProviderKind | null;
  readonly onSelectProvider: (provider: UsageProviderKind) => void;
  readonly rows: readonly ProviderTotals[];
  readonly metric: "cost" | "tokens";
  readonly loadingProviders: ReadonlySet<UsageProviderKind>;
}) {
  return (
    <div className="usage-provider-rows" data-spread={rows.length >= 4 || undefined}>
      {rows.length > 1 ? (
        <div className="usage-comp-ribbon" aria-hidden="true">
          {rows.map((row, index) => (
            <span
              key={row.provider}
              data-dim={
                (selectedProvider !== null && selectedProvider !== row.provider) || undefined
              }
              style={{
                width: `${Math.max(2, Math.min(1, row.share) * 100)}%`,
                background: accentTier(index),
              }}
            />
          ))}
        </div>
      ) : null}
      {rows.map((row, index) => {
        const ioTotal = Math.max(1, row.cachedInputTokens + row.inputTokens + row.outputTokens);
        const cachePct = (row.cachedInputTokens / ioTotal) * 100;
        const inputPct = (row.inputTokens / ioTotal) * 100;
        const outputPct = (row.outputTokens / ioTotal) * 100;
        return (
          <button
            type="button"
            aria-pressed={selectedProvider === row.provider}
            onClick={() => onSelectProvider(row.provider)}
            data-dim={(selectedProvider !== null && selectedProvider !== row.provider) || undefined}
            key={row.provider}
            className="usage-provider-row"
            data-loading={loadingProviders.has(row.provider) || undefined}
          >
            <span className="usage-dot" style={{ background: accentTier(index) }} />
            <div className="usage-provider-name">
              <span>{usageSeriesLabel(row.provider)}</span>
              <small>
                {copy("{count} conversations · {share}", {
                  count: formatCount(row.sessions),
                  share: formatPercent(row.share),
                })}
                {/* V9: input/output ratio per provider on the tokens page. */}
                {metric === "tokens" && row.outputTokens > 0
                  ? ` · ${copy("In:Out {ratio}:1", {
                      ratio: ((row.inputTokens + row.cachedInputTokens) / row.outputTokens).toFixed(
                        (row.inputTokens + row.cachedInputTokens) / row.outputTokens >= 10 ? 0 : 1,
                      ),
                    })}`
                  : null}
              </small>
            </div>
            <div className="usage-provider-value">
              <strong>
                {metric === "cost" ? formatUsd(row.costUsd) : formatTokens(row.totalTokens)}
              </strong>
              <small>
                {metric === "cost" ? formatTokens(row.totalTokens) : formatUsd(row.costUsd)}
              </small>
            </div>
            {metric === "tokens" && row.totalTokens > 0 ? (
              <div className="usage-provider-bar usage-provider-io-bar" aria-hidden="true">
                {cachePct > 0 ? (
                  <span className="usage-io-cache" style={{ width: `${cachePct}%` }} />
                ) : null}
                {inputPct > 0 ? (
                  <span className="usage-io-input" style={{ width: `${inputPct}%` }} />
                ) : null}
                {outputPct > 0 ? (
                  <span className="usage-io-output" style={{ width: `${outputPct}%` }} />
                ) : null}
              </div>
            ) : (
              <div className="usage-provider-bar">
                <span
                  className="usage-grow"
                  style={{
                    width: `${Math.max(0, Math.min(1, row.share)) * 100}%`,
                    background: accentTier(index),
                  }}
                />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function heatSummary(grid: readonly (readonly number[])[], weekdayOf: readonly number[]): string {
  const total = grid.flat().reduce((a, b) => a + b, 0);
  if (total <= 0) return copy("No usage in the last 7 days");
  const bands = [
    { label: copy("Night"), from: 0, to: 6 },
    { label: copy("Morning"), from: 6, to: 12 },
    { label: copy("Afternoon"), from: 12, to: 18 },
    { label: copy("Evening"), from: 18, to: 24 },
  ];
  const bandSums = bands.map((band) =>
    grid.reduce((sum, row) => sum + row.slice(band.from, band.to).reduce((a, b) => a + b, 0), 0),
  );
  const busiest = bands[bandSums.indexOf(Math.max(...bandSums))]?.label ?? "";
  let weekend = 0;
  let weekendDays = 0;
  grid.forEach((row, index) => {
    const day = weekdayOf[index] ?? 1;
    if (day === 0 || day === 6) {
      weekendDays += 1;
      weekend += row.reduce((a, b) => a + b, 0);
    }
  });
  const weekendLight = weekendDays > 0 && weekend / total < 0.08;
  return copy(
    weekendLight
      ? "Weekday {period} is busiest · Little weekend activity"
      : weekendDays > 0
        ? "Busiest in the {period}"
        : "Busiest on weekday {period}",
    { period: busiest },
  );
}

/** 活跃时段：最近 7 天 × 24 小时圆点热力图（真实小时数据，服务端按小时汇总）。 */
export function UsageActivityHeatmap({
  environmentIds,
  hiddenProviders,
  metric,
  selectedProvider,
  referenceTime,
}: {
  readonly referenceTime?: string;
  readonly selectedProvider?: UsageProviderKind | null;
  readonly environmentIds: ReadonlySet<EnvironmentId>;
  readonly hiddenProviders: ReadonlySet<UsageProviderKind>;
  readonly metric: "cost" | "tokens";
}) {
  const [window] = useState(() =>
    makeWindow(7, referenceTime === undefined ? undefined : new Date(referenceTime), "hour"),
  );
  const usage = useUsage(window, environmentIds, hiddenProviders);
  const [open, setOpen] = useState(false);
  const text = useUiText();
  const [view, setView] = useState("grid");
  const [hovered, setHovered] = useState<{ label: string; value: number } | null>(null);
  const merged = mergeUsageEnvironments(
    scopeUsageEnvironments(usage.selectedEnvironments, hiddenProviders, selectedProvider ?? null),
  );
  const timeZone = window.timeZone;
  const dayFormat = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const hourFormat = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  });
  // A rolling seven-day interval can cross eight calendar dates. Keep both partial days.
  const days = [
    ...new Set(
      enumerateHourStarts(window.sinceTime ?? "", window.untilTime ?? "").map((start) =>
        dayFormat.format(new Date(start)),
      ),
    ),
  ];
  const weekdayOf = days.map((day) => new Date(`${day}T12:00:00Z`).getUTCDay());
  const grid = days.map(() => Array.from({ length: 24 }, () => 0));
  for (const entry of merged.hourly) {
    const at = new Date(entry.hourStart);
    const row = days.indexOf(dayFormat.format(at));
    const hour = Number.parseInt(hourFormat.format(at), 10) % 24;
    const cells = grid[row];
    if (cells && Number.isFinite(hour)) {
      cells[hour] = (cells[hour] ?? 0) + (metric === "cost" ? entry.costUsd : entry.totalTokens);
    }
  }
  const peak = Math.max(0, ...grid.flat());
  // Hours under 3% of the busiest hour stay grey so the busy pattern reads at a glance.
  const level = (value: number) =>
    value <= 0 || peak <= 0 || value / peak < 0.03 ? 0 : Math.max(1, Math.ceil((value / peak) * 5));
  const pending = usage.isPending && usage.merged.hourly.length === 0;
  const weekdays = [1, 2, 3, 4, 5, 6, 0].map((day) => ({
    label: copy(WEEKDAYS[day]!),
    value: grid.reduce(
      (sum, row, index) => (weekdayOf[index] === day ? sum + row.reduce((a, b) => a + b, 0) : sum),
      0,
    ),
  }));
  const rhythm = HOURS.map((hour) => ({
    label: `${String(hour).padStart(2, "0")}:00`,
    value: grid.reduce((sum, row) => sum + (row[hour] ?? 0), 0),
  }));
  const format = metric === "cost" ? formatUsd : formatTokens;
  const heatGrid = (
    <div
      className="usage-heat-grid"
      role="img"
      aria-label={copy("Hourly usage over the last 7 days")}
    >
      {grid.map((cells, row) => (
        <div className="usage-heat-row" key={days[row]}>
          <span>{copy(WEEKDAYS[weekdayOf[row] ?? 0] ?? "")}</span>
          {HOURS.map((hour) => (
            <i
              key={hour}
              data-level={level(cells[hour] ?? 0)}
              style={{ animationDelay: `${(row * 24 + hour) * 7}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
  return (
    <>
      <section data-usage-card className="usage-heat-card" aria-busy={pending}>
        <div className="usage-card-title">
          <span>
            {copy("Activity by time")}
            <em>{copy("Last 7 days")}</em>
          </span>
          <button type="button" className="usage-expand" onClick={() => setOpen(true)}>
            {copy("Expand")}
          </button>
        </div>
        {heatGrid}
        <div className="usage-heat-foot">
          <span>{pending ? copy("Loading….") : heatSummary(grid, weekdayOf)}</span>
          <span className="usage-heat-legend" aria-hidden>
            {copy("Less")}
            {[0, 1, 2, 3, 4, 5].map((value) => (
              <i key={value} data-level={value} />
            ))}
            {copy("More.")}
          </span>
        </div>
      </section>
      <UsageDetailsSheet
        open={open}
        onOpenChange={setOpen}
        width={720}
        title={copy("Activity by time")}
        description={copy("{provider} · Last 7 days · One hour per cell", {
          provider: selectedProvider ? usageSeriesLabel(selectedProvider) : copy("All providers"),
        })}
      >
        <dl className="usage-model-stats">
          <div>
            <dt>{copy("7-day total")}</dt>
            <dd>{format(grid.flat().reduce((a, b) => a + b, 0))}</dd>
          </div>
          <div>
            <dt>{copy("Busiest hour")}</dt>
            <dd>{format(peak)}</dd>
          </div>
          <div>
            <dt>{copy("Days with usage")}</dt>
            <dd>
              {copy("{count} days", { count: grid.filter((row) => row.some((v) => v > 0)).length })}
            </dd>
          </div>
          <div>
            <dt>{copy("Today")}</dt>
            <dd>{format(grid.at(-1)?.reduce((a, b) => a + b, 0) ?? 0)}</dd>
          </div>
        </dl>
        <ToggleGroup
          aria-label={text("Activity view")}
          value={[view]}
          onValueChange={(values) => {
            if (values[0]) {
              setView(values[0]);
              setHovered(null);
            }
          }}
        >
          <Toggle value="grid">{text("By hour")}</Toggle>
          <Toggle value="week">{text("By weekday")}</Toggle>
          <Toggle value="day">{text("Time of day")}</Toggle>
        </ToggleGroup>
        <div className="usage-readout" data-usage-readout role="status">
          <div>
            <span>{hovered?.label ?? text("Hover over an hour to see its usage")}</span>
            <strong>
              {hovered
                ? format(hovered.value)
                : text("7-day total: {value}", {
                    value: format(grid.flat().reduce((a, b) => a + b, 0)),
                  })}
            </strong>
          </div>
        </div>
        <div className="usage-activity-view" onMouseLeave={() => setHovered(null)}>
          <svg
            viewBox={`0 0 672 ${view === "grid" ? days.length * 30 + 28 : 236}`}
            role="img"
            aria-label={text("Heatmap of hourly usage over the last 7 days")}
          >
            {view === "grid" ? (
              <>
                {grid.map((row, r) => (
                  <g key={days[r]}>
                    <text x={0} y={r * 30 + 20}>
                      {copy(WEEKDAYS[weekdayOf[r] ?? 0] ?? "")}
                    </text>
                    {row.map((value, h) => (
                      <rect
                        key={HOURS[h]}
                        data-heat-cell
                        data-value={value}
                        x={40 + h * (632 / 24) + 1.5}
                        y={r * 30 + 4}
                        width={632 / 24 - 3}
                        height={24}
                        rx={5}
                        fill={
                          level(value) === 0
                            ? "var(--muted)"
                            : accentTier(4 - Math.min(4, level(value)))
                        }
                        stroke={
                          hovered?.label === `${days[r]} ${String(h).padStart(2, "0")}:00`
                            ? "var(--foreground)"
                            : "none"
                        }
                        strokeWidth={1.5}
                        tabIndex={0}
                        role="img"
                        aria-label={`${days[r]} ${h}:00 · ${format(value)}`}
                        onMouseEnter={() =>
                          setHovered({
                            label: `${days[r]} ${String(h).padStart(2, "0")}:00`,
                            value,
                          })
                        }
                        onFocus={() =>
                          setHovered({
                            label: `${days[r]} ${String(h).padStart(2, "0")}:00`,
                            value,
                          })
                        }
                      />
                    ))}
                  </g>
                ))}
                {[0, 6, 12, 18].map((hour) => (
                  <text
                    key={hour}
                    x={40 + ((hour + 0.5) * 632) / 24}
                    y={days.length * 30 + 22}
                    textAnchor="middle"
                  >
                    {String(hour).padStart(2, "0")}:00
                  </text>
                ))}
              </>
            ) : (
              (() => {
                const rows = view === "week" ? weekdays : rhythm;
                const max = Math.max(1, ...rows.map((r) => r.value)),
                  step = 632 / rows.length;
                return rows.map((row, i) => (
                  <g key={row.label} onMouseEnter={() => setHovered(row)}>
                    <rect
                      data-activity-bar
                      x={40 + i * step + step * 0.15}
                      y={200 - (row.value / max) * 180}
                      width={step * 0.7}
                      height={(row.value / max) * 180}
                      rx={3}
                      fill={
                        row.value === max
                          ? "var(--primary)"
                          : "color-mix(in srgb,var(--foreground) 22%,var(--card))"
                      }
                    />
                    <rect
                      x={40 + i * step}
                      y={0}
                      width={step}
                      height={202}
                      fill="transparent"
                      tabIndex={0}
                      role="img"
                      aria-label={`${row.label} · ${format(row.value)}`}
                      onFocus={() => setHovered(row)}
                    />
                    {view === "week" || i % 6 === 0 ? (
                      <text x={40 + (i + 0.5) * step} y={224} textAnchor="middle">
                        {row.label}
                      </text>
                    ) : null}
                  </g>
                ));
              })()
            )}
          </svg>
        </div>
        <p className="usage-card-hint">
          {copy("Hours are grouped by local weekday and time. Hours with no usage show zero.")}
        </p>
      </UsageDetailsSheet>
    </>
  );
}

type BreakdownTab = "model" | "project" | "time";

/** 按模型 / 项目 / 小时：固定 6 行，序号 01、色点、名称、右对齐数值、占比；点模型行滑出详情。 */
export function UsageBreakdownCard({
  merged,
  metric,
  hourly,
  formatPeriod,
  onSelectModel,
  aside,
  selectedHour,
  onClearHour,
}: {
  readonly merged: MergedUsage;
  readonly metric: "cost" | "tokens";
  readonly hourly: boolean;
  readonly formatPeriod: (period: string) => string;
  readonly onSelectModel: (key: string) => void;
  readonly aside?: ReactNode;
  readonly selectedHour?: string | null;
  readonly onClearHour?: () => void;
}) {
  const [tab, setTab] = useState<BreakdownTab>("model");
  const [expandedTab, setExpandedTab] = useState<BreakdownTab | null>(null);
  const value = (row: { costUsd: number; totalTokens: number }) =>
    metric === "cost" ? row.costUsd : row.totalTokens;
  const total = metric === "cost" ? merged.costUsd : merged.totalTokens;
  const share = (amount: number) => (total > 0 ? amount / total : 0);
  type Row = {
    key: string;
    label: string;
    amount: number;
    shown: string;
    pct: number | null;
    onClick?: () => void;
  };
  const format = metric === "cost" ? formatUsd : formatTokens;
  const rows: Row[] =
    tab === "model"
      ? (metric === "tokens" ? sortModelsByTokens(merged.models) : merged.models).map((model) => {
          const key = `${model.provider}:${model.model}`;
          return {
            key,
            label: model.model,
            amount: value(model),
            shown:
              metric === "cost" && isModelCostUnknown(model)
                ? copy("Unpriced")
                : format(value(model)),
            pct: modelShare(model, metric),
            onClick: () => onSelectModel(key),
          };
        })
      : tab === "project"
        ? merged.projects
            .toSorted((a, b) => value(b) - value(a))
            .map((project) => ({
              key: String(project.key),
              label:
                project.kind === "project"
                  ? project.title
                  : project.kind === "unlinked"
                    ? copy("Outside Lief.code conversations")
                    : copy("Not reported by this server."),
              amount: value(project),
              shown: format(value(project)),
              pct: share(value(project)),
            }))
        : (hourly ? merged.hourly : merged.daily)
            .map((period) => {
              const id = String("hourStart" in period ? period.hourStart : period.day);
              return {
                key: id,
                label: formatPeriod(id),
                amount: value(period),
                shown: format(value(period)),
                pct: share(value(period)),
              };
            })
            .toSorted((a, b) => b.amount - a.amount);
  const expanded = expandedTab === tab;
  const visible = expanded ? rows : rows.slice(0, 6);
  const peak = Math.max(0, ...visible.map((row) => row.amount));
  const rank = (amount: number) =>
    peak <= 0 ? 3 : amount >= peak ? 0 : amount >= peak * 0.4 ? 1 : amount >= peak * 0.1 ? 2 : 3;
  return (
    <section data-usage-card className="usage-breakdown-card">
      <div className="usage-card-title">
        <span>
          {tab === "model"
            ? copy("By model")
            : tab === "project"
              ? copy("By project.")
              : hourly
                ? copy("By hour")
                : copy("By day")}
        </span>
        <ToggleGroup
          aria-label={copy("Usage breakdown")}
          variant="segmented"
          value={[tab]}
          onValueChange={(next) => {
            const picked = next[0];
            if (picked === "model" || picked === "project" || picked === "time") setTab(picked);
          }}
        >
          <Toggle value="model">{copy("Model")}</Toggle>
          <Toggle value="project">{copy("Project")}</Toggle>
          <Toggle value="time">{hourly ? copy("hour") : copy("day")}</Toggle>
        </ToggleGroup>
      </div>
      {selectedHour ? (
        <p className="usage-hour-filter">
          {copy("Show only {period}", { period: formatPeriod(selectedHour) })}
          <button type="button" onClick={onClearHour}>
            {copy("Clear hour filter")}
          </button>
        </p>
      ) : null}
      <table className="usage-breakdown-table">
        <thead>
          <tr>
            <th>#</th>
            <th>
              {tab === "model"
                ? copy("Model")
                : tab === "project"
                  ? copy("Project")
                  : hourly
                    ? copy("hour")
                    : copy("Date")}
            </th>
            <th>{metric === "cost" ? copy("Cost") : copy("Tokens")}</th>
            <th>{copy("Share")}</th>
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <tr>
              <td colSpan={4} className="usage-breakdown-empty">
                {copy("No usage in this period")}
              </td>
            </tr>
          ) : (
            visible.map((row, index) => (
              <tr
                key={row.key}
                data-clickable={row.onClick ? true : undefined}
                onClick={row.onClick}
                onKeyDown={(event) => {
                  if (row.onClick && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    row.onClick();
                  }
                }}
                tabIndex={row.onClick ? 0 : undefined}
                aria-label={
                  row.onClick ? copy("View details for {model}", { model: row.label }) : undefined
                }
              >
                <td>{String(index + 1).padStart(2, "0")}</td>
                <td>
                  {row.onClick ? (
                    <span className="usage-breakdown-label">
                      <span
                        className="usage-swatch"
                        style={{ background: accentTier(rank(row.amount)) }}
                      />
                      {row.label}
                    </span>
                  ) : (
                    <span className="usage-breakdown-label">
                      <span
                        className="usage-swatch"
                        style={{ background: accentTier(rank(row.amount)) }}
                      />
                      {row.label}
                    </span>
                  )}
                </td>
                <td>{row.shown}</td>
                <td>{row.pct === null ? "" : formatPercent(row.pct)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {rows.length > 6 ? (
        <button
          type="button"
          className="usage-breakdown-more"
          aria-expanded={expanded}
          onClick={() => setExpandedTab(expanded ? null : tab)}
        >
          {copy("{action} · Sorted by {metric}", {
            action: expanded
              ? copy("Collapse recommendation")
              : copy("Show all · {count} more", { count: rows.length - 6 }),
            metric: copy(metric === "cost" ? copy("Cost") : copy("Tokens")),
          })}
        </button>
      ) : (
        (aside ?? null)
      )}
    </section>
  );
}
