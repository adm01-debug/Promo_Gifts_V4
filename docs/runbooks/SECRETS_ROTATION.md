# Runbook — Rotação de Secrets

## Cadência

| Secret | Onde | Cadência | Impacto ao rotacionar |
|---|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | GitHub Secrets | 90d | Management API (linter, policies, drift) |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Secrets + Edge env | 90d | Tudo — rotacionar fora de horário de pico |
| `E2E_USER_EMAIL`/`_PASSWORD` | GitHub Secrets | 180d | CI autenticado (E21 falha imediata) |
| `VERCEL_TOKEN` | GitHub Secrets | 90d | Deploys de preview |
| Webhooks n8n/Bitrix/SalesPro | `integration_credentials` (DB SSOT) | por rotação do fornecedor | Sync de quotes/produtos |

## Procedimento (todos seguem o mesmo padrão)

1. Gerar o valor novo no provedor.
2. **Não apagar o antigo ainda** — atualizar primeiro no destino de leitura:
   - GitHub Secrets: Settings → Secrets → Actions → Update.
   - Edge env / DB: `integration_credentials` via `/admin/conexoes` (resolveCredential
     é DB-first — a UI já é o caminho certo, sem redeploy).
3. Verificar um fluxo que usa o secret (ex.: run manual do `policies-baseline`
   para `SUPABASE_ACCESS_TOKEN`; login E2E para `E2E_USER_*`).
4. Só então revogar o valor antigo no provedor.
5. Pendências: audit_log da troca é automático em `integration_credentials`;
   para GitHub Secrets anotar a data em `docs/SECURITY.md` §rotação.

## Armadilhas conhecidas

- Senha do Postgres Supabase tem que bater com `PGPASSWORD` no GitHub — trocar
  os dois juntos (DB → secret), senão o CI de migrations falha (incidente real).
- Rotacionar `SUPABASE_SERVICE_ROLE_KEY` exige update no env das Edge Functions
  (dashboard → Edge Functions → Secrets) ANTES de revogar a antiga.
