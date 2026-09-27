/**
 * E51 — Detector de flaky tests.
 *
 * Lê playwright-report/results.json após uma run com retries=1 e classifica:
 *  - flaky: passou em alguma retry (pass + fail no mesmo spec)
 *  - broken: falhou em todas as retries (candidato a quarentena)
 *
 * Escrita em e2e/quarantine.json:
 *  - APENAS com uma issue vinculada (argumento --issue <url>)
 *  - Sem issue → apenas reporta, não persiste
 *
 * Uso (CI, pós-run):
 *   node e2e/scripts/detect-flaky.mjs [--issue <github-issue-url>]
 *
 * Uso (PR de quarentena, gerado pelo workflow flaky-quarantine.yml):
 *   node e2e/scripts/detect-flaky.mjs --issue https://github.com/.../issues/NNN
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const _dirname = path.dirname(fileURLToPath(import.meta.url));
const reportPath = path.resolve('playwright-report/results.json');
const quarantinePath = path.resolve(_dirname, '../quarantine.json');

const args = process.argv.slice(2);
const issueIdx = args.indexOf('--issue');
const issueUrl = issueIdx !== -1 ? args[issueIdx + 1] : null;

if (!fs.existsSync(reportPath)) {
  console.log('No Playwright report found — nothing to detect.');
  process.exit(0);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const flakyTests = [];
const brokenTests = [];

function processSuite(suite) {
  if (suite.specs) {
    suite.specs.forEach(spec => {
      spec.tests.forEach(test => {
        const results = test.results || [];
        const hasPassed = results.some(r => r.status === 'expected' || r.status === 'passed');
        const hasFailed = results.some(r => r.status === 'failed' || r.status === 'timedOut');
        if (hasPassed && hasFailed) {
          flakyTests.push({ title: spec.title, file: spec.file, retries: results.length - 1 });
        } else if (!hasPassed && hasFailed) {
          brokenTests.push({ title: spec.title, file: spec.file });
        }
      });
    });
  }
  if (suite.suites) {
    suite.suites.forEach(processSuite);
  }
}

processSuite(report);

let summary = '';

if (flakyTests.length > 0) {
  summary += '\n### ⚠️ Flaky Tests Detected (Playwright)\n';
  summary += '| Test | File | Retries |\n| --- | --- | --- |\n';
  flakyTests.forEach(t => { summary += `| ${t.title} | ${t.file} | ${t.retries} |\n`; });
}

if (brokenTests.length > 0) {
  summary += '\n### ❌ Broken Tests (Failed all retries — quarantine candidates)\n';
  summary += '| Test | File |\n| --- | --- |\n';
  brokenTests.forEach(t => { summary += `| ${t.title} | ${t.file} |\n`; });

  if (issueUrl) {
    // Persiste no quarantine.json versionado apenas com issue vinculada
    const existing = JSON.parse(fs.readFileSync(quarantinePath, 'utf-8'));
    const today = new Date().toISOString().slice(0, 10);
    const existingTitles = new Set(existing.entries.map(e => e.title));
    const newEntries = brokenTests
      .filter(t => !existingTitles.has(t.title))
      .map(t => ({ title: t.title, file: t.file, issue: issueUrl, since: today }));

    if (newEntries.length > 0) {
      existing.entries.push(...newEntries);
      fs.writeFileSync(quarantinePath, JSON.stringify(existing, null, 2) + '\n');
      summary += `\n> ${newEntries.length} teste(s) adicionado(s) à quarentena versionada com issue ${issueUrl}.\n`;
      console.log(`Quarantined ${newEntries.length} new tests → ${quarantinePath}`);
    }
  } else {
    summary += '\n> ⚠️ Para persistir na quarentena, rode com `--issue <github-issue-url>`.\n';
    summary += '> Sem issue vinculada, testes não são adicionados ao quarantine.json.\n';
  }
}

if (summary) {
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }
  // Sai com erro se houver testes broken (para que o CI os sinalize)
  if (brokenTests.length > 0) process.exit(1);
} else {
  console.log('No flaky or broken tests detected.');
}
