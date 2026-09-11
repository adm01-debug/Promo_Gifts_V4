
-- ══════════════════════════════════════════════════════════════════════
-- MIGRATION: fix_anon_grants_security_hardening_20260623
-- Autor: Claude — PhD Database Execution Mode
-- Objetivo: Remover grants desnecessários/perigosos do role 'anon'
-- Impacto: ZERO para o frontend público (RLS já bloqueia os dados)
-- Segurança: Reduz superfície de ataque e remove ambiguidade semântica
-- ══════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 1. frontend_telemetry
--    Problema: anon tem DELETE, UPDATE, TRIGGER, REFERENCES, sem SELECT
--    Risco: anon pode DELETAR registros de telemetria (sem SELECT de volta)
--    RLS: tem políticas INSERT-only para anon — DELETE/UPDATE nunca foram úteis
--    Fix: manter apenas INSERT (necessário para log de eventos públicos)
-- ────────────────────────────────────────────────────────────────────
REVOKE DELETE, UPDATE, TRIGGER, REFERENCES ON public.frontend_telemetry FROM anon;

-- ────────────────────────────────────────────────────────────────────
-- 2. product_deactivation_requests
--    Problema: anon tem TODOS os grants (DELETE, INSERT, SELECT, UPDATE...)
--    Risco: Tabela de controle do fluxo de desativação de produtos
--             anon NUNCA deve tocar nessa tabela
--    RLS: policy authenticated_select apenas para authenticated
--    Fix: revogar tudo de anon (RLS já bloqueava, mas o grant sinaliza intenção errada)
-- ────────────────────────────────────────────────────────────────────
REVOKE ALL PRIVILEGES ON public.product_deactivation_requests FROM anon;

-- ────────────────────────────────────────────────────────────────────
-- 3. supplier_replenishment_events
--    Problema: anon tem TODOS os grants
--    Risco: Tabela interna de reposição de estoque de fornecedores
--             anon NUNCA deve ter acesso de escrita nessa tabela
--    RLS: policy 'auth read events' apenas para authenticated SELECT
--    Fix: revogar tudo de anon
-- ────────────────────────────────────────────────────────────────────
REVOKE ALL PRIVILEGES ON public.supplier_replenishment_events FROM anon;

-- ────────────────────────────────────────────────────────────────────
-- 4. workspace_notifications
--    Problema: anon tem SELECT, mas políticas RLS apenas para authenticated
--    Risco: anon vê 0 rows (RLS bloqueia), mas grant é ruído semântico
--    Fix: revogar SELECT de anon (notificações são sempre user-specific)
-- ────────────────────────────────────────────────────────────────────
REVOKE SELECT ON public.workspace_notifications FROM anon;

-- ────────────────────────────────────────────────────────────────────
-- 5. Views sensíveis — revogar SELECT de anon
--    Base tables têm RLS, então dados já estão protegidos,
--    MAS o grant revela existência do schema (information disclosure)
--    e cria confusão na auditoria de segurança.
-- ────────────────────────────────────────────────────────────────────

-- v_monthly_costs: custos de API/AI por provider — interno
REVOKE SELECT ON public.v_monthly_costs FROM anon;

-- v_my_markup_config: configuração de markup — dados de margem de negócio
REVOKE SELECT ON public.v_my_markup_config FROM anon;

-- v_quote_seller_kpis: KPIs de vendedores — inteligência de negócio
REVOKE SELECT ON public.v_quote_seller_kpis FROM anon;

-- v_db_health_audit: auditoria de saúde do DB — informação interna
REVOKE SELECT ON public.v_db_health_audit FROM anon;

-- v_kill_switch_hits_summary: dados internos de feature flags
REVOKE SELECT ON public.v_kill_switch_hits_summary FROM anon;

-- v_needs_enrichment: produtos que precisam de enrichment — dado interno de operação
REVOKE SELECT ON public.v_needs_enrichment FROM anon;

-- vw_supplier_products_raw_errors: erros internos do pipeline
REVOKE SELECT ON public.vw_supplier_products_raw_errors FROM anon;

-- vw_classify_functions_status: status de funções de classificação — interno
REVOKE SELECT ON public.vw_classify_functions_status FROM anon;

-- ────────────────────────────────────────────────────────────────────
-- 6. Notificar PostgREST para reload do schema após todas as alterações
-- ────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
;
