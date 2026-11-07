import { describe, expect, it } from "vitest";

import { runtimeAdapter, runtimeCan } from "@/lib/adapter";
import { SEATS } from "@/lib/catalog";
import { createEmptyDraft } from "@/lib/defaults";
import { layoutPoints, VIEW, floorGeoms } from "@/lib/geometry";
import { buildHandoff, handoffViolations } from "@/lib/handoff";
import { reduceDraft, scopeDecisions } from "@/lib/reducer";
import { BOTS } from "@/lib/roster";
import { parseDraft, parseDraftText } from "@/lib/schema";
import { readDraft, STORAGE_KEY, writeDraft, type DraftStore } from "@/lib/storage";
import { blank } from "@/lib/text";
import type { Clock, StationDraft } from "@/lib/types";

const clock: Clock = {
  now: () => "2026-11-07T00:00:00.000Z",
  id: (() => {
    let n = 0;
    return () => `id-${String(++n).padStart(8, "0")}`;
  })(),
};

function fresh(): StationDraft {
  return createEmptyDraft(clock);
}

describe("roster and adapter", () => {
  it("lists only the six named roles and keeps three statuses apart", () => {
    expect(BOTS.map((bot) => bot.name)).toEqual([
      "出海准入",
      "海外投放策略",
      "投放监控",
      "选题反馈",
      "靓仔",
      "算盘",
    ]);
    expect(BOTS.map((bot) => bot.id)).toEqual([
      "a3f43d06-edd7-4d44-aea7-05d1145d455f",
      "3d525a99-8ea8-4b8e-8c49-a9f0beaf4826",
      "4ad5d110-75f1-4e81-96c4-7e824d968752",
      "fcf4ed11-2f2d-4115-96d8-0c14b6c2a1e8",
      "e87fd763-e240-4d1e-a4b2-a7b6d2ddc554",
      "b6f9bea7-4b55-424f-8ed4-bb07d68a01cf",
    ]);
    expect(runtimeAdapter.state).toBe("not_connected");
    expect(runtimeCan("dispatch")).toBe(false);
    expect(runtimeCan("readJobs")).toBe(false);
    expect(runtimeCan("executeAds")).toBe(false);
    expect(runtimeCan("monitorNetwork")).toBe(false);
  });

  it("puts the named seats on the specified floors", () => {
    expect(SEATS.filter((seat) => seat.floorId === "strategy").map((seat) => seat.short)).toEqual([
      "策略",
      "监控",
    ]);
    expect(SEATS.filter((seat) => seat.floorId === "analysis").map((seat) => seat.short)).toEqual([
      "统计",
      "协调",
    ]);
    expect(new Set(SEATS.map((seat) => seat.botId)).size).toBe(6);
  });
});

describe("blank is not zero", () => {
  it("renders an empty rule field as 未填写 and keeps a written zero", () => {
    expect(blank("")).toBe("未填写");
    expect(blank("   ")).toBe("未填写");
    expect(blank("0")).toBe("0");
  });
});

describe("schema", () => {
  it("accepts an empty draft and round-trips it", () => {
    const draft = fresh();
    const parsed = parseDraft(draft);
    expect(parsed.ok).toBe(true);
    const text = JSON.stringify(draft);
    const again = parseDraftText(text);
    expect(again.ok).toBe(true);
  });

  it("rejects numeric baselines, secrets, links, and enabled monitoring", () => {
    const draft = fresh();
    const withNumber = { ...draft, rules: [{ ...emptyRule(), baseline: 0 }] };
    const numeric = parseDraft(withNumber);
    expect(numeric.ok).toBe(false);
    if (!numeric.ok) expect(numeric.issues.join(" ")).toMatch(/不是 0|string/);

    const withSecret = structuredClone(draft) as Record<string, unknown>;
    withSecret.password = "nope";
    const secret = parseDraft(withSecret);
    expect(secret.ok).toBe(false);

    const withLink = structuredClone(draft);
    withLink.pilot.notes = "see grokbot://bot/abc";
    const link = parseDraft(withLink);
    expect(link.ok).toBe(false);

    const monitored = structuredClone(draft);
    monitored.monitoring = { scheduledEnabled: true, consentToNetwork: true } as never;
    const monitor = parseDraft(monitored);
    expect(monitor.ok).toBe(false);
    if (!monitor.ok) expect(monitor.issues.join("")).toContain("定时监控");
  });

  it("rejects oversized imports", () => {
    const huge = "x".repeat(400_001);
    const result = parseDraftText(huge);
    expect(result.ok).toBe(false);
  });
});

describe("reducer", () => {
  it("does not log a rejected secret and does not coerce currency", () => {
    const draft = fresh();
    const rejected = reduceDraft(
      draft,
      { type: "patch_pilot", key: "notes", value: "token=abc", record: true },
      clock,
    );
    expect(rejected.error).toBeTruthy();
    expect(rejected.draft.activity).toHaveLength(draft.activity.length);

    const badCurrency = reduceDraft(
      draft,
      { type: "patch_pilot", key: "currency", value: "usd", record: true },
      clock,
    );
    expect(badCurrency.draft.pilot.currency).toBe("USD");
  });

  it("refuses an activity kind outside the local-edit list", () => {
    const draft = fresh();
    expect(() =>
      reduceDraft(
        draft,
        { type: "log", kind: "job_completed" as never, summary: "完成了投放" },
        clock,
      ),
    ).toThrow(/不允许的活动类型/);
  });

  it("keeps scope decisions fixed where the pilot cannot start", () => {
    const items = scopeDecisions(fresh());
    expect(items.find((item) => item.id === "replay")?.state).toBe("fixed");
    expect(items.find((item) => item.id === "spend")?.state).toBe("fixed");
    expect(items.find((item) => item.id === "drama")?.state).toBe("open");
    expect(items.find((item) => item.id === "rules")?.state).toBe("optional");
  });
});

describe("handoff", () => {
  it("builds a manual paste for every roster bot without a dispatch link", () => {
    const draft = fresh();
    for (const bot of BOTS) {
      const floor = SEATS.find((seat) => seat.botId === bot.id)?.floorId ?? "admission";
      const text = buildHandoff(draft, bot.id, floor);
      expect(text).toContain(bot.name);
      expect(text).toContain(bot.id);
      expect(handoffViolations(text)).toEqual([]);
      expect(text).toContain("未填写");
      expect(text).not.toContain("grokbot://");
    }
  });
});

describe("storage", () => {
  it("round-trips a draft and holds invalid JSON without returning it as ready", () => {
    const memory = memoryStore();
    expect(readDraft(memory).status).toBe("empty");
    const draft = fresh();
    writeDraft(memory, draft);
    const loaded = readDraft(memory);
    expect(loaded.status).toBe("ready");
    memory.setItem(STORAGE_KEY, JSON.stringify({ hello: "no" }));
    const invalid = readDraft(memory);
    expect(invalid.status).toBe("invalid");
  });
});

describe("tower geometry", () => {
  it("keeps five floors inside the view, with higher floors above lower ones", () => {
    const floors = floorGeoms();
    expect(floors).toHaveLength(5);
    const points = layoutPoints();
    const outside = points.filter(
      (point) => point.x < 8 || point.y < 8 || point.x > VIEW.width - 8 || point.y > VIEW.height - 8,
    );
    expect(outside).toEqual([]);
    expect(floors[4].zFloor).toBeGreaterThan(floors[0].zFloor);
  });
});

function emptyRule() {
  return {
    id: "rule-0001",
    name: "",
    signal: "",
    baseline: "",
    threshold: "",
    minimumSample: "",
    sustainedWindow: "",
    severity: "unset",
    ownerBotId: "",
    dedup: "",
    clearCondition: "",
    notes: "",
    mode: "historical_manual",
  };
}

function memoryStore(): DraftStore {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}
