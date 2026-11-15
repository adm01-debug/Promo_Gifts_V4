# Workflows aposentados

Estes workflows saíram de `.github/workflows/`, então não rodam mais. O conteúdo fica guardado aqui para consulta e para ser reativado se for preciso: basta mover o arquivo de volta.

| Arquivo | Aposentado em | Motivo | O que cobre agora |
|---|---|---|---|
| `lovable-autoheal.yml` | 2026-11-13 | Corrigia o ESLint em commits do Lovable direto na main. O último commit do Lovable (gpt-engineer-app[bot]) na main é de 2026-08-31. Em 7 dias foram 197 execuções sem nenhum commit do Lovable. | O Gate Final obrigatório (deploy-gates) já exige lint e typecheck antes do merge. O script `scripts/autoheal-eslint/run.mjs` e o teste dele continuam no repositório. |
| `lovable-edit-tracker.yml` | 2026-11-13 | Rastreava o X-Lovable-Edit-ID dos commits do Lovable. Em 7 dias foram 197 execuções sem nenhum commit do Lovable. | Não se aplica enquanto o Lovable não editar a main. |
| `lovable-protected-audit.yml` | 2026-11-13 | Auditava arquivos protegidos contra edição do Lovable. As 198 execuções de 7 dias foram puladas. | `.lovableignore`, `CODEOWNERS`, o check 3 do `prod-health.yml` e o `branch-protection-sentinel.yml`, que reconhece a família de bots `lovable-*`. |
| `restore-seller-cart-rpc.yml` | 2026-11-13 | Nenhuma execução terminou desde 19/10. O job de produção usa o environment `Production`, que exige aprovação manual. A run 39233922298 ficou parada em "waiting" e segurou o grupo de concurrency (`cancel-in-progress: false`). Assim, cada run diária ficou pendente sem jobs e foi cancelada pela seguinte. O environment `staging` não tem secrets próprios, então a perna "staging" usava os secrets do repositório, ou seja, o mesmo banco canônico. Não existia staging de verdade. O bloco E2E com service_role também criava usuários sintéticos em auth.users de produção. | `deploy-gates.yml:671-690` (Gate 5.5) roda `check:restore-seller-cart-rpc` contra o canônico com `STRICT=1` em todo PR e push na main. O teste `tests/security/restore-seller-cart-rpc.test.ts` continua no vitest padrão e roda com `npm run test:restore-seller-cart-rpc` quando houver credenciais. |

As defesas passivas contra o Lovable foram mantidas porque não custam nenhuma execução. São elas o `.lovableignore`, o `CODEOWNERS`, os comentários de incidente no `deploy-gates.yml` e o reconhecimento dos bots no sentinel. Se o Lovable voltar a editar a main, mova os três arquivos de volta para `.github/workflows/`.

## wf-consolida (2026-11-13) — checagens estáticas e duplicatas

| Arquivo | Decisão | Onde a checagem roda agora |
|---|---|---|
| `check-no-prod-leak.yml` | consolidado | `.github/workflows/static-checks.yml`, step "No prod leak em config de dev/teste" |
| `check-select-columns.yml` | consolidado | `.github/workflows/static-checks.yml`, step "select() columns vs types.ts" |
| `lint-untyped-from.yml` | consolidado | `.github/workflows/static-checks.yml`, step "untypedFrom × types.ts" |
| `workflow-lint.yml` | consolidado | `.github/workflows/static-checks.yml`, step "actionlint + shellcheck" (o `check-workflow-contracts --gate` já era o Gate 1.11 do `deploy-gates.yml`) |
| `migrations-sync-log-gate.yml` | consolidado | `.github/workflows/static-checks.yml`, step "Recibo de migration em MIGRATIONS_SYNC_LOG.md" (só quando o PR toca `supabase/migrations/**`, como antes) |
| `automation-local.yml` | consolidado | `.github/workflows/static-checks.yml`, steps "Automação local — …" (`scripts/automation.config.json` → `ci.file` atualizado) |
| `ui-visual-a11y.yml` | consolidado | `.github/workflows/static-checks.yml`, step "Unit — OptimizedImage + URL state" (também coberto pelo `test:quality` do `ci.yml`) |
| `url-state-unit.yml` | consolidado | `.github/workflows/static-checks.yml`, step "Unit — OptimizedImage + URL state" (também coberto pelo `test:quality` do `ci.yml`; a varredura semanal virou execução em todo PR/push) |
