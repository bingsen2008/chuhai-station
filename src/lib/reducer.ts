import { TASKS } from "@/lib/catalog";
import { parseDraft, ruleSchema } from "@/lib/schema";
import { LIMITS, sensitiveIssue } from "@/lib/text";
import type {
  ActivityKind,
  Clock,
  EvidenceDraft,
  FeedbackDraft,
  FloorId,
  PilotDraft,
  ProposalDraft,
  RuleDraft,
  StationDraft,
  StrategyDraft,
  TaskKind,
} from "@/lib/types";
import { ACTIVITY_KINDS } from "@/lib/types";

export type DraftAction =
  | { type: "patch_pilot"; key: keyof PilotDraft; value: string; record: boolean }
  | { type: "patch_task"; kind: TaskKind; key: string; value: string; record: boolean }
  | {
      type: "patch_strategy";
      key: keyof StrategyDraft;
      value: string;
      record: boolean;
    }
  | {
      type: "patch_feedback_text";
      key: FeedbackTextKey;
      value: string;
      record: boolean;
    }
  | {
      type: "patch_feedback_flag";
      key: "separatedCorrelation" | "separatedCtr";
      value: boolean;
    }
  | { type: "upsert_rule"; rule: RuleDraft }
  | { type: "patch_rule"; id: string; key: RuleTextKey; value: string; record: boolean }
  | { type: "delete_rule"; id: string }
  | { type: "upsert_evidence"; evidence: EvidenceDraft }
  | {
      type: "patch_evidence";
      id: string;
      key: "title" | "body" | "sourceNote" | "relatedRuleId" | "floorId";
      value: string;
      record: boolean;
    }
  | { type: "delete_evidence"; id: string }
  | { type: "upsert_proposal"; proposal: ProposalDraft }
  | {
      type: "patch_proposal";
      id: string;
      key: ProposalTextKey;
      value: string;
      record: boolean;
    }
  | { type: "delete_proposal"; id: string }
  | { type: "log"; kind: ActivityKind; summary: string }
  | { type: "replace"; draft: StationDraft };

type FeedbackTextKey = {
  [Key in keyof FeedbackDraft]: FeedbackDraft[Key] extends string ? Key : never;
}[keyof FeedbackDraft];

type RuleTextKey =
  | "name"
  | "signal"
  | "baseline"
  | "threshold"
  | "minimumSample"
  | "sustainedWindow"
  | "severity"
  | "ownerBotId"
  | "dedup"
  | "clearCondition"
  | "notes";

type ProposalTextKey =
  | "floorId"
  | "kind"
  | "attributionCheck"
  | "evidence"
  | "alternatives"
  | "rollback";

export type ReduceResult = { draft: StationDraft; error: string | null };

const PILOT_LABELS: Record<keyof PilotDraft, string> = {
  dramaTitle: "短剧工作标题",
  market: "市场",
  marketOther: "其他市场",
  channel: "渠道",
  channelOther: "其他渠道",
  monetization: "变现模型",
  currency: "货币",
  timezone: "时区",
  sourceLanguage: "源语言",
  targetLanguage: "目标语言",
  contentVersion: "版本标签",
  episodeNote: "集数备注",
  notes: "备注",
};

const SHORT_PILOT = new Set<keyof PilotDraft>([
  "dramaTitle",
  "marketOther",
  "channelOther",
  "sourceLanguage",
  "targetLanguage",
  "contentVersion",
  "episodeNote",
]);

export function reduceDraft(
  draft: StationDraft,
  action: DraftAction,
  clock: Clock,
): ReduceResult {
  const result = reduceUnchecked(draft, action, clock);
  if (result.error) return result;
  const parsed = parseDraft(result.draft);
  if (!parsed.ok) {
    return { draft, error: parsed.issues[0] ?? "草稿没有通过校验" };
  }
  return { draft: parsed.draft, error: null };
}

function reduceUnchecked(
  draft: StationDraft,
  action: DraftAction,
  clock: Clock,
): ReduceResult {
  switch (action.type) {
    case "patch_pilot":
      return patchPilot(draft, action.key, action.value, action.record, clock);
    case "patch_task":
      return patchTask(draft, action.kind, action.key, action.value, action.record, clock);
    case "patch_strategy":
      return patchText(
        draft,
        action.value,
        action.record,
        clock,
        "strategy_updated",
        `更新了策略草稿：${strategyLabel(action.key)}`,
        (next) => {
          next.strategy = { ...next.strategy, [action.key]: action.value };
        },
      );
    case "patch_feedback_text":
      return patchText(
        draft,
        action.value,
        action.record,
        clock,
        "feedback_updated",
        "更新了选题反馈草稿",
        (next) => {
          next.feedback = { ...next.feedback, [action.key]: action.value };
        },
      );
    case "patch_feedback_flag": {
      const next = {
        ...draft,
        feedback: { ...draft.feedback, [action.key]: action.value },
      };
      return ok(
        withActivity(next, "feedback_updated", "更新了选题反馈的区分标记", clock),
      );
    }
    case "upsert_rule":
      return upsertRule(draft, action.rule, clock);
    case "patch_rule":
      return patchRule(draft, action.id, action.key, action.value, action.record, clock);
    case "delete_rule":
      return deleteById(draft, "rules", action.id, clock, "rule_deleted", "删除了一条监控规则草稿");
    case "upsert_evidence":
      return upsertEvidence(draft, action.evidence, clock);
    case "patch_evidence":
      return patchEvidence(draft, action.id, action.key, action.value, action.record, clock);
    case "delete_evidence":
      return deleteById(draft, "evidence", action.id, clock, "evidence_deleted", "删除了一条证据草稿");
    case "upsert_proposal":
      return upsertProposal(draft, action.proposal, clock);
    case "patch_proposal":
      return patchProposal(draft, action.id, action.key, action.value, action.record, clock);
    case "delete_proposal":
      return deleteById(
        draft,
        "proposals",
        action.id,
        clock,
        "proposal_deleted",
        "删除了一条调整提议草稿",
      );
    case "log":
      if (!ACTIVITY_KINDS.includes(action.kind)) {
        throw new Error(`不允许的活动类型：${action.kind}`);
      }
      return ok(withActivity(draft, action.kind, action.summary, clock));
    case "replace":
      return ok(action.draft);
    default:
      return { draft, error: "不支持的草稿操作" };
  }
}

function patchPilot(
  draft: StationDraft,
  key: keyof PilotDraft,
  value: string,
  record: boolean,
  clock: Clock,
): ReduceResult {
  const limit = SHORT_PILOT.has(key) ? LIMITS.short : key === "notes" ? LIMITS.long : 40;
  const problem = checkText(value, limit);
  if (problem) return { draft, error: problem };
  let nextValue = value;
  if (key === "currency") nextValue = value.trim().toUpperCase();
  if (key === "currency" && nextValue !== "" && !/^[A-Z]{3}$/.test(nextValue)) {
    return { draft, error: "货币请留空，或填写三位大写字母。" };
  }
  const pilot = { ...draft.pilot, [key]: nextValue };
  if (key === "market" && nextValue !== "other") pilot.marketOther = "";
  if (key === "channel" && nextValue !== "other") pilot.channelOther = "";
  const next = { ...draft, pilot };
  if (!record) return ok(next);
  return ok(withActivity(next, "pilot_updated", `更新了试点草稿：${PILOT_LABELS[key]}`, clock));
}

function patchTask(
  draft: StationDraft,
  kind: TaskKind,
  key: string,
  value: string,
  record: boolean,
  clock: Clock,
): ReduceResult {
  const taskMeta = TASKS[kind];
  const field = taskMeta.fields.find((item) => item.key === key);
  if (!field) return { draft, error: "未知的任务字段" };
  const problem = checkText(value, LIMITS.long);
  if (problem) return { draft, error: problem };
  const tasks = draft.tasks.map((task) =>
    task.kind === kind ? { ...task, values: { ...task.values, [key]: value } } : task,
  );
  const next = { ...draft, tasks };
  if (!record) return ok(next);
  return ok(
    withActivity(next, "task_updated", `更新了计划任务：${taskMeta.title}`, clock),
  );
}

function upsertRule(draft: StationDraft, rule: RuleDraft, clock: Clock): ReduceResult {
  const parsed = ruleSchema.safeParse(rule);
  if (!parsed.success) return { draft, error: "规则草稿没有通过校验" };
  if (draft.rules.some((item) => item.id === rule.id)) {
    return { draft, error: "规则编号已存在" };
  }
  if (draft.rules.length >= LIMITS.rules) {
    return { draft, error: `规则草稿最多 ${LIMITS.rules} 条` };
  }
  const problem = textsProblem(Object.values(rule).filter((item) => typeof item === "string"));
  if (problem) return { draft, error: problem };
  const next = { ...draft, rules: [...draft.rules, parsed.data] };
  return ok(withActivity(next, "rule_created", "添加了一条空的监控规则草稿", clock));
}

function patchRule(
  draft: StationDraft,
  id: string,
  key: RuleTextKey,
  value: string,
  record: boolean,
  clock: Clock,
): ReduceResult {
  const problem = checkText(value, key === "name" ? LIMITS.short : LIMITS.long);
  if (problem) return { draft, error: problem };
  const current = draft.rules.find((rule) => rule.id === id);
  if (!current) return { draft, error: "找不到这条规则草稿" };
  const candidate = { ...current, [key]: value, mode: "historical_manual" as const };
  const parsed = ruleSchema.safeParse(candidate);
  if (!parsed.success) return { draft, error: "这条规则草稿没有通过校验" };
  const rules = draft.rules.map((rule) => (rule.id === id ? parsed.data : rule));
  const next = { ...draft, rules };
  if (!record) return ok(next);
  return ok(withActivity(next, "rule_updated", "修改了监控规则草稿", clock));
}

function upsertEvidence(
  draft: StationDraft,
  evidence: EvidenceDraft,
  clock: Clock,
): ReduceResult {
  if (draft.evidence.some((item) => item.id === evidence.id)) {
    return { draft, error: "证据编号已存在" };
  }
  if (draft.evidence.length >= LIMITS.evidence) {
    return { draft, error: `证据草稿最多 ${LIMITS.evidence} 条` };
  }
  const problem = textsProblem([evidence.title, evidence.body, evidence.sourceNote]);
  if (problem) return { draft, error: problem };
  const next = { ...draft, evidence: [...draft.evidence, evidence] };
  return ok(withActivity(next, "evidence_created", "添加了一条证据草稿", clock));
}

function patchEvidence(
  draft: StationDraft,
  id: string,
  key: "title" | "body" | "sourceNote" | "relatedRuleId" | "floorId",
  value: string,
  record: boolean,
  clock: Clock,
): ReduceResult {
  const problem = checkText(value, key === "title" ? LIMITS.short : LIMITS.long);
  if (problem) return { draft, error: problem };
  if (!draft.evidence.some((item) => item.id === id)) {
    return { draft, error: "找不到这条证据草稿" };
  }
  const evidence = draft.evidence.map((item) =>
    item.id === id ? { ...item, [key]: value } : item,
  );
  const next = { ...draft, evidence };
  if (!record) return ok(next);
  return ok(withActivity(next, "evidence_updated", "修改了证据草稿", clock));
}

function upsertProposal(
  draft: StationDraft,
  proposal: ProposalDraft,
  clock: Clock,
): ReduceResult {
  if (proposal.execution !== "blocked") {
    return { draft, error: "调整提议不能标记为已执行" };
  }
  if (draft.proposals.some((item) => item.id === proposal.id)) {
    return { draft, error: "提议编号已存在" };
  }
  if (draft.proposals.length >= LIMITS.proposals) {
    return { draft, error: `调整提议最多 ${LIMITS.proposals} 条` };
  }
  const next = { ...draft, proposals: [...draft.proposals, proposal] };
  return ok(withActivity(next, "proposal_created", "添加了一条调整提议草稿", clock));
}

function patchProposal(
  draft: StationDraft,
  id: string,
  key: ProposalTextKey,
  value: string,
  record: boolean,
  clock: Clock,
): ReduceResult {
  const problem = checkText(value, LIMITS.long);
  if (problem) return { draft, error: problem };
  if (!draft.proposals.some((item) => item.id === id)) {
    return { draft, error: "找不到这条调整提议" };
  }
  const proposals = draft.proposals.map((item) =>
    item.id === id ? { ...item, [key]: value, execution: "blocked" as const } : item,
  );
  const next = { ...draft, proposals };
  if (!record) return ok(next);
  return ok(withActivity(next, "proposal_updated", "修改了调整提议草稿", clock));
}

function deleteById(
  draft: StationDraft,
  key: "rules" | "evidence" | "proposals",
  id: string,
  clock: Clock,
  kind: ActivityKind,
  summary: string,
): ReduceResult {
  const list = draft[key];
  if (!list.some((item) => item.id === id)) return { draft, error: "找不到要删除的草稿" };
  const next = {
    ...draft,
    [key]: list.filter((item) => item.id !== id),
  } as StationDraft;
  return ok(withActivity(next, kind, summary, clock));
}

function patchText(
  draft: StationDraft,
  value: string,
  record: boolean,
  clock: Clock,
  kind: ActivityKind,
  summary: string,
  apply: (next: StationDraft) => void,
): ReduceResult {
  const problem = checkText(value, LIMITS.long);
  if (problem) return { draft, error: problem };
  const next = { ...draft };
  apply(next);
  if (!record) return ok(next);
  return ok(withActivity(next, kind, summary, clock));
}

function withActivity(
  draft: StationDraft,
  kind: ActivityKind,
  summary: string,
  clock: Clock,
): StationDraft {
  if (!ACTIVITY_KINDS.includes(kind)) throw new Error(`不允许的活动类型：${kind}`);
  const clean = summary.trim().slice(0, LIMITS.summary);
  if (!clean) return draft;
  if (sensitiveIssue(clean)) return draft;
  const event = { id: clock.id(), at: clock.now(), kind, summary: clean };
  return { ...draft, activity: [...draft.activity, event].slice(-LIMITS.activity) };
}

function checkText(value: string, max: number): string | null {
  if (value.length > max) return `文本超过 ${max} 字`;
  return sensitiveIssue(value);
}

function textsProblem(values: string[]): string | null {
  for (const value of values) {
    const problem = sensitiveIssue(value);
    if (problem) return problem;
  }
  return null;
}

function strategyLabel(key: keyof StrategyDraft): string {
  const labels: Record<keyof StrategyDraft, string> = {
    marketEvidence: "市场证据",
    channelRationale: "渠道",
    audience: "受众",
    creativeHooks: "创意钩子",
    localization: "本地化",
    landing: "落地",
    monetizationPlan: "变现计划",
    budgetProposal: "预算提议",
    experimentVariables: "实验变量",
    observation: "观察条件",
    stopConditions: "停止条件",
  };
  return labels[key];
}

function ok(draft: StationDraft): ReduceResult {
  return { draft, error: null };
}

export function taskValue(draft: StationDraft, kind: TaskKind, key: string): string {
  return draft.tasks.find((task) => task.kind === kind)?.values[key] ?? "";
}

export function anyTaskValue(draft: StationDraft, kind: TaskKind): boolean {
  const task = draft.tasks.find((item) => item.kind === kind);
  if (!task) return false;
  return Object.values(task.values).some((value) => value.trim().length > 0);
}

export function anyStrategyValue(draft: StationDraft): boolean {
  return Object.values(draft.strategy).some((value) => value.trim().length > 0);
}

export function pilotScopeLabel(draft: StationDraft): string {
  const market =
    draft.pilot.market === "other" ? draft.pilot.marketOther.trim() : draft.pilot.market;
  const channel =
    draft.pilot.channel === "other" ? draft.pilot.channelOther.trim() : draft.pilot.channel;
  const ready = Boolean(
    draft.pilot.dramaTitle.trim() && market && channel && draft.pilot.monetization,
  );
  if (!ready) return "尚未选定试点";
  return "草稿里已写明一部剧、一个市场、一个渠道和一种变现。仍未进入试点，也没有花费许可。";
}

export type ScopeState = "fixed" | "written" | "open" | "optional";

export type ScopeDecision = {
  id: string;
  label: string;
  detail: string;
  state: ScopeState;
};

export function scopeDecisions(draft: StationDraft): ScopeDecision[] {
  const marketReady =
    draft.pilot.market === "other"
      ? draft.pilot.marketOther.trim().length > 0
      : draft.pilot.market !== "";
  const channelReady =
    draft.pilot.channel === "other"
      ? draft.pilot.channelOther.trim().length > 0
      : draft.pilot.channel !== "";
  return [
    {
      id: "drama",
      label: "写明一部短剧的工作标题",
      detail: "只写标题，不写权利人个人信息。",
      state: draft.pilot.dramaTitle.trim() ? "written" : "open",
    },
    {
      id: "market",
      label: "选定一个市场",
      detail: "候选只是便于填写，不是策略结论。",
      state: marketReady ? "written" : "open",
    },
    {
      id: "channel",
      label: "选定一个渠道",
      detail: "这一轮只选一个渠道。",
      state: channelReady ? "written" : "open",
    },
    {
      id: "monetization",
      label: "选定一种变现模型",
      detail: "付费解锁、IAA、授权三者只选一种。",
      state: draft.pilot.monetization ? "written" : "open",
    },
    {
      id: "replay",
      label: "先做历史回放",
      detail: "这一项已固定，不能在此改成实盘。",
      state: "fixed",
    },
    {
      id: "spend",
      label: "没有花费许可",
      detail: "不能在这个页面授予花费、发布或暂停。",
      state: "fixed",
    },
    {
      id: "rights",
      label: "开始写权利、版本与数据权限",
      detail: "空着是未写，不是已经获准。",
      state: anyTaskValue(draft, "rights_permissions") ? "written" : "open",
    },
    {
      id: "keys",
      label: "开始写关联键和核算口径",
      detail: "自然/付费、创意/分集、收入/净现金要分开。",
      state: anyTaskValue(draft, "linkage_accounting") ? "written" : "open",
    },
    {
      id: "strategy",
      label: "在策略草稿里写下至少一栏",
      detail: "预算栏是提议，不是批准。",
      state: anyStrategyValue(draft) ? "written" : "open",
    },
    {
      id: "rules",
      label: "如需监控，自行写规则",
      detail: "空表是合法状态。这里不预置阈值，也不会模拟告警。",
      state: draft.rules.length > 0 ? "written" : "optional",
    },
  ];
}

export function floorHasDraft(draft: StationDraft, floorId: FloorId): boolean {
  if (floorId === "strategy" && (anyStrategyValue(draft) || draft.rules.length || draft.proposals.length)) {
    return true;
  }
  if (floorId === "feedback") {
    return Object.entries(draft.feedback).some(([key, value]) => {
      if (key === "separatedCorrelation" || key === "separatedCtr") return value === true;
      return typeof value === "string" && value.trim().length > 0;
    });
  }
  return draft.tasks
    .filter((task) => TASKS[task.kind].floorId === floorId)
    .some((task) => Object.values(task.values).some((value) => value.trim().length > 0));
}
