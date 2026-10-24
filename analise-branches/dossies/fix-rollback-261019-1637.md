# Dossiê — claude/fix-rollback-261019-1637

**Data análise:** 2026-10-24  
**SHA main baseline:** 652a7f14  
**Merge-base:** ahead: 2 | Behind: ~79

## Intenção
Adicionar arquivo de rollback para a migration `20261019000000_mirror_oob_frontend_telemetry_v_system_health_dashboard` e corrigir a compatibilidade do Resolver com `@hookform/resolvers v5` em `ProductFormFullscreen.tsx`.

## Commits únicos (git cherry + = 2)
```
f60ce60f fix(migrations): adiciona rollback header + arquivo rollback 20261019000000
c10816b9 fix(types): compatibilidade de Resolver com @hookform/resolvers v5
```

## Arquivos modificados (3)
- `supabase/migrations/20261019000000_mirror_oob_frontend_telemetry_v_system_health_dashboard.sql` — adiciona header de rollback
- `supabase/rollbacks/20261019000000_rollback.sql` — arquivo novo de rollback (6 linhas)
- `src/components/admin/products/ProductFormFullscreen.tsx` — cast `as ProductFormData` (zodResolver v5 compat)

## Análise
- **supabase/migrations/**: toca arquivo de migration (adicionar header não é DDL, mas é arquivo versionado de banco) → critério de aprovação humana obrigatório
- **supabase/rollbacks/**: arquivo novo de rollback — não aplica DDL, mas é governança de schema
- A migration `20261019000000` JÁ ESTÁ em produção (ledger baseline: última versão `20261022203935`; 20261019000000 < baseline). O arquivo de rollback é documentação retroativa.
- O cast em ProductFormFullscreen.tsx é workaround legítimo de tipagem (zodResolver v5).

## Cruzamento Supabase
- **Migrations:** arquivo de migration existente tocado (header) + rollback novo para migration JÁ APLICADA
- **Edge functions:** ZERO

## VEREDITO
**AGUARDANDO APROVAÇÃO** — toca `supabase/migrations/` e `supabase/rollbacks/`. O conteúdo é seguro (rollback retroativo de migration já aplicada, sem DDL novo), mas o critério de aprovação para qualquer toque em `supabase/` exige revisão humana.

**O que muda em produção:** nada (migration já aplicada; rollback é só arquivo de referência). Risco: mínimo. Rollback do rollback: apagar `supabase/rollbacks/20261019000000_rollback.sql`.
