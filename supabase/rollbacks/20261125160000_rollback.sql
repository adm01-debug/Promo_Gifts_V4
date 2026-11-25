-- Rollback de supabase/migrations/20261125160000_restaura_grant_anon_mv_product_compositions.sql
-- ATENCAO: este rollback devolve exatamente o estado que quebrou o catalogo
-- publico em 2026-11-25 (anon sem SELECT em public.mv_product_compositions):
-- Gate 1 `check-public-views-drift --require-live` vermelho e composicao de kit
-- indisponivel para o visitante anonimo. Use apenas para diagnostico.
REVOKE SELECT ON TABLE public.mv_product_compositions FROM anon;
