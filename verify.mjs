// Verifies that every built-in level is beatable by the bot (physics = same code the game uses).
// Usage: node verify.mjs          (Node 22+)
import { buildIndex } from './src/game/sim.ts';
import { verifyLevel } from './src/game/bot.ts';
import { LEVELS, buildBuiltin } from './src/game/levelDefs.ts';

let failed = 0;
for (const def of LEVELS) {
  const data = buildBuiltin(def);
  const t = Date.now();
  // the level must be beatable for every phase of the tap-timing grid (robust, not frame-perfect)
  let r = { ok: true, reachedX: 0, percent: 100 };
  for (const phase of [0, 1, 2, 3]) {
    r = verifyLevel(buildIndex(data), 4, 6000, phase);
    if (!r.ok) break;
  }
  const status = r.ok ? 'OK  ' : 'FAIL';
  console.log(`${status} ${def.id.padEnd(14)} objects=${String(data.objects.length).padStart(5)} end=${Math.round(data.endX)} reached=${r.percent}% (${Date.now() - t} ms)`);
  if (!r.ok) {
    failed++;
    console.log(`     stuck near x=${r.reachedX.toFixed(1)}`);
  }
}
if (failed) {
  console.error(`${failed} level(s) are not beatable`);
  process.exit(1);
}
