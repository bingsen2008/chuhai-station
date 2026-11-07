export const LIMITS = {
  short: 160,
  long: 4000,
  summary: 300,
  rules: 40,
  evidence: 60,
  proposals: 40,
  activity: 200,
  importBytes: 400_000,
  handoff: 12_000,
} as const;

const ID_PATTERN = /^[A-Za-z0-9-]{8,80}$/;

export function blank(value: string | null | undefined): string {
  if (typeof value !== "string") return "未填写";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "未填写";
}

export function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

export function isDraftId(value: string): boolean {
  return ID_PATTERN.test(value);
}

export function sensitiveIssue(value: string): string | null {
  if (/grokbot:\/\//i.test(value)) {
    return "不能写入 grokbot 链接。交接要自己到对应 Bot 的对话里粘贴。";
  }
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)) {
    return "不要写入邮箱。";
  }
  if (
    /(?:api[_-]?key|access[_-]?token|\btoken|password|passwd|secret|bearer)\s*[:=]\s*\S+/i.test(
      value,
    )
  ) {
    return "不要写入口令、密钥或令牌。";
  }
  if (/^\+[\d\s()-]{8,}$/.test(value.trim())) {
    return "不要写入电话号码。";
  }
  if (/^\d{11,}$/.test(value.replace(/[\s-]/g, ""))) {
    return "不要写入电话或一长串账号数字。";
  }
  return null;
}

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `local-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 12)}`;
}

export function clip(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}
