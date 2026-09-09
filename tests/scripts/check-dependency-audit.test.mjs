import { describe, expect, it } from 'vitest';
import {
  evaluateAuditReport,
  RISK_REVIEW_DEADLINE,
} from '../../scripts/check-dependency-audit.mjs';

const reviewedReport = {
  vulnerabilities: {
    'image-size': {
      severity: 'high',
      isDirect: false,
      effects: ['pptxgenjs'],
      via: [
        { url: 'https://github.com/advisories/GHSA-w3rx-r6r6-pgpr' },
        { url: 'https://github.com/advisories/GHSA-5p2g-fcmc-qvqq' },
      ],
    },
    pptxgenjs: { severity: 'high', isDirect: true, effects: [], via: ['image-size'] },
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
