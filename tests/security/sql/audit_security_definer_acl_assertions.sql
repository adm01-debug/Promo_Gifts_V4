\set ON_ERROR_STOP on

DO $$
DECLARE
  exact_allowed integer;
  expected_findings integer;
BEGIN
  SELECT count(*) INTO exact_allowed
  FROM public.audit_security_definer_acl()
  WHERE (function_name = 'fn_product_active_for_rls' AND arguments = 'p_id uuid')
     OR (function_name = 'get_quote_token_public' AND arguments = '_token text')
     OR (function_name = 'get_sitemap_public' AND arguments = 'p_limit integer, p_offset integer');
  IF exact_allowed <> 0 THEN
    RAISE EXCEPTION 'exact allowlisted signatures produced % findings', exact_allowed;
  END IF;

  SELECT count(*) INTO expected_findings
  FROM public.audit_security_definer_acl()
  WHERE granted_to = 'anon'
    AND ((function_name = 'fn_product_active_for_rls' AND arguments = 'p_id text')
      OR (function_name = 'get_quote_token_public' AND arguments = '_token uuid')
      OR (function_name = 'get_sitemap_public' AND arguments = 'p_limit bigint, p_offset bigint')
      OR (function_name = 'leaky_admin_helper' AND arguments = ''));
  IF expected_findings <> 4 THEN
    RAISE EXCEPTION 'expected 4 non-allowlisted findings, got %', expected_findings;
  END IF;
END;
$$;

SELECT 'SECDEF_ACL_EXACT_SIGNATURES_OK' AS result;
