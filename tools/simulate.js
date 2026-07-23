#!/usr/bin/env node
'use strict';
/*
 * simulate.js — how reliable is "more space = fewer moves"?
 *
 * The demo shows three 4x4 sliding puzzles (1, 2 and 3 blank spaces), each
 * shuffled with the same number of random moves and then solved OPTIMALLY.
 * On any single shuffle the move counts are noisy, so this script measures the
 * actual distributions and reports how often the descending "ladder" really
 * holds.
 *
 * Usage:
 *   node tools/simulate.js
 *   node tools/simulate.js --trials=2000 --depth=40 --seed=12345
 *
 * Deterministic: uses a seeded LCG, so the same seed reproduces the same
 * numbers (this is how the table in README.md was generated).
 *
 * The solver here is the same algorithm the page uses: A* with a
 * Manhattan-distance + linear-conflict heuristic, which is admissible and
 * therefore returns a genuinely shortest solution.
 */

const N = 4, SIZE = N * N;
const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
const rc = i => [(i / N) | 0, i % N];
const idx = (r, c) => r * N + c;

const NB = [];
for (let i = 0; i < SIZE; i++) {
  const [r, c] = rc(i); const a = [];
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < N && nc >= 0 && nc < N) a.push(idx(nr, nc));
  }
  NB[i] = a;
}
const homeR = [], homeC = [];
for (let v = 1; v < SIZE; v++) { homeR[v] = ((v - 1) / N) | 0; homeC[v] = (v - 1) % N; }

// --- heuristic: Manhattan distance + linear conflict (admissible) ---
function heur(b) {
  let h = 0;
  for (let i = 0; i < SIZE; i++) {
    const v = b[i]; if (!v) continue;
    const [r, c] = rc(i);
    h += Math.abs(r - homeR[v]) + Math.abs(c - homeC[v]);
  }
  for (let r = 0; r < N; r++) for (let c1 = 0; c1 < N; c1++) {
    const a = b[idx(r, c1)]; if (!a || homeR[a] !== r) continue;
    for (let c2 = c1 + 1; c2 < N; c2++) {
      const x = b[idx(r, c2)]; if (!x || homeR[x] !== r) continue;
      if (homeC[a] > homeC[x]) h += 2;
    }
  }
  for (let c = 0; c < N; c++) for (let r1 = 0; r1 < N; r1++) {
    const a = b[idx(r1, c)]; if (!a || homeC[a] !== c) continue;
    for (let r2 = r1 + 1; r2 < N; r2++) {
      const x = b[idx(r2, c)]; if (!x || homeC[x] !== c) continue;
      if (homeR[a] > homeR[x]) h += 2;
    }
  }
  return h;
}

const key = b => b.join(',');

class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(x) {
    const a = this.a; a.push(x); let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; }
  }
  pop() {
    const a = this.a, t = a[0], l = a.pop();
    if (a.length) {
      a[0] = l; let i = 0;
      for (;;) {
        let L = 2 * i + 1, R = 2 * i + 2, s = i;
        if (L < a.length && a[L].f < a[s].f) s = L;
        if (R < a.length && a[R].f < a[s].f) s = R;
        if (s === i) break;
        [a[s], a[i]] = [a[i], a[s]]; i = s;
      }
    }
    return t;
  }
}

// --- A*: returns the OPTIMAL (shortest) solution length ---
function solveLen(b0) {
  const k0 = key(b0);
  const g = new Map([[k0, 0]]);
  const open = new Heap();
  open.push({ b: b0.slice(), g: 0, f: heur(b0), k: k0 });
  while (open.size) {
    const cur = open.pop();
    if (g.get(cur.k) !== cur.g) continue;      // stale entry
    if (heur(cur.b) === 0) return cur.g;
    const b = cur.b;
    for (let i = 0; i < SIZE; i++) {
      if (b[i] !== 0) continue;                // i is a blank
      for (const ni of NB[i]) {
        const t = b[ni]; if (t === 0) continue;
        const nb = b.slice(); nb[i] = t; nb[ni] = 0;
        const nk = key(nb), ng = cur.g + 1, old = g.get(nk);
        if (old !== undefined && old <= ng) continue;
        g.set(nk, ng);
        open.push({ b: nb, g: ng, f: ng + heur(nb), k: nk });
      }
    }
  }
  return -1;
}

// --- seeded RNG so runs are reproducible ---
function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

// --- shuffle from solved with `m` random non-reversing moves (always solvable) ---
function scramble(blanks, m, rnd) {
  const b = [];
  for (let i = 1; i <= SIZE - blanks; i++) b.push(i);
  for (let i = 0; i < blanks; i++) b.push(0);
  const holes = []; for (let i = 0; i < SIZE; i++) if (b[i] === 0) holes.push(i);
  let lastTile = -1, lastFrom = -1;
  for (let k = 0; k < m; k++) {
    const mv = [];
    for (const h of holes) for (const ni of NB[h]) {
      if (b[ni] === 0) continue;
      if (b[ni] === lastTile && h === lastFrom) continue;   // don't undo the last move
      mv.push([h, ni]);
    }
    const [h, ni] = mv[(rnd() * mv.length) | 0];
    lastTile = b[ni]; lastFrom = ni;
    b[h] = b[ni]; b[ni] = 0;
    holes[holes.indexOf(h)] = ni;
  }
  return b;
}

function stats(a) {
  const s = a.slice().sort((x, y) => x - y), n = s.length;
  const mean = a.reduce((p, c) => p + c, 0) / n;
  const sd = Math.sqrt(a.reduce((p, c) => p + (c - mean) ** 2, 0) / n);
  const q = p => s[Math.min(n - 1, Math.floor(p * n))];
  return { mean, sd, min: s[0], p25: q(.25), med: q(.5), p75: q(.75), max: s[n - 1] };
}

// --- args ---
const arg = (name, def) => {
  const m = process.argv.find(a => a.startsWith(`--${name}=`));
  return m ? Number(m.split('=')[1]) : def;
};
const TRIALS = arg('trials', 1200);
const DEPTH  = arg('depth', 40);     // matches the page's shuffle depth
const SEED   = arg('seed', 12345);

console.log(`Optimal solve lengths — ${TRIALS} shuffles per board, depth ${DEPTH}, seed ${SEED}\n`);

const rnd = makeRng(SEED);
const L = {};
console.log('board      mean    sd   min   p25   med   p75   max');
console.log('-------------------------------------------------------');
for (const B of [1, 2, 3]) {
  const arr = [];
  while (arr.length < TRIALS) {
    const s = scramble(B, DEPTH, rnd);
    if (heur(s) === 0) continue;               // shuffled back to solved
    arr.push(solveLen(s));
  }
  L[B] = arr;
  const t = stats(arr);
  const lbl = `${B} space${B > 1 ? 's' : ' '}`;
  console.log(
    `${lbl.padEnd(9)} ${t.mean.toFixed(1).padStart(5)} ${t.sd.toFixed(1).padStart(5)} ` +
    `${String(t.min).padStart(5)} ${String(t.p25).padStart(5)} ${String(t.med).padStart(5)} ` +
    `${String(t.p75).padStart(5)} ${String(t.max).padStart(5)}`
  );
}

// How often does a single page load actually show the ladder?
let w12 = 0, w23 = 0, t23 = 0, full = 0;
for (let i = 0; i < TRIALS; i++) {
  const [l1, l2, l3] = [L[1][i], L[2][i], L[3][i]];
  if (l1 > l2) w12++;
  if (l2 > l3) w23++; else if (l2 === l3) t23++;
  if (l1 > l2 && l2 > l3) full++;
}
const pc = x => (100 * x / TRIALS).toFixed(0) + '%';
console.log(`\nOn a single shuffle (independent draws):`);
console.log(`  1 space  > 2 spaces : ${pc(w12)}`);
console.log(`  2 spaces > 3 spaces : ${pc(w23)}  (tied ${pc(t23)})`);
console.log(`  full ladder 1>2>3   : ${pc(full)}`);
