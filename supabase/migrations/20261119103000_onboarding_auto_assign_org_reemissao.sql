-- Rollback: supabase/rollbacks/20261119103000_rollback.sql
--
-- REEMISSAO de 20260621210001_onboarding_auto_assign_org_canonica.sql, escrita em
-- 21/06/2026 e NUNCA aplicada em producao, apesar do cabecalho dela dizer
-- "APLICADO 2026-06-21 (Supabase MCP execute_sql)". Medido em 19/11/2026 no banco
-- canonico: nem o trigger trg_auto_assign_org nem a funcao
-- fn_auto_assign_org_on_profile existem (pg_trigger e pg_proc, ambos vazios), e a
-- version 20260621210001 nao consta em supabase_migrations.schema_migrations.
-- Nenhuma migration posterior os derruba: o unico arquivo do repo que cita os dois
-- nomes e a propria 20260621210001.
--
-- POR QUE REEMITIR em vez de aplicar o arquivo original: o preflight o reprova por
-- dois motivos de forma, e corrigir o arquivo historico o tornaria MODIFICADO, o que
-- faz o gate de recibos (E75) recusar recibo pendente. Mesmo caminho ja usado nas
-- reemissoes 20261119073000 e 20261119081500.
--   E066 — a funcao e SECURITY DEFINER com SET search_path TO 'public', sem pg_temp.
--          Corrigido abaixo para 'public', 'pg_temp'. E a UNICA diferenca de SQL
--          em relacao ao original.
--   E063 — faltava o cabecalho "-- Rollback:" e o arquivo em supabase/rollbacks/.
--
-- O QUE FICOU DE FORA, de proposito: o bloco de higiene no fim do original, que
-- apaga de user_organizations e organization_members os vinculos de usuarios que
-- nao existem mais nem em auth.users nem em profiles. Medido hoje: ele apagaria
-- 4 linhas. Delecao de dado em producao e decisao do dono (AGENTS.md Git 7), nao
-- entra junto com uma correcao de bug. Fica como passo separado.
--
-- O BUG QUE ISTO CORRIGE (medido em producao em 19/11/2026):
--   profiles = 86, usuarios distintos em user_organizations = 18, perfis sem
--   organizacao = 72. Nos ultimos 30 dias: 71 perfis criados, 71 sem organizacao —
--   nenhuma excecao. Ultimo vinculo criado em user_organizations: 15/10/2026.
--   Perfil mais recente: 16/11/2026. Dos 72 sem organizacao, 72 existem em
--   auth.users, 72 tem papel em user_roles, 40 logaram nos ultimos 30 dias e
--   ZERO criaram orcamento.
--   A causa e a RLS: as policies vivas de public.quotes exigem o vinculo —
--     org_members_create_quotes (INSERT) WITH CHECK user_is_org_member(organization_id)
--     quotes_select_scope      (SELECT) USING      user_is_org_member(organization_id)
--   e user_is_org_member le exatamente public.user_organizations. Sem vinculo o
--   usuario logado nao cria nem enxerga orcamento nenhum.
--   Nada mais cria o vinculo: handle_new_user so insere em profiles, e
--   fn_grant_default_role_on_profile (trigger vivo trg_grant_default_role) so insere
--   em user_roles — conferido com pg_get_functiondef nas duas.
--
-- ESCOPO: isto conserta usuarios FUTUROS. Os 72 que ja existem continuam sem
-- organizacao; dar acesso a eles e backfill, e backfill de controle de acesso e
-- decisao do dono.
--
-- Pre-condicoes conferidas hoje, todas verdadeiras:
--   - a organizacao canonica 5db5aee1-064b-4ef4-9193-345dcd8274ea existe
--     ("Promobrind", unica linha de public.organizations);
--   - em user_organizations e organization_members, toda coluna NOT NULL alem do par
--     (organization_id, user_id) tem default — role default 'member'::org_role,
--     timestamps now(), id gen_random_uuid() — entao o INSERT de duas colunas basta;
--   - os alvos do ON CONFLICT existem: PK (organization_id, user_id) em
--     user_organizations e UNIQUE (organization_id, user_id) em organization_members.

CREATE OR REPLACE FUNCTION public.fn_auto_assign_org_on_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _org constant uuid := '5db5aee1-064b-4ef4-9193-345dcd8274ea'; -- unica org real (Promo Brindes)
BEGIN
  IF EXISTS (SELECT 1 FROM public.organizations WHERE id = _org) THEN
    INSERT INTO public.user_organizations (organization_id, user_id)
    VALUES (_org, NEW.id) ON CONFLICT (organization_id, user_id) DO NOTHING;
    INSERT INTO public.organization_members (organization_id, user_id)
    VALUES (_org, NEW.id) ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_assign_org ON public.profiles;
CREATE TRIGGER trg_auto_assign_org
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_auto_assign_org_on_profile();
