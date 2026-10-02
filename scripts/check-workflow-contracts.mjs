#!/usr/bin/env node
/**
 * check-workflow-contracts — E11 (PLANO_WORKFLOWS_CI_100_ETAPAS_2026-09-26)
 *
 * Valida contratos estruturais em todos os .github/workflows/*.yml.
 *
 * Modo REPORT (padrão): imprime violações, sai com exit 0.
 * Modo GATE  (--gate) : sai exit 1 se houver violação não coberta pela allowlist.
 * Gate habilitado em E20.
 *
 * Checks:
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
  for (const m of text.matchAll(/name:\s*['"](([^'"]+))['"]>/g)) names.add(m[1]);
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
    );
  }
  all.push(...checkC9DuplicateJobNames(workflows));

  return {
    violations: all,
    counts: {
      C1: all.filter((v) => v.includes('permissions')).length,
      C2: all.filter((v) => v.includes('concurrency')).length,
      C3: all.filter((v) => v.includes('timeout-minutes')).length,
      C4: all.filter((v) => v.includes('dead branch')).length,
      C5: all.filter((v) => v.includes('injectable')).length,
      C6: all.filter((v) => v.includes('playwright.config')).length,
      C7: all.filter((v) => v.includes('package.json')).length,
      C8: all.filter((v) => v.includes('file not found')).length,
      C9: all.filter((v) => v.includes('duplicate job display name')).length,
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

  const { violations, counts, workflowCount } = runChecks(ROOT);

  const fresh = violations.filter((v) => !allowlistedFiles.has(v.split(':')[0].trim()));
  const total = violations.length;
  const allowlisted = total - fresh.length;

  const wfCount = readdirSync(join(ROOT, '.github', 'workflows')).filter((f) =>
    f.endsWith('.yml'),
  ).length;

  console.log(`\n=== check-workflow-contracts — ${gateMode ? 'GATE' : 'REPORT'} mode ===`);
  console.log(`Workflows scanned: ${wfCount}`);
  console.log(`Violations total: ${total} (${allowlisted} allowlisted, ${fresh.length} fresh)`);
  console.log(`  C1 permissions:     ${counts.C1}`);
  console.log(`  C2 concurrency:     ${counts.C2}`);
  console.log(`  C3 timeout-minutes: ${counts.C3}`);
  console.log(`  C4 dead branches:   ${counts.C4}`);
  console.log(`  C5 injection:       ${counts.C5}`);
  console.log(`  C6 playwright proj: ${counts.C6}`);
  console.log(`  C7 npm scripts:     ${counts.C7}`);
  console.log(`  C8 node scripts:    ${counts.C8}`);
  console.log(`  C9 dup job names:   ${counts.C9}`);

  if (fresh.length > 0) {
    console.log('\nFresh violations (not in allowlist):');
    fresh.forEach((v) => console.log(`  ✗ ${v}`));
  }

  if (!gateMode && allowlisted > 0) {
    console.log(`\n${allowlisted} existing violations are allowlisted (E11 report mode).`);
    console.log('Run with --gate to enforce. Gate will be enabled in E20.');
  }

  if (gateMode && fresh.length > 0) {
    console.error('\nGATE FAIL: fresh violations found — fix or add to allowlist with justification.');
    process.exit(1);
  }

  process.exit(0);
}