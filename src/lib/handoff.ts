import {
  FLOORS,
  MONETIZATION_OPTIONS,
  SEATS,
  STRATEGY_FIELDS,
  TASKS,
  TIMEZONE_OPTIONS,
  channelLabel,
  marketLabel,
  optionLabel,
} from "@/lib/catalog";
import { runtimeAdapter } from "@/lib/adapter";
import { botById } from "@/lib/roster";
import { blank, clip } from "@/lib/text";
import type { FloorId, StationDraft, StrategyDraft } from "@/lib/types";
import { taskValue } from "@/lib/reducer";

const FIELD_CAP = 420;

export function buildHandoff(
  draft: StationDraft,
  botId: string,
  floorId: FloorId,
): string {
  const bot = botById(botId);
  const floor = FLOORS[floorId];
  const seats = SEATS.filter((seat) => seat.botId === botId && seat.floorId === floorId);
  const lines = [
    "【出海实验站 · 手动交接】",
    "这不是派发，也没有发送。请你自己打开对应 Bot 的对话，确认名称后再粘贴。",
    "",
    `目标名称：${bot?.name ?? "名册中没有这个编号"}`,
    `角色：${bot?.role ?? "未知"}`,
    `名册编号：${botId}`,
    `所在楼层：${floor.number} ${floor.name}`,
    `席位：${seats.map((seat) => seat.seat).join("、") || "未指定席位"}`,
    "角色状态：已建立（来自名册，不是运行时查询）",
    "认证集成：未连接",
    "运行中任务：无。没有可读的运行时，不能当成在岗或已完成。",
    `运行时适配：${runtimeAdapter.state}`,
    "",
    "试点草稿摘要（只含非敏感配置；空着写成未填写，不是 0）：",
    `- 短剧工作标题：${blank(draft.pilot.dramaTitle)}`,
    `- 市场：${marketLabel(draft.pilot.market, draft.pilot.marketOther)}`,
    `- 渠道：${channelLabel(draft.pilot.channel, draft.pilot.channelOther)}`,
    `- 变现模型：${optionLabel(MONETIZATION_OPTIONS, draft.pilot.monetization)}`,
    `- 货币：${blank(draft.pilot.currency)}`,
    `- 时区：${optionLabel(TIMEZONE_OPTIONS, draft.pilot.timezone)}`,
    `- 源语言：${blank(draft.pilot.sourceLanguage)}`,
    `- 目标语言：${blank(draft.pilot.targetLanguage)}`,
    `- 版本标签：${blank(draft.pilot.contentVersion)}`,
    `- 集数备注：${blank(draft.pilot.episodeNote)}`,
    "- 阶段：历史回放优先",
    "- 花费许可：无",
    "- 试点：尚未进入。即便范围已写明，也没有开始投放。",
    "",
    "请处理的草稿范围：",
    floor.purpose,
    "",
    ...sectionLines(draft, floorId),
    "",
    "边界：",
    "- 未填写不是 0，也不要自行补数。",
    "- 先排除追踪或归因延迟，再写业务判断。",
    "- 相关不是因果。点击率不是题材质量。",
    "- 不要执行发布、暂停或预算变更。当前没有授权，也没有可连接的投放接口。",
    "- 这份文本停在剪贴板和对话里，实验站不会替你发送。",
  ];
  return lines.join("\n");
}

function sectionLines(draft: StationDraft, floorId: FloorId): string[] {
  if (floorId === "strategy") {
    const strategy = STRATEGY_FIELDS.map(
      (field) => `- ${field.label}：${clip(blank(draft.strategy[field.key as keyof StrategyDraft]), FIELD_CAP)}`,
    );
    const rules =
      draft.rules.length === 0
        ? ["- 监控规则：还没有。空表不是告警，也没有默认阈值。"]
        : draft.rules.map(
            (rule) =>
              `- 规则草稿 ${blank(rule.name)}：信号 ${rule.signal || "未选"}；基线 ${blank(rule.baseline)}；阈值 ${blank(rule.threshold)}；最小样本 ${blank(rule.minimumSample)}；持续窗口 ${blank(rule.sustainedWindow)}；严重程度 ${rule.severity}；评估方式仅历史回放人工对照。`,
          );
    const proposals =
      draft.proposals.length === 0
        ? ["- 调整提议：还没有。"]
        : draft.proposals.map(
            (item) =>
              `- 提议 ${item.kind || "未选"}：归因复核 ${item.attributionCheck}；证据 ${clip(blank(item.evidence), FIELD_CAP)}；替代 ${clip(blank(item.alternatives), FIELD_CAP)}；回退 ${clip(blank(item.rollback), FIELD_CAP)}；执行状态：不可执行。`,
          );
    return ["策略草稿：", ...strategy, "监控规则草稿：", ...rules, "调整提议草稿：", ...proposals];
  }

  if (floorId === "feedback") {
    return [
      "选题反馈草稿：",
      `- 观察：${clip(blank(draft.feedback.observations), FIELD_CAP)}`,
      `- 相关：${clip(blank(draft.feedback.correlationNote), FIELD_CAP)}`,
      `- 因果：${clip(blank(draft.feedback.causationNote), FIELD_CAP)}`,
      `- 点击率：${clip(blank(draft.feedback.ctrNote), FIELD_CAP)}`,
      `- 题材质量：${clip(blank(draft.feedback.themeQualityNote), FIELD_CAP)}`,
      `- 已分开写相关与因果：${draft.feedback.separatedCorrelation ? "是" : "否"}`,
      `- 已分开写点击率与题材质量：${draft.feedback.separatedCtr ? "是" : "否"}`,
      `- 下一个创意问题：${clip(blank(draft.feedback.nextCreativeQuestion), FIELD_CAP)}`,
    ];
  }

  const tasks = Object.values(TASKS).filter((task) => task.floorId === floorId);
  if (tasks.length === 0) return ["这一层没有计划任务。"];
  return tasks.flatMap((task) => [
    `${task.title}：`,
    ...task.fields.map(
      (field) => `- ${field.label}：${clip(blank(taskValue(draft, task.kind, field.key)), FIELD_CAP)}`,
    ),
  ]);
}

export function handoffViolations(text: string): string[] {
  const issues: string[] = [];
  if (!text.includes("手动交接")) issues.push("缺少手动交接标记");
  if (!text.includes("这不是派发")) issues.push("缺少非派发声明");
  if (/grokbot:\/\//i.test(text)) issues.push("含有不允许的链接");
  if (/已派发|正在投放|ROI|在线/.test(text)) issues.push("含有虚假执行或在线表述");
  return issues;
}
