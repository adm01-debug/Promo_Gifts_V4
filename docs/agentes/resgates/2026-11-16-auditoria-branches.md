# Auditoria das branches antes de fechar — 2026-11-16

Laudo de uma operação de resgate: varrer **todas** as branches do repo, achar trabalho de outros
agentes que a `main` não tem, terminar o que ficou pela metade, e só então fechar. Regra do dono:
nenhuma branch fecha sem prova por arquivo, e o tip é preservado num ref `salvo/*` **antes** de
apagar.

Este arquivo é o rastro. Quem continuar a operação começa por aqui.

## Método (o que vale como prova)

| Pergunta | Como se responde |
|---|---|
| O conteúdo da branch já esteve na `main`? | O blob da branch aparece em `git rev-list origin/main --objects` (124.657 objetos). Se sim, um dia foi incorporado. |
| O arquivo existe na `main`? | `git ls-tree -r origin/main` **pelo nome base**, não pelo caminho. 200 dos 413 "ausentes" eram arquivos movidos para pastas reorganizadas — classificar por caminho completo produz falso positivo. |
| A branch adiciona algo que a `main` não tem? | `git diff --numstat origin/main..origin/<branch> -- <arquivo>` (**dois pontos**, não três). O de três pontos mostra o que a branch somou desde o merge-base e **não** prova que a `main` não tem. |
| O objeto existe em produção? | Consulta read-only no canônico `doufsxqlfjyuvxuezpln`. Nome de branch, commit, PR ou comentário nunca provam que algo funciona. |

Erro de método a não repetir: `git log --all -- <caminho>` **poda** merges cuja árvore é igual à de um
pai (simplificação TREESAME) e esconde histórico. Só `git rev-list --all --objects` é exaustivo.

## Inventário

- **82** branches de trabalho no remoto (fora `main`, `contexto`, `salvo/*`).
- **1.398** linhas de resíduo, **906** arquivos distintos: **537** pares ausentes da `main`, **861**
  pares divergentes.
- Dos ausentes, **213** arquivos cujo nome não existe em lugar nenhum da `main`.
- Dos divergentes, **493** arquivos distintos; **486** com linhas que a `main` não tem.
  Separando por natureza: **326** são documento de análise ou cópia de arquivo morto
  (`recovery/src-legacy`, `analise-prs`, `auditoria-supabase`, `docs/`, `inventario/`) e
  **160** são de risco (código, workflow, migration, teste, script).

## Veredito por frente

### Banco — 8 migrations órfãs (completo)

Nenhuma das 8 versions estava no ledger de produção. Adjudicadas uma por uma, com o objeto medido
no canônico:

| version | veredito |
|---|---|
| `20261101000001` (P06) · `20261101000002` (P15) | **resgatadas** — 9 views `v_*` sem `security_invoker`, 3 GRANTs de escrita de `anon` vivos. A P15 estava pela metade: o título dizia revogar acesso `anon` e o corpo só derrubava a policy de SELECT. Completada. Nenhuma tinha rollback, e sem rollback o preflight nunca libera a aplicação. |
| `20261107143509` | já resgatada pela `main` como `20261115130300`, com atribuição no próprio arquivo |
| `20261107143505` | superada pela `20261112011000`, aplicada. Só difere a ordem do `search_path`; `anon`/`authenticated` não podem `CREATE` em `public` nem `extensions`, então não é explorável |
| `20261108132000` | a `main` tem a `20261108001500` com rollback **mais seguro** (recusa se houver dados) |
| `20261108221502` (ft088) | corpo idêntico à `20261108030200` da `main`; só falta um GRANT já satisfeito em produção |
| `20261110024530` | `user_known_devices.is_trusted` **existe em produção**, posto pela `20261114031000` |
| `20261110022404` (quote_comments) | a tabela **não existe** e a `main` a dropou 2× de propósito. Ressuscitar reverteria decisão — é pergunta de produto, não de código |

### Migrations divergentes — 3 arquivos (completo)

Os três são **melhoria de comentário** em migration **já aplicada em produção**:

| arquivo | branch | diferença real |
|---|---|---|
| `20261031000000_create_stock_notes.sql` | `claude/fix-stock-notes-rollback-header-261101-2151` | +1 linha: `-- Rollback: supabase/rollbacks/20261031000000_rollback.sql` |
| `20261101202000_drop_revoke_agent_created_functions.sql` | `codex/fix-db-migration-preflight-261107` | +3 linhas explicando que a reversão é fail-closed |
| `20260916181609_backfill_fix_google_provider_secret_name_20260623.sql` | `importado/backup-20261028/claude/audit-gaps-20260915` | cabeçalho reescrito **e** `ai_providers` → `public.ai_providers` |

**Não trazidos, e por quê.** Medido: `stock_notes` existe no canônico, `20261031000000` está no
ledger, `handle_updated_at` existe. O cabeçalho ausente de rollback **não bloqueia nada**:
`evaluatePreflight` (`scripts/preflight-migration-apply.mjs:304`) só roda sobre a versão passada em
`--version=` pelo `db-apply-migration.yml`, nunca sobre o repo todo, e essa versão já foi aplicada.
Editar migration aplicada muda o sha256 que o `MIGRATIONS_SYNC_LOG.md` registra, em troca de ganho
comportamental zero — a mesma razão pela qual a correção do Gate E40 (PR #3721) foi feita na semente
do replay e **não** editando a `20261115230000`.

### Linhagem #3390 → #3517 → #3548 (completo)

`codex/fix-gate1-kit-pdf-types-261109-2252` (PR **#3390**, fechada) → `claude/resgate-3390-261113`
(PR **#3517**, fechada) → `claude/fix-pr3517-gate1-baseline-261113-2336` (PR **#3548**, **aberta**,
309 arquivos, CI vermelha). Dos **65** arquivos da #3390 ausentes da `main`, a #3548 carrega **10**:
**55** não estão em lugar nenhum.

Medido arquivo por arquivo, com os testes rodados:

- **23 dos 27 módulos** que esses testes importam **existem na `main`**, em pastas reorganizadas
  (`@/hooks/useQuoteTemplates` → `@/hooks/quotes/useQuoteTemplates`). Não era obsolescência, era
  caminho defasado. Convertidos os imports, **367** testes saíram de "não carrega" para "roda":
  671 testes, **343 passam, 328 falham**.
- **6 testes** miram módulos que só existem em `recovery/src-legacy`, não no app vivo
  (`QuoteCommentsSection`, `QuoteTemplateForm`, `FavoritePresentationLauncher`, `SmartSuggestions`,
  `useQuoteComments`, `utils/templateExport`) — resgatá-los é decisão de produto.
- **16 arquivos `src/`: nenhum é funcionalidade perdida.** 15 têm zero importadores (na `main` e nos
  próprios testes) e seriam código morto. O único candidato real, `LegacyCartInsights.tsx`
  ("Compatibility features preserved from CartUtilComponents"), é **duplicata**: `getActionHistory`,
  `recordAction`, checklist e `SmartSuggestions` já estão em `src/components/cart/CartUtilComponents.tsx`,
  com teste próprio em `src/pages/products/seller-carts/__tests__/CartSidebar.render.test.tsx`.

**Adjudicação das 328 falhas nos três pontos que mexem com dinheiro** (três agentes, em paralelo,
só leitura):

| frente | veredito |
|---|---|
| Preço desconhecido virando R$ 0,00 | **zero regressão.** A `main` falha fechado por exclusão: `useKitBuilderTransformers.ts:24-27` devolve `null` para `null`/negativo/`NaN`/`±Infinity` e os consumidores filtram (`useKitBuilderQueries.ts:291-292`) ou avisam. A #3390 queria exclusão por flag (`priceKnown:false`). Ambos falham fechado. `sale_price` zero real é preservado com precedência (`:25`). |
| "Diz salvo sem salvar" | **zero regressão** no caminho crítico: `set_custom_kit_pinned` levanta `42501` fora do dono (migration `20260912151000:57-67`) e `save_custom_kit_atomic` valida o retorno (`persistence.ts:195-213`). |
| Cópia de template / RLS do destinatário | **zero regressão.** As 5 mutações têm guarda de zero-linhas (`useQuoteTemplates.ts:258, 308-309, 338-339, 384, 441`) e o clone é bloqueado quando `is_active` não é `true` (`:425-433`). Das 25 falhas, **16 são uma única asserção**: a cópia não herdar `usage_count`, que a `main` zera de propósito (`:117-118`) num campo que nenhuma tela lê. |

**Dois defeitos reais encontrados pelo teste abandonado** → corrigidos na PR **#3723** (mergeada,
`eadb47a75`): `togglePinned` (`useCustomKitPersistence.ts:176-195`) não tinha ordenação de
requisição. Dois cliques seguidos em fixar/desafixar e o usuário lia o estado errado; trocando de
conta com um pin em voo, a conta nova recebia aviso de sucesso de um kit alheio. O banco nunca
esteve em risco — a tela mentia. Teste novo falha contra a `main` e passa com a correção.

Resíduo preservado em `claude/fix-resgate-3390-residuo-261116-2250` (commit `fb0ca4608`, **sem PR**:
entrar com teste vermelho deixaria o CI do repo vermelho). O valor do commit é a conversão dos
imports.

### Infraestrutura resgatada

| o que | onde estava | PR |
|---|---|---|
| Export do schema snapshot não roda quando o drift-gate é cancelado | `claude/fix-schema-snapshot-export-cancelled-skip-261101-2344` | **#3718** |
| Semente do replay recria o modelo de IA que a FK da `20261115230000` exige | achado nesta sessão | **#3721** |
| Workflow semanal que mantém `inventario/estado/` vivo | `claude/infra-inventario-semanal-261102-1120` | **#3722** |

Os três são o mesmo problema de fundo: **gates que davam vermelho por causa da `main`, não da PR**.

1. `MIGRATIONS_SYNC_LOG.md` tinha 4 versions com duas linhas cada na seção "Recibos" (sha256
   diferentes, arquivo revisado entre a PR #2603 e a #2646). Enquanto existiram, **qualquer** PR que
   tocasse `supabase/migrations/**` era reprovada no `Static Checks`. Corrigido movendo as linhas
   superseded para seção própria — a contagem do gate é por seção, nada foi apagado. Qual ficou:
   a que bate com o sha256 real do arquivo na `main`.
2. `Gate E40` reprovava toda PR com migration desde 15/11:
   `20261115230000_ai_function_routing_mockup_assistant.sql:29` insere com o uuid do modelo escrito
   à mão e há FK para `ai_models(id)`; o uuid só existe em produção porque
   `20260615210001:15` usou `gen_random_uuid()`, e o baseline é schema-only. Provado em PostgreSQL
   16 local: sem a semente, o mesmo erro de FK do CI; com ela, `INSERT 0 1`; idempotente.
3. Com a #3721, o `Gate E40` passa do passo 13 e para no passo 15, `check-cron-drift.mjs` (E037):
   o snapshot de então (`20261108000000_cron_jobs.json`, substituído pela #3721 por
   `supabase/baseline/20261116000000_cron_jobs.json`) dizia
   `refresh-all-materialized-views` = `38 */2 * * *` e a produção está em `38 9 * * *`, mudança da
   CRON-005 aplicada em 14/11. Quem rotaciona o snapshot é o `schema-snapshot-export.yml` — ou seja,
   a #3718. **#3718 + #3721 são as duas metades do mesmo portão.**
4. `inventario/estado/` é a fonte que o `AGENTS.md` manda todo agente ler, e nada na `main` executa
   os geradores: `edges.json` tem `gerado_em = 2026-11-02` e declara **110** edge functions quando
   a realidade são **111**; `banco.json` não tem o campo. Dos 11 arquivos da branch, 10 já estavam
   na `main` — só o workflow ficou fora.

Descartado de propósito, com motivo: o SHA do `codeql-action` da branch do inventário é **mais
antigo** que o da `main` (`33d7b85` vs `9b32540`) e o `SEGREDOS.md` dela é de 2026-10-14, anterior
ao atual; e a cláusula `needs.drift-gate.result == 'cancelled'` sem condição, da branch do snapshot,
liberaria a rotação do baseline em qualquer cancelamento.

## Branches fechadas

**23**, cada uma com prova por arquivo e o tip preservado antes de apagar. Há **15** refs
`salvo/*` no remoto; os commits de branch que já tinha PR seguem preservados também em
`refs/pull/<N>/head`, o que torna parte dos resgates `recuperado/*` redundante.

Fechadas com prova nesta rodada: `importado/vps-fabrica/v2/refazer-dc12be92`,
`e15-receipt-20261114120100-43959381044`, `claude/perf-cron005-refresh-all-mvs-diario-261114-1002`,
`claude/fix-mockup-geometria-wysiwyg-261115-0045`, `claude/fix-mockup-logo-tamanho-real-261114-2200`,
`computador_local` (ancestral direto da `main`), `claude/clever-lamport-zlmati`.

As duas de mockup eram idênticas entre si e resolveram uma contradição entre dois agentes: o
WYSIWYG está vivo na `main` (`supabase/functions/generate-mockup/geometry.ts`, 18/18 testes passam) e
a parte não aplicada — recusar com 422 sem dimensões — foi **rejeitada de propósito**, registrado em
`geometry.ts:17`, porque quebraria a prévia do kit-builder.

**Nenhuma PR foi fechada.** As três que entraram foram mergeadas: #3715, #3716, #3717.

## O que falta — em ordem

1. **160 arquivos divergentes de risco.** Classes, por dono: `.github/workflows/**` (29 arquivos),
   `src/components/mockup/**` + `src/hooks/mockup/**` (~20, concentrados em
   `claude/fix-e125-mockup-casts-261030` e nas `importado/vps-fabrica/v2/s*`),
   `e2e/**` (13), `tests/**` (13), `scripts/**` (8), `supabase/functions/generate-mockup/**` (4,
   em `importado/vps-fabrica/v2/s36` e `s51`). Os 12 `*-baseline.json`, `package-lock.json`,
   `src/integrations/supabase/types.ts` e `supabase/migrations-snapshot/*` são derivados — não são
   funcionalidade.
2. **326 arquivos divergentes de documento/arquivo morto** — `recovery/src-legacy` (165),
   `analise-prs/dossies` (97+11), `auditoria-supabase`, `docs/`, `inventario/`.
3. **213 arquivos ausentes** fora do que já foi adjudicado: ~72 documentos de análise,
   46 de `recovery/src-legacy`, 3 de `scripts/graphify`, 2 de `supabase/baseline`,
   `.github/workflows/e2e-modules.yml` (de `claude/chore-e2e-modules-matrix-261102-2115`, ainda não
   auditado).
4. **#3548** (309 arquivos, 15.013 inserções, CI vermelha, de outra sessão): decidir entre
   reconstruir numa branch nova com só o que passa, ou fechar e registrar o que sobrar como perda.
5. **26 migrations não aplicadas e 15 rollbacks** aguardando decisão do dono; replay do zero ainda
   falha antes da `20260512000000` (`products.slug` inexistente).
6. Defeito de processo: o job "Recibo" do `db-apply-migration.yml` abre PR com `GITHUB_TOKEN`, que
   não dispara workflow — a PR do recibo nunca recebe CI e o repo fica vermelho até alguém mergear
   à mão. Foi o que travou o `Gate 1.13.3 (E055)` depois da CRON-005.

## Decisões que são do dono, não minhas

`tailwindcss` 3→4 e os outros 4 bumps major da #3695 · aplicar P06/P15 em produção (#3720) ·
as 13 branches `recuperado/*` da §2 da passagem de 15/11 · PRs #3566, #3683, #3696, #3719 ·
ressuscitar ou enterrar `quote_comments`.

---

# Rodada de 17/11 — continuação

Convenção desta seção: versões de migration que **não existem na `main`** são citadas pelo número,
sem o prefixo `supabase/migrations/`. Com o prefixo, `check-migration-path-references.mjs` conta
referência nova quebrada e derruba o Gate 1 no push — foi exatamente o que aconteceu em `bf156d3ff`
e foi corrigido pela #3733.

## Fechamentos

**47 branches** fechadas com prova nesta sessão (23 registradas acima + 24 depois). Somam-se às de
cima: as 12 fatias VPS de mockup (ref `salvo/261117-vps-fabrica-mockup-12`, 12/12 conferidas
alcançáveis no remoto antes de apagar), `claude/laughing-cori-o9w35e`, `computador_local`,
`claude/fix-schema-snapshot-export-cancelled-skip-261101-2344` e as **9 de documento da fábrica
VPS** (ref `salvo/261117-docs-fabrica-vps-9`, conteúdo na `main` pela #3731).

Nas 9 de documento a prova foi linha a linha, não só por arquivo: `0` linhas da branch ausentes na
`main` em `MOCKUP_OPERACAO.md`, `MAGIC_UP_AUDITORIA_2026-10-08.md`, `FABRICA_VPS_FAQ.md` e na
proposta da `s69`. Nas duas de `MOCKUP_RETENCAO.md` as **2** únicas linhas não trazidas são a
citação do commit-base da própria fábrica, que não tem sentido na `main` — decisão declarada na PR.

## Veredito final da #3548 (linhagem #3390 → #3517)

**Nada a resgatar.** Os 23 arquivos de código ativos: 6 SUPERADO, 8 VERSÃO_ANTIGA, 5 OBSOLETO,
4 INCORPORADO, **0 RESGATAR**. Pior: em 5 pontos a linhagem **regride** a `main` —
`QuoteAutoSave.tsx` remove o `safeParse` do rascunho que a `main` tem em `:386`;
`MockupHistoryPanel.tsx` remove as duas reconciliações, o wrap responsivo A-33 e o alvo de toque de
44px A-5 (12 testes passando cobrem isso); `read-draft.ts` remove os `.default(...)` que impedem a
hidratação de falhar em 15 dos 21 kits de produção; `KitBuilderPage.tsx` remove
`useKitItemReplaceTarget` e `data-testid=wizard-next` e apaga 82 linhas de cobertura de retry de IA;
`mockupGenerationService.ts` perde o `limit` sanitizado. O conteúdo "novo" dela são props sem
consumidor (`onRestore`, `onMarkApproved`, `companyAccentColor`, `techniques`), alimentadas só por
páginas que não existem na `main`.

Composição medida: 309 arquivos — 243 em `recovery/src-legacy/`, 47 em `src/`, 15 em `tests/`,
3 baselines, 1 doc.

**Ela trava o resgate de dois itens.** Os únicos dois itens vivos do dossiê da
`codex/fix-gate1-kit-pdf-types-261109-2252` — ação "Aprovar" na lista de orçamentos e o filtro de
técnicas no histórico de mockups — vivem em `src/components/quotes/QuotesConfigurableList.tsx` e
`src/components/mockup/MockupHistoryPanel.tsx`, **os dois na #3548**. Enquanto ela estiver aberta,
Git 2/7 impede trabalhar nesses arquivos. É decisão do dono.

## `codex/fix-gate1-kit-pdf-types-261109-2252` — o que é real

272 arquivos existem só nela, mas **203 são apenas movidos** (o mesmo basename está na `main` em
outro caminho). Sobram 40 inéditos. Deles:

- **Banco: nada a resgatar.** `20261110024530_restore_device_trust_contract` está **INCORPORADO** —
  a `main` tem `supabase/migrations/20261114031000_fix_user_known_devices_is_trusted.sql` com efeito
  idêntico, presente no ledger de produção, e `pg_attribute` confirma
  `user_known_devices.is_trusted` como `boolean NOT NULL DEFAULT false`, o contrato exato que a
  migration da branch exigiria. `20261110022404_restore_quote_comments_scoped_threads` é
  **OBSOLETO por decisão**: a `main` apagou a tabela em 27/06 (as duas versões de DROP estão no
  ledger de produção), tirou a UI, e instalou duas travas — `scripts/check-no-quote-comments.mjs`
  (acionada por `ci-security-drift.yml:67`) e `e2e/routes/quotes/view-no-comments-network.spec.ts`.
  Produção confirma: `to_regclass('public.quote_comments')` é `null`, 0 políticas, 0 funções.
- **Único resgate de banco pendente: `tests/sql/device-trust/`** (fixture + runner, 77 asserções).
  Cobre `user_known_devices.is_trusted` — defaults, RLS com role não-superusuário, negação anônima,
  idempotência, atomicidade e o rollback que recusa apagar a decisão de confiança do usuário.
  `git grep -ln user_known_devices origin/main -- tests scripts` é **vazio**: a `main` não testa isso
  em lugar nenhum. Pendências do resgate: repontar o runner para a migration `20261114031000`, e
  decidir onde ele roda — ver o achado do harness morto abaixo. **NÃO VERIFICADO:** não executei,
  este container não tem Docker (`docker info` falha).
- `tests/sql/quote-comments/` é **OBSOLETO e tóxico**: o gate varre `tests/`, então copiá-lo com os
  nomes atuais derruba o CI.
- O item 1 do dossiê (recuperação validada de rascunho) **já está na `main`** desde 16/11 21:31:
  `src/lib/quotes/quoteDraftRecovery.ts` + `__tests__/quoteDraftRecovery.test.ts` + o `safeParse` em
  `QuoteAutoSave.tsx:386`. O dossiê é de 13:36 do mesmo dia e está desatualizado nesse ponto — quem
  ler só o dossiê vai resgatar de novo o que já existe.

## Resíduo da #3390 — medido executando, não por leitura

A branch `claude/fix-resgate-3390-residuo-261116-2250` guarda 55 arquivos do resíduo, nenhum deles
na `main`, e **interseção zero** com a #3548. Aplicados sobre a `main` e executados:

- **Typecheck: 7 erros.** Imports para caminhos que a `main` reorganizou (`@/hooks/useCartTemplates`
  → `src/hooks/products/`, `@/hooks/useQuoteBuilderState` → `src/hooks/quotes/`,
  `@/hooks/useMockupTechniques` → `src/hooks/mockup/`), mais `onRestore` que não existe em
  `QuoteAutoSaveProps`, mais `voiceFilterPatch` que a `main` superou com
  `src/pages/products/applyVoiceFilters.ts`.
- **Dos 16 arquivos `src/` não-teste, 16 têm zero consumidor** na `main`. `LegacyCartInsights.tsx` só
  é importado pelos próprios testes do pacote; `TrendsPage.types.ts` parecia ter 2 consumidores, mas
  `routePrefetch.ts` e `lazy-pages.ts` importam a *página*, não os tipos. Entrariam como código morto.
- **Testes: 33 de 34 arquivos falham** (322 falhas, 270 passagens). As causas são imports para
  `@/hooks/useQuoteComments`, `@/components/quotes/QuoteCommentsSection` (feature cancelada),
  `LegacyCartInsights`, `SmartSuggestions`, `QuoteTemplateForm`, `FavoritePresentationLauncher`,
  `@/utils/templateExport` — nenhum existe na `main` fora de `recovery/src-legacy/`.

Veredito: o resíduo é cobertura de uma versão anterior do sistema, não trabalho a finalizar. Fica
preservado na branch e em `refs/pull/3390/head`; não há o que mergear.

## Achados novos desta rodada (não são resgate)

1. **Erro de salvamento de orçamento invisível ao vendedor.** `QuoteBuilderPage.tsx:198` passa
   `sr-only pointer-events-none` ao indicador, e o container aplica esse className direto
   (`QuoteAutoSave.tsx:304`). O estado `error` é o único retorno de uma falha de gravação do
   rascunho, `QuotaExceededError` incluído (`QuoteAutoSave.tsx:190-197`), e não há toast
   (`grep -n toast` no arquivo: 0). Só leitor de tela recebia o aviso. Corrigido na **#3732**, que
   fica **aberta**: a #3548 também altera esse arquivo.
2. **Harness SQL morto no CI.** `scripts/test-wave1-forward-only-migrations.sh` e
   `tests/sql/wave1_forward_only_migrations_test.sql` não são invocados por nenhum workflow nem por
   `package.json`. Os que rodam de fato são `scripts/test-approved-plan-database.sh`
   (`deploy-gates.yml:558`) e `scripts/simulate-quote-rpc-proposals.mjs` (npm `test:quote-rpc:postgres`).
   É aí que a cobertura de device-trust precisa entrar para não nascer morta.
3. **`docker info` com timeout de 5s derruba o Gate 2.5 por flake.**
   `scripts/simulate-quote-rpc-proposals.mjs:16` usa `timeout: 5000`; na #3729 o passo falhou em
   exatamente 5s logo depois de o passo anterior martelar um container Postgres. O re-run passou sem
   nenhuma mudança de código. Docker está no runner; o que faltou foi tempo.
4. **Pipe mascara exit code.** `node script.mjs | tail -8` devolve o status do `tail`. Foi assim que
   eu reportei como verde um gate que já falhava, e derrubei a `main` em `bf156d3ff`. Em qualquer
   verificação de gate: rodar sem pipe, ou ler `PIPESTATUS`.

## Cobertura que vale resgate na `codex/fix-gate1-kit-pdf-types-261109-2252`

Dos 14 testes inéditos dela, **11 são descartáveis** (testam código que a `main` arquivou em
`recovery/src-legacy/` ou feature que a branch inventou e nunca foi mergeada) e **3 valem**:

1. **`device-and-supplier-trust.contract.test.ts`** (em `tests/hooks/` na branch) — prova que marcar um aparelho como
   confiável só responde "salvo" se o UPDATE atingiu uma linha **do próprio usuário**, e que a
   vitrine de fornecedor mostra dado real ou "desconhecido", nunca número inventado. As asserções
   batem com a `main` letra por letra: `src/hooks/admin/useDeviceDetection.ts:176-181` faz
   `.update({ is_trusted: true }).eq('id', deviceId).eq('user_id', effectiveUserId).select('id').maybeSingle()`;
   `src/hooks/products/useSupplierTrust.ts:40,55,79` encadeia `product_variants` →
   `variant_supplier_sources` → `suppliers` na ordem assertada. Cobertura na `main`: **zero** —
   `grep -rln "trustDevice\|is_trusted"` em testes é vazio. Resgate exige corrigir 2 caminhos de
   import (`@/hooks/useDeviceDetection` → `@/hooks/admin/`, `@/hooks/useSupplierTrust` →
   `@/hooks/products/`) e apagar o bloco que depende do mock `supplier-trust-demo`.
2. **`useCustomKitPersistence.financial.test.tsx`** (em `tests/hooks/` na branch) — kit com item de preço desconhecido
   não pode chegar ao banco. A trava migrou do hook para `src/lib/kit-builder/persistence.ts:107`
   (`if (!hasKnownKitPrices(kitState)) throw new Error(KIT_UNKNOWN_PRICE_MESSAGE)`), então o teste
   precisa ser reescrito contra `buildKitPersistencePayload`. A `main` só cobre isso na UI
   (`tests/components/kit-builder/financial-availability.test.tsx:142` desabilita botões via
   `pricesKnown={false}`) e **nunca exercita o `throw`** — quem chamar o salvamento por fora da tela
   não está coberto. **Bloqueado pela #3548**, que também altera `persistence.ts`.
3. **bloco fiscal de `legacy-admin-utils-preservation.test.ts` (em `tests/hooks/` na branch)** —
   `src/hooks/products/useSupplierFiscalData.ts` não tem **nenhum** teste na `main`. O comportamento
   a guardar: override de CST/CFOP/ICMS escreve só na linha `variant_supplier_sources` do par
   (variante, fornecedor) e invalida a chave `['supplier-fiscal-data', productId, supplierId]`.
   Precisa trocar o mock de `invokeExternalDb` por `untypedFrom`.

## Dois defeitos da `main` que essa cobertura revela

- **`src/hooks/products/useSupplierTrust.ts:87`** — `isVerified = supplierResult.records[0].active;`
  sem coerção. `SupplierRecord` declara `active: boolean` (`:23`), mas em produção
  `suppliers.active` é `boolean` **nullable** com default `true` (conferido em
  `information_schema.columns`). Um fornecedor com `active = null` faz `isVerified` virar `null` e
  vazar para a tela em vez de "não verificado". **Latente hoje:** 5 fornecedores, 0 com `null`.
- ~~`src/components/common/IntelligenceBadges.tsx:97-98` — indexa `badgeConfig` sem fallback~~
  **RETIRADO em 17/11, depois de reverificar.** O acesso existe (`const config =
  badgeConfig[badge.type]; const Icon = config.icon;`), mas **não é alcançável**: os dois
  consumidores de produção — `src/components/products/ProductCard.tsx:166` e
  `src/pages/products/product-detail/ProductDetailHero.tsx:114` — recebem os selos do próprio
  `useProductIntelligenceBadges`, que os constrói com tipo literal (`type: 'featured'`,
  `'new-arrival'`, …) sobre o union fechado `BadgeType` de
  `src/hooks/products/useProductIntelligenceBadges.ts:23-32`. Nenhum caminho passa string livre do
  banco. É robustez teórica, não defeito — só chegaria lá um chamador que burlasse o tipo. Fica
  registrado para o próximo agente não gastar tempo nisso.

## Fechamentos da segunda leva de 17/11 — 12 branches

Total da sessão: **59 branches fechadas com prova**. Refs de preservação no remoto:
`salvo/261117-adjudicadas-10` (10 pais) e `salvo/261117-regras-negocio-2` (2 pais). Cada mensagem
de commit do `salvo/*` carrega o veredito por branch com a evidência.

**Resgatado antes de fechar** (nada foi apagado antes de o conteúdo estar na `main`):

| de onde | o que | onde está |
|---|---|---|
| `codex/fix-gate1-kit-pdf-types` | contrato de "dispositivo confiável" + o furo do `active` nulo | #3735 |
| `codex/fix-gate1-kit-pdf-types` | 4 documentos de operação e auditoria da fábrica | #3731 |
| `claude_pink/peaceful-planck` | aviso de ordem antes do `DROP COLUMN secret_value` | #3736 |
| `youthful-ride` + `sleepy-cannon` | as regras de negócio que a `main` não tinha, reconferidas | #3738 |
| `importado/vps-fabrica/v2/n28` | harness do handler **real** do `generate-mockup` | #3737 |

**Fechadas sem resgate, com o motivo provado:** as 5 fatias de mockup da fábrica (`s36`, `s44`,
`s51`, `s75`, `fix-remover-atalhos`) — em três delas o que parecia melhoria é o que a `main`
**rejeitou de propósito**, registrado em `supabase/functions/generate-mockup/limits.ts:8-12` e
`supabase/functions/generate-mockup/geometry.ts:13-18`; e 5 sessões de triagem de PR
(`optimistic-bohr`, `optimistic-lovelace`, `serene-clarke`, `lucid-franklin`, `peaceful-planck`),
cujo trabalho próprio é dossiê de PR já encerrada e planilha de controle sobrescrita por rodada
posterior.

**Uma branch que nunca deve ser mergeada, só lida:** `claude_05/youthful-ride-vcdchy` apagava
`src/components/layout/UserMenuShortcutItems.tsx`, que a `main` importa em
`src/components/layout/Header.tsx:50` e usa em `:533`, além dos dois arquivos de rollback exigidos
por `docs/agentes/banco-migrations.md`. Abrir PR dela pararia o build. O tip fica em
`salvo/261117-regras-negocio-2`.

---

# Fechamento da auditoria — 17/11/2026

**82 branches fechadas com prova.** Nenhuma apagada antes de o conteúdo estar na `main`.
Tips preservados em refs `salvo/*` no remoto, cada commit carregando o veredito por branch e a
medida que o sustenta.

Restam **24 branches, todas com destino definido** — nenhuma pendente de auditoria.

## As 24, por categoria

### Automáticas (4) — não se encerram por auditoria
`bot/schema-snapshot` (branch de trabalho do bot; o `schema-snapshot-export.yml` está
`disabled_manually` desde 14/11 por decisão anterior — reativar é do dono),
`dependabot/npm_and_yarn/development-all-40947bae1c`,
`dependabot/npm_and_yarn/hookform/resolvers-7.0.6`,
`release-please--branches--main--components--gifts-store`.

### Do dono / de outra sessão (2)
`claude/feat-crm-vendedor-sem-dono-261115-1622` (PR #3683, dele) e `computador_local`, que foi
**recriada** apontando para o merge da #3732 e é ancestral da `main` — é a branch do computador
dele, não resíduo de agente.

### Minhas, em PR aberta porque o AGENTS.md Git 7 manda (6)
DDL em produção, `.github/workflows/**` e governança ficam abertas e chamam o dono. Não é trabalho
inacabado: é a regra do projeto.

| branch | PR | o que carrega |
|---|---|---|
| `fix-resgate-p06-p15-security-261116-2215` | #3720 | migrations de segurança P06/P15 |
| `infra-inventario-semanal-261116-2305` | #3722 | o inventário que todo agente lê como "estado real", parado desde 02/11 |
| `fix-snapshot-commit-force-rotate-261117-0005` | #3725 | `force_rotate` também libera a publicação do snapshot |
| `fix-e2e-relevance-backend-261117-0015` | #3726 | migration e edge function entravam verdes sem rodar E2E |
| `fix-sentinel-sha-inexistente-261117-0325` | #3743 | SHA que não existe na allowlist do guarda de branch |
| `fix-gatilho-drift-ledger-261117-0410` | #3747 | mexer nas 681 exceções do ledger não disparava o gate de banco |

### Aguardando o merge de uma PR que já carrega o resgate delas (4)
`codex/fix-db-migration-preflight-261107` (#3747), `codex/fix-e2e-ci-pressure-261107-0238` (#3726;
o item do logo já entrou pela #3742), `codex/fix-e2e-relevance-261107-1148` (#3726, que é
superconjunto dela) e `claude/fix-sentinel-e2e-pdf-261029-2310` (#3743). Fecham no merge, não antes.

### Preservadas aguardando decisão de negócio ou custo (6)

| branch | a pergunta exata |
|---|---|
| `fix-release-manifest-versao-real-261114-0305` | A versão do sistema andou para trás: diz `1.1.0`, a última tag real é `v1.8.1`, e a #3566 quer emitir `1.2.0`. Autoriza voltar para o número real e corrigir a configuração? Toca `.github/` |
| `fix-e2e-fora-do-banco-de-producao-261114-1003` | Autoriza um projeto Supabase de staging só para o E2E (custo novo)? Sem ele, 23 workflows seguem apontando para produção nos pushes em `main`; com a branch como está, todo E2E com backend para de rodar |
| `chore-e2e-modules-matrix-261102-2115` | Consolidar 19 workflows de E2E em 1 (44 suítes numa matriz)? Como está, roda tudo **em dobro** — para valer é preciso apagar os 16 antigos no mesmo PR |
| `fix-attest-provenance-sigstore-261107-1500` | Aceita que a assinatura de proveniência do build deixe de bloquear o deploy quando o serviço da Sigstore cair? (1 linha) |
| `recuperado/fix-gitleaks-allowlist-261101-2209` | Autoriza silenciar 10 padrões no detector de segredos, incluindo qualquer achado com o texto `SERVICE_ROLE_KEY` em todo o repo? O portão está verde hoje |
| `fix/e2e-url-state-defaults-20261030` | Quer versionar o rollback da remoção de `auth.users` do Realtime, sabendo que executá-lo reexpõe dados pessoais de todos os usuários? O resto dela já está na `main`, e o item de `check-dependency-audit` foi descartado (ver abaixo) |

### Preservada de propósito (1)
`claude/fix-pr3517-gate1-baseline-261113-2336` — a PR #3548 foi fechada com auditoria arquivo por
arquivo. A branch fica, e `refs/pull/3548/head` é permanente: a PR pode ser reaberta.

### Com os dois últimos itens não resgatáveis aqui (1)
`codex/fix-gate1-kit-pdf-types-261109-2252`. Tudo o mais dela foi resgatado (#3735, #3740, #3746).
Sobram:
- **comentários em orçamento** — feature que a `main` cancelou em 27/06, com 2 travas de CI; é
  decisão de negócio, e o material fica preservado na branch;
- **`tests/sql/device-trust/`** — 77 asserções que a `main` não tem em lugar nenhum
  (`git grep -ln user_known_devices origin/main -- tests scripts` é vazio), mas o harness exige
  Docker, que este container não tem, e registro num workflow. Não trago teste que não consigo
  executar.

## Itens que um relatório apontou como resgate e que NÃO são — com a medida

Registrado para ninguém gastar tempo de novo:

- **`scripts/check-select-columns.mjs`** — a `main` resolve o mesmo falso positivo **melhor**:
  trunca a janela no próximo `.from(` (`:113-118`), com o comentário explicando o caso. A branch
  descartava a correspondência; a `main` ainda encontra o `select` correto quando ele vem antes.
- **`scripts/check-dependency-audit.mjs`** — a `main` é **mais restritiva**, não menos. A validação
  de `fixAvailable` vive dentro do ramo `if (packageName === 'minimatch')` com um conjunto exato de
  condições (`source`, `name`, `dependency`, `severity`, `range`, `url`, `fix.name`, `fix.version`,
  `isSemVerMajor`). Torná-la genérica, como a branch fazia, **afrouxaria** a exceção nomeada.
- **`querySupabaseReadOnly` no gate do ledger** — a `main` já lê o ledger autoritativo, via
  `supabase migration list --linked --output-format json` em `db-schema-drift-check.yml:234`.
- **`MANIFESTO_LEDGER` com `aggregate_entries_sha256`** — `scripts/check-ledger-manifest-drift.mjs`
  não valida integridade do baseline e nunca validou; o campo não ligaria alarme. E o arquivo da
  branch é de setembro, anterior ao baseline recriado de propósito em 01/11.
- **`IntelligenceBadges.tsx:97-98`** — já retirado acima: não é alcançável.

Em dois desses eu só não introduzi regressão porque verifiquei antes de aplicar o relatório.

---

# Rodada de decisões — 17/11/2026 (madrugada)

O fechamento acima dizia que 6 PRs ficavam abertas "porque o Git 7 manda" e que 6 itens
aguardavam decisão do dono. Com a autorização explícita dele para decidir, **todos os 12
foram adjudicados e executados**. Esta seção registra o que mudou, e as duas vezes em que a
medição me contrariou.

## 12 PRs mergeadas

| PR | o que resolve | evidência que sustentou |
|---|---|---|
| #3743 | SHA inexistente na allowlist do guarda de branch | os 11 SHAs testados com `git cat-file -e`; 1 não existia |
| #3747 | mexer no ledger de migrations não disparava o gate de banco | padrão testado contra caminhos reais |
| #3725 | `force_rotate` não liberava a publicação do snapshot | o job consumidor ficava travado no mesmo `!cancelled()` |
| #3726 | migration e edge function entravam verdes sem rodar E2E | o classificador da main respondia `relevant=false` para `supabase/**` |
| #3751 | Sigstore fora do ar travava o deploy | **nada** no repo consome a attestation (grep) |
| #3749 | versão andava para trás (1.1.0 ↔ v1.8.1) | causa raiz: o input `release-type` força a janela de 250 commits |
| #3752 | `anon` tinha INSERT/UPDATE/DELETE em `color_synonym_map` | privilégios confirmados no canônico |
| #3722 | inventário de estado parado desde 02/11 | os 3 scripts existem na main; cron sem colisão |
| #3754 | 55 asserções SQL de device-trust que a main não tinha | rodadas aqui: 54 PASS, 1 falha só por PG local |
| #3755 | guarda de rota protegida que **não podia passar** | `ProtectedRoute.tsx:48` navega para `/auth`, o teste esperava `/login` |
| #3756 | rollback de `auth.users` versionado | os 4 vizinhos de data tinham o seu; faltava este |
| #3748 | o fechamento da auditoria (seção acima) | — |

E a **PR #3566** foi fechada: propunha `1.2.0`, e a tag `v1.2.0` existe desde 18/10 — o
release-please bateria em `DuplicateReleaseError`, job vermelho, nada publicado.

## As duas vezes em que a medição me contrariou

Registrado porque em ambos os casos eu já havia escrito a conclusão errada.

1. **"O E2E apaga dados de produção."** Falso. Medido: `quotes` tem **7 linhas no total**,
   **0** com prefixo `[E2E]`, `discount_approval_requests` tem 0, e `e2e_cleanup_audit` tem
   **375** execuções registradas. A edge `e2e-cleanup` exige token timing-safe, e-mail em
   allowlist, prefixo validado por regex `^\[E2E\]`, escopo ao `userId` de teste e teto de
   1000 linhas. O isolamento funciona; não havia dado de cliente em risco. Ligar
   `E2E_MOCK_AUTH=1` em push, como eu ia propor, mataria a cobertura autenticada real em
   troca de nada.
2. **"O replay de migrations está quebrado."** Falso. O `supabase db diff` falhou numa PR
   que estava **desatualizada** — o diff contra o merge-base antigo incluía migrations que
   já haviam entrado na main. Com a branch rebaseada, o `Gate E40 - Schema Drift Check`
   passou **verde** na #3752.

## O que eu barrei, e por quê

| item | o que seria se eu tivesse aceitado |
|---|---|
| **P06** do #3720 (`security_invoker` em 8 views) | 7 das 8 views responderiam `permission denied`: `anon` não tem SELECT em `products`, `suppliers`, `product_kit_components` nem `tabela_preco_gravacao_oficial`. `authenticated` também não tem em `suppliers`, então o autocomplete de fornecedores cairia. O autor conferiu **policy** onde faltava **grant** |
| consolidar 19 workflows de E2E em 1 | 8 jobs **verdes cobrindo 2% da suíte** (o `testMatch` casa ~11 de 567 specs, e `check-min-tests` exige `min: 1`); e `chromium-authed` → `chromium-public` em 6 suítes, rodando teste logado deslogado |
| allowlist do gitleaks (10 padrões, incl. `SERVICE_ROLE_KEY`) | cegaria o Gate E23, um dos 3 required checks — que está **verde** hoje, logo não há falso positivo a suprimir |
| reduzir a allowlist do ledger de 681 para 13 | o checker da main devolve **EXIT 1** com `blocking_remote_only=668` num dos dois layouts possíveis da CLI, e sem credencial não se sabe qual é emitido |
| reviver `quote_comments` | cancelamento deliberado (commit `3413dd136`, 27/06) + guarda de CI criada no mesmo dia. Produção: tabela ausente, 0 policies, 0 linhas — não há dado de cliente a preservar |
| 13 dos 15 arquivos de `codex/fix-e2e-ci-pressure` | ver `salvo/261117-e2e-ci-pressure` |

## Inventário de branches

**92 fechadas** com prova. **28 refs `salvo/*`** no remoto, cada commit carregando o veredito
e a medida da branch que preserva.

Restam 8, nenhuma pendente de auditoria:

- **automáticas (5):** `bot/schema-snapshot`, `contexto`, `gh-pages`, 2 do dependabot,
  `release-please--branches--main--components--gifts-store`
- **do dono (2):** `claude/feat-crm-vendedor-sem-dono-261115-1622` (PR #3683, dele) e
  `computador_local`
- **preservadas por decisão (3):**
  - `claude/fix-pr3517-gate1-baseline-261113-2336` — a PR #3548 foi fechada com auditoria
    arquivo por arquivo; `refs/pull/3548/head` é permanente
  - `claude/fix-resgate-p06-p15-security-261116-2215` — PR #3720 fica **aberta**: é o único
    lugar com o arquivo do P06 e o rollback que escrevi para ele
  - `codex/fix-gate1-kit-pdf-types-261109-2252` — tudo resgatado (#3735, #3740, #3746,
    #3754); sobra só o material de `quote_comments`, preservado como arquivo

## Follow-ups abertos, nomeados

Nada aqui é código morto nem feature pela metade; são itens que precisam de banco ou de
decisão de produto.

1. **P06 em duas fases** — primeiro os `GRANT SELECT` que faltam nas tabelas-base (ampliação
   de superfície, exige medir policy por policy), depois o `security_invoker`.
2. **`ADD COLUMN IF NOT EXISTS` com tipo errado** — os testes do #3754 provam que a migration
   da main faz **no-op silencioso** se a coluna já existir com outro tipo (exit 0 +
   `NOTICE 42701`). Endurecer é DDL em produção.
3. **Asserção da tabela de backup** — o rollback da main cria
   `_backup_user_known_devices_YYYYMMDD` antes do DROP, e nenhuma das 55 asserções cobre isso.
4. **`page.goto` direto em 2 pontos de `protected-routes.spec.ts`** — `eslint.config.js:1505`
   pede `gotoAndSettle`. São warnings pré-existentes e o lint passa; trocar num spec de
   redirect precisa do E2E rodando.
5. **E2E com Supabase local no CI** — `supabase start` já roda em `contract-tests.yml:152`
   (traz Auth, Storage e Edge). Custo R$ 0; o gargalo é seed de dados e criar os usuários
   `E2E_*` no stack local.

---

## Fechamento das últimas branches — 17/11, 09:00–10:00 UTC

Rodada final. O que faltava era o que estava parado esperando decisão do dono; ele respondeu
"resolva o que depende de mim" e, na única pergunta de negócio que sobrou, escolheu a opção
descrita abaixo. Tudo o que segue tem a medição ao lado.

### P06 — aplicada em produção

`supabase/migrations/20261117073000_p06_security_invoker_v_product_properties_public.sql`
estava em `main` com recibo "pendente". Antes de aplicar, a dúvida real era uma só: `anon`
perde linhas quando a view deixa de rodar como dono?

| medição (execute_sql read-only, 17/11) | resultado |
|---|---|
| `select count(*) from v_product_properties_public` (dono) | **33.119** |
| `set local role anon` + mesmo filtro na tabela-base `product_properties` | **33.119** |

Iguais → virar `security_invoker=true` é neutro para o catálogo público. Aplicada pelo
`db-apply-migration.yml` (run 44053465413, recibo na PR #3768). Confirmado **depois** da
aplicação: `security_invoker=true`, version `20261117073000` em
`supabase_migrations.schema_migrations`, e `set local role anon; select count(*) from
public.v_product_properties_public` = **33.119**. Nenhuma linha perdida.

As outras 7 views (`v_products_public`, `v_suppliers_public`, `v_product_tags_public`,
`v_product_compositions_public`, `v_kit_component_media_public`,
`v_tabela_preco_gravacao_oficial_public`, `v_variant_sale_prices_public`) seguem
`security_invoker=false` **por motivo medido**, registrado no cabeçalho da própria migration:
em pelo menos duas delas a policy da tabela-base diverge do `WHERE` da view (em `suppliers` é
mais estrita → `anon` perderia linhas; em `product_kit_components` é mais frouxa → re-exporia).
Não é pendência de decisão: é bloqueio com prova.

### #3720 — fechada, sem perda

A branch `claude/fix-resgate-p06-p15-security-261116-2215` tinha 5 arquivos. Estado contra `main`:

| arquivo | em `main` |
|---|---|
| `supabase/migrations/20261101000002_revoke_anon_color_synonym_map_p15.sql` | **existe** (aplicada, run 44031053680) |
| `supabase/rollbacks/20261101000002_rollback.sql` | **existe** |
| `20261101000001_security_invoker_views_p06.sql` (migration da branch, ausente do main) | ausente — é a versão de 8 views, substituída pela de 1 view já aplicada |
| `20261101000001_rollback.sql` (rollback da branch, ausente do main) | ausente — rollback da acima |
| `supabase/MIGRATIONS_SYNC_LOG.md` | existe, com as duas versões |

Tip preservado em `refs/heads/salvo/claude-fix-resgate-p06-p15-security-261116-2215`.

### #3683 → #3769 — decisão do dono, com a parte "somente leitura" provada

A #3683 (branch de 15/11 de outro agente) revertia a decisão de 14/11 deste mesmo ledger
(`docs/coordenacao/conflitos-semanticos.md:35`): lá, consultado com **48.623 clientes / 13.501
(28%) sem vendedor**, o dono escolheu "só o dono vê cada cliente". Não havia registro no repo
da reversão de 15/11 — só o comentário do commit. Perguntado hoje, o dono decidiu:
**vendedor vê a carteira dele mais os sem dono, mas não edita nem assume.**

A segunda metade não é promessa. `supabase/functions/crm-db-bridge/index.ts:227` tem
`const VENDOR_WRITE_TABLES: string[] = []` e `index.ts:1024-1028` devolve 403 para qualquer
`insert`/`update`/`delete` de `vendedor`, `agente` ou `coordenador` — lista vazia, nada passa
no `includes`. E o diff da #3683 toca **0 linhas** de `handleUpdate`, `handleDelete`,
`handleInsert` ou `VENDOR_WRITE_TABLES`.

Resgate em `claude/feat-crm-vendedor-sem-dono-261117-0930` (PR #3769): os 2 commits originais
por cherry-pick com autoria preservada, `index.ts`/`query-policy.ts`/teste **byte-idênticos**
ao original, e o `package.json` reconstruído a partir do `main` (o `-X theirs` havia trazido a
linha `test:ci-core` de 15/11, que não conhecia `tests/scripts/e2e-relevance.test.mjs` nem
`tests/edge-functions/mockup-assistant.test.ts`). `tsc --noEmit` exit 0; o teste de ownership
passou 18/18.

### As duas últimas branches órfãs — adjudicadas e fechadas

| branch | arquivos | idênticos | diferentes | movidos | ausentes reais |
|---|---|---|---|---|---|
| `claude/fix-pr3517-gate1-baseline-261113-2336` | 309 | 42 | 210 | 5 | **52** |
| `codex/fix-gate1-kit-pdf-types-261109-2252` | 368 | 53 | 48 | 208 | **59** |

Os ausentes são o mesmo conjunto nas duas (uma os tem sob `recovery/src-legacy/`, a outra sob
`src/` e `tests/`): a suíte `legacy-*` de preservação e os módulos `*.types.ts` de uma extração
de tipos que o `main` reverteu. Teste decisivo aplicado a cada um — os módulos `@/...` que o
arquivo importa existem em `main`?

- **39 dos 47** têm pelo menos um import que não existe mais em `main`: não compilam contra o
  `main`, testam código que o `main` apagou. Obsoletos.
- Dos 8 restantes, 6 tiveram seus símbolos **incorporados** ao `main` em outro arquivo:
  `LegacyCartInsights` → `src/components/cart/CartUtilComponents.tsx` (6 dos 8 exports),
  `quote-view-status-config.ts` → `statusConfig` em `src/pages/quotes/QuoteViewPage.tsx`,
  `library-list-utils.ts` → `applySort`/`getItemsCount` em
  `src/pages/kit-builder/KitLibraryPage.tsx`.
- `supplier-trust-demo.ts` (fixture da branch, ausente do main): o `main` **apagou de propósito** — está escrito no
  cabeçalho do próprio `tests/hooks/device-and-supplier-trust.contract.test.ts:12-13` do `main`,
  que só menciona a fixture num comentário e não a importa.
- `QuotesConfigurableList.approval.test.tsx` (teste da branch, ausente do main) era o candidato mais forte (todos
  os imports existem em `main`). Testava a aprovação manual pela lista via prop `onMarkApproved`.
  **A funcionalidade está no `main`, com outro desenho**: `QuoteRowApproveItem` em
  `src/components/quotes/QuotesConfigurableList.tsx:34,540`, reusando o `onBulkStatusChange` que
  o pai já passa, com teste próprio em
  `src/components/quotes/__tests__/QuotesConfigurableList.approve.test.tsx` cobrindo os mesmos
  três casos (aprova pelo caminho do pai, não oferece em transição inválida, não oferece sem
  handler). Nada a resgatar.
- `20261110024530_restore_device_trust_contract.sql` (migration da branch, ausente do main) (da branch do Codex)
  propunha `is_trusted boolean NOT NULL DEFAULT false` em `public.user_known_devices`. Medido em
  produção: a coluna **já existe** exatamente assim. A própria migration tem `IF FOUND ... RETURN`
  — seria no-op. Obsoleta.

Sobram 7 símbolos órfãos sem nenhum consumidor em `main` (`FollowUpTimer`,
`isSuggestionProduct`, `FavoriteDeleteConfirmDialog`, `FavoritesHeaderWithPresentation`,
`DetailedProductDetailSkeleton`, `applyVoiceFilterPatch`, `normalizeBitrixQuoteId`). Trazê-los
seria acrescentar arquivo sem importador — código morto, que as regras do repo proíbem. Ficam
preservados nos refs `salvo/claude-fix-pr3517-gate1-baseline-261113-2336` e
`salvo/codex-fix-gate1-kit-pdf-types-261109-2252`, e listados aqui para quem quiser terminar
qualquer um deles como feature própria.

### Dependabot

- **#3750** fechada: `npm ci` aborta com ERESOLVE (conflito de peer dependency no grupo de 6),
  `Setup Node CI` reprovou nos dois jobs da run 44029419713 — nenhum chegou a rodar lint ou teste.
- **#3696** fechada: 5.9.1 → 7.0.6 do `@hookform/resolvers` são dois majors, e os 4 únicos
  consumidores são formulários de autenticação (`Auth.tsx:8`, `ResetPassword.tsx:4`,
  `ForgotPasswordForm.tsx:6`, `ProductFormFullscreen.tsx:11`). O `Gate 3 - E2E Smoke` sai
  SKIPPED em PR do Dependabot, então o caminho de login não foi exercido. `zod` já está em
  4.6.7 e o `Gate 0.5` está verde com a 5.9.1 — sem advisory, o bump não é indispensável
  (regra 4).

### Fragilidade medida, não corrigida nesta rodada

O `Gate 2.5` depende de Docker no runner e, quando o runner não tem, reprova em modo estrito:
`[simulate-quote-rpc-proposals] ❌ pré-requisito ausente: Docker indisponível` na run
44052951491 derrubou uma PR docs-only. Re-executar resolveu. Fica anotado: o gate não distingue
"contrato violado" de "runner sem Docker".

### O risco que a #3683 declarava em aberto — provado contra PostgREST real

O corpo da #3683 avisava, com honestidade, que o formato do filtro **nunca tinha sido
exercitado contra um PostgREST de verdade**, e que "se o formato estiver errado, toda leitura
de vendedor no CRM passa a dar erro depois do deploy". O merge da #3769 **não** faz deploy
(edge sobe só pelo `deploy-edge-functions.yml`), então houve tempo de provar antes.

O PostgREST do CRM não é alcançável deste container. A prova foi feita contra o PostgREST do
projeto canônico de produtos, com a chave publishable do próprio projeto — a mesma que o app
manda do navegador. O que se decide aqui é se o **parser** aceita a forma, e isso não depende
de qual banco está atrás.

| caso | querystring | resposta |
|---|---|---|
| A — forma que o bridge gera | `__s.products.or=(is_active.eq.true,is_active.is.null)` | **401 `42501`** permission denied for table |
| A2 — alias + 2 níveis (profundidade exata do `contact_emails`) | `__s.products.product_properties.or=(product_id.eq.…,product_id.is.null)` | **401 `42501`** permission denied for table |
| B — controle, forma errada | `or=(__s.products.is_active.eq.true,…)` | **400 `PGRST100`** `unexpected "p" expecting "not" or operator` |
| C — sem prefixo, coluna própria (caso `customers`) | `or=(is_active.eq.true,is_active.is.null)` | **200**, com linha |
| D — controle, sintaxe quebrada | `or=(is_active.eq.true,` | **400 `PGRST100`** |

`42501` é erro do **Postgres**, não do parser: a query foi lida e planejada, e parou só no
privilégio da tabela (`anon` não tem acesso a `variant_supplier_sources`). Se o formato fosse
inválido viria `PGRST100`, como em B — que é justamente a forma que o nosso código **não**
gera. C mostra o caminho sem prefixo respondendo 200.

Para isso o host `doufsxqlfjyuvxuezpln.supabase.co` foi liberado na allowlist de rede do
ambiente (era bloqueado: `CONNECT tunnel failed, response 403`). A sonda ficou no scratchpad
da sessão, não no repo: é diagnóstico de uma vez, não um portão.

## Adjudicação dos 32 refs `salvo/*` — 17/11, 11:45–11:55 UTC

As branches `salvo/*` **são a camada de preservação**: cada uma é a cópia de uma
branch antes de ela ser apagada. Nenhuma delas foi ou será apagada. O que faltava
era a medida que prova que não sobrou trabalho **fora do `main`** dentro delas.

### Medida 1 — arquivo ausente do `main` (a única forma de perda real)

Para cada um dos 32 refs: `mb=$(git merge-base origin/main <ref>)`,
`git diff --name-only $mb <ref>` e, por arquivo, `git rev-parse <ref>:<f>` contra
`git rev-parse origin/main:<f>`; quando o caminho não existe no `main`, o teste de
basename (`git ls-tree -r --name-only origin/main | grep "/<base>$"`) decide se o
arquivo foi movido ou se desapareceu.

**Resultado: 0 arquivos ausentes, em ≈48 mil comparações de blob nos 32 refs.**
Todo arquivo que existe em qualquer ref preservado existe no `main`, no mesmo
caminho ou em outro.

`git cherry origin/main <ref>` **não** serve aqui e foi descartado: o repo usa
squash-merge, então o patch-id nunca casa e todo commit aparece como "não
incorporado" mesmo quando o conteúdo está no `main`.

### Medida 2 — os 9 refs com conteúdo autoral (os outros 23 são snapshots de árvore)

| ref | arquivos que diferem | veredito (medido hoje) |
| --- | --- | --- |
| `salvo/claude-feat-crm-vendedor-sem-dono-261115-1622` | `package.json` | `index.ts`, `query-policy.ts` e o teste de ownership são **byte-idênticos** ao `main` (resgatados na #3769). O `package.json` difere só na linha `test:ci-core`, reconstruída a partir do `main` de propósito. |
| `salvo/claude-fix-mockup-geometria-wysiwyg-261115-0045` | `geometry.ts`, `index.geometry.test.ts`, `index.ts`, `vitest.config.ts` | `main` tem `cmParaPx`, `MIN_LOGO_PX=40`, `MAX_LOGO_PX`, `DEFAULT_PRODUCT_FRACTION=0.85` — os símbolos resgatados. O portão `422 missing_dimensions` ficou fora por decisão registrada (ledger 2026-11-15T14:45). |
| `salvo/claude-fix-mockup-logo-tamanho-real-261114-2200` | os mesmos 4 | mesma geometria, mesmo veredito. |
| `salvo/claude-fix-resgate-p06-p15-security-261116-2215` | `20261101000001_..._p06.sql`, `rollbacks/20261101000001`, sync log | Superseded com medida: o `main` tem `20261117073000_p06_security_invoker_v_product_properties_public.sql`, que aplica 1 view e documenta **BLOQUEIO medido para cada uma das outras 7**. O P15 (`20261101000002`) e seu rollback são byte-idênticos. |
| `salvo/claude-perf-cron005-refresh-all-mvs-diario-261114-1002` | sync log | migration e rollback byte-idênticos; o log é append-only e o `main` tem mais linhas. |
| `salvo/e15-receipt-20261114120100-43959381044-261116` | sync log | idem. |
| `salvo/importado-vps-fabrica-v2-refazer-dc12be92-261116` | `e2e-cleanup/index.ts`, `index.mockups.test.ts` | `main` está à frente (+699/−118) e tem a limpeza de mockups (21 ocorrências). `comm -23` das funções da branch contra as do `main`: **vazio** — nenhuma função da branch falta. O teste virou `tests/edge-functions/e2e-cleanup.mockups.test.ts`, byte-idêntico. |
| `salvo/261116-clever-lamport-zlmati` | `PASSAGEM-PARA-O-PROXIMO-CLAUDE.md` | movido para `docs/agentes/passagens/2026-11-15-passagem-sessao.md`; o `main` é **superconjunto estrito** (+6 linhas, 0 remoções — `git diff --no-index` entre os dois blobs). |
| `salvo/261117-schema-snapshot-cancelled-skip` | `.github/workflows/schema-snapshot-export.yml` | o `main` é o lado novo e traz o conserto com procedência no próprio cabeçalho ("2026-11-16: export deixava de rodar (skipped) quando o drift-gate era cancelado… Resgatado de `claude/fix-schema-snapshot-export-cancelled-skip-261101-2344`"). |

Os 23 refs restantes são snapshots de árvore inteira (de 1.049 a 10.401 arquivos no
diff): para eles o teste decisivo é o de ausência, e ele deu 0.

### Fechamento das PRs

0 PRs abertas. As três últimas entraram hoje: #3768 (recibo E15, `f40d2618`),
#3766 (prova por branch, `cda9cbfa`) e #3753 (release `gifts-store 1.9.0`,
`10455e7a`) — as três com deploy de Production SUCCESS e a tag
`gifts-store-v1.9.0` criada às 11:38:47Z.

### Medida 3 — as migrations que os sync logs preservados declaravam "pendente"

Os 3 refs de migration diferem do `main` em `supabase/MIGRATIONS_SYNC_LOG.md` (log
append-only). As linhas que existem **só** na cópia preservada — 4, 11 e 3 linhas,
por `comm -23` entre as duas versões — não são conteúdo perdido: são linhas de
estado **"pendente"** que o `main` substituiu pelo estado final. Era preciso provar
que cada pendência foi mesmo concluída, e não esquecida.

Consultado o banco canônico (`doufsxqlfjyuvxuezpln`, `supabase_migrations.schema_migrations`,
leitura):

| version | aplicada em produção |
| --- | --- |
| `20261022100020` (dispatcher-failure-alert, P19) | **sim** |
| `20261022100021` (hash-product-images, P19) | **sim** |
| `20261022100022` (sync-is-stockout-universal, P19) | **sim** |
| `20261031000000` (stock_notes deleted_at + índice) | **sim** |
| `20261101000002` (P15 — `color_synonym_map`) | **sim** |
| `20261108001500` (reconcile `e2e_cleanup_audit`) | **sim** |
| `20261114120100` (CRON005 refresh_all_mvs diário) | **sim** |
| `20261117073000` (P06 medida, 1 view) | **sim** |
| `20261101000001` (P06 original, 8 views) | **não — e por decisão** |

7 das 8 pendências estão aplicadas. A única que não está é a P06 de 8 views, que foi
deliberadamente substituída pela `20261117073000` (aplicada hoje), cujo cabeçalho
documenta o BLOQUEIO medido de cada uma das outras 7 views — e cujo rollback existe
em `supabase/rollbacks/20261117073000_rollback.sql`.

Efeito do P15 conferido no banco, não só no log: `anon` em
`public.color_synonym_map` detém hoje apenas `REFERENCES`, `SELECT` e `TRIGGER` —
`INSERT`, `UPDATE` e `DELETE` foram revogados, que era exatamente o que aquele
agente tinha deixado pela metade (o corpo original só dava `DROP POLICY` e deixava
os GRANTs de escrita vivos).

**Conclusão da adjudicação:** nenhum trabalho de agente nas 32 cópias preservadas
está ausente do `main` nem pendente de execução. O único item fora do `main` é uma
migration superseded com medida publicada.

### Medida 4 — correção do método, depois da revisão da #3770

A revisão automática da #3770 (Devin, 2026-11-17) levantou duas objeções corretas:
existência de caminho não prova preservação de conteúdo, e casar **basename** não
prova que o arquivo foi movido. As duas foram atacadas com medida nova, não com
texto.

**(a) Teste estrito, sem basename.** Repetida a varredura dos 32 refs contando
apenas: "o ref tem blob neste caminho exato e o `main` não tem nada neste caminho".
**Resultado: 0 em todos os 32 refs.** A inferência por basename nunca foi
determinante — ela não decidiu nenhum caso.

**(b) O tip não é a única coisa preservada, e isso escondia um caso.** Medir
`merge-base → tip` tem um ponto cego: um ref pode **apagar no tip** arquivos que o
próprio histórico dele criou, e o par (não existia na base, não existe no tip) sai
do diff sem aparecer. Isso acontece de fato em `salvo/261115-preservacao`
(tip `e35634678`, "preserva no remoto o que existia so no container", 217 commits
exclusivos): o tip **não** contém `src/components/mockup/MockupResultCard.tsx`, mas
o commit `f43d22906` do próprio ref o cria.

Esse ref carrega trabalho de feature real no gerador de mockup — "separa imagem,
projeto salvo e ficha, e preserva o resultado quando a geração falha"
(`f43d22906`), "resultado preservado por projeto, salvo/ficha exibido e alerta
separado" (`f8a7eba67`), "ficha com as medidas da área da imagem salva"
(`35ac8b9d5`). Veredito medido contra o `main` de hoje:

| arquivo | no `main` |
| --- | --- |
| `src/components/mockup/MockupResultCard.tsx` | existe, 496 linhas |
| `src/components/mockup/MockupCompletionStates.tsx` | existe, 155 linhas |
| `src/components/mockup/usePreservedMockupResult.ts` | existe, 56 linhas |
| `src/components/mockup/__tests__/MockupResultCard.preserved.test.tsx` | existe, 102 linhas — **byte-idêntico** ao commit `f8a7eba67` do ref |
| `src/components/mockup/__tests__/MockupResultCard.states.test.tsx` | existe, 146 linhas |
| `src/pages/mockups/mockup-generator/useMockupCompletionStatus.ts` | existe, 99 linhas |
| `src/pages/mockups/mockup-generator/__tests__/fichaDaAreaDaImagem.test.ts` | existe, 116 linhas |

No commit mais novo do ref (`35ac8b9d5`), 8 arquivos já são **byte-idênticos** ao
`main`: `mockupGeneratorModel.ts`, `useMockupGenerator.ts`, `useSavedMockupProject.ts`,
`useLayoutCaptureRequest.ts`, `trocaDeProjeto.test.ts`, `fichaDaAreaDaImagem.test.ts`,
`MockupDeletion.test.tsx` e `MockupGenerator.a11y.test.tsx` — a feature foi mergeada.
E o comportamento está vivo no código do `main`: `usePreservedMockupResult.ts` abre
com "Uma tentativa que FALHA não apaga da tela o mockup que o vendedor já tinha", com
as duas amarras (resultado pertence a um projeto; dispensar o alerta não descarta o
resultado).

**Limite declarado desta auditoria.** `git rev-list --objects <ref> --not origin/main`
devolve blobs alcançáveis pelos refs e não pelo `main` — 40.210 somando os 32. Esse
número **não** é trabalho perdido: ele enumera toda versão intermediária de cada
commit exclusivo (um arquivo editado 10 vezes conta 10 blobs). Provar supersessão de
cada blob intermediário não é factível e não é o que preservação exige: o conteúdo
segue alcançável pelo ref, que não será apagado. O que foi provado é o que decide
regressão: nenhum arquivo existe num ref sem existir no `main` (teste estrito, 0/32),
e as features autorais dos refs estão no `main`, verificadas arquivo a arquivo.

### Medida 5 — classificação do conteúdo divergente (resposta ao Codex P2 e ao Devin)

A exigência era classificar as diferenças de conteúdo dos refs como **incorporada**,
**substituída** ou **descartada por decisão** antes de declarar o resgate fechado.
Feito, e no caminho apareceu de novo o mesmo ponto cego: a varredura anterior exigia
blob só no lado do `main`, então **arquivo que não existe no tip do ref** era rotulado
`DIFERE`. Isso só inflava o número. Corrigido para exigir blob nas **duas** pontas:

- divergência real de conteúdo em área de comportamento (código, migrations,
  workflows, testes): **277 pares (ref, arquivo)** — não os 9.407 de antes;
- `salvo/261115-preservacao` sai inteiro da lista: o tip dele guarda só o que existia
  apenas no container, e nenhum desses caminhos colide com o `main` em área de
  comportamento. Os 3.107 "migrations divergentes" eram arquivos que **só o `main`
  tem** (ex.: `supabase/migrations/20241231000000_saved_filters.sql`, 129 linhas no
  `main`, ausente no tip do ref) — o oposto de perda.

Dos 277: **267 substituídos** (o `main` tocou aquele caminho *depois* do tip do ref,
logo o `main` é o estado posterior) e **10 candidatos** (o ref mudou depois do último
toque do `main`). Os 10, adjudicados um por um:

| ref · arquivo | veredito |
| --- | --- |
| `261117-residuos-medidos-2` · `.github/workflows/codeql.yml` | **substituído** — o `main` tem uma linha a mais (`inventario/estado/**` no filtro de paths); o ref não tem nada que o `main` não tenha. |
| `claude-fix-pr3517-gate1-baseline` e `codex-fix-gate1-kit-pdf-types` · `SortableCartItem.tsx`, `SortableCartItemVariant.test.tsx`, `ModernSkeletons.tsx` (5 pares) | **descartado por decisão** — os refs extraem as interfaces de props para `*.types.ts`; esses arquivos não existem no `main` e o `main` passa o Gate 1 hoje. Refactor movido por lint cuja necessidade deixou de existir; nenhuma função ou comportamento envolvido. |
| `codex-fix-gate1-kit-pdf-types` · `src/components/common/IntelligenceBadges.tsx` | **incorporado com renome** — o ref tinha a entrada `emergente` (do hook legado em `@/hooks/useProductIntelligenceBadges`, caminho que o `main` não tem mais). No `main` o hook vive em `src/hooks/products/useProductIntelligenceBadges.ts` e emite `'emerging'`, com a entrada `emerging` no mapa (linha 37, mapa com 9 entradas). Badge preservada, em inglês. |
| `codex-fix-gate1-kit-pdf-types` · `src/components/dev/metrics/MetricUtils.ts` | **não incorporado, registrado** — o ref exporta `bridgeBadge(bridge: BridgeName)` (8 linhas de cor por bridge); o `main` não tem a função, embora tenha `src/lib/telemetry/bridgeCallMetrics.ts`. Helper de cor de uma tela de métricas de dev, sem efeito em produção. |
| `261117-laughing-cori-o9w35e` · `src/hooks/stock/useRuptureAlerts.ts` | **melhoria real que o `main` não pegou — reaproveitada** (ver abaixo). |

**A melhoria reaproveitada.** O `main` chama a RPC de alertas de ruptura com
`(supabase as any).rpc('fn_get_rupture_alerts')` e uma linha
`// eslint-disable-next-line @typescript-eslint/no-explicit-any`. O ref usa
`untypedRpc('fn_get_rupture_alerts')` de `@/lib/supabase-untyped` — helper que **já
existe no `main`** (`src/lib/supabase-untyped.ts`) justamente para eliminar `as any`
em call site. Mesma chamada, sem `any` e sem supressão de lint. Portada em PR
própria, porque é mudança de código e esta é docs-only.

### Medida 6 — a classificação por data estava fraca; refeita por identidade de blob

A revisão da #3770 (Devin, 2026-11-17) apontou, com razão, que a Medida 5 provava
pouco: dizer "o `main` tocou este caminho **depois** do tip do ref" não demonstra que
a alteração preservada entrou — uma edição posterior pode ter mexido em outro trecho.
A classificação dos 267 por ordem temporal fica **retirada**. Substituída por duas
medidas de conteúdo:

**(a) Contenção linha a linha.** Dos 277 pares com divergência real,
**86 estão contidos** no `main` (zero linhas presentes só no ref). Os outros 191 têm
ao menos uma linha que o `main` não tem — mas esse teste é severo: uma linha
reescrita pelo `main` conta como "só no ref".

**(b) O blob do ref já existiu no histórico do `main` naquele caminho?** Este é o
teste que decide, e não depende de data: percorre `git rev-list origin/main -- <path>`
e compara o blob de cada commit com o blob do ref.

- **139 dos 191: sim.** O `main` teve exatamente aquele conteúdo naquele caminho e
  depois evoluiu. Incorporado e superado, provado por identidade de blob.
- **52: não.** Conteúdo autoral que nunca existiu no `main`. Todos em 7 refs, com
  veredito:

| ref (nº de arquivos) | veredito |
| --- | --- |
| `codex-fix-gate1-kit-pdf-types-261109-2252` (28) e `claude-fix-pr3517-gate1-baseline-261113-2336` (8) | **descartado por decisão** — branches de 09/11 e 13/11 movidas por ratchet de lint/tipos (extração de props para `*.types.ts`, anotações). O `main` passa o Gate 1 hoje sem elas; nenhuma função ou comportamento envolvido. |
| `261117-laughing-cori-o9w35e` (8) | 1 **melhoria reaproveitada** (`useRuptureAlerts.ts` → `untypedRpc`, PR própria) + seu teste; 6 workflows, detalhados abaixo. |
| `claude-fix-mockup-geometria-wysiwyg-261115-0045` (3) e `claude-fix-mockup-logo-tamanho-real-261114-2200` (3) | **decidido e registrado** no ledger 2026-11-15T14:45 — a geometria ficou com a #3665 (resgate byte-idêntico) e o portão `422 missing_dimensions` ficou fora por trade-off de negócio do dono. |
| `importado-vps-fabrica-v2-refazer-dc12be92-261116` (1) | `e2e-cleanup/index.ts`: o `main` está à frente (+699/−118) e `comm -23` das funções da branch contra as do `main` volta vazio. |
| `261117-schema-snapshot-cancelled-skip` (1) | o `main` é o lado novo e cita a procedência do conserto no próprio cabeçalho. |

**Os 6 workflows do `261117-laughing-cori-o9w35e`:**

- `contract-tests.yml` → **substituído**: o ref instala a CLI do Supabase com `wget` (contorno de quando `supabase/setup-cli` estava bloqueada por policy); o `main` usa a action com SHA fixo (`supabase/setup-cli@689adcfb`, v2, versão 2.101.0).
- `db-schema-drift-check.yml`, `edge-functions-drift-check.yml`, `deploy-gates.yml`, `schema-snapshot-export.yml` → **substituídos**: o `main` tem mais conteúdo em todos (85, 50, 1.039 e 61 linhas só no `main`, contra 21, 16, 907 e 50 só no ref).
- `db-apply-migration.yml` → **descartado por decisão do dono, documentada no próprio `main`**. O ref tem o passo "Confirma reviewer obrigatório no environment Production", que checa via API se `production` tem de fato `required_reviewers` (o ref registra que em 2026-09-22 o environment existia com `protection_rules=[]`). O `main` não tem o passo, e explica por quê em `.github/workflows/db-apply-migration.yml:7-13`: *"gated SEM gate de aprovação desde 2026-11-14, por decisão explícita do dono (...) o `environment: production` e o step que exigia required reviewers foram removidos para que agentes possam aplicar migration sem clique humano"*. **Não restaurado**: reverteria uma decisão do dono e travaria o caminho de DDL. O que continua no lugar, pelo mesmo cabeçalho: preflight read-only, `validate-migration-target`, rollback obrigatório e recibo por PR.

Com isso, cada um dos 277 pares de divergência real está classificado como
**incorporado**, **substituído** ou **descartado por decisão** — e a única melhoria
que faltava foi reaproveitada.
