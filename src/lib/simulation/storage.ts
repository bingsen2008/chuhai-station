import { z } from "zod";
import { createEngine, runCommand, SCENARIOS, setSpeed, SPEEDS, type EngineState } from "./engine";

export const SIM_STORAGE_KEY = "chuhai-station.flow-simulation.v2";
export const LEGACY_EXPERIENCE_KEY = "chuhai-station.experience.v1";
export const SCHEMA_VERSION = 2;
export type View = "flow" | "tower";
export type Session = { engine: EngineState; guide: boolean; view: View };
type Store = Pick<Storage, "getItem" | "setItem">;
const header = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  guide: z.boolean(), view: z.enum(["flow", "tower"]),
  engine: z.object({
    scenario: z.enum(Object.keys(SCENARIOS) as ["normal", "rework", "anomaly"]),
    seed: z.number().int().min(0).max(0xffffffff),
    speed: z.union(SPEEDS.map(speed => z.literal(speed))),
    playing: z.boolean(), history: z.array(z.enum(["step", "approve", "revise", "stop"])).max(2000),
  }).passthrough(),
}).strict();
export const freshSession = (): Session => ({ engine: createEngine(), guide: true, view: "flow" });

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
/** Verify the whole snapshot by deterministic replay; never restore mixed partial fields. */
export function restoreSession(raw: string): Session | null {
  try {
    if (raw.length > 2_000_000) return null;
    const parsed = header.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const { engine, guide, view } = parsed.data;
    let rebuilt = createEngine(engine.scenario, engine.seed);
    for (const command of engine.history) {
      const next = runCommand(rebuilt, command);
      if (next.tick !== rebuilt.tick + 1) return null;
      rebuilt = next;
    }
    rebuilt = setSpeed(rebuilt, engine.speed);
    if (canonical({ ...engine, playing: false }) !== canonical(rebuilt)) return null;
    return { engine: rebuilt, guide, view };
  } catch { return null; }
}
export function saveSession(store: Store, session: Session): boolean {
  try {
    store.setItem(SIM_STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, ...session }));
    return true;
  } catch { return false; }
}
export function loadSession(store: Store): { session: Session; notice: string } {
  try {
    const raw = store.getItem(SIM_STORAGE_KEY);
    if (raw) {
      const session = restoreSession(raw);
      return session
        ? { session, notice: "已完整恢复上次演示，恢复时已暂停。" }
        : { session: freshSession(), notice: "保存的演示版本或状态不兼容，已完整复位；旧草稿不受影响。" };
    }
    const old = store.getItem(LEGACY_EXPERIENCE_KEY);
    const session = freshSession();
    if (old) {
      try { const data = JSON.parse(old); if (typeof data?.guide === "boolean") session.guide = data.guide; } catch { /* Ignore malformed legacy data. */ }
      return { session, notice: "已升级流程演示：仅沿用引导偏好，旧版分层进度已明确复位；旧草稿不受影响。" };
    }
    return { session, notice: "" };
  } catch { return { session: freshSession(), notice: "浏览器存储不可用。本页可继续演示，刷新后将复位。" }; }
}
