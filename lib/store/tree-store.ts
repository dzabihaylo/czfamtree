'use client';
import { createContext, createElement, useContext, useRef, type ReactNode } from 'react';
import { createStore, useStore } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import type { Database } from '@/lib/supabase/types';

// ────────────────────────────────────────────────────────────────────────────
// Phase 2 types
// ────────────────────────────────────────────────────────────────────────────

export type PersonRowDb = Database['public']['Tables']['people']['Row'];

// Camel-case mirror used client-side. Boundary conversion from snake_case DB
// rows happens in personFromRow below; no component ever touches snake_case.
export type Person = {
  id: string;
  name: string;
  gender: 'm' | 'f' | 'x' | 'u';
  pronouns: string | null;
  birthYear: number | null;
  deathYear: number | null;
  birthPlace: string | null;
  notes: string | null;
  spouseIds: string[];
  parentIds: string[];
  childIds: string[];
  x: number;
  y: number;
  isMe: boolean;
};

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function personFromRow(row: PersonRowDb): Person {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    pronouns: row.pronouns ?? null,
    birthYear: row.birth_year ?? null,
    deathYear: row.death_year ?? null,
    birthPlace: row.birth_place ?? null,
    notes: row.notes ?? null,
    spouseIds: row.spouse_ids ?? [],
    parentIds: row.parent_ids ?? [],
    childIds: row.child_ids ?? [],
    x: row.x,
    y: row.y,
    isMe: row.is_me,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Store shape
// ────────────────────────────────────────────────────────────────────────────

export interface TreeState {
  // Phase 1:
  treeId: string | null;
  selectedPersonId: string | null;
  transform: { x: number; y: number; k: number };

  // Phase 2:
  people: Record<string, Person>;
  sidePanelOpen: boolean;
  draggingPersonId: string | null;
  dragOrigin: { x: number; y: number } | null;
  saveStateByPersonId: Record<string, SaveState>;

  // Setters:
  hydratePeople: (rows: PersonRowDb[]) => void;
  setTreeId: (id: string | null) => void;
  setSelectedPersonId: (id: string | null) => void;
  setSidePanelOpen: (open: boolean) => void;
  setTransform: (t: { x: number; y: number; k: number }) => void;
  setPersonField: <K extends keyof Person>(id: string, field: K, value: Person[K]) => void;
  setPersonPosition: (id: string, x: number, y: number) => void;
  removePersonFromStore: (id: string) => void;
  setDragging: (id: string | null, origin?: { x: number; y: number } | null) => void;
  setSaveState: (id: string, state: SaveState) => void;
}

// Phase 2: temporal() is present but drag/edit setters do NOT invoke past-state
// registration. Phase 3 (HIST-01..05) wires this; doing it here would
// contaminate undo history with failed saves (D-06).
//
// Factory — NEVER call this at module scope. Instantiate inside
// TreeStoreProvider via useRef.
export function createTreeStore() {
  return createStore<TreeState>()(
    temporal(
      immer((set) => ({
        // Phase 1 initial state:
        treeId: null,
        selectedPersonId: null,
        transform: { x: 0, y: 0, k: 1 },

        // Phase 2 initial state:
        people: {},
        sidePanelOpen: false,
        draggingPersonId: null,
        dragOrigin: null,
        saveStateByPersonId: {},

        // Setters:
        hydratePeople: (rows) =>
          set((state) => {
            state.people = {};
            for (const r of rows) {
              state.people[r.id] = personFromRow(r);
            }
          }),
        setTreeId: (id) =>
          set((state) => {
            state.treeId = id;
          }),
        setSelectedPersonId: (id) =>
          set((state) => {
            state.selectedPersonId = id;
          }),
        setSidePanelOpen: (open) =>
          set((state) => {
            state.sidePanelOpen = open;
          }),
        setTransform: (t) =>
          set((state) => {
            state.transform = t;
          }),
        setPersonField: (id, field, value) =>
          set((state) => {
            const p = state.people[id];
            if (p) {
              // Typed via the <K extends keyof Person> generic at the call
              // site; the store patch is structurally O(1) per-person so
              // other persons' subscribers don't re-render (D-10).
              (p as Person)[field] = value;
            }
          }),
        setPersonPosition: (id, x, y) =>
          set((state) => {
            const p = state.people[id];
            if (p) {
              p.x = x;
              p.y = y;
            }
          }),
        removePersonFromStore: (id) =>
          set((state) => {
            delete state.people[id];
            if (state.selectedPersonId === id) state.selectedPersonId = null;
            if (state.draggingPersonId === id) {
              state.draggingPersonId = null;
              state.dragOrigin = null;
            }
            delete state.saveStateByPersonId[id];
          }),
        setDragging: (id, origin = null) =>
          set((state) => {
            state.draggingPersonId = id;
            state.dragOrigin = origin;
          }),
        setSaveState: (id, nextState) =>
          set((state) => {
            state.saveStateByPersonId[id] = nextState;
          }),
      })),
      { limit: 50 },
    ),
  );
}

export type TreeStoreApi = ReturnType<typeof createTreeStore>;

const TreeStoreContext = createContext<TreeStoreApi | null>(null);

// Note: implemented with React.createElement (not JSX) so file can keep the .ts extension
// declared in the plan's files_modified list — JSX would require .tsx.
export function TreeStoreProvider({ children }: { children: ReactNode }) {
  // useRef ensures one store per React tree instance, NOT per module load — SSR-safe.
  const storeRef = useRef<TreeStoreApi | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createTreeStore();
  }
  return createElement(TreeStoreContext.Provider, { value: storeRef.current }, children);
}

export function useTreeStore<T>(selector: (state: TreeState) => T): T {
  const store = useContext(TreeStoreContext);
  if (!store) {
    throw new Error('useTreeStore must be used inside <TreeStoreProvider>');
  }
  return useStore(store, selector);
}

/**
 * Returns the raw Zustand StoreApi instance scoped to this Provider tree.
 *
 * Use this when you need `store.getState()` for an imperative read inside an
 * event handler or window listener — e.g. PanZoomWrapper's mouseup reads the
 * final dragged position via `storeApi.getState().people[id]` rather than
 * capturing a selector value through the closure (which would go stale
 * across the window listener lifetime).
 *
 * This is a carry-in from Plan 01: the plan originally scoped this helper
 * to 01-01 but the Phase 2 drag-save pipeline (Plan 02) is the first
 * consumer, so it landed here in Plan 02-02 Task 3. Plan 03's useSaveQueue
 * will also consume it.
 */
export function useTreeStoreApi(): TreeStoreApi {
  const store = useContext(TreeStoreContext);
  if (!store) {
    throw new Error('useTreeStoreApi must be used inside <TreeStoreProvider>');
  }
  return store;
}
