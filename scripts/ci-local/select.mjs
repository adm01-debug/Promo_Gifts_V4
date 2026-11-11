// scripts/ci-local/select.mjs
// Decide quais workflows o GitHub dispararia para um evento, branch e conjunto de
// arquivos alterados — mesma semântica dos filtros do Actions:
//   • paths: roda se ALGUM arquivo casa com a lista; padrões "!x" (avaliados em ordem)
//     retiram arquivos que um padrão anterior incluiu.
//   • paths-ignore: só NÃO roda se TODOS os arquivos casam com algum padrão ignorado.
//   • branches/branches-ignore: em pull_request avaliam o branch BASE; em push, o branch enviado.
//     (tags/tags-ignore em push: um push de branch nunca casa um filtro que só tem tags.)
//   • schedule / workflow_dispatch / workflow_run: sem filtro de paths.
import { minimatch } from 'minimatch';

const MM = { dot: true, nocomment: true, nonegate: true };

/** Lista de padrões com "!" em ordem (semântica do GitHub): último padrão que casa decide. */
export function matchesPatternList(value, patterns) {
  let included = false;
  for (const raw of [].concat(patterns ?? [])) {
    const p = String(raw);
    if (p.startsWith('!')) {
      if (included && minimatch(value, p.slice(1), MM)) included = false;
    } else if (minimatch(value, p, MM)) {
      included = true;
    }
  }
  return included;
}

export function branchAllowed(filter, branch) {
  if (!filter || typeof filter !== 'object') return true;
  if (filter.branches) return matchesPatternList(branch, filter.branches);
  if (filter['branches-ignore']) return !matchesPatternList(branch, filter['branches-ignore']);
  if ((filter.tags || filter['tags-ignore']) && !filter.branches) return false; // push só de tags
  return true;
}

export function pathsAllowed(filter, changedFiles) {
  if (!filter || typeof filter !== 'object') return true;
  if (filter.paths) {
    // Sem arquivos alterados (ex.: diff vazio) o GitHub não dispara workflow com paths.
    return changedFiles.some((f) => matchesPatternList(f, filter.paths));
  }
  if (filter['paths-ignore']) {
    if (changedFiles.length === 0) return true;
    return !changedFiles.every((f) => matchesPatternList(f, filter['paths-ignore']));
  }
  return true;
}

/**
 * @param {Array} inventory  saída de buildInventory
 * @param {{event:string, branch:string, baseBranch?:string, changedFiles:string[], all?:boolean}} opts
 * @returns {Array<{wf, reason}>} workflows que disparariam, com o motivo (ou motivo de pular).
 */
export function selectWorkflows(inventory, opts) {
  const { event, branch, baseBranch = 'main', changedFiles = [], all = false, eventAction = 'synchronize' } = opts;
  // `types:` ausente em pull_request = opened, synchronize, reopened (padrão do GitHub).
  const PR_DEFAULT_TYPES = ['opened', 'synchronize', 'reopened'];
  const out = [];
  for (const wf of inventory) {
    const trig = wf.triggers?.[event];
    if (wf.parseError) {
      out.push({ wf, run: false, reason: `YAML inválido: ${wf.parseError}` });
      continue;
    }
    if (trig === undefined) {
      out.push({ wf, run: false, reason: `não dispara em ${event}` });
      continue;
    }
    if (event === 'pull_request' || event === 'pull_request_target') {
      const types = Array.isArray(trig?.types) ? trig.types : typeof trig?.types === 'string' ? [trig.types] : PR_DEFAULT_TYPES;
      if (!types.includes(eventAction)) {
        out.push({ wf, run: false, reason: `types: [${types.join(', ')}] não inclui ${eventAction}` });
        continue;
      }
    }
    if (all) {
      out.push({ wf, run: true, reason: '--all (filtros ignorados)' });
      continue;
    }
    const filterBranch = event === 'pull_request' || event === 'pull_request_target' ? baseBranch : branch;
    if ((event === 'pull_request' || event === 'pull_request_target' || event === 'push') && !branchAllowed(trig, filterBranch)) {
      out.push({ wf, run: false, reason: `filtro de branch não casa (${filterBranch})` });
      continue;
    }
    if ((event === 'pull_request' || event === 'pull_request_target' || event === 'push') && !pathsAllowed(trig, changedFiles)) {
      out.push({ wf, run: false, reason: 'nenhum arquivo alterado casa com paths' });
      continue;
    }
    out.push({ wf, run: true, reason: 'dispararia no GitHub' });
  }
  return out;
}
