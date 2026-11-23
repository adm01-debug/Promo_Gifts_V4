-- Rollback: 20261123130000_view_tabela_preco_faixa_public.sql
grant select on public.tabela_preco_gravacao_oficial_faixa to anon;
revoke select on public.v_tabela_preco_gravacao_oficial_faixa_public from anon, authenticated;
drop view if exists public.v_tabela_preco_gravacao_oficial_faixa_public;
