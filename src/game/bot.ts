/**
 * Level verifier: explores every possible tap/hold timing (quantised to `slot` physics steps, default 4 = 33 ms,
 * i.e. stricter than a human) and reports whether at least one input sequence reaches the finish.
 * PURE module (Node + browser). Used by verify.mjs (CI) and by the editor's "bot check" button.
 */
import { cloneState, createState, step, type LevelIndex, type SimState } from './sim.ts';

export interface VerifyResult {
  ok: boolean;
  /** furthest x reached by any attempt (tiles) */
  reachedX: number;
  endX: number;
  percent: number;
  /** peak number of simultaneously tracked states (diagnostics) */
  peak: number;
}

interface Node {
  s: SimState;
  hold: boolean;
}

/** `phase` (0..slot-1) shifts the tap-timing grid by that many physics steps; a robust level passes for every phase. */
export function verifyLevel(L: LevelIndex, slot = 4, cap = 3000, phase = 0): VerifyResult {
  const start = createState();
  for (let i = 0; i < phase; i++) step(start, L, false, false);
  let frontier: Node[] = [{ s: start, hold: false }];
  let reached = 0;
  let peak = 1;

  while (frontier.length > 0) {
    const next = new Map<string, Node>();
    for (const n of frontier) {
      for (const act of [false, true]) {
        const s = cloneState(n.s);
        for (let i = 0; i < slot; i++) {
          step(s, L, act, act && !n.hold && i === 0);
          if (s.dead || s.won) break;
        }
        if (s.x > reached) reached = s.x;
        if (s.won) return { ok: true, reachedX: s.x, endX: L.endX, percent: 100, peak };
        if (s.dead) continue;
        const key = `${Math.round(s.y * 60)}|${Math.round(s.vy * 6)}|${s.up}|${s.mode}|${s.onGround ? 1 : 0}|${act ? 1 : 0}|${s.x - s.lastOrbX < 3 ? s.lastOrb : -1}|${s.x - s.lastPadX < 3 ? s.lastPad : -1}|${s.orbBuf > 0 ? 1 : 0}`;
        if (!next.has(key)) next.set(key, { s, hold: act });
      }
    }
    let list = [...next.values()];
    if (list.length > cap) {
      const stride = list.length / cap;
      list = Array.from({ length: cap }, (_, i) => list[Math.floor(i * stride)]);
    }
    peak = Math.max(peak, list.length);
    frontier = list;
  }
  return { ok: false, reachedX: reached, endX: L.endX, percent: Math.min(99, Math.floor((reached / L.endX) * 100)), peak };
}
