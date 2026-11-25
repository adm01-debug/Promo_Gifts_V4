# Recibo de adjudicação — 2026-11-18

Tudo aqui foi **medido**, não suposto. Este arquivo existe para que nenhuma branch
ou PR seja apagada sem prova, e para que nenhum agente futuro tente resgatar de
novo o que já foi julgado.

Método novo desta sessão, que corrige um ponto cego das anteriores: **as 3.356 refs
`refs/pull/*/head` foram baixadas**, então o conteúdo de toda PR fechada existe
localmente mesmo com a branch apagada. Com isso deu para auditar as **712 PRs
fechadas sem merge**, não só as branches vivas.

---

## 1. O que a auditoria mecânica das 712 PRs achou

| classe | PRs | significado |
|---|---|---|
| sem código | 299 | recibo de bot, docs, lockfile |
| tudo já na `main` | 93 | conteúdo entrou por outro caminho |
| com delta | 320 | tinha ao menos um blob que nunca existiu naquele caminho na `main` |

Afunilando o delta para o sinal nítido — arquivo que a PR criou e que **não existe
na `main` de forma alguma** — sobraram **175 arquivos**, dos quais ~110 nem pelo
nome. Agrupados, eram 5 blocos coerentes. Veredito de cada um:

| bloco | veredito | evidência |
|---|---|---|
| 4 testes de segurança adversariais + o endurecimento que cobrem (PR #1726) | **RESGATADO** | ao rodar os 96 casos contra a `main`, **54 falharam** — eram lacunas reais, não testes de algo já feito |
| sistema de contratos/versionamento de edge (PRs #67/#68/#80/#82/#84, 17 arquivos) | **OBSOLETO** | duplicata da PR #45, mergeada em 2026-05-21 — um dia antes. A `main` é superset: 422 com `request_id`, 406, headers Sunset RFC-8594, 16 schemas, 16 edges adotando, 2 gates em `deploy-gates.yml` |
| gate `check-zod-pinning.mjs` (PR #343) | **A RESGATAR** | o pinning é real (`_zod.ts:12` → `npm:zod@3.23.8`) mas desprotegido: 7 edges importam zod de URL `https://` (duas em `zod@3.22.4`), neutralizado só pelo import map de `deno.json`. E `_zod.ts:10` promete uma regra de ESLint que **não existe** |
| 19 migrations ausentes da `main` | **17 obsoletas, 2 a resgatar, 1 perigosa** | detalhe na seção 3 |
| scripts de governança | não adjudicados nesta sessão | ficam registrados na seção 5 |

---

## 2. Branches adjudicadas — pode fechar

### `salvo/261117-laughing-cori-o9w35e` — FECHAR
44 commits exclusivos, 24 arquivos de trabalho autoral. **Todo o conteúdo funcional
está na `main`**: migration `20261102063000` byte-idêntica via #3665; `useRuptureAlerts`
(×2), `useListUrlState`, `KitOrigin` (×3), fuzz E128, `check-eslint-baseline.mjs`,
`package.json`, catálogo Supabase, `MIGRATIONS_SYNC_LOG`, dossiê Devin — todos
presentes com os mesmos comentários.

Os 21 arquivos que aparecem como "só na branch" **existiam no merge-base** e foram
apagados **deliberadamente** pela `main` depois (#3055, #3463, #3603, `fb6d64fc7`,
`0e442766f`). Falso positivo de `git diff`.

Correção de medição anterior: `deploy-gates.yml` **não** tinha "907 linhas de
diferença". 907 é o total de linhas do arquivo na branch; o diff autoral é de 45.

O diff de workflows dela é workaround da GitHub Actions policy, que a `main` já
resolveu reativando `dorny/paths-filter`, `anchore/sbom-action` e
`actions/attest-build-provenance` pinadas por SHA. Reaplicar seria **regressão**.

Único conteúdo genuinamente ausente: dois `.md` daquela sessão — preservados em
`docs/agentes/resgates/sessao-261102/` (PR #3822).

### `salvo/261117-schema-snapshot-cancelled-skip` — FECHAR
1 commit exclusivo. O fix já está na `main` via #3725 / `a8f57a4fc`, que **cita a
mesma run `41363217079` como evidência**. A `main` é 16 dias mais nova e tem o
`force_rotate` também no job `commit-snapshot`, que a branch não tem.

### `salvo/importado-vps-fabrica-v2-refazer-dc12be92-261116` — FECHAR
2 commits exclusivos (Fabrica Hermes, 2026-10-13). `e2e-cleanup/index.ts`: main 550
linhas × branch 226 — a `main` é **superconjunto estrito**. Os 3 `it(` da branch
existem na `main` com **título idêntico**, e a `main` tem 8 a mais. Os 69 arquivos
de migration "só na branch" têm commit de deleção/rename na `main` (#2284, #3361);
uma delas está **corrompida em base64**.

### `claude/feat-restauracao-rascunho-orcamento-261117-1620` (PR #3788) — FECHAR
Superseded por um desenho melhor na `main`: `QuoteDraftRecovery.tsx` +
`restoredDraftBase.ts` + `quoteDraftApply.ts` (33 casos de teste).

**Mas havia perda real e ela foi resgatada:** o teste daquela branch tinha 13 casos,
o de mesmo nome na `main` tem 7. O componente da `main` não tinha teste nenhum —
as 4 promessas do cabeçalho de `QuoteDraftRecovery.tsx:13-22` não eram verificadas
por ninguém. Resgatado em `tests/components/QuoteDraftRecovery.test.tsx` (PR #3821).

---

## 3. As 19 migrations ausentes da `main`

**17 obsoletas**, cada uma com evidência de (a) renomeada na `main` com o mesmo
slug, ou (b) o objeto já existe no banco canônico `doufsxqlfjyuvxuezpln`.

**1 perigosa — não resgatar:** `20261101000001_security_invoker_views_p06.sql`
(PRs #3003/#3720). `security_invoker=true` em 8 views reexporia a `anon` tabelas
mascaradas; 7 das 8 responderiam `permission denied`. A `main` tem a substituta
estreita `20261117073000_p06_security_invoker_v_product_properties_public`. A branch
`salvo/claude-fix-resgate-p06-p15-security-261116-2215` **fica aberta** por ser a
fonte dessa prova.

**SEC-001 (#2969) — o risco não era real.** Medido: das 106 funções da lista,
**0 têm `EXECUTE` para `anon` ou `public` hoje**. A migration da `main`
(`20261115130200`, superset: revoga `PUBLIC` *e* `anon`) foi aplicada em 2026-11-16.
Residual: 9 funções de trigger com `anon`, todas `prosecdef = false` — chamada
direta rodaria com os privilégios do próprio `anon`.

**2 a resgatar — PR #504:** `20260526_fix_cadastro_produtos_fornecedores.sql` e
`20260526_data_migration_contacts_pix_carrier.sql`. Nada da normalização de
fornecedores entrou: não existe `supplier_contacts`, nem `pix_keys`,
`payment_methods`, `default_carrier_id/name`, `crm_company_id`. Hoje PIX e
transportadora moram **serializados como texto dentro de `suppliers.notes`**
(`useSuppliersManager.ts` e `useNewSupplierForm.ts` ainda montam/parseiam
`[Financeiro:` e `[Transportadora:`). Não está quebrado para o usuário, mas dado
financeiro sem validação, sem FK, sem índice e sem busca é dívida real. **A
migration sozinha não entrega nada** — os nomes novos têm zero referência em `src/`,
então exige PR com migration + front juntos. É decisão de negócio.

---

## 4. Dois buracos que afetam produção hoje — e não são branch perdida

São migrations **já na `main`** esperando o `db-apply-migration.yml`:

- `20261115130100_fn_market_intelligence_macro` — a função **não existe no banco**,
  e a tela `/bi` cai no caminho `aggregationUnavailable`: o gráfico de Inteligência
  Comercial aparece **vazio** para o vendedor. Depende de `20261115130000`
  (`CREATE INDEX CONCURRENTLY`), que o próprio log manda aplicar **fora do pico**.
- `20261115130300_fn_global_search_clamp_limit_hardened` — **APLICADA nesta sessão**.
  Verificado no banco: `LEAST` presente, `search_path` com `pg_temp`, e `EXECUTE`
  revogado de `anon`. Era `SECURITY DEFINER` executável por `anon` sem limite de
  `p_limit`.

---

## 5. Fila que continua aberta

| item | o que falta |
|---|---|
| `kitPdfGenerator.ts` (443 l) | hoje "Exportar PDF" do kit é `window.print()`. Resgatar exige atualizar 1 teste de preservação e validar a API do jsPDF 4.x |
| `QuotesFunnelChart.tsx` (78 l) | `useQuoteFunnel` está vivo, com ~18 casos de teste, e **sem nenhuma tela**. O funil atual não tem taxa entre etapas nem ciclo médio. O legado zerava a etapa "Visualizado"; o resgate honesto monta o `viewedMap` de `quotes.viewed_at` |
| `BridgesLiveCard` + `BridgeCallDetailDrawer` + `BridgeAlertsCard` (~740 l) | `bridgeCallMetrics` é alimentado ao vivo por `rest-native.ts` e `crm-db.ts`, e **nenhuma tela de admin lê**. Dois módulos vivos ficaram órfãos por isso: `bridgeAlertThresholds.ts` e o `entries` de `useBridgeMetrics.ts:76` |
| `KillSwitchBanner.tsx` + `useKillSwitchBanner.ts` | ausentes da `main`; vinham de PR fechada |
| gate `check-zod-pinning.mjs` | toca `.github/workflows/`, logo cai no Git 7 do AGENTS.md: PR fica aberta e chama o dono |
| item 8 de `2026-11-18-pendencias-abertas.md` | reavaliar os 5 testes julgados obsoletos nas branches `codex-fix-gate1` e `claude-fix-pr3517` |
| `tests/e2e/mockup-regressions.spec.ts:15` | **RESOLVIDO em 25/11/2026** — o `data-testid="mockup-generate-button"` passou a existir no CTA vivo e o contrato virou caso real em `src/components/mockup/__tests__/MockupLayoutButtons.test.tsx`. O `.spec.ts` órfão, que nenhum runner coletava, foi removido |
| `.eslint-baseline.json` | 3 entradas órfãs (linhas 24, 30, 35) apontando para arquivos aposentados |

## 6. Painéis que seguem obsoletos — não tentar de novo

`PlatformFailureCards` e `PlatformFailureAlertBanner` mostrariam só zeros: o RPC de
leitura (`get_platform_failure_metrics`) está vivo, mas a **escrita**
(`record_platform_failure`) foi movida para o schema `archive` e seu único escritor
era o `bridge-telemetry-client`, que escuta um bus **no-op desde 2026-05-30**
(`bridge-status-events.ts:1-10`: "bridge decommissioned"). Resgatar exigiria
migration desarquivando a função **mais** um escritor novo — decisão de negócio.

`ColdStartRetriesPanel` e `cold-start-recorder` dependem do mesmo bus no-op.
`EdgeFunctionLogsPanel` foi substituído por `EdgeInvokeLivePanel` (vivo, "Onda 21").
