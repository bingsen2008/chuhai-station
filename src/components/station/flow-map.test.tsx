import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEngine, decideEngine, setPlaying, stepEngine } from "@/lib/simulation/engine";
import { freshSession, saveSession, SIM_STORAGE_KEY } from "@/lib/simulation/storage";
import { FlowMap } from "./flow-map";
import { StationApp } from "./station-app";

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
function gate() {
  let state = createEngine();
  while (!state.decision) state = stepEngine(state);
  return state;
}
function businessCard(id: string) { return document.querySelector(`[data-node="${id}"]`) as HTMLElement; }

describe("2D topology and local drilldowns", () => {
  it("separates human/controller hierarchy, reporting lines and numbered business steps", () => {
    render(<FlowMap state={createEngine()} onApproval={vi.fn()} />);
    expect(within(businessCard("approval")).getByRole("heading", { name: "卢哥" })).toBeVisible();
    expect(within(businessCard("coordinator")).getByRole("heading", { name: "靓仔" })).toBeVisible();
    expect(within(businessCard("expert")).getByText("CONSULTANT / 咨询侧")).toBeVisible();
    expect(document.querySelectorAll(".edge-direction path").length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".edge-report path").length).toBeGreaterThan(0);
    expect([...document.querySelectorAll(".topology-edge path[d]")].every(path => path.getAttribute("d")?.includes("C"))).toBe(true);
    const sequence = screen.getByRole("region", { name: "主业务顺序与交付物" });
    expect(within(sequence).getAllByRole("listitem")).toHaveLength(7);
    expect(sequence.querySelector(".sequence-current")).toHaveTextContent("出海准入");
    expect(screen.queryByTestId("event-packet")).not.toBeInTheDocument();
  });
  it("pans and zooms with keyboard and wheel, fits bounds, and resets the camera without changing the engine", () => {
    render(<FlowMap state={createEngine()} onApproval={vi.fn()} />);
    const viewport = screen.getByTestId("canvas-viewport"), world = screen.getByTestId("canvas-world");
    const initial = world.style.transform;
    fireEvent.keyDown(viewport, { key: "ArrowRight" });
    expect(world.style.transform).not.toBe(initial);
    fireEvent.keyDown(viewport, { key: "+" });
    expect(world.style.transform).not.toBe(initial);
    fireEvent.click(screen.getByRole("button", { name: "复位" }));
    expect(world.style.transform).toBe("translate(20px, 20px) scale(1)");
    fireEvent.keyDown(viewport, { key: "ArrowDown" });
    fireEvent.keyDown(viewport, { key: "0" });
    expect(world.style.transform).toBe("translate(20px, 20px) scale(1)");
    fireEvent.click(screen.getByRole("button", { name: "适应画布" }));
    expect(world.style.transform).toBe(initial);
    viewport.focus();
    fireEvent.wheel(viewport, { deltaY: -100, clientX: 200, clientY: 200 });
    expect(world.style.transform).not.toBe(initial);
    fireEvent.keyDown(viewport, { key: "Home" });
    expect(world.style.transform).toBe(initial);
    const firstMetric = within(businessCard("admission")).getByRole("button", { name: "钻取检查事件" });
    fireEvent.keyDown(firstMetric, { key: "ArrowRight" });
    expect(world.style.transform).toBe(initial);
  });
  it("offers a collapsible vertical business view and retains reset controls", async () => {
    const user = userEvent.setup();
    render(<FlowMap state={createEngine()} onApproval={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "纵向业务流" }));
    expect(screen.getByTestId("flow-map")).toHaveClass("show-flow-list");
    const list = screen.getByLabelText("纵向业务流与折叠节点");
    expect(list.querySelectorAll("details")).toHaveLength(10);
    expect(list.querySelector("details")).toHaveAttribute("open");
    const second = list.querySelectorAll("details")[1];
    expect(second).not.toHaveAttribute("open");
    await user.click(second.querySelector("summary")!);
    expect(second).toHaveAttribute("open");
    await user.click(screen.getByRole("button", { name: "复位" }));
    expect(screen.getByTestId("canvas-world").style.transform).toBe("translate(20px, 20px) scale(1)");
    await user.click(screen.getByRole("button", { name: "适应画布" }));
    expect(screen.getByTestId("flow-map")).not.toHaveClass("show-flow-list");
  });
  it("opens a metric drilldown with event bars and accessible data, traps focus, closes on Esc and returns focus", async () => {
    let state = decideEngine(gate(), "approve");
    state = stepEngine(state);
    const user = userEvent.setup();
    render(<FlowMap state={state} onApproval={vi.fn()} />);
    const trigger = within(businessCard("monitor")).getByRole("button", { name: "钻取累计花费" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "累计花费 · 指标明细" });
    expect(within(dialog).getByRole("img", { name: "累计花费事件柱状图" })).toBeVisible();
    expect(within(dialog).getByRole("table")).toHaveTextContent(`T${state.tick}`);
    const close = within(dialog).getByRole("button", { name: "关闭弹窗" });
    expect(close).toHaveFocus();
    await user.tab(); expect(close).toHaveFocus();
    await user.tab({ shift: true }); expect(close).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });
  it("shows the no-sample state without fabricating chart values", async () => {
    const user = userEvent.setup();
    render(<FlowMap state={createEngine()} onApproval={vi.fn()} />);
    await user.click(within(businessCard("monitor")).getByRole("button", { name: "钻取累计花费" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("尚无样本事件");
    expect(screen.queryByRole("img", { name: /事件柱状图/ })).not.toBeInTheDocument();
  });
  it("ties packets to one engine handoff, freezes their state on pause and clears them for non-handoff ticks", () => {
    let state = stepEngine(stepEngine(createEngine()));
    const rendered = render(<FlowMap state={setPlaying(state, true)} onApproval={vi.fn()} />);
    const packet = screen.getByTestId("event-packet");
    expect(packet).toHaveClass("packet-playing");
    expect(packet).toHaveAttribute("data-tick", "2");
    rendered.rerender(<FlowMap state={setPlaying(state, false)} onApproval={vi.fn()} />);
    expect(screen.getByTestId("event-packet")).toBe(packet);
    expect(packet).toHaveClass("packet-paused");
    expect(packet).not.toHaveClass("packet-playing");
    state = decideEngine(gate(), "approve");
    rendered.rerender(<FlowMap state={state} onApproval={vi.fn()} />);
    expect(screen.getByTestId("event-packet")).toHaveClass("packet-paused");
    rendered.rerender(<FlowMap state={stepEngine(state)} onApproval={vi.fn()} />);
    expect(screen.queryByTestId("event-packet")).not.toBeInTheDocument();
  });
  it("colors actual escalations as reports and explicit approvals as directions", () => {
    let state = gate();
    const rendered = render(<FlowMap state={decideEngine(state, "approve")} onApproval={vi.fn()} />);
    expect(document.querySelector(".edge-event")).toHaveClass("event-direction");
    state = createEngine("anomaly");
    for (let i = 0; i < 50 && state.transition?.to !== "coordinator"; i++) state = state.decision ? decideEngine(state, "approve") : stepEngine(state);
    rendered.rerender(<FlowMap state={state} onApproval={vi.fn()} />);
    expect(document.querySelector(".edge-event")).toHaveClass("event-report");
  });
});

describe("human to-do approval modal", () => {
  it("blocks indefinitely until explicit approval, then advances; modal Esc does not approve", async () => {
    vi.useFakeTimers();
    saveSession(localStorage, { ...freshSession(), engine: gate(), guide: false });
    render(<StationApp />);
    const initialTick = screen.getByTestId("tick").textContent;
    const trigger = within(businessCard("approval")).getByRole("button", { name: "待办 1 件" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "卢哥 · 本地模拟审批" })).toHaveTextContent("策略 v1");
    await act(async () => { vi.advanceTimersByTime(16000); });
    expect(screen.getByTestId("tick")).toHaveTextContent(initialTick!);
    expect(screen.getByRole("button", { name: "单步" })).toBeDisabled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("tick")).toHaveTextContent(initialTick!);
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "通过并继续模拟" }));
    expect(screen.getByTestId("current-node")).toHaveTextContent("模拟投放 / 监控");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(1600); });
    expect(screen.getByTestId("spend")).not.toHaveTextContent("USD 0.00");
  });
  it("returns to strategy rework and restores the full returned state, then requires approval again", async () => {
    saveSession(localStorage, { ...freshSession(), engine: gate(), guide: false });
    const user = userEvent.setup();
    const rendered = render(<StationApp />);
    await user.click(within(businessCard("approval")).getByRole("button", { name: "待办 1 件" }));
    await user.click(screen.getByRole("button", { name: "退回返工" }));
    await user.click(screen.getByRole("button", { name: "暂停" }));
    const snapshot = JSON.parse(localStorage.getItem(SIM_STORAGE_KEY)!).engine;
    expect(snapshot.nodes.approval).toBe("rework");
    expect(snapshot.current).toBe("strategy");
    expect(snapshot.artifacts.approval).toContain("返工");
    rendered.unmount(); render(<StationApp />);
    expect(JSON.parse(localStorage.getItem(SIM_STORAGE_KEY)!).engine).toEqual(snapshot);
    expect(screen.getByTestId("current-node")).toHaveTextContent("海外投放策略");
    expect(screen.getByRole("region", { name: "闭环交付物" })).toHaveTextContent("策略需返工");
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: "单步" }));
    expect(screen.getByRole("button", { name: "单步" })).toBeDisabled();
    expect(within(businessCard("approval")).getByRole("button", { name: "待办 1 件" })).toBeVisible();
  });
});
