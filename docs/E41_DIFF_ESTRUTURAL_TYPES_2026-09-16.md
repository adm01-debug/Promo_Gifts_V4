# E41 — Diff estrutural de `types.ts` (substitui o proxy `grep -c "export type"`)

Data: 2026-09-16
Depende de: E02
Referenciado por: `CLAUDE.md` REGRA #4, `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md`

## 1. Problema

A REGRA #4 do `CLAUDE.md` usava `grep -c "export type" types.ts` como proxy de
integridade ao regenerar `src/integrations/supabase/types.ts`. Esse proxy conta
apenas os ~7 aliases de tipo de topo do arquivo (`Database`, `Json`,
`Tables`, `TablesInsert`, `TablesUpdate`, `Enums`, `CompositeTypes` e afins) —
ele **não muda** quando uma tabela, view, function ou enum é removida de
dentro do union `Database["public"]["Tables"]`, porque essa remoção não altera
a contagem de `export type` no arquivo.

Foi exatamente esse ponto cego que permitiu o incidente `magazine_*`
(2026-07-16, commit `7716ae9`): o Lovable sobrescreveu `types.ts` e removeu
todas as tabelas `magazine_*` de dentro do union, mas `grep -c "export type"`
não teria detectado a mudança (a contagem de aliases de topo permanece igual).
O incidente só foi percebido pelos 80+ erros de TS resultantes em
`magazineService.ts`, e foi restaurado em `4cff1e1`.

## 2. Solução implementada

### 2.1 `scripts/extract-types-inventory.mjs`

Parser via **TypeScript Compiler API** (não regex — segue o precedente de
`scripts/check-supabase-reference-catalog.mjs`) que localiza a declaração
`export type Database = { ... }` em `types.ts` e extrai, por schema
(`public`, `graphql_public`, e qualquer outro presente), as listas de nomes em
`Tables`, `Views`, `Functions`, `Enums`, `CompositeTypes`.

- Categorias vazias no `types.ts` gerado aparecem como `MappedTypeNode`
  (`{ [_ in never]: never }`), não como `TypeLiteralNode` — o parser trata
  esse caso explicitamente como lista vazia.
- Saída: JSON estruturado por schema/categoria/nome (ordenado).
- CLI: `node scripts/extract-types-inventory.mjs [caminho] [--stdin]` imprime
  o JSON em stdout e um resumo de contagens em stderr.
- Também exportado como módulo (`extractTypesInventory`, `countsOf`,
  `extractTypesInventoryFromFile`, `CATEGORY_KEYS`) para uso pelo gate.

Registrado em `package.json` como `npm run check:types-inventory`.

### 2.2 Contagens reais confirmadas hoje (2026-09-16)

Via `node scripts/extract-types-inventory.mjs` contra o `types.ts` atual do
repo, e cruzado com consulta direta a `pg_catalog`/`information_schema` do
projeto `doufsxqlfjyuvxuezpln` (somente leitura, via `mcp__supabase__execute_sql`):

| Schema | Categoria | types.ts | pg_catalog (live) |
|---|---|---|---|
| `public` | Tables | 397 | 397 (381 tabelas base + 2 partitioned parents + 14 partições filhas) |
| `public` | Views | 197 | 197 (193 views + 4 materialized views) |
| `public` | Enums | 15 | 15 |
| `public` | Functions | 1008 | 1320 no `pg_proc` (ver nota abaixo) |
| `public` | CompositeTypes | 2 | — |
| `graphql_public` | Tables/Views/Enums/CompositeTypes | 0 | — |
| `graphql_public` | Functions | 1 | — |

Os números batem com o esperado pelo plano ("~383 tabelas + 14 partições",
"193 views"): 397 = 383 (arredondado; na prática 381 base + 2 parents) + 14
partições, e 197 = 193 + 4 materialized views.

**Nota sobre `Functions`:** o `pg_proc` vivo tem 1320 funções chamáveis contra
1008 expostas em `types.ts`. Essa diferença é esperada — o PostgREST expõe só
um subconjunto curado (baseado em schema exposto, grants e tipos mapeáveis
para HTTP/JSON), não é um bug do parser. Por isso `Functions` foi
deliberadamente excluído do diff ao vivo (`--live`) do gate — comparar 1:1
contra `pg_proc` geraria ruído constante, não sinal, e enfraqueceria a
credibilidade "fail-closed" do gate.

As 14 partições confirmadas por nome via SQL (`magazine_public_view_events_2026_07`
a `_12` + `_default` = 7, `supplier_products_raw_history_p2026_06` a `_12` = 7)
aparecem todas como entradas de primeira classe em `public.Tables` do
inventário extraído, confirmando que o parser trata partições corretamente.

### 2.3 `scripts/check-types-inventory-drift.mjs` (o gate)

Gate CI-callable com duas checagens independentes:

**(a) Diff local (git) — sempre roda:**
Compara o inventário do `types.ts` em `--base` (default `HEAD~1`) contra o
`types.ts` do working tree/commit atual (`--path`, default o `types.ts` do
repo). Se algo foi removido (Table/View/Function/Enum/CompositeType) sem
entrada correspondente em `docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json`,
o gate falha (exit 1) — fail-closed, sem `continue-on-error`, conforme
REGRA #5 do `CLAUDE.md`.

A justificativa é um arquivo JSON versionado e git-diffável (não parsing de
texto livre de PR/commit), seguindo o padrão já usado no repo
(`ALLOWLIST` em `check-no-db-push.mjs`, baselines em `docs/MANIFESTO_MIGRATIONS_*.json`).
Cada entrada exige `schema`, `category`, `name`, `reason`, `approvedBy`
(pessoa, não bot — REGRA #8) e `date`.

**(b) Diff ao vivo (opcional, `--live`):**
Se `DATABASE_URL` estiver disponível e `pg` puder ser importado, compara
`Tables`/`Views`/`Enums` do `types.ts` atual contra `pg_catalog` ao vivo e
falha se uma tabela/view/enum existente no banco não aparece em `types.ts`
(deriva não detectada por regeneração). `Functions` fica de fora desse diff
pela razão explicada acima. Sem `--live`, essa checagem é pulada
silenciosamente; com `--live` mas sem `DATABASE_URL`/`pg` disponíveis, o
script falha com exit 2 (erro de tooling, não de drift).

CLI: `node scripts/check-types-inventory-drift.mjs [--base <ref>] [--path <arquivo>] [--allowlist <arquivo>] [--live] [--json]`.
Registrado em `package.json` como `npm run check:types-inventory-drift`.

Rodado localmente contra o repo real: exit 0, "0 objeto(s) removido(s)"
(sem `--live`, pulado por falta de `DATABASE_URL`, como esperado neste
ambiente de auditoria somente-leitura).

### 2.4 Teste de mutação (`tests/scripts/check-types-inventory-drift.test.mjs`)

17 testes, seguindo o estilo de `tests/scripts/check-enum-contract.test.mjs`.
Destaque — o teste ponta-a-ponta exigido pela tarefa: constrói um repositório
git temporário real (`mkdtempSync` + `git init/add/commit`) com dois commits
de um `types.ts` fixture mínimo, simulando exatamente o incidente
`magazine_*` (commit 1 tem `magazines` + `products`; commit 2 remove
`magazines`). Confirma que:
- sem allowlist, `runCheck` retorna `ok: false` e `magazines` aparece em
  `unjustified`;
- com uma entrada de allowlist cobrindo a remoção, `runCheck` retorna
  `ok: true`;
- um `--base` inexistente (repo de commit único) é tratado como "pular",
  não como falha.

Outros testes cobrem `extractTypesInventory` (fixture inline + regressão
contra o `types.ts` real do repo, confirmando que `magazines` existe hoje),
`diffInventories`, `auditRemovals`, `loadRemovalAllowlist` (arquivo ausente,
válido, entrada incompleta, categoria inválida) e `diffLiveVsTypes` (função
pura, fixture de linhas).

Resultado: `TZ=America/Sao_Paulo npx vitest run tests/scripts/check-types-inventory-drift.test.mjs`
→ **17 passed (17)**. Suite ampliada (5 arquivos relacionados, 39 testes) também
passou limpa. ESLint nos 3 arquivos novos/modificados: sem erros.

Nota de implementação: `queryLiveInventory` importa `pg` dinamicamente via
`new Function('specifier', 'return import(specifier)')` em vez de
`import('pg')` literal — necessário porque `pg` não é dependência instalada
(padrão "soft dependency" de `scripts/gen-internal-schema.mjs`) e um
`import()` literal de um pacote ausente quebra a análise estática do Vite
durante os testes (mesmo com `/* @vite-ignore */`).

### 2.5 `CLAUDE.md` — REGRA #4 atualizada

A seção foi reescrita para apontar para os novos comandos:
- Antes de regenerar: `npm run check:types-inventory -- src/integrations/supabase/types.ts`
- Após regenerar: `npm run check:types-inventory-drift` (com
  `-- --base <ref>` para customizar o commit-base), explicando o fluxo de
  falha/allowlist e a flag opcional `--live`.
- Referencia `tests/scripts/check-types-inventory-drift.test.mjs`.
- A checklist manual de tabelas/views críticas e o histórico "Por quê"
  (incidentes `158c142` e `7716ae9`) foram mantidos, com um ponteiro
  adicionado para este documento.

Verificado que as seções vizinhas (REGRA #3 e REGRA #5) permaneceram
intactas.

### 2.6 `.github/workflows/regenerate-supabase-types.yml`

Workflow (`workflow_dispatch`, regenera `types.ts` e abre PR) não tinha setup
de Node — dependia só de bash/python3/Supabase CLI. Adicionado:
- Step `Setup Node` (`actions/setup-node@v4`, `node-version-file: .nvmrc`) e
  `Install dependencies` (`npm ci --prefer-offline`) — necessários porque o
  gate usa a dependência `typescript` já declarada no `package.json`.
- Step `Gate estrutural de types.ts (PLANO_DBA E41)` rodando
  `node scripts/check-types-inventory-drift.mjs --base HEAD` logo após a
  regeneração (comentário no workflow explica por que `--base HEAD` é
  correto nesse ponto: o working tree já tem o `types.ts` novo, mas nenhum
  commit novo foi feito ainda nesta run, então `HEAD` ainda resolve para o
  `types.ts` antigo do `main`). Sem `continue-on-error`, conforme REGRA #5.
- O antigo diagnóstico `wc -l` foi mantido (não é mais o gate, só um log
  informal) e o corpo do PR auto-gerado passou a mencionar que o gate
  estrutural passou.

**Escopo:** essa mudança foi feita apenas em
`regenerate-supabase-types.yml`, conforme pedido explicitamente pela tarefa
("Se existir ... adicione o novo gate lá"). Não foi adicionada a
`quality-gate.yml` nem `deploy-gates.yml` — essa é uma oportunidade natural
de follow-up (rodar o gate também em todo PR que toque `types.ts`
diretamente, não só no workflow de regeneração), deixada para uma etapa
futura por não haver, nesta auditoria, mapeamento completo dessa topologia
de CI mais ampla.

## 3. Arquivos entregues

| Arquivo | Tipo |
|---|---|
| `scripts/extract-types-inventory.mjs` | novo |
| `scripts/check-types-inventory-drift.mjs` | novo |
| `docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json` | novo (allowlist vazia) |
| `tests/scripts/check-types-inventory-drift.test.mjs` | novo |
| `package.json` | editado (2 scripts novos) |
| `.github/workflows/regenerate-supabase-types.yml` | editado (gate wired) |
| `CLAUDE.md` | editado (só REGRA #4) |
| `docs/E41_DIFF_ESTRUTURAL_TYPES_2026-09-16.md` | este documento |

## 4. Checklist de conclusão (E41)

- [x] `scripts/extract-types-inventory.mjs` criado, parsing real via TS
      Compiler API, saída JSON estruturada por schema/categoria.
- [x] Script rodado contra o `types.ts` atual; contagens reais reportadas
      (§2.2) e cruzadas com `pg_catalog` ao vivo.
- [x] Gate `scripts/check-types-inventory-drift.mjs` implementado: (a) diff
      local base-vs-atual com allowlist obrigatória para remoções, (b) diff
      ao vivo opcional (`--live`) contra `pg_catalog`.
- [x] Gate testado simulando a remoção de `magazines` (réplica do incidente
      2026-07-16) em um repositório git isolado de teste — confirmado que
      falha sem allowlist e passa com allowlist. 17 testes, todos passando.
- [x] REGRA #4 do `CLAUDE.md` atualizada para os novos comandos, seções
      vizinhas preservadas intactas.
- [x] Gate adicionado a `.github/workflows/regenerate-supabase-types.yml`.
- [x] Este documento entregue.

**Status: E41 entregue.**
