-- ============================================================
-- Etapa 3C: Workflow do orçamento + Permissions granulares
-- 5 tabelas: permissions, role_permissions, quote_history,
-- workspace_notifications, discount_approval_requests
-- ============================================================

-- ════════════════ 1) permissions — catálogo de códigos ════════════════
CREATE TABLE public.permissions (
  code        text PRIMARY KEY,
  category    text NOT NULL,
  label       text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read permissions"
  ON public.permissions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Devs manage permissions"
  ON public.permissions FOR ALL TO authenticated
  USING (public.is_admin_strict(auth.uid()))
  WITH CHECK (public.is_admin_strict(auth.uid()));

INSERT INTO public.permissions (code, category, label, description) VALUES
  -- Produtos
  ('view_products',     'products', 'Visualizar produtos',     'Ver catálogo de produtos'),
  ('create_products',   'products', 'Criar produtos',          'Adicionar novos produtos'),
  ('edit_products',     'products', 'Editar produtos',         'Modificar dados de produtos'),
  ('delete_products',   'products', 'Excluir produtos',        'Remover produtos do catálogo'),
  ('import_products',   'products', 'Importar produtos',       'Importação em lote via CSV/XLSX'),
  ('manage_suppliers',  'products', 'Gerenciar fornecedores',  'CRUD de fornecedores'),
  ('manage_categories', 'products', 'Gerenciar categorias',    'CRUD de categorias e subcategorias'),
  ('manage_kits',       'products', 'Gerenciar kits',          'Criar e editar kits/combos'),
  -- Clientes
  ('view_clients',      'clients',  'Visualizar clientes',     'Ver base de clientes'),
  ('edit_clients',      'clients',  'Editar clientes',         'Modificar dados de clientes'),
  -- Orçamentos
  ('view_quotes',       'quotes',   'Visualizar orçamentos',   'Ver orçamentos'),
  ('create_quotes',     'quotes',   'Criar orçamentos',        'Iniciar novos orçamentos'),
  ('edit_quotes',       'quotes',   'Editar orçamentos',       'Modificar orçamentos próprios'),
  ('delete_quotes',     'quotes',   'Excluir orçamentos',      'Remover orçamentos'),
  ('approve_quotes',    'quotes',   'Aprovar descontos',       'Aprovar descontos acima do limite'),
  -- Pedidos
  ('view_orders',       'orders',   'Visualizar pedidos',      NULL),
  ('create_orders',     'orders',   'Criar pedidos',           NULL),
  ('edit_orders',       'orders',   'Editar pedidos',          NULL),
  ('manage_orders',     'orders',   'Gerenciar todos pedidos', 'Acesso total a pedidos'),
  -- Relatórios
  ('view_reports',      'reports',  'Visualizar relatórios',   NULL),
  ('export_reports',    'reports',  'Exportar relatórios',     'Exportar PDF/XLSX'),
  ('view_dashboard',    'reports',  'Visualizar dashboard',    'Acesso ao dashboard pessoal'),
  -- Mockups
  ('view_mockups',      'mockups',  'Visualizar mockups',      NULL),
  ('create_mockups',    'mockups',  'Criar mockups',           'Gerar mockups com IA'),
  -- IA
  ('use_expert_ai',     'ai',       'Usar Expert IA',          'Acesso ao chat especialista'),
  -- Equipe
  ('manage_team',       'admin',    'Gerenciar equipe',        'Adicionar/remover membros');

-- ════════════════ 2) role_permissions — junction role × code ════════════════
CREATE TABLE public.role_permissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role            public.app_role NOT NULL,
  permission_code text NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, permission_code)
);
CREATE INDEX idx_role_permissions_role ON public.role_permissions(role);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Devs manage role_permissions"
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.is_admin_strict(auth.uid()))
  WITH CHECK (public.is_admin_strict(auth.uid()));

-- Seeds: dev/supervisor/admin/manager → TODAS permissões
INSERT INTO public.role_permissions (role, permission_code)
SELECT r, code FROM public.permissions, 
  (VALUES ('dev'::public.app_role), ('supervisor'), ('admin'), ('manager')) AS roles(r);

-- Seed: agente (vendedor) → subset operacional
INSERT INTO public.role_permissions (role, permission_code) VALUES
  ('agente', 'view_products'),
  ('agente', 'view_clients'),
  ('agente', 'view_quotes'),
  ('agente', 'create_quotes'),
  ('agente', 'edit_quotes'),
  ('agente', 'view_orders'),
  ('agente', 'create_orders'),
  ('agente', 'view_mockups'),
  ('agente', 'create_mockups'),
  ('agente', 'view_dashboard'),
  ('agente', 'use_expert_ai'),
  ('agente', 'manage_kits');

-- Helper: has_permission(uid, code)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _code text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.permission_code = _code
  );
$$;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, anon;

COMMENT ON FUNCTION public.has_permission IS
  'Verifica se um usuário (via suas roles em user_roles) possui uma permissão específica.';

-- ════════════════ 3) workspace_notifications ════════════════
CREATE TABLE public.workspace_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  message     text NOT NULL,
  type        text NOT NULL DEFAULT 'info',
  category    text NOT NULL DEFAULT 'system',
  is_read     boolean NOT NULL DEFAULT false,
  action_url  text,
  metadata    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_workspace_notifications_user_unread 
  ON public.workspace_notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.workspace_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.workspace_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.workspace_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON public.workspace_notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated can insert notifications"
  ON public.workspace_notifications FOR INSERT TO authenticated
  WITH CHECK (true);
-- INSERT aberto pra qualquer authenticated; lógica de quem notifica quem fica no app/edge

-- ════════════════ 4) quote_history — audit trail ════════════════
CREATE TABLE public.quote_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id      uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action        text NOT NULL,
  field_changed text,
  old_value     text,
  new_value     text,
  description   text NOT NULL,
  metadata      jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_quote_history_quote_id   ON public.quote_history(quote_id);
CREATE INDEX idx_quote_history_created_at ON public.quote_history(created_at DESC);
CREATE INDEX idx_quote_history_user_id    ON public.quote_history(user_id);

ALTER TABLE public.quote_history ENABLE ROW LEVEL SECURITY;

-- Vendedor vê histórico dos próprios orçamentos; supervisor+ vê todos
CREATE POLICY "Sellers and supervisors view quote_history"
  ON public.quote_history FOR SELECT TO authenticated
  USING (
    public.is_supervisor_or_above(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_history.quote_id
        AND (q.created_by = auth.uid() OR q.assigned_to = auth.uid())
    )
  );

-- Vendedor pode criar history dos próprios orçamentos; supervisor+ pode tudo
CREATE POLICY "Sellers and supervisors create quote_history"
  ON public.quote_history FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND (
      public.is_supervisor_or_above(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.quotes q
        WHERE q.id = quote_history.quote_id
          AND (q.created_by = auth.uid() OR q.assigned_to = auth.uid())
      )
    )
  );

COMMENT ON TABLE public.quote_history IS 
  'Audit trail de mudanças em orçamentos. Schema migrations/20251220131225 (com policies adaptadas: quotes.created_by/assigned_to em vez de seller_id que não existe).';

-- ════════════════ 5) discount_approval_requests ════════════════
CREATE TABLE public.discount_approval_requests (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id                    uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  seller_id                   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_discount_percent  numeric(5,2) NOT NULL CHECK (requested_discount_percent >= 0 AND requested_discount_percent <= 100),
  max_allowed_percent         numeric(5,2) NOT NULL CHECK (max_allowed_percent >= 0 AND max_allowed_percent <= 100),
  status                      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_id                    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_notes                 text,
  seller_notes                text,
  responded_at                timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dar_quote_id   ON public.discount_approval_requests(quote_id);
CREATE INDEX idx_dar_seller_id  ON public.discount_approval_requests(seller_id);
CREATE INDEX idx_dar_status     ON public.discount_approval_requests(status, created_at DESC);
CREATE INDEX idx_dar_pending    ON public.discount_approval_requests(created_at DESC) WHERE status = 'pending';

ALTER TABLE public.discount_approval_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: vendedor vê próprias + supervisor+ vê todas
-- (espelha policy hint dar_select_scope)
CREATE POLICY "dar_select_scope"
  ON public.discount_approval_requests FOR SELECT TO authenticated
  USING (
    seller_id = auth.uid() OR public.is_supervisor_or_above(auth.uid())
  );

-- INSERT: vendedor cria pra si mesmo
-- (policy hint dar_insert_scope)
CREATE POLICY "dar_insert_scope"
  ON public.discount_approval_requests FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid());

-- UPDATE: supervisor+ (pra aprovar/rejeitar)
-- (policy hint dar_update_scope)
CREATE POLICY "dar_update_scope"
  ON public.discount_approval_requests FOR UPDATE TO authenticated
  USING (public.is_supervisor_or_above(auth.uid()))
  WITH CHECK (public.is_supervisor_or_above(auth.uid()));

-- DELETE: só dev (admin_strict)
CREATE POLICY "dar_delete_dev_only"
  ON public.discount_approval_requests FOR DELETE TO authenticated
  USING (public.is_admin_strict(auth.uid()));

COMMENT ON TABLE public.discount_approval_requests IS
  'Workflow de aprovação de desconto acima do limite. Vendedor solicita, supervisor+ aprova/rejeita. Schema oficial extraído de useDiscountApproval.ts.';

-- ════════════════ Triggers updated_at ════════════════
CREATE TRIGGER trg_dar_updated_at 
  BEFORE UPDATE ON public.discount_approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
