import { useState } from "react";
import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { render } from "../../../test/render";
import { testUiLocale } from "../../../test/uiLocale";
import { applyThemePalette } from "../../themePalette";
import { UsageProviderRows, UsageBreakdownCard, providerTotals } from "./UsageAnalysisPanels";
import { UsageProviderChart } from "./UsageProviderChart";
import { UsageTokenChart } from "./UsageTokenChart";
import { UsageMotion } from "./UsageMotion";
import { analysisFixture, analysisHours } from "./usageAnalysis.fixture";
import {
  mergeUsageEnvironments,
  scopeUsageEnvironments,
  tokenPeriodTotals,
  toggleUsageFilter,
} from "./usageAnalysis";
import type { UsageProviderKind } from "@lief/contracts";
import "~/index.css";
import "./usagePresentation.css";

function AnalysisFixture() {
  const [provider, setProvider] = useState<UsageProviderKind | null>(null);
  const [hour, setHour] = useState<string | null>(null);
  const all = analysisFixture();
  const scoped = scopeUsageEnvironments(all, new Set(), provider);
  const chart = mergeUsageEnvironments(scoped);
  const detail = mergeUsageEnvironments(scopeUsageEnvironments(scoped, new Set(), null, hour));
  return (
    <div data-usage-page data-usage-overview>
      <UsageProviderRows
        rows={providerTotals(mergeUsageEnvironments(all), ["codex", "claude"], "tokens")}
        metric="tokens"
        loadingProviders={new Set()}
        selectedProvider={provider}
        onSelectProvider={(picked) => setProvider((current) => toggleUsageFilter(current, picked))}
      />
      <output aria-label="筛选总量">{chart.totalTokens}</output>
      <UsageMotion replay={provider ?? "all"}>
        <UsageTokenChart
          periods={analysisHours}
          totals={tokenPeriodTotals(scoped, analysisHours, true)}
          formatPeriod={(period) => period.slice(11, 16)}
          selectedHour={hour}
          onSelectHour={(picked) => setHour((current) => toggleUsageFilter(current, picked))}
          hourly
        />
      </UsageMotion>
      <UsageBreakdownCard
        merged={detail}
        metric="tokens"
        hourly
        formatPeriod={(period) => period.slice(11, 16)}
        onSelectModel={() => {}}
        selectedHour={hour}
        onClearHour={() => setHour(null)}
      />
    </div>
  );
}
it("dims other providers, toggles off, shows real type tooltips, filters an hour and cancels", async () => {
  using _locale = testUiLocale("zh-CN");
  using _theme = liefTheme();
  await using screen = await render(<AnalysisFixture />);
  await userEvent.click(screen.getByRole("button", { name: /Codex/ }));
  await expect.element(screen.getByLabelText("筛选总量")).toHaveTextContent("2800");
  await expect
    .element(screen.getByRole("button", { name: /Claude Code/ }))
    .toHaveAttribute("data-dim");
  await userEvent.click(screen.getByRole("button", { name: /Codex/ }));
  await expect.element(screen.getByLabelText("筛选总量")).toHaveTextContent("5800");
  const bar = screen.getByRole("button", { name: /13:52，/ });
  await userEvent.hover(bar);
  expect(screen.container.querySelector(".usage-readout")?.textContent).toContain("1.60K");
  expect(screen.container.querySelector(".usage-readout")?.textContent).toContain("缓存写入");
  await userEvent.click(bar);
  await expect.element(screen.getByRole("button", { name: "取消小时筛选" })).toBeVisible();
  expect(screen.container.querySelectorAll(".usage-breakdown-table tbody tr")).toHaveLength(2);
  await userEvent.click(screen.getByRole("button", { name: "取消小时筛选" }));
  expect(screen.container.querySelectorAll(".usage-breakdown-table tbody tr")).toHaveLength(4);
});
it("opens a model from any cell or the keyboard and expands beyond six items", async () => {
  using _locale = testUiLocale("zh-CN");
  const merged = mergeUsageEnvironments(analysisFixture()),
    onSelect = vi.fn();
  const models = Array.from({ length: 8 }, (_, rank) => ({
    ...merged.models[0]!,
    model: `model-${rank}`,
  }));
  await using screen = await render(
    <UsageBreakdownCard
      merged={{ ...merged, models }}
      metric="tokens"
      hourly
      formatPeriod={(value) => value}
      onSelectModel={onSelect}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: /还有 2 项/ }));
  expect(screen.container.querySelectorAll("tbody tr")).toHaveLength(8);
  const row = screen.getByRole("row", { name: "查看 model-7 模型详情" });
  await userEvent.click(row.getByRole("cell").last());
  expect(onSelect).toHaveBeenCalledWith(`${models[7]!.provider}:model-7`);
  (row.element() as HTMLElement).focus();
  await userEvent.keyboard("{Enter}");
  expect(onSelect).toHaveBeenCalledTimes(2);
});

function liefTheme() {
  const root = document.documentElement,
    theme = root.getAttribute("data-theme-id"),
    style = root.getAttribute("style"),
    dark = root.classList.contains("dark");
  applyThemePalette("light");
  return {
    [Symbol.dispose]() {
      if (theme === null) root.removeAttribute("data-theme-id");
      else root.setAttribute("data-theme-id", theme);
      if (style === null) root.removeAttribute("style");
      else root.setAttribute("style", style);
      root.classList.toggle("dark", dark);
    },
  };
}

it("tracks current and previous cost values with dots and the absolute previous figure", async () => {
  using _locale = testUiLocale("zh-CN");
  using _theme = liefTheme();
  const merged = mergeUsageEnvironments(analysisFixture());
  await using screen = await render(
    <UsageProviderChart
      totalOnly
      previous={merged}
      previousWindow={{
        sinceDay: "2026-11-16" as never,
        untilDay: "2026-11-16" as never,
        timeZone: "UTC",
        resolution: "hour",
        sinceTime: analysisHours[0],
        untilTime: "2026-11-16T15:52:00.000Z",
      }}
      providers={["codex", "claude"]}
      days={[]}
      daily={merged.daily}
      hours={analysisHours}
      hourly={merged.hourly}
      metric="cost"
      referenceTime={analysisHours[1]}
      resolution="hour"
      timeZone="UTC"
      hour12={false}
    />,
  );
  await userEvent.hover(screen.getByRole("img", { name: "费用趋势，可悬停查看时段明细" }));
  expect(screen.container.querySelectorAll("[data-usage-hover]")).toHaveLength(2);
  await expect.element(screen.getByText("$6.00 · 前一时段", { exact: true })).toBeVisible();
});

it("draws the cost total as one bar per period when the cost chart is set to bars", async () => {
  using _theme = liefTheme();
  const merged = mergeUsageEnvironments(analysisFixture());
  await using screen = await render(
    <UsageProviderChart
      totalOnly
      chartStyle="bar"
      providers={["codex", "claude"]}
      days={[]}
      daily={merged.daily}
      hours={analysisHours}
      hourly={merged.hourly}
      metric="cost"
      referenceTime={analysisHours[1]}
      resolution="hour"
      timeZone="UTC"
      hour12={false}
    />,
  );
  const bars = screen.container.querySelectorAll("[data-usage-total-bars] rect");
  expect(bars).toHaveLength(analysisHours.length);
  // Bars replace the filled curve rather than drawing on top of it.
  expect(screen.container.querySelector('path[fill="url(#usage-total-fill)"]')).toBeNull();
  for (const bar of bars) {
    expect(Number(bar.getAttribute("x"))).toBeGreaterThanOrEqual(0);
    expect(Number(bar.getAttribute("height"))).toBeGreaterThanOrEqual(0);
  }
});
