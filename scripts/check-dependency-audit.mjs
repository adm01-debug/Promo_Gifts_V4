#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const RISK_REVIEW_DEADLINE = '2026-10-09T23:59:59-03:00';

const ALLOWED_IMAGE_SIZE_ADVISORIES = new Map([
  ['https://github.com/advisories/GHSA-5p2g-fcmc-qvqq', 1138809],
  ['https://github.com/advisories/GHSA-w3rx-r6r6-pgpr', 1138808],
]);

function hasExpectedFixAvailable(vulnerability) {
  const fix = vulnerability.fixAvailable;
  return (
    fix &&
    typeof fix === 'object' &&
    fix.name === 'pptxgenjs' &&
    fix.version === '1.1.5' &&
    fix.isSemVerMajor === true
  );
}

function hasExpectedImageSizeAdvisories(vulnerability) {
  const via = vulnerability.via;
  return (
    Array.isArray(via) &&
    via.length === ALLOWED_IMAGE_SIZE_ADVISORIES.size &&
    via.every(
      (advisory) =>
        advisory &&
        typeof advisory === 'object' &&
        ALLOWED_IMAGE_SIZE_ADVISORIES.get(advisory.url) === advisory.source &&
        advisory.name === 'image-size' &&
        advisory.dependency === 'image-size' &&
        advisory.severity === 'high' &&
        advisory.range === '<=2.0.2',
    )
  );
}

function isAllowedImageSize(vulnerability) {
  return (
    vulnerability.severity === 'high' &&
    vulnerability.isDirect === false &&
    Array.isArray(vulnerability.effects) &&
    vulnerability.effects.length === 1 &&
    vulnerability.effects[0] === 'pptxgenjs' &&
    vulnerability.range === '*' &&
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
    vulnerability.range === '1.1.5-1 || >=1.1.6' &&
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
    violations.push(`${packageName}: unexpected ${vulnerability.severity ?? 'unknown'} advisory`);
  }

  if (
    accepted.length > 0 &&
    !(accepted.length === 2 && accepted.includes('image-size') && accepted.includes('pptxgenjs'))
  ) {
    violations.push('temporary acceptance must contain exactly image-size and pptxgenjs');
  }

  if (accepted.length > 0 && now.getTime() > new Date(RISK_REVIEW_DEADLINE).getTime()) {
    violations.push(`temporary image-size acceptance expired at ${RISK_REVIEW_DEADLINE}`);
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
