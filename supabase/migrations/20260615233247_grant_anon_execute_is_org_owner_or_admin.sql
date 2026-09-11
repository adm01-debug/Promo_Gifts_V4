-- ============================================================================
-- FIX SEV-1 (descoberto em teste): a policy de SELECT de product_images foi
-- alterada pelo ambiente para `is_active OR is_org_owner_or_admin(organization_id)`,
-- mas o papel `anon` NÃO tinha EXECUTE nessa função. Resultado: ao avaliar a RLS
-- sobre qualquer linha inativa, o anônimo recebia `permission denied for function
-- is_org_owner_or_admin` e a query inteira falhava -> imagens quebravam no site público.
--
-- A função é SECURITY DEFINER e usa auth.uid(); para anon (uid nulo) retorna false
-- (sem vazamento). Conceder EXECUTE ao anon corrige o erro e mantém a intenção:
-- anônimo vê apenas imagens ativas; inativas só para owner/admin da organização.
-- Fix estável: independe da expressão exata da policy (resiste à churn do ambiente).
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_org_owner_or_admin(uuid) TO anon;;
