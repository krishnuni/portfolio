import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleTerrain, solve } from '../src/lib/search.ts';
import type { Terrain } from '../src/lib/search.ts';

test('the weighted study distinguishes minimum moves from minimum cost', () => {
  const terrain = sampleTerrain(),
    a = solve(terrain, 'astar'),
    d = solve(terrain, 'dijkstra'),
    b = solve(terrain, 'bfs');
  assert.equal(a.found, true);
  assert.equal(a.cost, d.cost);
  assert.ok(b.moves <= d.moves);
  assert.ok(b.cost > d.cost);
  for (const result of [a, b, d]) {
    assert.equal(result.path[0], terrain.start);
    assert.equal(result.path.at(-1), terrain.goal);
    assert.equal(
      result.cost,
      result.path.slice(1).reduce((sum, id) => sum + terrain.costs[id], 0),
    );
  }
});
test('unreachable routes terminate and do not fabricate a path', () => {
  const t: Terrain = {
    width: 3,
    height: 3,
    start: 0,
    goal: 8,
    costs: Array(9).fill(1),
    walls: [1, 3],
  };
  for (const alg of ['astar', 'dijkstra', 'bfs'] as const) {
    const r = solve(t, alg);
    assert.equal(r.found, false);
    assert.deepEqual(r.path, []);
    assert.equal(r.cost, 0);
    assert.deepEqual(r.visited, [0]);
  }
});
test('destination costs are charged and the starting cell is free', () => {
  const t: Terrain = { width: 3, height: 1, start: 0, goal: 2, costs: [9, 2, 4], walls: [] };
  assert.equal(solve(t, 'astar').cost, 6);
  assert.equal(solve({ ...t, start: 1, goal: 1 }, 'dijkstra').cost, 0);
});
test('invalid inputs fail explicitly', () => {
  const t = sampleTerrain();
  assert.throws(() => solve({ ...t, costs: [1] }, 'astar'));
  assert.throws(() => solve({ ...t, walls: [t.goal] }, 'bfs'));
  assert.throws(() => solve({ ...t, width: 1.5 }, 'dijkstra'));
  assert.throws(() => solve({ ...t, costs: t.costs.map((x, i) => (i ? x : 0)) }, 'astar'));
});
test('A* and Dijkstra match an independent relaxation reference on 80 generated weighted grids', () => {
  let seed = 1618033;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let fixture = 0; fixture < 80; fixture++) {
    const width = 3 + Math.floor(random() * 5),
      height = 3 + Math.floor(random() * 5),
      n = width * height;
    const t: Terrain = {
      width,
      height,
      start: 0,
      goal: n - 1,
      costs: Array.from({ length: n }, () => 1 + Math.floor(random() * 8)),
      walls: Array.from({ length: n }, (_, i) => i).filter(
        (i) => i > 0 && i < n - 1 && random() < 0.23,
      ),
    };
    const dist = Array(n).fill(Infinity);
    dist[0] = 0;
    for (let pass = 0; pass < n - 1; pass++) {
      let changed = false;
      for (let u = 0; u < n; u++) {
        if (t.walls.includes(u) || !Number.isFinite(dist[u])) continue;
        for (let v = 0; v < n; v++) {
          if (
            t.walls.includes(v) ||
            Math.abs((u % width) - (v % width)) +
              Math.abs(Math.floor(u / width) - Math.floor(v / width)) !==
              1
          )
            continue;
          const alt = dist[u] + t.costs[v];
          if (alt < dist[v]) {
            dist[v] = alt;
            changed = true;
          }
        }
      }
      if (!changed) break;
    }
    for (const algorithm of ['astar', 'dijkstra'] as const) {
      const r = solve(t, algorithm);
      assert.equal(r.found, Number.isFinite(dist[n - 1]));
      if (r.found) assert.equal(r.cost, dist[n - 1]);
      for (let i = 1; i < r.path.length; i++) {
        const u = r.path[i - 1],
          v = r.path[i];
        assert.equal(
          Math.abs((u % width) - (v % width)) +
            Math.abs(Math.floor(u / width) - Math.floor(v / width)),
          1,
        );
        assert.ok(!t.walls.includes(v));
      }
    }
  }
});
test('all search orders and paths are deterministic for a fixed scenario', () => {
  for (const alg of ['astar', 'dijkstra', 'bfs'] as const)
    assert.deepEqual(solve(sampleTerrain(), alg), solve(sampleTerrain(), alg));
});
