/**
 * Phase 2 graph utilities — verbatim port of the handoff's
 * `design_handoff_family_tree/source/model.jsx` L45-62 `computeEdges` + L94-115
 * `spousePath` / `parentPath`, with NODE_W / NODE_H overridden to the Phase 2
 * card dimensions (REQ NODE-01) and the handoff's magic `+ 70` spouse y-offset
 * replaced by the honest `+ NODE_H / 2` midline (UI-SPEC §8).
 *
 * Rule D-13: computeEdges yields one edge per (parent → child) pair — NO
 * couple-midpoint synthesis. Phase 4's dagre couple-merge pass naturally
 * produces midpoint routing by treating couples as synthetic nodes.
 */

export const NODE_W = 180;
export const NODE_H = 76;

export type Edge = { kind: 'spouse' | 'parent'; a: string; b: string };

type EdgePerson = {
  id: string;
  spouseIds?: string[];
  parentIds?: string[];
};

export function computeEdges(people: EdgePerson[]): Edge[] {
  const edges: Edge[] = [];
  const seen = new Set<string>();
  for (const p of people) {
    // Spouse edges — deduped via sorted-pair key so a↔b emits once.
    for (const sid of p.spouseIds ?? []) {
      const key = [p.id, sid].sort().join('-');
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ kind: 'spouse', a: p.id, b: sid });
    }
    // Parent → child edges (one per parent reference; orientation a=parent, b=child).
    for (const pid of p.parentIds ?? []) {
      edges.push({ kind: 'parent', a: pid, b: p.id });
    }
  }
  return edges;
}

type Pt = { x: number; y: number };

export function spousePath(a: Pt, b: Pt): string {
  const ay = a.y + NODE_H / 2;
  const by = b.y + NODE_H / 2;
  const x1 = a.x + NODE_W;
  const x2 = b.x;
  if (x2 < x1) {
    return `M ${a.x + NODE_W / 2} ${ay} L ${b.x + NODE_W / 2} ${by}`;
  }
  return `M ${x1} ${ay} L ${x2} ${by}`;
}

export function parentPath(parent: Pt, child: Pt): string {
  const px = parent.x + NODE_W / 2;
  const py = parent.y + NODE_H;
  const cx = child.x + NODE_W / 2;
  const cy = child.y;
  const mid = (py + cy) / 2;
  return `M ${px} ${py} L ${px} ${mid} L ${cx} ${mid} L ${cx} ${cy}`;
}
