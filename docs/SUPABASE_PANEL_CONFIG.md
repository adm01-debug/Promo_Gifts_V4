# Configuração de painel do Supabase canônico (IaC-lite)

> Registro declarativo das configurações do projeto `doufsxqlfjyuvxuezpln` que
> **não** vivem em código/migration — são gerenciadas pelo dashboard Supabase.
> Ainda não temos Terraform/config.toml completo (o que existe já está
> versionado em `supabase/config.toml`: `project_id` + `verify_jwt` por edge).
> Este doc é o "inventário de estado desejado": se o projeto for recriado ou
> alguém alterar o painel, esta é a referência para restaurar/auditar.
>
> **Última revisão:** 2026-10-11 (auditoria 22-dimensões).

## 1. Auth (Authentication → Settings)

| Config | Valor esperado | Observação |
|---|---|---|
| Email provider | **enabled** | login por email/senha é o fluxo principal |
| Google OAuth | **enabled** | redirect `/auth/callback` no app |
| Email confirmations | enabled (confirm email) | novos signups precisam confirmar |
| Password min length | conforme SSOT `passwordPolicy` em `src/lib/auth/` | a política forte vive no código |
| Turnstile/CAPTCHA | secret `TURNSTILE_SECRET_KEY` no vault | validada na edge `check-login` |
| Session JWT expiry | default (3600s) | refresh token padrão |
| Site URL / Redirect URLs | domínio de produção + localhost:8080 | OAuth callback |

## 2. Secrets de edge function (Dashboard → Edge Functions → Secrets)

Gerenciados por `supabase secrets set` / painel — **nunca** commitados.
Inventário esperado (nomes, não valores):

- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` (automáticos)
- `CF_ORIGIN_SECRET` — valida header `X-Cf-Origin-Secret` injetado por
  Cloudflare Transform Rule → habilita `cf-ipcity` confiável no `check-login`
- `TURNSTILE_SECRET_KEY` — verificação Turnstile no `check-login`
- `CRM_CALLBACK_API_KEY` — auth do webhook `receive-crm-callback`
- `CRON_SECRET` — auth `x-cron-secret` das funções agendadas (ver
  `_shared/dispatcher-auth.ts`)
- `N8N_PRODUCT_WEBHOOK_SECRET`, `N8N_PRODUCT_WEBHOOK_TOLERANCE_SEC` —
  assinatura do `product-webhook`
- `E2E_CLEANUP_TOKEN`, `E2E_CLEANUP_ALLOWED_EMAILS` — `e2e-cleanup` (CI)
- `OPENAI_API_KEY` / chaves de IA — `expert-chat`, `kit-ai-builder`, etc.
- `BITRIX24_*` — integração CRM (ver `docs/EDGE_FUNCTIONS.md`)
- Secrets de conexão externa — `connections-*`/`sync-external-db`

## 3. Cron jobs (Database → Extensions → pg_cron)

Os agendamentos vivem em migrations + `net.http_post` com `x-cron-secret`.
Qualquer job criado no painel **sem** migration correspondente é drift —
o `ddl-out-of-band-detector` (advisory semanal) detecta. Lista canônica:
`supabase/migrations/*cron*.sql`.

## 4. Backups / PITR (Settings → Backups)

| Item | Status | Responsável |
|---|---|---|
| PITR habilitado | ⚠️ **a confirmar pelo PO** (plano/adicional pago) | ver `db/BACKUP_STATUS.md` |
| Daily backups | automático do plano | — |
| RPO documentado | 24h se PITR ausente | `db/BACKUP_STATUS.md` |

## 5. Storage

| Bucket | Público? | Observação |
|---|---|---|
| `mockups` | conforme policy | upload via `generate-mockup`/`secure-upload` |
| `magazines` | público (capas/páginas publicadas) | servido por `magazine-public-view` |
| `uploads` | privado | via `secure-upload` com magic-bytes + MIME |

## 6. API / PostgREST

- `max_rows` por resposta ≈ 1000 (default) — o `anonymize-user` pagina por
  keyset justamente por causa deste cap.
- RLS habilitada em todas as tabelas `public` — baseline assinado em
  `.security/policies-baseline.json` (drift check no CI).

## 7. Rate limiting de edge

Rate limits por edge vivem **no código** (`_shared/rate-limit.ts`,
`RateLimiter` com `keyPrefix` por edge) — ver `docs/openapi/edges-publicas.yaml`
para os limites por endpoint público.

## Como manter este doc

- Toda vez que uma config de painel mudar (auth toggle, secret novo, cron
  novo fora de migration), atualizar aqui no mesmo PR.
- Auditoria trimestral: conferir painel × este doc (o mesmo espírito do
  `policies-baseline` para RLS).
