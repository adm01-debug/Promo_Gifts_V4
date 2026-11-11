# sql-legacy — SQL histórico não-migration

Arquivos aqui são SQL histórico que **não segue** o padrão de versão
`YYYYMMDDHHMMSS_nome.sql` exigido pelo Supabase CLI e pelo replay do baseline.

Estes arquivos foram movidos de `supabase/migrations/` em E057 (2026-10-18)
para que `supabase/migrations/` contenha **somente** o que o
`supabase migration list` enxerga.

## Situação de cada arquivo

Cada arquivo neste diretório pode ser:
1. **já-aplicado-sem-ledger** → abrir migration espelho com versão canônica + `migration repair --status applied` (via workflow E15)
2. **nunca-aplicado e ainda necessário** → adicionar à fila do E15 com versão canônica
3. **obsoleto** → permanece aqui com comentário `-- OBSOLETO:` no início

## Regras

- **Não aplicar** estes arquivos diretamente em produção via MCP ou CLI
- **Não mover de volta** para `supabase/migrations/` sem renomear com versão canônica
- **Não usar** como migration no workflow `db-apply-migration.yml`

## Referência

PLANO_MELHORIAS_CORRECOES_200_ETAPAS_2026-10-18.md § E057

## Reentrada indevida via #3361 (corrigido em 2026-11-11)

A PR #3361 (registro de 611 arquivos não rastreados) recolocou em `supabase/migrations/`
cópias idênticas de `001`–`005` (removidas de lá; o original continua aqui) e trouxe dois
arquivos fora do contrato de nomes, agora guardados aqui sem alteração de conteúdo:

- `20250103_placeholder.sql` — placeholder `SELECT 1` (versão curta, fora do padrão de 14 dígitos).
- `20260515120000_fix_audit_ownership_orphans_uuid_only.sql` — colide com a versão
  `20260515120000_t40_fix_error_advisor_violations.sql`, que é a canônica.
