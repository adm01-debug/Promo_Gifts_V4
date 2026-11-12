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

import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';

const isGate = process.argv.includes('--gate');
const LEDGER_PATH = 'docs/coordenacao/conflitos-semanticos.md';
const MERGE_PATTERN = /^merge\(pr-\d+\):/i;

// Falha real do git (ref inexistente, fora de um repo, etc.) é diferente de
// "git correu e não achou nada" — sem isto, qualquer erro de git virava um
// falso-negativo silencioso ("0 merge commits, ok"). Ver tests/scripts/check-conflict-ledger.test.mjs.
let gitFailed = false;

function git(args) {
  try {
    // execFileSync (sem shell): baseRef/headRef vêm de GITHUB_BASE_REF/GITHUB_HEAD_REF
    // (nome de branch, inclusive de fork — atacante-controlável) e NUNCA podem passar
    // por um shell interpolado (era injeção de comando com execSync(`git ${cmd}`)).
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    gitFailed = true;
    return '';
  }
}

const verifyCommit = (ref) => {
  try {
    return execFileSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
};

/**
 * Resolve o HEAD da PR para comparar com origin/<base>. Ordem:
 *  1) PR_HEAD_SHA (github.event.pull_request.head.sha) — exato, vale para fork;
 *  2) HEAD^2 quando HEAD é o merge sintético do checkout de PR (HEAD^1 == origin/<base>);
 *  3) o nome literal da branch; 4) origin/<nome>.
 * Pelo nome, um fork com branch homônima a uma do repo base compararia a branch ERRADA
 * (e passaria sem conferir nada) — por isso o SHA vem antes. Sem nenhum, devolve o nome
 * (o git falha e o gate fecha). Nunca usa o próprio HEAD (o merge sintético contaria).
 */
function resolveRef(name, baseRef) {
  const headSha = process.env.PR_HEAD_SHA || '';
  if (/^[0-9a-f]{40}$/i.test(headSha) && verifyCommit(headSha)) return headSha;
  const p1 = verifyCommit('HEAD^1');
  const p2 = verifyCommit('HEAD^2');
  if (p2 && p1 && baseRef && p1 === verifyCommit(`origin/${baseRef}`)) return p2;
  for (const cand of [name, `origin/${name}`]) if (verifyCommit(cand)) return cand;
  return name;
}

function getChangedFiles(baseRef, headRef) {
  if (!baseRef || !headRef) return [];
  const out = git(['diff', '--name-only', `origin/${baseRef}...${headRef}`]);
  return out ? out.split('\n').filter(Boolean) : [];
}

function getMergeCommits(baseRef, headRef) {
  if (!baseRef || !headRef) return [];
  // Commits no PR que seguem o padrão de resolução de conflito (REGRA #3)
  const out = git(['log', `origin/${baseRef}..${headRef}`, '--format=%s', '--merges']);
  const mergeSubjects = out ? out.split('\n').filter(Boolean) : [];

  // Também verificar commits com subject no padrão merge(pr-NNN)
  const allOut = git(['log', `origin/${baseRef}..${headRef}`, '--format=%s']);
  const allSubjects = allOut ? allOut.split('\n').filter(Boolean) : [];

  const semanticMerges = allSubjects.filter(s => MERGE_PATTERN.test(s));

  return [...new Set([...mergeSubjects, ...semanticMerges])];
}

const baseRef = process.env.GITHUB_BASE_REF || '';
const headRefRaw = process.env.GITHUB_HEAD_REF || '';
const headRef = headRefRaw ? resolveRef(headRefRaw, process.env.GITHUB_BASE_REF || '') : '';

if (!baseRef || !headRef) {
  console.log('⚠️  GITHUB_BASE_REF / GITHUB_HEAD_REF não definidos — pulando verificação de ledger.');
  process.exit(0);
}

const mergeCommits = getMergeCommits(baseRef, headRef);
const changedFiles = getChangedFiles(baseRef, headRef);

if (gitFailed) {
  const msg = [
    `[E188] Não foi possível calcular o diff/log entre origin/${baseRef} e ${headRef}`,
    `(git falhou — ref inexistente, fetch incompleto ou fora de um repo git).`,
    `Verificação de ledger de conflitos não pôde ser concluída.`,
  ].join('\n');

  if (isGate) {
    console.error(`::error::${msg}`);
    process.exit(1);
  } else {
    console.warn(`⚠️  ${msg}`);
    process.exit(0);
  }
}

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
