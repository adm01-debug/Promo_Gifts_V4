# Workflows aposentados

Workflows retirados de `.github/workflows/` sem apagar conteúdo: o arquivo vem
para cá com `git mv` (histórico preservado) e ganha uma linha abaixo dizendo
**onde a checagem passou a rodar**. Arquivos aqui **não executam** — o GitHub só
lê `.github/workflows/`. Para reativar um, faça `git mv` de volta e remova a
linha correspondente.

Cada lote/agente usa a **sua própria seção** (evita conflito de merge entre
PRs que aposentam workflows em paralelo).

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
