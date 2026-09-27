#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const RISK_REVIEW_DEADLINE = '2026-12-27T23:59:59-03:00';

// npm updated source IDs and advisory ranges for these CVEs (2026-09-26):
// GHSA-5p2g: source 1138809 → 1239765, range >=1.2.0 <=2.0.2
// GHSA-w3rx: source 1138808 → 1239766, range >=0.6.3 <=2.0.2
const ALLOWED_IMAGE_SIZE_ADVISORIES = new Map([
  ['https://github.com/advisories/GHSA-5p2g-fcmc-qvqq', { source: 1239765, range: '>=1.2.0 <=2.0.2' }],
  ['https://github.com/advisories/GHSA-w3rx-r6r6-pgpr', { source: 1239766, range: '>=0.6.3 <=2.0.2' }],
]);

// The npm advisory service has proposed more than one incompatible downgrade
// for the same unpatched transitive dependency. These are not upgrades to
// apply automatically: both would replace the supported pptxgenjs 4.x API.
// 4.0.0 added 2026-09-26: npm now reports >=4.0.1-beta.0 as vulnerable (same CVEs, updated range).
const REVIEWED_INCOMPATIBLE_PPTXGENJS_FIXES = new Set(['1.1.5', '2.2.0', '4.0.0']);
const REVIEWED_PPTXGENJS_VULNERABLE_RANGES = new Set(['1.1.5-1 || >=1.1.6', '>=2.3.0', '>=4.0.1-beta.0']);
const REVIEWED_IMAGE_SIZE_VULNERABLE_RANGES = new Set(['*', '<=2.0.2', '0.6.3 - 2.0.2']);

// @lhci/cli transitive dependencies — dev-only CI tooling, never in the production bundle.
// All of these are pulled exclusively by @lhci/cli (Lighthouse CI) and its own transitives
// (puppeteer-core → @puppeteer/browsers → extract-zip/tar-fs, lighthouse → @sentry/node, etc.).
// None can be reached from production code. Accepted 2026-09-27. Revisit by RISK_REVIEW_DEADLINE.
const ALLOWED_LHCI_PACKAGES = new Set([
  '@lhci/cli', // direct devDependency; moderate severity
  '@lhci/utils',
  '@puppeteer/browsers',
  '@sentry/node',
  'cookie',
  'external-editor',
  'extract-zip',
  'inquirer',
  'lighthouse',
  'puppeteer-core',
  'tar-fs',
  'tmp',
  'uuid',
  'ws',
]);

// All packages that may appear in the accepted[] list — used for defence-in-depth after the loop.
const ALL_KNOWN_ACCEPTED_PACKAGES = new Set(['image-size', 'pptxgenjs', ...ALLOWED_LHCI_PACKAGES]);

function isAllowedLhciPackage(packageName, vulnerability) {
  if (!ALLOWED_LHCI_PACKAGES.has(packageName)) return false;
  // @lhci/cli is a direct devDependency — its isDirect flag is true.
  if (packageName === '@lhci/cli') return vulnerability.isDirect === true;
  // Every other LHCI-related package must be purely transitive.
  return vulnerability.isDirect === false;
}

function hasExpectedFixAvailable(vulnerability) {
  const fix = vulnerability.fixAvailable;
  return (
    fix &&
    typeof fix === 'object' &&
    fix.name === 'pptxgenjs' &&
    REVIEWED_INCOMPATIBLE_PPTXGENJS_FIXES.has(fix.version) &&
    fix.isSemVerMajor === true
  );
}

function hasExpectedImageSizeAdvisories(vulnerability) {
  const via = vulnerability.via;
  return (
    Array.isArray(via) &&
    via.length === ALLOWED_IMAGE_SIZE_ADVISORIES.size &&
    via.every((advisory) => {
      const expected = ALLOWED_IMAGE_SIZE_ADVISORIES.get(advisory?.url);
      return (
        advisory != null &&
        typeof advisory === 'object' &&
        expected !== undefined &&
        expected.source === advisory.source &&
        advisory.name === 'image-size' &&
        advisory.dependency === 'image-size' &&
        advisory.severity === 'high' &&
        advisory.range === expected.range
      );
    })
  );
}

function isAllowedImageSize(vulnerability) {
  return (
    vulnerability.severity === 'high' &&
    vulnerability.isDirect === false &&
    Array.isArray(vulnerability.effects) &&
    vulnerability.effects.length === 1 &&
    vulnerability.effects[0] === 'pptxgenjs' &&
    REVIEWED_IMAGE_SIZE_VULNERABLE_RANGES.has(vulnerability.range) &&
    hasExpectedFixAvailable(vulnerability) &&
    hasExpectedImageSizeAdvisories(vulnerability)
  );
}

function isAllowedPptxPropagation(vulnerability) {
  const via = vulnerability.via ?? [];
  return (
    vulnerability.severity === 'high' &&
    vulnerability.isDirect === true &&
    via.length === 1 &&
    via[0] === 'image-size' &&
    Array.isArray(vulnerability.effects) &&
    vulnerability.effects.length === 0 &&
    REVIEWED_PPTXGENJS_VULNERABLE_RANGES.has(vulnerability.range) &&
    hasExpectedFixAvailable(vulnerability)
  );
}

export function evaluateAuditReport(report, now = new Date()) {
  const violations = [];
  const accepted = [];

  if (
    !report ||
    typeof report !== 'object' ||
    report.error ||
    !report.vulnerabilities ||
    typeof report.vulnerabilities !== 'object' ||
    Array.isArray(report.vulnerabilities)
  ) {
    return { passed: false, accepted, violations: ['npm audit returned an invalid report'] };
  }

  for (const [packageName, vulnerability] of Object.entries(report.vulnerabilities ?? {})) {
    if (packageName === 'image-size' && isAllowedImageSize(vulnerability)) {
      accepted.push(packageName);
      continue;
    }
    if (packageName === 'pptxgenjs' && isAllowedPptxPropagation(vulnerability)) {
      accepted.push(packageName);
      continue;
    }
    if (isAllowedLhciPackage(packageName, vulnerability)) {
      accepted.push(packageName);
      continue;
    }
    violations.push(`${packageName}: unexpected ${vulnerability.severity ?? 'unknown'} advisory`);
  }

  // image-size and pptxgenjs are a linked transitive chain — they must appear together.
  const hasImageSize = accepted.includes('image-size');
  const hasPptxgenjs = accepted.includes('pptxgenjs');
  if (hasImageSize !== hasPptxgenjs) {
    violations.push('image-size and pptxgenjs must be accepted as a pair');
  }

  // Defence-in-depth: no package outside known allowlists should appear in accepted[].
  const unexpected = accepted.filter((p) => !ALL_KNOWN_ACCEPTED_PACKAGES.has(p));
  if (unexpected.length > 0) {
    violations.push(`unexpected packages in temporary acceptance: ${unexpected.join(', ')}`);
  }

  if (accepted.length > 0 && now.getTime() > new Date(RISK_REVIEW_DEADLINE).getTime()) {
    violations.push(`temporary acceptance expired at ${RISK_REVIEW_DEADLINE}`);
  }

  return { passed: violations.length === 0, accepted, violations };
}

function runAudit() {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmCommand, ['audit', '--json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.error || ![0, 1].includes(result.status ?? -1)) {
    return {
      report: null,
      executionError: result.error?.message || result.stderr || `npm audit exited ${result.status}`,
    };
  }

  try {
    return { report: JSON.parse(result.stdout), executionError: null };
  } catch (error) {
    return { report: null, executionError: `invalid npm audit JSON: ${error.message}` };
  }
}

function main() {
  const { report, executionError } = runAudit();
  if (executionError) {
    console.error(`[dependency-audit] ${executionError}`);
    process.exitCode = 1;
    return;
  }

  const evaluation = evaluateAuditReport(report);
  if (!evaluation.passed) {
    console.error('[dependency-audit] New, changed or expired vulnerability detected:');
    for (const violation of evaluation.violations) console.error(`- ${violation}`);
    process.exitCode = 1;
    return;
  }

  if (evaluation.accepted.length > 0) {
    console.log(
      `[dependency-audit] PASS with reviewed temporary risk: ${evaluation.accepted.join(', ')}; review by ${RISK_REVIEW_DEADLINE}.`,
    );
    return;
  }

  console.log('[dependency-audit] PASS: npm audit reports no vulnerabilities.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
