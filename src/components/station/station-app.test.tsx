import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyDraft } from "@/lib/defaults";
import { STORAGE_KEY } from "@/lib/storage";
import type { Clock } from "@/lib/types";
import { StationApp } from "@/components/station/station-app";

const clock: Clock = {
  now: () => "2026-11-07T03:00:00.000Z",
  id: () => "stored-draft-01",
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("station interactions", () => {
  it("shows the tower, roster boundary, and no fabricated live metrics", async () => {
    render(<StationApp />);
    expect(await screen.findByRole("heading", { name: "出海实验站" })).toBeInTheDocument();
    expect(screen.getByTestId("station-tower")).toBeInTheDocument();
    expect(screen.getAllByText("未连接").length).toBeGreaterThan(0);
    expect(screen.getByText("花费许可：无")).toBeInTheDocument();
    expect(screen.queryByText("在线")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/已派发|正在投放|\$\d/);
  });

  it("focuses the strategy floor and opens the monitor handoff", async () => {
    const user = userEvent.setup();
    render(<StationApp />);
    await screen.findByTestId("station-tower");
    await user.click(screen.getByTestId("tower-floor-strategy"));
    expect(screen.getByRole("heading", { name: "海外投放策略" })).toBeInTheDocument();
    await user.click(screen.getByTestId("tower-seat-strategy-monitor"));
    const panel = screen.getByTestId("specialist-panel");
    expect(within(panel).getByRole("heading", { name: "投放监控" })).toBeInTheDocument();
    expect(within(panel).getByText("未连接")).toBeInTheDocument();
    expect(within(panel).getByText("不派发")).toBeInTheDocument();
    const handoff = within(panel).getByTestId("handoff-text");
    expect(handoff).toHaveTextContent("手动交接");
    expect(handoff).toHaveTextContent("4ad5d110-75f1-4e81-96c4-7e824d968752");
    expect(handoff.textContent).not.toContain("grokbot://");
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    await user.click(within(panel).getByRole("button", { name: "复制交接文本" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalled();
    });
    expect(String(writeText.mock.calls[0]?.[0])).toContain("手动交接");
    expect(String(writeText.mock.calls[0]?.[0])).not.toContain("grokbot://");
    expect(await screen.findByText(/复制了给「投放监控」的手动交接文本/)).toBeInTheDocument();
  });

  it("persists a pilot title and restores it", async () => {
    const user = userEvent.setup();
    const first = render(<StationApp />);
    await user.click(await screen.findByRole("button", { name: "编辑试点配置" }));
    const title = await screen.findByLabelText("短剧工作标题");
    await user.type(title, "潮声");
    title.blur();
    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toContain("潮声");
    });
    first.unmount();
    render(<StationApp />);
    expect(await screen.findByText(/潮声/)).toBeInTheDocument();
  });

  it("rejects a secret-bearing import and accepts a valid backup", async () => {
    const user = userEvent.setup();
    const draft = createEmptyDraft(clock);
    draft.pilot.dramaTitle = "港湾";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    render(<StationApp />);
    expect(await screen.findByText(/港湾/)).toBeInTheDocument();

    const bad = new File([JSON.stringify({ password: "x" })], "bad.json", {
      type: "application/json",
    });
    await user.upload(screen.getByTestId("import-input"), bad);
    expect(await screen.findByText(/没有导入/)).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toContain("港湾");

    const next = createEmptyDraft({
      now: () => "2026-11-07T04:00:00.000Z",
      id: () => "imported-draft-1",
    });
    next.pilot.dramaTitle = "回潮";
    const good = new File([JSON.stringify(next)], "good.json", { type: "application/json" });
    await user.upload(screen.getByTestId("import-input"), good);
    await user.click(await screen.findByRole("button", { name: "替换本地草稿" }));
    expect(await screen.findByText(/回潮/)).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toContain("回潮");
    expect(localStorage.getItem(STORAGE_KEY)).not.toContain("港湾");
  });
});
