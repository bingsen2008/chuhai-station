"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Boxes, CircleHelp, Gauge, Layers3, Pause, Play, RotateCcw, StepForward, Workflow } from "lucide-react";
import { FlowMap, StatusBadge } from "./flow-map";
import { Tower } from "./tower";
import { DraftWorkspace } from "./draft-workspace";
import { FLOORS, SEATS } from "@/lib/catalog";
import { botById } from "@/lib/roster";
import { FLOOR_IDS, type FloorId } from "@/lib/types";
import {
  decideEngine, EXAMPLE_BUDGET_CENTS, NODES, nextAction, resetEngine, roi,
  SCENARIOS, STATUS, setPlaying, setSpeed, SPEEDS, stepEngine, tickEngine, type EngineState, type NodeStatus, type Scenario, type Speed,
} from "@/lib/simulation/engine";
import { freshSession, loadSession, saveSession, type Session } from "@/lib/simulation/storage";

const usd = (cents: number) => `USD ${(cents / 100).toFixed(2)}`;
const number = (value: number) => value.toLocaleString("zh-CN");

export function StationApp() {
  const [session, setSession] = useState<Session>(freshSession);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const decisionButton = useRef<HTMLButtonElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  const eventLog = useRef<HTMLDivElement>(null);
  const followLog = useRef(true);
  const { engine: state, guide, view } = session;
  const update = (change: (state: EngineState) => EngineState) => setSession(previous => ({ ...previous, engine: change(previous.engine) }));

  useEffect(() => {
    try {
      const loaded = loadSession(window.localStorage);
      setSession(loaded.session);
      setNotice(loaded.notice);
    } catch { setNotice("浏览器存储不可用。本页可继续演示，刷新后将复位。"); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try { setSaveError(!saveSession(window.localStorage, session)); }
      catch { setSaveError(true); }
    }
  }, [session, ready]);
  useEffect(() => {
    if (!ready || !state.playing) return;
    const timer = window.setInterval(() => setSession(previous => ({ ...previous, engine: tickEngine(previous.engine) })), 1600 / state.speed);
    return () => window.clearInterval(timer);
  }, [ready, state.playing, state.speed]);

  useEffect(() => {
    if (state.decision) decisionButton.current?.focus({ preventScroll: true });
  }, [state.decision]);

  useEffect(() => {
    if (followLog.current && eventLog.current) eventLog.current.scrollTop = eventLog.current.scrollHeight;
  }, [state.logs.length]);

  function decide(command: "approve" | "revise" | "stop") {
    update(previous => {
      const next = decideEngine(previous, command);
      return setPlaying(next, true);
    });
    // The inline decision panel disappears; return keyboard focus to playback.
    window.requestAnimationFrame(() => playButton.current?.focus({ preventScroll: true }));
  }
  function start() {
    update(previous => setPlaying(previous.completed ? resetEngine(previous) : previous, true));
  }
  return <div className="sim-shell">
    <a href="#simulation-controls" className="sim-skip">跳到模拟控件</a>
    <div className="sim-safety"><span className="safety-dot" aria-hidden="true" />模拟数据 · 未连接真实业务<span className="safety-detail">纯浏览器演示，无真实投放与消息</span></div>
    <header className="sim-header">
      <a className="sim-brand" href="#"><span className="brand-mark" aria-hidden="true"><Workflow size={22} /></span><span>出海实验站<small>TIDE STATION / FLOW LAB</small></span></a>
      <div className="header-note"><span className="local-dot" />本地模拟引擎<span className="header-divider">/</span>固定 Seed 20261107</div>
    </header>
    <main className="sim-main">
      <section className="sim-intro" aria-labelledby="sim-title">
        <div><p className="sim-kicker">短剧海外实验 · 业务流转演示</p><h1 id="sim-title">看见每一次<span>业务交接。</span></h1><p className="intro-copy">一个案件，从成片准入到下一轮策略。跟随任务包，看看谁接手、交付了什么，以及接下来发生什么。</p></div>
        <div className="case-stamp"><span className="case-icon"><Boxes size={25} /></span><div><small>本次演示案件 / SIM-001</small><strong>《潮声》短剧海外实验</strong><span>示例单市场 · 示例单渠道 · USD 预算</span></div></div>
      </section>

      <section className={`sim-guide ${guide ? "" : "guide-closed"}`} aria-label="首次使用引导">
        <div className="guide-title"><span><CircleHelp size={18} />{guide ? "一分钟，读懂这条流程" : "需要操作提示？"}</span><button type="button" disabled={!ready} onClick={() => setSession(previous => ({ ...previous, guide: !previous.guide }))}>{guide ? "跳过引导" : "重开引导"}</button></div>
        {guide && <ol><li><b>01</b><span>点“一键跑通”，跟随任务包看流转。</span></li><li><b>02</b><span>到“用户审批”会暂停，由你决定通过或退回。</span></li><li><b>03</b><span>切换场景看返工与升级；数字和日志随事件一起更新。</span></li></ol>}
      </section>

      <section className="sim-console" id="simulation-controls" aria-label="模拟控件">
        <div className="scenario-control"><label htmlFor="scenario">演示场景</label><select id="scenario" disabled={!ready} value={state.scenario} onChange={event => { update(previous => resetEngine(previous, event.target.value as Scenario)); setNotice("已切换场景，整份演示状态已复位并暂停。"); }}>
          {Object.entries(SCENARIOS).map(([id, scenario]) => <option key={id} value={id}>{scenario.name}</option>)}
        </select></div>
        <div className="playback-controls">
          <button ref={playButton} className="sim-button primary" disabled={!ready || !!state.decision} type="button" onClick={state.playing ? () => update(previous => setPlaying(previous, false)) : start}>{state.playing ? <Pause size={17} /> : <Play size={17} />}{state.playing ? "暂停" : state.tick === 0 || state.completed ? "一键跑通" : "播放"}</button>
          <button className="sim-button" disabled={!ready || state.playing || !!state.decision || state.completed} type="button" onClick={() => update(stepEngine)}><StepForward size={17} />单步</button>
          <button className="sim-button" disabled={!ready} type="button" onClick={() => { update(previous => resetEngine(previous)); setNotice("本场景已完整重置：事件、指标、交付物与速度全部复位。"); }}><RotateCcw size={16} />重置</button>
        </div>
        <div className="speed-control"><label htmlFor="speed"><Gauge size={16} />速度</label><select id="speed" disabled={!ready} value={state.speed} onChange={event => update(previous => setSpeed(previous, Number(event.target.value) as Speed))}>{SPEEDS.map(speed => <option key={speed} value={speed}>{speed}x</option>)}</select></div>
        <div className="tick-indicator"><span className={state.playing ? "is-playing" : ""} />{state.completed ? "本轮完成" : state.decision ? "等待人工决策" : state.playing ? "正在演示" : "已暂停"}<b data-testid="tick">T{String(state.tick).padStart(2, "0")}</b></div>
      </section>
      <p className="scenario-description">{SCENARIOS[state.scenario].description} <span>切换场景会复位；单步每次推进一个事件。</span></p>
      {(notice || saveError) && <p className="storage-notice" role="status">{saveError ? "演示未能保存。当前可继续操作，刷新后可能复位。" : notice}</p>}

      <section className="sim-now" aria-label="当前节点与下一步">
        <div className="current-node"><span className="now-label">当前节点</span><strong data-testid="current-node">{NODES[state.current].name}</strong><StatusBadge status={state.nodes[state.current]} /></div>
        <ArrowRight className="now-arrow" size={20} aria-hidden="true" /><div className="next-action"><span className="now-label">下一步</span><span data-testid="next-action">{nextAction(state)}</span></div>
        <div className="now-live" aria-label="当前累计模拟指标"><span>模拟值 · 累计花费<b>{usd(state.metrics.spendCents)}</b></span><span>模拟值 · 累计曝光<b>{number(state.metrics.impressions)} 次</b></span></div>
      </section>
      {state.decision && <section className="sim-decision" aria-label="用户审批决策">
        <div><span className="decision-mark" aria-hidden="true">◇</span><div><h2>{state.decision === "launch" ? "这一步，由你决定" : "异常已升级，请你决策"}</h2><p>{state.decision === "launch" ? "阅读策略交付物：示例预算 USD 500，四批样本，异常升级。批准仅继续本地模拟。" : "第二批花费 USD 160 超出示例阈值 USD 120 / 批。靓仔已整理证据，你可以继续观察或用已有样本对账。"}</p></div></div>
        <div className="decision-actions"><button ref={decisionButton} className="sim-button primary" onClick={() => decide("approve")}>{state.decision === "launch" ? "批准模拟并继续" : "继续受控观察"}<ArrowRight size={16} /></button><button className="sim-button" onClick={() => decide(state.decision === "launch" ? "revise" : "stop")}>{state.decision === "launch" ? "退回修改策略" : "结束观察并对账"}</button></div>
      </section>}

      <section className="flow-section" aria-label="业务流程演示">
        <div className="section-title"><div><p className="sim-kicker">FOLLOW THE CASE</p><h2>一条清晰的业务闭环</h2></div><div className="view-switch" role="group" aria-label="视图切换"><button aria-pressed={view === "flow"} onClick={() => setSession(previous => ({ ...previous, view: "flow" }))}><Workflow size={16} />业务流程</button><button aria-pressed={view === "tower"} onClick={() => setSession(previous => ({ ...previous, view: "tower" }))}><Layers3 size={16} />五层楼宇</button></div></div>
        <div className="flow-legend" aria-label="节点状态图例">{(["waiting", "running", "passed", "rework", "escalated"] as const).map(status => <StatusBadge key={status} status={status} />)}<span>实线：主流程 · 虚线：闭环回流</span></div>
        <div className="handoff-strip" aria-live="off"><span className="handoff-symbol" aria-hidden="true">▣</span><b>案件任务包</b><span>{state.transition ? `${NODES[state.transition.from].name} → ${NODES[state.transition.to].name} · ${state.transition.label}` : state.tick === 0 ? "SIM-001 已就绪，等待进入准入检查" : `SIM-001 · ${NODES[state.current].name} · ${state.logs.at(-1)?.message ?? "等待下一事件"}`}</span></div>
        {view === "flow" ? <FlowMap state={state} /> : <TowerView state={state} />}
      </section>

      <section className="metrics-section" aria-labelledby="metrics-title"><div className="section-title"><div><p className="sim-kicker">EVENT-DRIVEN METRICS</p><h2 id="metrics-title">数字有来处，变化有记录</h2></div><span className="section-note">只在样本事件发生时累加</span></div>
        <div className="metric-grid">
          <Metric label="示例预算" value={usd(EXAMPLE_BUDGET_CENTS)} note="模拟值 · USD 上限提议，非真实花费许可" />
          <Metric label="累计花费" value={usd(state.metrics.spendCents)} note="模拟值 · USD，累计样本成本" testId="spend" />
          <Metric label="累计曝光 / 点击" value={`${number(state.metrics.impressions)} / ${number(state.metrics.clicks)}`} note="模拟值 · 次，按批事件累计" testId="impressions" />
          <Metric label="归因毛收入" value={usd(state.metrics.revenueCents)} note="模拟值 · USD，同实验窗口，非净现金" />
          <Metric label="模拟 ROI" value={roi(state.metrics) === null ? "—" : `${(roi(state.metrics)! * 100).toFixed(1)}%`} note="模拟值 · (归因毛收入 − 花费) / 花费" />
        </div><p className="metric-footnote">零花费时 ROI 未定义。未计平台分成、税费与退款；这些示例不构成真实效果承诺。</p>
      </section>
      <div className="evidence-grid">
        <section className="event-panel" aria-labelledby="events-title"><div className="panel-title"><h2 id="events-title">事件日志</h2><span>{state.logs.length} 条 · 离散 Tick</span></div><p className="panel-caption">与节点、路径和指标共用同一份事件状态。</p>
          <div ref={eventLog} className="event-log" onScroll={event => { const log = event.currentTarget; followLog.current = log.scrollHeight - log.scrollTop - log.clientHeight < 40; }} role="log" aria-label="模拟事件日志" aria-live="polite" aria-relevant="additions" tabIndex={0}>
            {state.logs.length === 0 ? <p className="empty-state">尚无事件。点击“一键跑通”或“单步”开始。</p> : <ol>{state.logs.map(event => <li key={event.tick}><span className="event-tick">T{String(event.tick).padStart(2, "0")}</span><div><span className={`event-kind status-${event.status}`}>{NODES[event.node].name} · {STATUS_LABEL(event.status)}</span><p>{event.message}</p>{event.delta.impressions > 0 && <small>+ {usd(event.delta.spendCents)} 花费 · + {number(event.delta.impressions)} 次曝光 · + {number(event.delta.clicks)} 次点击 · + {usd(event.delta.revenueCents)} 归因毛收入（均为模拟值）</small>}</div></li>)}</ol>}
          </div>
        </section>
        <section className="delivery-panel" aria-labelledby="delivery-title"><div className="panel-title"><h2 id="delivery-title"><BookOpen size={19} />闭环交付物</h2><span>{Object.keys(state.artifacts).length} 份</span></div><p className="panel-caption">演示生成，随完整进度一起保存。</p><div className="delivery-list">{Object.entries(state.artifacts).length ? Object.entries(state.artifacts).map(([id, text]) => <article key={id}><h3>{NODES[id as keyof typeof NODES].output}<span>模拟交付</span></h3><p>{text}</p></article>) : <p className="empty-state">暂无交付物。首份准入检查单将在准入通过后生成。</p>}</div></section>
      </div>
      <details className="draft-entry" onToggle={event => setDraftOpen(event.currentTarget.open)}><summary>打开原本地草稿工作台<span>独立草稿 · 手动编辑与导入导出</span></summary><p>草稿与模拟案件独立保存，编辑不会改变模拟进度。楼层旧名称沿用原版；新流程以上方演示为准。</p>{draftOpen && <DraftWorkspace />}</details>
    </main>
    <footer className="sim-footer"><span>出海实验站 / 业务流程实验室</span><span>全部在浏览器内运行 · 不调用投放、消息、058 算力或其他外部 API</span></footer>
  </div>;
}
function STATUS_LABEL(status: NodeStatus) { return `${STATUS[status].icon} ${STATUS[status].label}`; }
function Metric({ label, value, note, testId }: { label: string; value: string; note: string; testId?: string }) {
  return <article className="metric-card"><h3>{label}</h3><strong data-testid={testId}>{value}</strong><p>{note}</p></article>;
}
const floorFor: Record<EngineState["current"], FloorId> = { admission: "admission", rework: "admission", strategy: "strategy", expert: "strategy", approval: "analysis", monitor: "strategy", coordinator: "analysis", accounting: "reconciliation", feedback: "feedback", next: "feedback" };
function TowerView({ state }: { state: EngineState }) {
  const [selected, setSelected] = useState<FloorId | null>(null);
  const [seat, setSeat] = useState<string | null>(null);
  const floor = selected ?? floorFor[state.current];
  const seatInfo = SEATS.find(item => item.id === seat);
  return <div className="tower-aux"><div className="tower-image"><Tower floorId={floor} seatId={seat} onFloor={id => { setSelected(id); setSeat(null); }} onSeat={id => { setSeat(id); setSelected(SEATS.find(item => item.id === id)?.floorId ?? floor); }} /></div><div className="tower-description"><p className="sim-kicker">AUXILIARY VIEW</p><h3>五层实验塔</h3><p>保留原版楼宇，辅助理解角色所在位置。当前流程与下一步始终显示在上方，浏览楼层不会推进事件。</p><nav aria-label="辅助楼层导航">{FLOOR_IDS.map(id => <button aria-pressed={floor === id} key={id} onClick={() => { setSelected(id); setSeat(null); }}>{FLOORS[id].number} {FLOORS[id].name}</button>)}</nav><button className="sim-button" onClick={() => { setSelected(null); setSeat(null); }}>跟随当前节点</button><h4>{seatInfo ? botById(seatInfo.botId)?.name : FLOORS[floor].name}</h4><p>{seatInfo ? seatInfo.note : FLOORS[floor].purpose}</p><StatusBadge status={state.nodes[state.current]} /><p>当前模拟负责人：{NODES[state.current].owner}</p></div></div>;
}
