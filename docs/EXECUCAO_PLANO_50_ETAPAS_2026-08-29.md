# Execução do Plano de 50 Etapas — Registro Vivo (2026-08-29)

> Plano-fonte: `PLANO_PENDENCIAS_CORRECOES_MELHORIAS_50_ETAPAS_2026-08-29.md`.
> Status: 🔵 rascunho em validação PO · ⬜ pendente · ⛔ bloqueado (gate explícito) · ✅ concluído.
> Regra: nenhum `[AUTORIZAÇÃO *]`/`[VALIDAÇÃO PO]` é dispensado sem aprovação registrada do PO.

**Entrega da Onda 1:** PR #1806 (rascunho) — branch `codex/actions-gates-20260829`, commits `87028e01a` +
`96ddc6834` (2026-08-30). Aguardando `[VALIDAÇÃO PO]` dos 12 itens pendentes da matriz 001 antes de sair de rascunho.

## Onda 1 — Governança (001–005)

| Etapa | Título (resumo) | Status | Evidência | Gate pendente |
|---|---|---|---|---|
| 001 | Matriz de fluxos críticos | 🔵 | `MATRIZ_FLUXOS_CRITICOS_2026-08-29.md` (v0.2) | `[VALIDAÇÃO PO]` linha a linha |
| 002 | Mapa rota → dados → teste | 🔵 | `MAPA_ROTA_DADOS_TESTE_2026-08-29.md` | `[VALIDAÇÃO PO]` + scanners (013) |
| 003 | Ownership por domínio | 🔵 | `OWNERSHIP_DOMINIOS_2026-08-29.md` | `[VALIDAÇÃO PO]` + `[AUTORIZAÇÃO GITHUB]` p/ CODEOWNERS |
| 004 | Readiness/lifecycle | 🔵 | `READINESS_LIFECYCLE_FEATURES_2026-08-29.md` | `[VALIDAÇÃO PO]` |
| 005 | Protocolo multiagente | 🔵 | `PROTOCOLO_MULTIAGENTE_2026-08-29.md` + ledgers em `coordenacao/` + template PR | `[VALIDAÇÃO PO]` |

## Onda 2 — Sinal de engenharia (006–015)

| Etapa | Resumo | Status | Observação |
|---|---|---|---|
| 006 | Baseline `npm run test` verde | ⬜ | executável localmente |
| 007 | Baseline typecheck/lint | ⬜ | executável localmente |
| 008 | CI: gates obrigatórios alinhados | ⛔ | `[AUTORIZAÇÃO GITHUB]` (settings/required checks) |
| 009 | Branch protection real | ⛔ | `[AUTORIZAÇÃO GITHUB]` |
| 010 | Secrets/variáveis de CI auditadas | ⛔ | `[AUTORIZAÇÃO GITHUB]` + acesso a settings |
| 011–015 | Cobertura E2E/contract das lacunas do mapa 002 | ⬜ | derivam das lacunas registradas no mapa |

## Onda 3 — Código sem DDL (016–030)

| Etapa | Resumo | Status | Observação |
|---|---|---|---|
| 016 | Redução de `as any` com ratchet | ⬜ | executável localmente (Fase 3) |
| 017–020 | Supressões TS/ESLint, anti-drift, contratos de integrações, observabilidade (`request_id`) | ⬜ | executável localmente |
| 021 | Decisão do produto `simulation-orchestrator` | ⛔ | `[VALIDAÇÃO PO]` |
| 022/028/029 | Contrato da simulação sem DDL; isolar/formalizar `e2e_cleanup_audit`; storage/lifecycle Bitrix | ⬜/⛔ | 029 exige `[AUTORIZAÇÃO EXTERNA]`/`[AUTORIZAÇÃO BD]`; kit é 032/037 (Onda 4) |
| 023–027, 030 | persistência da simulação, `runAuthAudit`, diagnóstico auth, `stock_notes`, desconto no canônico | ⬜/⛔ | gates `[AUTORIZAÇÃO BD]`/`[AUTORIZAÇÃO DEPLOY]`/`[VALIDAÇÃO PO]` conforme plano-fonte |

## Onda 4 — Produto/staging (031–040)

⛔ Todas bloqueadas: exigem staging real, `[AUTORIZAÇÃO EXTERNA]` (Bitrix/CRM sandbox) e/ou
`[AUTORIZAÇÃO DEPLOY]`. Teste sem segredo real = bloqueado, nunca "verde" falso.

Rastreio kit (referenciado pela matriz 001 e pelo READINESS 004): **032** — tornar o kit builder
fail-explicit (`MOCK_BOXES/MOCK_ITEMS` sob flag desligada; libera só após 037 + `[AUTORIZAÇÃO DESIGN]`);
**037** — provar kits ponta a ponta em staging.

## Onda 5 — BD/histórico (041–048)

⛔ Todas bloqueadas: `[AUTORIZAÇÃO BD]` obrigatória. Permitido sem autorização: apenas inventários
**read-only via `pg_catalog`** (REGRA #8 corolário), após prova de identidade do projeto
(SSOT `doufsxqlfjyuvxuezpln`).

## Onda 6 — Release (049–050)

⛔ Bloqueadas: `[AUTORIZAÇÃO DEPLOY]` + evidências das ondas anteriores.

## Modelo de registro por etapa (preencher a cada execução)

```text
Etapa: <NNN> — <título>
Data/agente: <UTC> / <agente>
Mudança: <o que foi feito>
Risco: <baixo/médio/alto + por quê>

## Registros de execução (dogfooding do modelo)

```text
Etapa: 001–005 — remediação pós-auditoria dos rascunhos (simulação validada antes de editar)
Data/agente: 2026-08-30 / Codex (worktree codex/actions-gates-20260829)
Mudança: correções cirúrgicas em MATRIZ (evidências do fluxo 5 reais; fluxo 6 "em main desde
  jun/2026, fb0131782"; §4 kit 032/037), MAPA (catch-all: smoke=3 testes e lacuna de spec 404;
  refs de orçamento → wave1 SQL/04b/concurrency guard; I-1 com contexto da Onda 9 — descontinuação
  PO 07/mai/2026, 5 edges inexistentes, specs mockadas), READINESS (5 flags sem consumidor:
  +advanced_analytics, +voice_commands; §3 edges pós-Onda 9; desconto em main), OWNERSHIP
  (107 funções + convenção de contagem) e este registro (017–020, 021, 022/028/029, 023–027/030
  alinhados ao plano-fonte; kit 032/037 na Onda 4; commits da Onda 1).
  Item cancelado como falso positivo: "47→50 rotas" — route-matrix.ts tem exatamente 47 rotas.
Risco: baixo — docs-only; zero código/schema/workflow/settings.
Rollback: git revert do commit desta remediação (HEAD da branch no PR #1806).
Evidência: PR #1806; verificações locais por ls/grep/sed sobre o worktree; 12 itens da simulação —
  11 aplicados, 1 cancelado com justificativa.
Autorizações: nenhuma necessária (docs-only). CI com checks parados por budget de Actions (causa
  raiz registrada pelo PO no PR #1806) — sem re-run até normalização do ciclo de cobrança.
```

Rollback: <como reverter>
Evidência: <links de PR, comandos, resultados>
Autorizações: <marcas anexadas ou "nenhuma necessária">
```
