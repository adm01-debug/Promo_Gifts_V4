-- Rollback: 20261119103000_onboarding_auto_assign_org_reemissao
--
-- Remove o trigger de onboarding e a funcao que ele chama, devolvendo o banco ao
-- estado de 19/11/2026: usuario novo volta a nascer SEM organizacao e, por causa das
-- policies org_members_create_quotes e quotes_select_scope (que exigem
-- user_is_org_member), volta a nao conseguir criar nem enxergar orcamento.
--
-- Em outras palavras, reverter reabre o bug que a migration conserta. So faz sentido
-- se o trigger em si estiver causando dano — por exemplo, se o INSERT em
-- user_organizations passar a falhar e derrubar o cadastro de novos usuarios.
-- Neste caso, prefira investigar antes de reverter: o cadastro quebrado e pior que o
-- vinculo ausente.
--
-- NAO remove vinculos ja criados pelo trigger: quem ja entrou na organizacao
-- continua nela. Isso e deliberado — tirar acesso de usuario e decisao do dono, nao
-- efeito colateral de um rollback tecnico.

DROP TRIGGER IF EXISTS trg_auto_assign_org ON public.profiles;
DROP FUNCTION IF EXISTS public.fn_auto_assign_org_on_profile();
