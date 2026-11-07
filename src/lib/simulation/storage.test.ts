import { describe, expect, it } from "vitest";
import { createEngine, decideEngine, setPlaying, setSpeed, stepEngine, type EngineState } from "./engine";
import { freshSession, LEGACY_EXPERIENCE_KEY, loadSession, restoreSession, saveSession, SCHEMA_VERSION, SIM_STORAGE_KEY, type Session } from "./storage";
function store() {
  const map = new Map<string, string>();
  return { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
}
function progress(scenario: "normal" | "rework" | "anomaly", finish = false): EngineState {
  let state = createEngine(scenario);
  for (let i = 0; i < (finish ? 100 : 14) && !state.completed; i++) state = state.decision ? decideEngine(state, "approve") : stepEngine(state);
  return state;
}
describe("complete versioned simulation persistence", () => {
  it.each(["normal", "rework", "anomaly"] as const)("round-trips every %s state field and always resumes paused", scenario => {
    for (const finish of [false, true]) {
      const engine = setSpeed(setPlaying(progress(scenario, finish), true), 4);
      const session: Session = { engine, view: "tower", guide: false };
      const memory = store();
      expect(saveSession(memory, session)).toBe(true);
      expect(JSON.parse(memory.getItem(SIM_STORAGE_KEY)!).schemaVersion).toBe(SCHEMA_VERSION);
      expect(loadSession(memory).session).toEqual({ ...session, engine: { ...engine, playing: false } });
    }
  });
  it("restores decision gates, returned strategies and explicit stops consistently", () => {
    let engine = createEngine("anomaly");
    for (let i = 0; i < 50 && engine.decision !== "exception"; i++) engine = engine.decision ? decideEngine(engine, "approve") : stepEngine(engine);
    for (const state of [engine, decideEngine(engine, "stop")]) {
      const memory = store();
      saveSession(memory, { engine: state, guide: true, view: "flow" });
      expect(loadSession(memory).session.engine).toEqual(state);
    }
    let gate = createEngine();
    while (!gate.decision) gate = stepEngine(gate);
    const memory = store();
    const returned = decideEngine(gate, "revise");
    saveSession(memory, { engine: returned, guide: false, view: "flow" });
    expect(loadSession(memory).session.engine).toEqual(returned);
  });
  it("migrates only the old guide preference and resets incompatible partial progress", () => {
    const memory = store();
    memory.setItem(LEGACY_EXPERIENCE_KEY, JSON.stringify({ guide: false, progress: { admission: 3 } }));
    memory.setItem("haichu-experiment-station.draft.v1", '{"pilot":{"dramaTitle":"旧标题"}}');
    const result = loadSession(memory);
    expect(result.session).toEqual({ ...freshSession(), guide: false });
    expect(result.notice).toContain("明确复位");
    expect(memory.getItem("haichu-experiment-station.draft.v1")).toContain("旧标题");
    memory.setItem(LEGACY_EXPERIENCE_KEY, "broken");
    expect(loadSession(memory).session).toEqual(freshSession());
  });
  it("rejects corrupted JSON, unknown versions, altered samples, missing artifacts and impossible history as a whole", () => {
    const memory = store();
    saveSession(memory, { ...freshSession(), engine: progress("normal", true) });
    const raw = memory.getItem(SIM_STORAGE_KEY)!;
    expect(restoreSession("{")).toBeNull();
    for (const mutate of [
      (v: Record<string, unknown>) => { v.schemaVersion = 99; },
      (v: Record<string, unknown>) => { (v.engine as EngineState).metrics.impressions++; },
      (v: Record<string, unknown>) => { (v.engine as EngineState).artifacts = {}; },
      (v: Record<string, unknown>) => { (v.engine as EngineState).current = "admission"; },
      (v: Record<string, unknown>) => { (v.engine as EngineState).history.push("approve"); },
    ]) {
      const value = JSON.parse(raw); mutate(value);
      const broken = JSON.stringify(value);
      expect(restoreSession(broken)).toBeNull();
      memory.setItem(SIM_STORAGE_KEY, broken);
      expect(loadSession(memory).session).toEqual(freshSession());
      expect(loadSession(memory).notice).toContain("完整复位");
    }
  });
  it("handles unavailable storage and write failures without crashing", () => {
    const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("full"); } };
    expect(loadSession(blocked).session).toEqual(freshSession());
    expect(loadSession(blocked).notice).toContain("存储不可用");
    expect(saveSession(blocked, freshSession())).toBe(false);
  });
});
