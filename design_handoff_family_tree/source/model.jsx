// ============================================================
// DATA MODEL + GRAPH LAYOUT
// ============================================================

const uid = () => 'p_' + Math.random().toString(36).slice(2, 9);

const initials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const relationLabel = (person, rootId, people) => {
  if (!rootId || person.id === rootId) return 'you';
  const root = people.find(p => p.id === rootId);
  if (!root) return person.relation || '';
  // Spouse of root
  if (root.spouseIds?.includes(person.id)) return 'spouse';
  // Parent of root
  if (root.parentIds?.includes(person.id)) {
    return person.gender === 'f' ? 'mother' : person.gender === 'm' ? 'father' : 'parent';
  }
  // Child of root
  if (person.parentIds?.includes(rootId) || root.childIds?.includes(person.id)) {
    return person.gender === 'f' ? 'daughter' : person.gender === 'm' ? 'son' : 'child';
  }
  // Sibling: shares a parent
  const rootParents = root.parentIds || [];
  if (rootParents.some(pid => person.parentIds?.includes(pid))) {
    return person.gender === 'f' ? 'sister' : person.gender === 'm' ? 'brother' : 'sibling';
  }
  // Grandparent
  const rootGrandparents = rootParents.flatMap(pid => {
    const parent = people.find(p => p.id === pid);
    return parent?.parentIds || [];
  });
  if (rootGrandparents.includes(person.id)) {
    return person.gender === 'f' ? 'grandmother' : person.gender === 'm' ? 'grandfather' : 'grandparent';
  }
  return person.relation || 'relative';
};

// Compute edges from people
function computeEdges(people) {
  const edges = [];
  const seen = new Set();
  for (const p of people) {
    // Spouse edges (deduped)
    for (const sid of (p.spouseIds || [])) {
      const key = [p.id, sid].sort().join('-');
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ kind: 'spouse', a: p.id, b: sid });
    }
    // Parent->child edges
    for (const pid of (p.parentIds || [])) {
      edges.push({ kind: 'parent', a: pid, b: p.id });
    }
  }
  return edges;
}

// Starter sample data (Dave's family)
const SAMPLE_PEOPLE = [
  {
    id: 'p_dave', name: 'Dave Zabihaylo', gender: 'm', birthYear: 1981, deathYear: null,
    x: 0, y: 0, isMe: true, location: 'Vancouver, BC',
    spouseIds: ['p_kath'], parentIds: [], childIds: ['p_olivia'],
    notes: 'Dad. Product designer. Loves sourdough and snowboarding.',
  },
  {
    id: 'p_kath', name: 'Katherine Chan', gender: 'f', birthYear: 1981, deathYear: null,
    x: 220, y: 0, location: 'Vancouver, BC',
    spouseIds: ['p_dave'], parentIds: [], childIds: ['p_olivia'],
    notes: '',
  },
  {
    id: 'p_olivia', name: 'Olivia Chan-Zabihaylo', gender: 'f', birthYear: 2012, deathYear: null,
    x: 110, y: 240, location: 'Vancouver, BC',
    spouseIds: [], parentIds: ['p_dave', 'p_kath'], childIds: [],
    notes: 'Artist in training. Age 13.',
  },
];

// Node dimensions (kept in sync w/ CSS)
const NODE_W = 168;
const NODE_H = 236; // approx total card height

// ============================================================
// EDGE PATH HELPERS
// ============================================================

function spousePath(a, b) {
  // Horizontal line between two spouses at node midline
  const ay = a.y + 70; // roughly between photo and body (photo ~ 168x168 + a bit)
  const by = b.y + 70;
  const x1 = a.x + NODE_W;
  const x2 = b.x;
  if (x2 < x1) {
    // overlap; connect centers instead
    return `M ${a.x + NODE_W / 2} ${ay} L ${b.x + NODE_W / 2} ${by}`;
  }
  return `M ${x1} ${ay} L ${x2} ${by}`;
}

function parentPath(parent, child) {
  // Orthogonal: from parent bottom → horizontal midpoint → down to child top
  const px = parent.x + NODE_W / 2;
  const py = parent.y + NODE_H;
  const cx = child.x + NODE_W / 2;
  const cy = child.y;
  const mid = (py + cy) / 2;
  return `M ${px} ${py} L ${px} ${mid} L ${cx} ${mid} L ${cx} ${cy}`;
}

// (assign after layoutTree is declared below)

// ============================================================
// AUTO-LAYOUT — tidy generational layout
// ============================================================
// Strategy:
//  1. Find "roots" = couples with no parents (topmost generation).
//     If multiple root clusters, lay them side-by-side.
//  2. Compute generation (depth from root couple) for each person via BFS
//     along parent edges: parent.gen = child.gen - 1.
//  3. Group by generation, place rows top→bottom.
//  4. Within each gen, place couples adjacent (spouses side-by-side) and
//     order them so children align under the midpoint of their parents.
// This is a lightweight heuristic — good enough to prevent overlap & feel "tidy".

function layoutTree(peopleIn) {
  if (!peopleIn.length) return peopleIn;
  const people = peopleIn.map(p => ({ ...p }));
  const byId = new Map(people.map(p => [p.id, p]));

  // Assign generation levels. Lowest known person = 0; parents = -1, etc.
  // We anchor on any "self"/isMe first, else arbitrary.
  const anchor = people.find(p => p.isMe) || people[0];
  const gen = new Map([[anchor.id, 0]]);
  const queue = [anchor.id];
  while (queue.length) {
    const id = queue.shift();
    const me = byId.get(id);
    const g = gen.get(id);
    // Parents are one gen up
    for (const pid of (me.parentIds || [])) {
      if (byId.has(pid) && !gen.has(pid)) {
        gen.set(pid, g - 1);
        queue.push(pid);
      }
    }
    // Spouses same gen
    for (const sid of (me.spouseIds || [])) {
      if (byId.has(sid) && !gen.has(sid)) {
        gen.set(sid, g);
        queue.push(sid);
      }
    }
    // Children one gen down
    for (const other of people) {
      if (other.parentIds?.includes(id) && !gen.has(other.id)) {
        gen.set(other.id, g + 1);
        queue.push(other.id);
      }
    }
  }
  // Anyone orphan: drop at gen 0
  for (const p of people) if (!gen.has(p.id)) gen.set(p.id, 0);

  // Group
  const rows = new Map();
  for (const p of people) {
    const g = gen.get(p.id);
    if (!rows.has(g)) rows.set(g, []);
    rows.get(g).push(p);
  }

  const GAP_X = 40;
  const COUPLE_GAP = 24;
  const GAP_Y = 120;
  const nodeW = NODE_W;
  const nodeH = NODE_H;

  // Build couple units per row (2 spouses as one unit, singles as unit of 1)
  const rowUnits = new Map();
  for (const [g, members] of rows.entries()) {
    const used = new Set();
    const units = [];
    for (const p of members) {
      if (used.has(p.id)) continue;
      const partners = (p.spouseIds || []).filter(sid => !used.has(sid) && byId.get(sid) && gen.get(sid) === g);
      if (partners.length) {
        const sp = byId.get(partners[0]);
        const order = [p, sp];
        units.push({ ids: order.map(o => o.id), members: order, key: '' });
        used.add(p.id); used.add(sp.id);
      } else {
        units.push({ ids: [p.id], members: [p], key: '' });
        used.add(p.id);
      }
    }
    for (const u of units) u.key = u.ids.slice().sort().join('-');
    rowUnits.set(g, units);
  }

  const sortedGens = [...rowUnits.keys()].sort((a,b) => a-b);
  const unitWidth = (u) => u.members.length * nodeW + (u.members.length - 1) * COUPLE_GAP;

  // Build parent-unit map: for each unit, which unit in gen-1 are its parents?
  const parentUnitOf = new Map(); // unit.key -> parent unit key
  const childrenOfUnit = new Map(); // parent unit key -> [child unit keys]
  for (let i = 1; i < sortedGens.length; i++) {
    const prevUnits = rowUnits.get(sortedGens[i-1]);
    const units = rowUnits.get(sortedGens[i]);
    for (const u of units) {
      const person = u.members[0];
      const parentIds = (person.parentIds || []).filter(pid => byId.has(pid));
      if (!parentIds.length) continue;
      const pu = prevUnits.find(pu => pu.ids.some(id => parentIds.includes(id)));
      if (pu) {
        parentUnitOf.set(u.key, pu.key);
        if (!childrenOfUnit.has(pu.key)) childrenOfUnit.set(pu.key, []);
        childrenOfUnit.get(pu.key).push(u.key);
      }
    }
  }

  // Unit lookup
  const unitByKey = new Map();
  for (const units of rowUnits.values()) for (const u of units) unitByKey.set(u.key, u);

  // Subtree width: max(own width, sum of children subtree widths + gaps)
  const subtreeW = new Map();
  const computeSubtreeW = (key) => {
    if (subtreeW.has(key)) return subtreeW.get(key);
    const u = unitByKey.get(key);
    const own = unitWidth(u);
    const kids = childrenOfUnit.get(key) || [];
    if (!kids.length) { subtreeW.set(key, own); return own; }
    const childrenW = kids.reduce((s, k, i) => s + computeSubtreeW(k) + (i > 0 ? GAP_X : 0), 0);
    const w = Math.max(own, childrenW);
    subtreeW.set(key, w);
    return w;
  };

  // Position roots: top-gen units, stacked left-to-right
  const unitX = new Map();
  const placeSubtree = (key, leftX) => {
    const u = unitByKey.get(key);
    const sw = computeSubtreeW(key);
    const own = unitWidth(u);
    const kids = childrenOfUnit.get(key) || [];
    if (!kids.length) {
      unitX.set(key, leftX + (sw - own) / 2);
      return;
    }
    // Place children first, filling the subtree width
    const childrenW = kids.reduce((s, k, i) => s + computeSubtreeW(k) + (i > 0 ? GAP_X : 0), 0);
    let childStart = leftX + (sw - childrenW) / 2;
    let firstChildCenter = null;
    let lastChildCenter = null;
    for (const k of kids) {
      const cw = computeSubtreeW(k);
      placeSubtree(k, childStart);
      const cu = unitByKey.get(k);
      const cOwn = unitWidth(cu);
      const cCenter = unitX.get(k) + cOwn / 2;
      if (firstChildCenter == null) firstChildCenter = cCenter;
      lastChildCenter = cCenter;
      childStart += cw + GAP_X;
    }
    // Center parent over children span
    const childrenMid = (firstChildCenter + lastChildCenter) / 2;
    unitX.set(key, childrenMid - own / 2);
  };

  const topUnits = rowUnits.get(sortedGens[0]);
  let rootCursor = 0;
  for (const u of topUnits) {
    placeSubtree(u.key, rootCursor);
    rootCursor += computeSubtreeW(u.key) + GAP_X;
  }

  // Normalize
  let minX = Infinity;
  for (const x of unitX.values()) minX = Math.min(minX, x);
  if (!isFinite(minX)) minX = 0;

  // Assign
  for (let i = 0; i < sortedGens.length; i++) {
    const g = sortedGens[i];
    const y = i * (nodeH + GAP_Y);
    const units = rowUnits.get(g);
    for (const u of units) {
      let x = unitX.get(u.key) - minX;
      for (const m of u.members) {
        const obj = byId.get(m.id);
        obj.x = x;
        obj.y = y;
        x += nodeW + COUPLE_GAP;
      }
    }
  }

  return Array.from(byId.values());
}

window.FamilyModel = {
  uid, initials, relationLabel, computeEdges,
  SAMPLE_PEOPLE, NODE_W, NODE_H,
  spousePath, parentPath,
  layoutTree,
};
