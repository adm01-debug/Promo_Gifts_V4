import { describe, expect, it } from 'vitest';
import {
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
    expect(result.violations).toContain(
      'temporary acceptance must contain exactly image-size and pptxgenjs',
    );
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
      `temporary image-size acceptance expired at ${RISK_REVIEW_DEADLINE}`,
    );
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
