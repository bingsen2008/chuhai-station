"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FLOORS, SEATS, seatsOn } from "@/lib/catalog";
import { runtimeAdapter } from "@/lib/adapter";
import { buildHandoff } from "@/lib/handoff";
import { pilotScopeLabel, scopeDecisions } from "@/lib/reducer";
import { BOT_PRESENCE, botById } from "@/lib/roster";
import { blank } from "@/lib/text";
import type { FloorId } from "@/lib/types";
import { useDraft } from "@/components/station/draft-context";
import { Stamp } from "@/components/station/fields";

const actionClass = "h-11 px-3";

const READINESS = [
  ["角色名册", "6 个指定角色均已建立", "established"],
  ["认证集成", "未连接", "closed"],
  ["运行中任务", "无", "closed"],
  ["Bot 运行时", "没有可调用的接口", "closed"],
  ["广告接口", "未连接", "closed"],
  ["收入接口", "未连接", "closed"],
  ["花费执行", "无许可，且不能在此执行", "closed"],
  ["后台监控", "未启用。未配置、未同意，页面不发起网络监控", "closed"],
  ["交接方式", "只能手动复制文本，自己粘贴到 Bot 对话", "manual"],
] as const;

export function ReadinessPanel() {
  return (
    <section aria-label="未连接就绪清单" className="grid gap-3">
      <header>
        <h2 className="font-heading text-xl text-[#1d4e55]">未连接就绪清单</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{runtimeAdapter.reason}</p>
      </header>
      <ul className="grid gap-2">
        {READINESS.map(([label, value, tone]) => (
          <li key={label} className="flex items-start justify-between gap-3 rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10">
            <span className="text-sm">{label}</span>
            <Stamp tone={tone}>{value}</Stamp>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DecisionPanel() {
  const { draft } = useDraft();
  const items = scopeDecisions(draft);
  return (
    <section aria-label="首要范围决策" className="grid gap-3">
      <header>
        <h2 className="font-heading text-xl text-[#1d4e55]">先决定的范围</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          这些是草稿填写情况，不是试点进度，也不是花费进度。
        </p>
      </header>
      <ul className="grid gap-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{item.label}</p>
              <Stamp tone={item.state}>
                {item.state === "fixed" ? "已固定" : item.state === "written" ? "已写" : item.state === "optional" ? "可空" : "未写"}
              </Stamp>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ActivityPanel() {
  const { draft, persistence } = useDraft();
  const [expanded, setExpanded] = useState(false);
  const events = [...draft.activity].reverse();
  const visible = expanded ? events : events.slice(0, 6);
  return (
    <section aria-label="本地活动" data-testid="activity-log" className="grid gap-3">
      <header>
        <h2 className="font-heading text-xl text-[#1d4e55]">本地活动</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          只记录这台浏览器里的草稿改动、复制交接文本、导入和导出。不会出现投放执行或 Bot 完成任务。
        </p>
      </header>
      {persistence === "booting" ? <p className="text-sm">正在读取这台浏览器里的草稿。</p> : null}
      {persistence !== "booting" && events.length === 0 ? (
        <p className="text-sm text-muted-foreground">还没有本地操作。</p>
      ) : null}
      <ol className="grid gap-2">
        {persistence === "booting"
          ? null
          : visible.map((event) => (
              <li key={event.id} className="rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10">
                <p className="text-sm">{event.summary}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatStamp(event.at)} · {ACTIVITY_LABEL[event.kind]}
                </p>
              </li>
            ))}
      </ol>
      {events.length > 6 ? (
        <Button type="button" variant="outline" className={actionClass} onClick={() => setExpanded((value) => !value)}>
          {expanded ? "收起" : `查看全部 ${events.length} 条`}
        </Button>
      ) : null}
    </section>
  );
}

export function FloorBrief({
  floorId,
  onSeat,
  onOpen,
}: {
  floorId: FloorId;
  onSeat: (id: string) => void;
  onOpen: (view: FloorAction) => void;
}) {
  const floor = FLOORS[floorId];
  const seats = seatsOn(floorId);
  return (
    <section className="grid gap-3" aria-label={`${floor.number} ${floor.name}`}>
      <header>
        <p className="text-xs tracking-[0.18em] text-[#8a6233]">{floor.number}</p>
        <h2 className="font-heading text-2xl text-[#1d4e55]">{floor.name}</h2>
        <p className="mt-1 text-sm leading-6">{floor.purpose}</p>
      </header>
      <div className="grid gap-2">
        {seats.map((seat) => {
          const bot = botById(seat.botId);
          return (
            <button
              key={seat.id}
              type="button"
              className="min-h-11 rounded-xl bg-card px-3 py-2 text-left ring-1 ring-foreground/10 hover:ring-[#1d4e55]"
              onClick={() => onSeat(seat.id)}
            >
              <span className="block text-sm font-medium">{seat.seat} · {bot?.name}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{bot?.role} · 认证集成未连接</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {actionsFor(floorId).map((action) => (
          <Button key={action.label} type="button" variant="secondary" className={actionClass} onClick={() => onOpen(action.view)}>
            {action.label}
          </Button>
        ))}
      </div>
    </section>
  );
}

export type FloorAction =
  | "tasks"
  | "strategy"
  | "rules"
  | "proposals"
  | "accounting"
  | "replay"
  | "evidence"
  | "feedback"
  | "analysis-tasks";

function actionsFor(floorId: FloorId): Array<{ label: string; view: FloorAction }> {
  if (floorId === "admission") return [{ label: "本层计划任务", view: "tasks" }];
  if (floorId === "strategy") {
    return [
      { label: "策略草稿", view: "strategy" },
      { label: "监控规则", view: "rules" },
      { label: "调整提议", view: "proposals" },
    ];
  }
  if (floorId === "reconciliation") {
    return [
      { label: "核算口径", view: "accounting" },
      { label: "历史回放", view: "replay" },
      { label: "证据", view: "evidence" },
    ];
  }
  if (floorId === "analysis") return [{ label: "假设与评估", view: "analysis-tasks" }, { label: "证据", view: "evidence" }];
  return [{ label: "选题反馈", view: "feedback" }, { label: "证据", view: "evidence" }];
}

export function SpecialistPanel({
  seatId,
  onBack,
}: {
  seatId: string;
  onBack: () => void;
}) {
  const seat = SEATS.find((item) => item.id === seatId);
  const { draft, dispatch, editingLocked } = useDraft();
  const [copyState, setCopyState] = useState("");
  if (!seat) return null;
  const bot = botById(seat.botId);
  if (!bot) return null;
  const handoff = buildHandoff(draft, bot.id, seat.floorId);
  const sameBotSeats = SEATS.filter((item) => item.botId === bot.id);

  async function copy() {
    try {
      await navigator.clipboard.writeText(handoff);
      if (!editingLocked) {
        dispatch({
          type: "log",
          kind: "handoff_copied",
          summary: `复制了给「${bot?.name ?? "角色"}」的手动交接文本`,
        });
      }
      setCopyState("已复制。文本还在这台浏览器里，没有发送给 Bot。");
    } catch {
      setCopyState("没能写入剪贴板。请从下面的文本框手动选择复制。");
    }
  }

  return (
    <section id="specialist-panel" data-testid="specialist-panel" className="grid gap-3" aria-label={`${bot.name}席位`}>
      <button type="button" className="min-h-11 text-left text-sm text-[#1d4e55] underline-offset-4 hover:underline" onClick={onBack}>
        返回 {FLOORS[seat.floorId].number} {FLOORS[seat.floorId].name}
      </button>
      <header>
        <p className="text-xs tracking-[0.16em] text-[#8a6233]">{seat.seat}</p>
        <h2 className="font-heading text-2xl">{bot.name}</h2>
        <p className="text-sm text-muted-foreground">{bot.role}</p>
      </header>
      <p className="text-sm leading-6">{bot.summary}</p>
      <p className="text-sm leading-6">{seat.note}</p>
      {sameBotSeats.length > 1 ? (
        <p className="text-sm leading-6 text-muted-foreground">
          这个角色还有席位：{sameBotSeats.map((item) => `${FLOORS[item.floorId].number}${item.seat}`).join("、")}。多个席位不是多个正在运行的任务。
        </p>
      ) : null}
      <dl className="grid gap-2 text-sm">
        <StatusRow label="角色" value={BOT_PRESENCE.roleEstablished ? "已建立 · 来自名册，不是运行时查询" : "未建立"} />
        <StatusRow label="认证集成" value={BOT_PRESENCE.authenticatedIntegration ? "已连接" : "未连接"} />
        <StatusRow
          label="运行中任务"
          value={
            BOT_PRESENCE.runningJob === null
              ? "无。没有可读的运行时，不能显示为在岗、空闲或已完成。"
              : "有任务"
          }
        />
      </dl>
      <p className="break-all text-xs text-muted-foreground">名册编号 {bot.id}</p>
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">手动交接</h3>
          <Stamp tone="manual">不派发</Stamp>
        </div>
        <textarea
          readOnly
          data-testid="handoff-text"
          value={handoff}
          className="min-h-40 w-full rounded-xl border border-input bg-card p-3 text-xs leading-5"
          aria-label={`${bot.name}的手动交接文本`}
        />
        <Button type="button" className={actionClass} onClick={() => void copy()}>
          复制交接文本
        </Button>
        {copyState ? <p className="text-sm" role="status">{copyState}</p> : null}
        <p className="text-xs leading-5 text-muted-foreground">
          复制只发生在这台浏览器。请你自己打开「{bot.name}」的对话再粘贴。实验站不会发送。
        </p>
      </div>
      <p className="text-xs text-muted-foreground">试点：{pilotScopeLabel(draft)} · 工作标题 {blank(draft.pilot.dramaTitle)}</p>
    </section>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 leading-6">{value}</dd>
    </div>
  );
}

const ACTIVITY_LABEL = {
  draft_initialized: "建立草稿",
  draft_cleared: "清空草稿",
  pilot_updated: "试点草稿",
  task_updated: "计划任务",
  strategy_updated: "策略草稿",
  feedback_updated: "选题反馈",
  rule_created: "新增规则",
  rule_updated: "修改规则",
  rule_deleted: "删除规则",
  evidence_created: "新增证据",
  evidence_updated: "修改证据",
  evidence_deleted: "删除证据",
  proposal_created: "新增提议",
  proposal_updated: "修改提议",
  proposal_deleted: "删除提议",
  handoff_copied: "复制交接",
  exported: "导出",
  imported: "导入",
} as const;

function formatStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
