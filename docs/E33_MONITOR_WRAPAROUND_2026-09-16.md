# E33 · Monitor de wraparound, TOAST e sequências — preparação

**Etapa:** E33 do `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (linhas 578–584) · Classificação `[GIT]`
**Projeto canônico:** `doufsxqlfjyuvxuezpln` (database `postgres`, PG17) · **Data da medição:** 2026-09-16
**Método:** `pg_catalog` exclusivamente (`mcp__supabase__execute_sql`, somente leitura), conforme REGRA #8 do `CLAUDE.md`.
**Git no momento da medição:** branch `claude/audit-gaps-20260915` @ `4dd776920`

> **STATUS: NADA FOI APLICADO NO BANCO.** Nenhum `CREATE`/`ALTER`/`INSERT` foi executado. Este
> documento contém apenas medições (`SELECT`) e uma **proposta** de tabela + cron job para o
> pacote de aprovação de E30/E33. A parte "criar cron/tabela" desta etapa depende de aprovação
> explícita do PO (REGRA #8 do `CLAUDE.md`) e do objeto de banco de E30 (`[REQUER-PO]`, ainda não
> aprovado) — ver Dep. no plano.

---

## 1. Números medidos hoje (2026-09-16)

### 1.1 `age(datfrozenxid)` — risco de wraparound de transação

```sql
SELECT datname, datfrozenxid, age(datfrozenxid) AS xid_age,
       datminmxid, mxid_age(datminmxid) AS mxid_age
FROM pg_database WHERE datname = current_database();
```

| datname | datfrozenxid | `age(datfrozenxid)` | datminmxid | `mxid_age(datminmxid)` |
|---|---|---|---|---|
| postgres | 730 | **46.004.605** | 1 | **30.674.423** |

**Leitura:**
- Limite físico de wraparound de XID é ~2,15 bilhões (2³¹−1); os thresholds pedidos são
  >1.000.000.000 (aviso) e >1.500.000.000 (crítico).
  Hoje: 46.004.605 = **2,3 %** do threshold de aviso, **2,1 %** do limite físico. Saudável.
- Nota técnica: a idade de multixact (`datminmxid`) **não** usa `age()` — usa `mxid_age()`
  (funções diferentes; `age()` aplicado a um multixact ID retorna lixo, não um erro, o que é uma
  armadilha comum). Medido aqui por completude; o plano só pede `datfrozenxid`, mas como o mesmo
  mecanismo de shutdown por wraparound existe para multixact, incluí como métrica extra na
  proposta de tabela (§3).

### 1.2 Sequências `int4`/`int2` vs. limite do tipo

```sql
SELECT
  s.schemaname, s.sequencename, s.data_type AS seq_type, s.last_value, s.max_value,
  n2.nspname AS owner_schema, c2.relname AS owner_table, a.attname AS owner_column,
  format_type(a.atttypid, a.atttypmod) AS owner_column_type,
  round(100.0 * COALESCE(s.last_value,0)::numeric / s.max_value::numeric, 4) AS pct_used
FROM pg_sequences s
JOIN pg_namespace sn ON sn.nspname = s.schemaname
JOIN pg_class sc ON sc.relname = s.sequencename AND sc.relnamespace = sn.oid
LEFT JOIN pg_depend d ON d.objid = sc.oid AND d.deptype = 'a'
LEFT JOIN pg_class c2 ON c2.oid = d.refobjid
LEFT JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
LEFT JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
WHERE s.data_type IN ('smallint','integer')
ORDER BY pct_used DESC NULLS LAST;
```

**Resultado: 10 sequências `int4`, 0 sequências `int2` (`smallint`) no banco inteiro.**

| schema | sequência | last_value | max_value (limite) | pct_used | tabela.coluna dona |
|---|---|---:|---:|---:|---|
| graphql | seq_schema_version | 229.188 | 2.147.483.647 | 0,0107 % | (sem dono — contador interno do `pg_graphql`, não é `OWNED BY`) |
| public | sm_worker_partitions_id_seq | 10 | 2.147.483.647 | 0,0000 % | `public.sm_worker_partitions.id` |
| public | classify_functions_registry_id_seq | 25 | 2.147.483.647 | 0,0000 % | `public.classify_functions_registry.id` |
| prod_audit | classification_rules_id_seq | 20 | 2.147.483.647 | 0,0000 % | `prod_audit.classification_rules.id` |
| public | import_pipeline_steps_id_seq | 50 | 2.147.483.647 | 0,0000 % | `public.import_pipeline_steps.id` |
| public | **_qa_pct_results_id_seq** | **322** | 2.147.483.647 | 0,0000 % | `public._qa_pct_results.id` |
| supplier_stricker | stg_product_types_id_seq | *(nunca usada)* | 2.147.483.647 | — | `supplier_stricker.stg_product_types.id` |
| supplier_stricker | stg_colors_id_seq | *(nunca usada)* | 2.147.483.647 | — | `supplier_stricker.stg_colors.id` |
| supplier_stricker | stg_images_id_seq | *(nunca usada)* | 2.147.483.647 | — | `supplier_stricker.stg_images.id` |
| supplier_stricker | stg_customizations_id_seq | *(nunca usada)* | 2.147.483.647 | — | `supplier_stricker.stg_customizations.id` |

**Leitura:**
- O número "322" citado no plano (`public._qa_pct_results_id_seq`) bate com a medição — é a maior
  sequência `int4` **entre as que pertencem a uma tabela de aplicação**.
- A sequência mais avançada em termos absolutos é `graphql.seq_schema_version` (229.188), um
  contador interno do `pg_graphql` que incrementa a cada mudança de schema (DDL) — não pertence a
  nenhuma tabela (`deptype='a'` não encontra dono), então não é candidata a estouro de PK, mas
  ainda assim é `int4` e vale monitorar já que cresce com toda alteração de schema no projeto.
- Todas as 10 sequências estão em **0,01 % ou menos** do limite do tipo. Nenhuma alerta hoje sob
  o threshold de 50 % citado no plano.

### 1.3 Replication slots

```sql
SELECT slot_name, slot_type, active, active_pid, wal_status, restart_lsn,
       pg_current_wal_lsn() AS current_lsn,
       pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS retained_bytes
FROM pg_replication_slots
ORDER BY retained_bytes DESC NULLS LAST;
```

| slot_name | tipo | active | wal_status | retained_bytes |
|---|---|---|---|---:|
| supabase_realtime_replication_slot_2_135_4_a886414 | logical | **true** | reserved | 38.144 (37 kB) |
| supabase_realtime_messages_replication_slot_2_135_4_a886414 | logical | **true** | reserved | 38.144 (37 kB) |

**Leitura:** 2 slots, ambos do Supabase Realtime, ambos **ativos** e com WAL retido irrisório
(37 kB). Nenhum slot inativo hoje — o cenário de alerta (`active = false AND retained > 1 GB`)
não tem nenhum candidato no momento. Confirma "slots saudáveis" do plano.

### 1.4 TOAST — top 10 por proporção TOAST/heap (schemas de usuário, TOAST > 1 MB)

```sql
SELECT n.nspname AS schema_name, c.oid::regclass AS table_name,
       pg_relation_size(c.oid) AS heap_bytes,
       pg_relation_size(t.oid) AS toast_bytes,
       pg_total_relation_size(c.oid) AS total_bytes,
       round(100.0 * pg_relation_size(t.oid) / NULLIF(pg_relation_size(c.oid),0), 1) AS toast_pct_of_heap
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_class t ON t.oid = c.reltoastrelid
WHERE c.relkind = 'r' AND c.reltoastrelid <> 0
  AND n.nspname NOT IN ('pg_catalog','information_schema')
  AND pg_relation_size(t.oid) > 1048576
ORDER BY toast_pct_of_heap DESC NULLS LAST
LIMIT 10;
```

| tabela | heap | TOAST | total | TOAST/heap |
|---|---:|---:|---:|---:|
| `public.generated_mockups` | 8 KB | 1,7 MB | 1,9 MB | **21.700 %** |
| `public.products` | 44 MB | 75 MB | 175 MB | **170,7 %** |
| `public.audit_log_gravacao` | 1,1 MB | 1,4 MB | 2,7 MB | 127,3 % |
| `supabase_migrations.schema_migrations` | 2,1 MB | 1,7 MB | 4,0 MB | 79,4 % |
| `public.supplier_products_raw` | 257 MB | 69 MB | 353 MB | 26,8 % |
| `public.frontend_telemetry` | 42 MB | 1,4 MB | 47 MB | 3,2 % |
| `public.supplier_products_raw_history_p2026_07` | 492 MB | 2,7 MB | 513 MB | 0,5 % |
| `public.supplier_products_raw_history_p2026_09` | 302 MB | 1,4 MB | 314 MB | 0,5 % |
| `public.supplier_products_raw_history_p2026_06` | 554 MB | 2,5 MB | 577 MB | 0,4 % |
| `public.supplier_products_raw_history_p2026_08` | 723 MB | 3,0 MB | 754 MB | 0,4 % |

**Leitura:**
- `generated_mockups` tem heap quase vazio (8 KB, provavelmente poucas linhas com muitas colunas
  `NULL`) e quase todo o conteúdo (imagens/JSON grandes) foi para TOAST — 21.700 % é uma proporção
  extrema mas **inofensiva** em termos absolutos (1,7 MB). Um alerta só por `%` seria ruído puro
  aqui; ver critério composto em §2.
- `products` é o caso que importa de verdade: 75 MB de TOAST (provavelmente `description`,
  campos JSON/array de atributos, imagens embutidas) sobre 44 MB de heap — mais da metade do
  tamanho total da tabela (175 MB) é TOAST. Como `products` é a tabela central do catálogo, um
  crescimento continuado de TOAST aqui é o sinal mais acionável desta lista.
- As partições `supplier_products_raw_history_p2026_*` são grandes em heap mas TOAST desprezível
  (<1 %) — comportamento esperado de tabela de histórico com poucas colunas longas.

---

## 2. Thresholds propostos

| Métrica | Aviso (issue label `db-warning`) | Crítico (issue label `db-critical`) | Fonte |
|---|---|---|---|
| `age(datfrozenxid)` (banco atual) | > 1.000.000.000 | > 1.500.000.000 | Pedido explícito da tarefa (limite físico ~2,1 bi) |
| `mxid_age(datminmxid)` (banco atual) | > 1.000.000.000 | > 1.500.000.000 | Mesmo mecanismo de shutdown; mesmo threshold por simetria — revisar com PO se quiser valor próprio |
| sequência `int4`/`int2`: `last_value / max_value` | > 50 % | > 80 % | Plano (E33: "sequências int4 > 50 %") + threshold crítico adicional proposto |
| replication slot: `active = false AND retained_bytes` | > 1 GB (1.073.741.824 bytes) | > 5 GB | Plano (E33: "WAL retido > 1 GB") + threshold crítico adicional proposto |
| TOAST: `toast_bytes / heap_bytes` | > 200 % **E** `toast_bytes` > 50 MB (composto) | > 500 % **E** `toast_bytes` > 200 MB | Não estava no texto do plano; proposto aqui porque `%` isolado gera ruído em tabelas pequenas (caso `generated_mockups` em §1.4) |

**Por que threshold composto no TOAST:** com `products` hoje em 170,7 % / 75 MB, um limiar de
"200 % E 50 MB" não dispara ainda, mas fica perto o suficiente para servir de sentinela real —
enquanto ainda filtra ruído de tabelas pequenas que naturalmente têm proporções TOAST altas
(qualquer tabela quase vazia com uma coluna grande soa "alarmante" em % e não é).

---

## 3. Decisão de esquema: tabela nova, não reaproveitar `ops.table_size_history`

`ops.table_size_history` (proposta em E30) tem a forma `(captured_at, schema, table, total_bytes,
live_tup)` — uma linha por tabela por dia, pensada para série de crescimento de tamanho por
objeto. As métricas de E33 não cabem nesse formato:

- `age(datfrozenxid)` e `mxid_age(datminmxid)` são **por banco**, não por tabela — não têm
  `schema`/`table` natural.
- Sequências são objetos `pg_class` diferentes de tabelas (mesmo catálogo, semântica diferente).
- Replication slots não são relations (`pg_class`) — não têm `oid` de tabela.
- TOAST é por tabela, então *esse* pedaço até caberia em `table_size_history`, mas fatiar uma
  métrica em duas tabelas (TOAST em uma, o resto em outra) complica o cron single-statement e a
  consulta de alerta sem ganho real.

**Decisão:** tabela nova, `ops.wraparound_monitor_log`, formato genérico (uma linha por métrica
por objeto por dia), para caber os 4 tipos de métrica heterogêneos num único `INSERT`
single-statement. `ops.table_size_history` (E30) continua sendo a série de crescimento por
tabela; `ops.wraparound_monitor_log` (E33) é a série de risco de wraparound/TOAST/replicação.
Ambas no schema `ops` (ainda não existe — confirmado por
`SELECT nspname FROM pg_namespace WHERE nspname = 'ops'` → 0 linhas hoje), então a criação do
schema `ops` em si também depende da aprovação de E30 (é o primeiro dos dois a precisar dele).

---

## 4. SQL proposto (NÃO APLICADO — para o pacote de aprovação E30/E33)

### 4.1 Tabela

```sql
-- PROPOSTA — não aplicado. Depende de aprovação do PO (schema `ops` criado por E30 ou aqui).
CREATE TABLE IF NOT EXISTS ops.wraparound_monitor_log (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    captured_at   timestamptz NOT NULL DEFAULT now(),
    metric        text NOT NULL,        -- 'xid_age' | 'mxid_age' | 'sequence_pct_used'
                                          -- | 'replication_slot_retained_bytes' | 'toast_pct_of_heap'
    object_name   text,                 -- ex.: 'postgres', 'public._qa_pct_results_id_seq',
                                          -- slot name, ou 'public.products'
    value_numeric numeric,              -- valor bruto (idade em xids, bytes, last_value, etc.)
    value_pct     numeric,              -- percentual do limite, quando aplicável (NULL se não)
    unit          text,                 -- 'xid' | 'mxid' | 'bytes' | 'pct'
    detail        jsonb,                -- contexto extra (tabela/coluna dona da sequência,
                                          -- active/wal_status do slot, heap_bytes/toast_bytes)
    CONSTRAINT wraparound_monitor_log_metric_check
        CHECK (metric IN ('xid_age','mxid_age','sequence_pct_used',
                           'replication_slot_retained_bytes','toast_pct_of_heap'))
);

CREATE INDEX IF NOT EXISTS ix_wraparound_monitor_log_metric_date
    ON ops.wraparound_monitor_log (metric, captured_at DESC);

COMMENT ON TABLE ops.wraparound_monitor_log IS
    'E33: série diária de risco de wraparound de XID/multixact, uso de sequências int4/int2, '
    'WAL retido por replication slot e proporção TOAST/heap. Alimentada por cron single-statement '
    '(fn_cron_safe_run). Ver docs/E33_MONITOR_WRAPAROUND_2026-09-16.md.';
```

### 4.2 Cron job (single-statement, via `fn_cron_safe_run`)

`fn_cron_safe_run(p_key bigint, p_sql text, p_timeout_ms integer, p_job_label text)` já existe em
produção (confirmado via `pg_proc`). O maior `p_key` em uso hoje é **166**
(`fantasmas-deactivate-guard`) — proponho `p_key = 167`, a confirmar no momento da aplicação real
(outros jobs podem ter sido criados entre esta medição e a aprovação).

O `p_sql` abaixo é **um único `INSERT ... SELECT` com `UNION ALL`** — continua sendo um só
statement top-level (sem `;` interno), respeitando a regra do projeto contra jobs multi-statement
(E37: um erro no meio de um bloco multi-statement aborta os statements seguintes sem registrar
falha).

```sql
-- PROPOSTA — não aplicado.
SELECT cron.schedule(
  'wraparound-toast-sequence-monitor',
  '0 6 * * *',  -- diário, 06:00 UTC
  $cron$
  SELECT public.fn_cron_safe_run(
    167::bigint,
    $sql$
    INSERT INTO ops.wraparound_monitor_log (metric, object_name, value_numeric, value_pct, unit, detail)
    -- 1) idade de XID do banco atual
    SELECT 'xid_age', current_database(), age(datfrozenxid)::numeric,
           round(100.0 * age(datfrozenxid) / 2000000000.0, 4), 'xid',
           jsonb_build_object('datfrozenxid', datfrozenxid)
    FROM pg_database WHERE datname = current_database()
    UNION ALL
    -- 2) idade de multixact do banco atual
    SELECT 'mxid_age', current_database(), mxid_age(datminmxid)::numeric,
           round(100.0 * mxid_age(datminmxid) / 2000000000.0, 4), 'mxid',
           jsonb_build_object('datminmxid', datminmxid)
    FROM pg_database WHERE datname = current_database()
    UNION ALL
    -- 3) sequências int4/int2 vs. limite do tipo
    SELECT 'sequence_pct_used', s.schemaname || '.' || s.sequencename,
           COALESCE(s.last_value, 0)::numeric, round(100.0 * COALESCE(s.last_value,0)::numeric / s.max_value::numeric, 4),
           'pct',
           jsonb_build_object('owner_table', c2.relname, 'owner_column', a.attname, 'seq_type', s.data_type)
    FROM pg_sequences s
    JOIN pg_namespace sn ON sn.nspname = s.schemaname
    JOIN pg_class sc ON sc.relname = s.sequencename AND sc.relnamespace = sn.oid
    LEFT JOIN pg_depend d ON d.objid = sc.oid AND d.deptype = 'a'
    LEFT JOIN pg_class c2 ON c2.oid = d.refobjid
    LEFT JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
    WHERE s.data_type IN ('smallint','integer')
    UNION ALL
    -- 4) replication slots: WAL retido
    SELECT 'replication_slot_retained_bytes', slot_name,
           pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)::numeric, NULL, 'bytes',
           jsonb_build_object('active', active, 'wal_status', wal_status)
    FROM pg_replication_slots
    UNION ALL
    -- 5) TOAST top 10 por proporção (schemas de usuário, TOAST > 1 MB)
    SELECT 'toast_pct_of_heap', c.oid::regclass::text,
           pg_relation_size(t.oid)::numeric,
           round(100.0 * pg_relation_size(t.oid) / NULLIF(pg_relation_size(c.oid),0), 1), 'pct',
           jsonb_build_object('heap_bytes', pg_relation_size(c.oid), 'total_bytes', pg_total_relation_size(c.oid))
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_class t ON t.oid = c.reltoastrelid
    WHERE c.relkind = 'r' AND c.reltoastrelid <> 0
      AND n.nspname NOT IN ('pg_catalog','information_schema')
      AND pg_relation_size(t.oid) > 1048576
    ORDER BY 4 DESC NULLS LAST
    LIMIT 10
    $sql$,
    30000,
    'wraparound-monitor'
  );
  $cron$
);
```

Notas de projeto:
- `LIMIT 10` dentro de um `UNION ALL` branch aplica-se só àquele `SELECT` (precisa de parênteses
  em Postgres para `ORDER BY`/`LIMIT` por branch — a versão final deve envolver o branch 5 em
  `(SELECT ... ORDER BY ... LIMIT 10)` explícito; simplificado aqui para legibilidade).
- Timeout de 30 s é folgado para 5 varreduras de catálogo pequenas; pode ser reduzido após medir
  a duração real no primeiro dia.
- `fn_cron_safe_run` já cobre advisory lock + `statement_timeout` — não precisa de lock adicional.

---

## 5. Critério de alerta (esboço — não implementado)

O padrão já usado no repo para "medir e abrir issue sem duplicar" é
`.github/workflows/uptime-monitor.yml`: workflow agendado, `psql`/conexão direta ao banco (padrão
também visto em `security-definer-acl-multi-env.yml`, `migration-dry-run.yml`), grava resultado,
e se falhar/threshold estourado, abre ou comenta numa issue existente com label fixa (evita
duplicar). Um futuro workflow `wraparound-monitor.yml` seguiria o mesmo esqueleto:

1. Agendado após o cron do banco (ex.: `15 6 * * *`, 15 min depois das 06:00 UTC do INSERT).
2. Query única em `ops.wraparound_monitor_log` filtrando `captured_at::date = current_date` e
   comparando `value_pct`/`value_numeric` contra os thresholds da tabela §2 — uma linha de saída
   por métrica que estourou (aviso ou crítico), formatada como Markdown para o corpo da issue.
3. Se alguma linha estourou o threshold: abrir/comentar issue com label `db-warning` ou
   `db-critical` (crítico teria prioridade se ambos dispararem no mesmo dia), busca por issue
   aberta existente com a label antes de criar uma nova (igual ao uptime-monitor).
4. Checklist do plano "Teste de alerta com limiar artificial": rodar a query de alerta manualmente
   com um `WHERE value_pct > 0` temporário (sem gravar nada) para provar que o workflow abriria
   issue corretamente, antes de confiar no threshold real de produção.

Este workflow **não foi criado** nesta preparação — fica registrado aqui como próximo passo do
pacote de aprovação, condicionado à criação da tabela/cron em §4.

---

## 6. Resumo do estado (para o pacote de aprovação E30/E33)

| Item | Estado |
|---|---|
| Medição das 4 métricas | Feita, somente leitura, `pg_catalog` (REGRA #8) |
| Risco hoje | Nenhuma métrica em aviso ou crítico |
| Schema `ops` | Não existe ainda — depende de E30 |
| `ops.wraparound_monitor_log` | Não criado — proposta em §4.1 |
| Cron `wraparound-toast-sequence-monitor` | Não criado — proposta em §4.2, `p_key` 167 a confirmar no momento da aplicação |
| Workflow de alerta | Não criado — esboço em §5 |
| Alteração no banco nesta tarefa | **Nenhuma** |
| Aprovação necessária | PO, explícita, antes de aplicar qualquer `CREATE`/`cron.schedule` (REGRA #8 do `CLAUDE.md`) |
