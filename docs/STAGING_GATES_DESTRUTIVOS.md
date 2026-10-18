# Staging para gates destrutivos

> Sprint 2 da auditoria 22-dimensões. Estado atual: **os gates que tocam o
> banco rodam direto no canônico `doufsxqlfjyuvxuezpln`** — não existe um
> projeto staging provisionado. Este doc define o que já é multi-ambiente,
> o que roda em produção hoje, e o caminho para tirar os gates destrutivos
> de produção.

## Gates que tocam o canônico hoje

| Workflow | O que faz | Risco em prod | Multi-env? |
|---|---|---|---|
| `supabase-security-gate.yml` (gate RLS) | Aplica migrations `> max(remoto)` em transação `ROLLBACK` e valida policies | Baixo-médio: transações abortadas, mas ocupa conexões e pode travar em lock | Não — ref hardcoded por REGRA #1 |
| `db-schema-drift-check.yml` | `supabase link` + `migration list` + `db diff` (catálogo, read-only) | Baixo: leituras de catálogo | Não — drift só faz sentido contra o canônico |
| `db-apply-migration.yml` (E15) | Aplica migration de verdade via `psql -1` gated por `environment: production` | Alto **por design** — é o caminho autorizado | Só production (correto) |
| `security-definer-acl-multi-env.yml` | Valida ACL de funções SECURITY DEFINER | Baixo: read-only | **Já é multi-env** (`staging`/`production`) |
| `edge-functions-drift-check.yml` | Compara edge functions do repo com o deploy | Baixo: read-only | Não — drift só contra o canônico |
| `prod-health.yml` | Probes HTTP no canônico | Nenhum | N/A |

## Como provisionar o staging (ação do PO, ~10 min)

1. Supabase dashboard → **New project** (free tier basta): nome
   `promo-gifts-v4-staging`, mesma região do canônico (sa-east-1).
2. Bootstrap do schema: `supabase db dump -f supabase/tmp/staging_seed.sql`
   linkado ao canônico (read-only — dump de schema só) e depois
   `psql <staging-url> -f supabase/tmp/staging_seed.sql`. NÃO usar
   `supabase/migrations-snapshot/ALL_IN_ONE.sql` — é artefato de auditoria
   (o README do snapshot marca como audit-only e o histórico de migrations
   não reconstrói o banco do zero; replay parcial gera staging divergente
   e invalida os gates).
3. GitHub → Settings → Environments → criar `staging`:
   - **variable** `STAGING_SUPABASE_PROJECT_REF` (o ref não é segredo e a
     expressão de override lê o contexto `vars` — cadastrar como secret
     faz o fallback `|| 'doufsxqlfjyuvxuezpln'` vencer e o gate continua
     mirando produção);
   - **secrets** `STAGING_SUPABASE_ACCESS_TOKEN`,
     `STAGING_SUPABASE_DB_PASSWORD`, `STAGING_SUPABASE_URL`,
     `STAGING_SUPABASE_ANON_KEY` (prefixo `STAGING_` para nunca colidir
     com os secrets do canônico).
   O ref de staging anotado em `docs/IAC_SUPABASE_CANONICO.md` assim que
   provisionado (IaC-lite registra refs de infra).

## Como apontar um gate para o staging

Os workflows já aceitam `SUPABASE_PROJECT_REF` como variável
sobrescrevível (default `doufsxqlfjyuvxuezpln`). Para mover o gate RLS:

```yaml
# supabase-security-gate.yml — job de aplicação em ROLLBACK
env:
  SUPABASE_PROJECT_REF: ${{ vars.STAGING_SUPABASE_PROJECT_REF || 'doufsxqlfjyuvxuezpln' }}
```

e, no mesmo job, ler `SUPABASE_ACCESS_TOKEN`/`SUPABASE_DB_PASSWORD` do
environment `staging` quando o ref for staging. `security-definer-acl-multi-env.yml`
já faz exatamente isso — usar como referência.

Atenção: hoje `supabase-security-gate.yml` passa o ref canônico LITERAL
em `supabase link` e nos envs por step — o override precisa ser aplicado
em cada referência do job, não só no `env:` de nível de job, senão os
comandos continuam mirando produção. Validar no PR: rodar o gate com o
ref de staging e conferir no log que `link --project-ref` mostra o
ref de staging. Se a variável de staging estiver ausente, o job deve
FALHAR (fail closed), não cair no canônico — preferir
`${{ vars.STAGING_SUPABASE_PROJECT_REF }}` sem fallback no job de
aplicação em ROLLBACK.

## Regras

- Gates **read-only** continuam no canônico (drift/health só fazem sentido
  contra produção).
- Gates **que executam DDL/DML** (mesmo em `ROLLBACK`) migram para staging
  assim que o projeto existir — rollback não é zero-risco (lock, slot de
  conexão, long-running).
- O canônico segue protegido por REGRA #1: nenhum workflow de teste aponta
  para o projeto legado `pqpdolkaeqlyzpdpbizo` [LEGACY_INFORMATIVO].
