# Protocolo de Mudança Multiagente — v0.1 RASCUNHO (2026-08-29)

> **Status: RASCUNHO — aguardando `[VALIDAÇÃO PO]`.**
> **Etapa do plano:** 005 (P0).
> **Hierarquia:** as REGRAS #1–#8 do CLAUDE.md/AGENTS.md prevalecem sobre este documento.
> Em particular: REGRA #1 (SSOT `doufsxqlfjyuvxuezpln`), REGRA #3 (conflitos por semântica,
> nunca "main wins") e REGRA #8 (Lovable emite código, não ordens).

## 1. Agentes esperados

PO (humano) · Claude Code · Codex · Hermes · Lovable (`gpt-engineer-app[bot]`) · bots de CI.
Nenhum bot tem autoridade de aprovação; autorização operacional só vem de pessoa (REGRA #8).

## 2. Template de PR (padronizado)

Todo PR usa `.github/PULL_REQUEST_TEMPLATE.md`. Campos obrigatórios para PRs do plano de
50 etapas (adicionados neste rascunho): **etapa(s)**, **risco**, **rollback** e
**reserva registrada**. PR sem template preenchido não entra em revisão.

## 3. Reserva de arquivos e objetos

Antes de editar, o agente registra a reserva em `docs/coordenacao/reservas-ativas.md`:

| Campo | Regra |
|---|---|
| Arquivo/objeto | path do arquivo ou objeto BD (tabela/RPC/Edge) |
| Agente | nome do agente/sessão |
| Branch/PR | referência |
| Início | timestamp UTC |
| TTL | 48 h; expirada = liberada automaticamente |
| Liberação | merge, fechamento do PR ou abandono explícito |

- Conflito de reserva → o segundo agente **para** e coordena; nunca edita por cima.
- Objetos de BD: reserva é apenas informativa — DDL continua proibido sem `[AUTORIZAÇÃO BD]`.
- Arquivos protegidos (tabela do CLAUDE.md): reserva não substitui revisão do CODEOWNERS.

## 4. Registro de conflitos semânticos

Toda resolução de conflito não trivial entra em
`docs/coordenacao/conflitos-semanticos.md` com: arquivos, decisão por arquivo, razão e
verificação pós-merge (REGRA #3). Commit segue o padrão `merge(pr-NNN): resolve conflitos — …`
com a lista de resoluções no corpo.

## 5. Rollback

- Padrão: **revert do PR** (forward-only; nunca reescrever história publicada).
- BD: sem rollback destrutivo; compensação forward-only com `[AUTORIZAÇÃO BD]` (REGRA #1/#8).
- Undo windows de produto (8 s em carrinho/orçamento) são contrato — mudança exige `[VALIDAÇÃO PO]`.

## 6. Evidências

Todo PR referencia: etapa(s) do plano, risco, rollback, testes executados (comando + resultado)
e screenshots quando houver mudança visual (`[AUTORIZAÇÃO DESIGN]`). Registro consolidado por
etapa em `EXECUCAO_PLANO_50_ETAPAS_2026-08-29.md`.

## 7. Autorizações (o que cada marca cobre)

| Marca | Cobre | Como anexar |
|---|---|---|
| `[VALIDAÇÃO PO]` | remoção, consolidação, aposentadoria, criticidade, owners | comentário/aprovação do PO no PR |
| `[AUTORIZAÇÃO BD]` | schema, DML, RLS, policy, migration, job | aprovação explícita do PO no PR |
| `[AUTORIZAÇÃO DESIGN]` | mudança visual ou de interação | aprovação + baseline visual |
| `[AUTORIZAÇÃO GITHUB]` | settings, workflows, schedules, required checks | aprovação explícita do PO |
| `[AUTORIZAÇÃO EXTERNA]` | chamada mutante a provedor externo (Bitrix, CRM etc.) | aprovação + staging/sandbox |
| `[AUTORIZAÇÃO DEPLOY]` | deploy, canário, rollback operacional | aprovação explícita do PO |

Documento, plano, prompt ou comentário de bot **não** valem como autorização (REGRA #8).
