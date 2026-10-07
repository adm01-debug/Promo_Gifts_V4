# SEGREDOS.md — Inventário de Segredos e Variáveis dos Workflows

> **SSOT (E98).** Qualquer PR que adicione `secrets.NOVO_SEGREDO` a um workflow
> DEVE incluir uma linha neste arquivo com dono, escopo e rotação declarados.
> Referência: CLAUDE.md § CI — "Inventário de segredos — E98".

Última atualização: 2026-10-02 (E98)

---

## Segredos obrigatórios (usados em gates bloqueantes)

| Segredo | Dono | Escopo | Rotação | Workflows consumidores |
|---|---|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | DevOps/PO | Repo | 6 meses | `deploy-gates.yml` (database-integrity), `supabase-security-gate.yml`, `supabase-linter-gate.yml`, `db-apply-migration.yml`, `schema-snapshot-export.yml`, `capacity-growth-report.yml` |
| `SUPABASE_SERVICE_ROLE_KEY` | DevOps/PO | Repo | 6 meses | `deploy-gates.yml` (restore-cart-rpc-gate) |
| `SUPABASE_DB_PASSWORD` | DevOps/PO | Repo | 6 meses | `schema-snapshot-export.yml` |
| `PGHOST` | DevOps/PO | Repo | — | `db-apply-migration.yml` (acesso direto Postgres — E15) |
| `PGUSER` | DevOps/PO | Repo | — | `db-apply-migration.yml` |
| `PGPASSWORD` | DevOps/PO | Repo | 6 meses | `db-apply-migration.yml` |
| `PGDATABASE` | DevOps/PO | Repo | — | `db-apply-migration.yml` |
| `PGPORT` | DevOps/PO | Repo | — | `db-apply-migration.yml` |

## Segredos opcionais (usados em gates advisory/opcionais)

| Segredo | Dono | Escopo | Rotação | Workflows consumidores |
|---|---|---|---|---|
| `LHCI_GITHUB_APP_TOKEN` | DevOps | Repo | Nunca (GitHub App) | `deploy-gates.yml` (lighthouse — Gate 4, `continue-on-error: true`) |

## Segredos de runtime dos testes E2E

Estes segredos são usados em workflows de E2E/integração que NÃO fazem parte
do Gate Final. São credenciais de ambiente de staging/test, não de produção.

| Segredo | Dono | Escopo | Rotação | Workflows consumidores |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | DevOps | Repo | — | `e2e.yml`, `e2e-quote-item-editor-sheet.yml`, `freight-e2e-staging.yml`, `e2e-pdf-dialog.yml`, `kit-coverage-integration.yml`, `supabase-security-gate.yml`, `stock-future-stock-e2e.yml`, `update-quote-reset-snapshots.yml`, `replenishment-quality.yml`, `e2e-personalization.yml`, `edge-integration-all.yml`, `e2e-quote-items-table-header.yml`, `e2e-visual-preview-button.yml` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | DevOps | Repo | — | Mesmos workflows acima (chave anon/publishable do Supabase) |
| `VITE_SUPABASE_PROJECT_ID` | DevOps | Repo | — | `kit-coverage-integration.yml` |
| `KIT_FIXTURE_ID` | DevOps | Repo | A cada fixture | `kit-coverage-integration.yml` |

> **Nota sobre `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`:** são variáveis
> de configuração do projeto Supabase canônico (`doufsxqlfjyuvxuezpln`). O valor de
> `VITE_SUPABASE_URL` é `https://doufsxqlfjyuvxuezpln.supabase.co`. A chave publishable
> (anon) é de conhecimento público por design do Supabase — as políticas RLS são a
> camada de segurança real. Não rotar a menos que haja comprometimento confirmado.

## Tokens automáticos do GitHub Actions

Estes tokens são gerados automaticamente pelo GitHub em cada run — não são
armazenados como segredos no repositório e não precisam de rotação manual.

| Token | Escopo | Observação |
|---|---|---|
| `GITHUB_TOKEN` (via `secrets.GITHUB_TOKEN`) | Repo | Permissões mínimas (R1 do Padrão E12). Workflows que escrevem (push, PR, labels) devem declarar o escopo necessário explicitamente. |

---

## Regras de uso (Padrão E12 — R5)

> **R5:** Segredos via `env:` no step, jamais como argumento CLI.

Correto:
```yaml
- name: Usar segredo
  run: some-command
  env:
    TOKEN: ${{ secrets.MEUS_SEGREDOS }}
```

Errado:
```yaml
- run: some-command --token ${{ secrets.MEUS_SEGREDOS }}
```

---

## Procedimento para adicionar novo segredo

1. Adicionar o segredo no GitHub (Settings → Secrets → Actions)
2. Adicionar linha neste arquivo (PR obrigatório — não via commit direto em `main`)
3. O PR deve nomear: dono, escopo, rotação, workflows consumidores
4. Referenciar o número do PR neste arquivo na coluna "Observação" se necessário

## Procedimento para rotacionar segredo

1. Gerar novo valor no sistema de origem (Supabase dashboard, GitHub App, etc.)
2. Atualizar no GitHub Actions Secrets (Settings → Secrets)
3. Verificar que CI verde antes de revogar o valor anterior
4. Atualizar data de rotação neste arquivo em PR separado
