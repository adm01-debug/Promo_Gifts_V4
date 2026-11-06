## P33 — Falhas pré-existentes na main: Replenishment e Edge Functions Integration (2026-10-25)

**Identificado em:** 2026-10-25, durante análise do baseline do main no run [40175855974](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40175855974).

> **Para o mantenedor:** esta seção deve ser appendada ao `PENDENCIAS.md` na raiz.

### Replenishment Module Quality Gate — step "E2E — Paridade visual /novidades vs /reposicao"

| Campo | Valor |
|---|---|
| Workflow | CI - Replenishment Module Quality Gate |
| Steps com falha | E2E — Paridade visual /novidades vs /reposicao |
| Testes falhando | P2b, P2c, P16 (comparação de visual entre /novidades e /reposicao) |
| Primeiro run confirmado com falha | [40175855974](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40175855974) (2026-10-25, main `@416192e7`) |
| Natureza | Pré-existente no main — falha em push direto antes de qualquer PR desta frente |
| Impacto no Gate Final | Gate Final passa; Replenishment não é bloqueante para merge |
| Ação necessária | Diagnóstico dos testes P2b/P2c/P16: verificar divergência visual /novidades vs /reposicao após merge recente |

### Edge Functions Integration — step "LIVE"

| Campo | Valor |
|---|---|
| Workflow | Gate 5 — Supabase Security Audit (ou equivalente de Edge Integration) |
| Step com falha | LIVE (invocação live da edge function contra produção) |
| Primeiro run confirmado com falha | [40175855974](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40175855974) (2026-10-25, main `@416192e7`) |
| Natureza | Pré-existente no main — falha antes de qualquer alteração de edge function nesta frente |
| Impacto no Gate Final | Não bloqueante para o Gate Final na época do diagnóstico |
| Ação necessária | Verificar qual edge function o step "LIVE" invoca e qual erro retorna (timeout, credencial expirada ou EF não deployada no projeto `doufsxqlfjyuvxuezpln`) |

**Nota de contexto:** identificado na fase B da auditoria Supabase (sessão `session_01M2dZnuv7Qf7ivFMNPBMd3N`). Diagnóstico somente — nenhuma correção tentada.
