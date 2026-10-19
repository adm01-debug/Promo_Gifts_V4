#!/usr/bin/env node
/**
 * check-conflict-ledger.mjs — E188 (P200)
 *
 * Verifica se o PR contém commits de merge semântico (pattern merge(pr-NNN):)
 * e, em caso positivo, exige que docs/coordenacao/conflitos-semanticos.md
 * tenha sido modificado no mesmo PR.
 *
 * Uso:
 *   node scripts/check-conflict-ledger.mjs [--gate]
 *
 * --gate: sai com exit 1 se a violação for encontrada (modo CI bloqueante)
 *
 * Variáveis de ambiente (CI):
 *   GITHUB_BASE_REF — branch base do PR (ex: main)
 *   GITHUB_HEAD_REF — branch head do PR (ex: claude/hopeful-heisenberg-dt4bl3)
 *   GITHUB_EVENT_PATH — caminho para o payload do evento GitHub Actions
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';

const isGate = process.argv.includes('--gate');
const LEDGER_PATH = 'docs/coordenacao/conflitos-semanticos.md';
const MERGE_PATTERN = /^merge\(pr-\d+\):/i;

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

function getChangedFiles(baseRef, headRef) {
  if (!baseRef || !headRef) return [];
  const out = git(`diff --name-only origin/${baseRef}...${headRef}`);
  return out ? out.split('\n').filter(Boolean) : [];
}

function getMergeCommits(baseRef, headRef) {
  if (!baseRef || !headRef) return [];
  // Commits no PR que seguem o padrão de resolução de conflito (REGRA #3)
  const out = git(`log origin/${baseRef}..${headRef} --format=%s --merges`);
  const mergeSubjects = out ? out.split('\n').filter(Boolean) : [];

  // Também verificar commits com subject no padrão merge(pr-NNN)
  const allOut = git(`log origin/${baseRef}..${headRef} --format=%s`);
  const allSubjects = allOut ? allOut.split('\n').filter(Boolean) : [];

  const semanticMerges = allSubjects.filter(s => MERGE_PATTERN.test(s));

  return [...new Set([...mergeSubjects, ...semanticMerges])];
}

const baseRef = process.env.GITHUB_BASE_REF || '';
const headRef = process.env.GITHUB_HEAD_REF || '';

if (!baseRef || !headRef) {
  console.log('⚠️  GITHUB_BASE_REF / GITHUB_HEAD_REF não definidos — pulando verificação de ledger.');
  process.exit(0);
}

const mergeCommits = getMergeCommits(baseRef, headRef);
const changedFiles = getChangedFiles(baseRef, headRef);

console.log(`Commits de merge semântico encontrados: ${mergeCommits.length}`);
if (mergeCommits.length > 0) {
  mergeCommits.forEach(s => console.log(`  - ${s}`));
}

if (mergeCommits.length === 0) {
  console.log('✅ Nenhum commit de merge semântico neste PR — ledger de conflitos não exigido.');
  process.exit(0);
}

const ledgerModified = changedFiles.includes(LEDGER_PATH);

if (!ledgerModified) {
  const msg = [
    `[E188] PR contém ${mergeCommits.length} commit(s) de merge semântico mas não modificou`,
    `${LEDGER_PATH}.`,
    `Por REGRA #3 do CLAUDE.md, toda resolução de conflito não trivial deve ser registrada`,
    `no ledger (formato: | Data | PR/branch | Arquivos | Decisão | Razão | Verificação |).`,
  ].join('\n');

  if (isGate) {
    console.error(`::error::${msg}`);
    process.exit(1);
  } else {
    console.warn(`⚠️  ${msg}`);
    process.exit(0);
  }
}

console.log(`✅ Ledger de conflitos atualizado junto com os commits de merge semântico.`);
process.exit(0);
