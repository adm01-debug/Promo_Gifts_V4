import fs from 'node:fs';
import path from 'node:path';

/**
 * Relatório de auditoria — SÓ afirma o que foi medido.
 *
 * Antes: texto fixo ("Typecheck: Passou", "Credentials Audit: Limpo", "Sistema estável e pronto
 * para produção") que nunca consultava resultado algum e era publicado como artefato do nightly.
 * Agora cada seção recebe o veredito do job correspondente (flag ou variável de ambiente); sem
 * veredito, a linha diz "NÃO VERIFICADO". A cobertura é lida de coverage/coverage-summary.json.
 *
 * Uso:
 *   node scripts/generate-audit-report.mjs --typecheck=passed --lint=passed --security=failed --e2e=passed
 *   (ou AUDIT_TYPECHECK / AUDIT_LINT / AUDIT_SECURITY / AUDIT_E2E)   valores: passed | failed | skipped
 */

const VERDICTS = new Set(['passed', 'failed', 'skipped']);

export function resolveVerdict(name, argv = process.argv.slice(2), env = process.env) {
  const flag = argv.find((a) => a.startsWith(`--${name}=`));
  const raw = (flag ? flag.slice(name.length + 3) : env[`AUDIT_${name.toUpperCase()}`] ?? '').trim().toLowerCase();
  return VERDICTS.has(raw) ? raw : null;
}

const LABEL = {
  passed: 'PASSOU',
  failed: 'FALHOU',
  skipped: 'PULADO',
};

function line(title, verdict) {
  return `   - ${title}: ${verdict ? LABEL[verdict] : 'NÃO VERIFICADO (nenhum veredito recebido deste job)'}\n`;
}

export function buildReport({ argv = process.argv.slice(2), env = process.env, coverageSummary = null, now = new Date() } = {}) {
  const v = (name) => resolveVerdict(name, argv, env);
  let content = '=== Relatório de Auditoria de Segurança e Qualidade ===\n';
  content += `Data: ${now.toISOString()}\n\n`;

  content += '1. Qualidade\n';
  content += line('Typecheck (tsc)', v('typecheck'));
  content += line('Lint (ESLint)', v('lint'));
  content += '\n2. Segurança\n';
  content += line('Gates de segurança (SECURITY DEFINER, guarda de projeto, credenciais)', v('security'));
  content += '\n3. Testes E2E (Playwright)\n';
  content += line('Fluxos críticos', v('e2e'));
  content += '\n4. Cobertura de Testes\n';
  if (coverageSummary?.total) {
    const t = coverageSummary.total;
    content += `   - Statements: ${t.statements.pct}%\n   - Branches: ${t.branches.pct}%\n   - Functions: ${t.functions.pct}%\n   - Lines: ${t.lines.pct}%\n`;
  } else {
    content += '   - NÃO VERIFICADO (coverage/coverage-summary.json não encontrado).\n';
  }

  const verdicts = ['typecheck', 'lint', 'security', 'e2e'].map(v);
  const failed = verdicts.some((x) => x === 'failed');
  const unknown = verdicts.some((x) => x === null);
  content += '\nConclusão: ';
  content += failed
    ? 'HÁ FALHAS — não liberar sem corrigir.'
    : unknown
      ? 'INCOMPLETA — há seções NÃO VERIFICADAS; este relatório não atesta que o sistema está pronto para produção.'
      : 'todas as seções informadas passaram (o relatório só reflete os vereditos recebidos).';
  content += '\n===========================================================\n';
  return { content, failed };
}

function main() {
  const summaryPath = path.resolve(process.cwd(), 'coverage/coverage-summary.json');
  let coverageSummary = null;
  if (fs.existsSync(summaryPath)) {
    try {
      coverageSummary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    } catch {
      coverageSummary = null;
    }
  }
  const { content } = buildReport({ coverageSummary });
  const reportPath = path.resolve(process.cwd(), 'audit-report.txt');
  console.log(content);
  fs.writeFileSync(reportPath, content);
  console.log(`Relatório salvo em: ${reportPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main();
