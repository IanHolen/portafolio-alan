/**
 * The Experience Catalog — every 3D layout the gallery knows how to render.
 * Any experience can power a category room or a private wedding link.
 *
 * DESIGN RULES (learned the hard way):
 *  · OrbitControls pivots around the origin — every layout must WRAP the
 *    center (shell/ring/disc), never extend far away in one direction.
 *  · Every layout SAMPLES its photos to a cap — 700 photos must not
 *    produce a 150-unit wall.
 *  · fogFar is always ≥ ~2.5× the farthest photo, so the back is visible.
 *  · Each experience declares where the camera is born (startPosition).
 */

import type { Photo } from "./supabase";
import type { WorldNode } from "@/components/experiences/World";

export type WorldSettings = {
  background?: string;
  startDistance?: number;
  startPosition?: [number, number, number];
  minDistance?: number;
  maxDistance?: number;
  fogNear?: number;
  fogFar?: number;
  autoRotate?: number;
  minPolar?: number;
  maxPolar?: number;
  dimOpacity?: number;
  floor?: { y: number; radius: number };
};

export type ExperienceDef = {
  id: string;
  label: string;
  blurb: string;
  glyph: string;
  layout: (photos: Photo[]) => WorldNode[];
  world: WorldSettings;
};

/* ================= helpers ================= */

const GAP = 1.6;
const ar = (p: Photo) => (p.width || 1440) / (p.height || 960);

/** even-stride sample down to n photos, preserving order */
function sample(all: Photo[], n: number): { p: Photo; gi: number }[] {
  if (all.length <= n) return all.map((p, i) => ({ p, gi: i }));
  const out: { p: Photo; gi: number }[] = [];
  const step = all.length / n;
  for (let i = 0; out.length < n; i += step) {
    const gi = Math.floor(i);
    out.push({ p: all[gi], gi });
  }
  return out;
}

/** yaw so the photo faces the origin (horizontal only) */
const faceCenter = (x: number, z: number): [number, number, number] => [
  0,
  Math.atan2(x, z) + Math.PI,
  0,
];

/** face the origin including tilt up/down (damped so it never flips) */
function faceIn(x: number, y: number, z: number): [number, number, number] {
  const len = Math.sqrt(x * x + y * y + z * z) || 1;
  return [Math.asin((y / len) * 0.85), Math.atan2(x, z) + Math.PI, 0];
}

/** deterministic 0..1 from index */
const rnd = (i: number, salt = 0) => {
  let h = (i + 1) * 2654435761 + salt * 40503;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

/** fill one horizontal ring, aspect-aware */
function ring(
  items: { p: Photo; gi: number }[],
  startIdx: number,
  r: number,
  y: number,
  h: number,
  opts: { speed?: number; phase0?: number; pinned?: boolean; frame?: string } = {}
): { nodes: WorldNode[]; next: number } {
  const circ = 2 * Math.PI * r;
  const widths: number[] = [];
  let used = 0;
  let probe = startIdx;
  while (probe < items.length) {
    const w = h * ar(items[probe].p);
    if (used + w + GAP > circ) break;
    widths.push(w);
    used += w + GAP;
    probe++;
  }
  const n = widths.length;
  const nodes: WorldNode[] = [];
  if (!n) return { nodes, next: startIdx };
  const slack = (circ - used) / n;
  let arc = 0;
  for (let j = 0; j < n; j++) {
    const { p, gi } = items[startIdx + j];
    const w = widths[j];
    const phase = ((arc + w / 2) / circ) * Math.PI * 2 + (opts.phase0 || 0);
    arc += w + GAP + slack;
    const x = Math.cos(phase) * r;
    const z = Math.sin(phase) * r;
    nodes.push({
      photo: p,
      index: gi,
      pos: [x, y, z],
      rot: opts.speed ? [0, 0, 0] : faceCenter(x, z),
      w,
      h,
      pinned: opts.pinned,
      frame: opts.frame,
      orbit: opts.speed ? { r, y, speed: opts.speed, phase } : undefined,
    });
  }
  return { nodes, next: startIdx + n };
}

type N3 = [number, number, number];

/* ================= layouts ================= */

function orbit(all: Photo[]): WorldNode[] {
  // THE Orbit — five counter-rotating bands in an hourglass profile,
  // every photo measured so nothing crowds (the beloved v2 geometry)
  const items = sample(all, 170);
  const BANDS: [number, number, number, number][] = [
    [17.5, 7.2, 0.02, 2.6],
    [14.5, 3.6, -0.014, 2.9],
    [13.0, 0.0, 0.01, 3.2],
    [14.5, -3.6, -0.017, 2.9],
    [17.5, -7.2, 0.023, 2.6],
  ];
  const nodes: WorldNode[] = [];
  let idx = 0;
  for (const [r, y, speed, h] of BANDS) {
    if (idx >= items.length) break;
    const res = ring(items, idx, r, y, h, { speed });
    if (res.next === idx) break;
    nodes.push(...res.nodes);
    idx = res.next;
  }
  return nodes;
}

function sphere(all: Photo[]): WorldNode[] {
  const items = sample(all, 220);
  const N = items.length;
  const GA = Math.PI * (3 - Math.sqrt(5));
  const r = Math.max(13, Math.min(20, 9 + N * 0.1));
  return items.map(({ p, gi }, i) => {
    const y = 1 - (i / Math.max(1, N - 1)) * 2;
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    const th = GA * i;
    const x = Math.cos(th) * rad * r;
    const z = Math.sin(th) * rad * r;
    const h = 2.6;
    return {
      photo: p, index: gi,
      pos: [x, y * r * 0.82, z] as N3,
      rot: faceCenter(x, z), w: h * ar(p), h,
    };
  });
}

function spiral(all: Photo[]): WorldNode[] {
  const items = sample(all, 140);
  return items.map(({ p, gi }, i) => {
    const t = i / Math.max(1, items.length - 1);
    const th = t * Math.PI * 6;
    const r = 11;
    const x = Math.cos(th) * r;
    const z = Math.sin(th) * r;
    const h = 3;
    return {
      photo: p, index: gi,
      pos: [x, -8 + t * 16, z] as N3,
      rot: faceCenter(x, z), w: h * ar(p), h,
    };
  });
}

function stream(all: Photo[]): WorldNode[] {
  const items = sample(all, 90);
  const nodes: WorldNode[] = [];
  let idx = 0;
  for (const [r, dir] of [[16, 1], [12, -1]] as const) {
    const circ = 2 * Math.PI * r;
    const h = r > 14 ? 3.2 : 2.6;
    const widths: number[] = [];
    let used = 0;
    let probe = idx;
    while (probe < items.length) {
      const w = h * ar(items[probe].p);
      if (used + w + GAP > circ) break;
      widths.push(w);
      used += w + GAP;
      probe++;
    }
    const n = widths.length;
    if (!n) break;
    const slack = (circ - used) / n;
    let arc = 0;
    for (let j = 0; j < n; j++) {
      const { p, gi } = items[idx + j];
      const w = widths[j];
      const phase = ((arc + w / 2) / circ) * Math.PI * 2;
      arc += w + GAP + slack;
      const y = Math.sin(phase * 3 + (dir < 0 ? Math.PI : 0)) * 2.6;
      nodes.push({
        photo: p, index: gi,
        pos: [Math.cos(phase) * r, y, Math.sin(phase) * r],
        rot: [0, 0, 0], w, h,
        orbit: { r, y, speed: 0.02 * dir, phase },
      });
    }
    idx += n;
  }
  return nodes;
}

/** TUNNEL — receding rings of frames; dive straight through the middle */
function tunnel(all: Photo[]): WorldNode[] {
  const PER = 9;
  const items = sample(all, 99);
  const R = 6.8;
  const rings = Math.ceil(items.length / PER);
  return items.map(({ p, gi }, i) => {
    const seg = Math.floor(i / PER);
    const a = ((i % PER) / PER) * Math.PI * 2 + seg * 0.5;
    const z = 17 - (seg / Math.max(1, rings - 1)) * 34; // centered ±17
    const h = 2.6;
    return {
      photo: p, index: gi,
      pos: [Math.cos(a) * R, Math.sin(a) * R, z] as N3,
      rot: [0, 0, a - Math.PI / 2] as N3,
      w: h * ar(p), h, pinned: true,
    };
  });
}

/** THE WALL — one curved monumental grid, its center at the origin */
function wall(all: Photo[]): WorldNode[] {
  const COLS = 12, ROWS = 8;
  const items = sample(all, COLS * ROWS);
  const h = 2.6;
  const RC = 34;
  const SPAN = (75 * Math.PI) / 180;
  return items.map(({ p, gi }, i) => {
    const c = i % COLS;
    const rIdx = Math.floor(i / COLS);
    const t = c / (COLS - 1) - 0.5;
    const a = t * SPAN;
    const x = Math.sin(a) * RC;
    const z = -(RC - Math.cos(a) * RC); // edges bend toward the camera
    const y = (rIdx - (ROWS - 1) / 2) * (h + 0.55);
    return {
      photo: p, index: gi,
      pos: [x, y, z] as N3,
      rot: [0, -a, 0] as N3,
      w: h * ar(p), h, pinned: true,
    };
  });
}

/** TOWER — a cylinder of stacked rings, centered on you */
function tower(all: Photo[]): WorldNode[] {
  const items = sample(all, 200);
  const nodes: WorldNode[] = [];
  const LEVELS = 9;
  let idx = 0;
  for (let level = 0; level < LEVELS && idx < items.length; level++) {
    const y = (level - (LEVELS - 1) / 2) * 3.4;
    const res = ring(items, idx, 12, y, 2.9, { phase0: level * 0.5, pinned: true });
    if (res.next === idx) break;
    nodes.push(...res.nodes);
    idx = res.next;
  }
  return nodes;
}

/** PLANETARIUM — a dome of photos above you, like a painted sky */
function dome(all: Photo[]): WorldNode[] {
  const items = sample(all, 160);
  const N = items.length;
  const GA = Math.PI * (3 - Math.sqrt(5));
  const r = 18;
  return items.map(({ p, gi }, i) => {
    const y = 0.08 + (i / Math.max(1, N - 1)) * 0.92;
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    const th = GA * i;
    const x = Math.cos(th) * rad * r;
    const z = Math.sin(th) * rad * r;
    const yy = y * r * 0.85 - 4;
    const h = 2.4;
    return {
      photo: p, index: gi,
      pos: [x, yy, z] as N3,
      rot: faceIn(x, yy, z), w: h * ar(p), h, pinned: true,
    };
  });
}

/** GALAXY — spiral arms slowly rotating; born looking down at the disc */
function galaxy(all: Photo[]): WorldNode[] {
  const items = sample(all, 240);
  const ARMS = 3;
  return items.map(({ p, gi }, i) => {
    const arm = i % ARMS;
    const t = Math.floor(i / ARMS) / Math.max(1, Math.ceil(items.length / ARMS) - 1);
    const r = 4 + t * 18;
    const a = (arm / ARMS) * Math.PI * 2 + t * 2.6;
    const y = (rnd(i, 1) - 0.5) * 2.2;
    const h = 1.9 + t * 1.2;
    return {
      photo: p, index: gi,
      pos: [Math.cos(a) * r, y, Math.sin(a) * r] as N3,
      rot: [0, 0, 0] as N3,
      w: h * ar(p), h,
      orbit: { r, y, speed: 0.028 - t * 0.02, phase: a },
    };
  });
}

/** CORRIDOR — two gallery walls with a mirror floor; the aisle is home */
function corridor(all: Photo[]): WorldNode[] {
  const COLSZ = 11, ROWS = 3;
  const items = sample(all, COLSZ * ROWS * 2);
  const h = 3.0;
  const X = 7.2;
  return items.map(({ p, gi }, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const slot = Math.floor(i / 2);
    const row = slot % ROWS;
    const col = Math.floor(slot / ROWS);
    const z = 20 - col * 4.0;
    const y = (row - (ROWS - 1) / 2) * 3.4;
    return {
      photo: p, index: gi,
      pos: [side * X, y, z] as N3,
      rot: [0, side === -1 ? Math.PI / 2 : -Math.PI / 2, 0] as N3,
      w: h * ar(p), h, pinned: true, frame: "#151210",
    };
  });
}

/** VORTEX — a funnel swirling down into the deep */
function vortex(all: Photo[]): WorldNode[] {
  const items = sample(all, 150);
  return items.map(({ p, gi }, i) => {
    const t = i / Math.max(1, items.length - 1);
    const r = 4 + t * 15;
    const a = t * Math.PI * 9;
    const y = 8 - t * 19;
    const h = 1.9 + t * 1.3;
    return {
      photo: p, index: gi,
      pos: [Math.cos(a) * r, y, Math.sin(a) * r] as N3,
      rot: [0, 0, 0] as N3,
      w: h * ar(p), h,
      orbit: { r, y, speed: 0.05 - t * 0.035, phase: a },
    };
  });
}

/** WAVES — an undulating floating carpet, born above it */
function waves(all: Photo[]): WorldNode[] {
  const COLS = 12, ROWS = 10;
  const items = sample(all, COLS * ROWS);
  const h = 2.4;
  return items.map(({ p, gi }, i) => {
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    const x = (c - (COLS - 1) / 2) * 3.8;
    const z = (r - (ROWS - 1) / 2) * 3.6;
    const y = Math.sin(c * 0.55) * 1.9 + Math.cos(r * 0.7) * 1.6;
    return {
      photo: p, index: gi,
      pos: [x, y, z] as N3,
      rot: [-0.35, 0, 0] as N3,
      w: h * ar(p), h,
    };
  });
}

/** CAROUSEL — counter-rotating rings at eye level */
function carousel(all: Photo[]): WorldNode[] {
  const items = sample(all, 110);
  const nodes: WorldNode[] = [];
  let idx = 0;
  let r = 14;
  let dir = 1;
  while (idx < items.length && r <= 24) {
    const res = ring(items, idx, r, 0, 3.6, { speed: 0.012 * dir });
    if (res.next === idx) break;
    nodes.push(...res.nodes);
    idx = res.next;
    r += 5;
    dir *= -1;
  }
  return nodes;
}

/** ROTUNDA — the framed museum room */
function rotunda(all: Photo[]): WorldNode[] {
  const items = sample(all, 80);
  const nodes: WorldNode[] = [];
  let idx = 0;
  for (const y of [2.9, -2.9]) {
    if (idx >= items.length) break;
    const res = ring(items, idx, 16.5, y, 3.1, { pinned: true, frame: "#efe9dc" });
    nodes.push(...res.nodes);
    idx = res.next;
  }
  return nodes;
}

/** CONSTELLATION — a star-field around you */
function constellation(all: Photo[]): WorldNode[] {
  const items = sample(all, 140);
  return items.map(({ p, gi }, i) => {
    const r = 6 + rnd(i, 2) * 16;
    const th = rnd(i, 3) * Math.PI * 2;
    const ph = Math.acos(2 * rnd(i, 4) - 1);
    const x = r * Math.sin(ph) * Math.cos(th);
    const y = r * Math.cos(ph) * 0.7;
    const z = r * Math.sin(ph) * Math.sin(th);
    const h = 1.7 + rnd(i, 5) * 1.7;
    return {
      photo: p, index: gi,
      pos: [x, y, z] as N3,
      rot: faceCenter(x, z), w: h * ar(p), h,
    };
  });
}

/** THEATER — a banked cinema wall curving around you */
function theater(all: Photo[]): WorldNode[] {
  const COLS = 16;
  const items = sample(all, COLS * 6);
  const h = 2.7;
  return items.map(({ p, gi }, i) => {
    const c = i % COLS;
    const row = Math.floor(i / COLS);
    const t = c / (COLS - 1) - 0.5;
    const SPAN = (130 * Math.PI) / 180;
    const a = t * SPAN;
    const R = 14 + row * 2.1;
    const x = Math.sin(a) * R;
    const z = -Math.cos(a) * R;
    const y = -4 + row * 3.3;
    return {
      photo: p, index: gi,
      pos: [x, y, z] as N3,
      rot: [0, Math.atan2(x, z) + Math.PI, 0] as N3,
      w: h * ar(p), h, pinned: true,
    };
  });
}

/** STAIRCASE — a grand double helix of moments */
function stairs(all: Photo[]): WorldNode[] {
  const items = sample(all, 140);
  return items.map(({ p, gi }, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    const t = i / Math.max(1, items.length - 1);
    const a = t * Math.PI * 4 * side;
    const r = 12;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = 2.8;
    return {
      photo: p, index: gi,
      pos: [x, -10 + t * 20, z] as N3,
      rot: faceCenter(x, z), w: h * ar(p), h,
    };
  });
}

/** RIBBON — a möbius band twisting through space */
function ribbon(all: Photo[]): WorldNode[] {
  const items = sample(all, 72);
  const R = 14;
  return items.map(({ p, gi }, i) => {
    const t = i / items.length;
    const a = t * Math.PI * 2;
    const twist = a * 1.5;
    const x = Math.cos(a) * R;
    const z = Math.sin(a) * R;
    const y = Math.sin(twist) * 4.5;
    const h = 2.9;
    return {
      photo: p, index: gi,
      pos: [x, y, z] as N3,
      rot: [Math.sin(twist) * 0.4, Math.atan2(x, z) + Math.PI, 0] as N3,
      w: h * ar(p), h, pinned: true,
    };
  });
}

/** THE CUBE — you are born INSIDE it, every wall covered in photos */
function cube(all: Photo[]): WorldNode[] {
  const SIDE = 5; // 5×5 per face
  const items = sample(all, SIDE * SIDE * 6);
  const D = 13;
  const h = 3.4;
  const cell = (2 * D) / SIDE;
  // face: outward normal n, right r, up u
  const faces: { n: N3; r: N3; u: N3 }[] = [
    { n: [0, 0, -1], r: [1, 0, 0], u: [0, 1, 0] },
    { n: [0, 0, 1], r: [-1, 0, 0], u: [0, 1, 0] },
    { n: [-1, 0, 0], r: [0, 0, -1], u: [0, 1, 0] },
    { n: [1, 0, 0], r: [0, 0, 1], u: [0, 1, 0] },
    { n: [0, 1, 0], r: [1, 0, 0], u: [0, 0, -1] },
    { n: [0, -1, 0], r: [1, 0, 0], u: [0, 0, 1] },
  ];
  const per = SIDE * SIDE;
  return items.map(({ p, gi }, i) => {
    const f = faces[Math.floor(i / per) % 6];
    const li = i % per;
    const cx = ((li % SIDE) - (SIDE - 1) / 2) * cell;
    const cy = (Math.floor(li / SIDE) - (SIDE - 1) / 2) * cell;
    const pos: N3 = [
      f.n[0] * D + f.r[0] * cx + f.u[0] * cy,
      f.n[1] * D + f.r[1] * cx + f.u[1] * cy,
      f.n[2] * D + f.r[2] * cx + f.u[2] * cy,
    ];
    // face inward = toward -n
    const rot: N3 =
      f.n[1] === 0
        ? [0, Math.atan2(-f.n[0], -f.n[2]), 0]
        : [f.n[1] > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0];
    return { photo: p, index: gi, pos, rot, w: h * ar(p), h, pinned: true };
  });
}

/** RAIN — strands of photos falling gently all around */
function rain(all: Photo[]): WorldNode[] {
  const items = sample(all, 130);
  const STRANDS = 16;
  return items.map(({ p, gi }, i) => {
    const s = i % STRANDS;
    const d = Math.floor(i / STRANDS);
    const r = 6 + rnd(s, 7) * 11;
    const a = rnd(s, 8) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = 2.3;
    return {
      photo: p, index: gi,
      pos: [x, 9 - d * (h + 1.1) - rnd(s, 9) * 2, z] as N3,
      rot: faceCenter(x, z), w: h * ar(p), h,
    };
  });
}

/* ---------- NEW GENERATION ---------- */

/** WORMHOLE — photos on the surface of a giant torus; dive into the tube */
function wormhole(all: Photo[]): WorldNode[] {
  const NU = 24, NV = 7;
  const items = sample(all, NU * NV);
  const R = 13, T = 4.5;
  const h = 2.1;
  return items.map(({ p, gi }, i) => {
    const u = ((i % NU) / NU) * Math.PI * 2;
    const v = (Math.floor(i / NU) / NV) * Math.PI * 2 + u;
    const nx = Math.cos(v) * Math.cos(u);
    const ny = Math.sin(v);
    const nz = Math.cos(v) * Math.sin(u);
    const pos: N3 = [Math.cos(u) * R + nx * T, ny * T, Math.sin(u) * R + nz * T];
    return {
      photo: p, index: gi, pos,
      rot: [Math.asin(-ny * 0.85), Math.atan2(nx, nz), 0] as N3,
      w: h * ar(p), h, pinned: true,
    };
  });
}

/** THE HEART — two nested hearts of photos, made for weddings */
function heart(all: Photo[]): WorldNode[] {
  const items = sample(all, 100);
  const nodes: WorldNode[] = [];
  const shape = (t: number, s: number): [number, number] => [
    s * 16 * Math.pow(Math.sin(t), 3),
    s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
  ];
  items.forEach(({ p, gi }, i) => {
    const outer = i < Math.ceil(items.length * 0.6);
    const n = outer ? Math.ceil(items.length * 0.6) : items.length - Math.ceil(items.length * 0.6);
    const j = outer ? i : i - Math.ceil(items.length * 0.6);
    const t = (j / Math.max(1, n)) * Math.PI * 2;
    const s = outer ? 0.85 : 0.5;
    const [x, y] = shape(t, s);
    const h = outer ? 2.3 : 1.9;
    nodes.push({
      photo: p, index: gi,
      pos: [x, y * 0.9 + 1, (rnd(i, 11) - 0.5) * 1.6] as N3,
      rot: [0, 0, 0] as N3,
      w: h * ar(p), h,
    });
  });
  return nodes;
}

/** INFINITY — a figure-eight river of photos */
function infinity(all: Photo[]): WorldNode[] {
  const items = sample(all, 84);
  const a0 = 17;
  return items.map(({ p, gi }, i) => {
    const t = (i / items.length) * Math.PI * 2;
    const d = 1 + Math.sin(t) * Math.sin(t);
    const x = (a0 * Math.cos(t)) / d;
    const z = (a0 * Math.sin(t) * Math.cos(t)) / d;
    const y = Math.sin(2 * t) * 2;
    const h = 2.6;
    return {
      photo: p, index: gi,
      pos: [x, y, z] as N3,
      rot: faceCenter(x, z), w: h * ar(p), h,
    };
  });
}

/** MANDALA — a rose window of photos, petals tilted around the center */
function mandala(all: Photo[]): WorldNode[] {
  const nodes: WorldNode[] = [];
  const RINGS = [6, 12, 18, 24, 30, 36];
  const items = sample(all, RINGS.reduce((a, b) => a + b, 0));
  let k = 0;
  RINGS.forEach((count, ringI) => {
    const r = 2.6 + ringI * 3.1;
    for (let j = 0; j < count && k < items.length; j++, k++) {
      const a = (j / count) * Math.PI * 2 + ringI * 0.26;
      const { p, gi } = items[k];
      const h = 1.9 + ringI * 0.22;
      nodes.push({
        photo: p, index: gi,
        pos: [Math.cos(a) * r, Math.sin(a) * r, -ringI * 0.5] as N3,
        rot: [0, 0, a - Math.PI / 2] as N3,
        w: h * ar(p), h, pinned: true,
      });
    }
  });
  return nodes;
}

/** SOLAR SYSTEM — clusters of photos orbiting a featured sun */
function solar(all: Photo[]): WorldNode[] {
  const items = sample(all, 90);
  const nodes: WorldNode[] = [];
  // the sun — first photo, big, at the center
  const sun = items[0];
  nodes.push({
    photo: sun.p, index: sun.gi,
    pos: [0, 0, 0], rot: [0, 0, 0],
    w: 6 * ar(sun.p), h: 6, orbit: { r: 0.001, y: 0, speed: 0.05, phase: 0 },
  });
  const PLANETS = 6;
  const rest = items.slice(1);
  const per = Math.ceil(rest.length / PLANETS);
  rest.forEach(({ p, gi }, i) => {
    const pl = Math.floor(i / per);
    const li = i % per;
    const R = 8.5 + pl * 2.6;
    const phase = pl * 2.2 + li * 0.045; // tiny spread → travels as a cluster
    const y = (rnd(li, pl) - 0.5) * 2.4;
    const h = 1.8 + rnd(i, 21) * 0.7;
    nodes.push({
      photo: p, index: gi,
      pos: [Math.cos(phase) * R, y, Math.sin(phase) * R] as N3,
      rot: [0, 0, 0] as N3,
      w: h * ar(p), h,
      orbit: { r: R, y, speed: 0.05 / (1 + pl * 0.45), phase },
    });
  });
  return nodes;
}

/** AURORA — waving curtains of light made of photographs */
function aurora(all: Photo[]): WorldNode[] {
  const CURTAINS = 5, COLS = 10, ROWS = 3;
  const items = sample(all, CURTAINS * COLS * ROWS);
  const nodes: WorldNode[] = [];
  items.forEach(({ p, gi }, i) => {
    const c = i % CURTAINS;
    const rest = Math.floor(i / CURTAINS);
    const col = rest % COLS;
    const row = Math.floor(rest / COLS) % ROWS;
    const r = 10 + c * 2.6;
    const a = ((col / (COLS - 1)) - 0.5) * ((120 * Math.PI) / 180) + c * 0.7;
    const x = Math.cos(a + Math.PI / 2) * r;
    const z = -Math.sin(a + Math.PI / 2) * r;
    const y = (row - 1) * 3.3 + Math.sin(a * 4 + c * 2) * 1.6;
    const h = 2.6;
    nodes.push({
      photo: p, index: gi,
      pos: [x, y, z] as N3,
      rot: faceCenter(x, z), w: h * ar(p), h,
    });
  });
  return nodes;
}

/** SUNFLOWER — a golden-angle disc, every photo a seed */
function sunflower(all: Photo[]): WorldNode[] {
  const items = sample(all, 120);
  const GA = Math.PI * (3 - Math.sqrt(5));
  return items.map(({ p, gi }, i) => {
    const r = 1.9 * Math.sqrt(i + 1);
    const a = GA * i;
    const h = 1.5 + r * 0.07;
    return {
      photo: p, index: gi,
      pos: [Math.cos(a) * r, Math.sin(a) * r, Math.sin(i) * 0.6] as N3,
      rot: [0, 0, 0] as N3,
      w: h * ar(p), h, pinned: true,
    };
  });
}

/** CANYON — two undulating photo cliffs with a mirror river below */
function canyon(all: Photo[]): WorldNode[] {
  const COLSZ = 10, ROWS = 4;
  const items = sample(all, COLSZ * ROWS * 2);
  const h = 2.9;
  return items.map(({ p, gi }, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const slot = Math.floor(i / 2);
    const row = slot % ROWS;
    const col = Math.floor(slot / ROWS);
    const z = 18 - col * 4.0;
    const x = side * (8 + Math.sin(z * 0.3 + (side > 0 ? 1.5 : 0)) * 2.4);
    const y = (row - (ROWS - 1) / 2) * 3.3 + Math.sin(col * 0.9) * 0.8;
    return {
      photo: p, index: gi,
      pos: [x, y, z] as N3,
      rot: [0, side === -1 ? Math.PI / 2 : -Math.PI / 2, 0] as N3,
      w: h * ar(p), h, pinned: true,
    };
  });
}

/** PRISM — photos on the faces of a great floating octahedron */
function prism(all: Photo[]): WorldNode[] {
  const items = sample(all, 120);
  const D = 15;
  const V: N3[] = [
    [D, 0, 0], [-D, 0, 0], [0, D, 0], [0, -D, 0], [0, 0, D], [0, 0, -D],
  ];
  const F: [number, number, number][] = [
    [0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4],
    [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5],
  ];
  const per = Math.ceil(items.length / F.length);
  return items.map(({ p, gi }, i) => {
    const f = F[Math.floor(i / per) % F.length];
    const li = i % per;
    // barycentric grid point
    const row = Math.floor((Math.sqrt(8 * li + 1) - 1) / 2);
    const colI = li - (row * (row + 1)) / 2;
    const w1 = 0.15 + 0.7 * (row / 4);
    const w2 = 0.15 + 0.7 * ((colI + 0.5) / (row + 1)) * (1 - w1) * 1.2;
    const w3 = Math.max(0.05, 1 - w1 - w2);
    const s = w1 + w2 + w3;
    const A = V[f[0]], B = V[f[1]], C = V[f[2]];
    const x = (A[0] * w1 + B[0] * w2 + C[0] * w3) / s;
    const y = (A[1] * w1 + B[1] * w2 + C[1] * w3) / s;
    const z = (A[2] * w1 + B[2] * w2 + C[2] * w3) / s;
    const h = 2.1;
    return {
      photo: p, index: gi,
      pos: [x, y, z] as N3,
      rot: faceIn(x, y, z), w: h * ar(p), h, pinned: true,
    };
  });
}

/** PYRAMID — four photo walls rising to an apex */
function pyramid(all: Photo[]): WorldNode[] {
  const nodes: WorldNode[] = [];
  const ROWS = 5;
  const perRow = [6, 5, 4, 3, 1];
  const total = perRow.reduce((a, b) => a + b, 0) * 4;
  const items = sample(all, total);
  let k = 0;
  for (let face = 0; face < 4; face++) {
    const fa = (face / 4) * Math.PI * 2 + Math.PI / 4;
    for (let row = 0; row < ROWS; row++) {
      const y = -5 + row * 3.6;
      const half = 13 * (1 - row / ROWS);
      const dist = half + 1.5;
      const n = perRow[row];
      for (let j = 0; j < n && k < items.length; j++, k++) {
        const { p, gi } = items[k];
        const off = n === 1 ? 0 : (j / (n - 1) - 0.5) * half * 1.7;
        // face normal direction
        const nx = Math.cos(fa), nz = Math.sin(fa);
        const tx = -nz, tz = nx;
        const x = nx * dist + tx * off;
        const z = nz * dist + tz * off;
        const h = 2.7;
        nodes.push({
          photo: p, index: gi,
          pos: [x, y, z] as N3,
          rot: [0.28, Math.atan2(x, z), 0] as N3, // lean back toward apex
          w: h * ar(p), h, pinned: true,
        });
      }
    }
  }
  return nodes;
}

/** THE GRID — a floating 3D lattice you drift through */
function lattice(all: Photo[]): WorldNode[] {
  const NX = 5, NY = 4, NZ = 5;
  const items = sample(all, NX * NY * NZ);
  const S = 6.5;
  return items.map(({ p, gi }, i) => {
    const x = ((i % NX) - (NX - 1) / 2) * S;
    const y = ((Math.floor(i / NX) % NY) - (NY - 1) / 2) * S;
    const z = ((Math.floor(i / (NX * NY)) % NZ) - (NZ - 1) / 2) * S;
    const h = 2.2;
    return {
      photo: p, index: gi,
      pos: [x, y, z] as N3,
      rot: faceCenter(x || 0.01, z || 0.01), w: h * ar(p), h,
    };
  });
}

/** NAUTILUS — a golden logarithmic spiral seen from above */
function nautilus(all: Photo[]): WorldNode[] {
  const items = sample(all, 90);
  return items.map(({ p, gi }, i) => {
    const t = i / Math.max(1, items.length - 1);
    const th = t * Math.PI * 2 * 2.1;
    const r = 2.2 * Math.exp(0.34 * th * 0.5);
    const rc = Math.min(r, 21);
    const x = Math.cos(th) * rc;
    const z = Math.sin(th) * rc;
    const h = 1.7 + t * 2.1;
    return {
      photo: p, index: gi,
      pos: [x, t * 5 - 2, z] as N3,
      rot: faceCenter(x, z), w: h * ar(p), h,
    };
  });
}

/** GYROSCOPE — rings of photos spinning on tilted axes, like an armillary */
function gyroscope(all: Photo[]): WorldNode[] {
  const RINGN = 4;
  const PER = 20;
  const items = sample(all, RINGN * PER);
  const R = 14;
  const nodes: WorldNode[] = [];
  items.forEach(({ p, gi }, i) => {
    const ringI = Math.floor(i / PER) % RINGN;
    const j = i % PER;
    const tilt = (ringI / RINGN) * Math.PI;
    const a = (j / PER) * Math.PI * 2 + ringI * 0.4;
    // circle in xz, tilted about z axis
    const x0 = Math.cos(a) * R;
    const z0 = Math.sin(a) * R;
    const x = x0 * Math.cos(tilt);
    const y = x0 * Math.sin(tilt);
    const z = z0;
    const h = 2.3;
    nodes.push({
      photo: p, index: gi,
      pos: [x, y * 0.9, z] as N3,
      rot: faceIn(x, y * 0.9, z), w: h * ar(p), h, pinned: true,
    });
  });
  return nodes;
}

/** FIREWORKS — frozen bursts of photographs in the night */
function fireworks(all: Photo[]): WorldNode[] {
  const BURSTS = 6, PER = 12;
  const items = sample(all, BURSTS * PER);
  const nodes: WorldNode[] = [];
  items.forEach(({ p, gi }, i) => {
    const b = Math.floor(i / PER) % BURSTS;
    const j = i % PER;
    const ba = (b / BURSTS) * Math.PI * 2 + rnd(b, 31) * 0.8;
    const br = 9 + rnd(b, 32) * 5;
    const C: N3 = [Math.cos(ba) * br, (rnd(b, 33) - 0.4) * 10, Math.sin(ba) * br];
    const th = rnd(i, 34) * Math.PI * 2;
    const ph = Math.acos(2 * rnd(i, 35) - 1);
    const d = 1.2 + (j / PER) * 4.2;
    const x = C[0] + d * Math.sin(ph) * Math.cos(th);
    const y = C[1] + d * Math.cos(ph);
    const z = C[2] + d * Math.sin(ph) * Math.sin(th);
    const h = 1.5 + rnd(i, 36) * 1.2;
    nodes.push({
      photo: p, index: gi,
      pos: [x, y, z] as N3,
      rot: faceCenter(x, z), w: h * ar(p), h,
    });
  });
  return nodes;
}

/** WATERFALL — a curtain of photos pouring into a mirror pool */
function waterfall(all: Photo[]): WorldNode[] {
  const COLS = 14, ROWS = 8;
  const items = sample(all, COLS * ROWS);
  const h = 2.4;
  return items.map(({ p, gi }, i) => {
    const c = i % COLS;
    const row = Math.floor(i / COLS);
    const x = (c - (COLS - 1) / 2) * 2.9 + Math.sin(row * 1.3 + c) * 0.5;
    const y = 9.5 - row * 2.9;
    const z = -6 + Math.pow(row / ROWS, 2) * 9; // curls toward you at the bottom
    return {
      photo: p, index: gi,
      pos: [x, y, z] as N3,
      rot: [-(row / ROWS) * 0.5, 0, 0] as N3,
      w: h * ar(p), h,
    };
  });
}

/* ================= registry ================= */

const W_DARK = "#0a0705";

export const EXPERIENCE_DEFS: ExperienceDef[] = [
  { id: "orbit", label: "Orbit", glyph: "◎", blurb: "Counter-rotating bands circling the day around you",
    world: { background: W_DARK, startPosition: [0, 0, 31], minDistance: 4, maxDistance: 52, fogNear: 18, fogFar: 95, autoRotate: 0.25, dimOpacity: 0.96 }, layout: orbit },
  { id: "sphere", label: "Sphere", glyph: "◍", blurb: "A globe of moments — dive inside it",
    world: { background: "#060606", startPosition: [0, 0, 32], minDistance: 1.5, maxDistance: 56, fogNear: 20, fogFar: 110, autoRotate: 0.3, dimOpacity: 0.92 }, layout: sphere },
  { id: "spiral", label: "Spiral", glyph: "๑", blurb: "An ascending helix — climb through the story",
    world: { background: W_DARK, startPosition: [0, 2, 26], minDistance: 2.5, maxDistance: 52, fogNear: 16, fogFar: 95, autoRotate: 0.35, dimOpacity: 0.95 }, layout: spiral },
  { id: "stream", label: "River", glyph: "≈", blurb: "Two flowing waves of photographs, one inside the other",
    world: { background: W_DARK, startPosition: [0, 3, 27], minDistance: 2.5, maxDistance: 52, fogNear: 16, fogFar: 95, autoRotate: 0.3, dimOpacity: 0.96 }, layout: stream },
  { id: "tunnel", label: "Tunnel", glyph: "◉", blurb: "A corridor of floating frames — dive straight through it",
    world: { background: "#050507", startPosition: [0, 0, 30], minDistance: 1, maxDistance: 50, fogNear: 20, fogFar: 120, autoRotate: 0.1, dimOpacity: 0.95 }, layout: tunnel },
  { id: "wall", label: "The Wall", glyph: "▤", blurb: "One monumental curved mosaic in front of you",
    world: { background: "#080807", startPosition: [0, 0, 30], minDistance: 3, maxDistance: 56, fogNear: 24, fogFar: 130, autoRotate: 0.08, dimOpacity: 0.97 }, layout: wall },
  { id: "tower", label: "Tower", glyph: "▥", blurb: "A cylinder of stacked rings — rise through it",
    world: { background: W_DARK, startPosition: [0, 4, 30], minDistance: 2, maxDistance: 56, fogNear: 18, fogFar: 110, autoRotate: 0.4, dimOpacity: 0.95 }, layout: tower },
  { id: "dome", label: "Planetarium", glyph: "◠", blurb: "A dome of photos above you, like a painted sky",
    world: { background: "#05060a", startPosition: [0, -1, 15], minDistance: 1.5, maxDistance: 44, fogNear: 16, fogFar: 100, autoRotate: 0.25, dimOpacity: 0.94 }, layout: dome },
  { id: "galaxy", label: "Galaxy", glyph: "✦", blurb: "Spiral arms of images — you arrive from above",
    world: { background: "#06050a", startPosition: [0, 26, 12], minDistance: 2, maxDistance: 56, fogNear: 20, fogFar: 120, autoRotate: 0.2, dimOpacity: 0.93 }, layout: galaxy },
  { id: "corridor", label: "Corridor", glyph: "‖", blurb: "Two gallery walls and a mirror aisle between them",
    world: { background: "#0b0a08", startPosition: [0, 1.5, 30], minDistance: 2, maxDistance: 48, fogNear: 20, fogFar: 130, autoRotate: 0, dimOpacity: 1, floor: { y: -5.2, radius: 40 } }, layout: corridor },
  { id: "vortex", label: "Vortex", glyph: "࿊", blurb: "A swirling funnel pulling the photos deep",
    world: { background: "#070508", startPosition: [0, 10, 26], minDistance: 2.5, maxDistance: 54, fogNear: 18, fogFar: 110, autoRotate: 0.3, dimOpacity: 0.94 }, layout: vortex },
  { id: "waves", label: "Waves", glyph: "〜", blurb: "A floating undulating carpet, seen from the air",
    world: { background: "#060707", startPosition: [0, 16, 30], minDistance: 2.5, maxDistance: 56, fogNear: 20, fogFar: 125, autoRotate: 0.2, dimOpacity: 0.95 }, layout: waves },
  { id: "carousel", label: "Carousel", glyph: "◌", blurb: "Majestic counter-rotating rings at eye level",
    world: { background: W_DARK, startPosition: [0, 3, 30], minDistance: 2.5, maxDistance: 56, fogNear: 18, fogFar: 115, autoRotate: 0.25, dimOpacity: 0.96 }, layout: carousel },
  { id: "rotunda", label: "Rotunda", glyph: "◔", blurb: "A framed museum room with a mirror floor",
    world: { background: "#0c0a07", startPosition: [0, 0, 9], minDistance: 2, maxDistance: 22, fogNear: 26, fogFar: 80, autoRotate: 0.3, minPolar: 0.35, maxPolar: Math.PI - 0.35, dimOpacity: 1, floor: { y: -5.4, radius: 22 } }, layout: rotunda },
  { id: "constellation", label: "Constellation", glyph: "✧", blurb: "A star-field — photos scattered in deep space",
    world: { background: "#04040a", startPosition: [0, 0, 28], minDistance: 1, maxDistance: 54, fogNear: 12, fogFar: 110, autoRotate: 0.22, dimOpacity: 0.9 }, layout: constellation },
  { id: "theater", label: "Theater", glyph: "◗", blurb: "A giant curved cinema of banked rows around you",
    world: { background: "#080706", startPosition: [0, 2, 20], minDistance: 2.5, maxDistance: 48, fogNear: 18, fogFar: 115, autoRotate: 0.1, dimOpacity: 0.97 }, layout: theater },
  { id: "stairs", label: "Staircase", glyph: "𝄜", blurb: "A grand double helix staircase of moments",
    world: { background: W_DARK, startPosition: [0, 4, 30], minDistance: 2.5, maxDistance: 54, fogNear: 18, fogFar: 110, autoRotate: 0.3, dimOpacity: 0.95 }, layout: stairs },
  { id: "ribbon", label: "Ribbon", glyph: "∞", blurb: "A twisting band of photos looping through space",
    world: { background: "#070608", startPosition: [0, 6, 27], minDistance: 2.5, maxDistance: 52, fogNear: 18, fogFar: 100, autoRotate: 0.35, dimOpacity: 0.95 }, layout: ribbon },
  { id: "cube", label: "The Cube", glyph: "▣", blurb: "Born inside a photo-lined cube — fly out to see it whole",
    world: { background: "#060606", startPosition: [5, 3, 8], minDistance: 1, maxDistance: 34, fogNear: 10, fogFar: 95, autoRotate: 0.25, dimOpacity: 0.96 }, layout: cube },
  { id: "rain", label: "Rain", glyph: "☂", blurb: "Vertical strands of photos falling around you",
    world: { background: "#05060a", startPosition: [0, 2, 26], minDistance: 2, maxDistance: 52, fogNear: 16, fogFar: 100, autoRotate: 0.25, dimOpacity: 0.93 }, layout: rain },
  /* ---- new generation ---- */
  { id: "wormhole", label: "Wormhole", glyph: "◕", blurb: "A great photo torus — dive into the tube and loop it",
    world: { background: "#060509", startPosition: [0, 16, 24], minDistance: 1.5, maxDistance: 54, fogNear: 16, fogFar: 115, autoRotate: 0.28, dimOpacity: 0.94 }, layout: wormhole },
  { id: "heart", label: "The Heart", glyph: "♡", blurb: "Two nested hearts of photos — made for couples",
    world: { background: W_DARK, startPosition: [0, 1, 30], minDistance: 3, maxDistance: 56, fogNear: 22, fogFar: 125, autoRotate: 0.12, dimOpacity: 0.96 }, layout: heart },
  { id: "infinity", label: "Infinity", glyph: "∝", blurb: "A figure-eight river — love without an end",
    world: { background: "#070608", startPosition: [0, 10, 28], minDistance: 2.5, maxDistance: 54, fogNear: 18, fogFar: 115, autoRotate: 0.25, dimOpacity: 0.95 }, layout: infinity },
  { id: "mandala", label: "Mandala", glyph: "❋", blurb: "A rose window of photographs, petal by petal",
    world: { background: "#080607", startPosition: [0, 0, 27], minDistance: 3, maxDistance: 54, fogNear: 20, fogFar: 120, autoRotate: 0.1, dimOpacity: 0.97 }, layout: mandala },
  { id: "solar", label: "Solar System", glyph: "☉", blurb: "Clusters of photos orbiting one featured sun",
    world: { background: "#050508", startPosition: [0, 10, 30], minDistance: 2, maxDistance: 56, fogNear: 18, fogFar: 120, autoRotate: 0.15, dimOpacity: 0.93 }, layout: solar },
  { id: "aurora", label: "Aurora", glyph: "☄", blurb: "Waving curtains of light made of photographs",
    world: { background: "#04070a", startPosition: [0, 3, 30], minDistance: 2.5, maxDistance: 56, fogNear: 18, fogFar: 120, autoRotate: 0.18, dimOpacity: 0.94 }, layout: aurora },
  { id: "sunflower", label: "Sunflower", glyph: "❁", blurb: "A golden-ratio disc — every photo a seed",
    world: { background: "#080706", startPosition: [0, 0, 30], minDistance: 3, maxDistance: 54, fogNear: 22, fogFar: 120, autoRotate: 0.12, dimOpacity: 0.97 }, layout: sunflower },
  { id: "canyon", label: "Canyon", glyph: "⌒", blurb: "Two winding photo cliffs above a mirror river",
    world: { background: "#0a0806", startPosition: [0, 2, 30], minDistance: 2, maxDistance: 50, fogNear: 20, fogFar: 130, autoRotate: 0, dimOpacity: 1, floor: { y: -7, radius: 44 } }, layout: canyon },
  { id: "prism", label: "Prism", glyph: "◇", blurb: "A vast floating octahedron faced with photos",
    world: { background: "#060608", startPosition: [0, 5, 27], minDistance: 2, maxDistance: 54, fogNear: 16, fogFar: 110, autoRotate: 0.3, dimOpacity: 0.94 }, layout: prism },
  { id: "pyramid", label: "Pyramid", glyph: "△", blurb: "Four photo walls rising to a single apex",
    world: { background: "#090705", startPosition: [0, 3, 30], minDistance: 3, maxDistance: 56, fogNear: 20, fogFar: 120, autoRotate: 0.25, dimOpacity: 0.95 }, layout: pyramid },
  { id: "lattice", label: "The Grid", glyph: "⌗", blurb: "A floating 3D lattice you drift through",
    world: { background: "#060606", startPosition: [0, 6, 28], minDistance: 1.5, maxDistance: 54, fogNear: 12, fogFar: 115, autoRotate: 0.2, dimOpacity: 0.9 }, layout: lattice },
  { id: "nautilus", label: "Nautilus", glyph: "๛", blurb: "A golden spiral shell, seen from above",
    world: { background: "#080707", startPosition: [0, 24, 16], minDistance: 2, maxDistance: 56, fogNear: 18, fogFar: 120, autoRotate: 0.2, dimOpacity: 0.95 }, layout: nautilus },
  { id: "gyroscope", label: "Gyroscope", glyph: "❍", blurb: "Tilted rings interlocking like an armillary sphere",
    world: { background: "#060609", startPosition: [0, 8, 30], minDistance: 2, maxDistance: 56, fogNear: 16, fogFar: 115, autoRotate: 0.3, dimOpacity: 0.94 }, layout: gyroscope },
  { id: "fireworks", label: "Fireworks", glyph: "❈", blurb: "Frozen bursts of photographs in the night",
    world: { background: "#04040a", startPosition: [0, 0, 30], minDistance: 2, maxDistance: 54, fogNear: 14, fogFar: 115, autoRotate: 0.22, dimOpacity: 0.92 }, layout: fireworks },
  { id: "waterfall", label: "Waterfall", glyph: "𝄒", blurb: "A curtain of photos pouring into a mirror pool",
    world: { background: "#05070a", startPosition: [0, 0, 30], minDistance: 3, maxDistance: 54, fogNear: 20, fogFar: 125, autoRotate: 0.1, dimOpacity: 0.96, floor: { y: -14, radius: 40 } }, layout: waterfall },
];

export const getExperience = (id?: string | null): ExperienceDef | undefined =>
  EXPERIENCE_DEFS.find((e) => e.id === id);

/** picker list (id/label/blurb) — safe for admin UIs */
export const EXPERIENCES = EXPERIENCE_DEFS.map(({ id, label, blurb }) => ({ id, label, blurb }));

/* ---------- category assignment (site_settings) ---------- */

import { supabase } from "./supabase";

export async function fetchCategoryExperiences(): Promise<Record<string, string>> {
  const { data } = await supabase
    .from("site_settings")
    .select("key,value")
    .like("key", "exp_%");
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key.replace(/^exp_/, "")] = row.value;
  return map;
}

export async function fetchCategoryExperience(category: string): Promise<ExperienceDef | null> {
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", `exp_${category}`)
      .maybeSingle();
    if (!data?.value || data.value === "default") return null;
    return getExperience(data.value) || null;
  } catch {
    return null;
  }
}

export async function setCategoryExperience(category: string, value: string) {
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: `exp_${category}`, value }, { onConflict: "key" });
  if (error) throw error;
}
