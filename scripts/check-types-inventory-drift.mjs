#!/usr/bin/env node
/**
 * check-types-inventory-drift.mjs
 * ------------------------------------------------------------------------
 * PLANO_DBA E41 — gate estrutural para `src/integrations/supabase/types.ts`.
 * Substitui o proxy antigo da REGRA #4 do CLAUDE.md (`grep -c "export type"
 * types.ts`), que só conta os 7 aliases de topo do arquivo e não vê nada do
 * que muda dentro do union `Database['public']['Tables']` (nem `Views`,
 * `Functions`, `Enums`). Ver `scripts/extract-types-inventory.mjs` para o
 * parser (TypeScript Compiler API) que produz o inventário estrutural que
 * este gate compara.
 *
 * Duas checagens independentes, cada uma opt-out:
 *
 *   (a) Diff local: inventário do `types.ts` atual (working tree) vs. o
 *       mesmo arquivo em um commit-base (`git show <base>:<path>`,
 *       default `HEAD~1`). Qualquer Table/View/Function/Enum que exista
 *       na base e não exista mais no atual é uma REMOÇÃO. Uma remoção só
 *       passa se estiver listada em `docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json`
 *       — a marcação exigida pela REGRA #3 do CLAUDE.md ("código de
 *       segurança é imutável… nunca classifique como dead code sem
 *       verificar"), só que aplicada a schema em vez de código-fonte.
 *       Sem entrada na allowlist = falha. Isso é deliberado: um comentário
 *       solto de PR ou uma mensagem de commit não são estruturados o
 *       bastante para um gate confiar (texto livre é fácil de esquecer,
 *       reformular ou squashar fora do histórico); um arquivo JSON versionado,
 *       editado na MESMA revisão que remove o objeto, é.
 *
 *       Ausência de base é erro de ferramental (exit 2, ok:false), nunca
 *       sucesso. Em CI use --base <sha-da-base-do-PR> e fetch-depth: 0.
 *       Também detecta membros removidos de objetos que permaneceram.
 *       Exceções de membros exigem `member: ["Row", "nome_da_coluna"]`;
 *       uma exceção para a tabela inteira não autoriza perdas de colunas.
 *       Adições e alterações de assinatura são informadas no diff local;
 *       não são proibidas, pois evolução do contrato pode ser intencional.
 *
 *   (b) Diff ao vivo (opt-in via `--live`): compara `Tables`/`Views`/`Enums`
 *       do `public` no `types.ts` atual contra `pg_catalog` via conexão
 *       Postgres direta (`DATABASE_URL`, mesma convenção de
 *       `scripts/gen-internal-schema.mjs`). Falha se uma tabela/view/enum
 *       VIVA no banco não aparecer em `types.ts` (isso é sempre um bug —
 *       types.ts desatualizado — nunca uma remoção intencional, então não
 *       passa por allowlist). `Functions` é deliberadamente EXCLUÍDO do
 *       diff ao vivo: `types.ts` só expõe funções que o PostgREST decide
 *       expor (schema exposto, permissões, tipos mapáveis) — a maioria das
 *       ~1320 funções de `pg_proc` nunca aparece em `types.ts` por design,
 *       então comparar 1:1 produziria ruído constante, não sinal.
 *       Sem --live, nenhuma conexão é feita, mesmo havendo DATABASE_URL.
 *       Com --live, qualquer indisponibilidade é exit 2 e ok:false.
 *
 *   (c) --generated <arquivo>: compara tipos gerados temporariamente com o
 *       arquivo controlado em ambas as direções. Objetos, colunas, Args,
 *       Returns, enums e relacionamentos divergentes falham (exit 1), sem
 *       aplicar allowlist histórica. O chamador deve registrar proveniência
 *       (projeto, CLI, schemas, horário e hash); um arquivo arbitrário não
 *       constitui evidência viva. Este script não executa o gerador nem DDL.
 *
 * Uso:
 *   node scripts/check-types-inventory-drift.mjs
 *   node scripts/check-types-inventory-drift.mjs --base origin/main
 *   node scripts/check-types-inventory-drift.mjs --path src/integrations/supabase/types.ts
 *   node scripts/check-types-inventory-drift.mjs --live
 *   node scripts/check-types-inventory-drift.mjs --json
 *   node scripts/check-types-inventory-drift.mjs --base HEAD --generated /tmp/types-live.ts --json
 *
 * Exit codes: 0 = sem drift não justificado; 1 = drift não justificado
 * encontrado; 2 = erro de ferramental (parsing, git, conexão pedida
 * explicitamente e indisponível).
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import {
  CATEGORY_KEYS,
  DEFAULT_TYPES_PATH,
  ROOT,
  extractTypesInventory,
  extractTypesInventoryFromFile,
  extractTypesContracts,
} from './extract-types-inventory.mjs';

export const DEFAULT_BASE_REF = 'HEAD~1';
export const DEFAULT_ALLOWLIST_PATH = resolve(ROOT, 'docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json');
/** Categorias comparadas no diff (b) ao vivo. `Functions` fica de fora — ver header. */
const LIVE_COMPARABLE_CATEGORIES = ['Tables', 'Views', 'Enums'];

// ─── (a) diff local: working tree vs. commit-base ──────────────────────────

/**
 * Lê `types.ts` em um ref git específico. Devolve `{ ok: true, text }` ou
 * `{ ok: false, reason }` quando o ref/arquivo não existe nesse ponto da
 * história (não é tratado como erro fatal pelo chamador — ver header).
 */
export function readFileAtGitRef(ref, filePath, { root = ROOT } = {}) {
  const relativePath = filePath.startsWith(root) ? filePath.slice(root.length + 1) : filePath;
  try {
    const text = execFileSync('git', ['show', `${ref}:${relativePath}`], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
    return { ok: true, text };
  } catch (error) {
    const stderr = error && typeof error.stderr === 'string' ? error.stderr : String(error.stderr ?? '');
    return { ok: false, reason: stderr.trim() || error.message };
  }
}

/**
 * Compara dois inventários e devolve as diferenças por objeto individual
 * (`schema` + `category` + `name`), não só contagens — uma remoção e uma
 * adição no mesmo schema/categoria não se cancelam.
 */
export function diffInventories(baseInventory, currentInventory) {
  const schemas = new Set([...Object.keys(baseInventory), ...Object.keys(currentInventory)]);
  const removed = [];
  const added = [];

  for (const schema of [...schemas].sort((a, b) => a.localeCompare(b, 'en'))) {
    const baseSchema = baseInventory[schema] ?? {};
    const currentSchema = currentInventory[schema] ?? {};
    for (const category of CATEGORY_KEYS) {
      const baseNames = new Set(baseSchema[category] ?? []);
      const currentNames = new Set(currentSchema[category] ?? []);
      for (const name of baseNames) {
        if (!currentNames.has(name)) removed.push({ schema, category, name });
      }
      for (const name of currentNames) {
        if (!baseNames.has(name)) added.push({ schema, category, name });
      }
    }
  }

  return { removed, added };
}

// ─── allowlist de remoção justificada ───────────────────────────────────────

function normalizeAllowlistEntry(entry, index) {
  const { schema, category, name, reason, approvedBy, date } = entry ?? {};
  const missing = ['schema', 'category', 'name', 'reason', 'approvedBy', 'date'].filter(
    (key) => !entry?.[key],
  );
  if (missing.length > 0) {
    throw new Error(
      `Entrada #${index} da allowlist está incompleta (faltam: ${missing.join(', ')}). ` +
        'Cada entrada precisa de schema, category, name, reason, approvedBy e date.',
    );
  }
  if (!CATEGORY_KEYS.includes(category)) {
    throw new Error(
      `Entrada #${index} da allowlist tem category "${category}" inválida. Use uma de: ${CATEGORY_KEYS.join(', ')}.`,
    );
  }
  if (entry.member !== undefined && (!Array.isArray(entry.member) || !entry.member.every((part) => typeof part === 'string'))) {
    throw new Error(`Entrada #${index}: member deve ser um array de nomes de propriedades.`);
  }
  return { schema, category, name, reason, approvedBy, date, ...(entry.member === undefined ? {} : { member: entry.member }) };
}

/**
 * Carrega a allowlist de remoções justificadas. Arquivo ausente é
 * equivalente a uma allowlist vazia (nenhuma remoção pré-aprovada) — não é
 * erro, porque o caso comum é nunca ter tido uma remoção ainda.
 */
export function loadRemovalAllowlist(path = DEFAULT_ALLOWLIST_PATH) {
  if (!existsSync(path)) return [];
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const entries = Array.isArray(raw) ? raw : raw.entries;
  if (!Array.isArray(entries)) {
    throw new Error(`${path} deve ser um array ou um objeto com a chave "entries" (array).`);
  }
  return entries.map(normalizeAllowlistEntry);
}

function allowlistKey({ schema, category, name, member }) {
  return JSON.stringify([schema, category, name, member ?? null]);
}

/** Diff bidirecional de campos/assinaturas, independente da quantidade de objetos. */
export function diffContracts(base, current) {
  const before = new Map(base.map((entry) => [allowlistKey(entry), entry]));
  const after = new Map(current.map((entry) => [allowlistKey(entry), entry]));
  const removed = [], added = [], changed = [];
  for (const [key, entry] of before) {
    const next = after.get(key);
    if (!next) removed.push(entry);
    else if (entry.signature !== next.signature) changed.push({ ...next, previousSignature: entry.signature });
  }
  for (const [key, entry] of after) if (!before.has(key)) added.push(entry);
  return { removed, added, changed };
}

/** Separa remoções cobertas pela allowlist das que exigem falha do gate. */
export function auditRemovals(removed, allowlistEntries) {
  const allowed = new Map(allowlistEntries.map((entry) => [allowlistKey(entry), entry]));
  const justified = [];
  const unjustified = [];
  for (const removal of removed) {
    const match = allowed.get(allowlistKey(removal));
    if (match) justified.push({ ...removal, justification: match });
    else unjustified.push(removal);
  }
  return { justified, unjustified };
}

// ─── (b) diff ao vivo: types.ts vs. pg_catalog ─────────────────────────────

const LIVE_QUERY = `
  select 'Tables' as category, c.relname as name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p')
  union all
  select 'Views' as category, c.relname as name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('v', 'm')
  union all
  select 'Enums' as category, t.typname as name
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
   where n.nspname = 'public' and t.typtype = 'e'
`;

/**
 * Consulta `pg_catalog`/`pg_type` diretamente (nunca PostgREST — REGRA #8
 * corolário do CLAUDE.md) via `pg`. Devolve `{ ok: true, rows }` em sucesso;
 * `{ ok: false, skipped: true, reason }` quando a checagem deve ser pulada
 * (sem `DATABASE_URL`, sem a devDependency `pg` instalada, e `--live` não
 * foi pedido explicitamente pelo chamador — nesse caso o chamador decide se
 * isso é fatal).
 */
export async function queryLiveInventory({ databaseUrl = process.env.DATABASE_URL } = {}) {
  if (!databaseUrl) {
    return { ok: false, skipped: true, reason: 'DATABASE_URL não definida.' };
  }
  let pgModule;
  try {
    // `pg` é uma devDependency OPCIONAL (mesma convenção de
    // scripts/gen-internal-schema.mjs) — não está em package.json. O
    // import roda dentro de `new Function(...)` (não um `import('pg')`
    // literal no código-fonte) de propósito: os testes importam este
    // arquivo sob Vitest/Vite, cujo transform SSR faz análise estática de
    // AST de qualquer `import(...)` que encontra no código — inclusive um
    // specifier montado em runtime — e falha aqui porque o pacote
    // genuinamente não existe em node_modules. Um `import()` dentro do
    // corpo (string) de `new Function` nunca aparece como nó de AST no
    // arquivo-fonte, então o analisador estático não o vê; só existe
    // quando este código roda de fato, e só então é resolvido pelo Node.
    const dynamicImport = new Function('specifier', 'return import(specifier)');
    pgModule = await dynamicImport('pg');
  } catch {
    return {
      ok: false,
      skipped: true,
      reason: 'devDependency opcional "pg" não instalada (npm i -D pg). Ver scripts/gen-internal-schema.mjs.',
    };
  }
  const Client = pgModule.default?.Client ?? pgModule.Client;
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const { rows } = await client.query(LIVE_QUERY);
    return { ok: true, rows };
  } finally {
    await client.end();
  }
}

/** Nomes vivos por categoria que não aparecem no schema `public` de `currentInventory`. */
export function diffLiveVsTypes(liveRows, currentInventory) {
  const currentPublic = currentInventory.public ?? {};
  const missing = [];
  for (const category of LIVE_COMPARABLE_CATEGORIES) {
    const currentNames = new Set(currentPublic[category] ?? []);
    for (const row of liveRows.filter((r) => r.category === category)) {
      if (!currentNames.has(row.name)) missing.push({ schema: 'public', category, name: row.name });
    }
  }
  return missing.sort(
    (a, b) => a.category.localeCompare(b.category, 'en') || a.name.localeCompare(b.name, 'en'),
  );
}

// ─── CLI ────────────────────────────────────────────────────────────────────

function parseCliArgs(argv) {
  let path = DEFAULT_TYPES_PATH;
  let base = DEFAULT_BASE_REF;
  let allowlistPath = DEFAULT_ALLOWLIST_PATH;
  let live = false;
  let json = false;
  let generatedPath;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--live') {
      live = true;
    } else if (arg === '--json') {
      json = true;
    } else if (arg === '--path') {
      path = resolve(argv[++i] ?? '');
    } else if (arg === '--base') {
      base = argv[++i];
    } else if (arg === '--allowlist') {
      allowlistPath = resolve(argv[++i] ?? '');
    } else if (arg === '--generated') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error('--generated exige um arquivo TypeScript.');
      generatedPath = resolve(value);
    } else {
      throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }
  if (!base) throw new Error('--base exige um ref git.');
  return { path, base, allowlistPath, live, json, generatedPath };
}

function formatObject({ schema, category, name, member }) {
  return `${schema}.${category}.${name}${member ? ` ${JSON.stringify(member)}` : ''}`;
}

export async function runCheck({
  path = DEFAULT_TYPES_PATH,
  base = DEFAULT_BASE_REF,
  allowlistPath = DEFAULT_ALLOWLIST_PATH,
  live = false,
  root = ROOT,
  generatedPath,
  queryLive = queryLiveInventory,
} = {}) {
  const report = { ok: true, localDiff: null, liveDiff: null };

  // (a) diff local contra o commit-base.
  const currentInventory = extractTypesInventoryFromFile(path);
  const currentContracts = extractTypesContracts(readFileSync(path, 'utf8'), path);
  const baseFile = readFileAtGitRef(base, path, { root });
  if (!baseFile.ok) {
    report.localDiff = { skipped: true, reason: baseFile.reason, base, toolingError: true };
    report.ok = false;
  } else {
    const baseInventory = extractTypesInventory(baseFile.text, `${base}:${path}`);
    const { removed, added } = diffInventories(baseInventory, currentInventory);
    const contracts = diffContracts(extractTypesContracts(baseFile.text, `${base}:${path}`), currentContracts);
    // Uma tabela removida é auditada como objeto inteiro. Quando ela permanece,
    // a remoção de coluna exige uma entrada específica, não uma exceção ampla.
    const objectKeys = new Set(removed.map(allowlistKey));
    const memberRemovals = contracts.removed.filter((entry) => !objectKeys.has(allowlistKey({ ...entry, member: undefined })))
      .map(({ signature: _signature, ...entry }) => entry);
    const allowlistEntries = loadRemovalAllowlist(allowlistPath);
    const { justified, unjustified } = auditRemovals([...removed, ...memberRemovals], allowlistEntries);
    report.localDiff = { skipped: false, base, added, justified, unjustified, contracts };
    if (unjustified.length > 0) report.ok = false;
  }

  // (b) diff ao vivo contra pg_catalog (opt-in).
  const live_ = live ? await queryLive() : { ok: false, reason: 'Não solicitado (use --live).' };
  if (live_.ok) {
    const missing = diffLiveVsTypes(live_.rows, currentInventory);
    report.liveDiff = { skipped: false, missing };
    if (missing.length > 0) report.ok = false;
  } else if (live) {
    // Pedido explicitamente e indisponível: isso é falha de ferramental, não
    // de dado — o chamador deve tratar como exit 2, não exit 1.
    report.liveDiff = { skipped: true, reason: live_.reason, toolingError: true };
    report.ok = false;
  } else {
    report.liveDiff = { skipped: true, reason: live_.reason, toolingError: false };
  }

  if (generatedPath) {
    const generatedSource = readFileSync(generatedPath, 'utf8');
    const objects = diffInventories(currentInventory, extractTypesInventory(generatedSource, generatedPath));
    const contracts = diffContracts(currentContracts, extractTypesContracts(generatedSource, generatedPath));
    report.generatedDiff = { source: generatedPath, objects, contracts };
    // Uma exceção de remoção histórica não comprova paridade com geração viva.
    if ([...objects.removed, ...objects.added, ...contracts.removed, ...contracts.added, ...contracts.changed].length > 0) report.ok = false;
  }
  return report;
}

function formatReport(report) {
  const lines = [];

  if (report.localDiff.skipped) {
    lines.push(`❌ diff local indisponível (base "${report.localDiff.base}"): ${report.localDiff.reason}`);
  } else {
    const { base, added, justified, unjustified } = report.localDiff;
    lines.push(`diff local: atual vs. "${base}"`);
    lines.push(`  + ${added.length} objeto(s) novo(s)`);
    lines.push(`  - ${justified.length + unjustified.length} objeto(s) removido(s) (${justified.length} justificado(s) na allowlist, ${unjustified.length} não)`);
    for (const entry of justified) {
      lines.push(`    ✓ ${formatObject(entry)} — allowlist: ${entry.justification.reason}`);
    }
    for (const entry of unjustified) {
      lines.push(`    ✗ ${formatObject(entry)} — SEM entrada em docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json`);
    }
    for (const entry of added) lines.push(`    + ${formatObject(entry)}`);
    for (const entry of report.localDiff.contracts.added) lines.push(`    + membro ${formatObject(entry)}`);
    for (const entry of report.localDiff.contracts.changed) lines.push(`    ~ assinatura ${formatObject(entry)} — revisar contrato`);
  }

  if (report.generatedDiff) {
    lines.push(`Geração temporária: ${report.generatedDiff.source} (base = arquivo controlado; atual = gerado)`);
    for (const [scope, diff] of Object.entries(report.generatedDiff).filter(([key]) => key !== 'source')) {
      for (const [kind, entries] of Object.entries(diff)) {
        lines.push(`  ${scope}.${kind}: ${entries.length}`);
        for (const entry of entries) lines.push(`    ${formatObject(entry)}`);
      }
    }
  }

  if (report.liveDiff.skipped) {
    const marker = report.liveDiff.toolingError ? '❌' : 'ℹ️ ';
    lines.push(`${marker} diff ao vivo pulado: ${report.liveDiff.reason}`);
  } else {
    lines.push(`diff ao vivo (pg_catalog, public.Tables/Views/Enums): ${report.liveDiff.missing.length} ausente(s) em types.ts`);
    for (const entry of report.liveDiff.missing) {
      lines.push(`    ✗ ${formatObject(entry)} — existe no banco mas não em types.ts`);
    }
  }

  return lines.join('\n');
}

async function main() {
  const { path, base, allowlistPath, live, json, generatedPath } = parseCliArgs(process.argv.slice(2));
  const report = await runCheck({ path, base, allowlistPath, live, generatedPath });

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatReport(report));
  }

  if (report.localDiff.toolingError || report.liveDiff.toolingError) {
    process.exitCode = 2;
    return;
  }
  if (!report.ok) {
    console.error(
      '\n❌ check-types-inventory-drift: remoção não justificada, objeto vivo ausente ou divergência da geração temporária. ' +
        'Se a remoção é intencional, adicione uma entrada em docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json ' +
        'na mesma revisão. Se é um objeto vivo ausente, regenere types.ts.',
    );
    process.exitCode = 1;
    return;
  }
  if (!json) console.log('\n✅ check-types-inventory-drift: sem drift não justificado.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  });
}
