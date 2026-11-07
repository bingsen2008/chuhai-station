import { parseDraftText } from "@/lib/schema";
import type { StationDraft } from "@/lib/types";

export const STORAGE_KEY = "haichu-experiment-station.draft.v1";

export type DraftStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type LoadResult =
  | { status: "empty" }
  | { status: "ready"; draft: StationDraft }
  | { status: "invalid"; issues: string[] };

export function readDraft(storage: Pick<DraftStore, "getItem">): LoadResult {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw == null || raw === "") return { status: "empty" };
  const parsed = parseDraftText(raw);
  if (!parsed.ok) return { status: "invalid", issues: parsed.issues };
  return { status: "ready", draft: parsed.draft };
}

export function writeDraft(storage: Pick<DraftStore, "setItem">, draft: StationDraft) {
  storage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearStoredDraft(storage: Pick<DraftStore, "removeItem">) {
  storage.removeItem(STORAGE_KEY);
}
