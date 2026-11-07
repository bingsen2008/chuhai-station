export const BOTS = [
  {
    id: "a3f43d06-edd7-4d44-aea7-05d1145d455f",
    name: "出海准入",
    role: "成片出海准入",
    group: "specialist",
    summary:
      "判断成片是否具备进入海外试验的权利、版本、本地化与数据权限条件。不连接素材库，也不批准花费。",
  },
  {
    id: "3d525a99-8ea8-4b8e-8c49-a9f0beaf4826",
    name: "海外投放策略",
    role: "海外投放策略",
    group: "specialist",
    summary:
      "起草一个市场、一个渠道、一种变现的策略：证据、受众、创意钩子、本地化、落地、预算提议、实验变量、观察与停止条件。",
  },
  {
    id: "4ad5d110-75f1-4e81-96c4-7e824d968752",
    name: "投放监控",
    role: "投放监控",
    group: "specialist",
    summary:
      "设计花费节奏、CPM、CTR、CPC、转化、分集留存、与变现匹配的收入指标和归因新鲜度规则。不执行暂停，也不改预算。",
  },
  {
    id: "fcf4ed11-2f2d-4115-96d8-0c14b6c2a1e8",
    name: "选题反馈",
    role: "选题与创意反馈",
    group: "specialist",
    summary:
      "把商业观察整理成选题与创意问题。相关不是因果，点击率不是题材质量。",
  },
  {
    id: "e87fd763-e240-4d1e-a4b2-a7b6d2ddc554",
    name: "靓仔",
    role: "协调",
    group: "support",
    summary:
      "协调各层草稿的范围、假设与审批边界。不代替花费批准，也不派发其他角色。",
  },
  {
    id: "b6f9bea7-4b55-424f-8ed4-bb07d68a01cf",
    name: "算盘",
    role: "数据、统计与成本",
    group: "support",
    summary:
      "负责对账与商业分析里的口径、关联键、成本与统计定义。未填写不是零。",
  },
] as const;

export type Bot = (typeof BOTS)[number];
export type BotId = Bot["id"];

export const BOT_IDS = BOTS.map((bot) => bot.id) as [BotId, ...BotId[]];

const BOT_BY_ID = new Map<string, Bot>(BOTS.map((bot) => [bot.id, bot]));

export function botById(id: string): Bot | null {
  return BOT_BY_ID.get(id) ?? null;
}

export const BOT_PRESENCE = {
  roleEstablished: true,
  authenticatedIntegration: false,
  runningJob: null,
  runtimeReadable: false,
} as const;
