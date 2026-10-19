# Postmortem — Merge cross-agente sem PR (2026-08-31)

**Status:** Encerrado  
**Severidade:** SEV-3 (violação de processo; sem downtime)  
**Detectado:** 2026-08-31 (revisão de log pós-merge)  
**Resolvido:** REGRA #10 e sentinel adicionados em E189

---

## Resumo

Em 2026-08-31, dois commits (`9ffb69651`, `bd59a447d`) realizaram merge direto entre branches
de agentes diferentes (prefixo `claude/*` → `codex/*`) sem abrir Pull Request. Isso bypassa
a revisão obrigatória e o rastreio de conflitos semânticos entre agentes, representando risco
de regressão silenciosa.

## Timeline

| Data | Evento |
|---|---|
| 2026-08-31 | Commit `9ffb69651`: merge direto de branch `claude/*` em `codex/*` |
| 2026-08-31 | Commit `bd59a447d`: segundo merge cross-agente sem PR |
| 2026-08-31 | Revisão de log detecta o problema |
| 2026-10-18 | REGRA #10 formalizada no CLAUDE.md (E189) |
| 2026-10-18 | `scripts/sentinel-check.sh` atualizado para bloquear merge cross-agente sem PR |

## Causa raiz

Ausência de regra formal que proibisse merge direto entre branches de agentes distintos.
Com 6 agentes escrevendo no repositório (Claude, Codex, Devin, Lovable, github-actions, cline),
a probabilidade de conflitos semânticos não revisados é alta.

## Impacto

- Sem downtime confirmado — os dois merges não introduziram regressão detectada
- Resolução de possíveis conflitos ficou não rastreada
- Ausência de PR impediu revisão por `@adm01-debug` (CODEOWNERS)

## Ação corretiva

1. Revisão manual dos dois commits para verificar ausência de regressão
2. REGRA #10 adicionada ao CLAUDE.md em E189
3. `scripts/sentinel-check.sh` Regra 8 bloqueia merge commit com X e Y de prefixos de agentes diferentes

## Prevenção (gates, regras)

- **CLAUDE.md REGRA #10** (E189): merge cross-agente SEMPRE exige PR
- **Sentinel (scripts/sentinel-check.sh Regra 8)**: recusa automaticamente merge commits com subject `Merge branch 'X' into 'Y'` onde X e Y têm prefixos de agentes diferentes
- **Gate 1.18** (`deploy-gates.yml`): ledger de conflitos semânticos — PRs de agentes diferentes bloqueados sem aprovação
- Toda resolução não trivial deve ser registrada em `docs/coordenacao/conflitos-semanticos.md`
