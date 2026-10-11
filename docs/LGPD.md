# LGPD — Política de Dados Pessoais (Promo_Gifts_V4)

Última atualização: 2026-10-11 (auditoria 22 dimensões).

## Dados pessoais tratados

| Dado | Tabela/local | Base legal | Retenção |
|---|---|---|---|
| email, senha (hash) | `auth.users` | Execução de contrato | Vida da conta |
| nome, dados de perfil | `profiles` | Execução de contrato | Vida da conta |
| email + IP + user_agent de login | `login_attempts` | Legítimo interesse (segurança/antifraude) | **90 dias** — purge oportunista em `log-login-attempt` (`RETENTION_DAYS`) |
| dados de carrinho/orçamento | `seller_carts`, `quotes*` | Execução de contrato | Vida da conta |
| consentimentos | `consent_logs` | Consentimento | Conforme termo |

## Direitos do titular

- **Eliminação/anonimização:** edge `anonymize-user` (self-service) — substitui PII em `auth.users`/`profiles`, bane a conta, expurga `login_attempts`, `consent_logs` e endereços. Pendências viram linhas `anonymize_user.*` em `admin_audit_log` com SQL de reparo.
- **Acesso/correção:** via suporte; exportação manual por admin.
- **Revogação de consentimento:** `consent_logs` registra a revogação (append-only).

## Incidente de segurança

Notificação ANPD/titulares conforme art. 48: avaliação em até 2 dias úteis pelo time de engenharia + PO. Template em `docs/templates/POST_MORTEM_TEMPLATE.md`.

## Operadores

- Supabase (banco, `doufsxqlfjyuvxuezpln` — região sa-east-1)
- Vercel (hosting), Sentry (observabilidade — eventos com PII redigida via `sanitize`), Cloudflare Turnstile (antibot)
