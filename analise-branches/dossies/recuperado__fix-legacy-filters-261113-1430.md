# origin/recuperado/fix-legacy-filters-261113-1430

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** nada a mais hoje — a protecao da busca de produtos (impedir que o que o usuario digita vire comando no banco) ja esta valendo na versao atual do sistema, numa versao mais completa do que esta branch trazia.
- **Tip / merge-base / main:** tip `fb72d72a1befcd085353a05d9a5ff2497577c23c` · merge-base `36eac065fa75b96dedf26dea71feeeb467cf4d34` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Pelas mensagens dos 4 commits, o agente tinha um unico objetivo: **destravar a CI**. O teste
`tests/edge-functions/integration/legacy-filters-escape.test.ts` importava um modulo
`supabase/functions/external-db-bridge/legacy-filters` que nao existia, e por isso o job
"Edge Functions · Integration All" falhava em **toda** PR do repo.

Duas coisas foram feitas:

1. **Criar o modulo que faltava** (`a6cd668420`, depois corrigido por `da654654ae`): tres funcoes
   — `escapeLikePattern`, `quotePostgrestValue` e `applyFilters` — escritas "de tras para frente",
   a partir do que o proprio teste exigia. O efeito pratico delas e impedir que virgula, parenteses
   ou ponto digitados na busca de produtos sejam interpretados como filtros extras pelo banco.
2. **Destravar um segundo portao de CI** (`0f18662643` e `fb72d72a1b`): acrescentar 5 entradas ao
   `.migration-refs-baseline.json`, referencias a migrations que outro agente havia colocado na main
   sem registrar na baseline. O proprio corpo do commit diz: "Este PR so cria legacy-filters.ts" —
   ou seja, isso era so ruido de CI, nao era o trabalho.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| `escapeLikePattern` (escapa `%`, `_`, `\`) | `supabase/functions/tests/external-db-bridge/legacy-filters.ts:20` — regex `/[%_\\]/g`, conjunto identico ao da branch (`/[\\%_]/g`) | `git show origin/main:supabase/functions/tests/external-db-bridge/legacy-filters.ts` linha 20 |
| `quotePostgrestValue` (cita valor com `"` e `\` escapados) | `supabase/functions/tests/external-db-bridge/legacy-filters.ts:28` — corpo byte-a-byte equivalente ao da branch | mesma leitura, linha 28 |
| `applyFilters` com `_search` nas 5 colunas (`name`, `sku`, `supplier_reference`, `brand`, `description`) via `.or()` | `supabase/functions/tests/external-db-bridge/legacy-filters.ts:32` em diante — mesmas 5 colunas, mesmo `.or()` | mesma leitura, linhas 32-48 |
| `applyFilters` com `_name_prefix` via `.ilike('name', ...)` | mesmo arquivo, ramo `_name_prefix` com `escapeLikePattern` aplicado | mesma leitura |
| O teste que motivou a branch continua existindo e passa a apontar para o modulo da main | `tests/edge-functions/integration/legacy-filters-escape.test.ts:2` importa `'../../../supabase/functions/tests/external-db-bridge/legacy-filters'`; no merge-base da branch (`36eac065fa`) a mesma linha importava `'../../../supabase/functions/external-db-bridge/legacy-filters'` | `git show origin/main:tests/...:2` vs `git show 36eac065fa:tests/...` linha 2 |
| Caminho exato criado pela branch (`supabase/functions/external-db-bridge/legacy-filters.ts`) | NAO ESTA — e **nao e mais necessario**: nenhum codigo da main importa esse caminho. As unicas mencoes sao documentos de auditoria e um JSON historico de PRs | `git grep -n "external-db-bridge/legacy-filters" origin/main` retorna so `.psv`/`.md` de auditoria, `analise-prs/2026-11-12/prs.json:1469` e o import do teste (ja apontando para o outro caminho) |
| Baseline: `CHANGELOG.md` → `supabase/migrations/x6` | `.migration-refs-baseline.json` (main), bloco da linha ~40 | `git show origin/main:.migration-refs-baseline.json` contem a entrada |
| Baseline: `prs.json` → `20261101150000_fix_sb0003_...sql` | `.migration-refs-baseline.json:21-22` (main) | `grep -n -A1 '"analise-prs/2026-11-12/prs.json"'` |
| Baseline: `prs.json` → `20261108230000_cron002_...sql` | `.migration-refs-baseline.json:25-26` (main) | mesma saida |
| Baseline: `prs.json` → `20260511235960_add_categories_full_path_readable_drift.sql` | NAO ESTA — e **nao deve estar**: a migration passou a existir na main, entao a referencia nao esta mais quebrada | o arquivo existe em `origin/main:supabase/migrations/`; `scripts/check-migration-path-references.mjs:131` (`if (existsSync(abs)) continue;`) e `:169-171` + `:191-200` fazem o portao **falhar** com entradas de baseline que nao sao mais quebradas |
| Baseline: `prs.json` → `20261111222500_fix_touch_seller_cart_secdef.sql` | NAO ESTA — mesmo motivo: a migration existe hoje na main | idem acima |

Observacao de contexto: a versao da main nao e so equivalente, e **maior**. Ela tambem trata
descendentes de categoria, promocao de operadores por sufixo (`_gte`, `_isnull`…), operadores
no estilo PostgREST (`in.(...)`, `is.null`) e lanca `InvalidFilterError` para filtro objeto —
nada disso existia na branch. Alem disso, a edge function em si foi desativada: 
`origin/main:supabase/functions/external-db-bridge/index.ts:2` diz "DECOMMISSIONED — returns 410 Gone
for all requests" e responde `status: 410` (linha 34). O arquivo da branch, se voltasse, seria
codigo morto num servico desligado.

## A resgatar

Nada. Os 4 itens de comportamento da branch estao na main com evidencia linha a linha, e as 2
entradas de baseline ausentes **nao podem** voltar: hoje elas fariam o portao de CI falhar como
"entrada de baseline que nao e mais referencia quebrada"
(`scripts/check-migration-path-references.mjs:191-200`, `process.exit(1)`).

## Risco de fechar esta branch

Praticamente nulo. A protecao contra busca maliciosa continua no sistema, numa versao mais
completa, e o teste que garante isso continua rodando na CI — apenas apontando para o lugar certo.
O unico "risco" seria perder o arquivo no caminho antigo, que ninguem usa e que pertence a um
servico ja desligado (responde 410 para qualquer chamada).

## Nao verificado

- Nao executei a suite de testes nem o portao `check-migration-path-references.mjs` contra a main:
  a arvore de trabalho desta sessao esta em `347e67a4ed`, nao em `e4ab7f85d9`, e a tarefa proibe
  mexer na arvore (checkout/reset). A conclusao sobre o portao vem da leitura do codigo do script
  (`:131`, `:169-171`, `:191-200`) somada a existencia/ausencia de cada migration em
  `origin/main:supabase/migrations/`, verificada com `git ls-tree`.
- Nao comparei o comportamento das duas versoes de `applyFilters` caso por caso em execucao; a
  comparacao foi por leitura do codigo dos dois lados (mesmas 5 colunas, mesmos escapes, mesma
  forma de `.or()` e `.ilike()`).
