# Política de DDL — quando MCP/dashboard é aceitável (E12)

Projeto canônico: `doufsxqlfjyuvxuezpln`. Esta política é referenciada pela REGRA #8 de
`CLAUDE.md` e é aplicada (de forma best-effort, não bloqueante) pelo workflow
`.github/workflows/ddl-out-of-band-detector.yml`.

## Regra

**O caminho padrão para DDL é `supabase/migrations/**.sql` + `supabase db push`/CI.**

DDL aplicada direto via MCP (`execute_sql`/`apply_migration`) ou dashboard (Studio SQL Editor)
só é aceitável quando as **três** condições abaixo forem satisfeitas:

1. **(a) Ticket** — existe uma issue ou PR descrevendo *por que* a alteração não pôde esperar
   o fluxo normal de migration (ex.: correção emergencial, exploração pontual que virou
   permanente).
2. **(b) Arquivo de migration no mesmo PR** — o efeito da DDL é reproduzido em um arquivo
   `supabase/migrations/<timestamp>_<nome>.sql` versionado, idempotente, no mesmo PR que
   referencia o ticket do item (a). O arquivo é a fonte da verdade daqui em diante — a DDL
   já aplicada manualmente não precisa (nem deve) ser reexecutada.
3. **(c) `migration repair --status applied` no mesmo dia** — `supabase migration repair
   --status applied <version> --linked` roda no mesmo dia em que a DDL foi aplicada,
   registrando a versão do item (b) no ledger (`supabase_migrations.schema_migrations`) sem
   reexecutar SQL. Sem isso, o ledger e o schema real divergem silenciosamente — exatamente
   o padrão que causou os dois incidentes abaixo.

Se qualquer uma das três faltar, a alteração é **DDL out-of-band**: aplicada em produção sem
rastro correspondente no ledger versionado. Não é proibida retroativamente, mas deve ser
regularizada (registrar (a)/(b)/(c) a posteriori) assim que detectada.

## Por que isso importa (casos medidos)

- `catalog_e24_zapp_catalog_stats` (2026-09-12) — objeto criado, ledger atualizado depois.
- `audit_r3_revoke_anon_mv_product_compositions` (2026-09-05) — mesmo padrão.

Em ambos os casos o objeto existe e está correto hoje — o problema não foi o resultado, foi a
**janela sem rastro**: entre a aplicação via MCP/dashboard e o registro no ledger, não havia
como saber, olhando só para `supabase/migrations/`, que aquele objeto existia em produção.
`schema_signature_baseline` (7.201 colunas capturadas em 2026-06-27) e
`schema_signature_drift_log` já existiam para detectar esse tipo de divergência de coluna/tabela,
mas nada cruzava esse resultado com o ledger — o log acumulava "has_drift=true" toda rodada
(4x/dia via `pg_cron`, job 245) sem que ninguém verificasse se cada diferença já tinha uma
migration correspondente ou não. Ver `docs/E12_DETECTOR_DDL_OUT_OF_BAND_2026-09-16.md` para a
investigação completa.

## O que o detector automático faz (e o que não faz)

`.github/workflows/ddl-out-of-band-detector.yml` (semanal + `workflow_dispatch`):

1. Lê a última linha de `public.schema_signature_drift_log` (populada 4x/dia por
   `fn_check_schema_signature_drift()` via `pg_cron`, job 245 — o workflow não recalcula nada,
   só lê o resultado mais recente já materializado).
2. Para cada tabela/coluna em `tables_added`/`tables_removed`/`columns_added`/`columns_removed`,
   busca textualmente por esse nome em `name`/`statements` de
   `supabase_migrations.schema_migrations` (e, se o objeto for uma partição — via
   `pg_inherits`/`pg_class.relispartition` —, também busca pelo nome da tabela-pai, para não
   marcar como out-of-band partições criadas automaticamente por rotina já coberta por
   migration, ex.: `magazine_ensure_view_event_partitions()` via `pg_cron` job 301).
3. Para o que **não** tem nenhuma correspondência textual no ledger, abre (ou comenta, se já
   aberta) uma issue rotulada `ddl-out-of-band` com um trecho best-effort de `postgres_logs`
   das últimas 24h (limitação: a Management API de logs só aceita janelas de até 24h por
   chamada — se a DDL foi aplicada há mais de 1 dia, esse trecho vem vazio; nesse caso use o
   Studio Logs Explorer ou peça a uma sessão com Supabase MCP para rodar `query_logs` numa
   janela maior).

**O que o detector não faz:**
- Não aplica DDL, não roda `migration repair`, não escreve em `schema_signature_baseline`
  (é 100% leitura contra o projeto canônico, via Management API read-only — REGRA #8,
  corolário: nunca via PostgREST/OpenAPI).
- Não prova ausência de out-of-band — é uma checagem por nome textual (`ILIKE '%objeto%'`),
  não por timestamp de criação do objeto (Postgres não guarda `created_at` de tabela/coluna
  sem um event trigger dedicado, que não existe hoje). Um nome genérico o bastante para
  aparecer por acidente em outra migration não relacionada geraria falso-negativo; é uma
  heurística deliberadamente simples, não uma prova formal.
- Não recaptura a baseline (`fn_capture_schema_baseline`) — isso é uma escrita em tabela de
  produção e exige decisão humana de que o estado atual deve virar o novo "normal" (REGRA #1/#8).
  A baseline atual (`certified_baseline_20260627_v3_post_lovable_audit`, 2026-06-27) está
  defasada há mais de 2 meses; isso é esperado e não invalida o detector, porque a comparação
  relevante é contra o **ledger**, não contra a baseline por si só — a baseline só serve para
  gerar a lista de candidatos (`tables_added`/`columns_added`) que alimenta o passo 2.

## Simulação local (sem aplicar DDL de verdade)

Para validar o ciclo completo sem tocar o banco de produção:

1. **Não rode** `COMMENT ON` nem nenhuma outra DDL contra `doufsxqlfjyuvxuezpln` a partir de
   uma sessão de automação — isso está fora do escopo `[DB-RO]` (REGRA #1/#8).
2. Simulação supervisionada pelo PO, em uma sessão com permissão de escrita:
   - `COMMENT ON TABLE public.<tabela_de_teste> IS 'sim-e12-<data>';` em um objeto de teste
     descartável (não uma tabela de produção real) — um `COMMENT ON` altera `pg_description`,
     não aparece em `information_schema.columns`, então **não** é capturado por
     `fn_check_schema_signature_drift()` como está hoje. Para exercitar o caminho real de
     ponta a ponta, o objeto de teste precisa de uma mudança que apareça em
     `information_schema.columns` — ex.: `ALTER TABLE public.<tabela_de_teste> ADD COLUMN
     sim_e12_col text;` numa tabela de teste, sem arquivo de migration correspondente.
   - Rodar manualmente `SELECT public.fn_check_schema_signature_drift();
     SELECT public.fn_sync_local_drift_to_schema_drift_log();` (o mesmo par que o `pg_cron`
     job 245 já roda 4x/dia) para popular `schema_signature_drift_log` com a diferença.
   - Disparar `.github/workflows/ddl-out-of-band-detector.yml` via `workflow_dispatch`.
   - Esperado: uma issue rotulada `ddl-out-of-band` para `<tabela_de_teste>` / `sim_e12_col`.
   - Reverter: `ALTER TABLE public.<tabela_de_teste> DROP COLUMN sim_e12_col;` e re-rodar o par
     de funções acima para a baseline voltar a bater (ou aceitar que o próximo `has_drift=false`
     só aparece na próxima rodada de `pg_cron`, até 6h depois).
3. Esta simulação não foi executada como parte da Etapa E12 (execução de DDL, mesmo em objeto
   de teste, está fora do escopo `[DB-RO]` desta etapa) — fica descrita aqui para quem tiver
   aprovação de escrita rodar quando quiser validar o ciclo fim-a-fim.

## Referências

- `docs/E12_DETECTOR_DDL_OUT_OF_BAND_2026-09-16.md` — investigação e o que foi entregue.
- `docs/SCHEMA_REFERENCE.md` §7–§8 — REGRA #8 e queries canônicas de auditoria.
- `.github/workflows/db-schema-drift-check.yml` — drift entre migrations versionadas e schema
  remoto via `supabase db diff` (granularidade de objeto inteiro/DDL completo; complementar,
  não substitui este detector, que é granularidade coluna via `schema_signature_drift_log`).
- `.github/workflows/schema-snapshot-export.yml` — snapshot do schema live, não compara com
  o ledger.
