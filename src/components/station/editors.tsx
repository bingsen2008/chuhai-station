"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ATTRIBUTION_META,
  CHANNEL_OPTIONS,
  FLOORS,
  MARKET_OPTIONS,
  MONETIZATION_OPTIONS,
  PROPOSAL_META,
  SEVERITY_META,
  SIGNAL_META,
  STRATEGY_FIELDS,
  TASKS,
  TIMEZONE_OPTIONS,
  tasksForFloor,
} from "@/lib/catalog";
import { BOTS } from "@/lib/roster";
import { runtimeCan } from "@/lib/adapter";
import { blank, newId } from "@/lib/text";
import type { FloorId, ProposalDraft, RuleDraft, StrategyDraft, TaskKind } from "@/lib/types";
import { taskValue } from "@/lib/reducer";
import { useDraft } from "@/components/station/draft-context";
import { AreaField, Callout, SelectField, TextField } from "@/components/station/fields";

const actionClass = "h-11 px-3";

export function PilotEditor() {
  const { draft, dispatch, editingLocked } = useDraft();
  const pilot = draft.pilot;
  const commit = (key: keyof typeof pilot, value: string, record: boolean) => {
    dispatch({ type: "patch_pilot", key, value, record });
  };
  return (
    <div className="grid gap-4">
      <Callout title="这只写入这台浏览器">
        保存试点配置不会提交试点，不会申请花费，也不会派发 Bot。候选市场和渠道只是便于填写，不是策略结论。
      </Callout>
      <TextField
        id="drama-title"
        label="短剧工作标题"
        hint="只写标题。不要写权利人姓名、邮箱或账号。"
        value={pilot.dramaTitle}
        disabled={editingLocked}
        onCommit={(value, record) => commit("dramaTitle", value, record)}
      />
      <SelectField
        id="market"
        label="一个市场"
        hint="这一轮只选一个。"
        value={pilot.market}
        disabled={editingLocked}
        options={MARKET_OPTIONS}
        onChange={(value) => commit("market", value, true)}
      />
      {pilot.market === "other" ? (
        <TextField
          id="market-other"
          label="其他市场"
          value={pilot.marketOther}
          disabled={editingLocked}
          onCommit={(value, record) => commit("marketOther", value, record)}
        />
      ) : null}
      <SelectField
        id="channel"
        label="一个渠道"
        value={pilot.channel}
        disabled={editingLocked}
        options={CHANNEL_OPTIONS}
        onChange={(value) => commit("channel", value, true)}
      />
      {pilot.channel === "other" ? (
        <TextField
          id="channel-other"
          label="其他渠道"
          value={pilot.channelOther}
          disabled={editingLocked}
          onCommit={(value, record) => commit("channelOther", value, record)}
        />
      ) : null}
      <SelectField
        id="monetization"
        label="一种变现模型"
        value={pilot.monetization}
        disabled={editingLocked}
        options={MONETIZATION_OPTIONS}
        onChange={(value) => commit("monetization", value, true)}
      />
      <TextField
        id="currency"
        label="货币"
        hint="留空，或写三位大写字母。不要默认成某一种货币。"
        value={pilot.currency}
        disabled={editingLocked}
        placeholder="未填写"
        onCommit={(value, record) => commit("currency", value, record)}
      />
      <SelectField
        id="timezone"
        label="时区"
        hint="以后对齐报表时用。现在没有报表连接。"
        value={pilot.timezone}
        disabled={editingLocked}
        options={TIMEZONE_OPTIONS}
        onChange={(value) => commit("timezone", value, true)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="source-language"
          label="源语言"
          value={pilot.sourceLanguage}
          disabled={editingLocked}
          onCommit={(value, record) => commit("sourceLanguage", value, record)}
        />
        <TextField
          id="target-language"
          label="目标语言"
          value={pilot.targetLanguage}
          disabled={editingLocked}
          onCommit={(value, record) => commit("targetLanguage", value, record)}
        />
      </div>
      <TextField
        id="content-version"
        label="版本标签"
        value={pilot.contentVersion}
        disabled={editingLocked}
        onCommit={(value, record) => commit("contentVersion", value, record)}
      />
      <TextField
        id="episode-note"
        label="集数备注"
        hint="不知道就留空。不要写成 0。"
        value={pilot.episodeNote}
        disabled={editingLocked}
        onCommit={(value, record) => commit("episodeNote", value, record)}
      />
      <AreaField
        id="pilot-notes"
        label="备注"
        value={pilot.notes}
        disabled={editingLocked}
        onCommit={(value, record) => commit("notes", value, record)}
      />
      <dl className="grid gap-2 rounded-xl bg-muted px-3 py-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt>阶段</dt>
          <dd>历史回放优先，不能在此改成实盘</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>花费许可</dt>
          <dd>无</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>广告 / 收入接口</dt>
          <dd>未连接</dd>
        </div>
      </dl>
    </div>
  );
}

export function TaskEditor({ floorId }: { floorId: FloorId | "all" }) {
  const tasks =
    floorId === "all"
      ? Object.values(TASKS)
      : tasksForFloor(floorId);
  return (
    <div className="grid gap-3">
      <Callout title="计划任务是提纲，不是完成度">
        空着会保持未填写。改这些格子只更新本地草稿，不会派发对应楼层的 Bot。
      </Callout>
      {tasks.map((task) => (
        <details key={task.kind} open={floorId !== "all"} className="rounded-xl border border-border bg-card px-3 py-2">
          <summary className="cursor-pointer py-2 text-sm font-medium">
            {FLOORS[task.floorId].number} {task.title}
          </summary>
          <div className="grid gap-4 pb-3">
            <TaskFields kind={task.kind} />
          </div>
        </details>
      ))}
    </div>
  );
}

function TaskFields({ kind }: { kind: TaskKind }) {
  const { draft, dispatch, editingLocked } = useDraft();
  const meta = TASKS[kind];
  return (
    <>
      {meta.fields.map((field) => (
        <AreaField
          key={field.key}
          id={`${kind}-${field.key}`}
          label={field.label}
          hint={field.hint}
          value={taskValue(draft, kind, field.key)}
          disabled={editingLocked}
          onCommit={(value, record) =>
            dispatch({ type: "patch_task", kind, key: field.key, value, record })
          }
        />
      ))}
    </>
  );
}

export function StrategyDesk() {
  return (
    <Tabs defaultValue="strategy">
      <TabsList className="h-auto w-full flex-wrap">
        <TabsTrigger value="strategy" className="h-10">策略草稿</TabsTrigger>
        <TabsTrigger value="rules" className="h-10">监控规则</TabsTrigger>
        <TabsTrigger value="proposals" className="h-10">调整提议</TabsTrigger>
      </TabsList>
      <TabsContent value="strategy" className="pt-3">
        <StrategyEditor />
      </TabsContent>
      <TabsContent value="rules" className="pt-3">
        <RuleEditor />
      </TabsContent>
      <TabsContent value="proposals" className="pt-3">
        <ProposalEditor />
      </TabsContent>
    </Tabs>
  );
}

export function StrategyEditor() {
  const { draft, dispatch, editingLocked } = useDraft();
  return (
    <div className="grid gap-4">
      <Callout title="策略草稿不是投放">
        预算一栏是提议，不是批准，也不是已经发生的花费。没有的证据留空。
      </Callout>
      {STRATEGY_FIELDS.map((field) => (
        <AreaField
          key={field.key}
          id={`strategy-${field.key}`}
          label={field.label}
          hint={field.hint}
          value={draft.strategy[field.key as keyof StrategyDraft]}
          disabled={editingLocked}
          onCommit={(value, record) =>
            dispatch({
              type: "patch_strategy",
              key: field.key,
              value,
              record,
            })
          }
        />
      ))}
    </div>
  );
}

export function RuleEditor() {
  const { draft, dispatch, editingLocked } = useDraft();
  const [pendingId, setPendingId] = useState<string | null>(null);
  return (
    <div className="grid gap-4">
      <Callout title="默认没有告警">
        规则只是草稿，不会扫描数据，也不会模拟触发。历史回放时的人工对照，和定时监控不是一回事。
      </Callout>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3">
        <div>
          <p className="text-sm font-medium">定时监控</p>
          <p className="text-xs leading-5 text-muted-foreground">
            开关不可用。要启用必须同时具备配置、明确同意，以及已连接的监控运行时。这三项现在都没有，页面不会发起后台网络监控。
          </p>
        </div>
        <Switch
          checked={false}
          disabled
          aria-label="定时监控，当前不可用"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        可运行时查询：{runtimeCan("monitorNetwork") ? "是" : "否"}。评估方式固定为历史回放时人工对照。
      </p>
      <div className="grid gap-2">
        <p className="text-sm font-medium">规则类别说明</p>
        <ul className="grid gap-2">
          {Object.entries(SIGNAL_META).map(([id, meta]) => (
            <li key={id} className="rounded-lg bg-muted px-3 py-2 text-sm leading-6">
              <span className="font-medium">{meta.label}。</span>
              {meta.text}
            </li>
          ))}
        </ul>
      </div>
      <Button
        type="button"
        className={actionClass}
        disabled={editingLocked}
        onClick={() => dispatch({ type: "upsert_rule", rule: emptyRule() })}
      >
        添加一条空规则
      </Button>
      {draft.rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">还没有规则。空表是合法状态，基线不会被预置成 0。</p>
      ) : (
        draft.rules.map((rule) => (
          <article key={rule.id} className="grid gap-3 rounded-xl border border-border bg-card p-3">
            <TextField
              id={`rule-name-${rule.id}`}
              label="规则名称"
              value={rule.name}
              disabled={editingLocked}
              onCommit={(value, record) =>
                dispatch({ type: "patch_rule", id: rule.id, key: "name", value, record })
              }
            />
            <SelectField
              id={`rule-signal-${rule.id}`}
              label="信号"
              value={rule.signal}
              disabled={editingLocked}
              options={[
                { value: "", label: "未选择" },
                ...Object.entries(SIGNAL_META).map(([value, meta]) => ({
                  value,
                  label: meta.label,
                })),
              ]}
              onChange={(value) =>
                dispatch({ type: "patch_rule", id: rule.id, key: "signal", value, record: true })
              }
            />
            <RuleMetric id={rule.id} field="baseline" label="基线" value={rule.baseline} />
            <RuleMetric id={rule.id} field="threshold" label="阈值" value={rule.threshold} />
            <RuleMetric id={rule.id} field="minimumSample" label="最小样本" value={rule.minimumSample} />
            <RuleMetric
              id={rule.id}
              field="sustainedWindow"
              label="持续窗口"
              value={rule.sustainedWindow}
            />
            <p className="text-xs text-muted-foreground">
              当前显示：基线 {blank(rule.baseline)}，阈值 {blank(rule.threshold)}。空着不是 0。
            </p>
            <SelectField
              id={`rule-severity-${rule.id}`}
              label="严重程度"
              hint="「建议停下来等人决定」只是严重程度的名称，不会暂停任何广告。"
              value={rule.severity}
              disabled={editingLocked}
              options={Object.entries(SEVERITY_META).map(([value, label]) => ({ value, label }))}
              onChange={(value) =>
                dispatch({ type: "patch_rule", id: rule.id, key: "severity", value, record: true })
              }
            />
            <SelectField
              id={`rule-owner-${rule.id}`}
              label="负责人"
              hint="指以后由谁复核这条规则，不是正在运行的任务。"
              value={rule.ownerBotId}
              disabled={editingLocked}
              options={[
                { value: "", label: "未指定" },
                ...BOTS.map((bot) => ({ value: bot.id, label: `${bot.name} · ${bot.role}` })),
              ]}
              onChange={(value) =>
                dispatch({ type: "patch_rule", id: rule.id, key: "ownerBotId", value, record: true })
              }
            />
            <AreaField
              id={`rule-dedup-${rule.id}`}
              label="去重条件"
              value={rule.dedup}
              disabled={editingLocked}
              onCommit={(value, record) =>
                dispatch({ type: "patch_rule", id: rule.id, key: "dedup", value, record })
              }
            />
            <AreaField
              id={`rule-clear-${rule.id}`}
              label="解除条件"
              value={rule.clearCondition}
              disabled={editingLocked}
              onCommit={(value, record) =>
                dispatch({ type: "patch_rule", id: rule.id, key: "clearCondition", value, record })
              }
            />
            <AreaField
              id={`rule-notes-${rule.id}`}
              label="备注"
              value={rule.notes}
              disabled={editingLocked}
              onCommit={(value, record) =>
                dispatch({ type: "patch_rule", id: rule.id, key: "notes", value, record })
              }
            />
            <p className="text-xs text-muted-foreground">评估方式：仅供历史回放时人工对照。不能改成定时监控。</p>
            <Button
              type="button"
              variant="destructive"
              className={actionClass}
              disabled={editingLocked}
              onClick={() => setPendingId(rule.id)}
            >
              删除这条规则草稿
            </Button>
          </article>
        ))
      )}
      <ConfirmDelete
        open={pendingId !== null}
        title="删除这条规则草稿？"
        body="只从这台浏览器的草稿里删除，不会通知 Bot，也不会关闭任何广告。"
        onCancel={() => setPendingId(null)}
        onConfirm={() => {
          if (pendingId) dispatch({ type: "delete_rule", id: pendingId });
          setPendingId(null);
        }}
      />
    </div>
  );
}

function RuleMetric({
  id,
  field,
  label,
  value,
}: {
  id: string;
  field: "baseline" | "threshold" | "minimumSample" | "sustainedWindow";
  label: string;
  value: string;
}) {
  const { dispatch, editingLocked } = useDraft();
  return (
    <TextField
      id={`rule-${field}-${id}`}
      label={label}
      hint="留空。不要为了填满而写成 0。"
      value={value}
      disabled={editingLocked}
      placeholder="未填写"
      onCommit={(next, record) =>
        dispatch({ type: "patch_rule", id, key: field, value: next, record })
      }
    />
  );
}

function emptyRule(): RuleDraft {
  return {
    id: newId(),
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

export function ProposalEditor() {
  const { draft, dispatch, editingLocked } = useDraft();
  const [pendingId, setPendingId] = useState<string | null>(null);
  return (
    <div className="grid gap-4">
      <Callout title="先排除追踪和归因延迟">
        诊断顺序是固定的：先看数据是不是迟到或缺失。没排除之前，下面的文字只是记录，不是业务结论。提议可以是观察、创意、受众、版位、预算或暂停，但都要写证据、替代方案和回退。
      </Callout>
      <Button
        type="button"
        className={actionClass}
        disabled={editingLocked}
        onClick={() => dispatch({ type: "upsert_proposal", proposal: emptyProposal() })}
      >
        添加一条调整提议
      </Button>
      {draft.proposals.length === 0 ? (
        <p className="text-sm text-muted-foreground">还没有调整提议。</p>
      ) : (
        draft.proposals.map((proposal) => (
          <article key={proposal.id} className="grid gap-3 rounded-xl border border-border p-3">
            <SelectField
              id={`proposal-kind-${proposal.id}`}
              label="提议类型"
              value={proposal.kind}
              disabled={editingLocked}
              options={[
                { value: "", label: "未选择" },
                ...Object.entries(PROPOSAL_META).map(([value, label]) => ({ value, label })),
              ]}
              onChange={(value) =>
                dispatch({
                  type: "patch_proposal",
                  id: proposal.id,
                  key: "kind",
                  value,
                  record: true,
                })
              }
            />
            {proposal.kind === "budget" || proposal.kind === "pause" ? (
              <Callout title="这条不能执行">
                发布、暂停和预算变更需要真实授权，以及已连接的执行接口。当前两者都没有。这条只能留在草稿里。
              </Callout>
            ) : null}
            <SelectField
              id={`proposal-attr-${proposal.id}`}
              label="归因延迟是否排除"
              value={proposal.attributionCheck}
              disabled={editingLocked}
              options={Object.entries(ATTRIBUTION_META).map(([value, label]) => ({ value, label }))}
              onChange={(value) =>
                dispatch({
                  type: "patch_proposal",
                  id: proposal.id,
                  key: "attributionCheck",
                  value,
                  record: true,
                })
              }
            />
            {proposal.attributionCheck !== "delay_ruled_out" ? (
              <p className="text-sm leading-6 text-[#6e3b28]">
                尚未排除追踪或归因延迟。这里不能把它写成业务结论。若选择「已排除」，那也只是草稿里的判断，不是系统核验。
              </p>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                你在草稿里标记为已排除延迟。这不是系统核验。
              </p>
            )}
            <AreaField
              id={`proposal-evidence-${proposal.id}`}
              label="证据"
              value={proposal.evidence}
              disabled={editingLocked}
              onCommit={(value, record) =>
                dispatch({ type: "patch_proposal", id: proposal.id, key: "evidence", value, record })
              }
            />
            <AreaField
              id={`proposal-alt-${proposal.id}`}
              label="替代方案"
              value={proposal.alternatives}
              disabled={editingLocked}
              onCommit={(value, record) =>
                dispatch({
                  type: "patch_proposal",
                  id: proposal.id,
                  key: "alternatives",
                  value,
                  record,
                })
              }
            />
            <AreaField
              id={`proposal-rollback-${proposal.id}`}
              label="回退"
              value={proposal.rollback}
              disabled={editingLocked}
              onCommit={(value, record) =>
                dispatch({ type: "patch_proposal", id: proposal.id, key: "rollback", value, record })
              }
            />
            <p className="text-sm">执行状态：不可执行。</p>
            <Button
              type="button"
              variant="destructive"
              className={actionClass}
              disabled={editingLocked}
              onClick={() => setPendingId(proposal.id)}
            >
              删除这条提议
            </Button>
          </article>
        ))
      )}
      <ConfirmDelete
        open={pendingId !== null}
        title="删除这条调整提议？"
        body="只删除本地草稿。没有任何投放会被暂停或改预算。"
        onCancel={() => setPendingId(null)}
        onConfirm={() => {
          if (pendingId) dispatch({ type: "delete_proposal", id: pendingId });
          setPendingId(null);
        }}
      />
    </div>
  );
}

function emptyProposal(): ProposalDraft {
  return {
    id: newId(),
    floorId: "strategy",
    kind: "",
    attributionCheck: "unreviewed",
    evidence: "",
    alternatives: "",
    rollback: "",
    execution: "blocked",
  };
}

export function EvidenceEditor({ floorId }: { floorId: FloorId }) {
  const { draft, dispatch, editingLocked } = useDraft();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const items = draft.evidence.filter((item) => item.floorId === floorId);
  return (
    <div className="grid gap-4">
      <Callout title="证据由你写下">
        这里不预置数据集，也不会替你抓取报表。来源说明里不要写账号和口令。
      </Callout>
      <Button
        type="button"
        className={actionClass}
        disabled={editingLocked}
        onClick={() =>
          dispatch({
            type: "upsert_evidence",
            evidence: {
              id: newId(),
              floorId,
              title: "",
              body: "",
              sourceNote: "",
              relatedRuleId: "",
            },
          })
        }
      >
        添加一条证据
      </Button>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">这一层还没有证据。</p> : null}
      {items.map((item) => (
        <article key={item.id} className="grid gap-3 rounded-xl border border-border p-3">
          <TextField
            id={`evidence-title-${item.id}`}
            label="标题"
            value={item.title}
            disabled={editingLocked}
            onCommit={(value, record) =>
              dispatch({ type: "patch_evidence", id: item.id, key: "title", value, record })
            }
          />
          <AreaField
            id={`evidence-body-${item.id}`}
            label="内容"
            value={item.body}
            disabled={editingLocked}
            onCommit={(value, record) =>
              dispatch({ type: "patch_evidence", id: item.id, key: "body", value, record })
            }
          />
          <AreaField
            id={`evidence-source-${item.id}`}
            label="来源说明"
            value={item.sourceNote}
            disabled={editingLocked}
            onCommit={(value, record) =>
              dispatch({ type: "patch_evidence", id: item.id, key: "sourceNote", value, record })
            }
          />
          <Button
            type="button"
            variant="destructive"
            className={actionClass}
            disabled={editingLocked}
            onClick={() => setPendingId(item.id)}
          >
            删除这条证据
          </Button>
        </article>
      ))}
      <ConfirmDelete
        open={pendingId !== null}
        title="删除这条证据草稿？"
        body="只从本地草稿删除。"
        onCancel={() => setPendingId(null)}
        onConfirm={() => {
          if (pendingId) dispatch({ type: "delete_evidence", id: pendingId });
          setPendingId(null);
        }}
      />
    </div>
  );
}

export function FeedbackEditor() {
  const { draft, dispatch, editingLocked } = useDraft();
  const feedback = draft.feedback;
  const hasText = [
    feedback.observations,
    feedback.correlationNote,
    feedback.causationNote,
    feedback.ctrNote,
    feedback.themeQualityNote,
    feedback.nextCreativeQuestion,
  ].some((value) => value.trim().length > 0);
  const separated = feedback.separatedCorrelation && feedback.separatedCtr;
  return (
    <div className="grid gap-4">
      <Callout title="相关不是因果，点击率不是题材质量">
        可以记录观察。在你分别写清这两对概念之前，这些文字不能当成结论。
      </Callout>
      {hasText && !separated ? (
        <p className="rounded-xl bg-[#f3e4d6] px-3 py-3 text-sm leading-6 text-[#6e3b28]" role="status">
          反馈里已经有文字，但还没有同时标明：相关与因果已分开，点击率与题材质量已分开。
        </p>
      ) : null}
      <AreaField
        id="feedback-observations"
        label="观察"
        value={feedback.observations}
        disabled={editingLocked}
        onCommit={(value, record) =>
          dispatch({ type: "patch_feedback_text", key: "observations", value, record })
        }
      />
      <AreaField
        id="feedback-correlation"
        label="相关"
        hint="哪些现象一起出现。"
        value={feedback.correlationNote}
        disabled={editingLocked}
        onCommit={(value, record) =>
          dispatch({ type: "patch_feedback_text", key: "correlationNote", value, record })
        }
      />
      <AreaField
        id="feedback-causation"
        label="因果"
        hint="你不能仅凭相关就写成因。缺证据就写还不能解释。"
        value={feedback.causationNote}
        disabled={editingLocked}
        onCommit={(value, record) =>
          dispatch({ type: "patch_feedback_text", key: "causationNote", value, record })
        }
      />
      <AreaField
        id="feedback-ctr"
        label="点击率说明什么"
        value={feedback.ctrNote}
        disabled={editingLocked}
        onCommit={(value, record) =>
          dispatch({ type: "patch_feedback_text", key: "ctrNote", value, record })
        }
      />
      <AreaField
        id="feedback-theme"
        label="题材质量说明什么"
        hint="用留存、完播、复看或人工判断，不要用点击率代替。"
        value={feedback.themeQualityNote}
        disabled={editingLocked}
        onCommit={(value, record) =>
          dispatch({ type: "patch_feedback_text", key: "themeQualityNote", value, record })
        }
      />
      <AreaField
        id="feedback-next"
        label="下一个创意问题"
        value={feedback.nextCreativeQuestion}
        disabled={editingLocked}
        onCommit={(value, record) =>
          dispatch({ type: "patch_feedback_text", key: "nextCreativeQuestion", value, record })
        }
      />
      <label className="flex min-h-11 items-start gap-3 text-sm leading-6">
        <input
          type="checkbox"
          className="mt-1 size-4"
          checked={feedback.separatedCorrelation}
          disabled={editingLocked}
          onChange={(event) =>
            dispatch({
              type: "patch_feedback_flag",
              key: "separatedCorrelation",
              value: event.target.checked,
            })
          }
        />
        我已把相关和因果分开写
      </label>
      <label className="flex min-h-11 items-start gap-3 text-sm leading-6">
        <input
          type="checkbox"
          className="mt-1 size-4"
          checked={feedback.separatedCtr}
          disabled={editingLocked}
          onChange={(event) =>
            dispatch({
              type: "patch_feedback_flag",
              key: "separatedCtr",
              value: event.target.checked,
            })
          }
        />
        我已把点击率和题材质量分开写
      </label>
    </div>
  );
}

export function AccountingEditor() {
  return (
    <div className="grid gap-4">
      <Callout title="口径没有预置数字">
        自然和付费、广告创意和正片分集、付费解锁 / IAA / 授权、收入和已结算净现金、货币、时区、归因新鲜度，都要分开定义。下面空着就是未填写，不是零。
      </Callout>
      <TaskFields kind="linkage_accounting" />
    </div>
  );
}

export function ReplayEditor() {
  return (
    <div className="grid gap-4">
      <Callout title="这是历史回放笔记，不是定时任务">
        写下你要人工对照的范围。它不会按计划运行，也不会去拉报表。定时监控在规则页里保持关闭。
      </Callout>
      <TaskFields kind="historical_replay" />
    </div>
  );
}

export function RosterTable() {
  return (
    <div className="grid gap-3">
      <Callout title="三项状态分开看">
        角色已建立，只说明名册里有这个角色。认证集成未连接。运行中任务为无，因为没有可读的运行时。不要把这张表读成在线或空闲。
      </Callout>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <caption className="pb-2 text-left text-xs text-muted-foreground">
            名册来自本次说明里已经创建的角色，不是运行时查询。未列出其他 Bot。
          </caption>
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">名称</th>
              <th className="py-2 pr-3 font-medium">角色</th>
              <th className="py-2 pr-3 font-medium">角色状态</th>
              <th className="py-2 pr-3 font-medium">认证集成</th>
              <th className="py-2 font-medium">运行中任务</th>
            </tr>
          </thead>
          <tbody>
            {BOTS.map((bot) => (
              <tr key={bot.id} className="border-b border-border align-top">
                <td className="py-3 pr-3">
                  <div className="font-medium">{bot.name}</div>
                  <div className="text-xs text-muted-foreground">{bot.group === "support" ? "既有支持" : "专项"}</div>
                </td>
                <td className="py-3 pr-3">{bot.role}</td>
                <td className="py-3 pr-3">已建立</td>
                <td className="py-3 pr-3">未连接</td>
                <td className="py-3">无</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConfirmDelete({
  open,
  title,
  body,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" className={actionClass} onClick={onCancel}>
            留下
          </Button>
          <Button type="button" variant="destructive" className={actionClass} onClick={onConfirm}>
            删除草稿
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
