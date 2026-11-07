"use client";

import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FLOORS, seatsOn } from "@/lib/catalog";
import { parseDraftText } from "@/lib/schema";
import { pilotScopeLabel } from "@/lib/reducer";
import { LIMITS } from "@/lib/text";
import { FLOOR_IDS, type FloorId } from "@/lib/types";
import type { StationDraft } from "@/lib/types";
import { DraftProvider, useDraft } from "@/components/station/draft-context";
import {
  AccountingEditor,
  EvidenceEditor,
  FeedbackEditor,
  PilotEditor,
  ProposalEditor,
  ReplayEditor,
  RosterTable,
  RuleEditor,
  StrategyDesk,
  TaskEditor,
} from "@/components/station/editors";
import {
  ActivityPanel,
  DecisionPanel,
  FloorBrief,
  ReadinessPanel,
  SpecialistPanel,
  type FloorAction,
} from "@/components/station/panels";
import { Tower } from "@/components/station/tower";

const actionClass = "h-11 px-3";

type SheetView =
  | { type: "pilot" }
  | { type: "roster" }
  | { type: "tasks"; floorId: FloorId | "all" }
  | { type: "strategy" }
  | { type: "rules" }
  | { type: "proposals" }
  | { type: "accounting" }
  | { type: "replay" }
  | { type: "evidence"; floorId: FloorId }
  | { type: "feedback" };

export function DraftWorkspace() {
  return (
    <TooltipProvider>
      <DraftProvider>
        <Station />
        <Toaster position="bottom-center" duration={2500} visibleToasts={1} />
      </DraftProvider>
    </TooltipProvider>
  );
}

function Station() {
  const { draft, persistence, loadIssues, formError, editingLocked, replaceWithBlank, importDraft, exportText } =
    useDraft();
  const [floorId, setFloorId] = useState<FloorId | null>(null);
  const [seatId, setSeatId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetView | null>(null);
  const [live, setLive] = useState("正在看整栋实验塔");
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const [pendingImport, setPendingImport] = useState<StationDraft | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const importId = useId();
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (document.querySelector("[data-slot='sheet-content'], [data-slot='dialog-content']")) return;
      if (/^[1-5]$/.test(event.key)) {
        const next = FLOOR_IDS[Number(event.key) - 1];
        chooseFloor(next);
        document.querySelector<HTMLElement>(`[data-testid="tower-floor-${next}"]`)?.focus();
        event.preventDefault();
        return;
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const index = floorId ? FLOORS[floorId].index : null;
        const nextIndex =
          event.key === "ArrowUp"
            ? index === null
              ? 0
              : Math.min(FLOOR_IDS.length - 1, index + 1)
            : index === null
              ? FLOOR_IDS.length - 1
              : Math.max(0, index - 1);
        const next = FLOOR_IDS[nextIndex];
        chooseFloor(next);
        document.querySelector<HTMLElement>(`[data-testid="tower-floor-${next}"]`)?.focus();
        event.preventDefault();
        return;
      }
      if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && floorId) {
        const seats = seatsOn(floorId);
        if (seats.length === 0) return;
        const current = seats.findIndex((seat) => seat.id === seatId);
        const delta = event.key === "ArrowRight" ? 1 : -1;
        const next = seats[(current + delta + seats.length) % seats.length];
        chooseSeat(next.id);
        document.querySelector<HTMLElement>(`[data-testid="tower-seat-${next.id}"]`)?.focus();
        event.preventDefault();
        return;
      }
      if (event.key === "Escape") {
        if (seatId) {
          setSeatId(null);
          setLive(`返回 ${FLOORS[floorId ?? "admission"].name}`);
        } else if (floorId) {
          setFloorId(null);
          setLive("正在看整栋实验塔");
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [floorId, seatId]);

  function chooseFloor(id: FloorId) {
    setFloorId(id);
    setSeatId(null);
    setLive(`聚焦 ${FLOORS[id].number} ${FLOORS[id].name}`);
    toast(`已选择 ${FLOORS[id].number} ${FLOORS[id].name}，职责与操作见楼层详情`);
  }

  function chooseSeat(id: string) {
    const seatFloor = FLOOR_IDS.find((floor) => seatsOn(floor).some((seat) => seat.id === id));
    if (seatFloor) setFloorId(seatFloor);
    setSeatId(id);
    setLive(`打开席位 ${id}`);
    toast("已打开专业席位详情；Bot 运行时未接入");
    if (window.matchMedia("(max-width: 1023px)").matches) {
      document.getElementById("context-panel")?.scrollIntoView({ block: "start" });
    }
  }

  function openSheet(next: SheetView) {
    if (editingLocked && next.type !== "roster") { toast("草稿暂不可编辑，请先处理上方存储提示"); return; }
    setSheet(next);
  }

  function openFloorAction(action: FloorAction) {
    if (!floorId) return;
    if (action === "tasks" || action === "analysis-tasks") openSheet({ type: "tasks", floorId });
    if (action === "strategy") openSheet({ type: "strategy" });
    if (action === "rules") openSheet({ type: "rules" });
    if (action === "proposals") openSheet({ type: "proposals" });
    if (action === "accounting") openSheet({ type: "accounting" });
    if (action === "replay") openSheet({ type: "replay" });
    if (action === "evidence") openSheet({ type: "evidence", floorId });
    if (action === "feedback") openSheet({ type: "feedback" });
  }

  async function onImportFile(file: File | undefined) {
    if (!file || editingLocked) return;
    if (file.size > LIMITS.importBytes) {
      setImportIssues([`文件超过 ${LIMITS.importBytes / 1000}KB 上限，没有导入。`]);
      return;
    }
    let text: string;
    try { text = await readFileText(file); } catch { setImportIssues(["文件读取失败，请重新选择 JSON 文件。"]); return; }
    const parsed = parseDraftText(text);
    if (!parsed.ok) {
      setImportIssues(parsed.issues);
      setPendingImport(null);
      return;
    }
    setImportIssues([]);
    setPendingImport(parsed.draft);
  }

  function downloadExport() {
    const text = exportText();
    if (!text) return;
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "haichu-experiment-station-draft.json";
    anchor.click();
    URL.revokeObjectURL(url);
    toast("已导出本地草稿。文件里没有花费执行记录。");
  }

  const floorList = [...FLOOR_IDS];

  return (
    <div className="station-shell min-h-screen">
      <a href="#tower" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2">
        跳到实验塔
      </a>
      <header className="border-b border-[#d9d0c0] bg-[#f7f3ea]/95 px-3 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Mark />
            <div>
              <p className="text-[11px] tracking-[0.22em] text-[#8a6233]">TIDE STATION</p>
              <h1 className="font-heading text-3xl leading-none text-[#1d4e55] sm:text-4xl">本地草稿工作台</h1>
              <p className="mt-1 text-sm text-[#3d4c52]">短剧出海商业化试点台</p>
            </div>
          </div>
          <div className="flex max-w-full flex-wrap gap-2 text-xs">
            <StatusChip>{pilotScopeLabel(draft)}</StatusChip>
            <StatusChip>花费许可：无</StatusChip>
            <StatusChip>运行时：未连接</StatusChip>
            <StatusChip>仅本地草稿</StatusChip>
          </div>
        </div>
        <p className="mx-auto mt-3 max-w-[1440px] text-sm leading-6 text-[#3d4c52]">
          成片准入 → 海外策略与试验 → 归因和收入对账 → 商业分析 → 选题反馈。本地修改不会派发 Bot，不会批准花费，也不会执行投放。
        </p>
        {formError ? (
          <p role="alert" className="mx-auto mt-3 max-w-[1440px] rounded-xl bg-[#f3e4d6] px-3 py-2 text-sm text-[#6e3b28]">
            {formError}
          </p>
        ) : null}
      </header>

      {persistence === "held" ? (
        <div className="bg-[#f3e4d6] px-3 py-3 text-sm leading-6 text-[#6e3b28] sm:px-6" role="alert">
          <p className="mx-auto max-w-[1440px]">
            这台浏览器里的草稿没有通过校验，页面先用一份未写入的空白提纲。原来的内容还留着，直到你选择覆盖或清除。
          </p>
          <ul className="mx-auto mt-2 max-w-[1440px] list-disc pl-5">
            {loadIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
          <div className="mx-auto mt-3 flex max-w-[1440px] flex-wrap gap-2">
            <Button
              type="button"
              className={actionClass}
              onClick={() => replaceWithBlank("用空白提纲替换了读不出来的本地草稿")}
            >
              改用空白草稿并覆盖
            </Button>
            <Button
              type="button"
              variant="outline"
              className={actionClass}
              onClick={() => replaceWithBlank("清除了读不出来的本地内容，并重新建立空提纲")}
            >
              清除损坏内容
            </Button>
          </div>
        </div>
      ) : null}


      <div className="mx-auto grid max-w-[1440px] gap-4 px-3 py-4 lg:grid-cols-[280px_minmax(0,1fr)_340px] lg:px-5">
        <div className="grid content-start gap-3">
          <nav aria-label="楼层" className="grid grid-cols-2 gap-2 pb-1 lg:flex lg:flex-col">
            <button
              type="button"
              aria-pressed={floorId === null}
              className={floorChip(floorId === null)}
              onClick={() => {
                setFloorId(null);
                setSeatId(null);
                setLive("正在看整栋实验塔");
              }}
            >
              <span className="font-heading text-lg">全</span>
              <span>
                <span className="block text-sm font-medium">整栋</span>
                <span className="block text-xs opacity-80">五层都看得见</span>
              </span>
            </button>
            {floorList.map((id) => {
              const floor = FLOORS[id];
              const selected = floorId === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  className={floorChip(selected)}
                  onClick={() => chooseFloor(id)}
                >
                  <span className="font-heading text-lg">{floor.number}</span>
                  <span>
                    <span className="block text-sm font-medium">{floor.name}</span>
                    <span className="block text-xs opacity-80">第 {floor.index + 1} 步 · {seatsOn(id).length} 个席位</span>
                  </span>
                </button>
              );
            })}
          </nav>
          <section className="rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
            <h2 className="text-sm font-medium">试点配置</h2>
            <p className="mt-1 text-sm leading-6">{pilotScopeLabel(draft)}</p>
            <p className="text-xs leading-5 text-muted-foreground">
              工作标题：{draft.pilot.dramaTitle.trim() || "未填写"}
            </p>
            <Button
              type="button"
              className={`${actionClass} mt-3`}
              disabled={editingLocked}
              onClick={() => openSheet({ type: "pilot" })}
            >
              编辑试点配置
            </Button>
          </section>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className={actionClass} onClick={() => openSheet({ type: "roster" })}>
              名册
            </Button>
            <Button
              type="button"
              variant="outline"
              className={actionClass}
              disabled={editingLocked}
              onClick={() => openSheet({ type: "tasks", floorId: "all" })}
            >
              全部计划任务
            </Button>
            <Button type="button" variant="outline" className={actionClass} disabled={editingLocked} onClick={downloadExport}>
              导出
            </Button>
            <Button
              type="button"
              variant="outline"
              className={actionClass}
              disabled={editingLocked}
              onClick={() => importRef.current?.click()}
            >
              导入
            </Button>
            <input
              ref={importRef}
              id={importId}
              data-testid="import-input"
              className="sr-only"
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                void onImportFile(file);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="ghost"
              className={actionClass}
              disabled={editingLocked}
              onClick={() => setConfirmClear(true)}
            >
              清空草稿
            </Button>
          </div>
          {importIssues.length > 0 ? (
            <div role="alert" className="rounded-xl bg-[#f3e4d6] px-3 py-2 text-sm leading-6 text-[#6e3b28]">
              <p>没有导入。本地草稿保持原样。</p>
              <ul className="mt-1 list-disc pl-4">
                {importIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-xs leading-5 text-muted-foreground">
            键盘：1 到 5 选层，↑↓ 上下层，←→ 席位，Esc 返回。手机上可点楼层和席位。
          </p>
        </div>

        <main id="tower" className="min-w-0">
          <div className="overflow-hidden rounded-[28px] shadow-[0_30px_70px_-46px_rgba(18,42,48,0.85)] ring-1 ring-[#0f2c33]">
            <Tower
              floorId={floorId}
              seatId={seatId}
              onFloor={chooseFloor}
              onSeat={chooseSeat}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
            <p className="max-w-xl text-sm leading-6 text-[#3d4c52]">
              {floorId
                ? `${FLOORS[floorId].number} ${FLOORS[floorId].name}。${FLOORS[floorId].purpose}`
                : "整栋塔。从码头一层收成片，到顶层把观察送回选题。点击一层会把它拉近。"}
            </p>
            <p className="text-xs text-muted-foreground">没有实时花费、回收数字或在岗人数。</p>
          </div>
        </main>

        <aside id="context-panel" className="grid content-start gap-5">
          {seatId ? (
            <SpecialistPanel seatId={seatId} onBack={() => setSeatId(null)} />
          ) : floorId ? (
            <FloorBrief floorId={floorId} onSeat={chooseSeat} onOpen={openFloorAction} />
          ) : (
            <>
              <ReadinessPanel />
              <DecisionPanel />
            </>
          )}
          <ActivityPanel />
        </aside>
      </div>
      <p className="sr-only" aria-live="polite">
        {live}
      </p>

      <Sheet open={sheet !== null} onOpenChange={(open) => { if (!open) setSheet(null); }}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:w-[min(720px,100%)] sm:max-w-[720px]">
          <SheetHeader className="sticky top-0 z-10 border-b border-border bg-popover pr-12">
            <SheetTitle className="font-heading text-2xl">{sheetTitle(sheet)}</SheetTitle>
            <SheetDescription>
              写在这里的内容只留在这台浏览器。它不会派发 Bot，不会批准花费，也不会执行投放。
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 p-4 pb-16">{sheetBody(sheet)}</div>
        </SheetContent>
      </Sheet>

      <Dialog open={pendingImport !== null} onOpenChange={(open) => { if (!open) setPendingImport(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>用这份文件替换本地草稿？</DialogTitle>
            <DialogDescription>
              只影响这台浏览器。文件已通过校验。工作标题：{pendingImport?.pilot.dramaTitle.trim() || "未填写"}。规则 {pendingImport?.rules.length ?? 0} 条。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className={actionClass} onClick={() => setPendingImport(null)}>
              不替换
            </Button>
            <Button
              type="button"
              className={actionClass}
              onClick={() => {
                if (!pendingImport) return;
                const ok = importDraft(pendingImport);
                if (ok) {
                  setPendingImport(null);
                  toast("已导入校验通过的草稿。没有派发，也没有执行投放。");
                }
              }}
            >
              替换本地草稿
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>清空这台浏览器里的草稿？</DialogTitle>
            <DialogDescription>会重新建立空提纲。不会联系 Bot，也不会改动任何广告账户。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className={actionClass} onClick={() => setConfirmClear(false)}>
              留下
            </Button>
            <Button
              type="button"
              variant="destructive"
              className={actionClass}
              onClick={() => {
                replaceWithBlank("清空了本地草稿，并重新建立空提纲");
                setConfirmClear(false);
                setFloorId(null);
                setSeatId(null);
              }}
            >
              清空
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("读取失败"));
    reader.readAsText(file);
  });
}

function sheetTitle(sheet: SheetView | null): string {
  if (!sheet) return "草稿";
  if (sheet.type === "pilot") return "试点配置";
  if (sheet.type === "roster") return "角色名册";
  if (sheet.type === "tasks") return sheet.floorId === "all" ? "全部计划任务" : `${FLOORS[sheet.floorId].name}的计划任务`;
  if (sheet.type === "strategy") return "策略、规则与提议";
  if (sheet.type === "rules") return "监控规则设计";
  if (sheet.type === "proposals") return "调整提议";
  if (sheet.type === "accounting") return "关联键与核算口径";
  if (sheet.type === "replay") return "历史回放";
  if (sheet.type === "evidence") return `${FLOORS[sheet.floorId].name}的证据`;
  return "选题反馈";
}

function sheetBody(sheet: SheetView | null) {
  if (!sheet) return null;
  if (sheet.type === "pilot") return <PilotEditor />;
  if (sheet.type === "roster") return <RosterTable />;
  if (sheet.type === "tasks") return <TaskEditor floorId={sheet.floorId} />;
  if (sheet.type === "strategy") return <StrategyDesk />;
  if (sheet.type === "rules") return <RuleEditor />;
  if (sheet.type === "proposals") return <ProposalEditor />;
  if (sheet.type === "accounting") return <AccountingEditor />;
  if (sheet.type === "replay") return <ReplayEditor />;
  if (sheet.type === "evidence") return <EvidenceEditor floorId={sheet.floorId} />;
  return <FeedbackEditor />;
}

function floorChip(selected: boolean): string {
  return [
    "flex min-h-11 min-w-0 shrink-0 items-center gap-3 rounded-2xl border px-3 py-2 text-left lg:w-full lg:min-w-0",
    selected
      ? "border-[#1d4e55] bg-[#1d4e55] text-[#f6f1e6]"
      : "border-[#d9d0c0] bg-[#fbf7ef] text-[#1c2a30]",
  ].join(" ");
}

function StatusChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-7 items-center rounded-full bg-[#efe4d0] px-2.5 py-1 text-[#3d2a12]">
      {children}
    </span>
  );
}

function Mark() {
  return (
    <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true" className="shrink-0">
      <rect width="46" height="46" rx="14" fill="#1d4e55" />
      <rect x="12" y="8" width="4" height="30" rx="2" fill="#f0d7a6" />
      <circle cx="30" cy="16" r="7" fill="#e39b3a" />
      <path d="M20 33h16" stroke="#f6f1e6" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 38h30" stroke="#8fccc0" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
