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

/** Cria um `npx` fake executável num diretório próprio e retorna o diretório. */
function makeFakeNpx(sandbox, script) {
  const bin = join(sandbox, 'fakebin');
  mkdirSync(bin, { recursive: true });
  const npxPath = join(bin, 'npx');
  writeFileSync(npxPath, script);
  chmodSync(npxPath, 0o755);
  return bin;
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

// Reproduz byte a byte a saída real observada ao rodar `npx tsgo --noEmit`
// neste repo: `tsgo` não é dependência de ninguém, então `npx` tenta buscá-lo
// no registro do npm e recebe 404.
const FAKE_NPX_TSGO_UNRESOLVED = `#!/usr/bin/env bash
if [ "$1" = "tsgo" ]; then
  cat <<'EOF'
npm error code E404
npm error 404 Not Found - GET https://registry.npmjs.org/tsgo - Not found
npm error 404
npm error 404  'tsgo@*' is not in this registry.
npm error 404
npm error 404 Note that you can also install from a
npm error 404 tarball, folder, http url, or git url.
npm error A complete log of this run can be found in: /root/.npm/_logs/fake-debug.log
EOF
  exit 1
fi
echo "Tests 1 passed (1)"
exit 0
`;

const FAKE_NPX_TSGO_CLEAN = `#!/usr/bin/env bash
if [ "$1" = "tsgo" ]; then
  exit 0
fi
echo "Tests 1 passed (1)"
exit 0
`;

const FAKE_NPX_TSGO_REAL_ERROR = `#!/usr/bin/env bash
if [ "$1" = "tsgo" ]; then
  echo "src/components/quotes/QuotesConfigurableList.tsx(42,10): error TS2322: Type mismatch"
  exit 1
fi
echo "Tests 1 passed (1)"
exit 0
`;

function runScript({ fakeNpxScript, env } = {}) {
  const sandbox = makeSandbox('validate-quotes-list-');
  setupSandboxRepo(sandbox);
  const reportDir = join(sandbox, 'report-out');
  mkdirSync(reportDir, { recursive: true });
  const bin = fakeNpxScript ? makeFakeNpx(sandbox, fakeNpxScript) : null;

  const res = spawnSync('node', [REAL_SCRIPT], {
    cwd: sandbox,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...(bin ? { PATH: `${bin}:${process.env.PATH}` } : {}),
      TMPDIR: reportDir,
      ...env,
    },
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

test('BUG 1 — tsgo não resolvido pelo npx (erro 404 real) não deve ser reportado como "pass (0 erros)"', () => {
  const res = runScript({ fakeNpxScript: FAKE_NPX_TSGO_UNRESOLVED });

  // Sem a correção, isto dava exit 0 e "✅ TUDO OK" mesmo sem o tsgo ter
  // rodado de verdade — o falso-positivo que este teste prova que não existe
  // mais.
  expect(res.status).toBe(1);
  expect(res.stdout).toMatch(/❌ Type-check \(tsgo\)/);
  expect(res.stdout).not.toMatch(/✅ Type-check \(tsgo\)/);
  expect(res.stdout).toMatch(/tsgo não executou/i);

  const report = readReport(res.reportDir);
  const tsStep = report.steps.find((s) => s.name === 'Type-check (tsgo)');
  expect(tsStep.status).toBe('fail');
  expect(tsStep.error).toMatch(/npm error/);
  expect(report.ok).toBe(false);
});

test('não regride o caminho feliz: tsgo roda limpo (sem erros reais) continua passando', () => {
  const res = runScript({ fakeNpxScript: FAKE_NPX_TSGO_CLEAN });

  expect(res.status).toBe(0);
  expect(res.stdout).toMatch(/✅ Type-check \(tsgo\)/);
  const report = readReport(res.reportDir);
  expect(report.steps.find((s) => s.name === 'Type-check (tsgo)').status).toBe('pass');
  expect(report.ok).toBe(true);
});

test('não regride a detecção de erro real de TS nos arquivos-alvo (continua falhando, com o erro real na mensagem)', () => {
  const res = runScript({ fakeNpxScript: FAKE_NPX_TSGO_REAL_ERROR });

  expect(res.status).toBe(1);
  expect(res.stdout).toMatch(/❌ Type-check \(tsgo\)/);
  expect(res.stdout).toMatch(/TS2322/);
  expect(res.stdout).not.toMatch(/tsgo não executou/i);

  const report = readReport(res.reportDir);
  const tsStep = report.steps.find((s) => s.name === 'Type-check (tsgo)');
  expect(tsStep.status).toBe('fail');
  expect(tsStep.error).toMatch(/TS2322/);
});

test('BUG 2 — falha ao salvar o relatório (TMPDIR inválido) não deve derrubar o processo com stack trace cru', () => {
  const res = runScript({
    fakeNpxScript: FAKE_NPX_TSGO_CLEAN,
    env: { TMPDIR: '/este/diretorio/nao/existe/de/verdade' },
  });

  // Sem a correção, isto era um crash: `Error: ENOENT ... at Object.writeFileSync`
  // no stderr, sem a linha final "Resultado: ...".
  expect(res.stderr).not.toMatch(/at Object\.writeFileSync/);
  expect(res.stdout).toMatch(/Não foi possível salvar o relatório/);
  // Os 3 passos de fato rodaram e passaram — o resumo final precisa refletir
  // isso corretamente mesmo sem conseguir persistir o JSON.
  expect(res.stdout).toMatch(/Resultado: ✅ TUDO OK/);
  expect(res.status).toBe(0);
});
