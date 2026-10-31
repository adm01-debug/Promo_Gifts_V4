# Revalidação da Onda 0 do P200 — 2026-10-30

## Escopo e regra de evidência

Revalidação read-only das etapas P200-E001–E010 do plano
[`PLANO_MELHORIAS_CORRECOES_200_ETAPAS_2026-10-18.md`](../plans/PLANO_MELHORIAS_CORRECOES_200_ETAPAS_2026-10-18.md).
Referência remota: `main@9541666bf62883b06117b03cae0368b2c7d55314`.
Consulta do GitHub em 2026-10-30 (UTC). Não houve consulta ou alteração do
Supabase canônico, troca de segredos, alteração de regras do GitHub, deploy ou
execução de migration.

Um checkmark no plano ou no script local não substitui a saída definida em
`Pronto:`. Estados abaixo distinguem código presente, evidência atual e ações
que dependem do proprietário do projeto (PO).

## Resultado por etapa

| Etapa | Estado revalidado | Evidência e próximo passo |
|---|---|---|
| E001 — rotação da `service_role` | **Bloqueada pelo PO** | Não há confirmação escrita nem registro de rotação em `docs/ci/SEGREDOS.md` (`rotacionada em 2026-10`). O repositório não permite provar rotação. O PO deve rotacionar no painel e atualizar os segredos dependentes; nenhum valor de segredo foi consultado. |
| E002 — remover literal dos scripts | **Código verificado; rotação não comprovada** | Busca local/remota nos dois scripts de `scripts/kit-enrichment/` não encontrou JWT literal; os scripts referenciam `SUPABASE_SERVICE_ROLE_KEY`. Isso não prova que a chave exposta foi invalidada (E001) nem cobre o teste de variável ausente descrito em `Pronto:`. |
| E003 — ativar regras padrão do Gitleaks | **Parcial** | `.gitleaks.toml` contém `useDefault = true`. Não foi obtida nesta revalidação evidência de execução do scanner no histórico completo antes/depois do ajuste; não marcar a etapa como fechada apenas pela configuração. |
| E004 — estabilizar Gate 3 E2E Smoke | **Parcial; critério de duas PRs verdes não atendido** | Gate Final da `main` passou em [run #41115240969](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41115240969). No PR [#2839](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2839), a execução mais recente do Deploy Gates, [run #41126957278](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41126957278), ainda estava em andamento na consulta. O critério de dois runs recentes de PR concluídos com sucesso permanece aberto. |
| E005 — bypass de admin no ruleset | **Bloqueada pelo PO** | O ruleset `16764622` ainda tem bypass actor e exige zero aprovações. Um segundo ruleset (`24121385`) também está ativo. A alteração de configuração precisa ser feita pelo PO; não houve mudança de proteção. |
| E006 — proteção clássica órfã | **Bloqueada pelo PO** | A proteção clássica de `main` segue ativa e há dois rulesets ativos. A configuração não atende ao critério do plano de remover a proteção clássica e manter um único ruleset. Nenhuma configuração foi alterada. |
| E007 — Gate E23 falhar quando faltar segredo exigido | **Pendente em PR** | Na `main`, o reusable `_secrets-check.yml` ainda é chamado sem `fail_if_missing: true`. A correção está proposta no PR #2839, mas ainda não foi incorporada à `main` nem validada por execução concluída nesse SHA. |
| E008 — comparação live de policies RLS | **Pendente em PR** | Na `main`, `deploy-gates.yml` executa `check-policies-baseline.mjs` sem `--require-live`; o modo `static-pass` continua possível. A correção está proposta no PR #2839. Não houve consulta ao banco nesta auditoria. |
| E009 — regra de governança de PR | **Parcial** | `CLAUDE.md`/`AGENTS.md` exigem PR para mudanças críticas, mas ainda descrevem o push como encerramento da sessão e não limitam push direto em `main` à reversão de incidente com postmortem. O texto não satisfaz integralmente a regra proposta no P200. |
| E010 — `plan:status` | **Parcial; saída não é prova executável** | `scripts/plan-status.mjs` classifica o status a partir de checkmarks nos títulos; não executa nem valida os comandos `Pronto:`. Assim, o placar exibido não prova que os critérios passaram. O pipe `npm run plan:status -- --json | jq …` falha ao interpretar o JSON porque o cabeçalho do npm também vai para stdout; a invocação direta via `node scripts/plan-status.mjs --json` produz JSON parseável, mas continua sendo um placar autodeclarado. |

## Portão da Onda 0

**A Onda 0 não está fechada.** E001, E005 e E006 dependem de ação administrativa
do PO; E004 ainda não possui os dois runs de PR exigidos; E007/E008 estão em PR,
não na `main`; E003, E009 e E010 requerem prova ou correção. Portanto, o placar
de etapas marcadas com checkmark não deve liberar ondas seguintes.

## Próximas ações seguras

1. Aguardar conclusão dos checks do PR #2839 e revisar a diferença após o merge,
   se aprovado; confirmar então E007/E008 na `main`.
2. O PO trata E001, E005 e E006 no painel/conta e registra a evidência, sem
   compartilhar valores de segredos.
3. Obter duas execuções recentes de Gate 3 em PR com sucesso para E004.
4. Corrigir o contrato do `plan:status` para não representar checkmarks como
   critérios validados; executar apenas verificações explicitamente allowlisted e
   somente de leitura, sem avaliar shell arbitrário embutido nos documentos.
5. Atualizar E009 por PR, mantendo `CLAUDE.md` e `AGENTS.md` sincronizados.

## Limitações

Esta revalidação cobre somente o portão inicial P200. Não certifica a conclusão
das demais 190 etapas, a paridade do schema/ledger vivo, a segurança efetiva dos
segredos, a saúde de produção ou o estado de todas as funcionalidades do
backlog.
