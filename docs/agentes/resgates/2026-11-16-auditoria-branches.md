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
   o snapshot `supabase/baseline/20261108000000_cron_jobs.json` diz
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
