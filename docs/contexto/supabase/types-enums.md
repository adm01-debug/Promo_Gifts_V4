# Tipos customizados (enums, domains, composites)

| tipo | kind | valores / definição | usado em |
|---|---|---|---|
| public.resultado_calculo_personalizacao | composite | tecnica_mae_codigo character varying(50), tecnica_mae_nome character varying(100), variante_codigo character varying(50), variante_nome character varying(100), table_code character varying(50), quantidade integer, num_cores integer, area_cm2 numeric(10,2), preco_custo_unitario numeric(10,4), custo_total numeric(12,2), markup_percent numeric(5,2), preco_venda_unitario numeric(10,4), valor_gravacao numeric(12,2), setup_base numeric(10,2), cobra_por_cor boolean, setup_total numeric(10,2), total_cobrado numeric(12,2), preco_por_peca_efetivo numeric(10,4), usou_setup_minimo boolean, economia_cliente numeric(10,2), preco_minimo_unitario numeric(10,2), aplicou_preco_minimo boolean, faixa_usada integer, fonte_preco character varying(50), mensagem text |  |
| public.resultado_preco_personalizacao | composite | table_code character varying(50), tecnica_codigo character varying(50), tecnica_nome character varying(100), quantidade integer, area_cm2 numeric, faixa_utilizada integer, preco_unitario_custo numeric(10,2), preco_unitario_venda numeric(10,2), multiplicador_area numeric(5,2), markup_percent numeric(5,2), custo_setup numeric(10,2), custo_handling numeric(10,2), subtotal_custo numeric(12,2), subtotal_venda numeric(12,2), total_com_setup numeric(12,2), sucesso boolean, mensagem text |  |
| public.app_role | enum | dev, supervisor, admin, manager, agente, coordenador, vendedor | public.ai_usage_quotas.role, public.role_migration_items.from_role, public.role_migration_items.to_role, public.role_permissions.role, public.user_roles.role |
| public.categoria_cor_enum | enum | pantone, basica, institucional, especial, bordado, hot_stamping, serigrafia, sublimacao |  |
| public.conversation_event_type | enum | text, image, audio, video, file, system | public.conversation_event_history.event_type |
| public.familia_cor_enum | enum | amarelo, laranja, vermelho, coral, rosa, magenta, roxo, lilas, azul, ciano, verde, marrom, bege, neutro, metalico |  |
| public.magazine_reaction_kind | enum | like, love, fire, idea | public.magazine_public_reactions.kind |
| public.magazine_status | enum | draft, published, archived | public.magazines.status |
| public.org_role | enum | owner, admin, member | public.organization_members.role, public.user_organizations.role |
| public.payment_status | enum | pending, authorized, captured, refunded, failed |  |
| public.produtos_padronizacao_status | enum | pending, standardized, rejected, promoted | public.produtos_padronizacao.status, public.produtos_padronizacao_variantes.status, public.produtos_site_padronizacao.status |
| public.role_migration_item_status | enum | pending, success, failed, skipped | public.role_migration_items.status |
| public.role_migration_status | enum | pending, running, completed, failed, cancelled | public.role_migration_batches.status |
| public.silver_norm_status | enum | raw, normalizing, normalized, validated, rejected, promoted |  |
| public.step_up_action | enum | promote_dev, demote_dev, mcp_full_issue, mcp_full_escalate, secret_rotation, secret_revoke, mcp_key_revoke, mcp_key_rotate | public.step_up_audit_log.action, public.step_up_challenges.action, public.step_up_tokens.action |
| public.supplier_raw_status | enum | pending, processing, processed, failed, skipped, quarantined | public.supplier_customization_raw.status, public.supplier_products_raw.images_status, public.supplier_products_raw.site_status, public.supplier_products_raw.status, public.supplier_products_raw.stock_status, public.vw_products_pending_variants.bronze_status |
| public.tipo_cor_enum | enum | solid, metalica, fluorescente, pastel, neon, especial |  |
