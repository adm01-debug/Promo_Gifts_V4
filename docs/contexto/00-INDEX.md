# CONTEXTO PARA AGENTES DE IA — ÍNDICE ÚNICO

> Gerado automaticamente por indice.py · 2026-11-14 08:39 UTC · HEAD `c9130556a9` · Não edite à mão.

Um sistema, três fontes de verdade, três produtores independentes. **Leia este arquivo e vá direto à fonte certa.** Cada fato tem um dono: se duas fontes discordarem, vale o dono.

## Onde está cada coisa

| Preciso de… | Fonte (dona do fato) | Onde ler | Estado |
|---|---|---|---|
| Regras que não podem ser quebradas: RLS por operação, estados e transições, validações, fórmulas, prazos, erros de negócio, testes como especificação, inconsistências código×schema (NÃO VERIFICADO) e regras humanas (`manual/`) | **regras de negócio** | `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md` | ok · 6 min atrás |
| Tabelas, colunas, RLS/políticas, funções, triggers, cron, storage, lints — **como está em produção agora** | **banco real** | `docs/contexto/supabase/README.md` | parcial · 0 min atrás · ⚠️ 1 erro(s) de coleta no manifest (erros); 1 seção(ões) com erro em errors.md |
| Rotas, telas, módulos, hooks, edge functions, grafo de dependências, testes, scripts, convenções | **código** | `docs/contexto/codigo/INDEX.md` | ok · 4 min atrás |

## Ordem de leitura antes de qualquer tarefa ou planejamento

1. **regras de negócio** — Qualquer mudança de comportamento · Antes de criar status/valor/validação · Antes de planejar.
2. **banco real** — Vou tocar tabela/coluna/política/função SQL · Quero saber se algo existe de verdade no banco.
3. **código** — Vou mexer em tela/rota/hook/edge · Preciso saber onde uma coisa vive e quem a usa.

## Regras do protocolo

- Tabela/coluna/política existe? → **banco real**. Migrations do repo são histórico, não estado.
- Onde fica, quem chama, o que importa o quê? → **código**.
- Pode fazer isso? Qual estado vem depois? Qual o limite? → **regras de negócio** (inclui `manual/`, escrito por humanos, prioridade máxima).
- Item listado como **NÃO VERIFICADO** ou **inconsistência** em qualquer fonte: confirme na fonte dona antes de assumir.
- Nada aqui é editado à mão. Para registrar uma regra que só o negócio sabe, escreva em `manual/` da fonte de regras.

<details><summary>Arquivos de <b>banco real</b> (`docs/contexto/supabase/`)</summary>

- `docs/contexto/supabase/CHANGELOG.md`
- `docs/contexto/supabase/README.md`
- `docs/contexto/supabase/auth.md`
- `docs/contexto/supabase/cron-runs.md`
- `docs/contexto/supabase/cron.md`
- `docs/contexto/supabase/edge-functions.md`
- `docs/contexto/supabase/errors.md`
- `docs/contexto/supabase/extensions.md`
- `docs/contexto/supabase/foreign-servers.md`
- `docs/contexto/supabase/functions.md`
- `docs/contexto/supabase/grants.md`
- `docs/contexto/supabase/indexes.md`
- `docs/contexto/supabase/lints.md`
- `docs/contexto/supabase/manifest.json`
- `docs/contexto/supabase/migrations.md`
- `docs/contexto/supabase/policies.md`
- `docs/contexto/supabase/project-config.md`
- `docs/contexto/supabase/queues.md`
- `docs/contexto/supabase/realtime.md`
- `docs/contexto/supabase/relationships.md`
- `docs/contexto/supabase/roles.md`
- `docs/contexto/supabase/schemas.md`
- `docs/contexto/supabase/sequences.md`
- `docs/contexto/supabase/snapshot.json`
- `docs/contexto/supabase/stats.json`
- `docs/contexto/supabase/stats.md`
- `docs/contexto/supabase/storage.md`
- `docs/contexto/supabase/tables.md`
- `docs/contexto/supabase/tables/_supabase_internal_triggers.md`
- `docs/contexto/supabase/tables/cf_recon/action_log.md`
- `docs/contexto/supabase/tables/cf_recon/cf_ghost_check_queue.md`
- `docs/contexto/supabase/tables/cf_recon/cf_image.md`
- `docs/contexto/supabase/tables/cf_recon/crawl_run.md`
- `docs/contexto/supabase/tables/cf_recon/metric_snapshot.md`
- `docs/contexto/supabase/tables/cf_recon/remediation.md`
- `docs/contexto/supabase/tables/classification_audit/category_suggestions.md`
- `docs/contexto/supabase/tables/prod_audit/category_keywords.md`
- `docs/contexto/supabase/tables/prod_audit/category_suggestions.md`
- `docs/contexto/supabase/tables/prod_audit/classification_rules.md`
- `docs/contexto/supabase/tables/prod_audit/product_features.md`
- `docs/contexto/supabase/tables/prod_audit/test_results.md`
- `docs/contexto/supabase/tables/public/access_blocked_log.md`
- `docs/contexto/supabase/tables/public/access_security_settings.md`
- `docs/contexto/supabase/tables/public/admin_audit_log.md`
- `docs/contexto/supabase/tables/public/admin_settings.md`
- `docs/contexto/supabase/tables/public/ai_enrichment_queue.md`
- `docs/contexto/supabase/tables/public/ai_function_routing.md`
- `docs/contexto/supabase/tables/public/ai_models.md`
- `docs/contexto/supabase/tables/public/ai_providers.md`
- `docs/contexto/supabase/tables/public/ai_routing_decisions.md`
- `docs/contexto/supabase/tables/public/ai_usage_events.md`
- `docs/contexto/supabase/tables/public/ai_usage_logs.md`
- `docs/contexto/supabase/tables/public/ai_usage_quotas.md`
- `docs/contexto/supabase/tables/public/analytics_events.md`
- `docs/contexto/supabase/tables/public/anon_catalog_grant_audit_log.md`
- `docs/contexto/supabase/tables/public/anon_insert_rate.md`
- `docs/contexto/supabase/tables/public/archive_product_ai_20260626.md`
- `docs/contexto/supabase/tables/public/archive_product_seo_20260626.md`
- `docs/contexto/supabase/tables/public/archive_supplier_price_tiers_20260626.md`
- `docs/contexto/supabase/tables/public/art_file_attachments.md`
- `docs/contexto/supabase/tables/public/asia_image_import_queue.md`
- `docs/contexto/supabase/tables/public/asia_upload_mapping.md`
- `docs/contexto/supabase/tables/public/attribute_definitions.md`
- `docs/contexto/supabase/tables/public/attribute_equivalences.md`
- `docs/contexto/supabase/tables/public/attribute_groups.md`
- `docs/contexto/supabase/tables/public/audit_log.md`
- `docs/contexto/supabase/tables/public/audit_log_gravacao.md`
- `docs/contexto/supabase/tables/public/auto_tag_rules.md`
- `docs/contexto/supabase/tables/public/b2b_collection_products.md`
- `docs/contexto/supabase/tables/public/b2b_collections.md`
- `docs/contexto/supabase/tables/public/backup_produto_ramo_atividade_20260625.md`
- `docs/contexto/supabase/tables/public/binding_colors.md`
- `docs/contexto/supabase/tables/public/binding_types.md`
- `docs/contexto/supabase/tables/public/bkp_kcvs_pre_normalize_20260624.md`
- `docs/contexto/supabase/tables/public/bkp_kit_color_from_name_20260624.md`
- `docs/contexto/supabase/tables/public/bkp_kit_dims_20260619.md`
- `docs/contexto/supabase/tables/public/bkp_kit_packing_type_20260624.md`
- `docs/contexto/supabase/tables/public/bkp_kit_pkg_material_20260624.md`
- `docs/contexto/supabase/tables/public/bkp_orphan_active_variants_20260619.md`
- `docs/contexto/supabase/tables/public/bot_detection_log.md`
- … +393

</details>

<details><summary>Arquivos de <b>código</b> (`docs/contexto/codigo/`)</summary>

- `docs/contexto/codigo/GRAPH_REPORT.md`
- `docs/contexto/codigo/INDEX.md`
- `docs/contexto/codigo/banco.json`
- `docs/contexto/codigo/baseline.json`
- `docs/contexto/codigo/componentes.json`
- `docs/contexto/codigo/convencoes.json`
- `docs/contexto/codigo/edge-functions.json`
- `docs/contexto/codigo/ferramentas.json`
- `docs/contexto/codigo/grafo-arestas.json`
- `docs/contexto/codigo/grafo-graphify.json`
- `docs/contexto/codigo/grafo.json`
- `docs/contexto/codigo/hooks.json`
- `docs/contexto/codigo/logica.json`
- `docs/contexto/codigo/manifest.json`
- `docs/contexto/codigo/modulos.json`
- `docs/contexto/codigo/rotas.json`
- `docs/contexto/codigo/scripts.json`
- `docs/contexto/codigo/testes.json`

</details>

<details><summary>Arquivos de <b>regras de negócio</b> (`docs/contexto/regras/`)</summary>

- `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md`
- `docs/contexto/regras/10-ACESSO-E-SEGURANCA.md`
- `docs/contexto/regras/11-GLOSSARIO-E-LACUNAS.md`
- `docs/contexto/regras/context.json`
- `docs/contexto/regras/manifest.json`
- `docs/contexto/regras/manual/README.md`
- `docs/contexto/regras/manual/TEMPLATE-regras-de-negocio.md`
- `docs/contexto/regras/manual/regras.md`

</details>
