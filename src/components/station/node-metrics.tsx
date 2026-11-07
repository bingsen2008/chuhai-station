"use client";

import { useState } from "react";
import { EXAMPLE_BUDGET_CENTS, roi, type EngineState, type Metrics, type NodeId } from "@/lib/simulation/engine";
import { SimulationDialog } from "./simulation-dialog";

type Metric = { label: string; value: number; delta: number; unit: string; note: string; series: { tick: number; value: number }[]; testId?: string };
const format = (value: number, unit: string) => unit === "USD" ? `USD ${value.toFixed(2)}` : `${value.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}${unit}`;

function metricsFor(id: NodeId, state: EngineState): Metric[] {
  const events = state.logs.filter(event => event.node === id);
  const last = state.logs.at(-1);
  const count = (label: string, series: Metric["series"], unit = " 件", note = "本案件已发生事件计数；增量为当前 Tick 的变化。", testId?: string): Metric => ({ label, value: series.reduce((sum, item) => sum + item.value, 0), delta: series.at(-1)?.tick === state.tick ? series.at(-1)!.value : 0, unit, note, series, testId });
  const metric = (label: string, key: keyof Metrics, unit: string, note: string, testId?: string): Metric => {
    const scale = unit === "USD" ? 100 : 1;
    return { label, value: state.metrics[key] / scale, delta: (last?.delta[key] ?? 0) / scale, unit, note, series: state.logs.filter(event => event.delta.impressions > 0).map(event => ({ tick: event.tick, value: event.delta[key] / scale })), testId };
  };
  const deliveries = count("已交付", events.filter(event => event.artifact).map(event => ({ tick: event.tick, value: 1 })));
  switch (id) {
    case "strategy": return [
      { label: "示例预算提议", value: EXAMPLE_BUDGET_CENTS / 100, delta: 0, unit: "USD", note: "固定演示上限提议，非余额或真实花费许可。", series: [{ tick: 0, value: EXAMPLE_BUDGET_CENTS / 100 }] }, deliveries,
    ];
    case "monitor": return [metric("累计花费", "spendCents", "USD", "整数美分累加后换算 USD；柱为各批模拟成本。", "spend"), metric("累计曝光", "impressions", " 次", "同实验窗口内的模拟曝光次数，按样本批次累加。", "impressions"), metric("累计点击", "clicks", " 次", "模拟点击次数；不代表独立用户数。")];
    case "accounting": return [metric("归因毛收入", "revenueCents", "USD", "同实验窗口模拟归因毛收入，非净现金；未计平台分成、税费与退款。"),
      { label: "模拟 ROI", value: (roi(state.metrics) ?? 0) * 100, delta: ((roi(state.metrics) ?? 0) - (roi({ ...state.metrics, spendCents: state.metrics.spendCents - (last?.delta.spendCents ?? 0), revenueCents: state.metrics.revenueCents - (last?.delta.revenueCents ?? 0) }) ?? 0)) * 100, unit: "%", note: "(归因毛收入 − 花费) / 花费；零花费时未定义。柱为各批 ROI，非累计 ROI；增量单位为百分点。", series: state.logs.filter(event => event.delta.spendCents > 0).map(event => ({ tick: event.tick, value: (roi(event.delta) ?? 0) * 100 })) }, deliveries];
    case "approval": return [count("人工决策", events.filter(event => event.artifact).map(event => ({ tick: event.tick, value: 1 }))), deliveries];
    default: return [count(id === "admission" ? "检查事件" : id === "expert" ? "咨询答复" : "处理事件", events.map(event => ({ tick: event.tick, value: 1 }))), deliveries];
  }
}

export function NodeMetrics({ id, state, testIds = true }: { id: NodeId; state: EngineState; testIds?: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const metrics = metricsFor(id, state);
  const detail = metrics.find(metric => metric.label === selected);
  return <div className="node-metrics">
    {metrics.map(metric => <button type="button" className="node-metric" key={metric.label} onClick={() => setSelected(metric.label)} aria-label={`钻取${metric.label}`}>
      <span>{metric.label}</span><strong data-testid={testIds ? metric.testId : undefined}>{metric.label === "模拟 ROI" && !state.metrics.spendCents ? "—" : format(metric.value, metric.unit)}</strong><small>{metric.delta >= 0 ? "+" : ""}{format(metric.delta, metric.unit === "%" ? " 个百分点" : metric.unit)} <span aria-hidden="true">{metric.delta < 0 ? "↘" : metric.delta === 0 ? "→" : "↗"}</span></small>
    </button>)}
    {detail && <SimulationDialog title={`${detail.label} · 指标明细`} onClose={() => setSelected(null)}>
      <div className="drill-total"><span>案件 SIM-001 / T{state.tick} · 当前总量</span><strong>{detail.label === "模拟 ROI" && !state.metrics.spendCents ? "—" : format(detail.value, detail.unit)}</strong></div>
      <p className="drill-note">示例口径：{detail.note} 增量按当前 Tick 展示；柱图可为负值。</p>
      {detail.series.length ? <><div className="drill-chart" role="img" aria-label={`${detail.label}事件柱状图`}>
        {detail.series.map((item, index) => <div className="drill-column" key={`${item.tick}-${index}`}><span>{format(item.value, detail.unit)}</span><i className={item.value < 0 ? "negative" : ""} style={{ height: `${Math.max(2, Math.abs(item.value) / Math.max(1, ...detail.series.map(point => Math.abs(point.value))) * 120)}px` }} /><small>T{item.tick}</small></div>)}
      </div><table className="drill-table"><caption>事件明细 · 示例值</caption><thead><tr><th>事件 Tick</th><th>本次值（{detail.unit.trim()}）</th></tr></thead><tbody>{detail.series.map((item, index) => <tr key={index}><td>T{item.tick}</td><td>{format(item.value, detail.unit)}</td></tr>)}</tbody></table></> : <p className="empty-state">尚无样本事件，等待流程推进。</p>}
    </SimulationDialog>}
  </div>;
}
