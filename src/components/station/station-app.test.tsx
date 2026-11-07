import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StationApp } from "./station-app";
import { createEngine, decideEngine, stepEngine, type EngineState } from "@/lib/simulation/engine";
import { freshSession, saveSession, SIM_STORAGE_KEY } from "@/lib/simulation/storage";

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
function stored(engine: EngineState) { saveSession(localStorage, { ...freshSession(), engine, guide: false }); }
function gate(scenario: "normal" | "anomaly" = "normal") {
  let state = createEngine(scenario);
  while (!state.decision) state = stepEngine(state);
  return state;
}
describe("flow-first station", () => {
  it("defaults to the flow with visible simulated boundaries, status semantics, input/owner/output/next, and live log", async () => {
    render(<StationApp />);
    expect(await screen.findByTestId("flow-map")).toBeVisible();
    expect(screen.queryByTestId("station-tower")).not.toBeInTheDocument();
    expect(screen.getByText("模拟数据 · 未连接真实业务")).toBeVisible();
    expect(screen.getByTestId("current-node")).toHaveTextContent("出海准入");
    const card = document.querySelector('[data-node="admission"]') as HTMLElement;
    for (const text of ["输入", "负责人", "交付物", "下一步", "等待"]) expect(within(card).getByText(text)).toBeVisible();
    expect(screen.getByRole("log", { name: "模拟事件日志" })).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText(/不调用投放、消息、058/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/密码|凭证|登录/)).not.toBeInTheDocument();
  });
  it("plays, pauses without advancing, steps one event, changes speed and fully resets", async () => {
    const confirm = vi.spyOn(window, "confirm");
    vi.useFakeTimers();
    render(<StationApp />);
    fireEvent.click(screen.getByRole("button", { name: "一键跑通" }));
    await act(async () => { vi.advanceTimersByTime(1600); });
    expect(screen.getByTestId("tick")).toHaveTextContent("T01");
    fireEvent.click(screen.getByRole("button", { name: "暂停" }));
    await act(async () => { vi.advanceTimersByTime(8000); });
    expect(screen.getByTestId("tick")).toHaveTextContent("T01");
    fireEvent.click(screen.getByRole("button", { name: "单步" }));
    expect(screen.getByTestId("tick")).toHaveTextContent("T02");
    expect(screen.getByTestId("current-node")).toHaveTextContent("海外投放策略");
    fireEvent.change(screen.getByLabelText("速度"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "播放" }));
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(screen.getByTestId("tick")).toHaveTextContent("T03");
    fireEvent.click(screen.getByRole("button", { name: "重置" }));
    expect(screen.getByTestId("tick")).toHaveTextContent("T00");
    expect(screen.getByTestId("spend")).toHaveTextContent("USD 0.00");
    expect(screen.getByLabelText("速度")).toHaveValue("1");
    expect(screen.getByRole("log")).toHaveTextContent("尚无事件");
    expect(screen.getByTestId("current-node")).toHaveTextContent("出海准入");
    expect(screen.getByRole("button", { name: "一键跑通" })).toBeEnabled();
    await act(async () => { vi.advanceTimersByTime(8000); });
    expect(JSON.parse(localStorage.getItem(SIM_STORAGE_KEY)!).engine).toEqual(createEngine());
    expect(screen.getByTestId("tick")).toHaveTextContent("T00");
    expect(confirm).not.toHaveBeenCalled();
  });

  it.each(["click", "Enter", "Space"] as const)("fully resets an approval with samples using %s, without native confirmation", async trigger => {
    let engine = decideEngine(gate("anomaly"), "approve");
    while (!engine.decision) engine = stepEngine(engine);
    stored({ ...engine, speed: 4 });
    const confirm = vi.spyOn(window, "confirm");
    const user = userEvent.setup();
    render(<StationApp />);
    expect(screen.getByTestId("spend")).not.toHaveTextContent("USD 0.00");
    expect(screen.getByRole("region", { name: "用户审批决策" })).toBeVisible();
    const reset = screen.getByRole("button", { name: "重置" });
    expect(reset).toBeEnabled();
    expect(reset).toHaveAttribute("type", "button");
    expect(reset).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    if (trigger === "click") await user.click(reset);
    else {
      reset.focus();
      await user.keyboard(trigger === "Enter" ? "{Enter}" : " ");
    }
    // Compare the entire persisted engine: pending queue, RNG, nodes, decision,
    // history, completion, samples/metrics, artifacts, transition and speed.
    expect(JSON.parse(localStorage.getItem(SIM_STORAGE_KEY)!).engine).toEqual(createEngine(engine.scenario, engine.seed));
    expect(screen.getByTestId("tick")).toHaveTextContent("T00");
    expect(screen.getByTestId("current-node")).toHaveTextContent("出海准入");
    expect(screen.getByTestId("spend")).toHaveTextContent("USD 0.00");
    expect(screen.getByLabelText("速度")).toHaveValue("1");
    expect(screen.getByLabelText("演示场景")).toHaveValue("anomaly");
    expect(screen.getByRole("log")).toHaveTextContent("尚无事件");
    expect(screen.getByRole("region", { name: "闭环交付物" })).toHaveTextContent("暂无交付物");
    expect(screen.queryByRole("region", { name: "用户审批决策" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("本场景已完整重置");
    expect(screen.getByRole("button", { name: "一键跑通" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "单步" })).toBeEnabled();
    expect(reset).toHaveFocus();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("keeps the mobile playback grid separate from scene, speed and tick controls", () => {
    render(<StationApp />);
    const controls = screen.getByRole("region", { name: "模拟控件" });
    expect(controls).toHaveClass("sim-console");
    const playback = screen.getByRole("button", { name: "重置" }).parentElement!;
    expect(playback).toHaveClass("playback-controls");
    expect(within(playback).getAllByRole("button").map(button => button.textContent)).toEqual(["一键跑通", "单步", "重置"]);
    for (const child of [playback, screen.getByLabelText("演示场景").parentElement, screen.getByLabelText("速度").parentElement, screen.getByTestId("tick").parentElement]) {
      expect(child?.parentElement).toBe(controls);
    }
    const brand = screen.getByRole("link", { name: /出海实验站/ });
    expect(brand).toHaveClass("sim-brand");
    expect(brand.parentElement).toHaveClass("sim-header");
    expect(brand.children[1]).toHaveTextContent("出海实验站");
  });

  it("runs a complete loop from one launch, stops for user approval, and delivers knowledge before strategy return", async () => {
    vi.useFakeTimers();
    render(<StationApp />);
    fireEvent.click(screen.getByRole("button", { name: "一键跑通" }));
    await act(async () => { vi.advanceTimersByTime(1600 * 40); });
    expect(screen.getByRole("region", { name: "用户审批决策" })).toBeVisible();
    expect(screen.getByTestId("spend")).toHaveTextContent("USD 0.00");
    const approvalTick = screen.getByTestId("tick").textContent;
    await act(async () => { vi.advanceTimersByTime(1600 * 10); });
    expect(screen.getByTestId("tick")).toHaveTextContent(approvalTick!);
    fireEvent.click(screen.getByRole("button", { name: "批准模拟并继续" }));
    await act(async () => { vi.advanceTimersByTime(1600 * 40); });
    expect(screen.getByText("本轮完成")).toBeVisible();
    expect(screen.getByTestId("current-node")).toHaveTextContent("海外投放策略");
    expect(screen.getByTestId("next-action")).toHaveTextContent("本轮演示完成");
    const deliveries = screen.getByRole("region", { name: "闭环交付物" });
    expect(deliveries).toHaveTextContent("知识卡片 K-001");
    expect(deliveries).toHaveTextContent("下一轮提纲 v2");
    const log = screen.getByRole("log");
    expect(log).toHaveTextContent("闭环完成");
    expect(within(log).getAllByText(/累计第 [1-4] 批模拟样本/)).toHaveLength(4);
    expect(screen.getByRole("button", { name: "单步" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "一键跑通" })).toBeEnabled();
  });
  it("changes scene with a consistent reset and switches to the retained tower without changing tick", async () => {
    const user = userEvent.setup();
    render(<StationApp />);
    await user.click(screen.getByRole("button", { name: "单步" }));
    await user.selectOptions(screen.getByLabelText("演示场景"), "rework");
    expect(screen.getByTestId("tick")).toHaveTextContent("T00");
    await user.click(screen.getByRole("button", { name: "单步" }));
    await user.click(screen.getByRole("button", { name: "单步" }));
    expect(screen.getByTestId("current-node")).toHaveTextContent("材料返工");
    expect(screen.getByRole("log")).toHaveTextContent("字幕授权范围缺项");
    await user.click(screen.getByRole("button", { name: "五层楼宇" }));
    expect(screen.getByTestId("station-tower")).toBeVisible();
    expect(screen.queryByTestId("flow-map")).not.toBeInTheDocument();
    expect(screen.getByTestId("tick")).toHaveTextContent("T02");
    await user.click(screen.getByTestId("tower-floor-strategy"));
    expect(screen.getByTestId("tick")).toHaveTextContent("T02");
    await user.click(screen.getByRole("button", { name: "业务流程" }));
    expect(screen.getByTestId("flow-map")).toBeVisible();
    expect(screen.getByTestId("current-node")).toHaveTextContent("材料返工");
    await user.selectOptions(screen.getByLabelText("演示场景"), "anomaly");
    expect(screen.getByTestId("tick")).toHaveTextContent("T00");
    expect(screen.getByTestId("spend")).toHaveTextContent("USD 0.00");
  });
  it("requires explicit user decisions and supports strategy return, resubmission and approval", async () => {
    stored(gate());
    const user = userEvent.setup();
    render(<StationApp />);
    expect(screen.getByRole("region", { name: "用户审批决策" })).toBeVisible();
    expect(screen.getByRole("button", { name: "单步" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "播放" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "退回修改策略" }));
    expect(screen.getByTestId("current-node")).toHaveTextContent("海外投放策略");
    await user.click(screen.getByRole("button", { name: "暂停" }));
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: "单步" }));
    await user.click(screen.getByRole("button", { name: "批准模拟并继续" }));
    expect(screen.queryByRole("region", { name: "用户审批决策" })).not.toBeInTheDocument();
    expect(screen.getByTestId("current-node")).toHaveTextContent("模拟投放 / 监控");
    expect(screen.getByRole("log")).toHaveTextContent("用户明确批准");
  });
  it("exposes anomaly coordination and the stop decision, preserving existing sample totals", async () => {
    let state = decideEngine(gate("anomaly"), "approve");
    while (!state.decision) state = stepEngine(state);
    stored(state);
    const user = userEvent.setup();
    render(<StationApp />);
    expect(screen.getByRole("region", { name: "用户审批决策" })).toHaveTextContent("异常已升级");
    const spend = screen.getByTestId("spend").textContent;
    await user.click(screen.getByRole("button", { name: "结束观察并对账" }));
    expect(screen.getByTestId("current-node")).toHaveTextContent("算盘对账");
    expect(screen.getByTestId("spend")).toHaveTextContent(spend!);
    expect(screen.getByRole("log")).toHaveTextContent("跳过剩余样本");
  });
  it("restores the whole running session paused, including scene, current node, deliveries, metrics, log, view and speed", async () => {
    let engine = decideEngine(gate("anomaly"), "approve");
    engine = stepEngine(engine);
    engine = { ...engine, playing: true, speed: 2 };
    saveSession(localStorage, { engine, guide: false, view: "tower" });
    const first = render(<StationApp />);
    expect(screen.getByTestId("station-tower")).toBeVisible();
    expect(screen.getByTestId("tick")).toHaveTextContent(`T${String(engine.tick).padStart(2, "0")}`);
    expect(screen.getByRole("button", { name: "播放" })).toBeEnabled();
    expect(screen.getByLabelText("速度")).toHaveValue("2");
    expect(screen.getByLabelText("演示场景")).toHaveValue("anomaly");
    expect(screen.getByRole("log").querySelectorAll("li")).toHaveLength(engine.logs.length);
    expect(screen.getByText("已完整恢复上次演示，恢复时已暂停。")).toBeVisible();
    const saved = JSON.parse(localStorage.getItem(SIM_STORAGE_KEY)!);
    expect(saved.engine.playing).toBe(false);
    expect(saved.engine.artifacts).toEqual(engine.artifacts);
    const spend = screen.getByTestId("spend").textContent;
    first.unmount(); render(<StationApp />);
    expect(screen.getByTestId("spend")).toHaveTextContent(spend!);
    expect(screen.getByTestId("current-node")).toHaveTextContent("模拟投放 / 监控");
  });
  it("skips and reopens the inline guide across reload and supports keyboard controls with no blocking overlay", async () => {
    const user = userEvent.setup();
    const first = render(<StationApp />);
    await user.click(screen.getByRole("button", { name: "跳过引导" }));
    first.unmount(); render(<StationApp />);
    const guide = screen.getByRole("button", { name: "重开引导" });
    guide.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByText(/到“用户审批”会暂停/)).toBeVisible();
    const step = screen.getByRole("button", { name: "单步" });
    step.focus(); await user.keyboard("{Enter}");
    expect(screen.getByTestId("tick")).toHaveTextContent("T01");
    expect(step).toHaveFocus();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("recovers an inconsistent saved snapshot and handles blocked localStorage", async () => {
    localStorage.setItem(SIM_STORAGE_KEY, '{"schemaVersion":2,"engine":{"tick":99}}');
    const first = render(<StationApp />);
    expect(screen.getByText(/已完整复位/)).toBeVisible();
    expect(screen.getByTestId("tick")).toHaveTextContent("T00");
    first.unmount();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    render(<StationApp />);
    expect(await screen.findByText(/演示未能保存/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "单步" }));
    await waitFor(() => expect(screen.getByTestId("tick")).toHaveTextContent("T01"));
  });
});
