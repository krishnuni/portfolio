/** A small original search engine for the portfolio's interactive study.
 * Independent of Search Atlas's application code. Cardinal edges charge the
 * destination's positive terrain cost. BFS optimises moves, not weighted cost.
 */
export type Algorithm = 'astar' | 'dijkstra' | 'bfs';
export interface Terrain {
  width: number;
  height: number;
  start: number;
  goal: number;
  costs: number[];
  walls: number[];
}
export interface SearchResult {
  visited: number[];
  path: number[];
  cost: number;
  moves: number;
  found: boolean;
}

class MinHeap {
  private data: { id: number; priority: number; order: number }[] = [];
  private sequence = 0;
  get length() {
    return this.data.length;
  }
  push(id: number, priority: number) {
    const item = { id, priority, order: this.sequence++ };
    this.data.push(item);
    let i = this.data.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(item, this.data[parent])) break;
      this.data[i] = this.data[parent];
      i = parent;
    }
    this.data[i] = item;
  }
  pop() {
    const top = this.data[0];
    const tail = this.data.pop()!;
    if (this.data.length) {
      let i = 0;
      while (true) {
        let child = 2 * i + 1;
        if (child >= this.data.length) break;
        if (child + 1 < this.data.length && this.less(this.data[child + 1], this.data[child]))
          child++;
        if (!this.less(this.data[child], tail)) break;
        this.data[i] = this.data[child];
        i = child;
      }
      this.data[i] = tail;
    }
    return top.id;
  }
  private less(a: { priority: number; order: number }, b: { priority: number; order: number }) {
    return a.priority < b.priority || (a.priority === b.priority && a.order < b.order);
  }
}

export function solve(terrain: Terrain, algorithm: Algorithm): SearchResult {
  const { width, height, start, goal, costs, walls } = terrain,
    count = width * height;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    count > 4096 ||
    costs.length !== count ||
    costs.some((c) => !Number.isFinite(c) || c < 1) ||
    ![start, goal].every((i) => Number.isInteger(i) && i >= 0 && i < count) ||
    walls.some((i) => !Number.isInteger(i) || i < 0 || i >= count)
  )
    throw new Error('Invalid search terrain.');
  if (!['astar', 'dijkstra', 'bfs'].includes(algorithm)) throw new Error('Unknown algorithm.');
  const blocked = new Set(walls);
  if (blocked.has(start) || blocked.has(goal)) throw new Error('Endpoints must be open.');
  const distance = new Float64Array(count).fill(Infinity),
    parent = new Int32Array(count).fill(-1),
    closed = new Uint8Array(count),
    discovered = new Uint8Array(count),
    heap = new MinHeap(),
    queue: number[] = [];
  let head = 0;
  const visited: number[] = [];
  distance[start] = 0;
  discovered[start] = 1;
  const h = (id: number) =>
    Math.abs((id % width) - (goal % width)) +
    Math.abs(Math.floor(id / width) - Math.floor(goal / width));
  heap.push(start, algorithm === 'astar' ? h(start) : 0);
  queue.push(start);
  while (algorithm === 'bfs' ? head < queue.length : heap.length > 0) {
    const id = algorithm === 'bfs' ? queue[head++] : heap.pop();
    if (closed[id]) continue;
    closed[id] = 1;
    visited.push(id);
    if (id === goal) break;
    const x = id % width,
      y = Math.floor(id / width);
    const neighbors = [
      y > 0 ? id - width : -1,
      x < width - 1 ? id + 1 : -1,
      y < height - 1 ? id + width : -1,
      x > 0 ? id - 1 : -1,
    ];
    for (const next of neighbors) {
      if (next < 0 || blocked.has(next) || closed[next]) continue;
      const alt = distance[id] + costs[next];
      if (algorithm === 'bfs') {
        if (discovered[next]) continue;
        discovered[next] = 1;
        distance[next] = alt;
        parent[next] = id;
        queue.push(next);
      } else if (alt < distance[next]) {
        distance[next] = alt;
        parent[next] = id;
        heap.push(next, alt + (algorithm === 'astar' ? h(next) : 0));
      }
    }
  }
  if (!closed[goal]) return { visited, path: [], cost: 0, moves: 0, found: false };
  const path: number[] = [];
  for (let at = goal; at !== -1; at = parent[at]) path.push(at);
  path.reverse();
  return { visited, path, cost: distance[goal], moves: path.length - 1, found: true };
}

export function sampleTerrain(): Terrain {
  const width = 19,
    height = 9,
    start = width * 4 + 1,
    goal = width * 4 + 17,
    costs = Array(width * height).fill(1),
    walls: number[] = [];
  for (let x = 4; x < 15; x++) costs[width * 4 + x] = 7;
  for (let y = 1; y < 8; y++) {
    if (y !== 4 && y !== 1) walls.push(y * width + 7);
    if (y !== 4 && y !== 7) walls.push(y * width + 12);
  }
  return { width, height, start, goal, costs, walls };
}
