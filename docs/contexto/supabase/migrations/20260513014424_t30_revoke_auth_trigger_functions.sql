-- T30: REVOKE authenticated from trigger-only SECURITY DEFINER functions.
-- These functions are invoked exclusively by PostgreSQL trigger mechanisms
-- (BEFORE/AFTER INSERT/UPDATE/DELETE) or are no-arg cron launchers.
-- No frontend code calls these directly. Idempotent: REVOKE on missing grant = no-op.

DO $$
DECLARE fn RECORD;
BEGIN
  FOR fn IN VALUES
    -- Trigger functions (fired by INSERT/UPDATE/DELETE, never by users)
    ('audit_mcp_api_keys_changes',               ''),
    ('audit_mcp_key_insert',                     ''),
    ('audit_mcp_key_revoke',                     ''),
    ('audit_user_role_changes',                  ''),
    ('charge_mockup_credits_for_job',            ''),
    ('dispatch_quote_webhook_event',             ''),
    ('fn_audit_gravacao_changes',                ''),
    ('fn_check_preco_minimo_faixa',              ''),
    ('fn_derive_similarity_pairs_on_insert',     ''),
    ('fn_ensure_seller_discount_limit',          ''),
    ('fn_grant_default_role_on_profile',         ''),
    ('fn_handle_new_user',                       ''),
    ('fn_qip_propagate_to_quote_items',          ''),
    ('fn_quote_children_enforce_parent_immutability',''),
    ('fn_quotes_enforce_immutability',           ''),
    ('fn_quotes_recalc_subtotal_from_items',     ''),
    ('fn_quotes_validate_discount',              ''),
    ('fn_remove_similarity_pairs_on_delete',     ''),
    ('fn_sync_novelty_to_product',               ''),
    ('fn_sync_product_deactivation_to_similarity',''),
    ('fn_sync_product_stock_cache',              ''),
    ('fn_toggle_group_similarity_pairs',         ''),
    ('fn_update_supplier_last_sync',             ''),
    ('fn_validate_member_supplier',              ''),
    ('generate_order_number',                    ''),
    ('generate_quote_number',                    ''),
    ('guard_mcp_api_keys_writes',                ''),
    ('handle_new_user',                          ''),
    ('limit_recently_viewed_items',              ''),
    ('log_mcp_key_changes',                      ''),
    ('log_mcp_key_revocation',                   ''),
    ('log_mockup_prompt_change',                 ''),
    ('notify_discount_approval_request',         ''),
    ('notify_new_order',                         ''),
    ('notify_quote_client_response',             ''),
    ('notify_quote_status_change',               ''),
    ('prevent_profile_role_change',              ''),
    ('prevent_role_self_update',                 ''),
    ('trg_auto_revoke_mcp_on_role_loss',         ''),
    ('validate_quote_real_discount',             '')
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM authenticated', fn.column1, fn.column2);
      RAISE NOTICE 'T30: revoked authenticated from %(%)', fn.column1, fn.column2;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'T30: skip %(%): %', fn.column1, fn.column2, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'T30 complete.';
END;
$$;
