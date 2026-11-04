-- FIX: security_invoker=false para bypassar RLS base (VIEW já filtra colunas)
ALTER VIEW v_suppliers_public SET (security_invoker = false);

-- GRANTs para PostgREST
GRANT SELECT ON v_suppliers_public TO anon;
GRANT SELECT ON v_suppliers_public TO authenticated;
