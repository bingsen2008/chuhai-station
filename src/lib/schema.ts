import { z } from "zod";

import { TASKS } from "@/lib/catalog";
import { BOT_IDS } from "@/lib/roster";
import { LIMITS, sensitiveIssue } from "@/lib/text";
import {
  ACTIVITY_KINDS,
  ATTRIBUTION_CHECKS,
  CHANNELS,
  DOCUMENT_LABEL,
  FLOOR_IDS,
  MARKETS,
  MONETIZATION_MODELS,
  PROPOSAL_KINDS,
  SCHEMA_VERSION,
  SEVERITIES,
  SIGNALS,
  TASK_KINDS,
  TIMEZONES,
  type StationDraft,
} from "@/lib/types";

const shortText = z.string().max(LIMITS.short);
const longText = z.string().max(LIMITS.long);
const idText = z.string().regex(/^[A-Za-z0-9-]{8,80}$/);

const pilotSchema = z
  .object({
    dramaTitle: shortText,
    market: z.enum(MARKETS),
    marketOther: shortText,
    channel: z.enum(CHANNELS),
    channelOther: shortText,
    monetization: z.enum(MONETIZATION_MODELS),
    currency: z.string().regex(/^[A-Z]{3}$|^$/),
    timezone: z.enum(TIMEZONES),
    sourceLanguage: shortText,
    targetLanguage: shortText,
    contentVersion: shortText,
    episodeNote: shortText,
    notes: longText,
  })
  .strict();

const taskSchema = z
  .object({
    kind: z.enum(TASK_KINDS),
    values: z.record(z.string(), longText),
  })
  .strict();

const strategySchema = z
  .object({
    marketEvidence: longText,
    channelRationale: longText,
    audience: longText,
    creativeHooks: longText,
    localization: longText,
    landing: longText,
    monetizationPlan: longText,
    budgetProposal: longText,
    experimentVariables: longText,
    observation: longText,
    stopConditions: longText,
  })
  .strict();

export const ruleSchema = z
  .object({
    id: idText,
    name: shortText,
    signal: z.union([z.literal(""), z.enum(SIGNALS)]),
    baseline: longText,
    threshold: longText,
    minimumSample: longText,
    sustainedWindow: longText,
    severity: z.enum(SEVERITIES),
    ownerBotId: z.union([z.literal(""), z.enum(BOT_IDS)]),
    dedup: longText,
    clearCondition: longText,
    notes: longText,
    mode: z.literal("historical_manual"),
  })
  .strict();

const evidenceSchema = z
  .object({
    id: idText,
    floorId: z.enum(FLOOR_IDS),
    title: shortText,
    body: longText,
    sourceNote: longText,
    relatedRuleId: z.string().max(80),
  })
  .strict();

const proposalSchema = z
  .object({
    id: idText,
    floorId: z.enum(FLOOR_IDS),
    kind: z.union([z.literal(""), z.enum(PROPOSAL_KINDS)]),
    attributionCheck: z.enum(ATTRIBUTION_CHECKS),
    evidence: longText,
    alternatives: longText,
    rollback: longText,
    execution: z.literal("blocked"),
  })
  .strict();

const feedbackSchema = z
  .object({
    observations: longText,
    correlationNote: longText,
    causationNote: longText,
    ctrNote: longText,
    themeQualityNote: longText,
    separatedCorrelation: z.boolean(),
    separatedCtr: z.boolean(),
    nextCreativeQuestion: longText,
  })
  .strict();

const activitySchema = z
  .object({
    id: idText,
    at: z.string().min(4).max(40),
    kind: z.enum(ACTIVITY_KINDS),
    summary: z.string().min(1).max(LIMITS.summary),
  })
  .strict();

const monitoringSchema = z
  .object({
    scheduledEnabled: z.literal(false),
    consentToNetwork: z.literal(false),
  })
  .strict();

const draftSchema = z
  .object({
    documentLabel: z.literal(DOCUMENT_LABEL),
    schemaVersion: z.literal(SCHEMA_VERSION),
    pilot: pilotSchema,
    tasks: z.array(taskSchema).length(TASK_KINDS.length),
    strategy: strategySchema,
    rules: z.array(ruleSchema).max(LIMITS.rules),
    evidence: z.array(evidenceSchema).max(LIMITS.evidence),
    proposals: z.array(proposalSchema).max(LIMITS.proposals),
    feedback: feedbackSchema,
    activity: z.array(activitySchema).min(1).max(LIMITS.activity),
    monitoring: monitoringSchema,
  })
  .strict()
  .superRefine((draft, ctx) => {
    const kinds = draft.tasks.map((task) => task.kind);
    if (new Set(kinds).size !== kinds.length) {
      ctx.addIssue({ code: "custom", message: "计划任务种类重复", input: draft });
    }
    for (const kind of TASK_KINDS) {
      if (!kinds.includes(kind)) {
        ctx.addIssue({
          code: "custom",
          message: `缺少计划任务：${TASKS[kind].title}`,
          input: draft,
        });
      }
    }
    for (const task of draft.tasks) {
      const allowed = new Set(TASKS[task.kind].fields.map((field) => field.key));
      for (const key of Object.keys(task.values)) {
        if (!allowed.has(key)) {
          ctx.addIssue({
            code: "custom",
            message: `${TASKS[task.kind].title}含有未知字段`,
            input: draft,
          });
        }
      }
      for (const field of TASKS[task.kind].fields) {
        if (!(field.key in task.values)) {
          ctx.addIssue({
            code: "custom",
            message: `${TASKS[task.kind].title}缺少字段`,
            input: draft,
          });
        }
      }
    }
    const ruleIds = draft.rules.map((rule) => rule.id);
    if (new Set(ruleIds).size !== ruleIds.length) {
      ctx.addIssue({ code: "custom", message: "规则编号重复", input: draft });
    }
  });

const FORBIDDEN_KEY =
  /^(password|passwd|secret|token|accesstoken|refreshtoken|apikey|api_key|authorization|credential|credentials|cookie|session|privatekey|__proto__|prototype|constructor)$/i;

function walk(value: unknown, path: string, issues: string[]) {
  if (typeof value === "string") {
    const problem = sensitiveIssue(value);
    if (problem) issues.push(path ? `${path}：${problem}` : problem);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 500) issues.push(`${path || "列表"}过长`);
    value.forEach((item, index) => walk(item, `${path}[${index}]`, issues));
    return;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length > 80) issues.push(`${path || "对象"}字段过多`);
    for (const key of keys) {
      if (FORBIDDEN_KEY.test(key)) issues.push(`不允许的字段：${key}`);
      walk((value as Record<string, unknown>)[key], path ? `${path}.${key}` : key, issues);
    }
  }
}

export type ParseResult =
  | { ok: true; draft: StationDraft }
  | { ok: false; issues: string[] };

export function parseDraft(input: unknown): ParseResult {
  const issues: string[] = [];
  walk(input, "", issues);
  if (issues.length > 0) return { ok: false, issues: unique(issues).slice(0, 12) };
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: unique(
        parsed.error.issues.map((issue) => {
          const path = issue.path.join(".");
          if (issue.message.includes("expected false")) {
            return "定时监控和后台同意不能被打开。当前没有配置、同意或可连接的运行时。";
          }
          if (issue.message.includes("expected string, received number")) {
            return path
              ? `${path}必须是文本。空着不是 0，数字 0 也要写成字符串。`
              : "数字不能代替文本。空着不是 0。";
          }
          return path ? `${path}：${issue.message}` : issue.message;
        }),
      ).slice(0, 12),
    };
  }
  return { ok: true, draft: parsed.data };
}

export function parseDraftText(text: string): ParseResult {
  if (byteLength(text) > LIMITS.importBytes) {
    return { ok: false, issues: [`文件超过 ${LIMITS.importBytes / 1000}KB 上限`] };
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, issues: ["不是合法的 JSON"] };
  }
  return parseDraft(data);
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
