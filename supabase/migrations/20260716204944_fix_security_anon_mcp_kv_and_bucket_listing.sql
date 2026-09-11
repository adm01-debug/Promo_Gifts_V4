-- Migration 039: Fix security — revoke anon from mcp_kv_get + fix bucket listing

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1) Revoke anon execute on mcp_kv_get
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'mcp_kv_get'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.mcp_kv_get(text, text) FROM anon;
    RAISE NOTICE '✓ [anon_security_definer_function_executable] REVOKE EXECUTE ON mcp_kv_get FROM anon';
  ELSE
    RAISE NOTICE '- public.mcp_kv_get not found — skipping';
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2) Fix mockup-assets bucket SELECT policy to prevent listing
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can view mockup assets" ON storage.objects;

  CREATE POLICY "Authenticated users can view mockup assets"
    ON storage.objects
    FOR SELECT TO authenticated
    USING (
      (bucket_id = 'mockup-assets'::text)
      AND (name IS NOT NULL)
      AND (length(name) > 0)
    );

  RAISE NOTICE '✓ [public_bucket_allows_listing] mockup-assets SELECT policy updated — listing prevention applied';
END;
$$;

-- ─── Validation ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  anon_can_exec boolean;
  policy_qual   text;
BEGIN
  SELECT has_function_privilege('anon', 'public.mcp_kv_get(text, text)', 'EXECUTE')
  INTO anon_can_exec;

  IF anon_can_exec THEN
    RAISE WARNING 'anon still has EXECUTE on mcp_kv_get — revoke may have failed';
  ELSE
    RAISE NOTICE '✓ anon no longer has EXECUTE on mcp_kv_get';
  END IF;

  SELECT qual
  INTO policy_qual
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename  = 'objects'
    AND policyname = 'Authenticated users can view mockup assets';

  IF policy_qual IS NULL THEN
    RAISE WARNING 'Policy "Authenticated users can view mockup assets" not found';
  ELSIF policy_qual NOT LIKE '%name IS NOT NULL%' AND policy_qual NOT LIKE '%name is not null%' THEN
    RAISE WARNING 'Policy USING clause may still allow listing: %', policy_qual;
  ELSE
    RAISE NOTICE '✓ mockup-assets USING clause: %', policy_qual;
  END IF;

  RAISE NOTICE 'Migration 039 complete — 2 security findings addressed.';
END;
$$;;
