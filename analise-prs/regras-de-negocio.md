# Regras de Negócio — Promo Gifts V4

**Gerado por:** sessão `session_01VXkRxWq5ZUCmvuNx5e2TGX`
**Data:** 2026-11-09
**Branch:** `claude_pink/sleepy-cannon-h000nc` (PR #2674)

Este documento registra as regras de negócio identificadas durante a análise exaustiva das PRs abertas no repositório `adm01-debug/Promo_Gifts_V4`. Cada regra foi inferida das mudanças propostas nas PRs analisadas, confirmadas em produção via Supabase `doufsxqlfjyuvxuezpln` ou código-fonte.

---

## 1. Kit Builder — Backup e Restore

**PRs referência:** #3305, #3321, #3339

**Regra:** Ao editar um kit no Kit Builder, todas as alterações em andamento devem ser persistidas em backup antes de o usuário sair da página (`beforeunload`). O backup completo inclui: composição atual, itens selecionados, configurações de personalização, e estado do formulário.

**Comportamento esperado:**
- `beforeunload` → salva backup no localStorage com timestamp
- Ao retornar à página → detecta backup disponível e oferece restore
- Restore restaura exatamente o estado no ponto do backup

**Regressão conhecida:** PR #3305 introduziu `checkedBackupRef` duplicado; PR #3321 (DRAFT) corrige.

**Evidência em produção:** N/A — funcionalidade nova (feature, não fix de bug existente).

---

## 2. Kit Builder — Confirmação ao Aplicar Composição IA

**PRs referência:** #3306

**Regra:** Quando o usuário aplica uma composição sugerida pela IA no Kit Builder, o sistema deve exibir um diálogo de confirmação antes de substituir a composição atual. O diálogo deve mostrar:
- O nome da composição que será substituída
- O número de itens na composição nova vs. atual
- Botões "Cancelar" e "Confirmar"

**Comportamento esperado:** Sem confirmação explícita, a composição atual NÃO é substituída.

---

## 3. Catálogo Supabase — Registro de Objetos Canônicos

**PRs referência:** #3335, #3265, #3264, #3263, #3340 (mergeada)

**Regra:** Todo objeto de banco de dados (`function`, `view`, `cron job`) que existe em produção (`doufsxqlfjyuvxuezpln`) e é referenciado por código da aplicação DEVE ter entrada no catálogo de referências Supabase. O Gate 1.3 (`check-migration-path-references.mjs`) valida isso em CI.

**Objetos confirmados em produção:**
- `fn_check_item_fits` (RPC, confirmado `doufsxqlfjyuvxuezpln` em 2026-11-09) — registrado via #3340
- `vw_products_min_quantity` (view, confirmado `doufsxqlfjyuvxuezpln` em 2026-11-09) — registrado via #3340
- Objetos Kit Builder adicionais (`fn_validate_kit_composition`, etc.) — pendentes (#3335)

---

## 4. Migration Versioning — DRIFT Mirrors

**PRs referência:** #3273, #3261, #3284, #3243

**Regra:** Toda DDL aplicada fora do fluxo normal de migration (via MCP, dashboard, emergência) deve ter uma migration espelho correspondente em `supabase/migrations/` com o timestamp da aplicação real. O ledger `supabase_migrations.schema_migrations` deve ser atualizado via `migration repair --status applied <version>`.

**Restrição:** A migration espelho NÃO é reaplicada em produção — ela só registra o objeto já criado. O campo `mode: repair-only` indica isso no preflight.

**Objetos com drift identificados:**
- Índices das tabelas `categories` (3 índices out-of-band)
- Cron jobs CRON-001 (`process_magazine_cache_cleanup`, etc.)

---

## 5. Cron Jobs — Escalonamento de Startup

**PRs referência:** #3279, #3214

**Regra:** Cron jobs que rodam no mesmo minuto causam colisão de startup, aumentando latência e risco de deadlock. A regra é escalonar jobs similares com offset de 2-5 minutos entre si.

**Jobs CRON-001 afetados:**
- `process_magazine_cache_cleanup`
- `process_cron_cleanup_old_snapshots`
- `send_scheduled_reports_cron`
- `process_stock_snapshot_creation`

**Escalonamento proposto:** Cada job recebe offset de +2min em relação ao anterior no mesmo slot.

---

## 6. RLS — Restrição de Acesso a Art Files

**PRs referência:** #3256 (DRAFT)

**Regra:** A política RLS pública no bucket `art-files` deve ser restrita ao path `quotes/`. Arquivos fora desse path não devem ser acessíveis anonimamente. Atualmente a política é demasiado ampla.

**Impacto:** Restrição de segurança — reduz superfície de ataque sem impactar funcionalidade (arquivos de arte de orçamentos estão todos em `quotes/`).

---

## 7. Índices de Performance

**PRs referência:** #3250, #3273

**Regra:** A tabela `stock_daily_summary` precisa de índice em `summary_date` para performance de queries de dashboard. A ausência do índice causa full scan em tabela com volume crescente.

**Tabelas com índices out-of-band registrados:**
- `categories.level` (3 índices)
- `stock_daily_summary.summary_date`

---

## 8. Ratchets de Qualidade — Baselines Semanais

**PRs referência:** #3325

**Regra:** Os ratchets de qualidade do CI (Gate 1.9: TODO/FIXME/`as any`, Gate 1.10: indexed-access) são atualizados semanalmente via PR `chore/ratchet-lower-*`. Um PR de ratchet que reduza os baselines (melhoria) é sempre seguro de mergear se o Gate Final estiver verde.

**Frequência:** Semanal (segunda-feira), gerado automaticamente pelo job `ci-metrics/`.

---

## 9. Release — Versão 1.9.0

**PRs referência:** #3210

**Regra:** A PR de release `release-please--branches--main--components--gifts-store` é gerada automaticamente pelo Release Please bot. Ela acumula todas as mudanças desde o último release e deve ser mergeada apenas com aprovação explícita do PO (Joaquim). O merge triggera criação de tag e release notes automáticas.

**Estado atual:** PR #3210 acumula mudanças de múltiplas sessões. Requer revisão manual antes do merge.

---

## 10. E2E — Pressão de Runners

**PRs referência:** #3127, #3129, #3137, #3099

**Regra:** O CI Playwright (Gate 3) usa runners GitHub-hosted. Para reduzir pressão, shards de E2E devem ser reduzidos ou reorganizados sem eliminar cobertura de smoke tests críticos. PRs do agente Codex propõem redução de shards; PR #3099 do Claude corrige 3 smoke tests falhando.

**Ordem de dependência:** #3099 (fix smoke) → #3127/#3129 (infraestrutura E2E) → #3137 (detector E2E). As PRs devem ser mergeadas nessa ordem ou com rebase.

---

## Resumo — Regras por Prioridade de Negócio

| # | Regra | Impacto | PRs |
|---|---|---|
|---|
| 1 | Catálogo Supabase atualizado | CI Gate 1.3 passa | #3335, #3265, #3264, #3263 |
| 2 | Kit Builder backup/restore | UX — não perde trabalho | #3305, #3321, #3306 |
| 3 | DRIFT mirrors em sinc | Govermança DB | #3273, #3261, #3243, #3284 |
| 4 | RLS art-files restrita | Segurança | #3256 |
| 5 | Cron jobs escalonados | Performance/estabilidade | #3279, #3214 |
| 6 | Índices de perf | Velocidade dashboard | #3250, #3273 |
| 7 | Ratchets semanais | Qualidade de código | #3325 |
| 8 | Release 1.9.0 | Deploy de features | #3210 |
| 9 | E2E CI estabilizado | CI confiável | #3099, #3127, #3129, #3137 |
