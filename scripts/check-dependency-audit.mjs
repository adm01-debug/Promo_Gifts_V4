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

// zod — GHSA-mrhx-c7xc-m3w5 (DoS: memory exhaustion in oversized constrained collections).
// After Dependabot PR #2401 upgraded zod 3.x → 4.6.6, our DIRECT zod is no longer vulnerable
// (range <4.6.6 does not include 4.6.6). npm audit now reports zod with isDirect:false because
// the vulnerability represents chromium-bidi's nested older zod
// (node_modules/chromium-bidi/node_modules/zod), not our production dep.
// chromium-bidi is a transitive dev-only dep: puppeteer-core → chromium-bidi → zod.
// puppeteer-core is already in ALLOWED_LHCI_PACKAGES (LHCI / Playwright CI tooling only).
// Revisit by RISK_REVIEW_DEADLINE. (E205 — 2026-10-23; updated post-#2401)
const ZOD_CVE_ADVISORY_URL = 'https://github.com/advisories/GHSA-mrhx-c7xc-m3w5';
const ZOD_CVE_SOURCE = 1243066;
const ALLOWED_ZOD_CHAIN_PACKAGES = new Set([
  'zod',           // direct production dep — DoS only, constrained inputs, no breaking fix
  'chromium-bidi', // transitive dev-only: puppeteer-core (already in LHCI set) → chromium-bidi
]);

// vitest test-runner ecosystem — dev-only testing tools, never in the production bundle.
// vitest ^4.1.11 and @vitest/coverage-v8 ^4.1.11 are direct devDependencies.
// @vitest/mocker is pulled transitively by vitest.
// Moderate advisory published 2026-10 affects vitest in browser-mode APIs only — this project
// runs vitest in node/jsdom mode for unit tests; advisory is not reachable from production.
// No non-breaking fix exists at 4.x (semver-major upgrade required). Accepted same pattern as
// ALLOWED_LHCI_PACKAGES. Revisit by RISK_REVIEW_DEADLINE. (E099 — 2026-10-21)
const ALLOWED_VITEST_PACKAGES = new Set([
  'vitest',              // direct devDependency (test runner)
  '@vitest/coverage-v8', // direct devDependency (coverage reporter)
  '@vitest/mocker',      // transitive devDependency (via vitest)
]);

// @lhci/cli transitive dependencies — dev-only CI tooling, never in the production bundle.
// All of these are pulled exclusively by @lhci/cli (Lighthouse CI) and its own transitives
// (puppeteer-core → @puppeteer/browsers → extract-zip/tar-fs, lighthouse → @sentry/node,
// proxy-agent → pac-proxy-agent → get-uri → basic-ftp, etc.).
// None can be reached from production code. Accepted 2026-09-27. Revisit by RISK_REVIEW_DEADLINE.
const ALLOWED_LHCI_PACKAGES = new Set([
  '@lhci/cli', // direct devDependency; moderate severity
  '@lhci/utils',
  '@puppeteer/browsers',
  '@sentry/node',
  'basic-ftp',            // transitive: proxy-agent → pac-proxy-agent → get-uri → basic-ftp
  'cookie',
  'external-editor',
  'extract-zip',
  'get-uri',              // transitive: proxy-agent → pac-proxy-agent → get-uri
  'inquirer',
  'ip-address',           // transitive: @lhci/cli → proxy-agent → pac-proxy-agent → socks-proxy-agent → socks → ip-address; moderate advisory 2026-10; dev-only
  'lighthouse',
  'pac-proxy-agent',      // transitive: @lhci/cli → proxy-agent → pac-proxy-agent
  'proxy-agent',          // transitive: @lhci/cli → proxy-agent
  'puppeteer-core',
  'socks',                // transitive: @lhci/cli → … → socks-proxy-agent → socks; dev-only
  'socks-proxy-agent',    // transitive: @lhci/cli → proxy-agent → pac-proxy-agent → socks-proxy-agent; dev-only
  'tar-fs',
  'tmp',
  'uuid',
  'ws',
  'body-parser',          // transitive: @lhci/cli → express → body-parser; GHSA-27r3-jxmh-p828; dev-only
  'chromium-bidi',        // transitive: @lhci/cli → lighthouse → puppeteer-core → chromium-bidi; vuln via zod; dev-only
  'qs',                   // transitive: @lhci/cli → express → qs; GHSA-6pq8-jhm2-2vcw; moderate; DoS via stringify arrayFormat comma; dev-only
]);

// GHSA-mrhx-c7xc-m3w5 — zod: memory exhaustion in oversized constrained
// collections validation (advisory publicado 2026-10). In this project,
// zod@3.x is used for form/schema validation via @hookform/resolvers —
// not for user-provided arbitrary constrained collections. No non-breaking
// fix: patch requires zod@4.6.7 (semver-major from installed 3.x). Only
// effects[] chromium-bidi (dev-only, @lhci/cli → lighthouse → puppeteer-core).
// Accepted same pattern as pptxgenjs. Revisit by RISK_REVIEW_DEADLINE.
const ALLOWED_ZOD_ADVISORY_URL = 'https://github.com/advisories/GHSA-mrhx-c7xc-m3w5';
const ALLOWED_ZOD_FIX_VERSION = '4.6.7';

// GHSA-vfj7-8cjw-p6xm — braces: stack-exhaustion DoS via deeply nested
// patterns (advisory publicado 2026-10). Cadeia de propagação inteiramente
// dev/build-time — NUNCA chega ao bundle de produção:
//   tailwindcss 3.x → chokidar (watcher), fast-glob → micromatch → braces
//   lovable-tagger → tailwindcss
//   vite dev-server → chokidar → braces
// Não existe fix não-breaking: `npm audit fix --force` instalaria
// tailwindcss@4.x (mudança major de engine/config — projeto está em 3.4.x).
// Aceito como risco transitório, mesmo padrão ALLOWED_LHCI_PACKAGES.
// Revisit by RISK_REVIEW_DEADLINE (ou antes, na migração Tailwind v4).
const ALLOWED_BRACES_CHAIN_DIRECT = new Set([
  'tailwindcss',          // direct devDependency (build-time CSS)
  'tailwindcss-animate',  // direct dep — plugin Tailwind, compila p/ CSS estático
  'lovable-tagger',       // direct devDependency (Lovable tagger)
]);
const ALLOWED_BRACES_CHAIN_TRANSITIVE = new Set([
  'braces', 'micromatch', 'fast-glob', 'chokidar',
  // GHSA-rj75-hqrm-r3gf — postcss-selector-parser: DoS por complexidade
  // quadrática no parsing de seletores (advisory publicado 2026-10).
  // Mesma cadeia build-time do braces acima — só alcançável via CSS
  // autorado no repo, nunca por input de usuário em produção:
  //   tailwindcss 3.x → postcss-nested → postcss-selector-parser
  // Fix exige tailwindcss@4.x (major). Aceito como risco transitório.
  'postcss-selector-parser', 'postcss-nested',
]);

// fast-uri — moderate advisory. Transitive dep via ajv (JSON Schema validator used by
// test tooling, e.g. jest-extended, vitest internals). Never in the production bundle.
// undici — moderate advisory. Transitive dep via jsdom (DOM simulation engine used by
// vitest's jsdom test environment). Never in the production bundle.
// Both are purely transitive dev-only dependencies with no non-breaking fix available.
// Accepted same pattern as ALLOWED_LHCI_PACKAGES. Revisit by RISK_REVIEW_DEADLINE.
const ALLOWED_AJV_JSDOM_CHAIN_PACKAGES = new Set([
  'fast-uri',  // transitive: ajv → fast-uri; moderate; dev-only (test tooling schema validation)
  'undici',    // transitive: jsdom → undici; moderate; vitest jsdom test environment
]);

// minimatch — GHSA-g3hv-75wg-m249 (DoS via globparts amplification), advisory
// published 2026-10-31. npm has no compatible fix for the installed minimatch
// 3.x/10.x chain; its suggested fix downgrades eslint-plugin-unused-imports to
// 1.1.3 (semver-major). The affected packages below are the exact ESLint
// toolchain graph from npm audit; package.json classifies the toolchain as
// devDependencies, so it is excluded from the production install/audit. Keep
// this exception exact by package, directness and `via` graph; any new package,
// advisory, severity or dependency path must fail closed. Revisit by
// RISK_REVIEW_DEADLINE. (E206 — 2026-10-31)
export const REVIEWED_MINIMATCH_VIA = new Map([
  ['@eslint-community/eslint-utils', ['eslint']],
  ['@eslint/config-array', ['minimatch']],
  ['@eslint/eslintrc', ['minimatch']],
  ['@typescript-eslint/eslint-plugin', ['@typescript-eslint/parser', '@typescript-eslint/type-utils', '@typescript-eslint/utils', 'eslint']],
  ['@typescript-eslint/parser', ['@typescript-eslint/typescript-estree', 'eslint']],
  ['@typescript-eslint/type-utils', ['@typescript-eslint/typescript-estree', '@typescript-eslint/utils', 'eslint']],
  ['@typescript-eslint/typescript-estree', ['minimatch']],
  ['@typescript-eslint/utils', ['@eslint-community/eslint-utils', '@typescript-eslint/typescript-estree', 'eslint']],
  ['chrome-launcher', ['rimraf']],
  ['eslint', ['@eslint-community/eslint-utils', '@eslint/config-array', '@eslint/eslintrc', 'minimatch']],
  ['eslint-plugin-jsx-a11y', ['minimatch']],
  ['eslint-plugin-react', ['minimatch']],
  ['eslint-plugin-unused-imports', ['@typescript-eslint/eslint-plugin', 'eslint']],
  ['glob', ['minimatch']],
  ['minimatch', null],
  ['rimraf', ['glob']],
]);

// Effects are part of the reviewed reachability graph too. A new consumer can
// make an otherwise dev-only advisory affect a production path, so the gate
// must fail if npm reports any additional dependent package.
export const REVIEWED_MINIMATCH_EFFECTS = new Map([
  ['@eslint-community/eslint-utils', ['@typescript-eslint/utils', 'eslint']],
  ['@eslint/config-array', ['eslint']],
  ['@eslint/eslintrc', ['eslint']],
  ['@typescript-eslint/eslint-plugin', ['eslint-plugin-unused-imports']],
  ['@typescript-eslint/parser', ['@typescript-eslint/eslint-plugin']],
  ['@typescript-eslint/type-utils', ['@typescript-eslint/eslint-plugin']],
  ['@typescript-eslint/typescript-estree', ['@typescript-eslint/parser', '@typescript-eslint/type-utils', '@typescript-eslint/utils']],
  ['@typescript-eslint/utils', ['@typescript-eslint/eslint-plugin', '@typescript-eslint/type-utils']],
  ['chrome-launcher', ['@lhci/cli']],
  ['eslint', ['@eslint-community/eslint-utils', '@typescript-eslint/eslint-plugin', '@typescript-eslint/parser', '@typescript-eslint/type-utils', '@typescript-eslint/utils', 'eslint-plugin-unused-imports']],
  ['eslint-plugin-jsx-a11y', []],
  ['eslint-plugin-react', []],
  ['eslint-plugin-unused-imports', []],
  ['glob', ['rimraf']],
  ['minimatch', ['@eslint/config-array', '@eslint/eslintrc', '@typescript-eslint/typescript-estree', 'eslint', 'eslint-plugin-jsx-a11y', 'eslint-plugin-react', 'glob']],
  ['rimraf', ['chrome-launcher']],
]);

export const REVIEWED_MINIMATCH_RANGES = new Map([
  ['@eslint-community/eslint-utils', '*'],
  ['@eslint/config-array', '*'],
  ['@eslint/eslintrc', '0.0.1 || >=0.1.1'],
  ['@typescript-eslint/eslint-plugin', '*'],
  ['@typescript-eslint/parser', '*'],
  ['@typescript-eslint/type-utils', '>=5.9.2-alpha.0'],
  ['@typescript-eslint/typescript-estree', '>=6.16.0'],
  ['@typescript-eslint/utils', '*'],
  ['chrome-launcher', '0.3.1 - 0.13.4'],
  ['eslint', '0.7.1 - 2.0.0-rc.1 || >=4.1.0'],
  ['eslint-plugin-jsx-a11y', '>=6.5.0'],
  ['eslint-plugin-react', '>=7.23.0'],
  ['eslint-plugin-unused-imports', '0.0.3 - 1.0.1 || >=1.1.4'],
  ['glob', '3.0.0 - 13.0.6'],
  ['minimatch', '<11.0.1'],
  ['rimraf', '2.3.0 - 3.0.2 || >=4.2.0'],
]);

// The npm advisory DB occasionally returns revised range/effects for these packages —
// both representations are the same GHSA-g3hv-75wg-m249 (minimatch) advisory. Any
// value outside these known sets still fails closed. (E206 — updated 2026-11-01)
const REVIEWED_MINIMATCH_RANGES_ALLOWED = new Map([
  // Advisory revised: either >=5.9.2-alpha.0 or >=5.62.1-alpha.0 depending on server
  ['@typescript-eslint/type-utils', new Set(['>=5.9.2-alpha.0', '>=5.62.1-alpha.0'])],
]);
// npm audit can report [] or the full downstream array for @typescript-eslint/utils effects
const REVIEWED_MINIMATCH_EFFECTS_ALLOWED = new Map([
  ['@typescript-eslint/utils', [
    ['@typescript-eslint/eslint-plugin', '@typescript-eslint/type-utils'],
    [],
  ]],
]);

const REVIEWED_MINIMATCH_DIRECT_PACKAGES = new Set([
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
  'eslint',
  'eslint-plugin-jsx-a11y',
  'eslint-plugin-react',
  'eslint-plugin-unused-imports',
]);
const MINIMATCH_ADVISORY_URL = 'https://github.com/advisories/GHSA-g3hv-75wg-m249';

function isAllowedMinimatchChainPackage(packageName, vulnerability) {
  if (!REVIEWED_MINIMATCH_VIA.has(packageName) || vulnerability.severity !== 'moderate') {
    return false;
  }

  // Range check: accept any known-good value for this package (E206 — updated 2026-11-01)
  const rangeAllowed = REVIEWED_MINIMATCH_RANGES_ALLOWED.get(packageName);
  const expectedRange = REVIEWED_MINIMATCH_RANGES.get(packageName);
  if (rangeAllowed ? !rangeAllowed.has(vulnerability.range) : vulnerability.range !== expectedRange) {
    return false;
  }

  if (vulnerability.isDirect !== REVIEWED_MINIMATCH_DIRECT_PACKAGES.has(packageName)) {
    return false;
  }

  const via = vulnerability.via ?? [];
  if (packageName === 'minimatch') {
    const advisory = via[0];
    const fix = vulnerability.fixAvailable;
    const expectedEffects = REVIEWED_MINIMATCH_EFFECTS.get(packageName);
    return (
      vulnerability.range === '<11.0.1' &&
      Array.isArray(expectedEffects) &&
      Array.isArray(vulnerability.effects) &&
      vulnerability.effects.length === expectedEffects.length &&
      vulnerability.effects.every((entry, index) => entry === expectedEffects[index]) &&
      via.length === 1 &&
      typeof advisory === 'object' &&
      advisory?.source === 1244012 &&
      advisory?.name === 'minimatch' &&
      advisory?.dependency === 'minimatch' &&
      advisory?.severity === 'moderate' &&
      advisory?.range === '<11.0.1' &&
      advisory?.url === MINIMATCH_ADVISORY_URL &&
      fix?.name === 'eslint-plugin-unused-imports' &&
      fix?.version === '1.1.3' &&
      fix?.isSemVerMajor === true
    );
  }

  const expectedVia = REVIEWED_MINIMATCH_VIA.get(packageName);
  if (
    !Array.isArray(expectedVia) ||
    via.length !== expectedVia.length ||
    !via.every((entry, index) => entry === expectedVia[index])
  ) {
    return false;
  }

  // fixAvailable check (Qodo HIGH fix, 2026-11-01): a compatible fix (isSemVerMajor: false)
  // or a new object fix means this advisory is patchable and must no longer be allowlisted.
  // Accept only fixAvailable === true (semver-major lock-in, no compatible upgrade) or the
  // exact same semver-major object reported by npm for the root cause (eslint-plugin-unused-imports
  // 1.1.3 — isSemVerMajor: true). Any other object (isSemVerMajor: false, or a different package)
  // means a real fix landed and the caller must upgrade.
  const fix = vulnerability.fixAvailable;
  const isKnownSemVerMajorFix =
    typeof fix === 'object' &&
    fix !== null &&
    fix.name === 'eslint-plugin-unused-imports' &&
    fix.version === '1.1.3' &&
    fix.isSemVerMajor === true;
  if (fix !== true && !isKnownSemVerMajorFix) return false;

  // Effects check: accept any known-good array for this package (E206 — updated 2026-11-01)
  // Explicitly require effects to be an Array — null/undefined is not the same as [] and must
  // not match the reviewed empty-effects alternative (Qodo HIGH fix, 2026-11-01).
  const effectsAllowed = REVIEWED_MINIMATCH_EFFECTS_ALLOWED.get(packageName);
  if (effectsAllowed) {
    if (!Array.isArray(vulnerability.effects)) return false;
    const actualEffects = vulnerability.effects;
    return effectsAllowed.some(
      (alt) =>
        actualEffects.length === alt.length &&
        actualEffects.every((entry, index) => entry === alt[index]),
    );
  }
  const expectedEffects = REVIEWED_MINIMATCH_EFFECTS.get(packageName);
  return (
    Array.isArray(expectedEffects) &&
    Array.isArray(vulnerability.effects) &&
    vulnerability.effects.length === expectedEffects.length &&
    vulnerability.effects.every((entry, index) => entry === expectedEffects[index])
  );
}

// Únicos advisories aceitos dentro da cadeia build-time. Qualquer
// advisory NOVO em um desses pacotes (objeto em `via` com URL fora do
// conjunto) volta a bloquear o gate — a aceitação é por advisory,
// não em branco por pacote.
const EXPECTED_CHAIN_ADVISORY_URLS = new Set([
  'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm', // braces
  'https://github.com/advisories/GHSA-rj75-hqrm-r3gf', // postcss-selector-parser
]);

// `via` mistura strings (nome do pacote por onde a vuln propaga) e
// objetos (advisory direto do pacote). Objetos precisam estar em
// EXPECTED_CHAIN_ADVISORY_URLS; strings só passam se nomearem um pacote
// já aceito na cadeia — um nome desconhecido indica advisory novo
// propagado por dependência não revisada, e deve bloquear.
const ALL_CHAIN_PACKAGES = new Set([
  ...ALLOWED_BRACES_CHAIN_DIRECT,
  ...ALLOWED_BRACES_CHAIN_TRANSITIVE,
]);
function hasOnlyExpectedChainAdvisories(vulnerability) {
  const via = vulnerability.via ?? [];
  return via.every((entry) =>
    typeof entry === 'string'
      ? ALL_CHAIN_PACKAGES.has(entry)
      : EXPECTED_CHAIN_ADVISORY_URLS.has(entry?.url));
}

// All packages that may appear in the accepted[] list — used for defence-in-depth after the loop.
// NOTE: packages added to ALLOWED_LHCI_PACKAGES are automatically included here via spread.
const ALL_KNOWN_ACCEPTED_PACKAGES = new Set([
  'image-size',
  'pptxgenjs',
  'zod',
  ...ALLOWED_VITEST_PACKAGES,
  ...ALLOWED_LHCI_PACKAGES,
  ...ALLOWED_BRACES_CHAIN_DIRECT,
  ...ALLOWED_BRACES_CHAIN_TRANSITIVE,
  ...ALLOWED_ZOD_CHAIN_PACKAGES,
  ...ALLOWED_AJV_JSDOM_CHAIN_PACKAGES,
  ...REVIEWED_MINIMATCH_VIA.keys(),
]);

function isAllowedVitestPackage(packageName, vulnerability) {
  if (!ALLOWED_VITEST_PACKAGES.has(packageName)) return false;
  if (packageName === 'vitest' || packageName === '@vitest/coverage-v8') {
    return vulnerability.isDirect === true;
  }
  // @vitest/mocker and any other transitive vitest packages must be purely transitive.
  return vulnerability.isDirect === false;
}

function isAllowedLhciPackage(packageName, vulnerability) {
  if (!ALLOWED_LHCI_PACKAGES.has(packageName)) return false;
  // @lhci/cli is a direct devDependency — its isDirect flag is true.
  if (packageName === '@lhci/cli') return vulnerability.isDirect === true;
  // Every other LHCI-related package must be purely transitive.
  return vulnerability.isDirect === false;
}

function isAllowedZodChainPackage(packageName, vulnerability) {
  if (!ALLOWED_ZOD_CHAIN_PACKAGES.has(packageName)) return false;
  if (packageName === 'zod') {
    if (vulnerability.severity !== 'high') return false;
    const via = vulnerability.via ?? [];
    const advisoryMatches =
      via.length === 1 &&
      typeof via[0] === 'object' &&
      via[0]?.url === ZOD_CVE_ADVISORY_URL &&
      via[0]?.source === ZOD_CVE_SOURCE;
    if (!advisoryMatches) return false;
    // Pre-#2401: our direct zod 3.x was vulnerable (isDirect:true).
    if (vulnerability.isDirect === true) return true;
    // Post-#2401: our direct zod is 4.6.6 (not in range <4.6.6).
    // npm audit now represents chromium-bidi's nested older zod (isDirect:false,
    // effects:['chromium-bidi']). Allow exactly this case.
    const effects = vulnerability.effects ?? [];
    return vulnerability.isDirect === false && effects.length === 1 && effects[0] === 'chromium-bidi';
  }
  if (packageName === 'chromium-bidi') {
    // Transitive dep — only via zod (which is in this allowlist), dev-only (puppeteer-core chain).
    if (vulnerability.isDirect !== false) return false;
    const via = vulnerability.via ?? [];
    return via.length === 1 && via[0] === 'zod';
  }
  return false;
}

// Shim: the merged loop calls isAllowedZod(v) for packageName==='zod'.
// Delegates to isAllowedZodChainPackage so the call site works.
function isAllowedZod(vulnerability) {
  return isAllowedZodChainPackage('zod', vulnerability);
}

function isAllowedAjvJsdomPackage(packageName, vulnerability) {
  if (!ALLOWED_AJV_JSDOM_CHAIN_PACKAGES.has(packageName)) return false;
  // Both are purely transitive — never direct.
  return vulnerability.isDirect === false && vulnerability.severity === 'moderate';
}

function isAllowedBracesChainPackage(packageName, vulnerability) {
  if (!hasOnlyExpectedChainAdvisories(vulnerability)) return false;
  if (ALLOWED_BRACES_CHAIN_DIRECT.has(packageName)) {
    return vulnerability.isDirect === true;
  }
  if (ALLOWED_BRACES_CHAIN_TRANSITIVE.has(packageName)) {
    return vulnerability.isDirect === false;
  }
  return false;
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
    if (packageName === 'zod' && isAllowedZod(vulnerability)) {
      accepted.push(packageName);
      continue;
    }
    if (packageName === 'image-size' && isAllowedImageSize(vulnerability)) {
      accepted.push(packageName);
      continue;
    }
    if (packageName === 'pptxgenjs' && isAllowedPptxPropagation(vulnerability)) {
      accepted.push(packageName);
      continue;
    }
    if (isAllowedVitestPackage(packageName, vulnerability)) {
      accepted.push(packageName);
      continue;
    }
    if (isAllowedLhciPackage(packageName, vulnerability)) {
      accepted.push(packageName);
      continue;
    }
    if (isAllowedZodChainPackage(packageName, vulnerability)) {
      accepted.push(packageName);
      continue;
    }
    if (isAllowedBracesChainPackage(packageName, vulnerability)) {
      accepted.push(packageName);
      continue;
    }
    if (isAllowedAjvJsdomPackage(packageName, vulnerability)) {
      accepted.push(packageName);
      continue;
    }
    if (isAllowedMinimatchChainPackage(packageName, vulnerability)) {
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
