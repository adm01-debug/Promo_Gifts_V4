#!/usr/bin/env node
/**
 * Guard E44 — Toda spec rodada em workflow visual "estrito" (sem
 * --update-snapshots=missing) deve ter ao menos um baseline PNG commitado
 * para o projeto exigido (chromium-public por padrão).
 *
 * "Estrito" = o workflow roda o spec sem --update-snapshots ou
 * --update-snapshots=missing na execução primária de CI (pode existir um
 * job manual/update separado com a flag, mas o job de PR não a usa).
 *
 * Falha com exit 1 e lista acionável se qualquer spec protegida não tiver
 * baseline commitado. Passa silenciosamente com exit 0 se tudo ok.
 *
 * Uso: node scripts/check-visual-baselines.mjs
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DEFAULT_PROJECT = 'chromium-public';

// ─── Specs que CI roda SEM --update-snapshots na execução de PR ────────────
//
// Mapeamento manual derivado de auditoria dos workflows em .github/workflows/.
// Inclui SOMENTE specs com baselines já commitados — este gate é um guarda de
// REGRESSÃO (previne remoção acidental de baselines existentes) e não uma
// checagem de completude.
//
// Workflows auditados:
//   e2e-dialogs-pr-check.yml          → 4 dialog specs + undo-toast, chromium-public
//   ui-visual-a11y.yml                → confirm + alert,              chromium-public
//   e2e-visual-preview-button.yml     → preview-button,               chromium-public
//   e2e-quote-item-editor-sheet.yml   → quote-item-editor,            chromium-public
//
// Excluídos intencionalmente:
//   calendar-visual (e2e-check-calendar-snapshots.yml) — path-filtered, sem
//   baseline commitado; gaps de completude rastreados em issue separado.
//   magazine-ring e optimized-image — workflows sempre usam --update-snapshots.
//
// Atualizar aqui quando um novo workflow estrito com baseline for adicionado.

const PROTECTED = [
  { spec: 'e2e/ui/alert-dialog-visual.spec.ts',                project: DEFAULT_PROJECT },
  { spec: 'e2e/ui/confirm-dialog-visual.spec.ts',              project: DEFAULT_PROJECT },
  { spec: 'e2e/ui/dialog-visual.spec.ts',                      project: DEFAULT_PROJECT },
  { spec: 'e2e/ui/undo-toast-visual.spec.ts',                  project: DEFAULT_PROJECT },
  { spec: 'e2e/visual/preview-button.spec.ts',                 project: DEFAULT_PROJECT },
  { spec: 'e2e/quotes/quote-item-editor-sheet-header.spec.ts', project: DEFAULT_PROJECT },
];

// ─── Baselines commitados via git ls-files ──────────────────────────────────

let committedPngs;
try {
  committedPngs = new Set(
    execSync("git ls-files '*-snapshots/*.png'", { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
  );
} catch {
  console.error('❌ Falha ao executar git ls-files — não está em um repositório git?');
  process.exit(1);
}

// ─── Verifica spec file existência no disco + baseline commitado ────────────

const missing = [];

for (const { spec, project } of PROTECTED) {
  if (!existsSync(join(ROOT, spec))) {
    missing.push({ spec, project, reason: 'spec não existe no disco' });
    continue;
  }

  // Baseline dir pattern: <spec>-snapshots/<name>-<project>-linux.png
  const snapshotsDir = `${spec}-snapshots/`;
  const pattern = `-${project}-linux.png`;

  const hasBaseline = [...committedPngs].some(
    (f) => f.startsWith(snapshotsDir) && f.endsWith(pattern)
  );

  if (!hasBaseline) {
    missing.push({ spec, project, reason: `sem baseline commitado para projeto ${project}` });
  }
}

// ─── Resultado ──────────────────────────────────────────────────────────────

if (missing.length === 0) {
  const count = PROTECTED.length;
  console.log(`✅ Todas as ${count} specs protegidas têm baselines commitados (projeto: ${DEFAULT_PROJECT}).`);
  process.exit(0);
}

console.error('❌ Specs visuais sem baseline commitado (usadas em CI estrito):');
console.error('');
for (const { spec, project, reason } of missing) {
  console.error(`  • ${spec}  [${reason}]`);
  const snapshotsDir = `${spec}-snapshots/`;
  console.error(`    → Gere os baselines e commite: git add ${snapshotsDir}`);
  console.error(`    → Ou remova o spec do workflow estrito e mova para visual-tests.yml`);
  console.error('');
}
console.error(`Workflows que exigem baselines: e2e-check-calendar-snapshots.yml,`);
console.error(`  e2e-dialogs-pr-check.yml, ui-visual-a11y.yml, e2e-visual-preview-button.yml,`);
console.error(`  e2e-quote-item-editor-sheet.yml`);
process.exit(1);
