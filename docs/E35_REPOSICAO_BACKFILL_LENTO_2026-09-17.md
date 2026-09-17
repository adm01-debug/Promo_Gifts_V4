# E35 — `fn_reposicao_backfill_today`: causa raiz de 17,8 s/chamada e correção proposta

`[REQUER-PO]`. Migration pronta, não aplicada:
`supabase/migrations/20260917080000_e35_fix_reposicao_backfill_perf.sql`.

Etapa do `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (linha 836).
Depende de E34 (✅ concluída) — mesma metodologia (`EXPLAIN ANALYZE` com
dados reais, nunca especulação).

---

## 1. Método `[DB-RO]`

Job: `reposicao-backfill-hourly` (jobid 117), `schedule = '5 * * * *'`
(hora em hora), `command = SELECT public.fn_reposicao_backfill_today();`,
`active = true`.

Medição real via `cron.job_run_details` (janela de retenção ~17 dias,
confirmada em E36):

```sql
SELECT count(*), avg(end_time-start_time), max(end_time-start_time),
       count(*) FILTER (WHERE status='failed')
FROM cron.job_run_details WHERE jobid = 117;
```

→ **436 execuções, média 17,79 s, máximo 32,73 s, 0 falhas** (2026-08-30 a
2026-09-17). Confirma o número do plano (14,985 ms/chamada é de uma janela
`pg_stat_statements` diferente, mesma ordem de grandeza).

A função (`fn_reposicao_backfill_today`) só faz duas coisas dentro de um
`pg_try_advisory_xact_lock` (idempotente, sem risco de execução concorrente):
1. `PERFORM public.fn_aggregate_stock_daily(v_today)` — o trabalho real.
2. Um `UPDATE` de self-heal em `stock_daily_summary` (flag booleana,
   barato — não investigado, não é candidato a custo).

Toda a investigação de causa raiz foi feita com `EXPLAIN (ANALYZE, BUFFERS)`
real (não `EXPLAIN` só de plano) contra `2026-09-15`, o dia mais recente com
dados completos — hoje (`CURRENT_DATE`) tem 0 snapshots no momento da
investigação, então não serve para medir tempo real.

---

## 2. Causa raiz #1 (dominante) — predicado não-sargável faz *full scan* do histórico inteiro a cada chamada

Dentro de `fn_aggregate_stock_daily`, a CTE principal (`open_close`, que roda
os window functions de agregação) filtra assim:

```sql
WHERE (captured_at AT TIME ZONE 'America/Sao_Paulo')::date = p_date
```

Esse predicado **não é sargável**: o Postgres não consegue usar um índice
btree simples sobre `captured_at` para pular direto para o dia certo, porque
o valor indexado (`captured_at`) está embrulhado numa conversão de fuso +
cast antes da comparação. `EXPLAIN` confirma:

```
Parallel Index Only Scan using idx_snapshots_vss_captured on stock_snapshots
  Filter: (... AND ((captured_at AT TIME ZONE 'America/Sao_Paulo')::date = '2026-09-15'))
  Rows Removed by Filter: 135210
```

**`EXPLAIN (ANALYZE, BUFFERS)` real, mesma consulta, 2026-09-15**
(4.041 linhas do dia, `stock_snapshots` tem 274.462 linhas no total / 1.574
MB):

| | Predicado atual (não-sargável) | Predicado reescrito (range sargável) |
|---|---:|---:|
| Tempo de execução | **7.513 ms** | **16 ms** |
| Buffers lidos+hit | 79.630 | 111 |
| Linhas descartadas pelo filtro | 135.210 | 0 (Index Cond já exclui) |

**~470x mais rápido**, resultado idêntico (4.041 linhas nos dois casos,
confirmado por `count(*)` comparando os dois predicados antes de qualquer
`EXPLAIN` — não é só coincidência de plano, é equivalência provada):

```sql
-- count_old_predicate = count_new_range = 4041, mesmo dia
```

**Correção**: reescrever o predicado como um range sargável, matematicamente
equivalente porque `America/Sao_Paulo` não observa horário de verão desde
2019 (sem ambiguidade de fronteira de dia):

```sql
captured_at >= (p_date::timestamp AT TIME ZONE 'America/Sao_Paulo')
AND captured_at <  ((p_date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
```

Isso permite `Index Scan using idx_snapshots_captured_at` com `Index Cond`
real (não `Filter`) — o índice já existe, não precisa criar nenhum novo.
**Nenhuma mudança de lógica de agregação** (window functions, upsert,
`ON CONFLICT` — tudo igual); é só a cláusula `WHERE` da CTE.

A função já tem histórico de bugs sutis de correção (comentário `FIX GAP-3`
no corpo, sobre a fórmula de `stock_min`) — por isso a correção proposta
aqui é deliberadamente mínima (troca de predicado, comprovada equivalente),
não um refactor da lógica de agregação.

---

## 3. Causa raiz #2 (secundária) — anti-join de baseline roda inteiro a cada hora, mesmo quando não há nada nele

A segunda parte da função insere um "baseline" para toda fonte
(`variant_supplier_source_id`) ativa que ainda não tem linha em
`stock_daily_summary` para o dia — via `NOT EXISTS` contra 19.698 fontes
ativas, a cada uma das 24 chamadas horárias.

`EXPLAIN (ANALYZE, BUFFERS)` real (hoje, quando o baseline do dia já estava
100% populado — `summary_rows_today = active_sources = 19.698`):

```
Nested Loop Anti Join (actual rows=0, loops=2)
  Buffers: shared hit=76491 read=12918 written=290
Execution Time: 2652.583 ms
```

**2,65 s por chamada para confirmar que não há nada a inserir** — depois da
primeira execução do dia (que de fato popula o baseline), as 23 chamadas
seguintes repetem o mesmo anti-join completo contra as 19.698 fontes ativas
só para achar 0 linhas novas na maioria das vezes (só há trabalho real
quando uma fonte nova fica ativa no meio do dia).

**Não incluo correção de lógica para isso nesta migration** — reduzir esse
custo exigiria reescrever a condição de guarda (ex.: só rodar o anti-join na
1ª chamada do dia, ou skip se `count(stock_daily_summary WHERE
summary_date=p_date) >= count(active_sources)`), o que é uma mudança de
comportamento na função, não só de predicado, e merece revisão own — fica
registrado aqui como achado e candidato a otimização futura, coberto pela
segunda parte da correção (redução de frequência, abaixo), que reduz o
impacto absoluto sem tocar na lógica.

---

## 4. Correção proposta — combinação de 2 mudanças de baixo risco

1. **Reescrever o predicado da CTE principal** em
   `fn_aggregate_stock_daily` (causa raiz #1, ~470x mais rápido, equivalência
   provada, zero mudança de lógica de agregação).
2. **Reduzir frequência do cron de hora em hora (24x/dia) para a cada 4 h
   (6x/dia)**, via `cron.alter_job(117, schedule := '5 */4 * * *')` — usa a
   alternativa explícita do próprio texto do plano ("reduzir... frequência")
   como mitigação complementar para a causa raiz #2 (anti-join redundante),
   sem precisar reescrever a lógica de uma função com histórico de bugs
   sutis. Efeito colateral aceitável: o baseline de uma fonte nova pode
   demorar até 4 h a mais para aparecer (hoje: até 1 h) — impacto de negócio
   desprezível (é só uma linha de baseline, não afeta estoque real).

**Estimativa de ganho**: causa raiz #1 sozinha deve levar a média de 17,79 s
para algo perto de ~10 s (a causa raiz #2, não corrigida em lógica, ainda
soma ~2,65 s por chamada, mais o custo do `UPDATE` de self-heal e do upsert
em si, não medidos isoladamente). Combinado com a redução de frequência
(24→6 chamadas/dia), o **volume total diário de tempo de cron** cai de
~427 s/dia (24 × 17,79 s) para uma estimativa de ~60 s/dia (6 × ~10 s) —
~86% de redução, mesmo sem bater o alvo de "< 2 s por chamada" isoladamente.
Se o PO quiser perseguir o alvo de < 2 s por chamada também, a causa raiz #2
precisaria de uma segunda migration com mudança de lógica (fora do escopo
desta, que prioriza correção mínima e comprovada).

---

## 5. Checklist de conclusão (do plano, §E35)

- [x] Causa identificada (2 causas raiz, ambas com `EXPLAIN ANALYZE` real,
      não especulação)
- [ ] Correção aplicada via E15 — **preparada, aguardando aprovação do PO**
- [ ] `pg_stat_statements`/`cron.job_run_details` 7 dias depois: comparar
      `avg(end_time-start_time)` de `jobid=117` contra os 17,79 s
      atuais — só mensurável após aplicação

---

## 6. Resumo para aprovação

| Mudança | Objeto | Risco |
|---|---|---|
| Reescreve predicado `WHERE` da CTE principal | `public.fn_aggregate_stock_daily(date)` | Zero — equivalência de resultado provada por `count(*)` antes/depois no mesmo dia real |
| Reduz frequência do cron de 1h para 4h | `cron.job` jobid 117 (`reposicao-backfill-hourly`) | Baixo — só atrasa (até 4h) o baseline de fonte nova, sem afetar estoque real |

Migration pronta (não aplicada):
`supabase/migrations/20260917080000_e35_fix_reposicao_backfill_perf.sql` —
precondição confirma jobid/schedule/definição atual da função antes de
alterar; pós-condição confirma novo schedule e reconfirma equivalência de
contagem de linhas para um dia histórico real (2026-09-15) após o `CREATE
OR REPLACE FUNCTION`.

Reversível: `cron.alter_job(117, schedule := '5 * * * *')` volta a
frequência; a função pode ser restaurada para o predicado original (mesma
`CREATE OR REPLACE FUNCTION`, mesmo corpo, só trocando o `WHERE`) — os dois
`CREATE OR REPLACE` completos (antes/depois) ficam registrados na migration
e neste documento para rollback textual.

**[REQUER-PO]** — aguardando aprovação.
