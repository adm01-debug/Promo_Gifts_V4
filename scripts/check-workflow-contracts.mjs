#!/usr/bin/env node
/**
 * check-workflow-contracts — E11 + E76 (PLANO_WORKFLOWS_CI_V2_100_ETAPAS_2026-10-14)
 *
 * Valida contratos estruturais em todos os .github/workflows/*.yml.
 *
 * Modo REPORT (padrão): imprime violações, sai com exit 0.
 * Modo GATE  (--gate) : sai exit 1 se houver violação não coberta pela allowlist.
 * Gate habilitado em E20.
 *
 * Checks C1–C9 (E11, 2026-09-26):
 *   C1  — todo workflow declara `permissions:` no topo
 *   C2  — todo workflow com trigger pull_request declara `concurrency:`
 *   C3  — todo job declara `timeout-minutes:`
 *   C4  — nenhum trigger `branches:` lista `master` ou `develop`
 *   C5  — nenhum `${{ inputs./ github.event.inputs./ github.head_ref /
 *           github.event.*.title|body }}` dentro de blocos `run:`
 *   C6  — todo `--project=X` em steps corresponde a um projeto em playwright.config.ts
 *   C7  — todo `npm run X` em steps corresponde a um script em package.json
 *   C8  — todo `node scripts/X.mjs` em steps corresponde a um arquivo existente
 *   C9  — nenhum `jobs.<id>.name` duplicado entre workflows distintos
 *
 * Checks C10–C23 (E76, 2026-10-14 — R9–R14 do PADRAO_WORKFLOW.md v2):
 *   C10 — steps actions/checkout devem declarar persist-credentials: false (R9)
 *   C11 — workflows com steps run: devem declarar defaults.run.shell: bash (R10)
 *   C12 — workflows com trigger pull_request não devem ter permissions.contents: write (R11)
 *   C13 — workflows com paths: trigger devem incluir o próprio arquivo como path (R12)
 *   C14 — nenhum upload-artifact com path SOMENTE test-results/ (usar playwright-report/) (R13)
 *   C15 — runs-on deve ser ubuntu-24.04, não ubuntu-latest nem ubuntu-22.04 (R14)
 *   C16 — todas as actions externas devem ser pinadas por SHA completo de 40 chars
 *   C17 — nenhum job deve ter continue-on-error: true (step level OK; job level não)
 *   C18 — workflows com push + pull_request devem ter cancel-in-progress condicional
 *   C19 — nenhum step run: deve conter `supabase db push` (proibido — REGRA #8/E15)
 *   C20 — nenhum arquivo de workflow deve referenciar `pqpdolkaeqlyzpdpbizo` (REGRA #1)
 *   C21 — todo upload-artifact deve declarar retention-days: (R6)
 *   C22 — workflows com trigger pull_request não devem conter `git push` em run: steps
 *   C23 — steps actions/setup-node não devem usar node-version: literal (usar node-version-file)
 *
 * Allowlist: scripts/check-workflow-contracts.allowlist.json
 *   Formato: { "_allowlisted_files": ["file.yml", ...] }
 *   Violações na allowlist são reportadas mas não bloqueiam em modo GATE.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const _require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Pure check functions — operate on already-loaded workflow objects
// ---------------------------------------------------------------------------

export function checkC1Permissions({ file, doc }) {
  if (!doc.permissions) return [`${file}: missing top-level \`permissions:\``];
  return [];
}

export function checkC2Concurrency({ file, text, doc }) {
  const hasPR = /pull_request\s*:/.test(text);
  if (!hasPR) return [];
  if (!doc.concurrency) return [`${file}: has pull_request trigger but missing \`concurrency:\``];
  return [];
}

export function checkC3Timeout({ file, doc }) {
  const violations = [];
  const jobs = doc.jobs || {};
  for (const [id, job] of Object.entries(jobs)) {
    if (!job || typeof job !== 'object') continue;
    // jobs `uses:` (reusable workflow call) não aceitam `timeout-minutes` —
    // o timeout fica a cargo dos steps internos do workflow chamado.
    if (job.uses) continue;
    if (job['timeout-minutes'] == null) {
      violations.push(`${file}: job \`${id}\` missing \`timeout-minutes:\``);
    }
  }
  return violations;
}

export function checkC4NoDeadBranches({ file, text }) {
  const violations = [];
  // Extract only the `on:` block — stop at the next top-level key
  const lines = text.split('\n');
  let inOnBlock = false;
  const onBlockLines = [];
  for (const line of lines) {
    if (/^on:\s*$/.test(line)) { inOnBlock = true; continue; }
    if (inOnBlock) {
      if (/^\S/.test(line) && line.trim() !== '') break; // next top-level key
      onBlockLines.push(line);
    }
  }
  const onBlock = onBlockLines.join('\n');
  const branchGroups = onBlock.match(/branches\s*:\s*(?:\[([^\]]+)\]|((?:\n\s+-[^\n]+)+))/g) || [];
  for (const bg of branchGroups) {
    if (/\bmaster\b/.test(bg)) violations.push(`${file}: trigger references dead branch \`master\'`);
    if (/\bdevelop\b/.test(bg)) violations.push(`${file}: trigger references dead branch \`develop\'`);
  }
  return violations;
}

const INJECTION_RE =
  /\$\{\{\s*(inputs\.|github\.event\.inputs\.|github\.head_ref\s*\}\}|github\.event\.\w+\.(title|body))/;

export function checkC5NoInjection({ file, text }) {
  const lines = text.split('\n');
  let inRun = false;
  let runIndent = -1;
  for (const line of lines) {
    const runMatch = line.match(/^(\s+)run:\s*(.*)/);
    if (runMatch) {
      inRun = true;
      runIndent = runMatch[1].length;
      const inline = runMatch[2].trim();
      if (INJECTION_RE.test(inline)) return [`${file}: run: block contains potentially injectable expression`];
      // block scalar — content on subsequent lines
      if (inline === '' || inline === '|' || inline === '>') continue;
      inRun = false;
      continue;
    }
    if (inRun) {
      const lineIndent = (line.match(/^(\s*)/) || ['', ''])[1].length;
      if (line.trim() === '' || lineIndent > runIndent) {
        if (INJECTION_RE.test(line)) return [`${file}: run: block contains potentially injectable expression`];
      } else {
        inRun = false;
      }
    }
  }
  return [];
}

export function checkC6PlaywrightProjects({ file, text }, knownProjects) {
  if (!knownProjects || knownProjects.size === 0) return [];
  const violations = [];
  const seen = new Set();
  for (const m of text.matchAll(/--project[= ]([A-Za-z0-9_-]+)/g)) {
    const proj = m[1];
    if (!knownProjects.has(proj) && !seen.has(proj)) {
      seen.add(proj);
      violations.push(`${file}: --project=${proj} not found in playwright.config.ts`);
    }
  }
  return violations;
}

export function checkC7NpmScripts({ file, text }, knownScripts) {
  if (!knownScripts || knownScripts.size === 0) return [];
  const violations = [];
  const seen = new Set();
  for (const m of text.matchAll(/npm run ([A-Za-z0-9:_-]+)/g)) {
    const script = m[1];
    if (!knownScripts.has(script) && !seen.has(script)) {
      seen.add(script);
      violations.push(`${file}: npm run ${script} not found in package.json scripts`);
    }
  }
  return violations;
}

export function checkC8NodeScripts({ file, text }, rootDir) {
  if (!rootDir) return [];
  const violations = [];
  const seen = new Set();
  for (const m of text.matchAll(/node scripts\/([A-Za-z0-9\/_-]+\.m?js)/g)) {
    const rel = m[1];
    const abs = join(rootDir, 'scripts', rel);
    if (!existsSync(abs) && !seen.has(rel)) {
      seen.add(rel);
      violations.push(`${file}: node scripts/${rel} — file not found`);
    }
  }
  return violations;
}

export function checkC9DuplicateJobNames(workflows) {
  const nameToFiles = new Map();
  for (const { file, doc } of workflows) {
    if (!doc.jobs || typeof doc.jobs !== 'object') continue;
    for (const [, jobDef] of Object.entries(doc.jobs)) {
      if (!jobDef || typeof jobDef.name !== 'string') continue;
      const n = jobDef.name.trim();
      if (!n) continue;
      if (!nameToFiles.has(n)) nameToFiles.set(n, []);
      nameToFiles.get(n).push(file);
    }
  }
  const violations = [];
  for (const [name, files] of nameToFiles) {
    if (files.length > 1) {
      const sorted = [...new Set(files)].sort();
      violations.push(
        `${sorted[0]}: duplicate job display name "${name}" also in ${sorted.slice(1).join(', ')}`,
      );
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------
// C10–C23: E76 checks (PADRAO_WORKFLOW.md v2 — R9–R14)
// ---------------------------------------------------------------------------

// C10 — checkout steps must declare persist-credentials: false (R9)
export function checkC10PersistCredentials({ file, text }) {
  const lines = text.split('\n');
  const violations = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/uses:\s+actions\/checkout@/.test(lines[i])) continue;
    // Look ahead up to 20 lines for persist-credentials: false
    let found = false;
    for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
      if (/persist-credentials:\s*false/.test(lines[j])) { found = true; break; }
      // Stop at next step marker (another `- uses:` or `- name:` at same indent level)
      if (j > i + 1 && /^\s+- (uses|name|run|id|if):\s/.test(lines[j])) break;
    }
    if (!found) {
      violations.push(`${file}: actions/checkout step missing persist-credentials: false (R9)`);
      break; // one violation per file
    }
  }
  return violations;
}

// C11 — workflows with run: steps must declare defaults.run.shell: bash (R10)
export function checkC11ShellStrict({ file, text, doc }) {
  // Skip if no run: steps present
  if (!/^\s+run:\s/.test(text) && !/^\s+run:\s*[|>]/.test(text)) return [];
  // Check top-level defaults.run.shell
  const topShell = doc?.defaults?.run?.shell;
  if (topShell === 'bash') return [];
  // Check if every job defines defaults.run.shell: bash
  const jobs = doc?.jobs || {};
  const jobsWithRun = [];
  for (const [id, job] of Object.entries(jobs)) {
    if (!job || typeof job !== 'object') continue;
    const steps = Array.isArray(job.steps) ? job.steps : [];
    if (!steps.some((s) => s && (typeof s.run === 'string'))) continue;
    const jobShell = job?.defaults?.run?.shell;
    if (jobShell !== 'bash') jobsWithRun.push(id);
  }
  if (jobsWithRun.length === 0) return [];
  return [`${file}: has run: steps but missing defaults.run.shell: bash (R10) — jobs: ${jobsWithRun.join(', ')}`];
}

// C12 — workflows with pull_request trigger must not have permissions.contents: write (R11)
export function checkC12NoContentsWriteInPR({ file, text, doc }) {
  if (!/pull_request\s*:/.test(text)) return [];
  const perms = doc?.permissions;
  if (!perms || typeof perms !== 'object') return [];
  if (perms.contents === 'write') {
    return [`${file}: pull_request workflow has permissions.contents: write — use read or remove (R11/E61)`];
  }
  return [];
}

// C13 — workflows with paths: trigger must include own .github/workflows/FILENAME.yml (R12)
export function checkC13PathsSelfRef({ file, text }) {
  // Only applies to workflows with path-based triggers
  if (!text.includes('paths:') && !text.includes('paths-ignore:')) return [];
  // Extract the on: block
  const lines = text.split('\n');
  let inOnBlock = false;
  const onLines = [];
  for (const line of lines) {
    if (/^on:\s*$/.test(line)) { inOnBlock = true; continue; }
    if (inOnBlock) {
      if (/^\S/.test(line) && line.trim() !== '') break;
      onLines.push(line);
    }
  }
  const onBlock = onLines.join('\n');
  if (!onBlock.includes('paths:')) return [];
  // Check if the workflow filename appears in paths
  const selfRef = `.github/workflows/${file}`;
  if (onBlock.includes(selfRef)) return [];
  return [`${file}: paths: trigger missing self-reference to ${selfRef} (R12)`];
}

// C14 — no upload-artifact with path containing ONLY test-results/ (use playwright-report/) (R13)
export function checkC14NoStandaloneTestResults({ file, text }) {
  // Look for upload-artifact steps with path: test-results/ only
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!/actions\/upload-artifact@/.test(lines[i])) continue;
    // Look ahead for path: containing only test-results/
    for (let j = i + 1; j < Math.min(i + 25, lines.length); j++) {
      const m = lines[j].match(/^\s+path:\s*(.+)/);
      if (!m) continue;
      const pathVal = m[1].trim();
      // Only flag if the ONLY path entry is test-results/ (not mixed with other paths)
      if (pathVal === 'test-results/' || pathVal === 'test-results') {
        // Check if next non-empty line is still a path continuation
        const nextLine = lines[j + 1] || '';
        if (!/^\s+\w/.test(nextLine) || /^\s+(name:|if:|retention|with:|id:)/.test(nextLine)) {
          return [`${file}: upload-artifact with path: test-results/ only — add playwright-report/ or use e2e-artifacts/ (R13)`];
        }
      }
      break;
    }
  }
  return [];
}

// C15 — runs-on must be ubuntu-24.04 (not ubuntu-latest or ubuntu-22.04) (R14)
export function checkC15FixedRunner({ file, doc }) {
  const violations = [];
  const jobs = doc?.jobs || {};
  for (const [id, job] of Object.entries(jobs)) {
    if (!job || typeof job !== 'object') continue;
    if (job.uses) continue; // reusable workflow call
    const runner = job['runs-on'];
    if (typeof runner !== 'string') continue;
    if (runner !== 'ubuntu-24.04' && /ubuntu/.test(runner)) {
      violations.push(`${file}: job \`${id}\` uses runs-on: ${runner} — must be ubuntu-24.04 (R14)`);
    }
  }
  return violations;
}

// C16 — all external uses: must be pinned to a full 40-char SHA
const SHA40_RE = /^[0-9a-f]{40}$/;
export function checkC16ShaPinned({ file, text }) {
  const violations = [];
  const seen = new Set();
  for (const m of text.matchAll(/^\s+uses:\s+([^#\s]+)/mg)) {
    const ref = m[1].trim();
    if (ref.startsWith('./') || ref.startsWith('.github/')) continue; // local action
    if (!ref.includes('@')) continue; // no version — already flagged elsewhere
    const sha = ref.split('@')[1];
    if (!sha || SHA40_RE.test(sha)) continue; // already pinned
    if (!seen.has(ref)) {
      seen.add(ref);
      violations.push(`${file}: action \`${ref}\` not pinned by SHA — use full 40-char commit hash (E73/C16)`);
    }
  }
  return violations;
}

// C17 — no continue-on-error: true at job level
export function checkC17NoContinueOnErrorJob({ file, doc }) {
  const violations = [];
  const jobs = doc?.jobs || {};
  for (const [id, job] of Object.entries(jobs)) {
    if (!job || typeof job !== 'object') continue;
    if (job['continue-on-error'] === true) {
      violations.push(`${file}: job \`${id}\` has continue-on-error: true — gate jobs must not hide failures (C17)`);
    }
  }
  return violations;
}

// C18 — workflows with both push: AND pull_request: must use conditional cancel-in-progress
export function checkC18ConditionalCancel({ file, text, doc }) {
  const hasPush = /^  push\s*:/m.test(text);
  const hasPR = /pull_request\s*:/.test(text);
  if (!hasPush || !hasPR) return [];
  const cancelVal = doc?.concurrency?.['cancel-in-progress'];
  if (cancelVal === undefined || cancelVal === null) return [];
  // Must be a string expression (conditional), not a boolean
  if (typeof cancelVal === 'boolean') {
    return [`${file}: mixed push+PR workflow has cancel-in-progress: ${cancelVal} — must be conditional \${{ github.event_name == 'pull_request' }} (C18/R2)`];
  }
  return [];
}

// C19 — no `supabase db push` in run: steps (REGRA #8/E15)
// Only checks actual run: content, not comments
export function checkC19NoSupabaseDbPush({ file, doc }) {
  const jobs = doc?.jobs || {};
  for (const [, job] of Object.entries(jobs)) {
    if (!job || typeof job !== 'object') continue;
    const steps = Array.isArray(job.steps) ? job.steps : [];
    for (const step of steps) {
      if (typeof step?.run === 'string' && /supabase\s+db\s+push/.test(step.run)) {
        return [`${file}: run: step contains \`supabase db push\` — proibido (REGRA #8/E15); use db-apply-migration.yml (C19)`];
      }
    }
  }
  return [];
}

// C20 — no forbidden project ID pqpdolkaeqlyzpdpbizo (REGRA #1)
const FORBIDDEN_PROJECT = 'pqpdolkaeqlyzpdpbizo';
export function checkC20NoForbiddenProject({ file, text }) {
  if (text.includes(FORBIDDEN_PROJECT)) {
    return [`${file}: references forbidden Supabase project \`${FORBIDDEN_PROJECT}\` (REGRA #1/C20)`];
  }
  return [];
}

// C21 — all upload-artifact steps must declare retention-days: (R6)
export function checkC21RetentionDays({ file, text }) {
  const lines = text.split('\n');
  const violations = [];
  let foundArtifact = false;
  let stepStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/actions\/upload-artifact@/.test(lines[i])) {
      foundArtifact = true;
      stepStart = i;
      let hasRetention = false;
      for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
        if (/retention-days:/.test(lines[j])) { hasRetention = true; break; }
        // Stop at next step
        if (/^\s+- (uses|name|run|id|if):\s/.test(lines[j]) && j > i + 1) break;
      }
      if (!hasRetention) {
        violations.push(`${file}: upload-artifact step at line ${i + 1} missing retention-days: (R6/C21)`);
      }
    }
  }
  return violations.slice(0, 1); // one violation per file
}

// C22 — workflows with pull_request trigger must not contain `git push` in run: steps
// that can execute during PR context (i.e., in jobs without PR-excluding if: conditions)
export function checkC22NoGitPushInPR({ file, text, doc }) {
  if (!/pull_request\s*:/.test(text)) return [];
  const jobs = doc?.jobs || {};
  for (const [, job] of Object.entries(jobs)) {
    if (!job || typeof job !== 'object') continue;
    const jobIf = typeof job.if === 'string' ? job.if : '';
    // Skip jobs that are explicitly gated to non-PR events
    if (/event_name\s*[!=]=+\s*['"]?push['"]?/.test(jobIf) ||
        /event_name\s*[!=]=+\s*['"]?schedule['"]?/.test(jobIf) ||
        /event_name\s*[!=]=+\s*['"]?workflow_dispatch['"]?/.test(jobIf)) continue;
    if (/event_name\s*==\s*['"]?push['"]?/.test(jobIf) ||
        /event_name\s*==\s*['"]?schedule['"]?/.test(jobIf) ||
        /event_name\s*==\s*['"]?workflow_dispatch['"]?/.test(jobIf)) continue;
    // Check steps in this job for git push in run: blocks
    const steps = Array.isArray(job.steps) ? job.steps : [];
    for (const step of steps) {
      if (typeof step?.run !== 'string') continue;
      const stepIf = typeof step.if === 'string' ? step.if : '';
      // Skip steps with PR-excluding if conditions
      if (/event_name\s*[!=]=+\s*['"]?pull_request['"]?/.test(stepIf)) continue;
      if (/event_name\s*==\s*['"]?(push|schedule|workflow_dispatch)['"]?/.test(stepIf)) continue;
      if (/\bgit\s+push\b/.test(step.run)) {
        return [`${file}: pull_request workflow job has \`git push\` in run: step — use artifact upload instead (E61/C22)`];
      }
    }
  }
  return [];
}

// C23 — setup-node steps must use node-version-file, not literal node-version: (R4)
export function checkC23NoLiteralNodeVersion({ file, text }) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!/actions\/setup-node@/.test(lines[i])) continue;
    for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
      if (/node-version-file:/.test(lines[j])) break; // OK
      if (/node-version:\s*['"]?\d/.test(lines[j])) {
        return [`${file}: actions/setup-node uses literal node-version: — use node-version-file: .nvmrc (R4/C23)`];
      }
      if (/^\s+- (uses|name|run|id):\s/.test(lines[j]) && j > i + 1) break;
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

export function readWorkflowFiles(rootDir) {
  const yaml = _require('js-yaml');
  const dir = join(rootDir, '.github', 'workflows');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map((f) => {
      const text = readFileSync(join(dir, f), 'utf-8');
      let doc = null;
      try {
        doc = yaml.load(text);
      } catch {
        /* skip unparseable */
      }
      return { file: f, text, doc };
    })
    .filter((w) => w.doc && typeof w.doc === 'object');
}

export function getPlaywrightProjects(rootDir) {
  const cfgPath = join(rootDir, 'playwright.config.ts');
  if (!existsSync(cfgPath)) return new Set();
  const text = readFileSync(cfgPath, 'utf-8');
  const names = new Set();
  for (const m of text.matchAll(/name:\s*['"](([^'"]+))['"]/g)) names.add(m[1]);
  return names;
}

export function getPackageScripts(rootDir) {
  const pkgPath = join(rootDir, 'package.json');
  if (!existsSync(pkgPath)) return new Set();
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  return new Set(Object.keys(pkg.scripts || {}));
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

export function runChecks(rootDir = ROOT) {
  const workflows = readWorkflowFiles(rootDir);
  const playwrightProjects = getPlaywrightProjects(rootDir);
  const packageScripts = getPackageScripts(rootDir);

  const all = [];
  for (const wf of workflows) {
    all.push(
      ...checkC1Permissions(wf),
      ...checkC2Concurrency(wf),
      ...checkC3Timeout(wf),
      ...checkC4NoDeadBranches(wf),
      ...checkC5NoInjection(wf),
      ...checkC6PlaywrightProjects(wf, playwrightProjects),
      ...checkC7NpmScripts(wf, packageScripts),
      ...checkC8NodeScripts(wf, rootDir),
      // C10–C23 (E76, 2026-10-14)
      ...checkC10PersistCredentials(wf),
      ...checkC11ShellStrict(wf),
      ...checkC12NoContentsWriteInPR(wf),
      ...checkC13PathsSelfRef(wf),
      ...checkC14NoStandaloneTestResults(wf),
      ...checkC15FixedRunner(wf),
      ...checkC16ShaPinned(wf),
      ...checkC17NoContinueOnErrorJob(wf),
      ...checkC18ConditionalCancel(wf),
      ...checkC19NoSupabaseDbPush(wf),
      ...checkC20NoForbiddenProject(wf),
      ...checkC21RetentionDays(wf),
      ...checkC22NoGitPushInPR(wf),
      ...checkC23NoLiteralNodeVersion(wf),
    );
  }
  all.push(...checkC9DuplicateJobNames(workflows));

  return {
    violations: all,
    counts: {
      C1:  all.filter((v) => v.includes('permissions')).length,
      C2:  all.filter((v) => v.includes('concurrency')).length,
      C3:  all.filter((v) => v.includes('timeout-minutes')).length,
      C4:  all.filter((v) => v.includes('dead branch')).length,
      C5:  all.filter((v) => v.includes('injectable')).length,
      C6:  all.filter((v) => v.includes('playwright.config')).length,
      C7:  all.filter((v) => v.includes('package.json')).length,
      C8:  all.filter((v) => v.includes('file not found')).length,
      C9:  all.filter((v) => v.includes('duplicate job display name')).length,
      C10: all.filter((v) => v.includes('persist-credentials')).length,
      C11: all.filter((v) => v.includes('defaults.run.shell')).length,
      C12: all.filter((v) => v.includes('permissions.contents: write')).length,
      C13: all.filter((v) => v.includes('self-reference')).length,
      C14: all.filter((v) => v.includes('test-results/')).length,
      C15: all.filter((v) => v.includes('ubuntu-24.04')).length,
      C16: all.filter((v) => v.includes('not pinned by SHA')).length,
      C17: all.filter((v) => v.includes('continue-on-error')).length,
      C18: all.filter((v) => v.includes('cancel-in-progress')).length,
      C19: all.filter((v) => v.includes('supabase db push')).length,
      C20: all.filter((v) => v.includes(FORBIDDEN_PROJECT)).length,
      C21: all.filter((v) => v.includes('retention-days')).length,
      C22: all.filter((v) => v.includes('git push')).length,
      C23: all.filter((v) => v.includes('literal node-version')).length,
    },
    workflowCount: workflows.length,
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const gateMode = process.argv.includes('--gate');

  const allowlistPath = join(ROOT, 'scripts', 'check-workflow-contracts.allowlist.json');
  let allowlist = { _allowlisted_files: [] };
  if (existsSync(allowlistPath)) {
    allowlist = JSON.parse(readFileSync(allowlistPath, 'utf-8'));
  }
  const allowlistedFiles = new Set(allowlist._allowlisted_files || []);
  // _allowlisted_violations: exact violation strings that are pre-approved (more granular than file-level)
  const allowlistedViolations = new Set(allowlist._allowlisted_violations || []);

  const { violations, counts, workflowCount } = runChecks(ROOT);

  const fresh = violations.filter(
    (v) => !allowlistedFiles.has(v.split(':')[0].trim()) && !allowlistedViolations.has(v),
  );
  const total = violations.length;
  const allowlisted = total - fresh.length;

  const wfCount = readdirSync(join(ROOT, '.github', 'workflows')).filter((f) =>
    f.endsWith('.yml'),
  ).length;

  console.log(`\n=== check-workflow-contracts — ${gateMode ? 'GATE' : 'REPORT'} mode ===`);
  console.log(`Workflows scanned: ${wfCount}`);
  console.log(`Violations total: ${total} (${allowlisted} allowlisted, ${fresh.length} fresh)`);
  console.log(`  C1  permissions:          ${counts.C1}`);
  console.log(`  C2  concurrency:          ${counts.C2}`);
  console.log(`  C3  timeout-minutes:      ${counts.C3}`);
  console.log(`  C4  dead branches:        ${counts.C4}`);
  console.log(`  C5  injection:            ${counts.C5}`);
  console.log(`  C6  playwright proj:      ${counts.C6}`);
  console.log(`  C7  npm scripts:          ${counts.C7}`);
  console.log(`  C8  node scripts:         ${counts.C8}`);
  console.log(`  C9  dup job names:        ${counts.C9}`);
  console.log(`  C10 persist-credentials:  ${counts.C10}`);
  console.log(`  C11 shell strict:         ${counts.C11}`);
  console.log(`  C12 contents:write in PR: ${counts.C12}`);
  console.log(`  C13 paths self-ref:       ${counts.C13}`);
  console.log(`  C14 test-results/ only:   ${counts.C14}`);
  console.log(`  C15 fixed runner:         ${counts.C15}`);
  console.log(`  C16 SHA pinned:           ${counts.C16}`);
  console.log(`  C17 continue-on-error:    ${counts.C17}`);
  console.log(`  C18 cancel-in-progress:   ${counts.C18}`);
  console.log(`  C19 supabase db push:     ${counts.C19}`);
  console.log(`  C20 forbidden project:    ${counts.C20}`);
  console.log(`  C21 retention-days:       ${counts.C21}`);
  console.log(`  C22 git push in PR:       ${counts.C22}`);
  console.log(`  C23 literal node-ver:     ${counts.C23}`);

  if (fresh.length > 0) {
    console.log('\nFresh violations (not in allowlist):');
    fresh.forEach((v) => console.log(`  ✗ ${v}`));
  }

  if (!gateMode && allowlisted > 0) {
    console.log(`\n${allowlisted} existing violations are allowlisted (E11/E76 report mode).`);
    console.log('Run with --gate to enforce.');
  }

  if (gateMode && fresh.length > 0) {
    console.error('\nGATE FAIL: fresh violations found — fix or add to allowlist with justification.');
    process.exit(1);
  }

  process.exit(0);
}