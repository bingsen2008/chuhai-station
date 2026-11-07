"use client";

import { useEffect, useRef, useState } from "react";
import { MAIN_NODES, NODES, STATUS, type EngineState, type NodeId, type NodeStatus } from "@/lib/simulation/engine";

export function StatusBadge({ status }: { status: NodeStatus }) {
  return <span className={`sim-status status-${status}`}><span aria-hidden="true">{STATUS[status].icon}</span> {STATUS[status].label}</span>;
}
export function FlowCard({ id, state, side = false }: { id: NodeId; state: EngineState; side?: boolean }) {
  const meta = NODES[id];
  const current = state.current === id;
  return <article data-node={id} aria-current={current ? "step" : undefined} className={`flow-card ${current ? "is-current" : ""} ${side ? "side-card" : ""}`}>
    <div className="node-eyebrow"><span>{side ? "旁路" : `步骤 ${String(MAIN_NODES.indexOf(id) + 1).padStart(2, "0")}`}</span>{current && <strong>当前节点</strong>}</div>
    <div className="node-title"><h3>{meta.name}</h3><StatusBadge status={state.nodes[id]} /></div>
    <dl>
      <div><dt>输入</dt><dd>{meta.input}</dd></div>
      <div><dt>负责人</dt><dd>{meta.owner}</dd></div>
      <div><dt>交付物</dt><dd className={state.artifacts[id] ? "delivered" : ""}>{state.artifacts[id] ?? `待交付 · ${meta.output}`}</dd></div>
      <div><dt>下一步</dt><dd>{current && state.decision ? "等待你的人工演示决策" : meta.next}</dd></div>
    </dl>
  </article>;
}
const EDGES: { from: NodeId; to: NodeId; label: string }[] = [
  { from: "admission", to: "strategy", label: "准入单" },
  { from: "strategy", to: "approval", label: "策略提议" },
  { from: "approval", to: "monitor", label: "已批准" },
  { from: "monitor", to: "accounting", label: "样本账本" },
  { from: "accounting", to: "feedback", label: "对账单" },
  { from: "feedback", to: "next", label: "选题假设" },
  { from: "next", to: "strategy", label: "闭环回流" },
];
type DrawnPath = (typeof EDGES)[number] & { d: string; x: number; y: number; closingMobile: boolean };
export function FlowMap({ state }: { state: EngineState }) {
  const grid = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<DrawnPath[]>([]);
  useEffect(() => {
    const root = grid.current;
    if (!root) return;
    const measure = () => {
      const origin = root.getBoundingClientRect();
      const drawn = EDGES.flatMap(edge => {
        const a = root.querySelector<HTMLElement>(`[data-node="${edge.from}"]`)?.getBoundingClientRect();
        const b = root.querySelector<HTMLElement>(`[data-node="${edge.to}"]`)?.getBoundingClientRect();
        if (!a || !b || !a.width) return [];
        const horizontal = Math.abs(a.top - b.top) < 10;
        let x1: number, y1: number, x2: number, y2: number;
        if (horizontal) {
          const right = b.left > a.left;
          x1 = right ? a.right : a.left; x2 = right ? b.left : b.right;
          y1 = a.top + a.height / 2; y2 = b.top + b.height / 2;
        } else {
          const down = b.top > a.top;
          x1 = a.left + a.width / 2; x2 = b.left + b.width / 2;
          y1 = down ? a.bottom : a.top; y2 = down ? b.top : b.bottom;
        }
        x1 -= origin.left; x2 -= origin.left; y1 -= origin.top; y2 -= origin.top;
        // On the vertical mobile layout, close the loop along the outside rail.
        const closingMobile = edge.from === "next" && Math.abs(a.left - b.left) < 10;
        const rail = a.right - origin.left + 15;
        return [{ ...edge, closingMobile, d: closingMobile ? `M ${x1} ${y1} H ${rail} V ${y2} H ${x2}` : `M ${x1} ${y1} L ${x2} ${y2}`,
          x: closingMobile ? rail - 8 : (x1 + x2) / 2 + (horizontal ? 0 : 12), y: closingMobile ? (y1 + y2) / 2 : (y1 + y2) / 2 - (horizontal ? 10 : 0) }];
      });
      setPaths(drawn);
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(root);
    root.querySelectorAll("[data-node]").forEach(node => observer?.observe(node));
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  return <>
    <div className="flow-grid" ref={grid} data-testid="flow-map">
      <svg className="flow-paths" aria-label="业务流转有向路径">
        <defs><marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" fill="currentColor" /></marker></defs>
        {paths.map(path => {
          const active = state.transition?.from === path.from && state.transition?.to === path.to;
          return <g key={`${path.from}-${path.to}`} className={active ? "path-active" : ""}>
            <title>{NODES[path.from].name} → {NODES[path.to].name}：{path.label}</title>
            <path d={path.d} fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} strokeDasharray={path.from === "next" ? "5 4" : undefined} markerEnd="url(#flow-arrow)" />
            <text className={path.closingMobile ? "vertical-loop-label" : undefined} x={path.x} y={path.y} textAnchor="middle">{path.label}</text>
            {active && <circle key={state.tick} r="5" className={`task-packet ${state.playing ? "" : "packet-paused"}`} style={{ offsetPath: `path('${path.d}')`, animationDuration: `${1.4 / state.speed}s` }}><title>案件 SIM-001 任务包</title></circle>}
          </g>;
        })}
      </svg>
      {MAIN_NODES.map(id => <FlowCard key={id} id={id} state={state} />)}
      <div className="loop-note"><span className="loop-symbol" aria-hidden="true">↻</span><h3>交付之后，进入下一轮</h3><p>从准入到反馈，一份案件串起所有角色。知识卡片随闭环交付，供下一轮检验。</p><span>01 个案件 · 01 条证据链</span></div>
    </div>
    <div className="branch-heading"><h3>旁路与升级</h3><p>规则问题先咨询；异常先协调；决策始终留给用户。</p></div>
    <div className="branch-grid">
      {(["expert", "coordinator", "rework"] as const).map(id => {
        const active = state.transition?.from === id || state.transition?.to === id;
        const routes = { expert: "策略 → 规则咨询 → 返回策略", coordinator: "监控异常 → 靓仔协调 → 用户审批", rework: "准入退回 → 补齐材料 → 再提交" };
        return <div key={id} className={`branch-lane ${active ? "branch-active" : ""}`}>
          <div className="branch-route"><span>{routes[id]}</span>{active && <span key={state.tick} className={`branch-packet ${state.playing ? "" : "packet-paused"}`} style={{ animationDuration: `${1.4 / state.speed}s` }} aria-label="任务包沿旁路交接" />}</div>
          <FlowCard id={id} state={state} side />
        </div>;
      })}
    </div>
  </>;
}
