"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FLOORS } from "@/lib/catalog";
import { FLOOR_IDS, type FloorId } from "@/lib/types";

export const EXPERIENCE_KEY = "chuhai-station.experience.v1";
const statuses = ["待开始", "进行中", "待验收", "已通过"] as const;
type Progress = Record<FloorId, number>;
const emptyProgress = (): Progress => Object.fromEntries(FLOOR_IDS.map(id => [id, 0])) as Progress;
const deliverables: Record<FloorId, string> = {
  admission: "示例成片：权利范围、字幕版本与准入清单已整理（模拟）。",
  strategy: "示例策略：单一市场与渠道、创意假设和停止条件已整理（模拟）。",
  reconciliation: "示例对账：关联键、归因窗口与收入核算口径已整理（模拟）。",
  analysis: "示例分析：可检验假设与人工复核问题已整理（模拟）。",
  feedback: "示例反馈：选题观察与下一轮创意问题已整理（模拟）。",
};

export function Onboarding({ floorId, onFloor, onConfigure }: {
  floorId: FloorId | null;
  onFloor: (id: FloorId) => void;
  onConfigure: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [guide, setGuide] = useState(true);
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [storageNotice, setStorageNotice] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(EXPERIENCE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved.guide !== "boolean" || !FLOOR_IDS.every(id => Number.isInteger(saved.progress?.[id]) && saved.progress[id] >= 0 && saved.progress[id] <= 3)) throw new Error("invalid");
        setGuide(saved.guide);
        setProgress(Object.fromEntries(FLOOR_IDS.map(id => [id, saved.progress[id]])) as Progress);
      }
    } catch {
      setStorageNotice("无法读取演示进度，已使用空白进度；仍可在本页体验。");
    }
    setReady(true);
  }, []);

  function save(nextGuide: boolean, nextProgress: Progress) {
    setGuide(nextGuide);
    setProgress(nextProgress);
    try {
      localStorage.setItem(EXPERIENCE_KEY, JSON.stringify({ guide: nextGuide, progress: nextProgress }));
      setStorageNotice("");
    } catch {
      setStorageNotice("演示进度未能保存，刷新后可能丢失；当前操作仍有效。");
    }
  }

  const selected = floorId ?? "admission";
  const status = progress[selected];
  const next = FLOOR_IDS.find(id => progress[id] !== 3);

  function advance() {
    const value = Math.min(3, status + 1);
    save(guide, { ...progress, [selected]: value });
    toast(`${FLOORS[selected].name}：${statuses[value]}（本地演示）`);
  }

  return (
    <section aria-label="新手起步与演示任务" className="mx-auto max-w-[1440px] px-3 pt-4 sm:px-6">
      <div className="rounded-2xl border border-[#b6c9bf] bg-[#fbf7ef] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium">从这里开始</h2>
          <Button variant="outline" disabled={!ready} onClick={() => { save(!guide, progress); toast(guide ? "已跳过引导，可随时重开" : "已重开新手引导"); }}>
            {guide ? "跳过引导" : "重开引导"}
          </Button>
        </div>
        <p className="mt-2 text-sm font-medium text-[#6e3b28]">演示数据，未连接真实业务</p>
        <p className="text-sm leading-6">仅在当前浏览器保存。真实投放、统计、Bot 派发与消息发送：未接入。请勿填写私人资料。</p>
        {guide && (
          <ol className="my-3 grid list-inside list-decimal gap-2 text-sm leading-6 sm:grid-cols-3">
            <li>先编辑试点配置，填写非私人工作标题与试验范围。<Button className="ml-2" variant="outline" onClick={onConfigure}>去配置</Button></li>
            <li>从 01 成片准入开始，点击楼层查看职责，点击席位了解专业 Bot 分工。</li>
            <li>体验下方演示任务：开始 → 生成示例 → 人工验收。草稿编辑入口仍在楼层详情中。</li>
          </ol>
        )}
        <div className="mt-3 grid gap-3 border-t border-border pt-3 md:grid-cols-[1fr_1fr]">
          <div>
            <h3 className="font-medium">{FLOORS[selected].number} {FLOORS[selected].name} · 演示任务</h3>
            <p className="mt-1 text-sm" role="status">当前状态：{statuses[status]} · 已通过 {FLOOR_IDS.filter(id => progress[id] === 3).length}/5 层</p>
            <p className="mt-1 text-sm leading-6">{status < 2 ? "暂无交付物。开始任务后，生成一份固定示例用于体验验收。" : deliverables[selected]}</p>
            {status === 2 && <p className="mt-1 text-sm">验收标准：示例包含本层所需清单或口径，并标注模拟。请阅读后选择通过或退回。</p>}
            {status === 3 && <p className="mt-1 text-sm">本地人工演示验收已通过，可继续下一层或重做。</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {status < 3 && <Button disabled={!ready} onClick={advance}>{["开始演示任务", "生成示例并提交验收", "验收通过（演示）"][status]}</Button>}
            {status === 2 && <Button variant="outline" onClick={() => { save(guide, { ...progress, [selected]: 1 }); toast("已退回修改（本地演示），请重新生成示例"); }}>退回修改</Button>}
            {status === 3 && <Button variant="outline" onClick={() => { save(guide, { ...progress, [selected]: 0 }); toast("本层演示已重置"); }}>重做本层演示</Button>}
            {next && next !== selected && <Button variant="outline" onClick={() => onFloor(next)}>继续：{FLOORS[next].name}</Button>}
            {!next && <span className="text-sm">五层演示已完成；可在楼层详情继续编辑自己的工作草稿。</span>}
          </div>
        </div>
        {storageNotice && <p role="alert" className="mt-2 text-sm">{storageNotice}</p>}
      </div>
    </section>
  );
}
