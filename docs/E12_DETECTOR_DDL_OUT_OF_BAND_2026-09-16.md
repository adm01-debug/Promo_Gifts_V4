# E12 — Detector de DDL fora do fluxo (out-of-band) (2026-09-16)

`[GIT]` + `[DB-RO]`. Sem `[REQUER-PO]` — nenhum artefato desta etapa aplica
DDL, GRANT/REVOKE, policy ou cron; é workflow + script + documentação.

Etapa do `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (linhas 388-397).

---

## 1. Problema (conforme o plano)

Pelo menos 2 casos confirmados de DDL aplicada via MCP/dashboard e registrada
no ledger (`supabase_migrations.schema_migrations`) só depois, não junto:
`catalog_e24_zapp_catalog_stats` (2026-09-12) e
`audit_r3_revoke_anon_mv_product_compositions` (2026-09-05). Existe
`schema_signature_baseline` e `schema_signature_drift_log`, mas nada cruzava
esse resultado com o ledger — o log acumulava `has_drift=true` sem que
ninguém verificasse se cada diferença já tinha migration correspondente.

---

## 2. Estado ao vivo confirmado nesta etapa `[RO]`

```sql
SELECT id, ran_at, has_drift, n_added, n_removed, n_retyped, baseline_label,
       array_length(tables_added,1) AS n_tables_added,
       array_length(tables_removed,1) AS n_tables_removed
FROM public.schema_signature_drift_log
ORDER BY ran_at DESC LIMIT 1;
```

Última linha (2026-09-16 20:11 UTC): `has_drift=true`, 325 colunas
added / 22 removed, 33 tabelas added / 3 removed, contra
`baseline_label='certified_baseline_20260627_v3_post_lovable_audit'`
(2026-06-27 — quase 3 meses defasada).

```sql
SELECT count(*) AS total_rows, min(ran_at) AS oldest, max(ran_at) AS newest,
       count(*) FILTER (WHERE has_drift) AS rows_with_drift
FROM public.schema_signature_drift_log;
```

348 linhas desde 2026-06-26, 309 com `has_drift=true` — ou seja, o log
está acumulando drift praticamente toda rodada há quase 3 meses sem que
nada tenha consumido esse sinal. **Isso confirma o problema do plano**: o
volume de "diferenças nunca cruzadas com o ledger" não é hipotético, é a
maioria das rodadas já registradas.

```sql
SELECT jobid, jobname, schedule, active FROM cron.job
WHERE jobname ILIKE '%drift%' OR jobname ILIKE '%schema_signature%';
```

`jobid=245`, `schema-drift-check`, `11 2,8,14,20 * * *` (4x/dia), `active=true`
— confirma `fn_check_schema_signature_drift()` rodando como o plano descreve.

**Nota sobre o volume de 33+3 tabelas e 325+22 colunas:** a baseline
(`2026-06-27`) é anterior à maior parte do trabalho recente do projeto
(inclui, por exemplo, as tabelas `magazine_*` restauradas em `4cff1e1` e
tudo que entrou depois). O detector desta etapa **não recaptura a
baseline** — isso é uma escrita em tabela de produção e decisão do PO
(ver `docs/db/POLITICA_DDL.md`, seção "O que o detector não faz"). Rodar o
detector hoje contra essa baseline produziria uma lista grande de
candidatos, dos quais se espera que a maioria seja explicada pelo ledger
(tabelas que têm migration, só não têm baseline atualizada) — só o que
sobrar sem correspondência textual é que é `ddl-out-of-band` de fato. Não
executei essa consulta de cruzamento completa nesta etapa (exigiria
`SUPABASE_ACCESS_TOKEN`, ver §4) — fica como primeira execução real do
workflow após esta etapa ser mergeada.

---

## 3. Divergência deliberada do texto literal do plano

O plano descreve o job como "captura assinatura do schema, compara com a
última". Isso duplicaria o que `fn_check_schema_signature_drift()` já faz
4x/dia via `pg_cron` (job 245). Em vez de recalcular a assinatura dentro do
workflow do GitHub Actions, `scripts/check-ddl-out-of-band.mjs` **lê a
última linha já materializada** de `schema_signature_drift_log` e faz só a
parte que faltava: o cruzamento com o ledger. Motivo: evitar duas fontes
de verdade calculando a mesma coisa (uma no Postgres via `pg_cron`, outra
no Actions) que podem divergir por timing; e evitar que o workflow precise
de uma conexão `psql` direta (`DATABASE_URL`/senha do banco) quando a
Management API (mesmo padrão de `scripts/check-secdef-anon-drift.mjs`) já
basta para leitura. O resultado funcional é o mesmo do pedido do plano —
"para cada diferença, procura migration no ledger; se não achar, abre
issue" — só a etapa de "capturar assinatura" é reaproveitada em vez de
duplicada.

---

## 4. O que foi construído

- **`scripts/check-ddl-out-of-band.mjs`** (313 linhas) — lê
  `schema_signature_drift_log` (última linha), monta o conjunto de
  candidatos (`tables_added`/`tables_removed`/chaves de
  `columns_added`/`columns_removed`), cruza cada um contra
  `supabase_migrations.schema_migrations` por `ILIKE` em `name`/`statements`
  (com fallback para o nome da tabela-pai via `pg_inherits`, para não
  marcar partições automáticas como out-of-band), e para o que sobra tenta
  um trecho best-effort de `postgres_logs` (janela de 24h, limite de 8
  chamadas por rodada). Zero escrita. Sem
  `SUPABASE_ACCESS_TOKEN`/`SUPABASE_PROJECT_REF`: `static-pass` (modo
  advisory) ou `inconclusive` (com `--require-live`) — mesmo contrato de
  `scripts/check-result-contract.mjs` usado pelos outros checks read-only
  do repo. Confirmado nesta etapa: `node scripts/check-ddl-out-of-band.mjs`
  sem credenciais → `static-pass`, exit 0, exatamente como documentado.
- **`.github/workflows/ddl-out-of-band-detector.yml`** (novo nesta etapa) —
  roda semanalmente (segunda 08:00 UTC) + `workflow_dispatch`. Chama o
  script; se o outcome for `failure` (exit 1 = achou objeto out-of-band, ou
  exit 2 = inconclusivo), tenta ler o relatório JSON e só abre/atualiza
  issue rotulada `ddl-out-of-band` quando o relatório existe **e** lista
  pelo menos 1 objeto — um resultado inconclusivo (sem credencial, API
  fora do ar, log vazio) gera só um `::warning::` no job, não uma issue
  enganosa "0 objetos". Usa `listForRepo` + busca por título com prefixo
  `[ddl-out-of-band]` para comentar numa issue já aberta em vez de duplicar
  (mesmo padrão de `edge-functions-drift-check.yml`). Publica o JSON como
  artifact (90 dias de retenção) independente do resultado. Não é gate —
  não quebra o build; é puramente advisory (issue), igual ao workflow de
  drift de edge functions no modo scheduled.
- **`docs/db/POLITICA_DDL.md`** (escrito por um agente anterior a esta
  sessão, revisado nesta etapa — ver §5) — as 3 condições (ticket, migration
  no mesmo PR, `migration repair` no mesmo dia) que tornam DDL fora do
  fluxo aceitável, os 2 casos históricos, o que o detector faz/não faz, e um
  roteiro de simulação supervisionada (não executado — ver §6).
- **CLAUDE.md REGRA #8** — adicionada referência cruzada a
  `docs/db/POLITICA_DDL.md` (ver §5), satisfazendo o item de checklist
  "Política publicada e referenciada em CLAUDE.md".

---

## 5. Revisão do material herdado

`docs/db/POLITICA_DDL.md` e `scripts/check-ddl-out-of-band.mjs` já existiam
no diretório de trabalho, produzidos por uma sessão/agente anterior, mas
estavam incompletos: referenciavam
`.github/workflows/ddl-out-of-band-detector.yml` e este próprio documento
(`docs/E12_DETECTOR_DDL_OUT_OF_BAND_2026-09-16.md`), nenhum dos dois
existia no repositório até esta etapa. Revisão desta sessão sobre o
material herdado: li o script inteiro (313 linhas) e a política inteira
(117 linhas); confirmei que o script não faz nenhuma escrita
(`grep`-equivalente manual por `INSERT`/`UPDATE`/`DELETE`/`apply_migration`
= zero ocorrências fora de comentário); rodei o script diretamente sem
credenciais e confirmei o `static-pass` documentado; verifiquei que as
duas dependências que ele importa (`check-result-contract.mjs`,
`supabase-read-only-query.mjs`) já existiam e são usadas por outros checks
do repo (`check-secdef-anon-drift.mjs`). Nenhuma correção de conteúdo foi
necessária nos dois arquivos herdados — só os artefatos que faltavam (este
doc, o workflow, a referência em CLAUDE.md) foram escritos nesta etapa.

---

## 6. Checklist de conclusão (do plano)

- [x] Workflow roda e produz relatório mesmo com zero diferenças — coberto
  pelo branch `candidates.length === 0` do script (`status=PASSED`, grava
  `{outOfBand: []}`); testado apenas em modo estático nesta etapa (sem
  `SUPABASE_ACCESS_TOKEN` nesta sessão) — a primeira execução real do
  `workflow_dispatch` após o merge é quem exercita o caminho live pela
  primeira vez.
- [ ] Simulação: `COMMENT ON` fora do fluxo em objeto de teste → issue
  aberta — **não executada**, deliberadamente. `docs/db/POLITICA_DDL.md`
  já documenta que isso exige DDL real (mesmo em objeto de teste
  descartável) contra o projeto canônico, fora do escopo `[DB-RO]` desta
  etapa (REGRA #1/#8). Fica descrita passo a passo em
  `docs/db/POLITICA_DDL.md` §"Simulação local" para quem tiver aprovação
  de escrita executar.
- [x] Política publicada e referenciada em `CLAUDE.md` — `docs/db/POLITICA_DDL.md`
  publicado; referência adicionada na REGRA #8 nesta etapa.

---

## 7. Resumo

| Item | Tipo | Risco | Reversível |
|---|---|---|---|
| `.github/workflows/ddl-out-of-band-detector.yml` (novo) | CI, sem DDL | Nenhum — 100% leitura via Management API, advisory (não quebra build) | Sim, remover o arquivo |
| `docs/db/POLITICA_DDL.md` (herdado, revisado) | Doc | Nenhum | Sim |
| `scripts/check-ddl-out-of-band.mjs` (herdado, revisado) | Script RO | Nenhum — zero escrita, confirmado por leitura + execução direta | Sim |
| CLAUDE.md REGRA #8 (cross-reference) | Doc | Nenhum | Sim |

Nenhum item desta etapa é `[REQUER-PO]`. Nenhuma aprovação necessária —
commitável diretamente, como as demais etapas `[GIT]`/`[DB-RO]` já
entregues (E01–E10, E41, E49).
