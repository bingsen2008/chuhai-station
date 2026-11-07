import { TASK_LIST } from "@/lib/catalog";
import type { ActivityKind, Clock, StationDraft, StrategyDraft, TaskKind } from "@/lib/types";
import { DOCUMENT_LABEL, SCHEMA_VERSION } from "@/lib/types";

export function emptyStrategy(): StrategyDraft {
  return {
    marketEvidence: "",
    channelRationale: "",
    audience: "",
    creativeHooks: "",
    localization: "",
    landing: "",
    monetizationPlan: "",
    budgetProposal: "",
    experimentVariables: "",
    observation: "",
    stopConditions: "",
  };
}

export function emptyTaskValues(kind: TaskKind): Record<string, string> {
  const task = TASK_LIST.find((item) => item.kind === kind);
  if (!task) return {};
  return Object.fromEntries(task.fields.map((field) => [field.key, ""]));
}

export function createEmptyDraft(
  clock: Clock,
  event: {
    kind: Extract<ActivityKind, "draft_initialized" | "draft_cleared">;
    summary: string;
  } = {
    kind: "draft_initialized",
    summary: "在这台浏览器建立了一份空草稿",
  },
): StationDraft {
  return {
    documentLabel: DOCUMENT_LABEL,
    schemaVersion: SCHEMA_VERSION,
    pilot: {
      dramaTitle: "",
      market: "",
      marketOther: "",
      channel: "",
      channelOther: "",
      monetization: "",
      currency: "",
      timezone: "",
      sourceLanguage: "",
      targetLanguage: "",
      contentVersion: "",
      episodeNote: "",
      notes: "",
    },
    tasks: TASK_LIST.map((task) => ({
      kind: task.kind,
      values: emptyTaskValues(task.kind),
    })),
    strategy: emptyStrategy(),
    rules: [],
    evidence: [],
    proposals: [],
    feedback: {
      observations: "",
      correlationNote: "",
      causationNote: "",
      ctrNote: "",
      themeQualityNote: "",
      separatedCorrelation: false,
      separatedCtr: false,
      nextCreativeQuestion: "",
    },
    activity: [
      {
        id: clock.id(),
        at: clock.now(),
        kind: event.kind,
        summary: event.summary,
      },
    ],
    monitoring: {
      scheduledEnabled: false,
      consentToNetwork: false,
    },
  };
}
