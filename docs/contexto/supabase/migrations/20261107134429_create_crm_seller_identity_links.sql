-- Vinculo imutavel entre a identidade canônica (auth.users) e o vendedor
-- inteiro do CRM externo. E-mail pode iniciar o vinculo, mas nunca volta a ser
-- a chave de autorizacao depois que a associacao foi persistida.
-- Rollback: supabase/rollbacks/20261107134429_rollback.sql
-- soft-delete-exempt: mapeamento 1:1 de identidade (auth.users -> public.users.id do CRM), não
-- registro de negócio. Exclusão lógica aqui seria pior que a física: uma linha marcada como
-- excluída continuaria casando com o SELECT por auth_user_id e o vendedor ficaria preso a um
-- vínculo morto, enquanto o bootstrap por e-mail (crm-db-bridge, resolveCrmSellerId) recria o
-- vínculo sozinho na requisição seguinte. A linha também já cai por ON DELETE CASCADE quando o
-- usuário é removido de auth.users.
CREATE TABLE IF NOT EXISTS public.crm_seller_identity_links (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  crm_seller_id bigint NOT NULL UNIQUE CHECK (crm_seller_id > 0),
  link_source text NOT NULL DEFAULT 'email_bootstrap'
    CHECK (link_source IN ('email_bootstrap', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now()
)

COMMENT ON TABLE public.crm_seller_identity_links IS
  'Mapeamento 1:1 canônico auth.users -> public.users.id do CRM externo usado pelo crm-db-bridge.'

COMMENT ON COLUMN public.crm_seller_identity_links.crm_seller_id IS
  'Identificador inteiro de public.users.id no projeto CRM externo pgxfvjmuubtbowutlide.'

ALTER TABLE public.crm_seller_identity_links ENABLE ROW LEVEL SECURITY

REVOKE ALL ON TABLE public.crm_seller_identity_links FROM PUBLIC

REVOKE ALL ON TABLE public.crm_seller_identity_links FROM anon

REVOKE ALL ON TABLE public.crm_seller_identity_links FROM authenticated

GRANT SELECT, INSERT ON TABLE public.crm_seller_identity_links TO service_role
