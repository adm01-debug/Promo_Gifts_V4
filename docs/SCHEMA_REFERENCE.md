# SCHEMA_REFERENCE.md — Banco Canônico PromoGifts (Gold/Medallion)

> **Projeto:** `doufsxqlfjyuvxuezpln` — SSOT de produção (serve promogifts.com.br via Vercel).
> **Auditado em:** 2026-09-16 · **PostgreSQL:** 17.6 · **Tamanho:** 6.374 MB
> **Método:** exclusivamente via `pg_catalog` / `information_schema`. **Read-only.** Nenhuma DDL executada.
> **Gerado por:** sessão Claude (E04 de `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md`)
> **Substitui:** versão de 2026-07-16. Divergência medida > 5% em quase toda métrica — regenerado por completo, não remendado (regra do próprio documento, §10).

---

## 0. REGRA DE MÉTODO (leia antes de auditar este banco)

**Auditoria de schema é feita SÓ via `pg_catalog`.** Nunca via PostgREST/OpenAPI.

Motivo: PostgREST não enxerga trigger, policy, cron job nem GRANT, e confunde view com tabela.
Um "inventário" tirado do OpenAPI produz um retrato falso e leva a decisões erradas —
foi exatamente o que gerou o `CANONICAL_DB_CREATION_PROMPT` (ver §7).

Toda query deste documento está em §8 e é reproduzível.

---

## 1. SUMÁRIO EXECUTIVO

| Objeto | Qtd |
|---|---|
| Tabelas base (`public`) | **383** |
| Tabelas particionadas | 2 (`magazine_public_view_events`, `supplier_products_raw_history`) |
| Colunas (`public`) | **7.799** |
| Views | **193** |
| Materialized views | 12 |
| Funções | **1.320** (563 SECURITY DEFINER) |
| Policies RLS | **940** |
| Triggers | 395 |
| Índices | 1.182 |
| Foreign keys | 405 |
| Enums | 15 |
| Cron jobs | **138** (136 ativos) |

### Comparativo com a auditoria anterior (2026-07-16 → 2026-09-16)

| Objeto | 07-16 | 09-16 | Δ |
|---|---|---|---|
| Tabelas base (`public`) | 388 | 383 | −5 |
| Tabelas particionadas | 2 | 2 | = |
| Colunas (`public`) | 7.571 | 7.799 | +228 |
| Views | 190 | 193 | +3 |
| Materialized views (escopo corrigido — ver §6) | 5 | 12 | +7 |
| Funções | 1.277 (529 SECDEF) | 1.320 (563 SECDEF) | +43 (+34 SECDEF) |
| Policies RLS | 906 | 940 | +34 |
| Triggers | 385 | 395 | +10 |
| Índices | 1.242 | 1.182 | −60 |
| Foreign keys | 395 | 405 | +10 |
| Enums | 15 | 15 | = |
| Cron jobs | 136 (134 ativos) | 138 (136 ativos) | +2 |
| Extensões instaladas | 16 | 16 | = |

### Schemas com tabelas

| Schema | Tabelas | Papel |
|---|---|---|
| `public` | 383 | Aplicação (Bronze/Silver/Gold + auth + ops) |
| `auth` | 23 | Managed (Supabase) |
| `supplier_stricker` | 17 | Landing dedicado SPOT/Stricker |
| `realtime` | 10 | Managed |
| `storage` | 8 | Managed |
| `cf_recon` | 6 | Reconciliação Cloudflare Images |
| `prod_audit` | 5 | Auditoria de produção |
| `net`, `cron`, `vault`, `extensions`, `supabase_migrations`, `supabase_functions` | 1–2 | Managed |
| `classification_audit` | 1 | Auditoria de classificação |
| `analytics` | — (só views/matviews) | Materialized views internas/analíticas |
| `internal` | — (só matview) | `mv_product_leaf_category` (movida de `public` em 2026-07-17) |

> ⚠️ `supplier_stricker`, `cf_recon`, `prod_audit`, `classification_audit`, `analytics` e `internal` são
> **schemas de aplicação**, não managed. Qualquer auditoria que olhe só `public` perde esse universo.
>
> ⚠️⚠️ **Achado novo em 2026-09-16:** dos 6 schemas de aplicação acima, **5 não têm NENHUMA migration
> versionada que os crie** (`analytics`, `supplier_stricker`, `cf_recon`, `prod_audit`,
> `classification_audit` — só `internal` tinha). Foram construídos inteiramente fora do fluxo de
> migrations ao longo de meses. Corrigido parcialmente via bootstrap com `pg_dump` real — ver §7-B.

### Extensões instaladas (16)

`http 1.6` · `hypopg 1.4.1` · `index_advisor 0.2.0` · `moddatetime 1.0` · `pg_cron 1.6.4` ·
`pg_graphql 1.5.11` · `pg_net 0.19.5` · `pg_stat_statements 1.11` · `pg_trgm 1.6` ·
`pgcrypto 1.3` · `pgmq 1.5.1` · `plpgsql 1.0` · `supabase_vault 0.3.1` · `unaccent 1.1` ·
`uuid-ossp 1.1` · `wrappers 0.5.7`

Inalterado desde 2026-07-16.

---

## 2. POSTURA DE SEGURANÇA — ESTADO REAL

| Controle | 07-16 | **09-16** | Status |
|---|---|---|---|
| Tabelas com RLS habilitado | 388/388 | **383/383** | ✅ 100% |
| Tabelas com RLS mas **sem policy** | 0 | **2** (`magazine_duplicate_requests`, `anon_catalog_grant_audit_log`) | ⚠️ novo — ver P5 |
| Tabelas com FORCE RLS | — | **1** (`mcp_api_keys`) | ℹ️ |
| SECURITY DEFINER **sem `search_path`** | 0 | **0** | ✅ mantido |
| Views **sem `security_invoker`** | 0 de 190 | **8 de 193** (todas `v_*_public`, todas com SELECT para `anon`) | ℹ️ desenho novo, não regressão — ver P6 |
| SECDEF executável por `anon` | 22 | **11** | ✅ −50% |
| SECDEF executável por `authenticated` | 69 | **94** | ⚠️ +36% — ver P7 |
| `anon` GRANT de escrita (P1 de 07-16) | ~230 tabelas | **0** | ✅ **FECHADO** |
| Partições `magazine_public_view_events` com RLS off | 0 | 0 | ✅ mantido |
| FKs para `auth.users` | 69 | **82** | ℹ️ crescimento esperado (novas tabelas) |
| Constraints `NOT VALID` | — | **1** | ⚠️ investigar (ver E21 do plano DBA) |

**P1 de 07-16 está oficialmente fechado:** `SELECT count(*) FROM information_schema.role_table_grants WHERE grantee='anon' AND privilege_type IN ('INSERT','UPDATE','DELETE')` → **0**. Não regredir — gate permanente recomendado em E22 do plano DBA.

---

## 3. ACHADOS ABERTOS (revisão 2026-09-16)

### 🟢 P1 (07-16) — `anon` com GRANT de escrita — **FECHADO**

Confirmado `0` tabelas hoje. Mecanismo que substituiu os grants diretos: as 8 views `v_*_public`
SECURITY DEFINER (P6). Manter gate permanente (E22 do plano DBA) para não regredir.

### 🟠 P2 (07-16) — cron jobs multi-statement — **ainda aberto, piorou em contagem**

Hoje: **59 cron jobs ativos multi-statement** (query §8.4). Mesma regra do bug #13
(`VACUUM` em pg_cron deve ser single-statement). Ver E37 do plano DBA.

### 🟡 P3 (07-16) — cron jobs desligados — **inalterado**

`process-webhook-outbox` e `pipeline-classify-categories` seguem inativos. Ver E38 do plano DBA.

### 🟡 P4 (07-16) — drift de documentação em `products` — **ainda aberto**

Não reverificado nesta rodada (fora do escopo desta regeneração). Ver E45 do plano DBA.

### 🔴 P5 (NOVO, 2026-09-16) — 2 tabelas com RLS habilitada e zero policies

`magazine_duplicate_requests` e `anon_catalog_grant_audit_log`. Achado ao investigar: existe uma
migration (`20260716000055_dynamic_explicit_deny_rls_no_policy_tables.sql`) desenhada especificamente
para varrer todas as tabelas RLS-sem-policy e adicionar uma policy `RESTRICTIVE ... USING (false)`
chamada `internal_deny_direct_access` — **mas essa migration nunca foi aplicada** (`SELECT count(*)
FROM pg_policies WHERE policyname='internal_deny_direct_access'` → **0** em todo o banco). Não é
falha de desenho, é falha de execução: a correção já existe, pronta, e nunca rodou. Ver E19 do
plano DBA — pode ser resolvido rodando essa migration (ou uma equivalente atualizada) pelo caminho
apropriado (`[REQUER-PO]`).

### ℹ️ P6 (NOVO, 2026-09-16, gate fechado no mesmo dia) — 8 views SECURITY DEFINER sem `security_invoker`, expostas a `anon`

`v_variant_sale_prices_public, v_kit_component_media_public, v_suppliers_public,
v_product_tags_public, v_products_public, v_tabela_preco_gravacao_oficial_public,
v_product_properties_public, v_product_compositions_public`. Rodam como owner (`security_invoker=false`
confirmado ao vivo nas 8), todas com SELECT para `anon`. **Não é regressão** — é o desenho intencional
que permitiu fechar o P1 (o catálogo anônimo lê por view definer em vez de grant direto na tabela).
Reconfirmado ao vivo com `v_%\_public` amplo: existem **14** views com esse padrão de nome, mas só
estas 8 rodam como owner — as outras 6 (`v_color_nuances_public`, `v_kit_component_print_areas_public`,
`v_personalization_techniques_public`, `v_print_area_techniques_public`, `v_site_products_public`,
`v_tags_public`) já são `security_invoker=true` e ficam fora do escopo desta nota.

Contrato de colunas (`.security/public-views-columns.json`) e gate de drift
(`scripts/check-public-views-drift.mjs`, `npm run check:public-views-drift`) fechados na E16 —
265/265 colunas batem contra o banco, 0 drift. Achado da varredura por padrão sensível
(`cost`/`custo`/`supplier_price`/`ncm`/`bitrix_*`/PII): 3 colunas de `v_products_public`
(`ncm_code`, `ncm_id`, `bitrix_product_id`) trafegam sem máscara e sem GRANT problemático —
não é vazamento de custo/PII, mas é superfície de integração/fiscal exposta a `anon` sem decisão
registrada; status `REQUER-PO`, não corrigido nesta etapa (regra do plano: achado aqui é `[RO]`,
correção é etapa `[REQUER-PO]` separada). Detalhe completo em
`docs/E16_VIEWS_PUBLIC_SECDEF_2026-09-16.md`.

### ⚠️ P7 (NOVO, 2026-09-16) — SECDEF executáveis por `authenticated` cresceu 36% (69 → 94)

25 funções novas desde 07-16. Uma delas (`zapp_catalog_stats`) já bloqueou o CI (gate lint 0029,
resolvido na PR #1863). As outras 24 não foram revisadas individualmente. Ver E18 do plano DBA.

---

## 4. ARQUITETURA MEDALLION — MAPA REAL

Não reauditado linha a linha nesta rodada (fora do escopo de E04; ver E24/E43/E45 do plano DBA
para revisão do Medallion e da god table `products`). Estrutura de camadas (Bronze → Silver → Gold)
inalterada desde 07-16 pelo que foi observado incidentalmente durante esta auditoria.

### Achado incidental de capacidade (2026-09-16) — ver plano DBA §1.3 para detalhe completo

| Objeto | 07-16 | **09-16** |
|---|---|---|
| Banco inteiro | 4.578 MB | **6.374 MB** (+39%) |
| `stock_snapshots` | 3.626.559 linhas / 1.545 MB | **170.913 linhas / 1.574 MB** (purge de 14 dias funciona nas linhas; espaço físico não voltou — candidato a `pg_repack`) |
| `stock_daily_summary` (retenção "permanente") | 242 MB | **643 MB** (+166%) |
| `supplier_products_raw_history` (Bronze, particionada) | — | **~2,1 GB, ~600 MB/mês** — **sem partição além de dez/2026, sem job de criação automática** (`pg_partman` disponível, não instalado) |

**Ação com prazo:** criar partições futuras de `supplier_products_raw_history` antes de **2026-12-15**
(E25 do plano DBA) — sem isso, o pipeline Bronze para em 2027-01-01.

---

## 5. AUTORIZAÇÃO

**Fonte única de papéis:** `public.user_roles`, PK composta `user_id, role`, multi-role.
`profiles.role` é **espelho derivado** — nunca fonte. (Não reauditado o número de linhas nesta rodada.)

**Enum `app_role`** (ordem física no catálogo, ≠ hierarquia):
```
dev · supervisor · admin · manager · agente · coordenador · vendedor
```

**15 enums de autorização/fluxo** — lista inalterada desde 07-16 (não reproduzida aqui; ver
versão anterior no histórico do Git ou rodar query §8.1-enum).

### ⚠️ `auth.users` — invariantes reais (reconfirmado 2026-09-16)

- **82 FKs apontam para `auth.users`** (era 69 em 07-16 — crescimento esperado, não é erro de
  modelagem novo; é o desenho vigente crescendo com novas tabelas).
- **Continua existindo exatamente 1 trigger em `auth.users`: `on_auth_user_created`.**
  Bootstrap de perfil. **Não dropar.**

---

## 6. MATERIALIZED VIEWS (12 — recontadas por completo em 2026-09-16)

A contagem de 07-16 ("5 materialized views") cobria só `public`. Hoje, olhando todos os schemas:

| Schema | MV | Tamanho |
|---|---|---|
| `public` | `mv_stock_rupture_alert` | 11 MB |
| `public` | `mv_ema_kpi_by_level` | 64 kB |
| `public` | `mv_supplier_reliability` | 64 kB |
| `public` | `mv_product_images_audit` | 84 MB |
| `internal` | `mv_product_leaf_category` | 2.048 kB (movida de `public` em 2026-07-17) |
| `analytics` | `mv_media_health` | 64 kB |
| `analytics` | `mv_product_cards` | 6.352 kB |
| `analytics` | `mv_product_compositions` | 4.744 kB |
| `analytics` | `mv_stock_velocity` | 13 MB |
| `analytics` | `mv_material_group_stats` | 56 kB |
| `analytics` | `mv_product_intelligence` | 2.864 kB (comentário no catálogo: "VAZIA (0 rows), verificar definição e dados de origem") |
| `analytics` | `categories_tree_visual` | 176 kB |

**193 views** (não-materializadas). 8 delas SECDEF sem `security_invoker`, expostas a `anon` (P6).

---

## 7-A. POR QUE NÃO EXISTE "CANONICAL_DB_CREATION_PROMPT"

Em 2026-07-16 circulou um prompt de 14 fases para "criar o schema canônico" neste projeto.
Ele **não foi executado**. Registro do motivo, para não voltar — tabela de premissas erradas
mantida sem alteração da versão anterior deste documento (ver histórico Git para o detalhe).

O próprio prompt, em §9.9, exigia aprovação do PO antes de qualquer alteração de schema —
e a ordem de execução tinha origem no bot Lovable, não no PO.

**Regra derivada → ver `CLAUDE.md` REGRA #8.**

## 7-B. O `db diff` NUNCA COMPLETOU NESTE PROJETO — achado de 2026-09-16

Ao restaurar a verificação live do `db-schema-drift-check` (E02 do plano DBA, secret cadastrado
em 2026-09-16), descobrimos que `supabase db diff --linked` — que reconstrói o schema do zero em
shadow database, reaplicando as ~2.988 migrations em ordem, para só então comparar com o schema
vivo — **nunca conseguiu completar**, independente de qualquer credencial.

Em 5 execuções de CI (runs `35090629440` → `35093709593`), corrigimos, em ordem:

1. `20260601140841_*.sql` — `v.product_id ~ '<regex>'` onde `product_id` é `uuid`: operador
   inexistente para o tipo (SQLSTATE 42883). Migration nunca aplicada em lugar nenhum (não está
   no ledger, o objeto que criaria não existe ao vivo). **Aposentada.**
2. `20260601180000_*.sql` — `CREATE POLICY IF NOT EXISTS`, sintaxe que **não existe** no
   PostgreSQL (SQLSTATE 42601 — mesma armadilha do §7-A). A policy já existe ao vivo (criada por
   fora do fluxo). **Reescrita** com `DO $$ ... EXCEPTION WHEN duplicate_object`.
3. **5 dos 6 schemas de aplicação não têm NENHUMA migration de criação** — ver §1. 38 migrations
   dependiam disso silenciosamente. **Corrigido** com bootstrap via `supabase db dump --linked`
   real (29 tabelas, 21 views/matviews, 20 funções — não é reconstrução aproximada).
4. `public.categories.bitrix_id` — coluna de tabela core sem NENHUMA migration em toda a história
   que a adicione. **Não corrigido.** Sinal de que a dívida de DDL out-of-band se estende para
   dentro de `public`, além dos 5 schemas.

**Decisão:** parar de perseguir o replay 100% funcional — não há garantia de quantas camadas
faltam, e cada tentativa custa um ciclo de CI. `supabase/migrations-snapshot/SCHEMA_LIVE.sql`
(dump direto do schema vivo, sem depender de replay, gerado em 2026-09-16) passa a ser a fonte
de verdade do schema atual para comparação estrutural. A reconciliação histórica completa (fazer
o replay funcionar) fica registrada como trabalho best-effort (E07/E08 do plano DBA) — não
bloqueante para operação.

**Regra derivada:** nenhuma alegação de "schema reconciliado" ou "sem drift" vale sem dizer
explicitamente se veio de `db diff` (replay completo) ou de comparação de `SCHEMA_LIVE.sql` entre
datas (dump direto). São garantias diferentes.

---

## 8. QUERIES CANÔNICAS DE AUDITORIA

Todas read-only. Rodar via MCP Supabase (`execute_sql`) ou `psql`.

### 8.1 Inventário de tabelas
```sql
SELECT c.relname, c.relrowsecurity AS rls,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname) AS policies,
       (SELECT count(*) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped) AS cols,
       pg_size_pretty(pg_total_relation_size(c.oid)) AS size,
       s.n_live_tup AS rows
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_stat_user_tables s ON s.relid=c.oid
WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relispartition
ORDER BY pg_total_relation_size(c.oid) DESC;
```

### 8.2 Tabelas com RLS sem policy (esperado: 0 — hoje: 2, ver P5)
```sql
SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relrowsecurity
  AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname);
```

### 8.3 SECURITY DEFINER sem search_path (esperado: 0)
```sql
SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prosecdef
  AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig,'{}')) c WHERE c LIKE 'search_path=%');
```

### 8.4 Cron jobs multi-statement
```sql
SELECT jobname, schedule, command FROM cron.job
WHERE active AND (length(command)-length(replace(command,';','')))>1
ORDER BY jobname;
```

### 8.5 GRANT de escrita para anon (P1 — FECHADO, esperado: 0)
```sql
SELECT DISTINCT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public' AND grantee='anon'
  AND privilege_type IN ('INSERT','UPDATE','DELETE')
ORDER BY table_name;
```

### 8.6 Views sem security_invoker (hoje: 8, ver P6)
```sql
SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='v'
  AND NOT COALESCE(array_to_string(c.reloptions,',') LIKE '%security_invoker=%on%'
                OR array_to_string(c.reloptions,',') LIKE '%security_invoker=true%', false);
```
Gate de colunas para essas 8 (E16): `npm run check:public-views-drift` — compara ao vivo contra
`.security/public-views-columns.json` e falha em coluna nova/sensível não reconhecida.

### 8.7 Funções SECDEF executáveis por anon / authenticated
```sql
SELECT p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prosecdef
ORDER BY 1;
```

### 8.8 Schemas de aplicação sem migration de criação (achado de 09-16)
```sql
-- Rodar fora do banco, no repo:
-- for s in analytics supplier_stricker cf_recon prod_audit classification_audit internal; do
--   grep -lE "CREATE SCHEMA\s+(IF NOT EXISTS\s+)?\"?$s\"?\b" supabase/migrations/*.sql || echo "$s: SEM MIGRATION"
-- done
```

---

## 9. INVARIANTES DESTE BANCO

1. **SSOT:** `doufsxqlfjyuvxuezpln`. Nunca `pqpdolkaeqlyzpdpbizo`. (`CLAUDE.md` REGRA #1)
2. **Não criar estrutura nova** — adicionar registros, não tabelas. Exceção: `_backup_*_yyyymmdd` temporário.
3. **`pg_cron` VACUUM = single-statement.** Multi-statement aborta no primeiro erro.
4. **`user_roles` é a fonte de papéis.** `profiles.role` é espelho derivado.
5. **`print_area_techniques` é fonte única** de áreas de gravação.
6. **`product_physical` é WRITE-ONLY.** Não dropar.
7. **`products.primary_image_url` não se edita direto.** Mantido por `trg_sync_images_to_product`.
8. **INSERT em massa via pipeline:** `SELECT set_config('app.write_source','pipeline',false);` antes.
9. **`on_auth_user_created` em `auth.users` não se dropa.**
10. **Auditoria de schema só via `pg_catalog`.** (§0)
11. **NOVO (2026-09-16): nenhuma migration já aplicada é renomeada ou editada.** Correções são
    forward-only, em arquivo novo — exceto migrations que nunca foram aplicadas em lugar nenhum
    (confirmado por ausência no ledger E ausência do objeto ao vivo), que podem ser corrigidas
    in-place com registro explícito do porquê (ver §7-B para 3 exemplos reais).
12. **NOVO (2026-09-16): "sem drift" só vale dizendo a fonte.** `db diff` (replay completo) e
    comparação de `SCHEMA_LIVE.sql` (dump direto) são garantias diferentes — ver §7-B.

---

## 10. MANUTENÇÃO DESTE DOCUMENTO

Este arquivo é um **retrato datado**. Números mudam.

Antes de confiar em qualquer contagem aqui, rode §8.1 e compare.
Se divergir >5%, regenere o documento em vez de remendar — foi o que esta versão fez.

Guardas automáticas já existentes no banco:
- `schema_signature_baseline` + `fn_capture_schema_baseline()` (ver E47 do plano DBA — checar se
  ainda está ativo e alertando; não reverificado nesta rodada)
- `schema_signature_drift_log` / `schema_signature_drift_allowlist`
- `schema_drift_log` — comparação Lovable ↔ Oficial via edge `schema-drift-check`

Guardas de repositório relevantes:
- `supabase/migrations-snapshot/SCHEMA_LIVE.sql` — dump direto do schema vivo (não depende de
  `db diff`). Gerado em 2026-09-16. Ver `supabase/migrations-snapshot/README.md`.
- `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` — plano ativo que originou
  esta regeneração e onde os achados P5/P6/P7 e §7-B têm etapas de acompanhamento.

---

*Auditado read-only em 2026-09-16 via pg_catalog. Nenhuma DDL executada. Nenhum dado alterado.*
