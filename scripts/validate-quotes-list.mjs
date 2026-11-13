#!/usr/bin/env node
/**
 * Validação automatizada da lista de Orçamentos (QuotesConfigurableList).
 *
 * Roda em ordem:
 *   1. Invariantes estáticas de layout (ordem, alinhamento, testids, aria-label)
 *   2. Type-check TypeScript (tsc -p tsconfig.app.json; falha se o tsc não conseguir checar)
 *   3. Vitest — suite de expiração e suites correlatas
 *
 * Saída: relatório JSON em diretório temporário exclusivo (mkdtemp) + resumo no stdout.
 * Exit code: 0 quando tudo passa, 1 em qualquer falha.
 *
 * Uso: node scripts/validate-quotes-list.mjs
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { classifyTscRun } from './lib/tsc-run.mjs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// mkdtempSync cria um diretório exclusivo (nome com sufixo aleatório, 0700) em
// vez de um path fixo e previsível em /tmp compartilhado entre todos os
// usuários/processos — evita symlink attack / TOCTOU em diretório temp
// multiusuário (CodeQL: insecure temporary file, CWE-377). Se o próprio
// TMPDIR for inválido/sem permissão, mkdtempSync falha aqui — REPORT_PATH
// fica null e o bloco de salvamento abaixo trata isso sem crash.
let REPORT_PATH = null;
try {
  REPORT_PATH = join(fs.mkdtempSync(join(tmpdir(), 'quotes-list-')), 'validation-report.json');
} catch {
  // tratado no bloco de salvamento do relatório
}
const report = { startedAt: new Date().toISOString(), steps: [] };

function step(name, fn) {
  const t0 = Date.now();
  try {
    const detail = fn();
    const entry = { name, status: 'pass', ms: Date.now() - t0, detail };
    report.steps.push(entry);
    console.log(`✅ ${name}  (${entry.ms}ms)`);
    return true;
  } catch (err) {
    const entry = { name, status: 'fail', ms: Date.now() - t0, error: String(err.message ?? err) };
    report.steps.push(entry);
    console.log(`❌ ${name}\n   ${entry.error.split('\n').slice(0, 8).join('\n   ')}`);
    return false;
  }
}

// ─── 1. Invariantes estáticas ────────────────────────────────────────────────
const staticOk = step('Invariantes estáticas de layout', () => {
  const list = fs.readFileSync('src/components/quotes/QuotesConfigurableList.tsx', 'utf8');
  const cell = fs.readFileSync('src/components/quotes/QuoteListCellRenderer.tsx', 'utf8');

  const assertions = [];
  const must = (label, cond, detail = '') => {
    assertions.push({ label, pass: !!cond, detail });
    if (!cond) throw new Error(`${label} — ${detail}`);
  };

  const orderMatch = list.match(/ALL_COLUMNS[^=]*=\s*\[([\s\S]*?)\];/);
  if (!orderMatch) throw new Error('ALL_COLUMNS não encontrado');
  const ids = [...orderMatch[1].matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
  const EXPECTED = [
    'client', 'contact', 'date', 'delivery', 'items',
    'value', 'status', 'expiration', 'quote_number',
  ];
  must('Ordem canônica das colunas', JSON.stringify(ids) === JSON.stringify(EXPECTED), `got=${ids.join(',')}`);

  const aligns = [...orderMatch[1].matchAll(/id:\s*'([^']+)'[^}]*align:\s*'([^']+)'/g)].map((m) => [m[1], m[2]]);
  must('Nenhuma coluna align:right', !aligns.some(([, a]) => a === 'right'));
  must("items + expiration centralizados",
    aligns.filter(([, a]) => a === 'center').map(([id]) => id).sort().join(',') === 'expiration,items');

  must("Header items com pr-4", /col\.id === 'items' && 'pr-4'/.test(list));
  must('Header com data-testid + role + aria-label',
    /data-testid=\{`quotes-col-header-\$\{col\.id\}`\}/.test(list) &&
    /role="columnheader"/.test(list) &&
    /aria-label=\{`Coluna \$\{col\.label\}`\}/.test(list));
  must('Cell com data-testid + role + aria-label',
    /data-testid=\{`quotes-col-cell-\$\{col\.id\}`\}/.test(list) &&
    /role="cell"/.test(list));
  must('Row testid', /data-testid=\{quoteId \? `quote-row-\$\{quoteId\}`/.test(list));

  const valueCase = cell.match(/case 'value':[\s\S]{0,200}?<span[^>]*className="([^"]+)"/);
  must("'value' renderer SEM text-right", valueCase && !/text-right/.test(valueCase[1]));

  const qnCase = cell.match(/case 'quote_number':[\s\S]{0,200}?<span[^>]*className="([^"]+)"/);
  must("'quote_number' renderer text-left + pl-8",
    qnCase && /text-left/.test(qnCase[1]) && /pl-8/.test(qnCase[1]));

  const delCase = cell.match(/case 'delivery':[\s\S]{0,400}?<span[^>]*className="([^"]+)"/);
  must("'delivery' renderer com pl-4", delCase && /pl-4/.test(delCase[1]));

  must("'expiration' renderer testid + aria",
    /data-testid="quote-expiration-cell"/.test(cell) &&
    /aria-label=\{`\$\{label\}\. Válido até /.test(cell));

  return { invariants: assertions.length, all: 'pass' };
});

// ─── 2. Type-check ──────────────────────────────────────────────────────────
// Antes: `npx tsgo … | grep … || true` — tsgo nem está nas dependências, então o comando
// falhava, o grep não achava nada e o passo passava SEMPRE. Agora roda o tsc do projeto e só
// aceita o resultado se o tsc realmente checou (classifyTscRun).
const TYPECHECK_FILES = [
  'src/components/quotes/QuotesConfigurableList.tsx',
  'src/components/quotes/QuoteListCellRenderer.tsx',
  'src/lib/quotes/expiration',
];

/** Diagnósticos cujo ARQUIVO (início da linha) é um dos alvos — não a mensagem que o cita. */
function filterTargetDiagnostics(output, targets = TYPECHECK_FILES) {
  return String(output)
    .split('\n')
    .filter((line) => targets.some((t) => line.startsWith(`${t}.`) || line.startsWith(`${t}(`)))
    .filter((line) => /error TS\d+:/.test(line));
}

const tsOk = step('Type-check (tsc, apenas o grafo de imports da lista)', () => {
  // tsconfig temporário que herda o do app mas só inclui os alvos (+ .d.ts globais): o tsc segue
  // os imports, então erros de tipo reais nesses arquivos aparecem; leva segundos (projeto
  // inteiro passa de 9 min e estoura 4 GB de heap).
  const root = process.cwd();
  // tsconfig temporário dentro de node_modules/.cache (existe sempre que o tsc local existe):
  // não depende de TMPDIR — TMPDIR inválido não pode virar falso "falha de type-check".
  const cacheDir = join(root, 'node_modules', '.cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const dir = fs.mkdtempSync(join(cacheDir, 'quotes-list-tsc-'));
  const cfg = join(dir, 'tsconfig.json');
  fs.writeFileSync(
    cfg,
    JSON.stringify({
      extends: join(root, 'tsconfig.app.json'),
      compilerOptions: { noEmit: true, incremental: false },
      include: [
        join(root, 'src/**/*.d.ts'),
        ...TYPECHECK_FILES.map((f) => join(root, f.endsWith('.tsx') ? f : `${f}.ts`)),
      ],
    }),
  );
  try {
    const run = spawnSync(join(root, 'node_modules/.bin/tsc'), ['-p', cfg], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
      env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS ?? '--max-old-space-size=4096' },
    });
    const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
    const verdict = classifyTscRun({ status: run.status, signal: run.signal, error: run.error, output });
    if (!verdict.ok) throw new Error(verdict.reason);
    const own = filterTargetDiagnostics(output);
    if (own.length) throw new Error(own.join('\n'));
    return { errors: 0, errorsInImportedFiles: verdict.count };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ─── 3. Vitest — expiração ──────────────────────────────────────────────────
const vitestOk = step('Vitest · src/lib/quotes/__tests__/expiration.test.ts', () => {
  // Binário local (nunca `npx`): sem ele instalado, npx buscaria o pacote no registro — foi
  // assim que o antigo `npx tsgo` "passava" sem rodar nada.
  const run = spawnSync(
    join(process.cwd(), 'node_modules/.bin/vitest'),
    ['run', 'src/lib/quotes/__tests__/expiration.test.ts', '--reporter=dot'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  if (run.error) throw new Error(`vitest não executou: ${run.error.message}`);
  // Remove códigos ANSI de cor antes de fazer match.
  const ansi = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, 'g');
  const out = `${run.stdout ?? ''}${run.stderr ?? ''}`.replace(ansi, '');
  if (run.status !== 0) throw new Error(out.split('\n').slice(-15).join('\n') || `vitest saiu com código ${run.status}`);
  const m = out.match(/Tests\s+(\d+)\s+passed/);
  const failed = /\bfailed\b/i.test(out) && !/0\s+failed/i.test(out);
  if (!m || failed) throw new Error(out.split('\n').slice(-15).join('\n'));
  return { passed: Number(m[1]) };
});

// ─── Relatório ───────────────────────────────────────────────────────────────
report.finishedAt = new Date().toISOString();
report.ok = staticOk && tsOk && vitestOk;
console.log('\n────────────────────────────────────────');
try {
  if (!REPORT_PATH) throw new Error('diretório temporário não pôde ser criado (TMPDIR inválido?)');
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`Relatório salvo em ${REPORT_PATH}`);
} catch (err) {
  // Falha ao criar o diretório temp ou gravar o relatório (ex.: TMPDIR
  // inválido/sem permissão) não deve derrubar o processo com stack trace cru
  // — os 3 passos já rodaram e seus resultados já são conhecidos; apenas
  // avisamos que o JSON não foi salvo.
  const where = REPORT_PATH ? ` em ${REPORT_PATH}` : '';
  console.log(`⚠️  Não foi possível salvar o relatório${where}: ${err.message ?? err}`);
}
console.log(`Resultado: ${report.ok ? '✅ TUDO OK' : '❌ FALHAS'}`);
process.exit(report.ok ? 0 : 1);
