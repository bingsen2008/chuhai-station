"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { createEmptyDraft } from "@/lib/defaults";
import { reduceDraft, type DraftAction } from "@/lib/reducer";
import { clearStoredDraft, readDraft, writeDraft } from "@/lib/storage";
import { newId } from "@/lib/text";
import type { Clock, StationDraft } from "@/lib/types";

type Persistence = "booting" | "active" | "held";

type DraftApi = {
  draft: StationDraft;
  persistence: Persistence;
  loadIssues: string[];
  formError: string | null;
  editingLocked: boolean;
  dispatch: (action: DraftAction) => StationDraft | null;
  replaceWithBlank: (summary: string) => void;
  importDraft: (incoming: StationDraft) => boolean;
  exportText: () => string | null;
  clearFormError: () => void;
};

const DraftContext = createContext<DraftApi | null>(null);

const bootClock: Clock = {
  now: () => "1970-01-01T00:00:00.000Z",
  id: () => "boot-draft",
};

export function DraftProvider({ children }: { children: ReactNode }) {
  const clock = useMemo<Clock>(
    () => ({
      now: () => new Date().toISOString(),
      id: () => newId(),
    }),
    [],
  );
  const [draft, setDraft] = useState<StationDraft>(() => createEmptyDraft(bootClock));
  const [persistence, setPersistence] = useState<Persistence>("booting");
  const [loadIssues, setLoadIssues] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const loaded = readDraft(window.localStorage);
    if (loaded.status === "ready") {
      setDraft(loaded.draft);
      setPersistence("active");
      setLoadIssues([]);
      return;
    }
    if (loaded.status === "empty") {
      const next = createEmptyDraft(clock);
      writeDraft(window.localStorage, next);
      setDraft(next);
      setPersistence("active");
      setLoadIssues([]);
      return;
    }
    setDraft(createEmptyDraft(clock));
    setPersistence("held");
    setLoadIssues(loaded.issues);
  }, [clock]);

  useEffect(() => {
    if (persistence !== "active") return;
    writeDraft(window.localStorage, draft);
  }, [draft, persistence]);

  const api = useMemo<DraftApi>(() => {
    return {
      draft,
      persistence,
      loadIssues,
      formError,
      editingLocked: persistence !== "active",
      clearFormError: () => setFormError(null),
      dispatch: (action) => {
        if (persistence !== "active") return null;
        const result = reduceDraft(draft, action, clock);
        setFormError(result.error);
        if (result.error) return null;
        setDraft(result.draft);
        return result.draft;
      },
      replaceWithBlank: (summary) => {
        clearStoredDraft(window.localStorage);
        const next = createEmptyDraft(clock, {
          kind: "draft_cleared",
          summary,
        });
        writeDraft(window.localStorage, next);
        setDraft(next);
        setPersistence("active");
        setLoadIssues([]);
        setFormError(null);
      },
      importDraft: (incoming) => {
        if (persistence !== "active") return false;
        const stamped = reduceDraft(
          incoming,
          { type: "log", kind: "imported", summary: "导入了通过校验的草稿备份" },
          clock,
        );
        setFormError(stamped.error);
        if (stamped.error) return false;
        setDraft(stamped.draft);
        return true;
      },
      exportText: () => {
        if (persistence !== "active") return null;
        const stamped = reduceDraft(
          draft,
          { type: "log", kind: "exported", summary: "导出了本地草稿备份" },
          clock,
        );
        setFormError(stamped.error);
        if (stamped.error) return null;
        setDraft(stamped.draft);
        return JSON.stringify(stamped.draft, null, 2);
      },
    };
  }, [clock, draft, formError, loadIssues, persistence]);

  return <DraftContext.Provider value={api}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftApi {
  const value = useContext(DraftContext);
  if (!value) throw new Error("草稿上下文还没有准备好");
  return value;
}
