# E25 — Automação de partições de `supplier_products_raw_history` (2026-09-16)

`[REQUER-PO]`. Nenhuma ação abaixo foi executada. Migration pronta, não aplicada:
`supabase/migrations/20260916193000_e25_supplier_history_partition_automation.sql`.

Etapa do `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (linhas 520-531).
Prazo duro citado no plano: **2026-12-15**.

---

## 1. Estado ao vivo (confirmado via `pg_catalog`, read-only)

```sql
SELECT relname, pg_size_pretty(pg_relation_size(oid)) AS size
FROM pg_class
WHERE relispartition AND relname LIKE 'supplier_products_raw_history_p%'
ORDER BY relname;
```

- `public.supplier_products_raw_history` é partitioned (`relkind='p'`), ~1.426.745 linhas.
- 7 partições mensais vivas: `p2026_06` (577MB), `p2026_07` (513MB), `p2026_08` (754MB),
  `p2026_09` (314MB), `p2026_10`/`p2026_11`/`p2026_12` (16kB cada, ainda sem dados).
- **Nenhuma partição para 2027 em diante** — confirma o problema central do plano.
- **Sem partição DEFAULT** — hoje, um INSERT com `captured_at` de janeiro/2027 falharia
  com erro fatal de partição ("no partition of relation found for row"), não com
  degradação silenciosa. Isso é uma interrupção dura do pipeline Bronze, não um alerta.

**Correção ao texto do plano:** a coluna de particionamento é `captured_at`
(confirmado via `pg_partitioned_table` + `pg_attribute`), não `created_at` como o
texto do plano (linha ~522) menciona.

---

## 2. Opção A (pg_partman) vs Opção B (função + pg_cron) — decisão

```sql
SELECT extname, extversion FROM pg_extension;
```

Confirmado: só `pg_cron` (1.6.4) instalada. `pg_partman` **não está instalada**.

**Decisão: Opção B.** Motivos:
- Não requer instalar extensão nova em produção (menor superfície de mudança).
- Replica um padrão já em produção, comprovado, sem incidente conhecido:
  `public.magazine_ensure_view_event_partitions(_months_ahead integer DEFAULT 3)` +
  cron `magazine-partition-maintenance` (jobid 301, `0 4 * * *`, ativo).
- `supplier_products_raw_history` não tem GRANT nem policy por partição (verificado
  vazio em `information_schema.role_table_grants` e `pg_policy` para
  `supplier_products_raw_history_p2026_09`) — a função nova é mais simples que o
  espelho, não precisa replicar os passos de RLS/GRANT por partição do padrão da
  revista.

---

## 3. Desenho entregue

- `public.fn_ensure_history_partitions(p_months_ahead integer DEFAULT 3)` — idempotente,
  cria partições mensais faltantes do mês atual até `p_months_ahead` à frente.
- Chamada de backfill imediata com `p_months_ahead := 6` na própria migration — cobre
  até 2027-02, bem depois do prazo de 2026-12-15, independente do cron.
- `public.supplier_products_raw_history_default` — partição DEFAULT nova (rede de
  segurança; hoje não existe).
- **Job 1** `supplier-history-partition-maintenance` (`0 4 * * *`) — via
  `fn_cron_safe_run`, chama `fn_ensure_history_partitions(3)` diariamente (mantém
  3 meses de folga rolante).
- **Job 2** `supplier-history-default-partition-alert` (`15 4 * * *`) — **sem**
  `fn_cron_safe_run`. `RAISE EXCEPTION` direto se `count(*) > 0` na partição DEFAULT.

### Por que o alerta não passa por `fn_cron_safe_run`

Lida a definição completa de `public.fn_cron_safe_run`: tem bloco
`EXCEPTION WHEN OTHERS THEN RETURN format('[%s] ERRO: %s', ...)` — captura **toda**
exceção internamente e sempre retorna normalmente. Uma `RAISE EXCEPTION` dentro dela
nunca vira `cron.job_run_details.status='failed'`; vira só um valor de retorno textual
cuja visibilidade downstream não é garantida. Um alerta que precisa aparecer como job
falho não pode passar por esse wrapper — por isso o Job 2 é um `DO` bloco cru,
agendado direto via `cron.schedule`, sem chamar `fn_cron_safe_run`.

### Por que não depende do schema `ops` (E30)

```sql
SELECT 1 FROM information_schema.schemata WHERE schema_name = 'ops';
-- 0 linhas
```

`ops` ainda não existe (é entrega de E30, também `[REQUER-PO]`, ainda não aprovado).
E25 tem prazo duro e não deveria ficar bloqueada por outra etapa `[REQUER-PO]`
pendente — por isso o alerta usa o mecanismo nativo do pg_cron
(`cron.job_run_details.status`) em vez de logar em uma tabela `ops.*` que ainda não
existe. Se/quando E30 for aprovado, nada aqui impede adicionar um log complementar
depois.

`cron_watchdog_log` (tabela existente) foi avaliada e descartada para este uso — é
especificamente o log do watchdog de queries longas (`killed_at`, `pid`, `query_start`,
`duration_ms`), não um log de alertas genérico.

---

## 4. Efeito esperado, teste de reversão

**Efeito esperado:** função + partição DEFAULT + 2 cron jobs criados; partições
`p2027_01`/`p2027_02` (e demais até 6 meses à frente) criadas imediatamente. Partição
DEFAULT nasce vazia (validado por pós-condição na própria migration).

**Teste de reversão:**
```sql
SELECT cron.unschedule('supplier-history-partition-maintenance');
SELECT cron.unschedule('supplier-history-default-partition-alert');
DROP TABLE public.supplier_products_raw_history_default;
DROP FUNCTION public.fn_ensure_history_partitions(integer);
-- partições futuras (p2026_10 em diante, p2027_*) podem ficar — são inertes até
-- terem dados, e recriá-las não tem custo. Removê-las é opcional:
-- DROP TABLE public.supplier_products_raw_history_p2027_01; (etc.)
```

---

## 5. Resumo para aprovação

| Item | Tipo | Risco | Reversível |
|---|---|---|---|
| `fn_ensure_history_partitions()` (função nova) | DDL real | Baixo — só cria tabelas, não mexe em dado existente | Sim, `DROP FUNCTION` |
| Backfill imediato (6 partições futuras) | DDL real | Nenhum — partições vazias | Sim, `DROP TABLE` por partição |
| Partição DEFAULT | DDL real | Baixo — nasce vazia, é rede de segurança | Sim, `DROP TABLE` (se vazia) |
| Cron `supplier-history-partition-maintenance` | Cron novo | Baixo — mesmo padrão do cron `magazine-partition-maintenance` já em produção | Sim, `cron.unschedule` |
| Cron `supplier-history-default-partition-alert` | Cron novo | Nenhum — só lê e conta, nunca escreve | Sim, `cron.unschedule` |

Responda "aprovado" para aplicar a migration `20260916193000_e25_supplier_history_partition_automation.sql` inteira, ou peça ajuste.
