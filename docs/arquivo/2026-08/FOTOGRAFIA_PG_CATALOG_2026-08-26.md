# Fotografia canônica de `pg_catalog` — 2026-08-26

> **Projeto SSOT:** `doufsxqlfjyuvxuezpln` (produção Gold/Medallion)
> **Estado desta evidência:** somente leitura; nenhuma DDL, DML, migration, deploy ou alteração de privilégio foi executada.
> **Fonte:** MCP `supabase-prod-ro`, com `SELECT` sobre `pg_catalog` e funções de apresentação do próprio catálogo.
> **Referência comparada:** [SCHEMA_REFERENCE.md](SCHEMA_REFERENCE.md), fotografada em 2026-07-16.
> **Escopo desta etapa:** 067–068 do plano de estabilização. Isto é uma baseline de estrutura, não um dump de dados nem uma autorização de mudança.

## 1. Método e limites

Todas as leituras abaixo usam `pg_catalog` (`pg_class`, `pg_attribute`, `pg_constraint`,
`pg_index`, `pg_policy`, `pg_proc`, `pg_trigger`, `pg_type`, `pg_enum`,
`pg_extension`, ACLs e `pg_inherits`). As funções `pg_get_*` só são usadas dentro de
um `md5`; nenhuma definição de função, view, policy, payload, segredo ou dado de linha
foi exportado.

As assinaturas são detectores de alteração, não hashes criptográficos de segurança. Uma
assinatura diferente pede investigação; uma igual só prova igualdade para os campos
serializados pela query correspondente. Os campos de default de coluna, por exemplo,
são representados por `atthasdef` para evitar exportar expressões potencialmente sensíveis.

O recorte principal é `public`, pois é o único com totais diretamente comparáveis à
referência. A distribuição complementar inclui todos os schemas não internos do
PostgreSQL (`nspname !~ '^pg_'` e diferente de `information_schema`), inclusive schemas
managed do Supabase. Portanto, ela **não** classifica esses schemas como parte funcional
da aplicação.

`cron.job` não foi lido: o conteúdo dos jobs pertence à tabela da extensão `pg_cron`, não
ao `pg_catalog`. Para respeitar o modo estrito desta etapa, a fotografia registra apenas
a presença e a assinatura estrutural das relações de cron. Contagem exata, estado ativo e
comandos dos jobs permanecem fora deste artefato.

## 2. Fotografia atual

### 2.1 Relações e colunas de `public`

| Métrica | Valor | Assinatura MD5 |
|---|---:|---|
| Relações catalogadas (`r`, `p`, `v`, `m`, `S`, `f`) | 610 | `88b3c99df6ebbe7be5dc2f7ae40dcb68` |
| Relações tabulares (`r` + `p`, incluindo partições) | 391 | `ad897c60d1a21a89ba23f8b4e05d02f5` |
| Tabelas regulares não-partição | 377 | — |
| Tabelas particionadas-pai | 2 | — |
| Partições físicas | 12 | — |
| Views | 192 | `03dd8018c98a9913d74b29639688a4bb` |
| Materialized views | 4 | `0713fe66f20ae992d60d2c9cbbdca28b` |
| Sequences | 23 | — |
| Colunas de relações tabulares/partições | 5.086 | `f563ed2f20b8541b20c55ee4d4af9056` |
| Colunas de todas as relações, incluindo views/MVs | 7.792 | `bced97c47a28943828cc9d4b6feedd53` |

Distribuição de estrutura por schema. `colunas tabulares` exclui colunas de views/MVs;
as assinaturas completas acima são a baseline de comparação.

| Schema | Regulares | Pais `p` | Partições | Views | MVs | Sequences | Colunas tabulares | Assinatura relações | Assinatura colunas |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| `analytics` | 0 | 0 | 0 | 0 | 7 | 0 | 0 | `8cc02dbb7c1934053b07402140180cd3` | `d41d8cd98f00b204e9800998ecf8427e` |
| `auth` | 23 | 0 | 0 | 0 | 0 | 1 | 240 | `5eedd59a40940b1b76e5b081ed9ae838` | `e71a0f8d5f5a48bc5b4c6e5dfbfbbb02` |
| `cf_recon` | 6 | 0 | 0 | 7 | 0 | 3 | 45 | `1d9f7c59d3da7449c25c4165067037e3` | `b904bc5dd7791baba586504b88d0d53c` |
| `classification_audit` | 1 | 0 | 0 | 2 | 0 | 1 | 15 | `5739697504b0cd4027c871709c3a2cd9` | `d73b392cfe8abed2ab3de06bf1fa46f4` |
| `cron` | 2 | 0 | 0 | 0 | 0 | 2 | 19 | `0ffb498877e52bc1d18b3a466da77c9f` | `a8ecd0cb4d88781fa3ba6d8ed5a71cc9` |
| `extensions` | 1 | 0 | 0 | 4 | 0 | 0 | 9 | `9e141e993d30884707a9be897d0f29b2` | `9f704ebdfc15f23a1da8f1b464d4e740` |
| `graphql` | 0 | 0 | 0 | 0 | 0 | 1 | 0 | `92a400d2250c509f8085bf0b0dd9ef58` | `d41d8cd98f00b204e9800998ecf8427e` |
| `internal` | 0 | 0 | 0 | 0 | 1 | 0 | 0 | `7075738fee7c5670d00870b370a1441e` | `d41d8cd98f00b204e9800998ecf8427e` |
| `net` | 2 | 0 | 0 | 0 | 0 | 1 | 14 | `85090b8bb8efe087921fc0d31d983fe9` | `9334d3e6f4e85b51e4c5e15e04231f6a` |
| `pgmq` | 1 | 0 | 0 | 0 | 0 | 0 | 4 | `c1df85fba1059dbd099a2f6f8fdfd80a` | `38f9a2ccf2d7394f84b84bc96f376181` |
| `prod_audit` | 5 | 0 | 0 | 1 | 0 | 3 | 61 | `7e983f0b7a9a4c71be7d7912f7ee48b` | `959b4e36ce8a1e957fbd73a6645c9de6` |
| `public` | 377 | 2 | 12 | 192 | 4 | 23 | 5.086 | `14debc197c89da6fcc76ebb3d7ebc251` | `3edc588c8628dd0ee19a15f7d758b06b` |
| `realtime` | 2 | 1 | 7 | 0 | 0 | 1 | 83 | `60d06e8a4b124bf8a2bd901929c7aac7` | `2b690b0f5d2db719017bf52dc0fd16ce` |
| `storage` | 8 | 0 | 0 | 0 | 0 | 0 | 71 | `1d1e9306d199b8c94b38ab113ce80bce` | `048a7ee595a40d1fc9d6546bb23e587d` |
| `supabase_functions` | 2 | 0 | 0 | 0 | 0 | 1 | 7 | `a566b5a76d4130f5235307bed5a76df3` | `d27c289b835af6041305e5ae5bd16633` |
| `supabase_migrations` | 1 | 0 | 0 | 0 | 0 | 0 | 6 | `0520fc869ecb2761d9e2ebb2dd7f0018` | `ce086a9cf88414776b234d7a225693f8` |
| `supplier_stricker` | 17 | 0 | 0 | 4 | 0 | 4 | 344 | `81bc2b843a8af596e88601d4aa7b4917` | `8ec5b76b7177f717bda2b8889b5e36df` |
| `vault` | 1 | 0 | 0 | 1 | 0 | 0 | 8 | `722c5816d49cac931ecc7a921a6de769` | `fa4a98076d894e1e56a331c11add3596` |

### 2.2 Constraints e índices em `public`

| Métrica | Valor | Assinatura MD5 |
|---|---:|---|
| Constraints totais | 1.324 | `a8f70ef44266f8e690cf8d1ce4def764` |
| Primary keys (`p`) | 391 | `a2658ed1ac63937b7de4a3d2323c6616` |
| Foreign keys (`f`) | 396 | `2cfa301633be1aa5ac8a47e773b2eaaa` |
| Unique (`u`) | 190 | `0d1a1af5590870b7be12cbdcf9ed3789` |
| Check (`c`) | 347 | `71ab3f7c8fa19dbd6e9729451ac743a4` |
| Constraints não validadas | 0 | `d41d8cd98f00b204e9800998ecf8427e` |
| Índices totais | 1.170 | `e3a50e82b05929305f2da4c480c0f0b4` |
| Índices primary | 391 | `184f3b9b2871f2e98a106db7df879ddc` |
| Índices unique | 632 | `435e348cd5ad606853dc0f0ab6fba453` |
| Índices inválidos, não-prontos ou não-live | 0 | `d41d8cd98f00b204e9800998ecf8427e` |

### 2.3 RLS e policies em `public`

| Métrica | Valor | Assinatura MD5 |
|---|---:|---|
| Relações tabulares | 391 | `ad897c60d1a21a89ba23f8b4e05d02f5` |
| RLS habilitado | 390 | `de6594dd48820e6a879c96f7be896ff5` |
| RLS forçado | 1 | `9941122588c1dbe2d1458d3542fc51de` |
| Policies | 927 | `df6463b4fdc4f006e9ef401cf67595c1` |
| Relações com ao menos uma policy | 388 | — |
| RLS habilitado sem policy própria | 2 | `99a6e63cb0f939861f9949915efca9c4` |

As três exceções estruturais abaixo são registradas, não corrigidas:

| Relação | Fato observado no catálogo | Classificação atual |
|---|---|---|
| `anon_catalog_grant_audit_log` | RLS ativo, nenhuma policy própria, não é partição; `anon` e `authenticated` possuem alguns privilégios de tabela efetivos. | Diferença confirmada; intenção `deny-all` é plausível, mas **pendente** de reconciliação de origem/uso. |
| `magazine_public_view_events_2026_11` | Partição com RLS e sem policy própria; o pai `magazine_public_view_events` possui 2 policies (`0071a093e519d46d504ebca1669c0e82`). `anon`/`authenticated` não têm grant direto de leitura/escrita na partição. | Estrutura de partição confirmada; compatibilidade de acesso direto versus via pai é **pendente**, sem inferir falha. |
| `supplier_products_raw_history_p2026_11` | Partição sem RLS; o pai tem RLS e 2 policies (`3f8fcdff830dfb8708aa8902bed04b94`). | Exceção atual confirmada; não há evidência suficiente para chamá-la de intencional ou de perda. Requer owner e plano aprovado antes de uso. |

### 2.4 Rotinas, triggers e views

| Métrica | Valor | Assinatura MD5 |
|---|---:|---|
| Rotinas públicas chamáveis (`f`/`p`) | 1.280 | `6be38ecc65435954fc64a435cfda97dc` |
| Rotinas `SECURITY DEFINER` | 530 | `3cc580f09dd9b1fdecbf94e271ccee6c` |
| `SECURITY DEFINER` sem `search_path` configurado | 0 | `d41d8cd98f00b204e9800998ecf8427e` |
| `SECURITY DEFINER` executável por `anon` | 10 | `d6a338c5a78339e081127ded3814f1fa` |
| `SECURITY DEFINER` executável por `authenticated` | 70 | `97ffa8a76a8889d9b77829fcca8914f8` |
| Triggers não internos | 385 | `cfbf3f2c14532aca5f05aafe201b8b09` |
| Triggers desabilitados/replica-only | 0 | `d41d8cd98f00b204e9800998ecf8427e` |
| Views sem `security_invoker` ativo | 9 | `fc84b65686a7fd3e0ed7ee0911ee8ede` |

As nove views com `security_invoker=false` são uma diferença confirmada em relação à
referência: `v_kit_component_media_public`, `v_kit_component_print_areas_public`,
`v_product_compositions_public`, `v_product_properties_public`, `v_product_tags_public`,
`v_products_public`, `v_suppliers_public`, `v_tabela_preco_gravacao_oficial_public` e
`v_variant_sale_prices_public`. O catálogo prova a configuração, mas não explica sua
origem nem autoriza recriação/alteração; a classificação de intenção permanece pendente.

As quatro MVs em `public` são `mv_ema_kpi_by_level`, `mv_product_images_audit`,
`mv_stock_rupture_alert` e `mv_supplier_reliability`. A quinta MV registrada na referência,
`mv_product_leaf_category`, **existe** como `internal.mv_product_leaf_category`; portanto a
redução de 5 para 4 no schema `public` não é perda comprovada, e sim relocação comprovada.
Compatibilidade de callers e razão da relocação continuam pendentes.

### 2.5 Enums e extensões

| Métrica | Valor | Assinatura MD5 |
|---|---:|---|
| Enums em schemas não internos | 28 | `067abe67750ad332597c446ab989a237` |
| Enums em `public` | 15 | `af8967153498c423a68e7626d641c20c` |
| Extensões instaladas | 16 | `36dc6f9596342a85f9ed754d708ed459` |

Enums de `public`: `app_role`, `categoria_cor_enum`, `conversation_event_type`,
`familia_cor_enum`, `magazine_reaction_kind`, `magazine_status`, `org_role`,
`payment_status`, `produtos_padronizacao_status`, `role_migration_item_status`,
`role_migration_status`, `silver_norm_status`, `step_up_action`, `supplier_raw_status` e
`tipo_cor_enum`. A assinatura inclui labels e ordem física, sem exportá-los.

Extensões: `http 1.6`, `hypopg 1.4.1`, `index_advisor 0.2.0`, `moddatetime 1.0`,
`pg_cron 1.6.4`, `pg_graphql 1.5.11`, `pg_net 0.19.5`, `pg_stat_statements 1.11`,
`pg_trgm 1.6`, `pgcrypto 1.3`, `pgmq 1.5.1`, `plpgsql 1.0`, `supabase_vault 0.3.1`,
`unaccent 1.1`, `uuid-ossp 1.1` e `wrappers 0.5.7`.

### 2.6 ACLs e privilégios

| Métrica | Valor | Assinatura MD5 |
|---|---:|---|
| Relações `public` com `INSERT` efetivo para `anon` | 231 | `b4eba8f8deb0a828c03a0df2eab3975d` |
| Relações `public` com `UPDATE` efetivo para `anon` | 229 | `713c603b6f72a65602928a947b48e0a6` |
| Relações `public` com `DELETE` efetivo para `anon` | 229 | `713c603b6f72a65602928a947b48e0a6` |
| Relações `public` com qualquer escrita efetiva para `anon` | 231 | `b4eba8f8deb0a828c03a0df2eab3975d` |
| Entradas ACL explícitas de relações tabulares `public` | 10.243 | `d1b0068e394978edbdf95a893cbb449d` |
| Entradas ACL explícitas de schemas não internos | 102 | `3079825d74571bb8bd779b0a5c58acfe` |
| Entradas ACL explícitas de rotinas `public` | 3.707 | `9cd14dd504ed75b452bb7db739e6a837` |
| Entradas de default ACL | 355 | `88f48d2ee41039190ea645a6ed84d673` |

`Efetivo` nesta tabela é `has_table_privilege` para o papel indicado; ele não elimina a
segunda etapa de RLS. As contagens de ACL explícita são entradas de catálogo, não uma
contagem de usuários, endpoints ou acessos de negócio. Nenhum `GRANT`/`REVOKE` foi feito.

### 2.7 `pg_cron`, sem leitura de jobs

| Relação da extensão | Colunas | Assinatura de estrutura |
|---|---:|---|
| `cron.job` | 9 | `dc749af50b757be9e0d8cce4eb341614` |
| `cron.job_run_details` | 10 | `95be12b842d58c5e5992944c71d96cc5` |

O catálogo também confirma `pg_cron 1.6.4`. O total de jobs, jobs ativos, comandos,
histórico de execução e jobs multi-statement não foram reconsultados nesta etapa porque
exigiriam ler relações de extensão fora de `pg_catalog`.

## 3. Comparação com `SCHEMA_REFERENCE.md`

O documento de 16/07 traz totais, mas não contém uma baseline de assinaturas por objeto.
Assim, os deltas numéricos abaixo são comprovados como **diferenças de fotografia**, mas
somente os casos com nome/catálogo atual permitem afirmar preservação ou configuração
precisa. Não é correto transformar um delta agregado em uma lista de remoções.

| Classe | Referência 16/07 | Fotografia atual | Situação baseada em evidência |
|---|---:|---:|---|
| Tabelas `public` | 388 | 391 `r/p` | Delta numérico confirmado; a convenção histórica de incluir filhos de partição não está totalmente explícita. Não inferir perda. |
| Colunas `public` | 7.571 | 7.792 em todas as relações | Delta +221 pela query atual; a referência não preserva o predicado de colunas. Não inferir adição/remoção por objeto. |
| Views públicas | 190 | 192 | Delta +2 confirmado; identidade/origem das duas adições exige baseline anterior por objeto. |
| MVs públicas | 5 | 4 | **Sem perda de `mv_product_leaf_category`:** a relação está em `internal`. Razão e callers pendentes. |
| Policies RLS | 906 | 927 | Delta +21 confirmado; sem baseline de assinatura anterior, não atribuir intenção. |
| RLS sem policy | 0 | 2 | Divergência de postura confirmada (`anon_catalog_grant_audit_log`, `magazine_public_view_events_2026_11`); classificação operacional pendente. |
| RLS habilitado | 388/388 | 390/391 | Topologia atual e uma exceção de partição sem RLS confirmadas; não afirmar quando/por que surgiu sem ledger/owner. |
| Funções/rotinas públicas | 1.277 | 1.280 | Delta +3 confirmado. |
| `SECURITY DEFINER` | 529 | 530 | Delta +1 confirmado; sem SECDEF sem `search_path` nos dois retratos. |
| SECDEF executável por `anon` | 22 | 10 | Delta -12 confirmado como privilégio efetivo atual; não atribuir causa sem ACL anterior. |
| SECDEF executável por `authenticated` | 69 | 70 | Delta +1 confirmado; análise exige assinatura, não só nome. |
| Triggers | 385 | 385 | Contagem estável; ambos sem trigger de usuário desabilitado nesta fotografia. |
| Índices | 1.242 | 1.170 | Delta -72 confirmado em contagem. Não há baseline de nomes/definições nesta referência; não declarar remoção intencional nem perda. |
| Foreign keys | 395 | 396 | Delta +1 confirmado. |
| Enums `public` | 15 | 15 | Contagem estável; a assinatura atual registra labels/ordem. |
| Extensões | 16 | 16 | Conjunto/versões atuais registrado; nenhuma extensão é classificada como removível. |
| Escrita efetiva de `anon` | “~230” tabelas | 231 `INSERT`, 229 `UPDATE`/`DELETE` | Corrobora o achado P1 persistente; não é evidência de alteração feita nesta etapa. |
| Cron | 136 jobs, 134 ativos | Não reconsultado sob escopo estrito | **Pendente**, não comparar nem reutilizar o número como atual. |

### Classificação final das diferenças

| Estado | Itens | Conclusão permitida |
|---|---|---|
| Preservação comprovada | `internal.mv_product_leaf_category` | O objeto não foi perdido; a mudança de schema ainda precisa de reconciliação de compatibilidade. |
| Diferença atual comprovada | +2 views, +21 policies, +3 rotinas, +1 SECDEF, +1 FK, -72 índices, nove views sem `security_invoker`, exceções RLS/policy | Há diferença de catálogo/configuração. Não há base suficiente para chamar cada uma de intencional, regressão ou perda. |
| Estável no nível de contagem | 385 triggers, 15 enums públicos, 16 extensões, 0 SECDEF sem `search_path`, 0 índice inválido/unready, 0 constraint não validada | A fotografia sustenta estabilidade somente nessas métricas, não substitui teste funcional. |
| Pendente de evidência externa ao catálogo | motivo/owner das exceções, diff de nomes/definições dos 72 índices, ACL histórico, exato estado de cron, ledger aplicado | Depende das etapas de migrations/jobs/owners e, quando envolver banco, de autorização explícita. |

Nenhuma tabela, coluna, constraint, índice, policy, função, trigger, view, enum,
extensão, privilégio ou job foi classificado como lixo ou removível.

## 4. Queries reproduzíveis

As queries abaixo são somente leitura e não acessam relações de dados da aplicação. Elas
formam a receita das assinaturas desta fotografia. Execute-as no MCP read-only contra o
mesmo projeto e compare os campos `count`/`signature` com as tabelas anteriores.

### 4.1 Relações, colunas, RLS e policies

```sql
WITH rels AS (
  SELECT c.oid, c.relname, c.relkind, c.relispartition,
         c.relrowsecurity, c.relforcerowsecurity, c.reloptions
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
), cols AS (
  SELECT r.*, a.attnum, a.attname, a.atttypid, a.atttypmod,
         a.attnotnull, a.atthasdef, a.attidentity, a.attgenerated
  FROM rels AS r
  JOIN pg_catalog.pg_attribute AS a ON a.attrelid = r.oid
  WHERE a.attnum > 0 AND NOT a.attisdropped
), policies AS (
  SELECT p.*, r.relname
  FROM pg_catalog.pg_policy AS p
  JOIN rels AS r ON r.oid = p.polrelid
)
SELECT 'relations_all' AS metric, count(*)::text AS count,
       md5(coalesce(string_agg(format('%I|%s|part=%s|rls=%s|force=%s|opt=%s',
         relname, relkind, relispartition, relrowsecurity,
         relforcerowsecurity, coalesce(array_to_string(reloptions, ','), '')),
         E'\n' ORDER BY relname, relkind), '')) AS signature
FROM rels
UNION ALL
SELECT 'table_like_relations', count(*)::text,
       md5(coalesce(string_agg(format('%I|%s|part=%s|rls=%s|force=%s',
         relname, relkind, relispartition, relrowsecurity, relforcerowsecurity),
         E'\n' ORDER BY relname), ''))
FROM rels WHERE relkind IN ('r', 'p')
UNION ALL
SELECT 'all_relation_columns', count(*)::text,
       md5(coalesce(string_agg(format('%I.%I|%s|nn=%s|def=%s|id=%s|gen=%s',
         relname, attname, pg_catalog.format_type(atttypid, atttypmod),
         attnotnull, atthasdef, attidentity, attgenerated),
         E'\n' ORDER BY relname, attnum), ''))
FROM cols
UNION ALL
SELECT 'table_columns', count(*)::text,
       md5(coalesce(string_agg(format('%I.%I|%s|nn=%s|def=%s|id=%s|gen=%s',
         relname, attname, pg_catalog.format_type(atttypid, atttypmod),
         attnotnull, atthasdef, attidentity, attgenerated),
         E'\n' ORDER BY relname, attnum), ''))
FROM cols WHERE relkind IN ('r', 'p', 'f')
UNION ALL
SELECT 'policies', count(*)::text,
       md5(coalesce(string_agg(md5(format('%I|%I|cmd=%s|permissive=%s|roles=%s|using=%s|check=%s',
         relname, polname, polcmd, polpermissive, polroles::text,
         coalesce(pg_catalog.pg_get_expr(polqual, polrelid), ''),
         coalesce(pg_catalog.pg_get_expr(polwithcheck, polrelid), ''))),
         E'\n' ORDER BY relname, polname), ''))
FROM policies;
```

### 4.2 Constraints, índices, rotinas, triggers e views

```sql
WITH target AS (
  SELECT c.oid, c.relname
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'm', 'f')
), cons AS (
  SELECT con.*, t.relname
  FROM pg_catalog.pg_constraint AS con JOIN target AS t ON t.oid = con.conrelid
), idx AS (
  SELECT t.relname AS target_name, i.*, x.relname AS index_name
  FROM pg_catalog.pg_index AS i
  JOIN target AS t ON t.oid = i.indrelid
  JOIN pg_catalog.pg_class AS x ON x.oid = i.indexrelid
)
SELECT 'constraints' AS metric, count(*)::text AS count,
       md5(coalesce(string_agg(md5(format('%I|%I|type=%s|deferrable=%s|deferred=%s|validated=%s|parent=%s|def=%s',
         relname, conname, contype, condeferrable, condeferred, convalidated,
         conparentid, pg_catalog.pg_get_constraintdef(oid, true))),
         E'\n' ORDER BY relname, conname), '')) AS signature
FROM cons
UNION ALL
SELECT 'indexes', count(*)::text,
       md5(coalesce(string_agg(md5(format('%I|%I|unique=%s|primary=%s|valid=%s|ready=%s|live=%s|exclude=%s|replident=%s|def=%s',
         target_name, index_name, indisunique, indisprimary, indisvalid, indisready,
         indislive, indisexclusion, indisreplident,
         pg_catalog.pg_get_indexdef(indexrelid))),
         E'\n' ORDER BY target_name, index_name), ''))
FROM idx;
```

```sql
WITH routines AS (
  SELECT p.oid, p.prokind, p.prosecdef, p.provolatile, p.proleakproof,
         p.proconfig, p.proacl
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
), relations AS (
  SELECT c.oid, c.relname, c.relkind, c.reloptions
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
)
SELECT 'routines' AS metric, count(*)::text AS count,
       md5(coalesce(string_agg(md5(format('%s|kind=%s|secdef=%s|volatile=%s|leakproof=%s|config=%s|acl=%s|body=%s',
         oid::regprocedure, prokind, prosecdef, provolatile, proleakproof,
         coalesce(array_to_string(proconfig, ','), ''),
         coalesce(array_to_string(proacl::text[], ','), ''),
         md5(pg_catalog.pg_get_functiondef(oid)))),
         E'\n' ORDER BY oid::regprocedure::text), '')) AS signature
FROM routines
UNION ALL
SELECT 'triggers', count(*)::text,
       md5(coalesce(string_agg(md5(format('%I|%I|enabled=%s|def=%s',
         r.relname, t.tgname, t.tgenabled, pg_catalog.pg_get_triggerdef(t.oid, true))),
         E'\n' ORDER BY r.relname, t.tgname), ''))
FROM pg_catalog.pg_trigger AS t
JOIN relations AS r ON r.oid = t.tgrelid
WHERE NOT t.tgisinternal
UNION ALL
SELECT 'views', count(*)::text,
       md5(coalesce(string_agg(md5(format('%I|options=%s|def=%s',
         relname, coalesce(array_to_string(reloptions, ','), ''),
         pg_catalog.pg_get_viewdef(oid, true))), E'\n' ORDER BY relname), ''))
FROM relations WHERE relkind = 'v'
UNION ALL
SELECT 'materialized_views', count(*)::text,
       md5(coalesce(string_agg(md5(format('%I|options=%s|def=%s',
         relname, coalesce(array_to_string(reloptions, ','), ''),
         pg_catalog.pg_get_viewdef(oid, true))), E'\n' ORDER BY relname), ''))
FROM relations WHERE relkind = 'm';
```

### 4.3 Enums, extensões, cron e privilégios

```sql
WITH enum_summary AS (
  SELECT n.nspname AS schema_name, t.typname AS enum_name,
         count(e.oid) AS label_count,
         md5(string_agg(e.enumlabel, E'\n' ORDER BY e.enumsortorder)) AS label_signature
  FROM pg_catalog.pg_type AS t
  JOIN pg_catalog.pg_namespace AS n ON n.oid = t.typnamespace
  JOIN pg_catalog.pg_enum AS e ON e.enumtypid = t.oid
  WHERE t.typtype = 'e'
  GROUP BY n.nspname, t.typname
)
SELECT 'enums_public' AS metric, count(*)::text AS count,
       md5(coalesce(string_agg(format('%I|labels=%s|sig=%s', enum_name, label_count, label_signature),
         E'\n' ORDER BY enum_name), '')) AS signature
FROM enum_summary WHERE schema_name = 'public'
UNION ALL
SELECT 'enums_all_non_system', count(*)::text,
       md5(coalesce(string_agg(format('%I.%I|labels=%s|sig=%s',
         schema_name, enum_name, label_count, label_signature),
         E'\n' ORDER BY schema_name, enum_name), ''))
FROM enum_summary WHERE schema_name !~ '^pg_' AND schema_name <> 'information_schema'
UNION ALL
SELECT 'extensions', count(*)::text,
       md5(coalesce(string_agg(format('%I|%s|%I', e.extname, e.extversion, n.nspname),
         E'\n' ORDER BY e.extname), ''))
FROM pg_catalog.pg_extension AS e
JOIN pg_catalog.pg_namespace AS n ON n.oid = e.extnamespace;

SELECT c.relname, c.relkind,
       count(a.attnum) FILTER (WHERE a.attnum > 0 AND NOT a.attisdropped) AS column_count,
       md5(coalesce(string_agg(format('%I|%s|not_null=%s|default=%s', a.attname,
         pg_catalog.format_type(a.atttypid, a.atttypmod), a.attnotnull, a.atthasdef),
         E'\n' ORDER BY a.attnum) FILTER (WHERE a.attnum > 0 AND NOT a.attisdropped), '')) AS signature
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
LEFT JOIN pg_catalog.pg_attribute AS a ON a.attrelid = c.oid
WHERE n.nspname = 'cron' AND c.relkind IN ('r', 'p', 'v', 'm')
GROUP BY c.relname, c.relkind ORDER BY c.relname;
```

```sql
WITH public_tables AS (
  SELECT c.oid, c.relname
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
)
SELECT 'anon_insert' AS metric, count(*)::text AS count,
       md5(coalesce(string_agg(relname, E'\n' ORDER BY relname), '')) AS signature
FROM public_tables WHERE has_table_privilege('anon', oid, 'INSERT')
UNION ALL
SELECT 'anon_update', count(*)::text,
       md5(coalesce(string_agg(relname, E'\n' ORDER BY relname), ''))
FROM public_tables WHERE has_table_privilege('anon', oid, 'UPDATE')
UNION ALL
SELECT 'anon_delete', count(*)::text,
       md5(coalesce(string_agg(relname, E'\n' ORDER BY relname), ''))
FROM public_tables WHERE has_table_privilege('anon', oid, 'DELETE');
```

As quatro assinaturas de ACL explícita são reproduzidas assim; a query retorna somente
hashes e contagens, não a lista de grants:

```sql
WITH relation_acl AS (
  SELECT c.relname, e.grantor, e.grantee, e.privilege_type, e.is_grantable
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) AS e
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relacl IS NOT NULL
), schema_acl AS (
  SELECT n.nspname, e.grantor, e.grantee, e.privilege_type, e.is_grantable
  FROM pg_catalog.pg_namespace AS n
  CROSS JOIN LATERAL pg_catalog.aclexplode(n.nspacl) AS e
  WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema' AND n.nspacl IS NOT NULL
), routine_acl AS (
  SELECT p.oid, e.grantor, e.grantee, e.privilege_type, e.is_grantable
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
  CROSS JOIN LATERAL pg_catalog.aclexplode(p.proacl) AS e
  WHERE n.nspname = 'public' AND p.proacl IS NOT NULL
), default_acl AS (
  SELECT d.defaclrole, d.defaclnamespace, d.defaclobjtype,
         e.grantor, e.grantee, e.privilege_type, e.is_grantable
  FROM pg_catalog.pg_default_acl AS d
  CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) AS e
  WHERE d.defaclacl IS NOT NULL
)
SELECT 'relation_acl' AS metric, count(*)::text AS count,
       md5(coalesce(string_agg(format('%I|grantor=%s|grantee=%s|privilege=%s|grantable=%s',
         relname, CASE WHEN grantor = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(grantor) END,
         CASE WHEN grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(grantee) END,
         privilege_type, is_grantable), E'\n' ORDER BY relname, grantor, grantee, privilege_type), '')) AS signature
FROM relation_acl
UNION ALL
SELECT 'schema_acl', count(*)::text,
       md5(coalesce(string_agg(format('%I|grantor=%s|grantee=%s|privilege=%s|grantable=%s',
         nspname, CASE WHEN grantor = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(grantor) END,
         CASE WHEN grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(grantee) END,
         privilege_type, is_grantable), E'\n' ORDER BY nspname, grantor, grantee, privilege_type), ''))
FROM schema_acl
UNION ALL
SELECT 'routine_acl', count(*)::text,
       md5(coalesce(string_agg(format('%s|grantor=%s|grantee=%s|privilege=%s|grantable=%s',
         oid::regprocedure, CASE WHEN grantor = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(grantor) END,
         CASE WHEN grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(grantee) END,
         privilege_type, is_grantable), E'\n' ORDER BY oid::regprocedure::text, grantor, grantee, privilege_type), ''))
FROM routine_acl
UNION ALL
SELECT 'default_acl', count(*)::text,
       md5(coalesce(string_agg(format('owner=%s|schema=%s|type=%s|grantor=%s|grantee=%s|privilege=%s|grantable=%s',
         CASE WHEN defaclrole = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(defaclrole) END,
         coalesce((SELECT nspname FROM pg_catalog.pg_namespace WHERE oid = defaclnamespace), '<global>'),
         defaclobjtype, CASE WHEN grantor = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(grantor) END,
         CASE WHEN grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(grantee) END,
         privilege_type, is_grantable), E'\n' ORDER BY defaclrole, defaclnamespace, defaclobjtype, grantor, grantee, privilege_type), ''))
FROM default_acl;
```

## 5. Próximos passos autorizáveis, sem executar agora

1. Na etapa 069, atribuir owner/finalidade às exceções de partição e provar o caminho de
   acesso; nunca propor remoção pela ausência de dados ou por `reltuples`.
2. Na etapa 071, produzir diff de **nomes e definições** dos 72 índices antes de chamar
   qualquer um de duplicado/obsoleto; plano e rollback precedem alteração.
3. Nas etapas 073–080, se houver autorização de leitura da tabela da extensão, fotografar
   `cron.job` separadamente e não misturar seus dados com esta baseline `pg_catalog`.
4. Nas etapas 081–087, reconciliar migrations/ledger para distinguir relocação,
   recriação e alteração live-only. Nenhuma dessas evidências autoriza DDL retrospectiva.

*Fotografia obtida em 2026-08-26 por acesso read-only. Nenhuma alteração remota foi feita.*
