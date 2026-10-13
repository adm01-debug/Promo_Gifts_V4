# Runbook — Caminho de Hotfix em Produção

Quando um bug crítico em produção não pode esperar o ciclo normal de PR.

## Sequência (sempre nesta ordem)

1. **Diagnosticar**: reproduzir, identificar o último deploy que introduziu
   (`git log --oneline -10` + `gh run list --workflow deploy-gates.yml`).
2. **Decidir rollback vs fix-forward**: rollback é sempre preferido quando a
   mudança é revertível sem migração destrutiva. Vercel tem "Instant Rollback"
   no deployment anterior (1 clique em vercel.com/juca1/promo-gifts-v4).
3. **Fix-forward**: branch `hotfix/<desc>` a partir de `main`, PR com título
   `hotfix: …`. O required check é só "Gate Final - Deploy Ready" — não esperar
   a suíte E2E completa em emergência comprovada (merge manual admin).
4. **Edge function**: deploy só via
   `.github/workflows/deploy-edge-functions.yml` (`function_name` pontual).
   Nunca `supabase functions deploy` direto (REGRA #8 corolário).
5. **Migration emergencial**: só via `db-apply-migration.yml` dispatch —
   nunca `db push`/SQL editor.
6. **Pós-hotfix**: registrar em `docs/postmortems/` (template POSTMORTEM.md)
   dentro de 48h. Vértice: o que detectou primeiro (alerta vs usuário).

## Pessoas

- Merge de emergência: Joaquim (owner) ou Devin com autorização explícita.
- Deploy Vercel manual: Joaquim (conta juca1).

## Evidências do incidente 2026-10-11 (plano Supabase)

- Upgrade de plano derrubou GoTrue (`/auth/v1/token` → 522) por >1h enquanto
  rest/health respondiam — probe de Auth deve estar no uptime-monitor, não só /health.
