# origin/importado/local/projetos__Promo_Gifts_V4.backup-20261028

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** guarda o comprovante de que 5 alteracoes de banco de 05/10 foram de fato executadas em producao (com link da execucao) e a unica lista que diz, uma por uma, quais das 20 alteracoes de banco paradas no repositorio podem ser rodadas e quais nao devem ser rodadas nunca.
- **Tip / merge-base / main:** tip `379e2b330175f1091be5ed973c23d5e414c6290b` · merge-base `9660159b38232f6c8b091189489d71e7ba97225f` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Nao e uma branch de trabalho: e a importacao, em 1 commit (29/10), de um checkout
local da maquina do dono (`/home/joaquim_ataides/projetos/Promo_Gifts_V4.backup-20261028`).
Dentro dela ficou preso trabalho de auditoria de banco feito em **07/10** e nunca
enviado por PR:

1. **Fechar os recibos E15 de 05/10.** No ponto de partida, as migrations
   `20261005124500`, `...501`, `...502`, `...503` e `20261005130000` estavam
   marcadas como "pendente — nao aplicada" (e `20261005130000` aparecia duas vezes,
   uma pendente e uma aplicada). A branch trocou as 5 linhas por recibos completos:
   MD5 dos `statements` lidos do ledger canonico, link da run do
   `db-apply-migration.yml` que aplicou cada uma, e o horario UTC exato.
2. **Classificar as 20 migrations que estao no repositorio mas nao no ledger**
   (`docs/AUDITORIA_CANDIDATAS_FORA_BASELINE_E06_2026-10-07.md`, 73 linhas): para
   cada versao, se e arquivo-espelho de algo que ja aconteceu, se foi substituida
   por outra, ou se e proposta de verdade esperando aprovacao — e o tratamento
   seguro de cada caso.
3. Corrigir a nota desatualizada "arquivo ainda **nao criado**" do espelho
   `20260916181609`.
4. Regenerar `src/integrations/supabase/types.ts` e a allowlist de tipos.
5. Subiu tambem o grafo local do graphify (ruido de build).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Recibos E15 das 5 migrations: **fato** de que estao aplicadas | ESTA (em outra tabela, "recibo retroativo") | `origin/main:supabase/MIGRATIONS_SYNC_LOG.md:1317-1321` — 5 linhas "aplicada (ledger de producao); recibo retroativo" |
| Recibos E15: **MD5 dos statements** (`ebbf21e8...`, `fb059858...`, `774d5c99...`, `cc135632...`, `f49ec6b8...`) | **NAO ESTA** | `git grep -l <md5> origin/main` nao retorna nada para nenhum dos 5. Na branch: `379e2b3301:supabase/MIGRATIONS_SYNC_LOG.md:764-768`. Os valores foram conferidos ao vivo: `select md5(array_to_string(statements,E'\n')) from supabase_migrations.schema_migrations` devolve `ebbf21e897073e35fcf055d12bab192a` (20261005124500), `cc135632f3fac7d705fae446067b2b26` (…503) e `f49ec6b82a0e21582ebb1d38359beda8` (20261005130000) — identicos aos da branch |
| Recibos E15: **link da execucao** (runs 37370061047, 37373118681, 37374730545, 37375453600, 37376714470) e horario UTC | **NAO ESTA** | `git grep -l <run_id> origin/main` nao retorna nada para nenhum dos 5. A run 37373118681 existe e e real: workflow "DB — Aplicacao controlada de migration unica (E15)", `conclusion: success`, `updated_at 2026-10-05T21:15:07Z` (github_get_workflow_run), coerente com o horario `21:13:43 UTC` que a branch registra |
| `docs/AUDITORIA_CANDIDATAS_FORA_BASELINE_E06_2026-10-07.md` (classificacao das 20) | **NAO ESTA** (nunca existiu na main) | `git cat-file -e origin/main:docs/AUDITORIA_...md` → "does not exist in 'origin/main'"; `git ls-tree origin/main -- docs/arquivo/2026-10` tem 4 arquivos, nenhum deles este |
| O conteudo da classificacao estaria em outro documento da main? | NAO | O equivalente mais proximo, `origin/main:docs/arquivo/2026-09/CLASSIFICACAO_MIGRATIONS_SEM_LEDGER_2026-09-16.json`, nao cita nenhuma das versoes de 16/09 em diante (grep = 0 para `20260916193000`, `20260917150000`, `20260928212000`, `20260928213000` e outras 5). A main tambem perdeu as linhas do sync log dessas versoes: grep em `origin/main:supabase/MIGRATIONS_SYNC_LOG.md` = 0 para `20260916211500`, `20260917150000`, `20260917160000`, `20260928212000`, `20260928213000` |
| A classificacao ainda vale hoje? | SIM — 18 das 20 continuam fora do ledger | consulta read-only ao ledger canonico: so `20260511235900` e `20260917061500` entraram; as outras 18 nao. E os 18 arquivos continuam na main (`git ls-tree origin/main -- supabase/migrations` acha `20260916193000_e25_...`, `20260916211500_e30_...`, `20260917150000_e40_...`, `20260917160000_e33_...`, `20260917080000_e35_...`, `20260920120000_fix_handle_new_user_...`, `20260928212000_fix_products_padronizacao_backlink.sql`, `20260928213000_backfill_products_main_category_id.sql`) |
| Aviso "nao aplicar `20260920120000`, foi substituida por `20260922170000`" | **NAO ESTA** na main | o aviso so existe no doc da branch. Checado ao vivo: `20260922170000` (`signup_identity_safe_default`) esta no ledger — ou seja, o aviso e correto e o arquivo antigo continua no repositorio, disponivel para alguem disparar por engano |
| Nota corrigida do espelho `20260916181609` ("arquivo ainda nao criado" estava errado) | ESTA, de outra forma | `grep "ainda não criado"` em `origin/main:supabase/MIGRATIONS_SYNC_LOG.md` = 0 (tabela reescrita); e o arquivo existe: `origin/main:supabase/migrations/20260916181609_backfill_fix_google_provider_secret_name_20260623.sql` |
| `src/integrations/supabase/types.ts` — `version` em `discount_approval_requests` e `_expected_version` na RPC | ESTA | `origin/main:src/integrations/supabase/types.ts:64303,64599,64675` (`_expected_version?: number`) e `version: number` dentro do bloco `discount_approval_requests` |
| types.ts — `login_attempts.verified` | ESTA | `origin/main:src/integrations/supabase/types.ts:2135` |
| types.ts — particao `magazine_public_view_events_2027_01` | ESTA | `origin/main:src/integrations/supabase/types.ts:12078` |
| types.ts — particoes de `supplier_products_raw_history` roladas (sai `p2026_06`, entra `p2027_01`) | ESTA | `origin/main:src/integrations/supabase/types.ts:41049` tem `p2027_01`; grep de `p2026_06` na main = 0 |
| `docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json` — entrada `supplier_products_raw_history_p2026_06` | ESTA, e melhor | `origin/main:docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json:144`, com justificativa muito mais completa (cita `fn_purge_spr_history`, cron 03:30, confirmacao no pg_catalog) e mais 15 entradas; a versao da branch tinha 1 entrada so |
| `graphify-out/GRAPH_REPORT.md` e `graphify-out/manifest.json` | nao aplicavel — ruido | sao um grafo gerado em outra maquina (cabecalho da branch: "Graph Report - promo-atual (2026-10-08)", commit `c194982c`); regeneravel com `graphify update .` |

## A resgatar

1. **`supabase/MIGRATIONS_SYNC_LOG.md` — MD5, link de execucao e horario UTC dos 5
   recibos E15 de 05/10** (`20261005124500`, `...501`, `...502`, `...503`,
   `20261005130000`). A main diz "aplicada; recibo retroativo" e para ai: sem MD5 nao
   da para provar que o arquivo no repositorio e o que rodou no banco, e sem link nao
   da para auditar quem rodou. Os 5 MD5 da branch batem com o ledger de producao e a
   run conferida existe e deu certo. E exatamente a pendencia aberta "Recibos E15:
   trazer link de execucao e MD5". Fonte: `379e2b3301:supabase/MIGRATIONS_SYNC_LOG.md:764-768`.
   Resgate = editar documentacao; nao mexe no banco.
2. **`docs/AUDITORIA_CANDIDATAS_FORA_BASELINE_E06_2026-10-07.md` (73 linhas)** —
   arquivar em `docs/arquivo/2026-10/`. E o unico lugar do repositorio que diz, para
   cada uma das 20 alteracoes de banco que estao no codigo mas nao no banco, se e
   espelho de algo ja feito, se foi substituida, ou se e proposta esperando
   aprovacao. 18 das 20 continuam nessa situacao hoje e a main nao documenta mais o
   estado de pelo menos 5 delas. Importa porque sem essa lista a chance de alguem
   rodar a alteracao errada (`20260920120000`, substituida) ou reaplicar um espelho
   (`20260916181609`, `20260916210000`) deixa de ser teorica.

## Risco de fechar esta branch

Fechar sem resgatar perde duas coisas, nenhuma recuperavel sem retrabalho:

- **A prova de que as 5 alteracoes de 05/10 foram as que o repositorio diz que foram.**
  Essas 5 incluem o travamento contra duas pessoas aprovarem o mesmo desconto ao
  mesmo tempo, a trilha de auditoria de perfis/orcamentos/pedidos com dados pessoais
  escondidos, e o bloqueio de tentativas de login. Sao justamente os itens em que,
  numa duvida futura ("isso estava ligado em tal data?"), a resposta tem que vir de
  comprovante e nao de memoria. Refazer da para refazer (o ledger ainda responde),
  mas custa a sessao de alguem e nada garante que as runs continuem consultaveis.
- **O mapa das 20 alteracoes paradas.** Sem ele o proximo agente ou o proximo
  mutirao olha 18 arquivos soltos em `supabase/migrations/` sem saber quais sao
  inofensivos e quais nao podem ser executados. O caso `20260920120000` e concreto:
  o arquivo esta la, parece pendente, e aplicar seria desfazer a correcao de cadastro
  que hoje esta no ar.

Nao ha risco em descartar o resto da branch (types.ts, allowlist, graphify-out): a
main esta igual ou a frente em todos.

## Nao verificado

- `__InternalSupabase.PostgrestVersion`: a branch tem `"14.5"`, a main tem `"14.1"`
  (`origin/main:src/integrations/supabase/types.ts:13`). Nao verifiquei qual e o
  valor correto para o projeto canonico hoje; e um campo escrito pela ferramenta que
  gera o arquivo e o historico da main ja passou pelos dois valores
  (`git log -S'PostgrestVersion: "14.5"' origin/main` tem 10 commits). Tratei como
  artefato de geracao, nao como item de resgate.
- Das 5 migrations de 05/10 conferi o MD5 ao vivo de 3 (`20261005124500`,
  `...503`, `20261005130000`) e a existencia de 1 das 5 runs (37373118681). Os outros
  2 MD5 e as outras 4 runs nao foram conferidos um a um — 3/3 e 1/1 bateram, mas isso
  e amostra, nao o conjunto.
- Nao investiguei por que a main deixou de registrar no sync log o estado de
  `20260916211500`, `20260917150000`, `20260917160000`, `20260928212000` e
  `20260928213000`. Isso e deriva da propria main, nao desta branch.
