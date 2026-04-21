'use client';
import { createContext, createElement, useContext, useRef, type ReactNode } from 'react';
import { createStore, useStore } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';

// Phase 1 ships the skeleton shape only. Phase 2 extends: people, edges, radialMenu, nodes, etc.
export interface TreeState {
  treeId: string | null;
  selectedPersonId: string | null;
  transform: { x: number; y: number; k: number };
}

// Factory — NEVER call this at module scope. Instantiate inside TreeStoreProvider via useRef.
export function createTreeStore() {
  return createStore<TreeState>()(
    temporal(
      immer((_set) => ({
        treeId: null,
        selectedPersonId: null,
        transform: { x: 0, y: 0, k: 1 },
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
