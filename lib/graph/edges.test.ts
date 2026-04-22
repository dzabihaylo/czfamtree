import { describe, it, expect } from 'vitest';
import {
  NODE_W,
  NODE_H,
  computeEdges,
  spousePath,
  parentPath,
} from '@/lib/graph/edges';
import { PersonPatchSchema } from '@/lib/schemas/person';

describe('NODE constants', () => {
  it('exposes Phase 2 overrides NODE_W=180, NODE_H=76 (REQ NODE-01)', () => {
    expect(NODE_W).toBe(180);
    expect(NODE_H).toBe(76);
  });
});

describe('computeEdges', () => {
  it('dedupes symmetric spouse references to a single spouse edge', () => {
    const edges = computeEdges([
      { id: 'a', spouseIds: ['b'] },
      { id: 'b', spouseIds: ['a'] },
    ]);
    const spouseEdges = edges.filter((e) => e.kind === 'spouse');
    expect(spouseEdges).toHaveLength(1);
  });

  it('yields two parent edges for a child with two parentIds (no couple-midpoint synthesis, per D-13)', () => {
    const edges = computeEdges([
      { id: 'p1' },
      { id: 'p2' },
      { id: 'c', parentIds: ['p1', 'p2'] },
    ]);
    const parentEdges = edges.filter((e) => e.kind === 'parent');
    expect(parentEdges).toHaveLength(2);
    expect(parentEdges).toEqual(
      expect.arrayContaining([
        { kind: 'parent', a: 'p1', b: 'c' },
        { kind: 'parent', a: 'p2', b: 'c' },
      ]),
    );
  });

  it('returns zero edges for an isolated person with empty relationships', () => {
    const edges = computeEdges([{ id: 'solo', spouseIds: [], parentIds: [] }]);
    expect(edges).toEqual([]);
  });

  it('does not throw when spouseIds reference a non-existent counterpart', () => {
    expect(() =>
      computeEdges([{ id: 'a', spouseIds: ['missing'] }]),
    ).not.toThrow();
    const edges = computeEdges([{ id: 'a', spouseIds: ['missing'] }]);
    // Emits the edge; caller filters undefined lookups downstream.
    expect(edges).toEqual([{ kind: 'spouse', a: 'a', b: 'missing' }]);
  });
});

describe('spousePath', () => {
  it('uses the canonical path when b.x >= a.x + NODE_W (adjacent couple)', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 200, y: 0 };
    const path = spousePath(a, b);
    // ay = 0 + 38 = 38; x1 = 0 + 180 = 180; x2 = 200
    expect(path).toBe(`M 180 38 L 200 38`);
  });

  it('falls back to mid-node path when b.x < a.x + NODE_W (overlapping couple)', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 40, y: 0 };
    const path = spousePath(a, b);
    // Midpoint fallback: M (a.x+NODE_W/2) (ay) L (b.x+NODE_W/2) (by)
    expect(path).toBe(`M 90 38 L 130 38`);
  });
});

describe('parentPath', () => {
  it('produces orthogonal down-across-down geometry from parent midbottom to child midtop', () => {
    const parent = { x: 0, y: 0 };
    const child = { x: 300, y: 200 };
    const path = parentPath(parent, child);
    // px=90, py=76, cx=390, cy=200, mid=(76+200)/2=138
    expect(path).toBe(`M 90 76 L 90 138 L 390 138 L 390 200`);
  });
});

describe('PersonPatchSchema', () => {
  it('rejects unknown keys via .strict() (threat model T-02-01 mass-assignment)', () => {
    expect(() =>
      PersonPatchSchema.parse({ name: 'Alice', unknownField: 1 }),
    ).toThrow();
  });

  it('rejects invalid gender enum values', () => {
    expect(() => PersonPatchSchema.parse({ gender: 'z' })).toThrow();
  });

  it('rejects out-of-range birthYear values', () => {
    expect(() => PersonPatchSchema.parse({ birthYear: -1 })).toThrow();
    expect(() => PersonPatchSchema.parse({ birthYear: 3001 })).toThrow();
  });

  it('rejects name > 200 chars and notes > 4000 chars', () => {
    expect(() =>
      PersonPatchSchema.parse({ name: 'x'.repeat(201) }),
    ).toThrow();
    expect(() =>
      PersonPatchSchema.parse({ notes: 'y'.repeat(4001) }),
    ).toThrow();
  });

  it('accepts a valid patch with only a subset of fields', () => {
    expect(() =>
      PersonPatchSchema.parse({ name: 'Alice', birthYear: 1981 }),
    ).not.toThrow();
  });

  it('allows nullable optional fields to be explicitly null', () => {
    expect(() =>
      PersonPatchSchema.parse({ pronouns: null, deathYear: null }),
    ).not.toThrow();
  });
});

describe('toDbPatch', () => {
  it('maps camelCase patch fields to snake_case DB update shape', async () => {
    const { toDbPatch } = await import('@/lib/schemas/person');
    const dbPatch = toDbPatch({
      name: 'A',
      birthYear: 1981,
      birthPlace: 'Van',
    });
    expect(dbPatch).toEqual({
      name: 'A',
      birth_year: 1981,
      birth_place: 'Van',
    });
  });

  it('omits fields not present in the input patch', async () => {
    const { toDbPatch } = await import('@/lib/schemas/person');
    const dbPatch = toDbPatch({ name: 'Alice' });
    expect(dbPatch).toEqual({ name: 'Alice' });
    expect(Object.keys(dbPatch)).toEqual(['name']);
  });
});
