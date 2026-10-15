-- Espelho do ledger (reconciliação B2, 2026-10-15)
-- version=20261013171601 name=agente2_fase3_00_index_only
-- Aplicada em doufsxqlfjyuvxuezpln em 2026-10-13 via MCP apply_migration (Agente 2, incidente
-- 2026-10-13). Corresponde à seção 0 do antigo 20261013141300_fase3_rls_performance.sql.
-- Nunca teve arquivo próprio no repo.
-- Corpo = statements do ledger, byte a byte: md5 = cfb42430d4cae9f09b7e6b793b4bd557.
-- Já está no ledger: NÃO reaplicar.
-- >>> statements do ledger (byte-exato) abaixo desta linha <<<
create index if not exists idx_user_organizations_user_org_covering
  on public.user_organizations (user_id, organization_id);