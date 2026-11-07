import { describe, expect, it } from "vitest";
import { createEngine, decideEngine, FIXED_SEED, resetEngine, roi, setPlaying, setSpeed, stepEngine, tickEngine, type Metrics, type Scenario } from "./engine";

function complete(scenario: Scenario, stop = false, seed = FIXED_SEED) {
  let state = createEngine(scenario, seed);
  for (let safety = 0; !state.completed && safety < 100; safety++) {
    state = state.decision ? decideEngine(state, stop && state.decision === "exception" ? "stop" : "approve") : stepEngine(state);
  }
  expect(state.completed).toBe(true);
  return state;
}
function untilDecision(state = createEngine()) {
  for (let safety = 0; !state.decision && safety < 50; safety++) state = stepEngine(state);
  return state;
}
describe("deterministic event engine", () => {
  it("reproduces the entire event chain from a fixed seed and varies samples for another seed", () => {
    const a = complete("normal");
    const b = complete("normal");
    expect(a).toEqual(b);
    expect(complete("normal", false, FIXED_SEED + 1).metrics).not.toEqual(a.metrics);
    expect(a.logs.filter(e => e.delta.impressions)).toHaveLength(4);
  });
  it("does not tick or mutate while paused; one step produces exactly one event", () => {
    const state = createEngine();
    const frozen = structuredClone(state);
    expect(tickEngine(state)).toBe(state);
    expect(state).toEqual(frozen);
    const stepped = stepEngine(state);
    expect(stepped.tick).toBe(1);
    expect(stepped.logs).toHaveLength(1);
    expect(stepped.playing).toBe(false);
    expect(state.tick).toBe(0);
    expect(tickEngine(setPlaying(stepped, true)).tick).toBe(2);
  });
  it("resets every engine field, including speed, samples, delivery, log and pending queue", () => {
    const completeState = setSpeed(setPlaying(complete("rework"), false), 4);
    expect(resetEngine(completeState)).toEqual(createEngine("rework"));
    expect(resetEngine(completeState, "anomaly")).toEqual(createEngine("anomaly"));
  });
  it("makes all three scenarios observably different", () => {
    const normal = complete("normal"), rework = complete("rework"), anomaly = complete("anomaly");
    expect(normal.logs.some(e => e.status === "rework")).toBe(false);
    expect(rework.logs.some(e => e.status === "rework")).toBe(true);
    expect(rework.artifacts.rework).toContain("v2");
    expect(anomaly.logs.some(e => e.status === "escalated")).toBe(true);
    expect(anomaly.artifacts.coordinator).toContain("协调单");
    expect(anomaly.metrics.spendCents).toBeGreaterThan(normal.metrics.spendCents);
    expect(rework.tick).toBeGreaterThan(normal.tick);
    expect(anomaly.tick).toBeGreaterThan(normal.tick);
    expect(rework.logs).not.toEqual(anomaly.logs);
    expect(normal.transition).toMatchObject({ from: "next", to: "strategy" });
    expect(normal.artifacts.feedback).toContain("知识卡片");
  });
  it.each(["normal", "rework", "anomaly"] as const)("derives every metric from the %s log and keeps sequential event ticks", scenario => {
    const state = complete(scenario);
    const sum = state.logs.reduce<Metrics>((total, event) => ({ spendCents: total.spendCents + event.delta.spendCents, revenueCents: total.revenueCents + event.delta.revenueCents, impressions: total.impressions + event.delta.impressions, clicks: total.clicks + event.delta.clicks }), { spendCents: 0, revenueCents: 0, impressions: 0, clicks: 0 });
    expect(state.metrics).toEqual(sum);
    expect(state.logs.map(e => e.tick)).toEqual(Array.from({ length: state.tick }, (_, i) => i + 1));
    expect(state.history).toHaveLength(state.tick);
    expect(roi(state.metrics)).toBe((sum.revenueCents - sum.spendCents) / sum.spendCents);
    expect(roi(createEngine().metrics)).toBeNull();
  });
  it("blocks both playback and stepping at real decision gates, and can return then resubmit", () => {
    const gate = untilDecision();
    expect(gate.playing).toBe(false);
    expect(stepEngine(gate)).toBe(gate);
    expect(tickEngine(setPlaying(gate, true))).toEqual(gate);
    expect(decideEngine(gate, "stop")).toBe(gate);
    const returned = decideEngine(gate, "revise");
    expect(returned.current).toBe("strategy");
    expect(returned.nodes.approval).toBe("rework");
    expect(returned.metrics.impressions).toBe(0);
    const gateAgain = untilDecision(returned);
    expect(gateAgain.decision).toBe("launch");
    expect(gateAgain.tick).toBe(gate.tick + 4);
    const approved = decideEngine(gateAgain, "approve");
    expect(approved.current).toBe("monitor");
    expect(approved.tick).toBe(gateAgain.tick + 1);
  });
  it("freezes anomaly samples pending approval; a user stop skips remaining samples but closes the loop", () => {
    let state = untilDecision(createEngine("anomaly"));
    state = untilDecision(decideEngine(state, "approve"));
    expect(state.decision).toBe("exception");
    const before = structuredClone(state.metrics);
    expect(tickEngine(setPlaying(state, true)).metrics).toEqual(before);
    expect(stepEngine(state).metrics).toEqual(before);
    const stopped = complete("anomaly", true);
    expect(stopped.logs.filter(e => e.delta.impressions)).toHaveLength(2);
    expect(stopped.metrics).toEqual(before);
    expect(stopped.artifacts.monitor).toContain("两批");
    expect(stopped.artifacts.approval).toContain("结束");
  });
});
