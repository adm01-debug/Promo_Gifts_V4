# E36 — Custo agregado de `fn_cron_safe_run`: quais jobs puxam a média para cima (2026-09-16)

Etapa `[DB-RO]` do `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (linhas 609–615).
Objetivo: `fn_cron_safe_run` é o wrapper de execução segura chamado por dezenas de cron jobs;
em agregado (`pg_stat_statements`) soma **356.823 chamadas, média 1.158,7 ms/chamada
(≈ 1,159 s — não "1,157 ms" como o texto do plano sugere; é um erro de unidade no plano,
a ordem de grandeza real é segundos, não milissegundos), total 413.460 s (≈ 114,85 h)**.
Essa média esconde jobs muito mais caros que os outros porque `pg_stat_statements` agrega
**todas** as chamadas de `fn_cron_safe_run` numa única linha normalizada
(`SELECT public.fn_cron_safe_run($1::bigint, $2, $3, $4)`) — o texto do 2º argumento
(o SQL interno de cada job) é parametrizado e desaparece na normalização. Não dá para
saber, só olhando `pg_stat_statements`, qual job pesa mais.

Método: auditoria só via `pg_catalog`/tabelas de sistema (`mcp__supabase__execute_sql`,
read-only) — `cron.job_run_details` e `cron.job` para atribuição por job (que preserva
`jobid`, ao contrário de `pg_stat_statements`), cruzado com `extensions.pg_stat_statements`
para a função interna chamada por cada job. Nenhuma DDL foi executada. Conforme REGRA #8
do `CLAUDE.md`.

---

## 0. Aviso sobre a janela de dados (importante para interpretar os números)

A query pedida usa `start_time > now() - interval '30 days'`, mas `cron.job_run_details`
só tem retenção de **~17 dias** de fato:

```sql
SELECT min(start_time) AS oldest_run, max(start_time) AS newest_run, count(*) AS total_rows
FROM cron.job_run_details;
-- oldest_run: 2026-08-30 04:00:00+00 | newest_run: 2026-09-16 17:47:00+00 | total_rows: 165.401
```

Ou seja, a janela real analisada é **2026-08-30 → 2026-09-16 (~17 dias)**, não 30. Isso é
consistente com uma rotina de limpeza/retenção sobre `cron.job_run_details` que não está
documentada nesta etapa (fora de escopo `[DB-RO]`; se confirmado, é candidato a etapa própria).

Já `extensions.pg_stat_statements` acumula desde o último reset:

```sql
SELECT dealloc, stats_reset FROM extensions.pg_stat_statements_info;
-- dealloc: 53 | stats_reset: 2026-06-21 22:37:01+00
```

Ou seja, `pg_stat_statements` cobre **~87 dias** (desde 2026-06-21), com `pg_stat_statements.max
= 5000` e **53 evictions (`dealloc`)** já ocorridas — algumas funções internas perderam
contagem acumulada por LRU eviction e foram recriadas do zero em algum ponto. Isso explica
por que, para o mesmo job, a contagem de chamadas em `pg_stat_statements` às vezes é **muito
menor** que em `cron.job_run_details` (ex.: `fn_sm_stock_guard()`: 511 chamadas em
`pg_stat_statements` vs 5.062 execuções do job em 17 dias) e às vezes **muito maior**
(ex.: `fn_reposicao_backfill_today()`: 2.083 chamadas em 87 dias vs 422 execuções do job em
17 dias — compatível, é o mesmo job rodando ~1x/hora nas duas janelas).

**Conclusão metodológica:** para ranquear custo por job, a fonte confiável é
`cron.job_run_details` agrupado por `jobid` (preserva identidade do job, não sofre
normalização/eviction). `pg_stat_statements` foi usado só como corroboração da função
interna, não como fonte primária da contagem.

---

## 1. Ranking dos jobs que passam por `fn_cron_safe_run`, por custo total (17 dias)

```sql
SELECT jrd.jobid, j.jobname, count(*) AS runs,
  avg(extract(epoch FROM (jrd.end_time - jrd.start_time))) AS avg_seconds,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM (jrd.end_time - jrd.start_time))) AS p50_seconds,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY extract(epoch FROM (jrd.end_time - jrd.start_time))) AS p95_seconds,
  max(extract(epoch FROM (jrd.end_time - jrd.start_time))) AS max_seconds,
  sum(extract(epoch FROM (jrd.end_time - jrd.start_time))) AS total_seconds
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE jrd.start_time > now() - interval '30 days'
  AND jrd.end_time IS NOT NULL
  AND j.command ILIKE '%fn_cron_safe_run%'
GROUP BY jrd.jobid, j.jobname
ORDER BY total_seconds DESC;
```

| # | Job (`jobid`) | runs (17d) | avg | p50 | p95 | max | total | % do total wrapped |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | **asia-image-uploader** (278) | 1.265 | 60,212 s | 60,179 s | 60,391 s | 61,660 s | **76.168,5 s (21,2 h)** | **67,57 %** |
| 2 | **refresh-all-materialized-views** (234) | 422 | 29,739 s | 28,558 s | 42,795 s | 58,153 s | **12.550,0 s (3,49 h)** | **11,13 %** |
| 3 | **fantasmas-deactivate-guard** (208) | 5.061 | 0,645 s | 0,206 s | 2,731 s | 9,326 s | 3.263,5 s | 2,90 % |
| 4 | xbz-site-scrape (269) | 2.531 | 1,082 s | 0,502 s | 2,821 s | 13,831 s | 2.737,8 s | 2,43 % |
| 5 | process-pending-products (273) | 5.062 | 0,440 s | 0,118 s | 0,360 s | 26,014 s | 2.227,9 s | 1,98 % |
| 6 | xbz-enrich-gold-extractors (266) | 2.531 | 0,782 s | 0,681 s | 1,184 s | 5,890 s | 1.979,9 s | 1,76 % |
| 7 | sm-stock-guard (207) | 5.062 | 0,366 s | 0,262 s | 1,048 s | 10,420 s | 1.853,5 s | 1,64 % |
| 8 | spot-stock-fast-sync (265) | 844 | 2,097 s | 2,185 s | 3,139 s | 3,604 s | 1.770,3 s | 1,57 % |
| 9 | xbz-stock-sync (277) | 1.687 | 0,987 s | 0,638 s | 2,052 s | 28,697 s | 1.665,3 s | 1,48 % |
| 10 | refresh-analytics-mv-stock-velocity (259) | 53 | 23,924 s | 20,307 s | 43,348 s | 53,347 s | 1.268,0 s | 1,12 % |

**Os 2 primeiros jobs (asia-image-uploader + refresh-all-materialized-views) somam 78,70 %
de todo o tempo gasto em jobs que passam por `fn_cron_safe_run`.** Com o #3
(fantasmas-deactivate-guard) chega a 81,6 %. Isso confirma exatamente a suspeita do plano:
a média de ~1,16 s/chamada é arrastada por 2 jobs muito mais caros que os outros — não 2-3
uniformemente, mas essencialmente **1 job dominante (asia-image-uploader, 2/3 do total) e
1 secundário real (refresh-all-materialized-views, 1/9 do total)**; o resto é ruído de
frequência alta com custo unitário baixo.

### Fora desse ranking, por não passar por `fn_cron_safe_run` (contexto para E35)

Dois jobs entre os mais caros do banco **não usam o wrapper** — chamam a função diretamente
em `cron.job.command`, então não fazem parte do problema de "`fn_cron_safe_run` agregado":

- `reposicao-backfill-hourly` (jobid 117) → `SELECT public.fn_reposicao_backfill_today();`
  direto. 422 execuções/17d, avg 17,845 s, total 7.530,7 s — seria o **#2 do ranking geral**
  se estivesse na lista acima, mas está fora por não ser wrapped. **Isto é exatamente o
  objeto da etapa E35** (linhas 600–607 do plano: "`fn_reposicao_backfill_today`: 15 s por
  chamada `[REQUER-PO]`"), já aberta e com dependência declarada (`Dep.: E34`). Não duplicar
  aqui — E35 já cobre.
- `pipeline-health-hourly` (jobid 60) → `SELECT public.fn_pipeline_health()` direto, 422
  execuções, avg 5,438 s, total 2.294,7 s.

---

## 2. Causa raiz dos top 3 (cruzamento `cron.job.command` × `pg_stat_statements` × definição da função)

### #1 — `asia-image-uploader` (67,57 % do custo wrapped) — causa raiz confirmada: `pg_sleep` fixo

`cron.job.command` (jobid 278):
```sql
SELECT public.fn_cron_safe_run(77::bigint, 'SELECT public.fn_asia_run_image_cycle();', 1160000, 'asia-img-uploader');
```

`pg_get_functiondef(fn_asia_run_image_cycle)` mostra o corpo real:
```sql
CREATE OR REPLACE FUNCTION public.fn_asia_run_image_cycle(p_limit integer DEFAULT 20, p_wait_seconds integer DEFAULT 60)
...
    v_dispatch := fn_asia_dispatch_queue_batch(p_limit);
    ...
    PERFORM pg_sleep(p_wait_seconds);   -- <<< sleep de 60s DENTRO da transação, todo run
    v_harvest := fn_asia_harvest_queue_batch();
...
```

`p_wait_seconds` é chamado sem argumento em `cron.job.command` → usa o **default de 60 s**
em toda execução. Isso bate exatamente com os números: p50 = 60,179 s, p95 = 60,391 s,
max = 61,660 s — a duração é **quase constante em ~60 s independente de carga**, porque
~60 s do runtime é sleep puro, não trabalho de query. Confirmação adicional em
`pg_stat_statements`: a query interna `SELECT fn_asia_run_image_cycle($1, $2)` (chamadas
manuais fora do wrapper, 132 amostras) tem `mean_exec_time = 47,7 ms` — ou seja, o "trabalho"
de dispatch/harvest em si é rápido; quem domina é o `pg_sleep()`.

**Custo do sleep:** 1.265 execuções × 60 s = 75.900 s de sleep puro, contra 76.168,5 s de
total medido → **99,6 % do tempo do job #1 é `pg_sleep()`, não processamento**. Este job
segura o advisory lock `74108913` e o `statement_timeout` de 1.160.000 ms (19,3 min) do
`fn_cron_safe_run` durante todo esse tempo — nenhum outro disparo concorrente do mesmo job
pode rodar (por desenho, via `pg_try_advisory_lock`), mas o tempo de CPU/IO real do banco
fica ocioso, só esperando uma API externa de upload de imagem processar o lote.

### #2 — `refresh-all-materialized-views` (11,13 %) — custo real de refresh, não bug

`cron.job.command` (jobid 234):
```sql
SELECT public.fn_cron_safe_run(47::bigint, 'SELECT public.refresh_all_materialized_views();', 55000, 'refresh-all-mvs');
```

A função faz `REFRESH MATERIALIZED VIEW CONCURRENTLY` em 6 MVs (`analytics.mv_product_cards`,
`mv_product_compositions`, `mv_material_group_stats`, `mv_media_health`, `mv_stock_velocity`,
`mv_product_intelligence`, nessa ordem — `mv_stock_velocity` antes de `mv_product_intelligence`
porque esta depende daquela) + 1 refresh não-concorrente de `analytics.categories_tree_visual`
(sem índice único). Diferente do #1, aqui o custo é trabalho de banco genuíno: p50 = 28,6 s,
p95 = 42,8 s — a variância (quase 50 %) sugere que o tempo depende do volume de linhas
mudadas desde o refresh anterior, plausível para MVs de produto/estoque com giro alto.
Candidato a otimização real (índices de suporte ao refresh concorrente, ou separar as MVs
mais pesadas para frequência menor), não a um bug de desenho como o #1.

### #3 — `fantasmas-deactivate-guard` (2,90 %) — variância alta, custo total baixo

`cron.job.command` (jobid 208) roda 3 `UPDATE`s em `products` (desativar produtos "fantasma"
sem SKU/referência, desativar produtos com campo `active` travado, reativar SKUs
`XBZ-MANUAL-%`). p50 = 0,206 s mas p95 = 2,731 s e max = 9,326 s — gap de ~13x entre
mediana e p95, típico de contenção de lock/toast ocasional em `products` sob escrita
concorrente de outros jobs (`process-pending-products`, `sm-stock-guard` etc. rodam nos
mesmos minutos-alvo, 4,9,14,19...). Custo total ainda é baixo (2,9 %); não é prioridade
imediata, mas vale monitorar se o p95 crescer.

---

## 3. Ranking final dos 10 jobs mais caros (fonte: `cron.job_run_details`, 17 dias reais)

| Rank | jobname | jobid | runs | avg | p50 | p95 | total | Wrapped por `fn_cron_safe_run`? |
|---|---|---:|---:|---:|---:|---:|---:|:---:|
| 1 | asia-image-uploader | 278 | 1.265 | 60,212 s | 60,179 s | 60,391 s | 76.168,5 s | sim |
| 2 | refresh-all-materialized-views | 234 | 422 | 29,739 s | 28,558 s | 42,795 s | 12.550,0 s | sim |
| 3 | reposicao-backfill-hourly | 117 | 422 | 17,845 s | 17,743 s | 23,716 s | 7.530,7 s | **não** (objeto de E35) |
| 4 | fantasmas-deactivate-guard | 208 | 5.061 | 0,645 s | 0,206 s | 2,731 s | 3.263,5 s | sim |
| 5 | xbz-site-scrape | 269 | 2.531 | 1,082 s | 0,502 s | 2,821 s | 2.737,8 s | sim |
| 6 | pipeline-health-hourly | 60 | 422 | 5,438 s | 4,908 s | 9,769 s | 2.294,7 s | não |
| 7 | process-pending-products | 273 | 5.061 | 0,440 s | 0,118 s | 0,360 s | 2.227,8 s | sim |
| 8 | xbz-enrich-gold-extractors | 266 | 2.531 | 0,782 s | 0,681 s | 1,184 s | 1.979,9 s | sim |
| 9 | sm-stock-guard | 207 | 5.061 | 0,366 s | 0,262 s | 1,048 s | 1.853,1 s | sim |
| 10 | monitor-connections | 262 | 25.307 | 0,071 s | 0,065 s | 0,131 s | 1.805,0 s | não |

---

## 4. Candidatos a etapa de otimização

1. **`asia-image-uploader` / `fn_asia_run_image_cycle`** — prioridade máxima. Não é uma
   query lenta, é um `pg_sleep(60)` síncrono dentro de uma função `SECURITY DEFINER` chamada
   a cada 20 min, responsável por 2/3 de todo o custo de `fn_cron_safe_run` e por ~21 h dos
   ~114,85 h agregados. Redesenho sugerido: separar `fn_asia_dispatch_queue_batch` e
   `fn_asia_harvest_queue_batch` em dois cron jobs distintos (dispatch imediato; harvest no
   próximo tick, sem sleep bloqueante), eliminando a espera síncrona dentro da transação.
   Candidato a **nova etapa própria** (não é `fn_reposicao_backfill_today`, então não é E35).
2. **`refresh-all-materialized-views`** — 2º maior custo, mas é trabalho real de refresh.
   Candidato a nova etapa: `EXPLAIN (ANALYZE, BUFFERS)` de cada `REFRESH ... CONCURRENTLY`
   individualmente para achar qual das 6 MVs domina o p95 de 42,8 s, e avaliar separar a(s)
   mais pesada(s) para um schedule menos frequente que hourly.
3. **`reposicao-backfill-hourly` / `fn_reposicao_backfill_today`** — já é objeto da **E35**
   (linhas 600–607 do plano, `Dep.: E34`). Não abrir etapa nova; os números medidos aqui
   (422 execuções/17d, avg 17,845 s, total 7.530,7 s) são consistentes com o problema
   descrito em E35 (2.076 chamadas × 14.985 ms em `pg_stat_statements`, janela de 87 dias)
   e podem ser usados como evidência adicional na execução de E35.

Nenhuma alteração de schema, função ou configuração foi feita nesta etapa (`[DB-RO]`).
