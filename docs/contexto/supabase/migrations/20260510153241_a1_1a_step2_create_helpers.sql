-- A1-1a (sub-passo 2/2): Cria helpers canônicas is_admin_or_above e is_coord_or_above.
-- Padrão idêntico a public.is_dev: STABLE, SECURITY DEFINER, search_path fixo,
-- DEFAULT auth.uid(), wrapper sobre public.has_role como SSOT.

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ is_admin_or_above: TRUE se user é dev OU admin                          │
-- │ Use em policies/triggers de privilégio administrativo:                  │
-- │   - cadastros DB (produtos, fornecedores, técnicas, kits, categorias)   │
-- │   - gestão de usuários (user_roles INSERT/UPDATE/DELETE)                │
-- │   - integrações sensíveis (integration_credentials, ip_access_control)  │
-- │   - leitura de audit_log                                                │
-- └─────────────────────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION public.is_admin_or_above(_user_id uuid DEFAULT auth.uid())
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'dev'::public.app_role)
      OR public.has_role(_user_id, 'admin'::public.app_role);
$$;

COMMENT ON FUNCTION public.is_admin_or_above(uuid) IS
  'Hierarquia 4 niveis (A1-1a): retorna TRUE se user e dev OU admin. Usar em policies de cadastros DB, gestao de usuarios, integracoes administrativas e leitura de audit_log.';

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ is_coord_or_above: TRUE se user é dev OU admin OU coordenador           │
-- │ Use em policies de:                                                     │
-- │   - aprovação de desconto (discount_approval_requests)                  │
-- │   - visibilidade transversal de dados de vendedor                       │
-- │     (seller_discount_limits SELECT, search_queries SELECT, etc.)        │
-- │   - kit_templates, custom_kits, quote_history (gestão de coordenador)   │
-- └─────────────────────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION public.is_coord_or_above(_user_id uuid DEFAULT auth.uid())
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'dev'::public.app_role)
      OR public.has_role(_user_id, 'admin'::public.app_role)
      OR public.has_role(_user_id, 'coordenador'::public.app_role);
$$;

COMMENT ON FUNCTION public.is_coord_or_above(uuid) IS
  'Hierarquia 4 niveis (A1-1a): retorna TRUE se user e dev OU admin OU coordenador. Usar em policies de aprovacao de desconto e visibilidade transversal de dados de vendedor.';
