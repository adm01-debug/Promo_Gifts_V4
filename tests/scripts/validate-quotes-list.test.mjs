/**
 * Testes para scripts/validate-quotes-list.mjs
 *
 * Cobre dois bugs reais encontrados em auditoria adversarial do script:
 *
 * 1) Falso-positivo no passo "Type-check (tsgo)": o comando real é
 *    `npx tsgo --noEmit 2>&1 | grep -E "QuotesConfigurableList|..." || true`.
 *    No ambiente deste repo, `tsgo` NÃO é dependência de ninguém (não está em
 *    package.json/node_modules) — `npx` tenta resolvê-lo no registro do npm e
 *    falha ("npm error 404 ... 'tsgo@*' is not in this registry"). Essa saída
 *    de erro do npm nunca bate no grep de nomes de arquivo, e o `|| true`
 *    garante que o pipeline sempre "sai limpo" — então o passo reporta
 *    ✅ pass com `{ errors: 0 }` mesmo o type-check nunca tendo rodado.
 *    Reproduzido batendo um `npx` fake que imita exatamente esse erro real
 *    (capturado rodando `npx tsgo` de verdade neste ambiente). Corrigido
 *    detectando a assinatura `^npm error` na saída e falhando o passo com
 *    uma mensagem explícita, em vez de silenciar como "0 erros".
 *
 * 2) Crash não tratado ao salvar o relatório: `fs.writeFileSync(REPORT_PATH, ...)`
 *    rodava fora de qualquer try/catch. Se a escrita falhar (TMPDIR inválido,
 *    sem permissão, disco cheio), o processo morre com stack trace cru do
 *    Node (`Error: ENOENT ... at Object.writeFileSync`) — perdendo o resumo
 *    final (✅/❌) mesmo com os 3 passos já tendo rodado e seus resultados já
 *    conhecidos. Corrigido envolvendo a escrita em try/catch: em falha, avisa
 *    no stdout e ainda assim imprime o resultado final com o exit code certo.
 *
 * Os dois arquivos-fonte que o script lê (`QuotesConfigurableList.tsx` e
 * `QuoteListCellRenderer.tsx`) são sintéticos no sandbox — só precisam
 * satisfazer os invariantes estáticos do passo 1, que não é o alvo destes
 * testes. O `npx` real (lento, baixa o pacote de verdade) é substituído por
 * um fake no PATH, no mesmo padrão usado em
 * `tests/scripts/mutation-test-magazine.test.mjs`.
 */
import { test, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REAL_SCRIPT = join(ROOT, 'scripts/validate-quotes-list.mjs');

const sandboxes = [];
afterEach(() => {
  while (sandboxes.length) {
    const dir = sandboxes.pop();
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  }
});

function makeSandbox(prefix) {
  const sandbox = mkdtempSync(join(tmpdir(), prefix));
  sandboxes.push(sandbox);
  return sandbox;
}

// Conteúdo mínimo que satisfaz todos os invariantes estáticos do passo 1
// (ordem/alinhamento das colunas, testids, aria-labels) — ver `must(...)` em
// scripts/validate-quotes-list.mjs.
const LIST_TSX = `const ALL_COLUMNS = [
  { id: 'client', label: 'Cliente' },
  { id: 'contact', label: 'Contato' },
  { id: 'date', label: 'Data' },
  { id: 'delivery', label: 'Entrega' },
  { id: 'items', label: 'Itens', align: 'center' },
  { id: 'value', label: 'Valor' },
  { id: 'status', label: 'Status' },
  { id: 'expiration', label: 'Validade', align: 'center' },
  { id: 'quote_number', label: 'Número' },
];

function Header({ col }) {
  return (
    <th
      data-testid={\`quotes-col-header-\${col.id}\`}
      role="columnheader"
      aria-label={\`Coluna \${col.label}\`}
      className={col.id === 'items' && 'pr-4'}
    />
  );
}

function Cell({ col }) {
  return <td data-testid={\`quotes-col-cell-\${col.id}\`} role="cell" />;
}

function Row({ quoteId }) {
  return <tr data-testid={quoteId ? \`quote-row-\${quoteId}\` : 'quote-row-new'} />;
}
`;

const CELL_TSX = `function renderCell(col, data, label) {
  switch (col.id) {
    case 'value': {
      return <span className="font-medium">{data.value}</span>;
    }
    case 'quote_number': {
      return <span className="text-left pl-8">{data.quote_number}</span>;
    }
    case 'delivery': {
      return <span className="pl-4">{data.delivery}</span>;
    }
    case 'expiration': {
      return (
        <span
          data-testid="quote-expiration-cell"
          aria-label={\`\${label}. Válido até \${data.expiration}\`}
        >
          {data.expiration}
        </span>
      );
    }
    default:
      return null;
  }
}
`;

function setupSandboxRepo(sandbox) {
  const dir = join(sandbox, 'src/components/quotes');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'QuotesConfigurableList.tsx'), LIST_TSX);
  writeFileSync(join(dir, 'QuoteListCellRenderer.tsx'), CELL_TSX);
}

// O script roda os binários LOCAIS (node_modules/.bin/tsc e node_modules/.bin/vitest), nunca
// `npx` — o antigo `npx tsgo` resolvia um pacote inexistente no registro e o passo "passava" sem
// rodar nada. Os fakes abaixo substituem esses binários dentro do sandbox.
const FAKE_VITEST_OK = `#!/usr/bin/env bash
echo " Test Files  1 passed (1)"
echo "      Tests  3 passed (3)"
exit 0
`;
const FAKE_TSC_CLEAN = `#!/usr/bin/env bash
exit 0
`;
const FAKE_TSC_TARGET_ERROR = `#!/usr/bin/env bash
echo "src/components/quotes/QuotesConfigurableList.tsx(42,10): error TS2322: Type mismatch"
exit 2
`;
// Erro só num arquivo importado pela lista (não é alvo): o passo não deve reprovar a lista.
const FAKE_TSC_IMPORTED_ONLY_ERROR = `#!/usr/bin/env bash
echo "src/lib/other/helper.ts(7,3): error TS2345: Argument of type 'x' is not assignable"
exit 2
`;
// tsc morto por sinal (ex.: OOM do V8): nunca pode virar "0 erros".
const FAKE_TSC_KILLED = `#!/usr/bin/env bash
kill -9 $$
`;

function writeBin(sandbox, name, script) {
  const bin = join(sandbox, 'node_modules', '.bin');
  mkdirSync(bin, { recursive: true });
  const p = join(bin, name);
  writeFileSync(p, script);
  chmodSync(p, 0o755);
}

function runScript({ tsc = FAKE_TSC_CLEAN, vitest = FAKE_VITEST_OK, env } = {}) {
  const sandbox = makeSandbox('validate-quotes-list-');
  setupSandboxRepo(sandbox);
  const reportDir = join(sandbox, 'report-out');
  mkdirSync(reportDir, { recursive: true });
  if (tsc) writeBin(sandbox, 'tsc', tsc);
  if (vitest) writeBin(sandbox, 'vitest', vitest);

  const res = spawnSync('node', [REAL_SCRIPT], {
    cwd: sandbox,
    encoding: 'utf8',
    env: { ...process.env, TMPDIR: reportDir, ...env },
  });
  return { ...res, sandbox, reportDir };
}

function readReport(reportDir) {
  // O script cria um subdiretório exclusivo via mkdtempSync (nome com
  // sufixo aleatório) dentro de TMPDIR, em vez de escrever direto em
  // <reportDir>/quotes-list-validation-report.json (CodeQL: insecure
  // temporary file) — localiza esse subdiretório antes de ler.
  const sub = readdirSync(reportDir).find((d) => d.startsWith('quotes-list-'));
  if (!sub) throw new Error(`relatório não encontrado em ${reportDir}`);
  return JSON.parse(readFileSync(join(reportDir, sub, 'validation-report.json'), 'utf8'));
}

const TS_STEP = 'Type-check (tsc, apenas o grafo de imports da lista)';
const tsStepOf = (report) => report.steps.find((s) => s.name === TS_STEP);

test('BUG 1 — tsc ausente (não executou) não é reportado como "pass (0 erros)"', () => {
  const res = runScript({ tsc: null });

  expect(res.status).toBe(1);
  expect(res.stdout).toContain(`❌ ${TS_STEP}`);
  expect(res.stdout).toMatch(/tsc não executou/i);
  const report = readReport(res.reportDir);
  expect(tsStepOf(report).status).toBe('fail');
  expect(report.ok).toBe(false);
});

test('não regride o caminho feliz: tsc limpo continua passando', () => {
  const res = runScript();

  expect(res.status).toBe(0);
  expect(res.stdout).toContain(`✅ ${TS_STEP}`);
  const report = readReport(res.reportDir);
  expect(tsStepOf(report).status).toBe('pass');
  expect(report.ok).toBe(true);
});

test('não regride a detecção de erro real de TS nos arquivos-alvo (falha, com o erro real na mensagem)', () => {
  const res = runScript({ tsc: FAKE_TSC_TARGET_ERROR });

  expect(res.status).toBe(1);
  expect(res.stdout).toContain(`❌ ${TS_STEP}`);
  expect(res.stdout).toMatch(/TS2322/);
  const report = readReport(res.reportDir);
  expect(tsStepOf(report).status).toBe('fail');
  expect(tsStepOf(report).error).toMatch(/TS2322/);
});

test('erro de TS só em arquivo importado (não-alvo) não reprova a lista, mas é contabilizado', () => {
  const res = runScript({ tsc: FAKE_TSC_IMPORTED_ONLY_ERROR });

  expect(res.status).toBe(0);
  const step = tsStepOf(readReport(res.reportDir));
  expect(step.status).toBe('pass');
  expect(step.detail.errorsInImportedFiles).toBe(1);
});

test('tsc morto por sinal (OOM) falha fechado em vez de virar "0 erros"', () => {
  const res = runScript({ tsc: FAKE_TSC_KILLED });

  expect(res.status).toBe(1);
  const step = tsStepOf(readReport(res.reportDir));
  expect(step.status).toBe('fail');
  expect(step.error).toMatch(/interrompido|possível OOM/);
});

test('vitest ausente falha fechado (sem fallback para npx/registro)', () => {
  const res = runScript({ vitest: null });

  expect(res.status).toBe(1);
  expect(res.stdout).toMatch(/vitest não executou/);
  expect(readReport(res.reportDir).ok).toBe(false);
});

test('BUG 2 — TMPDIR inválido não derruba o processo nem o type-check; só o relatório deixa de ser salvo', () => {
  const res = runScript({ env: { TMPDIR: '/este/diretorio/nao/existe/de/verdade' } });

  // Sem a correção: crash `Error: ENOENT ... at Object.writeFileSync` e, depois, o tsconfig
  // temporário do type-check também ia para TMPDIR e reprovava a lista sem motivo.
  expect(res.stderr).not.toMatch(/at Object\.writeFileSync/);
  expect(res.stdout).toMatch(/Não foi possível salvar o relatório/);
  expect(res.stdout).toContain(`✅ ${TS_STEP}`);
  expect(res.stdout).toMatch(/Resultado: ✅ TUDO OK/);
  expect(res.status).toBe(0);
});

test('o tsconfig temporário do type-check é removido ao final', () => {
  const res = runScript();

  expect(res.status).toBe(0);
  const cache = join(res.sandbox, 'node_modules', '.cache');
  const leftovers = existsSync(cache) ? readdirSync(cache).filter((d) => d.startsWith('quotes-list-tsc-')) : [];
  expect(leftovers).toEqual([]);
});
