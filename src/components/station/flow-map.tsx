"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { MAIN_NODES, NODES, STATUS, type EngineState, type NodeId, type NodeStatus } from "@/lib/simulation/engine";
import { NodeMetrics } from "./node-metrics";

export function StatusBadge({ status }: { status: NodeStatus }) {
  return <span className={`sim-status status-${status}`}><span aria-hidden="true">{STATUS[status].icon}</span> {STATUS[status].label}</span>;
}
const POSITIONS: Record<NodeId, { x: number; y: number }> = {
  approval: { x: 635, y: 25 }, coordinator: { x: 635, y: 255 },
  admission: { x: 25, y: 530 }, strategy: { x: 330, y: 530 }, monitor: { x: 635, y: 530 },
  accounting: { x: 940, y: 530 }, feedback: { x: 1245, y: 530 }, next: { x: 1550, y: 530 },
  expert: { x: 1550, y: 255 }, rework: { x: 25, y: 255 },
};
const BUSINESS: NodeId[] = ["admission", "strategy", "monitor", "accounting", "feedback", "next"];
const THEMES: Record<NodeId, string> = { approval: "orange", coordinator: "cyan", admission: "violet", strategy: "violet", monitor: "green", accounting: "blue", feedback: "violet", next: "blue", expert: "blue", rework: "green" };
const WORLD = { width: 1845, height: 995 };

export function FlowCard({ id, state, onApproval }: { id: NodeId; state: EngineState; onApproval?: () => void }) {
  const current = state.current === id;
  const meta = NODES[id];
  const role = id === "approval" ? "HUMAN / 人类决策者" : id === "coordinator" ? "ORCHESTRATOR / 二层总控" : id === "expert" ? "CONSULTANT / 咨询侧" : id === "rework" ? "REWORK / 返工侧" : "BUSINESS AGENT";
  const style = { "--node-x": `${POSITIONS[id].x}px`, "--node-y": `${POSITIONS[id].y}px` } as CSSProperties;
  return <article data-node={id} aria-current={current ? "step" : undefined} style={style} className={`flow-card theme-${THEMES[id]} ${current ? "is-current" : ""} ${id === "approval" || id === "coordinator" || id === "expert" || id === "rework" ? "compact-node" : ""}`}>
    <div className="node-eyebrow"><span>{role}</span>{current && <strong>● 当前节点</strong>}</div>
    <div className="node-title"><h3>{id === "approval" ? "卢哥" : id === "coordinator" ? "靓仔" : meta.name}</h3><StatusBadge status={state.nodes[id]} /></div>
    {id === "approval" ? <><p className="human-description">定方向 · 审批提议 · 异常决策</p><button type="button" className="approval-pill" onClick={onApproval}>待办 {state.decision ? 1 : 0} 件 <span aria-hidden="true">↗</span></button><p className="human-note">{state.decision ? "等待人工决定，流程已阻塞" : "人工审批到达后才可处理"}</p></> : id === "coordinator" ? <><p className="human-description">拆解方向，协调交付，升级异常</p><p className="human-note">组织协调 ≠ 业务执行顺序</p></> : id === "expert" || id === "rework" ? <><p className="human-description">{meta.input}</p><p className="human-note">{state.artifacts[id] ?? meta.next}</p></> : <NodeMetrics id={id} state={state} />}
    <dl>
      <div><dt>输入</dt><dd>{meta.input}</dd></div>
      <div><dt>负责人</dt><dd>{id === "approval" ? "卢哥 · 本地模拟由你决策" : meta.owner}</dd></div>
      <div><dt>交付物</dt><dd className={state.artifacts[id] ? "delivered" : ""}>{state.artifacts[id] ?? `待交付 · ${meta.output}`}</dd></div>
      <div><dt>下一步</dt><dd>{current && state.decision ? "等待你的人工演示决策" : meta.next}</dd></div>
    </dl>
  </article>;
}

type Edge = { id: string; d: string; x: number; y: number; label: string; kind: "direction" | "report" | "business" | "consult"; from?: NodeId; to?: NodeId };
function edges(): Edge[] {
  const result: Edge[] = [
    { id: "human-direction", d: "M 720 218 C 720 232 720 237 720 255", x: 652, y: 240, label: "下达方向 ↓", kind: "direction" },
    { id: "human-report", d: "M 830 255 C 830 235 830 235 830 218", x: 899, y: 240, label: "↑ 汇报 / 升级", kind: "report", from: "coordinator", to: "approval" },
    { id: "consult", d: "M 600 575 C 1490 405 1440 330 1550 330", x: 1350, y: 400, label: "规则输入 ⇄ 咨询答复", kind: "consult", from: "strategy", to: "expert" },
    { id: "rework", d: "M 160 530 C 160 490 160 493 160 465", x: 255, y: 496, label: "退回 / 材料 v2", kind: "consult", from: "admission", to: "rework" },
  ];
  for (const id of BUSINESS.slice(0, 5)) {
    const x = POSITIONS[id].x + 135;
    result.push({ id: `direction-${id}`, d: `M 735 465 C 735 495 ${x - 12} 475 ${x - 12} 530`, x: x - 50, y: 519, label: "↓ 任务输入", kind: "direction" });
    result.push({ id: `report-${id}`, d: `M ${x + 16} 530 C ${x + 16} 480 800 502 800 465`, x: x + 50, y: 505, label: "输出 ↑", kind: "report" });
  }
  for (let i = 0; i < BUSINESS.length - 1; i++) {
    const from = BUSINESS[i], to = BUSINESS[i + 1], x = POSITIONS[from].x + 270;
    // Approval is the human node above; this segment explicitly requires that gate.
    result.push({ id: `${from}-${to}`, from, to, d: `M ${x} 730 C ${x + 15} 730 ${x + 20} 730 ${x + 35} 730`, x: x + 17, y: 712, label: from === "strategy" ? "审批后" : `${MAIN_NODES.indexOf(from) + 1} → ${MAIN_NODES.indexOf(to) + 1}`, kind: "business" });
  }
  result.push({ id: "loop", from: "next", to: "strategy", d: "M 1685 930 C 1685 985 465 985 465 930", x: 1075, y: 979, label: "下一轮提纲 → 策略回流", kind: "business" });
  return result;
}
const EDGES = edges();
function transitionPath(state: EngineState): Edge | null {
  const transition = state.transition;
  if (!transition) return null;
  const a = POSITIONS[transition.from], b = POSITIONS[transition.to];
  const kind = transition.to === "approval" || transition.to === "coordinator" ? "report" : transition.from === "approval" ? "direction" : transition.from === "expert" || transition.to === "expert" ? "consult" : "business";
  const found = EDGES.find(edge => edge.from === transition.from && edge.to === transition.to);
  if (found) return { ...found, kind, label: transition.label };
  // Every engine handoff, including approval, reverse consultations and branches, has a real route.
  const x1 = a.x + 135, x2 = b.x + 135;
  const y1 = a.y < b.y ? a.y + (transition.from === "approval" ? 193 : 210) : a.y;
  const y2 = a.y < b.y ? b.y : b.y + (transition.to === "approval" ? 193 : 210);
  return { id: "event", from: transition.from, to: transition.to, d: `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}`, x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 8, label: transition.label, kind };
}

export function FlowMap({ state, onApproval }: { state: EngineState; onApproval: () => void }) {
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const [camera, setCamera] = useState({ x: 20, y: 20, scale: 0.65 });
  const [list, setList] = useState(false);
  function fit() {
    const rect = viewport.current?.getBoundingClientRect();
    const width = rect?.width || 1200, height = rect?.height || 650;
    const scale = Math.max(0.2, Math.min((width - 32) / WORLD.width, (height - 32) / WORLD.height, 1));
    setCamera({ x: (width - WORLD.width * scale) / 2, y: (height - WORLD.height * scale) / 2, scale });
  }
  useEffect(() => {
    const root = viewport.current;
    const resize = () => {
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const width = rect.width || 1200, height = rect.height || 650;
      const scale = Math.max(0.2, Math.min((width - 32) / WORLD.width, (height - 32) / WORLD.height, 1));
      setCamera({ x: (width - WORLD.width * scale) / 2, y: (height - WORLD.height * scale) / 2, scale });
    };
    resize();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (root) observer?.observe(root);
    window.addEventListener("resize", resize);
    // A native non-passive listener keeps wheel zoom confined to the focused canvas.
    const wheel = (event: WheelEvent) => {
      if (document.activeElement !== root) return;
      event.preventDefault();
      const rect = root!.getBoundingClientRect();
      const px = event.clientX - rect.left, py = event.clientY - rect.top;
      setCamera(previous => {
        const scale = Math.max(0.2, Math.min(1.8, previous.scale * (event.deltaY < 0 ? 1.1 : 1 / 1.1)));
        return { x: px - (px - previous.x) * scale / previous.scale, y: py - (py - previous.y) * scale / previous.scale, scale };
      });
    };
    root?.addEventListener("wheel", wheel, { passive: false });
    return () => { observer?.disconnect(); window.removeEventListener("resize", resize); root?.removeEventListener("wheel", wheel); };
  }, []);
  const active = transitionPath(state);
  const nextId = state.completed || state.decision ? undefined : state.pending.find(spec => spec.node !== state.current)?.node;
  return <div className={`topology ${list ? "show-flow-list" : ""}`} data-testid="flow-map">
    <div className="canvas-toolbar"><div><b>组织拓扑</b><span>方向键平移 · + / − 缩放 · Home 适应 · 0 复位</span></div><div className="canvas-actions">
      <button type="button" onClick={() => { fit(); setList(false); }}>适应画布</button><button type="button" onClick={() => setCamera({ x: 20, y: 20, scale: 1 })}>复位</button>
      <button type="button" onClick={() => setCamera(previous => ({ ...previous, scale: Math.min(1.8, previous.scale * 1.2) }))} aria-label="放大画布">＋</button><button type="button" onClick={() => setCamera(previous => ({ ...previous, scale: Math.max(0.2, previous.scale / 1.2) }))} aria-label="缩小画布">−</button>
      <button type="button" aria-pressed={list} onClick={() => setList(previous => !previous)}>纵向业务流</button>
    </div></div>
    <div className="topology-legend"><span className="legend-direction">━ 下达方向 / 输入</span><span className="legend-report">┄ 汇报 / 升级 / 输出</span><span className="legend-business">━ 横向业务交接</span><span>┄ 咨询侧路</span><small>组织层级不代表业务顺序</small></div>
    <div className="canvas-viewport" ref={viewport} tabIndex={0} role="region" aria-label="可平移缩放的组织拓扑画布" data-testid="canvas-viewport"
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        const moves: Record<string, [number, number]> = { ArrowLeft: [55, 0], ArrowRight: [-55, 0], ArrowUp: [0, 55], ArrowDown: [0, -55] };
        if (moves[event.key]) { event.preventDefault(); const [x, y] = moves[event.key]; setCamera(previous => ({ ...previous, x: previous.x + x, y: previous.y + y })); }
        else if (["+", "=", "-", "Home", "0"].includes(event.key)) { event.preventDefault(); if (event.key === "Home") fit(); else if (event.key === "0") setCamera({ x: 20, y: 20, scale: 1 }); else setCamera(previous => ({ ...previous, scale: Math.max(0.2, Math.min(1.8, previous.scale * (event.key === "-" ? 1 / 1.2 : 1.2))) })); }
      }}
      onPointerDown={event => {
        if (event.button !== 0 || (event.target as HTMLElement).closest("button, a, input, select, summary")) return;
        event.currentTarget.focus();
        drag.current = { x: event.clientX, y: event.clientY, tx: camera.x, ty: camera.y };
        event.currentTarget.setPointerCapture(event.pointerId);
      }} onPointerMove={event => { if (drag.current) { const origin = drag.current; setCamera(previous => ({ ...previous, x: origin.tx + event.clientX - origin.x, y: origin.ty + event.clientY - origin.y })); } }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <div className="canvas-world" data-testid="canvas-world" style={{ width: WORLD.width, height: WORLD.height, transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})` }}>
        <span className="world-label">01 / 决策层</span><span className="world-label control-label">02 / 总控层</span><span className="world-label business-label">03 / 业务 Agent · 并列协作</span>
        <svg className="topology-paths" width={WORLD.width} height={WORLD.height} aria-label="组织指令、汇报与业务交接路径">
          <defs>{["direction", "report", "business", "consult"].map(kind => <marker key={kind} id={`arrow-${kind}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="context-stroke" /></marker>)}</defs>
          {EDGES.map(edge => <g key={edge.id} className={`topology-edge edge-${edge.kind}`}><path d={edge.d} markerEnd={`url(#arrow-${edge.kind})`} /><text x={edge.x} y={edge.y} textAnchor="middle">{edge.label}</text></g>)}
          {active && <g className={`topology-edge edge-event event-${active.kind}`}><title>{active.label}</title><path d={active.d} markerEnd={`url(#arrow-${active.kind})`} /><text x={active.x} y={active.y} textAnchor="middle">{active.label}</text>
            <circle key={state.tick} r="5" className={`task-packet ${state.playing ? "packet-playing" : "packet-paused"}`} data-testid="event-packet" data-tick={state.tick} style={{ offsetPath: `path('${active.d}')`, animationDuration: `${1.4 / state.speed}s` }}><title>本 Tick 任务包 · 单次交接</title></circle>
          </g>}
        </svg>
        {(Object.keys(POSITIONS) as NodeId[]).map(id => <FlowCard key={id} id={id} state={state} onApproval={onApproval} />)}
      </div>
      <div className="canvas-scale" aria-label="当前画布缩放">{Math.round(camera.scale * 100)}% · 2D</div>
    </div>
    <section className="business-sequence" aria-label="主业务顺序与交付物"><div className="sequence-heading"><b>主业务链</b><span>业务顺序独立于上方组织汇报线 · 规则咨询为旁路</span></div><ol>{MAIN_NODES.map((id, index) => <li key={id} className={state.current === id ? "sequence-current" : nextId === id ? "sequence-next" : ""}><b>{String(index + 1).padStart(2, "0")}</b><div><strong>{NODES[id].name}</strong><small>{state.current === id ? "当前 · " : nextId === id ? "下一步 · " : ""}{state.artifacts[id] ? "已交付" : NODES[id].output}</small></div></li>)}</ol></section>
    <div className="mobile-flow-list" aria-label="纵向业务流与折叠节点">
      <div className="mobile-human theme-orange"><strong>卢哥 / 人类决策者</strong><button className="approval-pill" onClick={onApproval}>待办 {state.decision ? 1 : 0} 件</button><p>↓ 下达方向 · ↑ 汇报升级</p><strong className="mobile-controller">靓仔 / 总控协调</strong></div>
      {[...MAIN_NODES, "expert", "coordinator", "rework"].map((id, index) => <details key={id} className={`mobile-node theme-${THEMES[id as NodeId]}`} open={state.current === id || undefined}><summary><span>{index < MAIN_NODES.length ? String(index + 1).padStart(2, "0") : "侧路"}</span><b>{NODES[id as NodeId].name}</b><StatusBadge status={state.nodes[id as NodeId]} /></summary><div className="mobile-node-body"><NodeMetrics id={id as NodeId} state={state} testIds={false} /><dl><dt>输入</dt><dd>{NODES[id as NodeId].input}</dd><dt>交付物</dt><dd>{state.artifacts[id as NodeId] ?? `待交付 · ${NODES[id as NodeId].output}`}</dd><dt>下一步</dt><dd>{state.current === id && state.decision ? "等待人工审批" : NODES[id as NodeId].next}</dd></dl>{id === "approval" && <button className="approval-pill" onClick={onApproval}>打开本地模拟审批</button>}</div></details>)}
    </div>
  </div>;
}
