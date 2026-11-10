-- Rollback: 20261107180000_security_fix_suppliers_authenticated_credential_leak_v2
-- Restaura o estado anterior (SELECT table-level para authenticated).
-- ATENÇÃO: reabre o vazamento de api_credentials. Usar apenas em emergência.
GRANT SELECT ON public.suppliers TO authenticated;