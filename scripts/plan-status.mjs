#!/usr/bin/env node
/**
 * plan-status.mjs — E010
 * Reports claims and independently recorded verification for the 200-step plan.
 * It deliberately never executes shell text from a Markdown document.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const PLAN_PATH = path.join(ROOT, 'docs/plans/PLANO_MELHORIAS_CORRECOES_200_ETAPAS_2026-10-18.md');
export const RECEIPTS_PATH = path.join(ROOT, 'docs/plans/PLANO_MELHORIAS_CORRECOES_200_ETAPAS_EVIDENCIAS.json');

const HEADING_RE = /^#### P200-(E\d{3})(?: ✅)? · \[([ABCD])\] · (P[0-3]) · (.+)$/;
const REQUIRED_STAGES = 200;

function readJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error(`${label} inválido: ${error.message}`);
  }
}

export function parsePlan(markdown) {
  const sections = markdown.split(/^(?=#### P200-E\d{3})/m);
  const stages = [];

  for (const section of sections) {
    const lines = section.split('\n');
    const heading = lines[0];
    const match = heading.match(HEADING_RE);
    if (!match) continue;

    const [, id, trail, priority, rawTitle] = match;
    const readyLine = lines.find((line) => /^\*\*Pronto:\*\*/.test(line));
    stages.push({
      id,
      trail,
      priority,
      title: rawTitle.replace(/ ✅$/, '').trim(),
      wave: Math.floor((Number(id.slice(1)) - 1) / 10),
      claimedDone: heading.includes('✅'),
      criterion: readyLine ? readyLine.replace(/^\*\*Pronto:\*\*\s*/, '').trim() : null,
    });
  }

  if (stages.some((stage) => !stage.criterion)) {
    const missing = stages.filter((stage) => !stage.criterion).map((stage) => stage.id);
    throw new Error(`Etapa(s) sem critério Pronto: ${missing.join(', ')}`);
  }
  const ids = new Set(stages.map((stage) => stage.id));
  if (stages.length !== REQUIRED_STAGES || ids.size !== REQUIRED_STAGES) {
    throw new Error(`Esperadas ${REQUIRED_STAGES} etapas únicas; encontradas ${stages.length} (${ids.size} IDs únicos).`);
  }
  return stages;
}

export function validateReceipts(receipts) {
  if (!receipts) return {};
  if (receipts.schemaVersion !== 1 || !receipts.records || typeof receipts.records !== 'object' || Array.isArray(receipts.records)) {
    throw new Error('Formato de evidências inválido; esperado schemaVersion 1 e objeto records.');
  }

  for (const [id, receipt] of Object.entries(receipts.records)) {
    if (!/^E\d{3}$/.test(id) || !receipt || typeof receipt !== 'object') {
      throw new Error(`Recibo inválido para ${id}.`);
    }
    if (receipt.exitCode !== 0 || typeof receipt.criterion !== 'string' || !receipt.criterion.trim() ||
        typeof receipt.evidence !== 'string' || !receipt.evidence.trim() ||
        typeof receipt.verifiedAt !== 'string' || Number.isNaN(Date.parse(receipt.verifiedAt)) ||
        typeof receipt.commit !== 'string' || !/^[0-9a-f]{40}$/i.test(receipt.commit)) {
      throw new Error(`Recibo de ${id} precisa registrar criterion, exitCode 0, evidência, data e SHA completo.`);
    }
  }
  return receipts.records;
}

export function classifyStages(stages, records = {}) {
  return stages.map((stage) => {
    const receipt = records[stage.id];
    const criterionMatches = receipt?.criterion === stage.criterion;
    let status;
    if (receipt && criterionMatches && receipt.exitCode === 0) status = 'verified';
    else if (stage.trail === 'C' && !stage.claimedDone) status = 'blocked';
    else if (stage.claimedDone) status = 'claimed';
    else status = 'pending';
    return { ...stage, status, receipt: status === 'verified' ? receipt : null };
  });
}

export function summarizeStages(stages) {
  const counts = { total: stages.length, done: 0, claimed: 0, blocked: 0, todo: 0 };
  const byWave = new Map();
  for (const stage of stages) {
    counts[stage.status === 'verified' ? 'done' : stage.status === 'claimed' ? 'claimed' : stage.status === 'blocked' ? 'blocked' : 'todo']++;
    const wave = byWave.get(stage.wave) ?? { wave: stage.wave, total: 0, done: 0, claimed: 0, blocked: 0, todo: 0 };
    wave.total++;
    wave[stage.status === 'verified' ? 'done' : stage.status === 'claimed' ? 'claimed' : stage.status === 'blocked' ? 'blocked' : 'todo']++;
    byWave.set(stage.wave, wave);
  }
  const waves = [...byWave.values()].sort((a, b) => a.wave - b.wave);
  const waveZeroClosed = waves.find((wave) => wave.wave === 0)?.done === 10;
  for (const wave of waves) {
    wave.eligible = wave.wave === 0 || (waveZeroClosed && waves[wave.wave - 1]?.eligible && waves[wave.wave - 1]?.done >= 8);
  }
  return { ...counts, waveZeroClosed, waves };
}

export function run(argv = process.argv.slice(2)) {
  const filterWave = argv.includes('--wave') ? Number(argv[argv.indexOf('--wave') + 1]) : null;
  const filterPriority = argv.includes('--priority') ? argv[argv.indexOf('--priority') + 1] : null;
  const filterTrail = argv.includes('--trail') ? argv[argv.indexOf('--trail') + 1]?.toUpperCase() : null;
  const jsonMode = argv.includes('--json');

  try {
    const plan = readFileSync(PLAN_PATH, 'utf8');
    const receipts = validateReceipts(readJson(RECEIPTS_PATH, 'Arquivo de recibos'));
    const allStages = classifyStages(parsePlan(plan), receipts);
    const fullSummary = summarizeStages(allStages);
    let stages = allStages;
    if (filterWave !== null) stages = stages.filter((stage) => stage.wave === filterWave);
    if (filterPriority) stages = stages.filter((stage) => stage.priority === filterPriority);
    if (filterTrail) stages = stages.filter((stage) => stage.trail === filterTrail);

    const summary = summarizeStages(stages);
    summary.waveZeroClosed = fullSummary.waveZeroClosed;
    const fullWaves = new Map(fullSummary.waves.map((wave) => [wave.wave, wave]));
    for (const wave of summary.waves) wave.eligible = fullWaves.get(wave.wave)?.eligible ?? false;
    if (jsonMode) {
      console.log(JSON.stringify({
        ...summary,
        stages: stages.map(({ id, trail, priority, wave, title, criterion, claimedDone, status, receipt }) =>
          ({ id, trail, priority, wave, title, criterion, claimedDone, status, receipt })),
      }, null, 2));
      return 0;
    }

    console.log(`\nPlano de 200 etapas — ${summary.total} listadas`);
    console.log(`  ✅ Verificadas por recibo: ${summary.done}`);
    console.log(`  🟡 Marcadas como concluídas, sem recibo: ${summary.claimed}`);
    console.log(`  🔒 Dependem de decisão externa/PO: ${summary.blocked}`);
    console.log(`  ⏳ Sem conclusão registrada: ${summary.todo}\n`);
    if (!summary.waveZeroClosed) {
      const waveZero = summary.waves.find(({ wave }) => wave === 0);
      console.log(`  PORTÃO: Ondas seguintes bloqueadas — Onda 0 verificada ${waveZero?.done ?? 0}/10 (precisa de 10/10).\n`);
    }
    if (filterWave === null && !filterPriority && !filterTrail) {
      for (const wave of summary.waves) {
        const gate = wave.wave === 0 ? 'inicial' : wave.eligible ? 'aberta' : 'bloqueada';
        console.log(`  Onda ${String(wave.wave).padStart(2)} [${gate}]: ${wave.done} verificadas · ${wave.claimed} sem recibo · ${wave.blocked} externas · ${wave.todo} pendentes`);
      }
    } else {
      for (const stage of stages) {
        const icon = { verified: '✅', claimed: '🟡', blocked: '🔒', pending: '⏳' }[stage.status];
        console.log(`  ${icon} ${stage.id} [${stage.trail}] ${stage.priority} — ${stage.title}`);
      }
    }
    return 0;
  } catch (error) {
    console.error(`[plan:status] ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = run();
}
