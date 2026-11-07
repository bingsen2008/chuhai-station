import type { FloorId, SignalId, StrategyDraft, TaskKind } from "@/lib/types";
import { BOTS, type BotId } from "@/lib/roster";

export const FLOORS: Record<
  FloorId,
  {
    id: FloorId;
    index: number;
    number: string;
    name: string;
    short: string;
    purpose: string;
  }
> = {
  admission: {
    id: "admission",
    index: 0,
    number: "01",
    name: "成片准入",
    short: "准入",
    purpose:
      "成品内容先过权利、版本、本地化和数据权限，再谈出海试验。这一层不申请花费。",
  },
  strategy: {
    id: "strategy",
    index: 1,
    number: "02",
    name: "海外投放策略",
    short: "策略",
    purpose:
      "把证据写成一个市场、一个渠道、一种变现的策略草稿，并设计监控规则。监控席不执行暂停或改预算。",
  },
  reconciliation: {
    id: "reconciliation",
    index: 2,
    number: "03",
    name: "数据对账",
    short: "对账",
    purpose:
      "先定义关联键和核算口径。自然与付费、创意与分集、收入与已结算净现金要分开。未填写不是零。",
  },
  analysis: {
    id: "analysis",
    index: 3,
    number: "04",
    name: "商业分析",
    short: "分析",
    purpose:
      "口径站得住之后，再写可检验假设、人工复核和前后评估。协调席不批准花费。",
  },
  feedback: {
    id: "feedback",
    index: 4,
    number: "05",
    name: "选题反馈",
    short: "反馈",
    purpose:
      "把观察整理成选题和创意问题。相关不是因果，点击率不是题材质量。",
  },
};

export const FLOOR_LIST = [
  FLOORS.admission,
  FLOORS.strategy,
  FLOORS.reconciliation,
  FLOORS.analysis,
  FLOORS.feedback,
] as const;

export const SEATS = [
  {
    id: "admission-gate",
    floorId: "admission",
    botId: BOTS[0].id,
    seat: "准入席",
    short: "准入",
    u: 0.42,
    v: 0.5,
    note: "在这一层记录成片能不能进入海外试验。席位存在，不代表有人正在值守。",
  },
  {
    id: "strategy-plan",
    floorId: "strategy",
    botId: BOTS[1].id,
    seat: "策略席",
    short: "策略",
    u: 0.32,
    v: 0.56,
    note: "策略草稿写在这里：市场、渠道、受众、创意、本地化、落地、变现、预算提议和停止条件。",
  },
  {
    id: "strategy-monitor",
    floorId: "strategy",
    botId: BOTS[2].id,
    seat: "监控席",
    short: "监控",
    u: 0.7,
    v: 0.36,
    note: "监控规则只供以后人工对照或历史回放。定时监控没有启用，这里也不会扫描数据。",
  },
  {
    id: "recon-abacus",
    floorId: "reconciliation",
    botId: BOTS[5].id,
    seat: "对账席",
    short: "对账",
    u: 0.46,
    v: 0.48,
    note: "同一名册角色可以在不同楼层有席位。这不是两项正在运行的任务。",
  },
  {
    id: "analysis-abacus",
    floorId: "analysis",
    botId: BOTS[5].id,
    seat: "统计席",
    short: "统计",
    u: 0.32,
    v: 0.54,
    note: "在商业分析层复核口径和成本定义。与三层是同一个算盘角色的另一个席位。",
  },
  {
    id: "analysis-coordinator",
    floorId: "analysis",
    botId: BOTS[4].id,
    seat: "协调席",
    short: "协调",
    u: 0.68,
    v: 0.36,
    note: "协调范围、假设和审批边界。不能在这里授予花费许可。",
  },
  {
    id: "feedback-topic",
    floorId: "feedback",
    botId: BOTS[3].id,
    seat: "反馈席",
    short: "反馈",
    u: 0.44,
    v: 0.48,
    note: "反馈必须把相关和因果分开写，也必须把点击率和题材质量分开写。",
  },
] as const;

export type Seat = (typeof SEATS)[number];

export function seatsOn(floorId: FloorId): Seat[] {
  return SEATS.filter((seat) => seat.floorId === floorId);
}

export function seatById(id: string): Seat | null {
  return SEATS.find((seat) => seat.id === id) ?? null;
}

type TaskField = {
  key: string;
  label: string;
  hint: string;
};

export const TASKS: Record<
  TaskKind,
  { kind: TaskKind; floorId: FloorId; title: string; fields: TaskField[] }
> = {
  prepare_scope: {
    kind: "prepare_scope",
    floorId: "admission",
    title: "准备范围",
    fields: [
      {
        key: "question",
        label: "这一轮要回答的问题",
        hint: "只写这一轮真正要判断的事。",
      },
      {
        key: "out_of_scope",
        label: "明确不做的事",
        hint: "例如不投放、不改预算、不接广告或收入账号。",
      },
      {
        key: "cut_version",
        label: "成片范围",
        hint: "哪些集、哪一版。还不知道就留空，不要写成 0。",
      },
    ],
  },
  rights_permissions: {
    kind: "rights_permissions",
    floorId: "admission",
    title: "权利、版本、本地化与数据权限",
    fields: [
      {
        key: "rights_status",
        label: "权利状态",
        hint: "人工记录即可。不要写权利人的个人信息，也不要粘贴合同全文。",
      },
      {
        key: "version",
        label: "使用的成片版本",
        hint: "版本标签或截止日期。没有就留空。",
      },
      {
        key: "localization",
        label: "本地化范围",
        hint: "字幕、配音、封面、标题文案分别写到哪一步。",
      },
      {
        key: "data_permissions",
        label: "数据权限",
        hint: "谁可以看哪些汇总。不要写账号、邮箱或令牌。",
      },
    ],
  },
  source_inventory: {
    kind: "source_inventory",
    floorId: "admission",
    title: "来源盘点",
    fields: [
      {
        key: "content_source",
        label: "成片来源",
        hint: "文件或版本从哪里来。不要写网盘口令。",
      },
      {
        key: "ads_source",
        label: "投放数据来源",
        hint: "预期来源即可。当前没有广告接口。",
      },
      {
        key: "revenue_source",
        label: "收入数据来源",
        hint: "预期来源即可。当前没有收入接口。",
      },
      {
        key: "gaps",
        label: "已知缺口",
        hint: "缺的来源留在这里。缺口不是零。",
      },
    ],
  },
  linkage_accounting: {
    kind: "linkage_accounting",
    floorId: "reconciliation",
    title: "关联键与核算口径",
    fields: [
      {
        key: "linkage_keys",
        label: "关联键",
        hint: "只写键的名字，例如内容版本、素材、分集、市场、渠道。不要写账号编号。",
      },
      {
        key: "organic_paid",
        label: "自然与付费如何分开",
        hint: "两条路径不要混在一个数里。",
      },
      {
        key: "creative_episode",
        label: "广告创意与正片分集如何分开",
        hint: "广告素材的点击，不等于某一集的内容表现。",
      },
      {
        key: "monetization_split",
        label: "付费解锁、IAA、授权如何分开",
        hint: "这一轮只选一种变现。其他模型不要混进口径。",
      },
      {
        key: "revenue_cash",
        label: "收入与已结算净现金如何分开",
        hint: "账面收入、分成前收入、到账净现金不是同一个数。",
      },
      {
        key: "currency_def",
        label: "货币",
        hint: "报表用哪种货币。未选就保持空白，不要默认美元。",
      },
      {
        key: "timezone_def",
        label: "时区",
        hint: "按哪个时区切日。未选就保持空白。",
      },
      {
        key: "attribution_freshness",
        label: "归因新鲜度",
        hint: "多旧算延迟，由你来写。这里不预置小时数。",
      },
    ],
  },
  historical_replay: {
    kind: "historical_replay",
    floorId: "reconciliation",
    title: "历史回放",
    fields: [
      {
        key: "window_note",
        label: "回放哪一段",
        hint: "日期或版本范围。可以空着。这不是定时任务。",
      },
      {
        key: "question",
        label: "回放要检验的问题",
        hint: "一个问题即可。",
      },
      {
        key: "gaps",
        label: "已知的数据缺口",
        hint: "对不上或还没有的部分写在这里，不要补成 0。",
      },
      {
        key: "why_first",
        label: "为什么先做回放",
        hint: "在没有试点、没有花费许可时，回放是第一步。",
      },
    ],
  },
  hypothesis: {
    kind: "hypothesis",
    floorId: "analysis",
    title: "可检验假设",
    fields: [
      { key: "statement", label: "假设", hint: "写成可以对照观察的一句话。" },
      {
        key: "support",
        label: "什么观察会支持它",
        hint: "先写观察，不要写成已经发生的结果。",
      },
      {
        key: "weaken",
        label: "什么观察会削弱它",
        hint: "包括数据迟到、样本不够、口径没对齐。",
      },
      {
        key: "not_causal",
        label: "哪些结果只能说明相关",
        hint: "相关不能直接写成因果。",
      },
    ],
  },
  approval_boundaries: {
    kind: "approval_boundaries",
    floorId: "analysis",
    title: "审批边界",
    fields: [
      {
        key: "who_reviews",
        label: "谁复核草稿",
        hint: "写角色或职责。不要写私人邮箱。",
      },
      {
        key: "cannot_execute",
        label: "当前不能执行的事",
        hint: "发布、暂停、改预算都不在此执行。把你确认的边界写下来。",
      },
      {
        key: "human_decisions",
        label: "仍要真人决定的事",
        hint: "Bot 草稿不能代替这些决定。",
      },
    ],
  },
  manual_review: {
    kind: "manual_review",
    floorId: "analysis",
    title: "人工工时复核",
    fields: [
      {
        key: "what_to_check",
        label: "这一轮要人工核对什么",
        hint: "例如版本、口径、权利边界。",
      },
      {
        key: "why_manual",
        label: "为什么现在不自动化",
        hint: "没有连接的接口，就不能假装已经自动核对。",
      },
    ],
  },
  strategy_draft: {
    kind: "strategy_draft",
    floorId: "strategy",
    title: "策略草稿索引",
    fields: [
      {
        key: "gap",
        label: "策略正文还缺什么",
        hint: "正文写在二层的策略草稿里。这里只记缺口。",
      },
    ],
  },
  monitoring_rules: {
    kind: "monitoring_rules",
    floorId: "strategy",
    title: "监控规则设计",
    fields: [
      {
        key: "gap",
        label: "规则还缺什么",
        hint: "规则表默认是空的。空表合法，不预置阈值。",
      },
    ],
  },
  adjustment_proposal: {
    kind: "adjustment_proposal",
    floorId: "strategy",
    title: "调整提议",
    fields: [
      {
        key: "gap",
        label: "提议还缺什么",
        hint: "提议要带证据、替代方案和回退。暂停和预算也不能在这里执行。",
      },
    ],
  },
  before_after: {
    kind: "before_after",
    floorId: "analysis",
    title: "前后评估",
    fields: [
      { key: "question", label: "评估问题", hint: "评估哪一个变化。" },
      {
        key: "before_window",
        label: "前窗口如何定义",
        hint: "由你写范围。不要留一个假装的默认天数。",
      },
      {
        key: "after_window",
        label: "后窗口如何定义",
        hint: "和前窗口用同一套口径。",
      },
      {
        key: "ctr_vs_theme",
        label: "点击率与题材质量如何分开",
        hint: "点击率高，不能直接写成题材好。",
      },
    ],
  },
};

export const TASK_LIST = Object.values(TASKS);

export function tasksForFloor(floorId: FloorId) {
  return TASK_LIST.filter((task) => task.floorId === floorId);
}

export const STRATEGY_FIELDS: Array<{
  key: keyof StrategyDraft;
  label: string;
  hint: string;
}> = [
  {
    key: "marketEvidence",
    label: "市场证据",
    hint: "为什么是这一个市场。写已有的证据和还缺的证据。没有的数字留空。",
  },
  {
    key: "channelRationale",
    label: "渠道",
    hint: "为什么是这一个渠道。不要写成已经发生的投放结果。",
  },
  {
    key: "audience",
    label: "受众",
    hint: "这一轮打算对照的受众。没有样本就不要编一个人群规模。",
  },
  {
    key: "creativeHooks",
    label: "创意钩子",
    hint: "广告创意和正片卖点分开写。",
  },
  {
    key: "localization",
    label: "本地化",
    hint: "字幕、配音、封面、标题、落地文案各写到哪一步。",
  },
  {
    key: "landing",
    label: "落地",
    hint: "落地页或承接方式。没有链接也可以只写形态。",
  },
  {
    key: "monetizationPlan",
    label: "变现计划",
    hint: "只写选定的那一种：付费解锁、IAA 或授权。",
  },
  {
    key: "budgetProposal",
    label: "预算提议",
    hint: "这是提议，不是批准，也不是已经发生的花费。可以留空。",
  },
  {
    key: "experimentVariables",
    label: "实验变量",
    hint: "打算变动什么、固定什么。",
  },
  {
    key: "observation",
    label: "观察条件",
    hint: "看哪些指标、看多久、样本至少多大。不预置数字。",
  },
  {
    key: "stopConditions",
    label: "停止条件",
    hint: "什么情况下停止观察或建议人来决定。停止条件本身不会暂停广告。",
  },
];

export const SIGNAL_META: Record<SignalId, { label: string; text: string }> = {
  spend_anomaly: {
    label: "花费异常",
    text: "花费节奏相对你自己写下的基线偏离。基线不预置。",
  },
  acquisition_deterioration: {
    label: "获客或转化变差",
    text: "点击之后的转化或更后的行为变差。先排除追踪延迟。",
  },
  recoup_decline: {
    label: "回本变差",
    text: "回收变慢。先定义收入口径。未填写不是零。",
  },
  creative_fatigue: {
    label: "创意疲劳",
    text: "同一广告创意的反应变弱。广告创意和正片分集分开看。",
  },
  account_restriction: {
    label: "账户或广告限制",
    text: "账户、广告或落地受到平台限制。这里不能改账户，也不能解除限制。",
  },
  attribution_gap: {
    label: "归因延迟或缺失",
    text: "数据晚到或对不上。这是诊断前提，不是业务结论。",
  },
};

export const SEVERITY_META = {
  unset: "未设定",
  watch: "留意",
  review: "需要复核",
  pause_for_human: "建议停下来等人决定",
} as const;

export const PROPOSAL_META = {
  observe: "继续观察",
  creative: "调整创意",
  audience: "调整受众",
  placement: "调整版位",
  budget: "调整预算",
  pause: "暂停",
} as const;

export const ATTRIBUTION_META = {
  unreviewed: "未复核",
  delay_possible: "仍可能有延迟或缺失",
  delay_ruled_out: "草稿里认为已排除延迟",
  unknown: "无法判断",
} as const;

export const MARKET_OPTIONS = [
  { value: "", label: "尚未选定" },
  { value: "US", label: "美国" },
  { value: "ID", label: "印度尼西亚" },
  { value: "TH", label: "泰国" },
  { value: "BR", label: "巴西" },
  { value: "MX", label: "墨西哥" },
  { value: "JP", label: "日本" },
  { value: "KR", label: "韩国" },
  { value: "other", label: "其他" },
] as const;

export const CHANNEL_OPTIONS = [
  { value: "", label: "尚未选定" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "meta", label: "Meta" },
  { value: "other", label: "其他" },
] as const;

export const MONETIZATION_OPTIONS = [
  { value: "", label: "尚未选定" },
  { value: "paid_unlock", label: "付费解锁" },
  { value: "iaa", label: "应用内广告（IAA）" },
  { value: "licensing", label: "授权" },
] as const;

export const TIMEZONE_OPTIONS = [
  { value: "", label: "尚未选定" },
  { value: "UTC", label: "UTC" },
  { value: "America/Los_Angeles", label: "美国太平洋 America/Los_Angeles" },
  { value: "America/New_York", label: "美国东部 America/New_York" },
  { value: "America/Sao_Paulo", label: "圣保罗 America/Sao_Paulo" },
  { value: "Asia/Jakarta", label: "雅加达 Asia/Jakarta" },
  { value: "Asia/Bangkok", label: "曼谷 Asia/Bangkok" },
  { value: "Asia/Tokyo", label: "东京 Asia/Tokyo" },
  { value: "Asia/Seoul", label: "首尔 Asia/Seoul" },
] as const;

export function optionLabel(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? "未填写";
}

export function marketLabel(market: string, other: string): string {
  if (market === "other") return other.trim() ? other.trim() : "其他，未写明";
  return optionLabel(MARKET_OPTIONS, market);
}

export function channelLabel(channel: string, other: string): string {
  if (channel === "other") return other.trim() ? other.trim() : "其他，未写明";
  return optionLabel(CHANNEL_OPTIONS, channel);
}

export function ownerLabel(botId: string): string {
  if (!botId) return "未指定";
  const bot = BOTS.find((item) => item.id === (botId as BotId));
  return bot ? bot.name : "未知角色";
}
