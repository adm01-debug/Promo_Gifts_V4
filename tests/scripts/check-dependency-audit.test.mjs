import { describe, expect, it } from 'vitest';
import {
  REVIEWED_MINIMATCH_VIA,
  REVIEWED_MINIMATCH_EFFECTS,
  REVIEWED_MINIMATCH_RANGES,
  evaluateAuditReport,
  RISK_REVIEW_DEADLINE,
} from '../../scripts/check-dependency-audit.mjs';

// Updated 2026-09-26: npm refreshed advisory source IDs and ranges for GHSA-5p2g / GHSA-w3rx.
const reviewedReport = {
  vulnerabilities: {
    'image-size': {
      severity: 'high',
      isDirect: false,
      effects: ['pptxgenjs'],
      range: '0.6.3 - 2.0.2',
      fixAvailable: { name: 'pptxgenjs', version: '4.0.0', isSemVerMajor: true },
      via: [
        {
          source: 1239765,
          name: 'image-size',
          dependency: 'image-size',
          severity: 'high',
          range: '>=1.2.0 <=2.0.2',
          url: 'https://github.com/advisories/GHSA-5p2g-fcmc-qvqq',
        },
        {
          source: 1239766,
          name: 'image-size',
          dependency: 'image-size',
          severity: 'high',
          range: '>=0.6.3 <=2.0.2',
          url: 'https://github.com/advisories/GHSA-w3rx-r6r6-pgpr',
        },
      ],
    },
    pptxgenjs: {
      severity: 'high',
      isDirect: true,
      effects: [],
      via: ['image-size'],
      range: '>=4.0.1-beta.0',
      fixAvailable: { name: 'pptxgenjs', version: '4.0.0', isSemVerMajor: true },
    },
  },
};

describe('dependency audit policy', () => {
  it('accepts only the reviewed image-size propagation before its deadline', () => {
    expect(evaluateAuditReport(reviewedReport, new Date('2026-09-09T12:00:00Z'))).toEqual({
      passed: true,
      accepted: ['image-size', 'pptxgenjs'],
      violations: [],
    });
  });

  it('fails closed for any new vulnerable package or advisory', () => {
    const report = structuredClone(reviewedReport);
    report.vulnerabilities.vitest = { severity: 'moderate', via: [] };
    report.vulnerabilities['image-size'].via.push({
      url: 'https://github.com/advisories/GHSA-new-unreviewed',
    });
    const result = evaluateAuditReport(report, new Date('2026-09-09T12:00:00Z'));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('image-size'),
        expect.stringContaining('vitest'),
      ]),
    );
  });

  it('requires the complete reviewed advisory set', () => {
    const report = structuredClone(reviewedReport);
    report.vulnerabilities['image-size'].via.pop();
    const result = evaluateAuditReport(report, new Date('2026-09-09T12:00:00Z'));
    expect(result.passed).toBe(false);
    expect(result.violations).toContain('image-size: unexpected high advisory');
  });

  it('rejects an incomplete accepted dependency chain', () => {
    const report = structuredClone(reviewedReport);
    delete report.vulnerabilities.pptxgenjs;
    const result = evaluateAuditReport(report, new Date('2026-09-09T12:00:00Z'));
    expect(result.passed).toBe(false);
    expect(result.violations).toContain('image-size and pptxgenjs must be accepted as a pair');
  });

  it.each([
    ['image-size marked as direct', 'image-size', 'isDirect', true],
    ['image-size with a different effect chain', 'image-size', 'effects', []],
    ['pptxgenjs marked as transitive', 'pptxgenjs', 'isDirect', false],
  ])('rejects changed dependency topology: %s', (_label, packageName, field, value) => {
    const report = structuredClone(reviewedReport);
    report.vulnerabilities[packageName][field] = value;
    const result = evaluateAuditReport(report, new Date('2026-09-09T12:00:00Z'));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([expect.stringContaining(packageName)]),
    );
  });

  it('rejects a changed advisory range even when URL and severity remain equal', () => {
    const report = structuredClone(reviewedReport);
    report.vulnerabilities['image-size'].via[0].range = '<=3.0.0';
    const result = evaluateAuditReport(report, new Date('2026-09-09T12:00:00Z'));
    expect(result.passed).toBe(false);
    expect(result.violations).toContain('image-size: unexpected high advisory');
  });

  it('rejects a newly compatible fix instead of silently keeping the exception', () => {
    const report = structuredClone(reviewedReport);
    report.vulnerabilities.pptxgenjs.fixAvailable = {
      name: 'pptxgenjs',
      version: '4.0.2',
      isSemVerMajor: false,
    };
    const result = evaluateAuditReport(report, new Date('2026-09-09T12:00:00Z'));
    expect(result.passed).toBe(false);
    expect(result.violations).toContain('pptxgenjs: unexpected high advisory');
  });

  it('accepts the prior reviewed incompatible downgrade reported by npm', () => {
    const report = structuredClone(reviewedReport);
    report.vulnerabilities['image-size'].fixAvailable.version = '1.1.5';
    report.vulnerabilities.pptxgenjs.fixAvailable.version = '1.1.5';
    report.vulnerabilities['image-size'].range = '*';
    report.vulnerabilities.pptxgenjs.range = '1.1.5-1 || >=1.1.6';
    expect(evaluateAuditReport(report, new Date('2026-09-09T12:00:00Z')).passed).toBe(true);
  });

  it('fails closed when the temporary acceptance expires', () => {
    const afterDeadline = new Date(new Date(RISK_REVIEW_DEADLINE).getTime() + 1);
    const result = evaluateAuditReport(reviewedReport, afterDeadline);
    expect(result.passed).toBe(false);
    expect(result.violations).toContain(
      `temporary acceptance expired at ${RISK_REVIEW_DEADLINE}`,
    );
  });

  it('accepts the full @lhci/cli transitive chain as dev-only', () => {
    const lhciReport = {
      vulnerabilities: {
        '@lhci/cli': { severity: 'moderate', isDirect: true, via: ['tmp'], effects: [] },
        tmp: { severity: 'high', isDirect: false, via: [], effects: ['@lhci/cli'] },
        lighthouse: { severity: 'high', isDirect: false, via: [], effects: ['@lhci/cli'] },
      },
    };
    const result = evaluateAuditReport(lhciReport, new Date('2026-09-09T12:00:00Z'));
    expect(result.passed).toBe(true);
    expect(result.accepted).toEqual(expect.arrayContaining(['@lhci/cli', 'tmp', 'lighthouse']));
    expect(result.violations).toEqual([]);
  });

  it('accepts only the reviewed minimatch advisory and exact ESLint dependency graph', () => {
    const vulnerabilities = Object.fromEntries(
      [...REVIEWED_MINIMATCH_VIA].map(([name, via]) => [
        name,
        {
          severity: 'moderate',
          isDirect: [
            '@typescript-eslint/eslint-plugin',
            '@typescript-eslint/parser',
            'eslint',
            'eslint-plugin-jsx-a11y',
            'eslint-plugin-react',
            'eslint-plugin-unused-imports',
          ].includes(name),
          range: REVIEWED_MINIMATCH_RANGES.get(name),
          effects: REVIEWED_MINIMATCH_EFFECTS.get(name),
          via:
            name === 'minimatch'
              ? [
                  {
                    source: 1244012,
                    name: 'minimatch',
                    dependency: 'minimatch',
                    severity: 'moderate',
                    range: '<11.0.1',
                    url: 'https://github.com/advisories/GHSA-g3hv-75wg-m249',
                  },
                ]
              : via,
          fixAvailable:
            name === 'minimatch'
              ? { name: 'eslint-plugin-unused-imports', version: '1.1.3', isSemVerMajor: true }
              : true,
        },
      ]),
    );
    const result = evaluateAuditReport({ vulnerabilities }, new Date('2026-10-31T12:00:00Z'));
    expect(result.passed).toBe(true);
    expect(result.accepted).toEqual([...REVIEWED_MINIMATCH_VIA.keys()]);
    expect(result.violations).toEqual([]);
  });

  it('fails closed when the minimatch advisory or propagation graph changes', () => {
    const vulnerabilities = {
      minimatch: {
        severity: 'moderate',
        isDirect: false,
        range: '<11.0.1',
        effects: REVIEWED_MINIMATCH_EFFECTS.get('minimatch'),
        via: [
          {
            source: 1244012,
            name: 'minimatch',
            dependency: 'minimatch',
            severity: 'moderate',
            range: '<11.0.1',
            url: 'https://github.com/advisories/GHSA-unreviewed',
          },
        ],
        fixAvailable: { name: 'eslint-plugin-unused-imports', version: '1.1.3', isSemVerMajor: true },
      },
      eslint: {
        severity: 'moderate',
        isDirect: true,
        range: '*',
        via: ['eslint-unreviewed-parent'],
        effects: REVIEWED_MINIMATCH_EFFECTS.get('eslint'),
      },
    };
    const result = evaluateAuditReport({ vulnerabilities }, new Date('2026-10-31T12:00:00Z'));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('minimatch'),
        expect.stringContaining('eslint'),
      ]),
    );
  });

  it('rejects an @lhci/cli transitive that became a direct dependency', () => {
    const report = {
      vulnerabilities: {
        ws: { severity: 'high', isDirect: true, via: [], effects: [] },
      },
    };
    const result = evaluateAuditReport(report, new Date('2026-09-09T12:00:00Z'));
    expect(result.passed).toBe(false);
    expect(result.violations).toContain('ws: unexpected high advisory');
  });

  it('rejects an @lhci/cli-named package that is marked direct (topology shift)', () => {
    // @lhci/utils must be transitive; if somehow isDirect flips, we reject.
    const report = {
      vulnerabilities: {
        '@lhci/utils': { severity: 'low', isDirect: true, via: [], effects: [] },
      },
    };
    const result = evaluateAuditReport(report, new Date('2026-09-09T12:00:00Z'));
    expect(result.passed).toBe(false);
    expect(result.violations).toContain('@lhci/utils: unexpected low advisory');
  });

  it('rejects a new consumer that could expose the advisory to a production path', () => {
    const vulnerabilities = Object.fromEntries(
      [...REVIEWED_MINIMATCH_VIA].map(([name, via]) => [
        name,
        {
          name,
          severity: 'moderate',
          isDirect: [
            '@typescript-eslint/eslint-plugin',
            '@typescript-eslint/parser',
            'eslint',
            'eslint-plugin-jsx-a11y',
            'eslint-plugin-react',
            'eslint-plugin-unused-imports',
          ].includes(name),
          range: REVIEWED_MINIMATCH_RANGES.get(name),
          effects: [...REVIEWED_MINIMATCH_EFFECTS.get(name)],
          via:
            name === 'minimatch'
              ? [
                  {
                    source: 1244012,
                    name: 'minimatch',
                    dependency: 'minimatch',
                    severity: 'moderate',
                    range: '<11.0.1',
                    url: 'https://github.com/advisories/GHSA-g3hv-75wg-m249',
                  },
                ]
              : via,
          fixAvailable:
            name === 'minimatch'
              ? { name: 'eslint-plugin-unused-imports', version: '1.1.3', isSemVerMajor: true }
              : true,
        },
      ]),
    );
    vulnerabilities.eslint.effects.push('production-runtime-package');

    const result = evaluateAuditReport(
      { vulnerabilities },
      new Date('2026-10-31T12:00:00Z'),
    );
    expect(result.passed).toBe(false);
    expect(result.violations).toContain('eslint: unexpected moderate advisory');
  });

  it('rejects a changed range on a transitive package in the reviewed graph', () => {
    const vulnerabilities = {
      minimatch: {
        severity: 'moderate',
        isDirect: false,
        range: '<11.0.1',
        effects: REVIEWED_MINIMATCH_EFFECTS.get('minimatch'),
        via: [
          {
            source: 1244012,
            name: 'minimatch',
            dependency: 'minimatch',
            severity: 'moderate',
            range: '<11.0.1',
            url: 'https://github.com/advisories/GHSA-g3hv-75wg-m249',
          },
        ],
        fixAvailable: { name: 'eslint-plugin-unused-imports', version: '1.1.3', isSemVerMajor: true },
      },
      '@eslint/config-array': {
        severity: 'moderate',
        isDirect: false,
        range: '<=99.0.0',
        effects: REVIEWED_MINIMATCH_EFFECTS.get('@eslint/config-array'),
        via: REVIEWED_MINIMATCH_VIA.get('@eslint/config-array'),
      },
    };
    const result = evaluateAuditReport({ vulnerabilities }, new Date('2026-10-31T12:00:00Z'));
    expect(result.passed).toBe(false);
    expect(result.violations).toContain('@eslint/config-array: unexpected moderate advisory');
  });

  it('rejects @typescript-eslint/utils entry whose effects field is missing (null-coercion regression)', () => {
    // Regression for Qodo HIGH finding (2026-11-01): vulnerability.effects ?? [] coerced null/undefined
    // to [] before comparison, so an npm audit entry that omits effects entirely would match the
    // reviewed empty-effects alternative and pass through the gate without verification.
    // The fix requires Array.isArray(effects) — a missing field must not match any reviewed array.
    const vulnerabilities = Object.fromEntries(
      [...REVIEWED_MINIMATCH_VIA].map(([name, via]) => [
        name,
        {
          severity: 'moderate',
          isDirect: [
            '@typescript-eslint/eslint-plugin',
            '@typescript-eslint/parser',
            'eslint',
            'eslint-plugin-jsx-a11y',
            'eslint-plugin-react',
            'eslint-plugin-unused-imports',
          ].includes(name),
          range: REVIEWED_MINIMATCH_RANGES.get(name),
          effects: REVIEWED_MINIMATCH_EFFECTS.get(name),
          via:
            name === 'minimatch'
              ? [
                  {
                    source: 1244012,
                    name: 'minimatch',
                    dependency: 'minimatch',
                    severity: 'moderate',
                    range: '<11.0.1',
                    url: 'https://github.com/advisories/GHSA-g3hv-75wg-m249',
                  },
                ]
              : via,
          fixAvailable:
            name === 'minimatch'
              ? { name: 'eslint-plugin-unused-imports', version: '1.1.3', isSemVerMajor: true }
              : true,
        },
      ]),
    );
    // Remove effects entirely from @typescript-eslint/utils (simulates omitted field from npm audit)
    delete vulnerabilities['@typescript-eslint/utils'].effects;
    const result = evaluateAuditReport({ vulnerabilities }, new Date('2026-10-31T12:00:00Z'));
    expect(result.passed).toBe(false);
    expect(result.violations).toContain('@typescript-eslint/utils: unexpected moderate advisory');
  });

  it('passes without an exception when the audit is clean', () => {
    expect(evaluateAuditReport({ vulnerabilities: {} })).toEqual({
      passed: true,
      accepted: [],
      violations: [],
    });
  });

  it('fails closed when npm audit omits the vulnerabilities map', () => {
    expect(evaluateAuditReport({})).toEqual({
      passed: false,
      accepted: [],
      violations: ['npm audit returned an invalid report'],
    });
  });
});
