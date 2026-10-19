# Plano de pendências, correções e melhorias — 50 etapas

- **Data:** 29 de agosto de 2026
- **Projeto:** Promo Gifts V4
- **Branch de elaboração:** `codex/actions-gates-20260829`
- **Baseline documental:** `0a610903e6321e5f98250d664f3adc2d2c080a6f`
- **Supabase canônico protegido:** `doufsxqlfjyuvxuezpln`
- **Origem:** itens ainda parciais, dependentes ou pendentes do plano de 100 etapas
- **Escopo:** planejamento; este documento não autoriza DDL, deploy, exclusão, mudança de design, configuração externa ou mutação do banco canônico

## Objetivo e estado de partida

Este plano substitui a lista de pendências dispersas por uma sequência executiva de
**50 etapas abertas**. Ele não reabre as 42 etapas já comprovadamente concluídas.
Cada etapa abaixo consolida um ou mais critérios ainda incompletos do plano anterior,
sem converter implementação parcial em conclusão.

Estado herdado da reconciliação de 29/08/2026:

| Estado do plano anterior | Quantidade | Tratamento neste plano |
|---|---:|---|
| Concluídas | 42 | Não repetidas, exceto como pré-requisito já satisfeito |
| Parciais | 42 | Reagrupadas em entregas fecháveis e testáveis |
| Dependências externas/decisões | 15 | Mantidas com autorização explícita e alternativa local segura |
| Pendente de release | 1 | Decomposta nos gates finais 049–050 |

Todos os checkboxes começam abertos porque representam o **aceite restante**, ainda
que parte do código, inventário ou teste já exista.

| Prioridade | Quantidade | Regra de tratamento |
|---|---:|---|
| P0 | 23 | bloqueia release, segurança, integridade, isolamento ou sinal de CI |
| P1 | 26 | necessária para completar feature, contrato, auditoria ou jornada |
| P2 | 1 | dívida controlada que não pode crescer enquanto aguarda o lote correto |

## Revisão exaustiva de implementação — 30/08/2026

Esta revisão confrontou cada critério de aceite com quatro fontes independentes:

1. `origin/main` em `7ea9b5870a641042a955f380a1b90fa00f155eac`;
2. PRs técnicos #1803, #1804 e #1805, todos mergeados, e o PR documental
   #1806, aberto, cuja baseline auditada era `4d3ab77b3f4f53b91fc064d4c84713a6d83e3ed5`;
3. GitHub Actions, ruleset, Dependabot e Vercel observados remotamente;
4. Supabase canônico consultado pela Management API **read-only**, autenticada para
   `doufsxqlfjyuvxuezpln`, com PostgreSQL 17.6 e usuário
   `supabase_read_only_user`.

O Graphify foi usado apenas para navegação porque seu grafo antecede as mudanças
mais recentes. Nenhuma conclusão abaixo depende exclusivamente dele. O MCP
`supabase_producao` respondeu `401` na Management API e o MCP
`supabase_canonico_selfhosted` apontou para outro PostgreSQL 15; ambos foram
descartados como fonte canônica nesta rodada.

### Veredito quantitativo

| Estado de aceite das 50 etapas | Quantidade | Interpretação |
|---|---:|---|
| ✅ Concluída | **0** | nenhum critério integral novo ficou comprovado depois da criação deste plano |
| 🟡 Parcial | **34** | há código, teste, inventário ou rascunho, mas falta parte objetiva do aceite |
| ⬜ Não iniciada | **4** | não existe entrega correspondente ao critério restante |
| ⛔ Bloqueada | **11** | depende de decisão, autorização ou ambiente externo ainda ausente |
| ⚙️ Condicional não acionada | **1** | a etapa 023 só deve existir se persistência de simulação for aprovada |
| **Total** | **50** | todos os checkboxes permanecem abertos |

O resultado **não significa que nada foi feito**. As migrations e as Edge Functions
críticas estão implantadas, e os testes locais de banco passam. Significa que o
plano foi corretamente escrito como trabalho de aceite restante: implementação
parcial, deploy estrutural ou teste mockado não encerram uma etapa mais ampla.

### Matriz de rastreabilidade etapa por etapa

| Etapa | Estado | Implementado e comprovado | Falta para o aceite integral |
|---:|:---:|---|---|
| 001 | 🟡 | matriz v0.2 no PR #1806 | aprovação dos 12 fluxos pelo PO |
| 002 | 🟡 | mapa rota→dados→teste em rascunho | owners, dependências dinâmicas e 100% das rotas validadas |
| 003 | 🟡 | mapa de 14 domínios | owners/substitutos reais e CODEOWNERS autorizado |
| 004 | 🟡 | readiness v0.1 e cinco flags sem consumidor identificadas | lifecycle, owner, prazo e aceite nominal por feature/job/Edge |
| 005 | 🟡 | protocolo, ledgers e template de PR | validação do PO e uso comprovado em PR de código concorrente |
| 006 | ⬜ | falhas atuais foram diagnosticadas pontualmente | painel causal histórico completo com recorrência, owner e links |
| 007 | ⬜ | workflows possuem gates e metadados dispersos | catálogo dos 107 workflows e decisão nominal sobre redundância/`continue-on-error` |
| 008 | ⛔ | `Gate Final - Deploy Ready` existe no workflow | ruleset `Protect main` não exige status checks; falta autorização e teste de bloqueio |
| 009 | ⛔ | integração Vercel responde ao PR | preview do PR #1806 falhou antes do build; falta corrigir acesso/configuração externa |
| 010 | 🟡 | CodeQL e Gitleaks passaram no PR | dois alertas Dependabot altos de `image-size` continuam abertos |
| 011 | 🟡 | fixtures de carrinho, desconto, estoque e orçamento existem | dataset unificado, idempotente e anonimizado para todos os fluxos críticos |
| 012 | 🟡 | há 33 specs visuais e baselines de dialogs | cobertura da matriz 001 e shard 2/2 verde; hoje há 1 falha e 9 flakes |
| 013 | 🟡 | existem testes visuais, funcionais e a11y | mesma fixture/matriz por fluxo, viewport e navegador sem setups contraditórios |
| 014 | 🟡 | core hermético e fuzz dry-run passam | contratos Edge falham e testes live/autenticados ainda ficam `skipped` |
| 015 | 🟡 | rollback web e snapshots de schema documentados | restore real cronometrado de dados em PG17, RTO/RPO e rollback Edge |
| 016 | 🟡 | saldo produtivo caiu de 54 para 1 `as any`; ratchet passa | fechar a revisão dos 54 casos originais e provar contratos de todos os lotes |
| 017 | 🟡 | TS está em 0 erros e lint em 0/0 | classificar 177 `eslint-disable` e a supressão TS restante com owner/expiração |
| 018 | 🟡 | scanners de any, request-id, ACL e contratos existem | scanner de contratos ainda reporta oito Edge Functions sem registro; gate `lint-untyped-from` é consultivo |
| 019 | 🟡 | envelopes, Zod, HMAC e testes focais cobrem integrações importantes | oito contratos faltantes e smoke HTTP atual com 11 falhas/133 cenários |
| 020 | 🟡 | `request_id` está coberto em 17 edges críticas | provar uma jornada UI→Edge→RPC/outbox→provedor por um único ID |
| 021 | 🟡 | função implantada é efêmera e fail-closed | ADR vigente ainda descreve persistência e “não implantado”; falta decisão de produto aprovada |
| 022 | 🟡 | AAL2, quatro outcomes, 424 e zero rede para alvos bloqueados passam em teste | sucesso/rejeição/replay/segredo inválido/timeout em sandbox autorizado |
| 023 | ⚙️ | alternativa efêmera existe e não cria tabelas | somente preparar SQL se o PO trocar a decisão para persistente |
| 024 | ⛔ | `runAuthAudit` foi provado dormente e fail-soft | decisão nominal de ligar, adaptar ou aposentar |
| 025 | ⛔ | RPC histórica e revogação estão inventariadas | depende da 024 e, se mantida, de contrato/AAL/grants/migration autorizados |
| 026 | ⛔ | hook `useStockNotes` e ausência live de `stock_notes` confirmados | decisão funcional do PO |
| 027 | ⛔ | consumidores potenciais foram localizados | depende da 026 e de autorização nominal para criar ou remover |
| 028 | 🟡 | Edge `e2e-cleanup` e referência à tabela foram caracterizadas | `e2e_cleanup_audit` segue ausente no canônico e o contrato não foi isolado/formalizado |
| 029 | 🟡 | falso verde do Bitrix foi removido; deploy atual coincide com o repo | storage/retention/RLS/owner ainda não foram decididos; tabelas live ausentes |
| 030 | 🟡 | 13 migrations, RPCs, grants e quatro triggers diferidos existem no canônico; PG17 local passa | happy-path live autorizado, concorrência e prova de notificação única |
| 031 | 🟡 | freshness/confidence existem em campos específicos | provenance estrutural por campo e propagação uniforme em UI/exportações |
| 032 | ⬜ | persistência/autosave parcial existe | `handleSaveKit` continua vazio e falhas de catálogo ainda caem silenciosamente em `MOCK_*` |
| 033 | 🟡 | badges de freshness/confidence existem em alguns módulos | contrato global que separe dado real, estimativa e simulação |
| 034 | 🟡 | ampla cobertura local/mockada de orçamento | jornada repetível em staging com desconto, PDF, share e teardown reais |
| 035 | 🟡 | specs locais de magazine e reader existem | jornada staging multi-perfil, publicação e reação idempotente |
| 036 | 🟡 | testes locais/mockados de mockup existem | sandbox de provedor, compensação, custo e teardown em staging |
| 037 | 🟡 | specs e módulos de kit existem | staging dono/colaborador/público; a etapa 032 impede aceite |
| 038 | ⬜ | há testes RLS pontuais | não existe matriz executável 2 usuários × 2 organizações |
| 039 | ⛔ | dry-runs e descriptors existem | JWTs/segredos dedicados de staging; live fuzz do PR foi `skipped` |
| 040 | 🟡 | repo tem 107 funções; quatro deploys críticos foram comparados byte a byte | inventário completo repo×deploy×config com hash, caller, owner e último uso; MCP nominal falhou 401 |
| 041 | 🟡 | fotografia `pg_catalog` e relações vazias foram inventariadas | owner/lifecycle e dependências por coluna para todas as relações |
| 042 | 🟡 | 1.242→1.170 índices e candidatos foram levantados historicamente | janela representativa, planos, write cost, owner e rollback por candidato |
| 043 | 🟡 | lints/allowlists e grants da view de kits foram aplicados | matriz executável por papel; `fn_super_filtro` segue com EXECUTE para PUBLIC/anon |
| 044 | 🟡 | inventário e gates de ACL existem | revisão humana das atuais 535 `SECURITY DEFINER`; 10 anon, 72 authenticated e 1 PUBLIC |
| 045 | 🟡 | três jobs foram confirmados live | outbox e pipeline continuam inativos; vacuum ativo ainda sem causa/runbook final |
| 046 | 🟡 | manifesto local e ledger sanitizado existem; 13 migrations recentes estão live | reconciliar ledger atual completo, colisões/hashes/efeitos e obter revisão DBA |
| 047 | ⛔ | harnesses PG17 focais passam | replay integral depende do manifesto 046 aprovado |
| 048 | ⛔ | dump/referência/canônico foram comparados parcialmente | comparação pós-replay integral e classificação de todo delta |
| 049 | ⛔ | migrations aprovadas anteriormente chegaram ao canônico | esta etapa exige staging, allowlist nominal, canário e rollback para o lote restante |
| 050 | ⛔ | build/typecheck e a maioria dos checks passam | 6 checks remotos falham, 4 são skipped, Vercel falha, P0/P1 seguem abertos |

### Evidências novas que alteram a ordem de trabalho

- **Banco canônico atualizado estruturalmente:** as migrations
  `20260828141000`–`20260828141200` e `20260829110000`–`20260829123000`
  estão no ledger live. A view de kits possui `security_invoker=true`; as RPCs
  transacionais e os quatro triggers diferidos de desconto estão ativos.
- **Edges realmente implantadas:** downloads read-only de `webhook-inbound`,
  `simulation-orchestrator`, `migrate-helper` e `bitrix-sync` coincidem com os
  arquivos executáveis do repositório; as diferenças são testes não enviados e
  um comentário de documentação no logger compartilhado.
- **CI não está pronta para release:** o PR #1806 registra 70 sucessos, 6
  falhas, 4 skips e 1 neutral. As causas primárias são invocação Edge direta,
  corrida de criação do banco PG17 no runner, 11 cenários HTTP de contrato,
  regressão/flake visual e Vercel; `Gate Final` é falha derivada.
- **Ruleset insuficiente:** `Protect main` está ativo, mas possui somente delete,
  non-fast-forward e PR sem aprovações; nenhum required status check está
  configurado e o papel de administração possui bypass permanente.
- **Dívidas funcionais inequívocas:** `handleSaveKit` continua vazio;
  `stock_notes`, `simulation_*`, `e2e_cleanup_audit` e storage Bitrix continuam
  ausentes no canônico; isso é pendência/decisão, não autoriza DDL nem remoção.

### Ordem revisada de fechamento

1. Aprovar 001–005 e corrigir a documentação divergente da simulação.
2. Corrigir os quatro defeitos causais exercitáveis de CI: invocação direta,
   corrida PG17, contratos HTTP e seleção/estabilidade visual.
3. Revalidar Vercel e somente então configurar `Gate Final - Deploy Ready` como
   required check, com teste controlado do ruleset.
4. Fechar 016–020, 028–033 e o kit fail-explicit antes de declarar jornadas prontas.
5. Executar 034–040 em staging com credenciais dedicadas e matriz 2×2.
6. Atualizar o manifesto do ledger live e executar 041–048 sem qualquer mutação
   canônica até autorização nominal por objeto.
7. Manter 049–050 bloqueadas até todos os P0/P1 e skips obrigatórios estarem
   fechados.

## Regras invioláveis de execução

1. A worktree principal compartilhada não deve ser sobrescrita; cada agente trabalha
   em branch/worktree própria e reconcilia semanticamente mudanças concorrentes.
2. O Supabase `doufsxqlfjyuvxuezpln` permanece somente leitura até uma etapa indicar
   `[AUTORIZAÇÃO BD]` e o PO aprovar os objetos nominais.
3. Toda migration é forward-only. Nunca renomear, reordenar ou reescrever migration
   aplicada; correção posterior usa migration compensatória.
4. Nenhum arquivo, tabela, coluna, função, trigger, policy, job, view, índice, ativo ou
   histórico será apagado apenas por estar vazio, sem caller literal ou sem uso local.
5. Um teste ignorado por segredo ausente é `bloqueado/inconclusivo`, nunca `verde`.
6. Mudança visual requer baseline antes/depois e `[AUTORIZAÇÃO DESIGN]`.
7. Integração externa deve usar sandbox/dry-run; produção não é fixture de teste.
8. Cada PR informa IDs deste plano, arquivos tocados, contratos afetados, testes,
   risco, rollback, autorizações e alterações concorrentes incorporadas.

## Marcadores

| Marcador | Exigência |
|---|---|
| `[VALIDAÇÃO PO]` | decisão funcional, owner, lifecycle, consolidação ou exclusão |
| `[AUTORIZAÇÃO BD]` | schema, função, trigger, policy, grant, job ou dado no Supabase |
| `[AUTORIZAÇÃO GITHUB]` | ruleset, required checks, orçamento ou settings do GitHub |
| `[AUTORIZAÇÃO DESIGN]` | comportamento ou aparência perceptível |
| `[AUTORIZAÇÃO EXTERNA]` | Vercel, CRM, e-mail, webhook, IA, Storage ou provedor externo |
| `[AUTORIZAÇÃO DEPLOY]` | deploy, canário, rollback ou retirada remota |

## Ordem de execução e paralelismo seguro

| Onda | Etapas | Pode iniciar quando | Resultado esperado |
|---|---:|---|---|
| 0 — Governança | 001–005 | imediatamente | owners, prioridades e mapa de dependências aprovados |
| 1 — Sinal de engenharia | 006–015 | 001–003 definidos | CI confiável, fixtures e cobertura de regressão ampliadas |
| 2 — Código sem DDL | 016–030 | contratos e owners conhecidos | dívida reduzida e módulos parciais decididos/fail-explicit |
| 3 — Produto e staging | 031–040 | 004–005 e ambiente de teste | jornadas críticas e integrações provadas sem produção |
| 4 — Banco e histórico | 041–048 | inventário read-only e aprovação do manifesto | acesso auditado e banco descartável reproduzível |
| 5 — Fechamento | 049–050 | ondas anteriores e autorizações nominais | canário, limpeza aprovada e release candidate |

Dentro de uma onda, agentes podem trabalhar em paralelo somente quando não possuem
arquivos, objetos de banco ou contratos compartilhados. Alterações em `client.ts`,
`types.ts`, workflows centrais, migrations, tipos de produto e componentes UI comuns
devem ter owner único por vez.

---

## Tipo 1 — Governança, ownership e definição de sucesso

- [ ] **001 — Aprovar a matriz de fluxos críticos.** `P0` · Origem: 002/005.
  - **Execução:** classificar catálogo, busca, produto, carrinho, orçamento, desconto, estoque, mockup, magazine, kit, autenticação e CRM por criticidade, owner, dados e dependências externas.
  - **Aceite/evidência:** matriz `fluxo × persona × owner × criticidade × entrada × sucesso × falha × teste` aprovada pelo PO e versionada.
  - **Risco/controle:** divergência funcional entre agentes; congelar critérios por versão e registrar alterações posteriores. `[VALIDAÇÃO PO]`.

- [ ] **002 — Completar o mapa rota → dados → teste.** `P0` · Origem: 003/070/088.
  - **Execução:** para cada rota pública, autenticada e administrativa, ligar componente, hooks, serviços, `.from()`/`.rpc()`, Edge Functions, Storage, eventos externos e testes.
  - **Aceite/evidência:** 100% das rotas possuem owner e cadeia rastreável; dependência dinâmica ou externa é marcada, não inferida como ausente.
  - **Risco/controle:** wrappers e aliases escaparem da busca literal; cruzar AST/Graphify, scanners do projeto e inspeção manual focal.

- [ ] **003 — Formalizar ownership por domínio.** `P0` · Origem: 008/066/088.
  - **Execução:** atribuir responsáveis reais por UI, catálogo, orçamento, estoque, kits, revistas, integrações, banco, Edge, CI e arquivos protegidos.
  - **Aceite/evidência:** `CODEOWNERS` e mapa de domínio concordam; cada módulo parcial, job e Edge Function tem owner e substituto.
  - **Risco/controle:** ownership nominal sem capacidade operacional; validar responsáveis com o PO antes de mudar proteção. `[VALIDAÇÃO PO]` `[AUTORIZAÇÃO GITHUB]`.

- [ ] **004 — Publicar readiness e lifecycle por feature.** `P1` · Origem: 007/066/088–089.
  - **Execução:** classificar cada módulo como `ativo`, `parcial`, `demo`, `desativado`, `legado` ou `externo gerenciado`; registrar callers, flags, ambientes e último uso conhecido.
  - **Aceite/evidência:** nenhuma feature, Edge Function ou job fica sem estado, owner, prazo e condição objetiva de promoção/aposentadoria.
  - **Risco/controle:** remover por ausência de caller local; preservar webhooks, cron, integrações e consumidores externos até prova nominal.

- [ ] **005 — Implantar o protocolo de mudança multiagente.** `P0` · Origem: 006/009/010.
  - **Execução:** padronizar template de PR, reserva de arquivos/objetos, registro de conflito semântico, rollback, evidências e autorizações.
  - **Aceite/evidência:** PR incompleto não avança; alterações concorrentes são comparadas por intenção e invariantes, nunca por “main wins”.
  - **Risco/controle:** dois agentes alterarem contrato central; exigir owner único e rebase/reteste antes do merge.

**Gate do tipo 1:** nenhum trabalho estrutural começa sem owner, critério de sucesso,
dependências e autoridade conhecidos.

## Tipo 2 — GitHub, Vercel, CI e segurança de supply chain

- [ ] **006 — Fechar o painel causal dos workflows históricos.** `P1` · Origem: 012.
  - **Execução:** classificar os runs vermelhos por defeito de produto, teste, flake, segredo, runner, browser, orçamento, permissão ou serviço externo.
  - **Aceite/evidência:** painel contém causa, recorrência, owner, correção e link do run; falhas obsoletas ficam justificadas, não apagadas.
  - **Risco/controle:** perseguir sintomas antigos; agrupar pelo primeiro erro causal e pela versão do workflow.

- [ ] **007 — Reorganizar o catálogo de workflows.** `P1` · Origem: 013/094.
  - **Execução:** separar gates obrigatórios, PR focais, schedules, deploys e checks consultivos; eliminar coleta acidental de projetos e schedules comprovadamente redundantes.
  - **Aceite/evidência:** cada workflow declara evento, paths, runtime, browser, segredo, timeout, artefato e caráter bloqueante; gates nunca usam `continue-on-error`.
  - **Risco/controle:** reduzir cobertura ao consolidar; comparar matriz de jobs antes/depois. `[AUTORIZAÇÃO GITHUB]` quando houver mudança de settings.

- [ ] **008 — Fixar o required check final de `main`.** `P0` · Origem: 014.
  - **Execução:** confirmar o nome estável do gate agregador, verificar seu sucesso hospedado e atualizar o ruleset preservando bypasses e demais proteções existentes.
  - **Aceite/evidência:** merge em `main` é recusado sem `Gate Final - Deploy Ready`; teste controlado confirma bloqueio e caminho feliz.
  - **Risco/controle:** travar o repositório por contexto inexistente; só ativar após run verde com o nome exato. `[AUTORIZAÇÃO GITHUB]`.

- [ ] **009 — Desbloquear e validar previews da Vercel.** `P0` · Origem: infraestrutura externa/100.
  - **Execução:** corrigir acesso do autor Git ao projeto/time, revisar integração GitHub↔Vercel e validar variáveis do preview sem expor segredos.
  - **Aceite/evidência:** PR gera preview, build conclui, smoke público passa e o deployment aparece vinculado ao commit correto.
  - **Risco/controle:** mudar configuração produtiva por engano; testar primeiro no ambiente Preview. `[AUTORIZAÇÃO EXTERNA]`.

- [ ] **010 — Restabelecer análise de segurança e tratar vulnerabilidades altas.** `P0` · Origem: 094/100.
  - **Execução:** habilitar Code Security/CodeQL quando permitido, revisar alertas Dependabot atuais e separar correção, mitigação e aceite formal.
  - **Aceite/evidência:** CodeQL executa ou possui exceção institucional explícita; nenhuma vulnerabilidade alta chega à release sem owner, prazo e decisão documentada.
  - **Risco/controle:** atualização ampla quebrar React/toolchain; corrigir dependências em lotes pequenos com lock, build e regressão. `[AUTORIZAÇÃO GITHUB]`.

**Gate do tipo 2:** CI deve distinguir sucesso real, falha, bloqueio externo e skip;
branch protection e preview devem apontar para checks que realmente existem.

## Tipo 3 — Fixtures, regressão, visual e recuperação

- [ ] **011 — Criar fixtures críticas estáveis e anonimizadas.** `P0` · Origem: 005/061–065.
  - **Execução:** definir datasets versionados para usuários, organizações, produtos, estoque, carrinho, orçamento, desconto, magazine, kit e mockup.
  - **Aceite/evidência:** seeds idempotentes, sem PII real, com setup/teardown e identificador de execução; nenhum teste depende de linha volátil de produção.
  - **Risco/controle:** fixture divergir do schema; validá-la contra tipos e banco descartável em cada mudança.

- [ ] **012 — Completar baselines visuais dos fluxos críticos.** `P1` · Origem: 004/057–059/096.
  - **Execução:** ampliar os baselines já existentes de dialogs/toasts para desktop e mobile dos fluxos definidos na etapa 001.
  - **Aceite/evidência:** snapshots por viewport/browser aprovado, fontes determinísticas, máscara apenas para dados realmente voláteis e revisão humana do PO.
  - **Risco/controle:** aceitar regressão regenerando imagem; atualização de baseline exige comparação e `[AUTORIZAÇÃO DESIGN]`.

- [ ] **013 — Unificar E2E, visual e acessibilidade nas mesmas fixtures.** `P1` · Origem: 096.
  - **Execução:** fazer cada jornada crítica validar comportamento, layout, teclado, foco, nomes acessíveis e ausência de clipping sobre o mesmo estado de dados.
  - **Aceite/evidência:** matriz fluxo × viewport × navegador × a11y executável, com artefatos de falha e sem duplicação contraditória de setup.
  - **Risco/controle:** suíte excessivamente lenta; manter smoke P0 pequeno e shards amplos separados sem perder o gate agregador.

- [ ] **014 — Expandir regressão hermética e política anti-falso-verde.** `P1` · Origem: 094–095.
  - **Execução:** levar proibição de rede inesperada, `console.error`, rejeições e mocks incompletos às suítes fora do core; classificar skips por causa.
  - **Aceite/evidência:** cobertura cresce por domínio, flakes têm quarentena com prazo e testes condicionados a segredo ficam `blocked`, nunca `passed`.
  - **Risco/controle:** mocks legítimos quebrarem em massa; migrar por lotes com baseline e owner de exceção.

- [ ] **015 — Provar backup, restauração e rollback.** `P0` · Origem: 009/085–086/100.
  - **Execução:** definir RTO/RPO, restaurar snapshot sanitizado em PG17 descartável e ensaiar rollback de aplicação e compensação forward-only.
  - **Aceite/evidência:** runbook cronometrado, checksums, responsáveis, critérios de abortar e relatório do exercício; produção permanece intocada.
  - **Risco/controle:** backup não restaurável; o gate exige restauração real em ambiente efêmero, não apenas existência do arquivo.

**Gate do tipo 3:** testes críticos usam dados controlados, preservam o design e falham
de forma informativa; recuperação é demonstrada antes de qualquer canário.

## Tipo 4 — Tipagem, contratos e observabilidade no código

- [ ] **016 — Reduzir `as any` nas fronteiras de banco e integrações.** `P1` · Origem: 033/055.
  - **Execução:** inventariar o saldo atual e corrigir primeiro RPCs, PostgREST, Edge envelopes, CRM, Storage e parsers externos.
  - **Aceite/evidência:** cada lote reduz a baseline, adiciona contrato positivo/negativo e não altera os campos críticos de `Product`.
  - **Risco/controle:** cast removido revelar incompatibilidade real; corrigir a fronteira, nunca ampliar `unknown` sem validação.

- [ ] **017 — Revisar supressões TypeScript/ESLint.** `P2` · Origem: 034.
  - **Execução:** classificar `eslint-disable`, `ts-ignore`, `ts-expect-error` e exceções por motivo, owner e expiração.
  - **Aceite/evidência:** supressão removida apenas com tipagem/teste equivalente; exceções restantes são mínimas, locais e verificadas pelo ratchet.
  - **Risco/controle:** limpeza cosmética alterar runtime; separar refactor de comportamento e manter testes focais.

- [ ] **018 — Impedir mascaramento futuro de drift.** `P1` · Origem: 033–035/055.
  - **Execução:** fortalecer scanners para casts em chamadas Supabase/wrappers, referências dinâmicas e envelopes externos; exigir justificativa estruturada.
  - **Aceite/evidência:** PR com nova evasão de tipo falha; exceção aprovada contém owner, motivo, teste e data de remoção.
  - **Risco/controle:** falso positivo em adaptadores legítimos; allowlist por assinatura e arquivo, nunca regra global silenciosa.

- [ ] **019 — Padronizar contratos de integrações.** `P1` · Origem: 091.
  - **Execução:** unificar autenticação, CORS, validação, idempotência, timeout, retry, status HTTP, `request_id` e envelope de erro nas integrações críticas.
  - **Aceite/evidência:** contract tests cobrem 2xx/4xx/5xx, timeout, retryável/não retryável e duplicata; compatibilidade legada fica explícita.
  - **Risco/controle:** quebrar consumidor externo; versionar contratos e manter adaptador temporário com prazo.

- [ ] **020 — Fechar correlação de observabilidade ponta a ponta.** `P1` · Origem: 093.
  - **Execução:** propagar `request_id` da UI à Edge Function, RPC/banco, outbox e provedor; consolidar canal canônico de erro e métricas.
  - **Aceite/evidência:** uma jornada crítica pode ser rastreada por um único ID com latência, resultado e causa; dados sensíveis são redigidos.
  - **Risco/controle:** logging virar dependência fatal; telemetria falha de forma secundária e possui limite de volume/retenção.

**Gate do tipo 4:** nenhum contrato crítico depende de cast opaco, status perdido ou
erro sem correlação; dívida remanescente possui owner e prazo.

## Tipo 5 — Simulação, autenticação e módulos dormentes

- [ ] **021 — Decidir o produto de `simulation-orchestrator`.** `P0` · Origem: 040.
  - **Execução:** definir finalidade, personas, execução efêmera ou persistente, retenção, visibilidade, sandbox e condições de exposição na UI.
  - **Aceite/evidência:** ADR aprovado decide lifecycle e modelo de falha sem criar tabela por inferência. `[VALIDAÇÃO PO]`.
  - **Risco/controle:** simulação produzir efeito real; toda chamada externa permanece dry-run/fake até decisão e autorização.

- [ ] **022 — Fechar o contrato de execução da simulação sem DDL.** `P1` · Origem: 039–040.
  - **Execução:** alinhar HMAC/header/segredo, estados `passed/rejected/infra_failed/skipped`, timeouts, provenance e isolamento de produto.
  - **Aceite/evidência:** matriz hermética cobre sucesso, rejeição, infraestrutura, persistência indisponível, replay e segredo inválido; zero rede inesperada.
  - **Risco/controle:** falso sucesso; qualquer dependência não comprovada termina fail-closed com causa explícita.

- [ ] **023 — Preparar persistência da simulação somente se aprovada.** `P1` · Origem: 040/081–090.
  - **Execução:** desenhar migration forward-only por objeto para runs/logs, FKs, índices, RLS, retenção, grants e limpeza; incluir alternativa sem persistência.
  - **Aceite/evidência:** SQL revisado e testado em PG17 descartável, sem aplicação canônica; matriz de acesso e rollback compensatório anexos.
  - **Risco/controle:** dados de teste poluírem produção. `[AUTORIZAÇÃO BD]` e `[AUTORIZAÇÃO DEPLOY]` antes de qualquer aplicação.

- [ ] **024 — Decidir ligação ou aposentadoria de `runAuthAudit`.** `P1` · Origem: 048.
  - **Execução:** provar caller, valor operacional, sobreposição com auditorias existentes e comportamento atual fail-soft.
  - **Aceite/evidência:** decisão nominal de conectar, adaptar ou remover; nenhuma RPC nova é criada para código dormente. `[VALIDAÇÃO PO]`.
  - **Risco/controle:** retirar guarda usada indiretamente; buscar imports, eventos, histórico e consumidores externos antes de alterar.

- [ ] **025 — Implementar o diagnóstico de auth aprovado.** `P1` · Origem: 049.
  - **Execução:** reutilizar equivalente canônico ou especificar retorno mínimo, autenticação, AAL, grants, rate limit, auditoria e UI consumidora; se aposentado, remover apenas o caminho aprovado.
  - **Aceite/evidência:** testes de autorização e contrato cobrem usuário, admin e negação; migration fica isolada até autorização.
  - **Risco/controle:** expor metadados de segurança. `[AUTORIZAÇÃO BD]` para RPC/grants; revisão de segurança obrigatória.

**Gate do tipo 5:** simulação e auditoria de autenticação possuem decisão de produto,
contrato fail-closed e nenhum backend especulativo.

## Tipo 6 — Estoque, limpeza E2E, Bitrix e desconto

- [ ] **026 — Decidir o futuro de `stock_notes`.** `P0` · Origem: 051.
  - **Execução:** demonstrar o hook/UX atual, identificar persona e necessidade; escolher feature completa, adaptação a objeto existente ou aposentadoria.
  - **Aceite/evidência:** decisão registrada com owner e critério; tabela não é criada e código não é removido por suposição. `[VALIDAÇÃO PO]`.
  - **Risco/controle:** confundir tabela vazia com feature inútil; considerar fase de criação do produto.

- [ ] **027 — Executar o caminho aprovado para notas de estoque.** `P1` · Origem: 052/070–073.
  - **Execução:** se mantida, preparar tabela/FKs/índices/RLS/policies/tipos/UI/testes; se aposentada, mapear todos os consumidores e remover em PR isolado.
  - **Aceite/evidência:** matriz `anon/auth/service_role`, isolamento organizacional e E2E de criação/edição/remoção; ou prova de zero consumidor.
  - **Risco/controle:** `[AUTORIZAÇÃO BD]` para schema e `[VALIDAÇÃO PO]` para retirada.

- [ ] **028 — Isolar ou formalizar `e2e_cleanup_audit`.** `P1` · Origem: 045.
  - **Execução:** localizar referências, decidir se é artefato exclusivo de teste ou auditoria persistente e impedir dependência fantasma em produção.
  - **Aceite/evidência:** E2E limpa somente registros com namespace próprio; produção não consulta objeto inexistente; contrato formal exige migration separada.
  - **Risco/controle:** limpeza remover dados reais; exigir prefixo/run-id, allowlist de tabelas e ambiente confirmado.

- [ ] **029 — Definir storage e lifecycle do Bitrix.** `P1` · Origem: 041–042/091–092.
  - **Execução:** escolher fonte canônica, modelo de sincronização, idempotência, conflitos, retenção, retry/dead-letter e observabilidade.
  - **Aceite/evidência:** ADR + contrato de `sync_full`, leitura e upsert; falha de persistência permanece erro e é rastreável.
  - **Risco/controle:** duplicar CRM ou sobrescrever dado novo; sandbox/doubles até `[AUTORIZAÇÃO EXTERNA]`, DDL somente com `[AUTORIZAÇÃO BD]`.

- [ ] **030 — Provar aprovação de desconto no ambiente canônico.** `P0` · Origem: gap live após RPCs transacionais.
  - **Execução:** verificar read-only a combinação de RPC, trigger, policies, auditoria, idempotência e notificação; executar happy-path autenticado em staging/fixture autorizada.
  - **Aceite/evidência:** uma solicitação concorrente gera uma decisão e no máximo uma notificação; nega AAL/role inválido e preserva snapshot de `NEW`.
  - **Risco/controle:** duplicação de notificação ou mutação produtiva; teste live exige usuário/registro descartável e autorização nominal.

**Gate do tipo 6:** módulos não ficam meio conectados; qualquer persistência possui
decisão, isolamento, idempotência e prova contra efeitos duplicados.

## Tipo 7 — Provenance, UX e jornadas centrais em staging

- [ ] **031 — Tornar provenance estrutural por campo.** `P1` · Origem: 057.
  - **Execução:** transportar origem real/simulada/estimada por campo e bloquear decisões, notificações, IA, exportações e CTAs quando a entrada decisória não for real.
  - **Aceite/evidência:** testes de propagação impedem “lavagem” do mock; UI identifica origem sem alterar o design aprovado inadvertidamente.
  - **Risco/controle:** quebra perceptível de UX. `[AUTORIZAÇÃO DESIGN]` e baseline antes/depois.

- [ ] **032 — Tornar o kit builder fail-explicit.** `P1` · Origem: 058/064.
  - **Execução:** colocar `MOCK_BOXES/MOCK_ITEMS` sob flag desligada em produção e definir estado vazio/erro/retry sem fallback silencioso.
  - **Aceite/evidência:** build produtivo não apresenta mock como real; testes cobrem indisponibilidade, flag demo e recuperação.
  - **Risco/controle:** jornada desaparecer antes do backend estar pronto; liberar somente após etapa 037 e `[AUTORIZAÇÃO DESIGN]`.

- [ ] **033 — Separar confiança real de estimativa simulada.** `P1` · Origem: 059.
  - **Execução:** exibir rating, lead time e outras métricas com origem, freshness e confiança próprias; impedir agregação enganosa.
  - **Aceite/evidência:** contratos e snapshots mostram cada origem; exportações e recomendações respeitam provenance.
  - **Risco/controle:** mudança de leitura comercial; aprovação de copy e `[AUTORIZAÇÃO DESIGN]`.

- [ ] **034 — Provar a jornada de orçamento em staging.** `P0` · Origem: 061/065/092.
  - **Execução:** criar orçamento, itens, personalização, frete, desconto, aprovação, PDF e compartilhamento usando fixtures e provedores sandbox/doubles.
  - **Aceite/evidência:** E2E repetível, transações/idempotência verificadas, artefatos conferidos e teardown completo; zero mutação de produção.
  - **Risco/controle:** e-mail/webhook real; default é double local até `[AUTORIZAÇÃO EXTERNA]`.

- [ ] **035 — Provar a jornada de magazine em staging.** `P1` · Origem: 062.
  - **Execução:** criar template, editar, publicar, ler, reagir e persistir estado do leitor com perfis distintos.
  - **Aceite/evidência:** permissões, versão publicada, tokens/URLs, reação idempotente e isolamento organizacional passam nas mesmas fixtures.
  - **Risco/controle:** sobrescrever publicação existente; namespace próprio e cleanup por run-id.

**Gate do tipo 7:** dados simulados jamais parecem fatos reais e orçamento/magazine
passam ponta a ponta em ambiente controlado.

## Tipo 8 — Mockup, kits, isolamento e integrações externas

- [ ] **036 — Provar mockup ponta a ponta em staging.** `P1` · Origem: 063/092.
  - **Execução:** upload, scan, geração, cobrança simulada, retry, aprovação, compartilhamento e auditoria com provedor sandbox/double.
  - **Aceite/evidência:** idempotência e compensação em falha parcial, sem cobrança ou asset órfão; logs correlacionados.
  - **Risco/controle:** custo externo e conteúdo sensível. `[AUTORIZAÇÃO EXTERNA]`, limites e teardown obrigatórios.

- [ ] **037 — Provar kits ponta a ponta em staging.** `P1` · Origem: 058/064.
  - **Execução:** template, composição, componentes, técnicas, variantes, colaboração, comentários, share token, expiração e revogação.
  - **Aceite/evidência:** nenhum fallback oculto, cálculo reproduzível e autorização correta para dono, colaborador e público.
  - **Risco/controle:** token vazar entre organizações; testar negações e revogação antes da UX final.

- [ ] **038 — Provar isolamento pessoal e organizacional 2×2.** `P0` · Origem: 065/072/077.
  - **Execução:** dois usuários em duas organizações exercitam notificações, preferências, favoritos, comparações, filtros, carrinhos e recursos compartilháveis.
  - **Aceite/evidência:** matriz lê/escreve/nega por papel, sem vazamento cross-tenant; service role só aparece nos caminhos autorizados.
  - **Risco/controle:** falso positivo com usuário admin; fixtures incluem papéis mínimos e sessão independente.

- [ ] **039 — Configurar smoke tests externos reais e seguros.** `P0` · Origem: 092/094.
  - **Execução:** provisionar JWTs/segredos dedicados de teste para CRM, webhook, e-mail, Storage, catálogo, callbacks e IA; configurar rotação e escopo mínimo.
  - **Aceite/evidência:** happy-path e falhas autenticadas rodam em staging; segredo ausente retorna `blocked`; nenhum endpoint de produção é fallback.
  - **Risco/controle:** vazamento ou custo; ambientes allowlisted, quotas, kill switch e `[AUTORIZAÇÃO EXTERNA]`.

- [ ] **040 — Reconciliar lifecycle das Edge Functions e MCPs.** `P1` · Origem: 088–089 e gap MCP.
  - **Execução:** registrar para todas as funções versão/hash, caller, JWT, segredos, config, owner e último uso; corrigir endpoints MCP que não apontam para o SSOT.
  - **Aceite/evidência:** repo × deploy × `config.toml` reconciliados; `mcp-query` permanece exceção externa documentada; MCP canônico prova project ref antes de consulta.
  - **Risco/controle:** operar banco errado ou apagar função externa; validação de identidade é read-only e qualquer retirada exige `[VALIDAÇÃO PO]` `[AUTORIZAÇÃO DEPLOY]`.

**Gate do tipo 8:** jornadas complexas são idempotentes, isoladas e observáveis;
credencial ausente não vira sucesso e todo endpoint prova sua identidade.

## Tipo 9 — Catálogo do banco, acesso, rotinas e jobs

- [ ] **041 — Fechar ownership de relações vazias e dependências de colunas.** `P1` · Origem: 069–070.
  - **Execução:** revisar as relações com estimativa zero e mapear views, funções, triggers, FKs, índices, jobs, código, BI e integrações por tabela/coluna.
  - **Aceite/evidência:** cada relação possui finalidade, owner, lifecycle e consumidores; “vazia” nunca é sinônimo de “lixo”.
  - **Risco/controle:** catálogo estatístico desatualizado; usar `pg_catalog` e dependências reais, sem PostgREST/OpenAPI como auditoria de schema.

- [ ] **042 — Revisar constraints e índices por evidência.** `P1` · Origem: 071.
  - **Execução:** medir scans, seletividade, duplicidade semântica, tamanho, write cost, planos de consultas críticas e constraints não validadas.
  - **Aceite/evidência:** cada candidato tem query/plano, impacto, owner, janela e rollback; nenhuma remoção em massa.
  - **Risco/controle:** índices pouco usados serem essenciais em picos; observar janela representativa e cenários sazonais.

- [ ] **043 — Fechar matriz RLS, ACL e grants efetivos.** `P0` · Origem: 072–073/077.
  - **Execução:** testar `anon`, `authenticated`, papéis de domínio e `service_role`; incluir relação sem RLS, deny-all, views públicas, ownership e `security_invoker`.
  - **Aceite/evidência:** matriz executável antes/depois; migration forward-only da partição sem RLS preparada separadamente, sem aplicação canônica.
  - **Risco/controle:** revogar acesso legítimo ou abrir tenant. `[AUTORIZAÇÃO BD]` por objeto para aplicar qualquer correção.

- [ ] **044 — Revisar rotinas privilegiadas, enums e extensões.** `P0` · Origem: 074–076.
  - **Execução:** para cada `SECURITY DEFINER`, priorizar expostas e verificar caller, grants, `search_path`, owner e finalidade; mapear dependências dos enums/extensões.
  - **Aceite/evidência:** inventário nominal com risco e decisão; zero revogação/remoção por ausência de coluna direta ou busca textual.
  - **Risco/controle:** quebrar trigger/cron/cliente externo; propostas são individuais e exigem `[AUTORIZAÇÃO BD]`.

- [ ] **045 — Resolver os três jobs críticos pendentes.** `P0` · Origem: 078–080.
  - **Execução:** investigar `process-webhook-outbox`, `pipeline-classify-categories` e `vacuum-high-dead-tuples`, cobrindo substituto, segredo, idempotência, locks, timeout, owner e alertas.
  - **Aceite/evidência:** decisão `manter/corrigir/substituir/aposentar`, teste em ambiente descartável e runbook de rollback para cada job.
  - **Risco/controle:** duplicar entrega ou causar lock; nenhuma reativação/alteração sem DBA e `[AUTORIZAÇÃO BD]`.

**Gate do tipo 9:** objetos e privilégios são avaliados nominalmente por uso e efeito;
nenhuma tabela vazia, rotina privilegiada ou job é alterado por heurística.

## Tipo 10 — Ledger, replay, limpeza e release

- [ ] **046 — Aprovar o manifesto canônico de migrations.** `P0` · Origem: 081/083–084.
  - **Execução:** reconciliar versões vivas, arquivos locais, hashes, efeitos, colisões, nomes sem versão, duplicatas e referências ausentes.
  - **Aceite/evidência:** manifesto `versão ↔ arquivo ↔ hash ↔ efeito ↔ estado` revisado pelo DBA; nenhuma renomeação retroativa e nenhuma equivalência presumida.
  - **Risco/controle:** replay de histórico inconsistente; manter freeze lógico até o manifesto ser aprovado.

- [ ] **047 — Reconstruir o banco descartável a partir do manifesto.** `P0` · Origem: 085.
  - **Execução:** usar PG17 limpo, aplicar somente a sequência aprovada, registrar tempos, warnings, falhas, seeds estruturais e checksums.
  - **Aceite/evidência:** replay integral reproduzível, sem colisão, dependência implícita ou edição de migration aplicada.
  - **Risco/controle:** script apontar para projeto remoto; validar host/container efêmero e bloquear project ref canônico no executor.

- [ ] **048 — Comparar replay, referência e canônico.** `P0` · Origem: 086.
  - **Execução:** comparar tabelas, colunas, constraints, índices, RLS/policies, funções, triggers, views/MVs, enums, extensões, grants, jobs e tipos gerados.
  - **Aceite/evidência:** todo delta é `intencional`, `pendente`, `live-only`, `repo-only` ou `perda comprovada`, com owner e ação; zero “drift” genérico sem explicação.
  - **Risco/controle:** comparar via PostgREST e perder objetos; auditoria exclusivamente por `pg_catalog` e snapshots sanitizados.

- [ ] **049 — Executar somente mudanças nominalmente aprovadas em staging.** `P0` · Origem: 073/090/098–099.
  - **Execução:** aplicar migrations/deploys por objeto, canário, métricas e rollback; triar duplicados e históricos em lotes separados, preservando evidência e aliases externos.
  - **Aceite/evidência:** aprovação registrada por objeto/arquivo, staging verde, rollback ensaiado e nenhuma limpeza fora da allowlist aprovada.
  - **Risco/controle:** expansão acidental para produção. `[VALIDAÇÃO PO]` `[AUTORIZAÇÃO BD]` `[AUTORIZAÇÃO DEPLOY]` e, quando aplicável, `[AUTORIZAÇÃO EXTERNA]`.

- [ ] **050 — Gerar e aprovar a release candidate.** `P0` · Origem: 100.
  - **Execução:** congelar RC, executar instalação limpa, build, typecheck, lint, unit/integration/E2E/visual/a11y, contratos DB, segurança, preview, canário e rollback.
  - **Aceite/evidência:** required checks verdes, Vercel validada, zero P1 aberto, vulnerabilidades altas corrigidas ou aceitas formalmente, observabilidade ativa e aceite do PO.
  - **Risco/controle:** declarar 10/10 com skips ou dependências externas ocultas; publicar relatório final com sucessos, bloqueios, riscos residuais e hashes. `[AUTORIZAÇÃO DEPLOY]` `[VALIDAÇÃO PO]`.

**Gate do tipo 10:** somente uma RC reproduzível, reversível, observável e aprovada pode
ser promovida; o encerramento documental não substitui execução.

---

## Simulação preventiva de falhas e gaps

| Cenário | Falha prevista | Detecção antes da mudança | Contenção/rollback |
|---|---|---|---|
| Outro agente altera o mesmo contrato | merge preserva sintaxe e perde intenção | owner por arquivo, diff semântico, testes do invariante | parar merge, reconciliar ambos os objetivos e retestar |
| MCP aponta para banco errado | auditoria ou DDL sobre projeto alheio | provar project ref e versão via consulta read-only | descartar evidência; nunca usar endpoint sem identidade |
| Segredo/JWT ausente | teste externo passa por skip/fallback | estado `blocked` e proibição de fallback produtivo | provisionar sandbox ou manter gate inconclusivo |
| Trigger e RPC notificam juntos | aprovação gera notificação duplicada | teste concorrente + catálogo de trigger/policy | migration compensatória individual após autorização |
| Migration depende de história ausente | replay verde parcial e produção diverge | manifesto/hash/efeito e PG17 limpo | congelar aplicação; corrigir somente forward-only |
| RLS corrigida abre outro papel | acesso cross-tenant ou quebra legítima | matriz 2×2 e papéis mínimos antes/depois | revogar via migration compensatória aprovada |
| Visual baseline é regenerada às cegas | regressão vira novo esperado | revisão de diff e aprovação de design | restaurar baseline anterior, corrigir componente |
| Provedor externo oscila | retry duplica cobrança/evento | idempotency key, timeout e fault injection | circuit breaker, dead-letter e compensação |
| Limpeza usa “sem uso local” | remove consumidor externo | histórico, CDN, webhook, cron e owner nominal | preservar alias/ativo e reverter deploy |
| Preview/canário indisponível | RC parece pronta apenas localmente | gate remoto obrigatório e status externo separado | não promover; manter RC congelada até evidência |

## Critério global de conclusão

O plano termina somente quando:

- exatamente 50 etapas possuem evidência versionada e seus critérios integrais;
- todas as autorizações nominais estão anexadas ao PR/registro correspondente;
- nenhum P0/P1 permanece aberto ou disfarçado como skip;
- o banco descartável é reproduzível e comparado ao canônico via `pg_catalog`;
- os fluxos críticos passam com fixtures, isolamento, visual e observabilidade;
- o Supabase canônico e a produção recebem apenas mudanças autorizadas, canariadas e reversíveis;
- o PO aprova a release candidate e os riscos residuais documentados.

## Modelo de registro por etapa

```md
### Etapa NNN — título
- Owner:
- Branch/PR/commit:
- Estado: aberta | em execução | bloqueada | concluída
- Arquivos/objetos tocados:
- Autorizações:
- Testes e resultados:
- Evidência remota:
- Riscos residuais:
- Rollback/compensação:
- Conflitos multiagente reconciliados:
```

## Fontes e limitações da elaboração

- Matriz reconciliada do plano de 100 etapas e auditoria de 29/08/2026.
- Código, workflows, migrations, relatórios QA e snapshots `pg_catalog` da branch.
- Grafo estrutural Graphify existente, com 29.262 nós, usado somente para descoberta
  de relações; como o grafo antecede as correções mais recentes, toda conclusão foi
  cruzada com artefatos atuais.
- Os MCPs de banco conhecidos nesta sessão não provaram identidade com
  `doufsxqlfjyuvxuezpln`; nenhum dado deles autoriza conclusão ou mutação canônica.
