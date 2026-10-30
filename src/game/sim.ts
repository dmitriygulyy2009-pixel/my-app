/**
 * Deterministic gameplay simulation (cube, ship, pads, orbs, gravity portals).
 * PURE module: no Phaser / DOM imports. The game scene and the bot verifier both run THIS code,
 * so "the bot can beat it" really means "the level is beatable".
 * Units: tiles and seconds. y grows upwards, 0 = ground.
 */
import type { LevelData, LevelObj } from './levelData.ts';

export const DT = 1 / 120;
export const SPEED = 10.4; // tiles / s (GD normal speed)
export const GRAVITY = 116;
export const JUMP_V = 22;
export const PAD_V = 31;
export const ORB_V = 21;
export const TERMINAL_V = 30;
export const SHIP_UP = 42;
export const SHIP_DOWN = 34;
export const SHIP_VMAX = 8.6;
export const HALF = 0.4; // half size of the player's body hitbox
export const HAZ_HALF = 0.34; // hazards use a slightly smaller hitbox (forgiving, like GD)
export const CEIL = 9;
export const STEP_UP = 0.2; // tiny ledges are climbed automatically
export const ORB_BUFFER = 0.09;
const EPS = 1e-6;

export const C_SOLID = 0;
export const C_SPIKE = 1;
export const C_SAW = 2;
export const C_PAD = 3;
export const C_ORB = 4;
export const C_PORTAL = 5;

export const P_SHIP = 0;
export const P_CUBE = 1;
export const P_GRAV_UP = 2; // gravity pulls UP
export const P_GRAV_DOWN = 3; // normal gravity

export interface Collider {
  id: number;
  t: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  r: number;
  dir: number;
  p: number;
}

export interface LevelIndex {
  cols: Collider[][];
  endX: number;
}

function spikeBox(o: LevelObj): [number, number, number, number] {
  const rot = ((o.r ?? 0) % 360 + 360) % 360;
  const cx = o.x + 0.5;
  const cy = o.y + 0.5;
  switch (rot) {
    case 90:
      return [o.x, cy - 0.15, o.x + 0.5, cy + 0.15];
    case 180:
      return [cx - 0.15, o.y + 0.5, cx + 0.15, o.y + 1];
    case 270:
      return [o.x + 0.5, cy - 0.15, o.x + 1, cy + 0.15];
    default:
      return [cx - 0.15, o.y, cx + 0.15, o.y + 0.5];
  }
}

export function buildIndex(level: LevelData): LevelIndex {
  const width = Math.ceil(level.endX) + 6;
  const cols: Collider[][] = Array.from({ length: width + 2 }, () => []);
  let id = 0;
  for (const o of level.objects) {
    if (o.x < 0 || o.x >= width) continue;
    const c: Collider = { id: id++, t: C_SOLID, x0: 0, y0: 0, x1: 0, y1: 0, cx: o.x + 0.5, cy: o.y + 0.5, r: 0, dir: 1, p: 0 };
    switch (o.k) {
      case 'block':
        c.t = C_SOLID;
        c.x0 = o.x; c.y0 = o.y; c.x1 = o.x + 1; c.y1 = o.y + 1;
        break;
      case 'spike': {
        c.t = C_SPIKE;
        const b = spikeBox(o);
        c.x0 = b[0]; c.y0 = b[1]; c.x1 = b[2]; c.y1 = b[3];
        break;
      }
      case 'saw':
        c.t = C_SAW;
        c.r = 0.42;
        break;
      case 'pad': {
        c.t = C_PAD;
        const flip = (o.r ?? 0) === 180;
        c.dir = flip ? -1 : 1;
        c.x0 = o.x + 0.1; c.x1 = o.x + 0.9;
        c.y0 = flip ? o.y + 0.7 : o.y;
        c.y1 = flip ? o.y + 1 : o.y + 0.3;
        break;
      }
      case 'orb':
        c.t = C_ORB;
        c.r = 0.6;
        break;
      default:
        c.t = C_PORTAL;
        c.p = o.k === 'portalShip' ? P_SHIP : o.k === 'portalCube' ? P_CUBE : o.k === 'portalGravUp' ? P_GRAV_UP : P_GRAV_DOWN;
        c.x0 = o.x + 0.3; c.x1 = o.x + 0.7; c.y0 = -1; c.y1 = CEIL + 2; // full-height trigger column
    }
    cols[Math.floor(o.x)].push(c);
  }
  return { cols, endX: level.endX };
}

export interface SimState {
  x: number;
  y: number;
  vy: number;
  up: 1 | -1; // +1 normal gravity (falls down), -1 flipped
  mode: 0 | 1; // 0 cube, 1 ship
  onGround: boolean;
  dead: boolean;
  won: boolean;
  t: number;
  orbBuf: number;
  lastOrb: number;
  lastPad: number;
  /** x of the last used orb / pad (lets the verifier forget old ids) */
  lastOrbX: number;
  lastPadX: number;
}

export function createState(): SimState {
  return { x: 0, y: HALF, vy: 0, up: 1, mode: 0, onGround: true, dead: false, won: false, t: 0, orbBuf: 0, lastOrb: -1, lastPad: -1, lastOrbX: -99, lastPadX: -99 };
}

export function cloneState(s: SimState): SimState {
  return { ...s };
}

function boxHit(px: number, py: number, h: number, k: Collider): boolean {
  return px - h < k.x1 - EPS && px + h > k.x0 + EPS && py - h < k.y1 - EPS && py + h > k.y0 + EPS;
}

function circleHit(px: number, py: number, h: number, k: Collider): boolean {
  const dx = Math.max(px - h, Math.min(k.cx, px + h)) - k.cx;
  const dy = Math.max(py - h, Math.min(k.cy, py + h)) - k.cy;
  return dx * dx + dy * dy < k.r * k.r;
}

function landOnTop(s: SimState, k: Collider): void {
  s.y = k.y1 + HALF;
  if (s.vy < 0) s.vy = 0;
  if (s.up === 1 && s.mode === 0) s.onGround = true;
}

function hitUnderside(s: SimState, k: Collider): void {
  s.y = k.y0 - HALF;
  if (s.vy > 0) s.vy = 0;
  if (s.up === -1 && s.mode === 0) s.onGround = true;
}

/** Advance the simulation by one fixed step. `hold` = finger is down, `press` = finger went down this step. */
export function step(s: SimState, L: LevelIndex, hold: boolean, press: boolean): void {
  if (s.dead || s.won) return;
  s.t += DT;
  s.orbBuf = press ? ORB_BUFFER : Math.max(0, s.orbBuf - DT);

  const up = s.up;
  const wasGround = s.onGround;
  s.onGround = false;
  const prevY = s.y;

  // ---------------------------------------------------------------- vertical motion
  if (s.mode === 0) {
    if (wasGround && hold) s.vy = up * JUMP_V;
    s.vy -= up * GRAVITY * DT;
    if (s.vy > TERMINAL_V) s.vy = TERMINAL_V;
    else if (s.vy < -TERMINAL_V) s.vy = -TERMINAL_V;
  } else {
    s.vy += (hold ? up * SHIP_UP : -up * SHIP_DOWN) * DT;
    if (s.vy > SHIP_VMAX) s.vy = SHIP_VMAX;
    else if (s.vy < -SHIP_VMAX) s.vy = -SHIP_VMAX;
  }
  s.y += s.vy * DT;

  // world floor / ceiling
  if (s.y - HALF < 0) {
    s.y = HALF;
    if (s.vy < 0) s.vy = 0;
    if (up === 1 && s.mode === 0) s.onGround = true;
  }
  if ((s.mode === 1 || up === -1) && s.y + HALF > CEIL) {
    s.y = CEIL - HALF;
    if (s.vy > 0) s.vy = 0;
    if (up === -1 && s.mode === 0) s.onGround = true;
  }

  const c0 = Math.max(0, Math.floor(s.x - 1.3));
  const c1 = Math.min(L.cols.length - 1, Math.floor(s.x + 1.3));

  // solids vs vertical motion: decide by where we were BEFORE the move
  for (let c = c0; c <= c1; c++) {
    for (const k of L.cols[c]) {
      if (k.t !== C_SOLID || !boxHit(s.x, s.y, HALF, k)) continue;
      if (prevY - HALF >= k.y1 - 1e-5) landOnTop(s, k);
      else if (prevY + HALF <= k.y0 + 1e-5) hitUnderside(s, k);
    }
  }

  // ---------------------------------------------------------------- horizontal motion
  s.x += SPEED * DT;
  const d0 = Math.max(0, Math.floor(s.x - 1.3));
  const d1 = Math.min(L.cols.length - 1, Math.floor(s.x + 1.3));
  for (let c = d0; c <= d1; c++) {
    for (const k of L.cols[c]) {
      if (k.t !== C_SOLID || !boxHit(s.x, s.y, HALF, k)) continue;
      if (up === 1 && s.y - HALF - k.y1 >= -STEP_UP) landOnTop(s, k);
      else if (up === -1 && k.y0 - (s.y + HALF) >= -STEP_UP) hitUnderside(s, k);
      else {
        s.dead = true;
        return;
      }
    }
  }

  // ---------------------------------------------------------------- hazards + interactables
  for (let c = d0; c <= d1; c++) {
    for (const k of L.cols[c]) {
      switch (k.t) {
        case C_SPIKE:
          if (boxHit(s.x, s.y, HAZ_HALF, k)) {
            s.dead = true;
            return;
          }
          break;
        case C_SAW:
          if (circleHit(s.x, s.y, HAZ_HALF, k)) {
            s.dead = true;
            return;
          }
          break;
        case C_PAD:
          if (k.id !== s.lastPad && boxHit(s.x, s.y, HALF, k)) {
            s.vy = k.dir * PAD_V;
            s.lastPad = k.id;
            s.lastPadX = k.cx;
            s.onGround = false;
          }
          break;
        case C_ORB:
          if (s.mode === 0 && s.orbBuf > 0 && k.id !== s.lastOrb && circleHit(s.x, s.y, HALF, k)) {
            s.vy = s.up * ORB_V;
            s.lastOrb = k.id;
            s.lastOrbX = k.cx;
            s.orbBuf = 0;
            s.onGround = false;
          }
          break;
        case C_PORTAL:
          if (boxHit(s.x, s.y, HALF, k)) {
            if (k.p === P_SHIP) s.mode = 1;
            else if (k.p === P_CUBE) s.mode = 0;
            else if (k.p === P_GRAV_UP) s.up = -1;
            else s.up = 1;
          }
          break;
      }
    }
  }

  if (s.x >= L.endX) s.won = true;
}
