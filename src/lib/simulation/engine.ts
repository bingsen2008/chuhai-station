/** Browser-only demonstration. No clock, I/O, network, or ambient randomness. */
export const FIXED_SEED = 20261107;
export const SCENARIOS = {
  normal: { name: "正常闭环", description: "准入通过，审批后观察四批样本，形成下一轮策略。" },
  rework: { name: "准入退回", description: "字幕权利缺项 → 返工补齐 → 重新提交准入。" },
  anomaly: { name: "投放异常", description: "第二批样本触发异常 → 靓仔协调 → 用户决定继续或结束。" },
} as const;
export type Scenario = keyof typeof SCENARIOS;
export const SPEEDS = [0.5, 1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];
export const NODES = {
  admission: { name: "出海准入", owner: "出海准入", input: "《潮声》成片、字幕与权利清单", output: "准入检查单", next: "携准入结论制定海外策略" },
  strategy: { name: "海外投放策略", owner: "海外投放策略", input: "准入结论、市场与创意假设", output: "单市场策略与预算提议", next: "咨询规则后，提交用户审批" },
  approval: { name: "用户审批", owner: "用户（你）", input: "策略提议或异常处理方案", output: "人工演示决策记录", next: "由你批准、退回或结束观察" },
  monitor: { name: "模拟投放 / 监控", owner: "投放监控", input: "用户已批准的演示策略", output: "四批样本与监控观察", next: "正常交算盘；异常先升级靓仔" },
  accounting: { name: "算盘对账", owner: "算盘", input: "同一实验的花费与归因收入", output: "统一口径对账单", next: "把对账观察交给选题反馈" },
  feedback: { name: "选题反馈", owner: "选题反馈", input: "对账单与创意观察", output: "选题假设与知识卡片", next: "沉淀知识，生成下一轮策略" },
  next: { name: "下一轮策略", owner: "海外投放策略 · 靓仔协调", input: "选题假设、知识卡片", output: "下一轮实验提纲", next: "带着新假设回到海外投放策略" },
  expert: { name: "业务专家", owner: "业务专家（演示咨询角色）", input: "策略中的规则疑问", output: "规则咨询备忘", next: "旁路答复策略，不代替用户审批" },
  coordinator: { name: "靓仔 · 总控协调", owner: "靓仔", input: "投放监控的异常证据", output: "异常说明与处理选项", next: "升级用户审批，等待人工决定" },
  rework: { name: "材料返工", owner: "出海准入 · 靓仔协调", input: "字幕权利缺项清单", output: "补齐后的材料 v2", next: "重新提交出海准入" },
} as const;
export type NodeId = keyof typeof NODES;
export const MAIN_NODES: NodeId[] = ["admission", "strategy", "approval", "monitor", "accounting", "feedback", "next"];
export const STATUS = {
  waiting: { label: "等待", icon: "○" },
  running: { label: "进行中", icon: "◉" },
  passed: { label: "通过", icon: "✓" },
  rework: { label: "返工", icon: "↶" },
  escalated: { label: "异常升级", icon: "!" },
} as const;
export type NodeStatus = keyof typeof STATUS;
export type Metrics = { spendCents: number; revenueCents: number; impressions: number; clicks: number };
export type Transition = { from: NodeId; to: NodeId; label: string };
export type Decision = "launch" | "exception";
export type Command = "step" | "approve" | "revise" | "stop";
type Spec = {
  node: NodeId; status: NodeStatus; message: string;
  to?: NodeId; label?: string; artifact?: string;
  sample?: number; gate?: Decision; finish?: boolean;
};
export type SimEvent = {
  tick: number; node: NodeId; status: NodeStatus; message: string;
  delta: Metrics; transition: Transition | null; artifact: string | null;
};
export type EngineState = {
  scenario: Scenario; seed: number; rng: number; tick: number;
  playing: boolean; speed: Speed; current: NodeId;
  nodes: Record<NodeId, NodeStatus>; artifacts: Partial<Record<NodeId, string>>;
  metrics: Metrics; logs: SimEvent[]; transition: Transition | null;
  decision: Decision | null; completed: boolean; pending: Spec[]; history: Command[];
};
const zero = (): Metrics => ({ spendCents: 0, revenueCents: 0, impressions: 0, clicks: 0 });
export const EXAMPLE_BUDGET_CENTS = 50000;

function program(scenario: Scenario): Spec[] {
  const events: Spec[] = [{ node: "admission", status: "running", message: "案件 SIM-001《潮声》进入准入检查。" }];
  if (scenario === "rework") events.push(
    { node: "admission", status: "rework", to: "rework", label: "缺项退回 · 补字幕权利", message: "准入退回：字幕授权范围缺项，当前材料不能进入策略。", artifact: "准入退回单：补充海外字幕授权范围。" },
    { node: "rework", status: "running", message: "靓仔协调补齐字幕权利材料（演示）。" },
    { node: "rework", status: "passed", to: "admission", label: "材料 v2 · 再提交", message: "材料 v2 已补齐，重新提交准入。", artifact: "材料 v2：海外字幕授权范围已补齐（模拟）。" },
    { node: "admission", status: "running", message: "重新检查材料 v2，保留此前返工记录。" },
  );
  events.push(
    { node: "admission", status: "passed", to: "strategy", label: "准入结论 → 制定策略", message: "权利、字幕、版本检查通过，交海外投放策略。", artifact: "准入检查单：权利 / 字幕 / 版本齐备（模拟）。" },
    { node: "strategy", status: "running", to: "expert", label: "旁路咨询 · 预算与归因规则", message: "策略向业务专家咨询归因和预算规则；咨询不能授权花费。" },
    { node: "expert", status: "passed", to: "strategy", label: "规则答复 · 返回策略", message: "业务专家给出规则口径，返回策略主线。", artifact: "规则备忘：同窗口归因；预算上限 USD 500；异常需人工决定。" },
    { node: "strategy", status: "passed", to: "approval", label: "策略提议 → 用户决策", message: "单一示例市场 / 渠道策略就绪，提交人工审批。", artifact: "策略 v1：示例预算 USD 500；四批样本；异常升级。" },
    { node: "approval", status: "waiting", gate: "launch", message: "等待用户审批。播放和单步都不能越过这个决策节点。" },
  );
  for (let batch = 1; batch <= 4; batch++) {
    events.push({ node: "monitor", status: "running", sample: batch, message: `累计第 ${batch} 批模拟样本；花费、曝光、点击、收入由本事件增加。` });
    if (scenario === "anomaly" && batch === 2) events.push(
      { node: "monitor", status: "escalated", to: "coordinator", label: "花费节奏异常 → 总控升级", message: "第二批花费节奏超出示例阈值，冻结后续样本并升级靓仔。", artifact: "异常证据：第二批花费 USD 160，高于示例阈值 USD 120 / 批。" },
      { node: "coordinator", status: "passed", to: "approval", label: "处理方案 → 用户审批", message: "靓仔整理证据：继续受控观察，或结束观察后对账。", artifact: "协调单：保留证据，交用户选择；不自动执行任何真实操作。" },
      { node: "approval", status: "waiting", gate: "exception", message: "异常处理等待用户决定。未获决定前不会再增加样本。" },
    );
  }
  events.push(
    { node: "monitor", status: "passed", to: "accounting", label: "样本账本 → 算盘对账", message: "样本收集结束，将累计账本交给算盘。", artifact: "监控观察：四批模拟样本及事件明细已归档。" },
    { node: "accounting", status: "passed", to: "feedback", label: "统一口径 → 选题观察", message: "算盘完成同一实验窗口的花费与归因收入对账。", artifact: "对账单：USD 分计价；同实验窗口；收入为模拟归因毛收入，非净现金。" },
    { node: "feedback", status: "passed", to: "next", label: "选题假设 + 知识卡片 → 下一轮", message: "选题反馈沉淀知识卡片：钩子表现仅作为下一轮待检验假设。", artifact: "知识卡片 K-001：对比两种开篇钩子；相关不等于因果。仅本次闭环交付，无定时任务。" },
    { node: "next", status: "passed", to: "strategy", label: "闭环回流 · 新假设进入策略", message: "闭环完成：新假设回流海外投放策略，下一轮提纲已交付。", artifact: "下一轮提纲 v2：固定市场与渠道，对照开篇钩子，沿用人工审批。", finish: true },
  );
  return events;
}

export function createEngine(scenario: Scenario = "normal", seed = FIXED_SEED): EngineState {
  return {
    scenario, seed: seed >>> 0, rng: seed >>> 0, tick: 0, playing: false, speed: 1,
    current: "admission", nodes: Object.fromEntries(Object.keys(NODES).map(id => [id, "waiting"])) as EngineState["nodes"],
    artifacts: {}, metrics: zero(), logs: [], transition: null, decision: null, completed: false,
    pending: program(scenario), history: [],
  };
}
// Numerical Recipes LCG: a fixed unsigned 32-bit state, advanced only by sample events.
export function nextRandom(seed: number): number { return (Math.imul(seed, 1664525) + 1013904223) >>> 0; }

function apply(state: EngineState, spec: Spec, command: Command): EngineState {
  const delta = zero();
  let rng = state.rng;
  if (spec.sample) {
    rng = nextRandom(rng);
    delta.spendCents = state.scenario === "anomaly" && spec.sample === 2 ? 16000 : 5000 + rng % 3000;
    delta.impressions = 6000 + rng % 4000;
    delta.clicks = 130 + rng % 140;
    delta.revenueCents = 4000 + rng % 5500;
  }
  const transition = spec.to ? { from: spec.node, to: spec.to, label: spec.label ?? "交接" } : null;
  const nodes = { ...state.nodes, [spec.node]: spec.status };
  if (spec.to && !spec.finish) nodes[spec.to] = spec.to === "approval" ? "waiting" : "running";
  const metrics = Object.fromEntries(Object.keys(delta).map(key => {
    const k = key as keyof Metrics;
    return [k, state.metrics[k] + delta[k]];
  })) as Metrics;
  const event: SimEvent = { tick: state.tick + 1, node: spec.node, status: spec.status, message: spec.message, delta, transition, artifact: spec.artifact ?? null };
  return {
    ...state, rng, tick: event.tick, current: spec.to ?? spec.node, nodes, metrics, transition,
    artifacts: spec.artifact ? { ...state.artifacts, [spec.node]: spec.artifact } : state.artifacts,
    logs: [...state.logs, event], history: [...state.history, command], decision: spec.gate ?? null,
    completed: !!spec.finish, playing: spec.gate || spec.finish ? false : state.playing,
  };
}
export function stepEngine(state: EngineState): EngineState {
  if (state.completed || state.decision || !state.pending.length) return state;
  const [spec, ...pending] = state.pending;
  return apply({ ...state, pending }, spec, "step");
}
export function tickEngine(state: EngineState): EngineState { return state.playing ? stepEngine(state) : state; }
export function setPlaying(state: EngineState, playing: boolean): EngineState {
  return { ...state, playing: playing && !state.decision && !state.completed };
}
export function setSpeed(state: EngineState, speed: Speed): EngineState { return { ...state, speed }; }
export function resetEngine(state: EngineState, scenario = state.scenario): EngineState { return createEngine(scenario, state.seed); }
export function decideEngine(state: EngineState, command: Exclude<Command, "step">): EngineState {
  if (!state.decision || (command === "stop" && state.decision !== "exception") || (command === "revise" && state.decision !== "launch")) return state;
  if (command === "revise") {
    const revised = apply(state, { node: "approval", status: "rework", to: "strategy", label: "人工退回 · 修改策略", message: "用户退回策略提议，修改后必须再次审批。", artifact: "用户决策：策略需返工（模拟）。" }, command);
    return { ...revised, playing: false, pending: [
      { node: "strategy", status: "running", message: "策略按用户意见修订停止条件。" },
      { node: "strategy", status: "passed", to: "approval", label: "修订策略 → 再次审批", message: "修订策略重新提交用户审批。", artifact: "策略修订版：补充停止条件，等待用户再次决定。" },
      { node: "approval", status: "waiting", gate: "launch", message: "修订策略等待用户审批。" },
      ...state.pending,
    ] };
  }
  const stop = command === "stop";
  const next = apply(state, {
    node: "approval", status: "passed", to: stop ? "accounting" : "monitor",
    label: stop ? "用户结束观察 → 对账" : "用户批准 → 受控模拟",
    message: stop ? "用户决定结束观察；跳过剩余样本，按已有两批样本对账。" : "用户明确批准本次演示，后续模拟样本可继续。",
    artifact: stop ? "用户决策：结束模拟观察，仅对账已有样本。" : "用户决策：批准继续模拟；不代表真实花费许可。",
  }, command);
  return { ...next, playing: false, pending: stop ? state.pending.filter(spec => !spec.sample && spec.node !== "monitor") : state.pending,
    artifacts: stop ? { ...next.artifacts, monitor: "监控观察：用户结束，保留两批模拟样本及异常证据。" } : next.artifacts,
    nodes: stop ? { ...next.nodes, monitor: "passed" } : next.nodes };
}
export function runCommand(state: EngineState, command: Command): EngineState {
  return command === "step" ? stepEngine(state) : decideEngine(state, command);
}
export function nextAction(state: EngineState): string {
  if (state.completed) return "下一轮提纲已回流策略；本轮演示完成";
  if (state.decision === "launch") return "等待你批准模拟，或退回修改策略";
  if (state.decision === "exception") return "等待你决定继续观察，或结束后对账";
  return state.pending[0]?.message ?? "等待重置";
}
export function roi(metrics: Metrics): number | null {
  return metrics.spendCents ? (metrics.revenueCents - metrics.spendCents) / metrics.spendCents : null;
}
