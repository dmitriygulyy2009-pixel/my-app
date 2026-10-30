/**
 * Procedural level builder. Levels are assembled from hand-designed obstacle patterns (every pattern is
 * individually beatable), laid out deterministically from a seed. The result is a plain LevelData, so
 * built-in levels use exactly the same format as player-made ones (and are verified by bot.ts in CI).
 * PURE module (Node + browser).
 */
import { computeEndX, type LevelData, type LevelObj } from './levelData.ts';
import { SPEED } from './sim.ts';

export interface GenConfig {
  id: string;
  name: string;
  seed: number;
  bpm: number;
  themeId: string;
  trackId: string;
  /** level length in seconds */
  seconds: number;
  /** 1 (easy) .. 6 (demon) */
  diff: number;
  pads?: boolean;
  orbs?: boolean;
  saws?: boolean;
  ship?: boolean;
  grav?: boolean;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
const ri = (rng: Rng, a: number, b: number): number => a + Math.floor(rng() * (b - a + 1));

interface Pat {
  objs: LevelObj[];
  /** columns occupied (last obstacle col + 1) */
  len: number;
}

const S = (x: number, y = 0, r = 0): LevelObj => (r ? { k: 'spike', x, y, r } : { k: 'spike', x, y });
const B = (x: number, y = 0): LevelObj => ({ k: 'block', x, y });
const W = (x: number, y = 0): LevelObj => ({ k: 'saw', x, y });
const PD = (x: number, y = 0, r = 0): LevelObj => (r ? { k: 'pad', x, y, r } : { k: 'pad', x, y });
const O = (x: number, y: number): LevelObj => ({ k: 'orb', x, y });
const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const pillar = (x: number, h: number): LevelObj[] => range(0, h - 1).map((y) => B(x, y));

export interface PatDef {
  name: string;
  min: number; // minimum difficulty
  weight: number;
  need?: 'pads' | 'orbs' | 'saws';
  make: (rng: Rng) => Pat;
}

export const PATTERNS: PatDef[] = [
  { name: 'single', min: 1, weight: 6, make: () => ({ objs: [S(0)], len: 1 }) },
  { name: 'double', min: 1, weight: 5, make: () => ({ objs: [S(0), S(1)], len: 2 }) },
  { name: 'triple', min: 2, weight: 3, make: () => ({ objs: [S(0), S(1), S(2)], len: 3 }) },
  { name: 'spaced', min: 1, weight: 4, make: () => ({ objs: [S(0), S(6)], len: 7 }) },
  { name: 'spaced3', min: 3, weight: 3, make: () => ({ objs: [S(0), S(6), S(12)], len: 13 }) },
  { name: 'doubleGap', min: 2, weight: 3, make: () => ({ objs: [S(0), S(1), S(7), S(8)], len: 9 }) },
  { name: 'blocks3', min: 1, weight: 4, make: () => ({ objs: [B(0), B(1), B(2), S(6)], len: 7 }) },
  { name: 'blockSpikeTop', min: 2, weight: 3, make: () => ({ objs: [B(0), S(0, 1)], len: 1 }) },
  { name: 'blockHop', min: 2, weight: 3, make: () => ({ objs: [B(0), B(1), S(4)], len: 5 }) },
  { name: 'tower', min: 2, weight: 3, make: () => ({ objs: [B(0), B(1), ...pillar(2, 2), ...pillar(3, 2), S(8)], len: 9 }) },
  { name: 'platform', min: 2, weight: 3, make: () => ({ objs: [...range(0, 4).map((x) => B(x)), S(6), S(7)], len: 8 }) },
  { name: 'stairs', min: 3, weight: 3, make: () => ({ objs: [B(0), B(1), ...pillar(2, 2), ...pillar(3, 2), ...pillar(4, 2), ...pillar(5, 2), B(6), B(7), S(10)], len: 11 }) },
  { name: 'sawLow', min: 3, weight: 3, need: 'saws', make: () => ({ objs: [W(0, 1)], len: 1 }) },
  { name: 'sawGround', min: 3, weight: 3, need: 'saws', make: () => ({ objs: [W(0, 0)], len: 1 }) },
  { name: 'sawSpike', min: 4, weight: 3, need: 'saws', make: () => ({ objs: [W(0, 1), S(6)], len: 7 }) },
  { name: 'sawDouble', min: 5, weight: 2, need: 'saws', make: () => ({ objs: [W(0, 0), W(5, 1), S(10)], len: 11 }) },
  { name: 'pad', min: 2, weight: 4, need: 'pads', make: () => ({ objs: [PD(0), S(3), S(4), S(5)], len: 6 }) },
  { name: 'padLong', min: 3, weight: 3, need: 'pads', make: () => ({ objs: [PD(0), S(3), S(4), S(5), S(10)], len: 11 }) },
  { name: 'padTower', min: 3, weight: 2, need: 'pads', make: () => ({ objs: [PD(0), ...pillar(4, 3), ...pillar(5, 3), ...pillar(6, 3), S(10), S(11)], len: 12 }) },
  { name: 'orbField', min: 3, weight: 4, need: 'orbs', make: () => ({ objs: [...range(0, 5).map((x) => S(x)), O(3, 1)], len: 6 }) },
  { name: 'orbChain', min: 4, weight: 3, need: 'orbs', make: () => ({ objs: [...range(0, 11).map((x) => S(x)), O(2, 1), O(6, 1), O(10, 1)], len: 12 }) },
  { name: 'orbPad', min: 5, weight: 2, need: 'orbs', make: () => ({ objs: [PD(0), ...range(3, 8).map((x) => S(x)), O(5, 3)], len: 9 }) },
];

function pickPattern(rng: Rng, cfg: GenConfig): PatDef {
  const pool = PATTERNS.filter(
    (p) => p.min <= cfg.diff && (!p.need || cfg[p.need]),
  );
  let total = 0;
  for (const p of pool) total += p.weight;
  let r = rng() * total;
  for (const p of pool) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return pool[0];
}

/** Mirror a pattern vertically for the upside-down (gravity portal) sections. */
export function mirror(objs: LevelObj[]): LevelObj[] {
  return objs.map((o) => {
    const m: LevelObj = { k: o.k, x: o.x, y: 8 - o.y };
    if (o.k === 'spike' || o.k === 'pad') {
      const r = ((o.r ?? 0) + 180) % 360;
      if (r) m.r = r;
    }
    return m;
  });
}

function restRange(diff: number): [number, number] {
  const min = Math.max(5, 9 - diff);
  return [min, min + 4];
}

export function cubeSection(rng: Rng, cfg: GenConfig, x0: number, cols: number, flipped: boolean): { objs: LevelObj[]; end: number } {
  const objs: LevelObj[] = [];
  const [rmin, rmax] = restRange(cfg.diff);
  let x = x0;
  while (x < x0 + cols) {
    const pat = pickPattern(rng, cfg).make(rng);
    const placed = pat.objs.map((o) => ({ ...o, x: o.x + x }));
    objs.push(...(flipped ? mirror(placed) : placed));
    x += pat.len + ri(rng, rmin, rmax);
  }
  return { objs, end: x };
}

export function shipSection(rng: Rng, cfg: GenConfig, x0: number, cols: number): { objs: LevelObj[]; end: number } {
  const objs: LevelObj[] = [{ k: 'portalShip', x: x0, y: 3 }];
  const minGap = cfg.diff <= 3 ? 5 : cfg.diff === 4 ? 4 : cfg.diff === 5 ? 3.6 : 3.2;
  const maxBlocks = Math.floor(9 - minGap);
  let floor = 0;
  let ceil = 0;
  let tf = 0;
  let tc = 0;
  const start = x0 + 8;
  const stop = x0 + cols;
  for (let x = start; x < stop; x++) {
    if ((x - start) % 4 === 0) {
      // choose new targets, never closing the corridor below minGap
      tf = ri(rng, 0, Math.min(maxBlocks, 4));
      tc = ri(rng, 0, Math.min(maxBlocks - tf, 4));
      if ((x - start) / 4 % 5 === 4) {
        tf = 0;
        tc = 0;
      }
    }
    if (floor < tf && (x - start) % 2 === 0) floor++;
    else if (floor > tf && (x - start) % 2 === 0) floor--;
    if (ceil < tc && (x - start) % 2 === 1) ceil++;
    else if (ceil > tc && (x - start) % 2 === 1) ceil--;
    if (floor + ceil > maxBlocks) ceil = Math.max(0, maxBlocks - floor);
    for (let y = 0; y < floor; y++) objs.push(B(x, y));
    for (let y = 9 - ceil; y < 9; y++) objs.push(B(x, y));
    if (cfg.diff >= 4 && floor === 0 && rng() < 0.05 && x < stop - 8) objs.push(S(x, 0));
    if (cfg.diff >= 4 && cfg.saws && rng() < 0.03 && x < stop - 8 && floor + ceil <= 2) objs.push(W(x, ri(rng, 3, 5)));
  }
  objs.push({ k: 'portalCube', x: stop, y: 3 });
  return { objs, end: stop + 1 };
}

export function generateLevel(cfg: GenConfig): LevelData {
  const rng = mulberry32(cfg.seed);
  const tiles = Math.round(cfg.seconds * SPEED);
  const objects: LevelObj[] = [];
  let x = 14;

  // fixed plan of sections (fractions of the level): cube / ship / flipped
  type Sec = { at: number; type: 'ship' | 'flip' };
  const plan: Sec[] = [];
  if (cfg.ship) plan.push({ at: 0.42, type: 'ship' });
  if (cfg.grav) plan.push({ at: 0.66, type: 'flip' });
  if (cfg.ship && cfg.diff >= 5) plan.push({ at: 0.86, type: 'ship' });
  plan.sort((a, b) => a.at - b.at);

  let planIdx = 0;
  while (x < tiles - 24) {
    const sec = plan[planIdx];
    if (sec && x >= sec.at * tiles) {
      planIdx++;
      if (sec.type === 'ship') {
        const cols = Math.min(64, Math.round(tiles * 0.12)) + ri(rng, 0, 10);
        const r = shipSection(rng, cfg, x, cols);
        objects.push(...r.objs);
        x = r.end + 8;
      } else {
        const cols = 44 + ri(rng, 0, 14);
        objects.push({ k: 'portalGravUp', x, y: 3 });
        const r = cubeSection(rng, cfg, x + 10, cols, true);
        objects.push(...r.objs);
        x = r.end + 2;
        objects.push({ k: 'portalGravDown', x, y: 3 });
        x += 10;
      }
      continue;
    }
    const nextAt = plan[planIdx] ? Math.floor(plan[planIdx].at * tiles) : tiles - 24;
    const cols = Math.max(12, Math.min(36 + ri(rng, 0, 14), nextAt - x));
    const r = cubeSection(rng, cfg, x, cols, false);
    objects.push(...r.objs);
    x = r.end;
  }

  return {
    id: cfg.id,
    name: cfg.name,
    bpm: cfg.bpm,
    themeId: cfg.themeId,
    trackId: cfg.trackId,
    endX: computeEndX(objects),
    objects,
  };
}
