#!/usr/bin/env node
/**
 * Valida baselines PNG do spec de colapso (mobile/tablet/desktop).
 * Falha com instrução exata (`npm run e2e:collapse:update:<vp>`) quando ausente.
 *
 * Playwright nomeia snapshots com sufixo de projeto/plataforma quando o projeto
 * é explicitamente passado (ex: location-panel-expanded-mobile-chromium-authed-linux.png).
 * Este script aceita qualquer uma das formas:
 *   - location-panel-{state}-{vp}.png          (sem sufixo)
 *   - location-panel-{state}-{vp}-*.png        (com sufixo — qualquer projeto/OS)
 *
 * Uso:
 *   node scripts/qa/check-collapse-baselines.mjs             # todos
 *   node scripts/qa/check-collapse-baselines.mjs --viewport tablet
 */
import { existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAP_DIR = join(
  __dirname,
  "..",
  "..",
  "e2e",
  "customization",
  "collapse-reflow.spec.ts-snapshots",
);

const args = new Map(
  process.argv.slice(2).flatMap((a, i, arr) =>
    a.startsWith("--") ? [[a.slice(2), arr[i + 1]]] : [],
  ),
);
const only = args.get("viewport");
const VIEWPORTS = ["mobile", "tablet", "desktop"].filter((v) => !only || v === only);
const STATES = ["expanded", "collapsed"];

/** Aceita 'location-panel-{st}-{vp}.png' ou 'location-panel-{st}-{vp}-*.png' */
function baselineExists(snapDir, st, vp) {
  const exact = join(snapDir, `location-panel-${st}-${vp}.png`);
  if (existsSync(exact)) return true;
  if (!existsSync(snapDir)) return false;
  const prefix = `location-panel-${st}-${vp}-`;
  return readdirSync(snapDir).some((f) => f.startsWith(prefix) && f.endsWith(".png"));
}

const missing = [];
for (const vp of VIEWPORTS) {
  for (const st of STATES) {
    const file = `location-panel-${st}-${vp}.png`;
    if (!baselineExists(SNAP_DIR, st, vp)) missing.push({ vp, file });
  }
}

if (missing.length === 0) {
  console.log(`✓ Baselines OK (${VIEWPORTS.length} viewport(s) × ${STATES.length} estado(s))`);
  process.exit(0);
}

console.error(`\n❌ Baselines ausentes (${missing.length}):`);
const byVp = new Map();
for (const m of missing) {
  if (!byVp.has(m.vp)) byVp.set(m.vp, []);
  byVp.get(m.vp).push(m.file);
}
for (const [vp, files] of byVp) {
  console.error(`\n  [${vp}] arquivos ausentes:`);
  for (const f of files) console.error(`    - ${f}`);
  console.error(`  💡 Gere/atualize com:\n     npm run e2e:collapse:update:${vp}`);
}
console.error(
  `\n  Ou, para todos os viewports de uma vez:\n     npm run e2e:collapse:seed\n`,
);
process.exit(1);
