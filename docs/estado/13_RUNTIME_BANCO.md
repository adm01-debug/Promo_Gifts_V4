# 13 — Runtime do Banco Canônico (medição ao vivo)

> **Projeto:** `doufsxqlfjyuvxuezpln` (SSOT de produção)
> **Medido em:** 2026-08-16, sessão de auditoria de estado
> **Método:** exclusivamente `SELECT` em `pg_catalog` / `cron` / `supabase_migrations` / `auth`.
> **Nenhuma DDL, DML, migration ou deploy foi executado.** Produção foi tratada como somente leitura.
> **Status:** `VERIFICADO` — salvo onde marcado `NAO_VERIFICADO`.

---

## 1. Inventário vivo × documentação do repo

| Objeto | **Medido ao vivo (2026-08-16)** | `docs/SCHEMA_REFERENCE.md` (2026-07-16) | Δ |
|---|---:|---:|---:|
| Tabelas base (`public`) | **391** | 386 | +5 |
| Views | **192** | 190 | +2 |
| Materialized views | **4** | 5 | **−1** |
| Funções | **1.280** | 1.277 | +3 |
| Funções `SECURITY DEFINER` | **530** | 529 | +1 |
| Policies RLS | **927** | 906 | +21 |
| Triggers | **385** | 385 | 0 |
| Cron jobs | **137** (135 ativos) | 136 (134 ativos) | +1 |
| PostgreSQL | 17.6 | 17.6 | — |

**Conclusão:** `docs/SCHEMA_REFERENCE.md` está **defasado em 30 dias**. Não é erro grave (as ordens de grandeza batem), mas confirma o princípio: documento é hipótese, não fonte. Uma matview **desapareceu** desde julho — não localizei registro da remoção.

Query de reprodução: ver §7.

---

## 2. 🔴 ACHADO GRAVE — o ambiente NÃO é reconstruível a partir do repositório

Este é o achado mais sério da auditoria inteira.

| Medida | Valor |
|---|---:|
| Migrations **aplicadas** no banco (`supabase_migrations.schema_migrations`) | **2.354** |
| Arquivos `.sql` **versionados** em `supabase/migrations/` | **1.672** |
| Diferença bruta | **682** |

### Distribuição por mês (onde o drift mora)

| Mês | Aplicadas no banco | Versionadas no repo | Δ |
|---|---:|---:|---:|
| 2024-12 → 2026-04 | 474 | 474 | **0 — perfeito** |
| 2026-05 | 354 | 421 | repo tem **+67** |
| 2026-06 | 1.315 | 580 | **banco tem +735** |
| 2026-07 | 152 | 105 | **banco tem +47** |

Até abril/2026 o versionamento era **impecável**. O rompimento é de maio a julho/2026.

### Verificação exata em julho/2026 (mês menor, escolhido para provar o método)

```
comm -23 db.txt repo.txt  →  150 versões aplicadas no banco AUSENTES do repo
comm -13 db.txt repo.txt  →   96 arquivos do repo SEM registro de aplicação
```

Apenas **2 de 152** coincidem.

**Contraprova executada** (para descartar artefato de nomenclatura): busquei 5 versões aplicadas no repositório inteiro (`grep -rl` em `*.sql`, `*.md`, `*.json`) — `20260716125144`, `20260717120020`, `20260703151305`, `20260710111116`, `20260718135800`. **Zero ocorrências.** Não é problema de nome de arquivo: o SQL aplicado em produção simplesmente não existe no repositório.

### ⚠️ CORREÇÃO À MINHA PRÓPRIA LEITURA INICIAL

Minha primeira formulação foi *"96 migrations do repo nunca foram aplicadas"*. **Isso está superdimensionado** e eu o corrijo aqui em voz alta, conforme exige a Fase D.

Amostrei 3 desses arquivos e verifiquei no banco vivo se os objetos que eles criam existem:

| Arquivo do repo "não aplicado" | Objeto declarado | Existe no banco? |
|---|---|---|
| `20260714112808_fix_auth_hydration_rpc_and_rls.sql` | `fn get_profile_and_roles` | ✅ **existe** |
| `20260712_performance_indexes.sql` | `idx_user_roles_user_id_role` | ✅ **existe** |
| `20260712_performance_indexes.sql` | `idx_workspace_notifications_user_unread_v2` | ✅ **existe** |
| `20260712_fix_rls_policies_critical.sql` | policy `user_sees_own_notifications` | ❌ **não existe** |
| `20260712_fix_rls_policies_critical.sql` | policy `enable_read_for_requesting_user` | ❌ **não existe** |
| `20260712_fix_rls_policies_critical.sql` | `idx_discount_approval_requests_requesting_user_id` | ❌ **não existe** |

**Leitura correta:** parte do conteúdo versionado **foi aplicada sob outro identificador de versão** (o registro de versões não corresponde ao conteúdo), e parte **realmente não chegou ao banco** — `20260712_fix_rls_policies_critical.sql` está aplicada **pela metade**: os índices existem, as policies de RLS não.

**Direção A** (150/152 aplicadas ausentes do repo): **CONFIRMADA, alta confiança.**
**Direção B** ("96 nunca aplicadas"): **superdimensionada** — o número correto de "nunca aplicadas" exige verificação objeto a objeto, não feita. Marcado `NAO_VERIFICADO` no total; confirmado apenas que **pelo menos uma** migration de RLS está parcialmente ausente.

### Consequência prática para o dono

1. Recriar o banco a partir de `supabase/migrations/` **não reproduz produção**. O repo não é a fonte da verdade do schema.
2. Existe correção de RLS escrita, revisada e **não aplicada** (`20260712_fix_rls_policies_critical.sql`) — as policies de notificações e de solicitação de desconto que ela pretendia criar não existem no banco.
3. Última migration aplicada: **`20260718135800` (18/jul/2026)**. Nenhuma migration aplicada em agosto.

---

## 3. Tabelas vazias — a prova mais barata de funcionalidade dormente

| Situação | Tabelas | % |
|---|---:|---:|
| **Vazias (0 linhas)** | **135** | **34,5%** |
| Quase vazias (1–10 linhas) | 68 | 17,4% |
| Com dados (>10) | 188 | 48,1% |
| **Total** | **391** | 100% |

**Mais de um terço do banco nunca recebeu um único registro.** E o padrão não é aleatório — são **famílias inteiras de funcionalidade**:

| Família vazia | Tabelas | O que significa |
|---|---:|---|
| `magic_up_*` | 6 (brand_kits, campaigns, comments, generations, public_shares, reactions) | Módulo inteiro sem uso |
| `mockup_*` | 5 + `generated_mockups` | Gerador de mockup nunca gerou nada persistido |
| `webhook_*` | 5 (outbox, deliveries, delivery_locks, delivery_metrics, request_nonces) | Fila de webhooks nunca processou |
| `kit_*` (colaboração) | 5 (collaborators, comments, share_tokens, templates, variants) | Colaboração em kits sem uso |
| `product_group_*` / `product_component*` | 8 | Agrupamento/composição de produto sem uso |
| `step_up_*` | 3 (audit_log, challenges, tokens) | Autenticação step-up nunca exercida |
| `mcp_*` | 4 (api_keys, access_violations, full_grantors, key_auto_revocations) | Camada MCP sem uso |
| `magazine_public_view_events` + 5 partições | 6 | Telemetria de revista pública sem um evento |
| Preferências/estado de usuário | `user_preferences`, `notification_preferences`, `user_notification_preferences`, `saved_filters`, `user_filter_presets`, `recently_viewed_products`, `user_search_history`, `user_favorites`, `user_comparisons` | Nenhuma preferência de usuário jamais salva |
| Orçamento (acessórios) | `quote_drafts`, `quote_templates`, `quote_versions`, `quote_approval_tokens` | Rascunho/versão/aprovação de orçamento sem uso |
| Outros notáveis | `notifications`, `companies`, `collection_items`, `audit_log`, `cart_templates`, `sales_goals`, `scheduled_reports`, `expert_conversations`, `expert_messages`, `push_subscriptions`, `personalization_simulations` | — |

> **Regra de ouro aplicada:** *pronto = em produção com uso real.* Toda funcionalidade cuja tabela de destino está vazia **não pode ser ✅**, por mais completo que esteja o código. Teto: 🟨.

---

## 4. Uso real do sistema — a medição que muda o quadro

| Métrica | Valor medido |
|---|---:|
| Usuários em `auth.users` | **13** |
| Logaram nos últimos 30 dias | **2** |
| Último login | 2026-08-15 (ontem) |
| `profiles` / `user_roles` | 13 / 13 |
| **`quotes` (orçamentos)** | **5** |
| `quote_items` | 8 |
| `quote_item_personalizations` | 1 |
| **`orders` (pedidos)** | **5** |
| `order_items` | 9 |
| `seller_carts` / `seller_cart_items` | 4 / 5 |
| `collections` / `collection_items` | 4 / **0** |
| `favorite_lists` / `favorite_items` | 4 / 2 |
| `magazines` / `magazine_items` | 9 / 18 |
| `mockup_drafts` / `generated_mockups` | 2 / **0** |

**Interpretação (separando o que medi do que infiro):**

- **Medido:** o sistema tem 13 contas, 2 ativas no último mês, 5 orçamentos e 5 pedidos em toda a sua história.
- **Inferido:** o produto está em estágio **pré-lançamento / uso interno**, não em operação comercial.

Isso não desqualifica o trabalho — mas **redefine a régua**. Toda a linha comercial (orçamento, carrinho, pedido, kit, coleção, revista, comparação, favoritos) existe em código com volume industrial, e tem **uso real próximo de zero**. Pelo critério do próprio prompt, essas funcionalidades são 🟨, não ✅ — independentemente da qualidade do código.

---

## 5. O que está genuinamente BOM (medido, não elogiado)

Não distorço o quadro para parecer rigoroso. Estes pontos são fortes de verdade:

### 5.1 Pipeline de dados / catálogo — vivo e em escala industrial

| Tabela | Linhas |
|---|---:|
| `stock_snapshots` | **1.784.894** |
| `stock_daily_summary` | 1.312.533 |
| `supplier_products_raw_history_p2026_06/07/08` | 407.589 / 363.739 / 263.245 |
| `product_relationships` | 154.812 |
| `image_backfill_queue` | 116.383 |
| `product_images` | 72.007 |
| **`products`** | **7.842** |
| `product_variants` | 19.432 |

A metade "catálogo/ingestão" do sistema **está em produção com uso real**, processando volume sério de fornecedores.

### 5.2 Cron — infraestrutura saudável

| Métrica | Valor |
|---|---:|
| Jobs totais / ativos | 137 / **135** |
| Execuções **bem-sucedidas** em 7 dias | **65.548** |
| Execuções **falhas** em 7 dias | **1** |
| Última execução | 2026-08-16 13:47 UTC (durante esta auditoria) |

Taxa de sucesso de **99,998%**. Isso é operação real e saudável.

### 5.3 Edge Functions — paridade perfeita repo ↔ produção

| Medida | Valor |
|---|---:|
| Funções com código em `supabase/functions/` | **104** |
| Funções implantadas no projeto | **104** |
| Status `ACTIVE` | **104 / 104** |
| Implantadas sem código no repo | **0** |
| Com código sem implantação | **0** |

Nenhum drift. É o oposto do que acontece com as migrations.

### 5.4 RLS — cobertura quase total

| Medida | Valor |
|---|---:|
| Tabelas em `public` | 391 |
| Com RLS **habilitada** | **390 (99,7%)** |
| Com ao menos uma policy | 388 |
| Policies totais | 927 |

Exceções (as únicas 3):

| Tabela | RLS | Policies | Linhas | Avaliação |
|---|---|---:|---:|---|
| `supplier_products_raw_history_p2026_11` | **desabilitada** | 0 | 0 | Partição futura vazia — risco baixo, mas é lacuna real |
| `magazine_public_view_events_2026_11` | habilitada | 0 | 0 | Partição futura, nega tudo por padrão |
| `anon_catalog_grant_audit_log` | habilitada | 0 | 122 | Nega tudo — provavelmente intencional (log de auditoria) |

---

## 6. Automações que falham em silêncio

O prompt avisa que este é o padrão mais traiçoeiro: *falha sem erro visível, por isso nunca vira chamado.* Encontrei três casos.

| Job | Agendamento | Ativo | Execuções | Falhas | Diagnóstico |
|---|---|---|---:|---:|---|
| **`vacuum-high-dead-tuples`** | `30 4 * * 0` (dom 04:30) | **sim** | 3 | **3** | 🔴 **100% de falha.** Roda semanalmente, falhou em todas as execuções. Manutenção de tabela inoperante — e com `stock_snapshots` em 1,78M linhas, é justamente onde faria falta. |
| `process-webhook-outbox` | `* * * * *` | **não** | 0 | 0 | 🟨 Desativado. **Explica diretamente** por que as 5 tabelas `webhook_*` estão vazias: a fila de webhooks nunca foi processada. |
| `pipeline-classify-categories` | `2,12,22,... * * * *` | **não** | 0 | 0 | 🟨 Desativado, nunca executou. Classificação automática de categorias inoperante. |
| `smoke_tests_monthly` | `0 3 1 * *` | sim | 0 | 0 | 🟦 Mensal, nunca executou. Pode ser recém-criado — `NAO_VERIFICADO` se já teve janela. |

Os outros **133 jobs ativos** estão saudáveis.

---

## 7. Higiene — tabelas de descarte em produção

5 tabelas de backup/arquivo vivem no schema `public` de produção:

| Tabela | Linhas |
|---|---:|
| `_backup_stock_daily_summary_20260618` | 202.229 |
| `backup_produto_ramo_atividade_20260625` | 63.626 |
| `_archive_supplier_price_tiers_20260626` | 31.157 |
| (+2 outras) | — |

~297 mil linhas de dado morto ocupando o banco canônico desde junho. Não é urgente, mas é decisão do dono remover.

---

## 8. Queries de reprodução

Toda medição deste documento é reproduzível. Somente leitura.

```sql
-- §1 Inventário vivo
SELECT
 (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind IN ('r','p')) AS tabelas,
 (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind='v') AS views,
 (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind='m') AS matviews,
 (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public') AS funcoes,
 (SELECT count(*) FROM pg_policies WHERE schemaname='public') AS policies,
 (SELECT count(*) FROM cron.job) AS cron_jobs;

-- §2 Drift de migrations (por mês)
SELECT substring(version from 1 for 6) AS mes, count(*)
FROM supabase_migrations.schema_migrations
WHERE version ~ '^20[0-9]{4}' GROUP BY 1 ORDER BY 1;
-- comparar com:  ls supabase/migrations/*.sql | sed 's|.*/||' \
--                | grep -oE '^20[0-9]{4}' | sort | uniq -c

-- §3 Tabelas vazias
SELECT c.relname FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_stat_user_tables s ON s.relid=c.oid
WHERE n.nspname='public' AND c.relkind IN ('r','p')
  AND COALESCE(s.n_live_tup,0)=0 ORDER BY 1;

-- §6 Saúde dos crons
SELECT j.jobid, j.jobname, j.schedule, j.active,
  (SELECT count(*) FROM cron.job_run_details d WHERE d.jobid=j.jobid) AS execucoes,
  (SELECT count(*) FROM cron.job_run_details d WHERE d.jobid=j.jobid AND d.status='failed') AS falhas
FROM cron.job j ORDER BY falhas DESC, execucoes ASC;

-- §5.4 Cobertura de RLS
SELECT count(*) FILTER (WHERE c.relrowsecurity) AS com_rls, count(*) AS total
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p');
```

---

## 9. O que esta medição de runtime NÃO cobriu

Declarado, não escondido:

- **Conteúdo dos dados** — contei linhas, não inspecionei valores de negócio.
- **Storage buckets** e seu uso — não medido.
- **Logs de Edge Functions** (taxa de erro real das 104 funções) — `NAO_VERIFICADO`.
- **Realtime / subscriptions** — não medido.
- **Histórico de execução do GitHub Actions** — sem acesso; nenhum check foi afirmado como passando ou falhando.
- **Comportamento em navegador** — nenhuma sessão real de usuário foi exercida.
- **`node_modules` ausente** no ambiente desta auditoria: build e testes **não foram executados**. Nada neste documento afirma que o projeto compila ou que os testes passam.
