export const SCHEMA_VERSION = 1 as const;

export const DOCUMENT_LABEL = "出海实验站本地草稿" as const;

export const FLOOR_IDS = [
  "admission",
  "strategy",
  "reconciliation",
  "analysis",
  "feedback",
] as const;

export type FloorId = (typeof FLOOR_IDS)[number];

export const TASK_KINDS = [
  "prepare_scope",
  "rights_permissions",
  "source_inventory",
  "linkage_accounting",
  "historical_replay",
  "hypothesis",
  "approval_boundaries",
  "manual_review",
  "strategy_draft",
  "monitoring_rules",
  "adjustment_proposal",
  "before_after",
] as const;

export type TaskKind = (typeof TASK_KINDS)[number];

export const SIGNALS = [
  "spend_anomaly",
  "acquisition_deterioration",
  "recoup_decline",
  "creative_fatigue",
  "account_restriction",
  "attribution_gap",
] as const;

export type SignalId = (typeof SIGNALS)[number];

export const SEVERITIES = ["unset", "watch", "review", "pause_for_human"] as const;

export type Severity = (typeof SEVERITIES)[number];

export const PROPOSAL_KINDS = [
  "observe",
  "creative",
  "audience",
  "placement",
  "budget",
  "pause",
] as const;

export type ProposalKind = (typeof PROPOSAL_KINDS)[number];

export const ATTRIBUTION_CHECKS = [
  "unreviewed",
  "delay_possible",
  "delay_ruled_out",
  "unknown",
] as const;

export type AttributionCheck = (typeof ATTRIBUTION_CHECKS)[number];

export const MONETIZATION_MODELS = ["", "paid_unlock", "iaa", "licensing"] as const;

export type MonetizationModel = (typeof MONETIZATION_MODELS)[number];

export const MARKETS = ["", "US", "ID", "TH", "BR", "MX", "JP", "KR", "other"] as const;

export type MarketCode = (typeof MARKETS)[number];

export const CHANNELS = ["", "tiktok", "youtube", "meta", "other"] as const;

export type ChannelCode = (typeof CHANNELS)[number];

export const TIMEZONES = [
  "",
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "America/Sao_Paulo",
  "Asia/Jakarta",
  "Asia/Bangkok",
  "Asia/Tokyo",
  "Asia/Seoul",
] as const;

export type TimezoneCode = (typeof TIMEZONES)[number];

export const ACTIVITY_KINDS = [
  "draft_initialized",
  "draft_cleared",
  "pilot_updated",
  "task_updated",
  "strategy_updated",
  "feedback_updated",
  "rule_created",
  "rule_updated",
  "rule_deleted",
  "evidence_created",
  "evidence_updated",
  "evidence_deleted",
  "proposal_created",
  "proposal_updated",
  "proposal_deleted",
  "handoff_copied",
  "exported",
  "imported",
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export type PilotDraft = {
  dramaTitle: string;
  market: MarketCode;
  marketOther: string;
  channel: ChannelCode;
  channelOther: string;
  monetization: MonetizationModel;
  currency: string;
  timezone: TimezoneCode;
  sourceLanguage: string;
  targetLanguage: string;
  contentVersion: string;
  episodeNote: string;
  notes: string;
};

export type TaskDraft = {
  kind: TaskKind;
  values: Record<string, string>;
};

export type StrategyDraft = {
  marketEvidence: string;
  channelRationale: string;
  audience: string;
  creativeHooks: string;
  localization: string;
  landing: string;
  monetizationPlan: string;
  budgetProposal: string;
  experimentVariables: string;
  observation: string;
  stopConditions: string;
};

export type RuleDraft = {
  id: string;
  name: string;
  signal: SignalId | "";
  baseline: string;
  threshold: string;
  minimumSample: string;
  sustainedWindow: string;
  severity: Severity;
  ownerBotId: string;
  dedup: string;
  clearCondition: string;
  notes: string;
  mode: "historical_manual";
};

export type EvidenceDraft = {
  id: string;
  floorId: FloorId;
  title: string;
  body: string;
  sourceNote: string;
  relatedRuleId: string;
};

export type ProposalDraft = {
  id: string;
  floorId: FloorId;
  kind: ProposalKind | "";
  attributionCheck: AttributionCheck;
  evidence: string;
  alternatives: string;
  rollback: string;
  execution: "blocked";
};

export type FeedbackDraft = {
  observations: string;
  correlationNote: string;
  causationNote: string;
  ctrNote: string;
  themeQualityNote: string;
  separatedCorrelation: boolean;
  separatedCtr: boolean;
  nextCreativeQuestion: string;
};

export type ActivityEvent = {
  id: string;
  at: string;
  kind: ActivityKind;
  summary: string;
};

export type MonitoringLock = {
  scheduledEnabled: false;
  consentToNetwork: false;
};

export type StationDraft = {
  documentLabel: typeof DOCUMENT_LABEL;
  schemaVersion: typeof SCHEMA_VERSION;
  pilot: PilotDraft;
  tasks: TaskDraft[];
  strategy: StrategyDraft;
  rules: RuleDraft[];
  evidence: EvidenceDraft[];
  proposals: ProposalDraft[];
  feedback: FeedbackDraft;
  activity: ActivityEvent[];
  monitoring: MonitoringLock;
};

export type Clock = {
  now: () => string;
  id: () => string;
};
