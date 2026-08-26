# Plano de melhorias e correções — checklist de 100 etapas

- **Data:** 26 de agosto de 2026
- **Projeto:** Promo Gifts V4
- **Supabase canônico:** `doufsxqlfjyuvxuezpln`
- **Auditoria de origem:** `docs/AUDITORIA_EXAUSTIVA_E_PLANO_100_ETAPAS_2026-08-26.md`
- **Baseline funcional auditada:** `e42fc237eabe8855304eb90db84e4b46b8ebab91`
- **Estado inicial:** 0 de 100 etapas concluídas
- **Escopo deste arquivo:** planejamento e acompanhamento; não autoriza alteração de código, banco, infraestrutura, design, integração externa, deploy ou exclusão

## Objetivo

Levar o sistema do estado atual até uma release tecnicamente confiável, preservando o design aprovado e as funcionalidades já estáveis. A execução deve ser incremental, testável, reversível e baseada em evidências. Nenhuma tabela, coluna, constraint, índice, policy, função, trigger, view, enum, extensão, privilégio, job, migration, arquivo ou ativo será apagado ou alterado sem a autorização indicada.

## Como usar o checklist

- Marque um item como concluído somente quando seu critério de aceite estiver comprovado por evidência versionada.
- Registre em cada PR o ID da etapa, arquivos tocados, testes executados, risco e rollback.
- Respeite a ordem numérica dentro de cada dependência; itens posteriores não anulam gates anteriores.
- Um checkbox concluído não substitui `[VALIDAÇÃO PO]` nem qualquer marcador de autorização.
- Migrations são forward-only: rollback significa restauração validada ou uma nova migration compensatória, nunca reescrever história aplicada.
- O banco de produção permanece somente leitura até uma etapa trazer `[AUTORIZAÇÃO BD]` explícita e o PO aprovar seu escopo.

## Marcadores de decisão

| Marcador | Significado |
|---|---|
| `[VALIDAÇÃO PO]` | Decisão funcional, consolidação, aposentadoria ou exclusão dependente do Product Owner |
| `[AUTORIZAÇÃO BD]` | Alteração de schema, policy, grant, função, trigger, job ou dado no Supabase |
| `[AUTORIZAÇÃO GITHUB]` | Mudança em orçamento, settings, branch protection ou operação do GitHub |
| `[AUTORIZAÇÃO DESIGN]` | Mudança visual ou de comportamento perceptível na interface |
| `[AUTORIZAÇÃO EXTERNA]` | Chamada ou configuração em CRM, e-mail, webhook, catálogo ou outro provedor |
| `[AUTORIZAÇÃO DEPLOY]` | Deploy, canário, rollback ou retirada de função/serviço em ambiente remoto |

## Resumo por tipo

| Tipo | Etapas | Quantidade | Objetivo | Progresso inicial |
|---|---:|---:|---|---:|
| 1. Governança, proteção e aceite | 001–010 | 10 | Fixar baseline, owners, fluxos críticos e regras de mudança | 0/10 |
| 2. CI, dependências e gates | 011–025 | 15 | Recuperar sinal de qualidade e instalação determinística | 0/15 |
| 3. TypeScript e qualidade de código | 026–035 | 10 | Sincronizar tipos e reduzir dívida mensurável | 0/10 |
| 4. Ligações código ↔ banco | 036–055 | 20 | Corrigir contratos quebrados e falsos verdes | 0/20 |
| 5. Produto, UX e dados simulados | 056–066 | 11 | Impedir mocks enganosos e provar jornadas críticas | 0/11 |
| 6. Banco, jobs e migrations | 067–087 | 21 | Reconciliar `pg_catalog`, ACLs, jobs e histórico | 0/21 |
| 7. Edge, integrações e observabilidade | 088–097 | 10 | Provar deploys, contratos e rastreabilidade | 0/10 |
| 8. Limpeza e release | 098–100 | 3 | Limpar somente o aprovado e gerar release candidate | 0/3 |
| **Total** | **001–100** | **100** | **Estabilização completa** | **0/100** |

---

## Tipo 1 — Governança, proteção e critérios de aceite

- [ ] **001 — Congelar a baseline auditável.** Registrar o commit `e42fc237`, a fotografia `pg_catalog` e a auditoria de origem como referências imutáveis. **Aceite:** toda mudança futura consegue declarar exatamente contra qual baseline foi comparada.
- [ ] **002 — Definir os fluxos críticos com o PO.** Classificar catálogo, busca, orçamento, carrinho, estoque, mockup, magazine, kit e CRM. **Entregável:** matriz `fluxo × owner × criticidade × critério de sucesso` aprovada.
- [ ] **003 — Mapear todas as rotas.** Ligar cada rota pública, autenticada e administrativa ao componente, hook, serviço, tabela/RPC, Edge Function e teste correspondente. **Aceite:** nenhuma rota sem owner ou dependência identificada.
- [ ] **004 — Proteger o design existente.** Capturar baselines visuais desktop e mobile dos fluxos críticos. **Aceite:** comparação visual versionada antes de qualquer correção perceptível.
- [ ] **005 — Criar fixtures confiáveis.** Preparar dados estáveis, anonimizados e reproduzíveis para os fluxos críticos. **Aceite:** testes não dependem de dados voláteis de produção.
- [ ] **006 — Implantar template de mudança.** Exigir impacto, contratos tocados, testes, autorização e rollback; congelar migrations novas até a etapa 087. **Aceite:** PR incompleto não avança.
- [ ] **007 — Definir feature flags.** Cobrir módulos parciais, mocks produtivos e integrações instáveis. **Aceite:** funcionalidade incompleta não fica exposta por acidente.
- [ ] **008 — Formalizar ownership.** Atribuir responsáveis por domínio e pelos arquivos protegidos em `AGENTS.md`. **Entregável:** `CODEOWNERS` coerente com os responsáveis reais.
- [ ] **009 — Validar recuperação e rollback.** Testar restauração sem tocar produção e documentar compensação forward-only. **Aceite:** RTO/RPO, owner e procedimento comprovados.
- [ ] **010 — Fixar a Definition of Done.** Exigir build, typecheck, lint, testes, E2E crítico, regressão visual, contrato DB e observabilidade verdes. **Aceite:** declaração de “pronto” depende do PO e de evidências.

**Gate de saída do tipo 1:** fluxos críticos, owners, baseline visual, fixtures, autorizações e Definition of Done aprovados.

## Tipo 2 — CI, dependências e gates determinísticos

- [ ] **011 — `[AUTORIZAÇÃO GITHUB]` Restaurar capacidade do GitHub Actions.** Resolver o bloqueio de orçamento. **Aceite:** workflow mínimo inicia e termina com jobs realmente executados.
- [ ] **012 — Classificar os 30 runs vermelhos.** Separar orçamento, credencial, runner, flake, contrato e defeito de produto. **Entregável:** painel causal, sem assumir que toda falha tem a mesma origem.
- [ ] **013 — `[AUTORIZAÇÃO GITHUB]` Reorganizar workflows.** Separar obrigatórios, agendados e opcionais e reduzir schedules redundantes. **Aceite:** gates obrigatórios continuam bloqueantes.
- [ ] **014 — `[AUTORIZAÇÃO GITHUB]` Confirmar e corrigir branch protection.** Revisar Required Checks e Gate 0 depois da restauração do CI e corrigir somente divergências aprovadas. **Aceite:** `main` não aceita merge sem os checks definidos.
- [ ] **015 — Escolher o package manager canônico.** Adotar npm ou alternativa explicitamente aprovada antes de remover locks. **Aceite:** uma única fonte de resolução documentada.
- [ ] **016 — Resolver React 19 × `cmdk@0.2.1`.** Atualizar ou substituir com testes dos command menus. **Aceite:** `npm ci` funciona sem `--legacy-peer-deps`.
- [ ] **017 — Alinhar a geração das dependências.** Compatibilizar React, React DOM, tipos, Router, Vite e plugins. **Aceite:** árvore sem peer conflict e sem dupla geração React 18/19.
- [ ] **018 — Regenerar somente o lock aprovado.** Fazer commit isolado e comparar a árvore resolvida. **Aceite:** duas instalações limpas produzem árvore equivalente.
- [ ] **019 — Criar gate de instalação limpa.** Executar com cache frio e scripts controlados. **Aceite:** build e testes não dependem de `node_modules` antigo.
- [ ] **020 — Fixar Node e npm.** Alinhar `engines`, documentação e setups de CI. **Aceite:** versões locais e remotas coincidem.
- [ ] **021 — Corrigir `BrowserRouter.future`.** Adaptar ao React Router 7 e testar rotas relativas/splat. **Aceite:** erro TypeScript removido sem regressão de navegação.
- [ ] **022 — Corrigir `motion` em `PageTransition.tsx`.** Importar corretamente ou retirar apenas exports comprovadamente sem uso. **Aceite:** seis erros eliminados e baseline visual preservada.
- [ ] **023 — Reparar o lint baseline.** Corrigir o import de `minimatch`. **Aceite:** lint executa de verdade e retorna achados, não crash.
- [ ] **024 — Reparar o detector de scripts duplicados.** Corrigir `check-package-duplicate-scripts.mjs`. **Aceite:** as 228 chaves são analisadas sem crash.
- [ ] **025 — Reparar o gate de cobertura crítica.** Corrigir produtor, paths reais, abrangência e freshness do `coverage-summary.json`. **Aceite:** os três módulos-alvo são medidos por artefato atual.

**Gate de saída do tipo 2:** instalação limpa reproduzível e todos os validadores executando, ainda que revelem dívida real a ser tratada.

## Tipo 3 — Contratos TypeScript e qualidade de código

- [ ] **026 — Gerar tipos em arquivo temporário.** Obter fotografia diretamente de `doufsxqlfjyuvxuezpln` sem tocar o arquivo canônico. **Aceite:** contagens antes/depois registradas conforme `AGENTS.md`.
- [ ] **027 — Comparar tipos por conjunto completo.** Cruzar 391 tabelas, 196 views/MVs, 1.273 funções e 15 enums. **Entregável:** diff integral de correspondentes, omitidos e fantasmas.
- [ ] **028 — Validar objetos protegidos.** Preservar `personalization_techniques`, produtos, variantes, fornecedores, raw e `magazine_*`. **Aceite:** nenhuma tabela protegida desaparece.
- [ ] **029 — Validar o contrato `Product`.** Confirmar `price`, `sale_price`, `shortDescription`, `category_id` e `category_name`. **Aceite:** campos críticos presentes e usos compilando.
- [ ] **030 — Atualizar `types.ts` isoladamente.** Substituir somente após revisar o diff, sem casts oportunistas. **Aceite:** nenhum objeto vivo removido e todo fantasma classificado.
- [ ] **031 — Tipar `mv_stock_velocity`.** Corrigir `useStockVelocityPrefetch`. **Aceite:** erro TypeScript eliminado sem `as any`.
- [ ] **032 — Recalcular baselines de dívida.** Medir `as any`, `eslint-disable`, `ts-ignore`, `ts-expect-error` e `console.*`. **Aceite:** baseline cobre todo o código de produção.
- [ ] **033 — Reduzir os 54 `as any`.** Começar pelas fronteiras de banco e integrações. **Aceite:** cada lote reduz a baseline e possui teste de contrato.
- [ ] **034 — Revisar supressões.** Remover apenas quando houver tipagem ou teste equivalente. **Aceite:** nenhuma limpeza cosmética esconde falha real.
- [ ] **035 — Bloquear dívida nova.** Tornar novos warnings TypeScript/lint impeditivos e manter baseline antiga decrescente. **Aceite:** PR não aumenta dívida sem exceção registrada.

**Gate de saída do tipo 3:** typecheck verde, tipos sincronizados e baselines confiáveis sem perda dos invariantes do projeto.

## Tipo 4 — Ligações quebradas entre código e banco

- [ ] **036 — Testar o handler real de `webhook-inbound`.** Cobrir HMAC correto/incorreto, V1/V2, `slug`, persistência e idempotência sem respostas pré-programadas. **Aceite:** assinatura ou payload inválido nunca persiste.
- [ ] **037 — Reconciliar os contratos do webhook.** Unificar handler, schema compartilhado e testes; decidir o destino `inbound_webhook_events`. **Entregável:** ADR com envelope, headers, retenção e compatibilidade.
- [ ] **038 — Corrigir `webhook-inbound`.** Implementar o contrato aprovado. **Aceite:** evento válido persiste uma vez e nenhum 401/404 é sucesso do caminho positivo.
- [ ] **039 — Corrigir a semântica da simulação.** Distinguir `passed`, `rejected`, `infra_failed` e `skipped`. **Aceite:** 4xx/5xx e falha de persistência não contam como sucesso.
- [ ] **040 — Reconciliar simulação e webhook.** Alinhar header, HMAC e segredo; decidir a trilha `simulation_runs`/`simulation_logs`. **Restrição:** schema novo exige etapas 081–090 e `[AUTORIZAÇÃO BD]`; aposentadoria exige inventário das etapas 088–089, `[VALIDAÇÃO PO]` e, para retirada remota, `[AUTORIZAÇÃO DEPLOY]`.
- [ ] **041 — Separar `bitrix-sync` por ação.** Mapear API direta, `sync_full`, leitura armazenada e logs. **Aceite:** teste reproduz o falso verde do upsert.
- [ ] **042 — Corrigir persistência Bitrix.** Fazer erro de upsert falhar explicitamente. **Restrição:** schema/RLS novo exige `[AUTORIZAÇÃO BD]`; retirada de ação ou deploy exige inventário das etapas 088–089, `[VALIDAÇÃO PO]` e `[AUTORIZAÇÃO DEPLOY]`.
- [ ] **043 — Unificar `audit_logs` e `audit_log`.** Corrigir o helper compartilhado. **Aceite:** evento chega ao canal canônico e falha de logging não derruba a requisição.
- [ ] **044 — Corrigir telemetria de visual search.** Substituir `system_error_logs` pela observabilidade canônica. **Aceite:** request ID, função e causa ficam rastreáveis.
- [ ] **045 — Isolar `e2e_cleanup_audit`.** Restringir ao ambiente de teste ou formalizar o contrato. **Aceite:** E2E não exige tabela fantasma em produção.
- [ ] **046 — Procurar equivalente de `fn_ema_pipeline_health`.** Definir o shape exigido pelos dois hooks. **Aceite:** testes cobrem freshness, erro e ausência.
- [ ] **047 — Especificar a RPC EMA se necessária.** Desenhar migration mínima somente se não houver equivalente. **Restrição:** criação bloqueada até 081–090 e `[AUTORIZAÇÃO BD]`.
- [ ] **048 — Decidir o destino de `runAuthAudit`.** Confirmar ligação ou aposentadoria do código hoje dormente. **Aceite:** nenhuma RPC é criada para caller inexistente por suposição.
- [ ] **049 — Especificar diagnóstico de auth se aprovado.** Procurar equivalente ou definir retorno, grants e exposição. **Restrição:** adaptação/criação exige 081–090 e `[AUTORIZAÇÃO BD]`.
- [ ] **050 — Corrigir a tentativa de RPC `set_config`.** Definir RPC pública explícita ou remover a atribuição ineficaz. **Restrição:** RPC nova exige 081–090 e `[AUTORIZAÇÃO BD]`.
- [ ] **051 — `[VALIDAÇÃO PO]` Decidir o futuro de `stock_notes`.** Escolher feature completa ou remoção autorizada. **Aceite:** nenhuma implementação órfã permanece indefinida.
- [ ] **052 — Especificar notas de estoque se aprovadas.** Desenhar tabela, FKs, índices, RLS, policies e testes. **Restrição:** criação exige 081–090 e `[AUTORIZAÇÃO BD]`.
- [ ] **053 — Automatizar referências ausentes.** Detectar `.from()`/`.rpc()` reconhecendo Storage, clientes externos, wrappers e placeholders. **Aceite:** referência executável nova a objeto ausente bloqueia o PR.
- [ ] **054 — Criar contract test código ↔ catálogo.** Comparar inicialmente as chamadas com a fotografia temporária da etapa 026; na etapa 067, promover exatamente esse contrato revisado a artefato versionado e trocar a fonte do teste. **Aceite:** o teste inicial funciona sem depender de etapa futura e zero fantasma novo passa silenciosamente.
- [ ] **055 — Proibir `as any` para mascarar drift.** Exigir justificativa, owner e prazo para exceções. **Aceite:** drift é corrigido no contrato, não ocultado.

**Gate de saída do tipo 4:** caminhos ativos não consultam objetos inexistentes nem transformam erro em sucesso; propostas de schema continuam não aplicadas até autorização.

## Tipo 5 — Produto, UX e dados simulados

- [ ] **056 — Inventariar mocks e fallbacks.** Mapear BI, badges e estados mistos até notificações, IA, exportações e CTAs. **Entregável:** matriz `campo × origem × consumidor × risco × prazo`.
- [ ] **057 — `[AUTORIZAÇÃO DESIGN]` Tornar provenance estrutural.** Identificar origem por campo e bloquear notificações, IA, PDF/PPTX, WhatsApp e badges quando entrada decisória for simulada. **Aceite:** baseline visual aprovada.
- [ ] **058 — `[AUTORIZAÇÃO DESIGN]` Tornar o kit builder fail-explicit.** Sob feature flag, impedir `MOCK_BOXES/MOCK_ITEMS` silenciosos em produção e manter a flag desligada até aprovação do estado de erro. **Aceite:** fallback oculto impossível antes da etapa 064 e comparação visual aprovada.
- [ ] **059 — `[AUTORIZAÇÃO DESIGN]` Separar confiança real e simulada.** Exibir rating simulado separado do lead time real. **Aceite:** origem explícita e regressão visual aprovada.
- [ ] **060 — Isolar demos intencionais.** Garantir Trends mock apenas com `?demo=1` e ProductMatch mock apenas em desenvolvimento. **Aceite:** mocks impossíveis no build produtivo normal.
- [ ] **061 — `[AUTORIZAÇÃO EXTERNA]` Provar orçamento em staging.** Usar fixtures, credenciais de teste e provedores sandbox/dry-run; sem autorização, substituir chamadas externas por doubles locais. **Aceite:** jornada completa sem mutar produção e com limpeza definida.
- [ ] **062 — Provar magazine em staging.** Executar template, edição, publicação, leitura, reação e estado do leitor. **Aceite:** jornada repetível sobre as fixtures da etapa 061.
- [ ] **063 — `[AUTORIZAÇÃO EXTERNA]` Provar mockup em staging.** Executar upload, geração, cobrança simulada, aprovação, compartilhamento e auditoria; sem autorização, substituir provedores externos por doubles locais. **Aceite:** idempotência comprovada.
- [ ] **064 — Provar kit em staging.** Executar template, composição, variante, colaboração, comentários e share token. **Aceite:** nenhum fallback oculto.
- [ ] **065 — Provar recursos pessoais e organizacionais.** Validar notificações, preferências, favoritos, comparações e filtros com dois usuários e duas organizações. **Aceite:** isolamento correto.
- [ ] **066 — Publicar readiness por feature.** Classificar cada módulo como `ativo`, `parcial`, `demo`, `desativado` ou `legado`. **Aceite:** owner e evidência obrigatórios.

**Gate de saída do tipo 5:** jornadas críticas comprovadas em staging e nenhum dado simulado apresentado ou propagado como fato real.

## Tipo 6 — Banco, RLS, jobs e migrations

- [ ] **067 — Versionar fotografia canônica do `pg_catalog`.** Registrar contagens e assinaturas sem dados sensíveis. **Aceite:** diff reproduzível e reutilizado pelos contracts tests.
- [ ] **068 — Comparar com `SCHEMA_REFERENCE.md`.** Explicar cada adição, remoção e mudança. **Aceite:** nenhuma diferença permanece classificada apenas por suposição.
- [ ] **069 — Atribuir owner às 136 tabelas com estimativa zero.** Documentar finalidade e ciclo de vida. **Aceite:** nenhuma proposta de exclusão baseada só em `reltuples`.
- [ ] **070 — Mapear dependências de colunas.** Cobrir views, funções, triggers, FKs, índices, jobs e código. **Aceite:** coluna só é chamada órfã após prova completa.
- [ ] **071 — Revisar constraints e índices.** Medir uso, custo e planos de consulta. **Aceite:** proposta inclui evidência e rollback.
- [ ] **072 — Criar testes de acesso antes de mutar RLS.** Reproduzir a relação sem RLS, as duas relações `deny-all` e as nove views públicas. **Aceite:** matriz atual `anon/auth/service_role` registrada.
- [ ] **073 — Preparar correção da partição sem RLS.** Repetir a matriz de acesso após a mudança proposta. **Restrição:** aplicação somente na etapa 090 com `[AUTORIZAÇÃO BD]`.
- [ ] **074 — Revisar 530 rotinas `SECURITY DEFINER`.** Verificar caller, assinatura, `search_path`, grants e finalidade, priorizando expostas. **Aceite:** nenhuma revogação em massa.
- [ ] **075 — Revisar cinco enums sem coluna direta.** Procurar dependências em funções, migrations e clientes. **Aceite:** zero dependência antes de propor depreciação.
- [ ] **076 — Revisar 16 extensões.** Documentar owner, uso e necessidade. **Aceite:** remoção só vira candidata com prova de zero dependência.
- [ ] **077 — Produzir matriz de grants efetivos.** Separar ACL, ownership, `security_invoker` e resultado RLS. **Aceite:** nenhuma conclusão baseada apenas em grant nominal.
- [ ] **078 — Investigar `process-webhook-outbox`.** Confirmar consumidor substituto, segredo e idempotência. **Restrição:** reativar/alterar somente com `[AUTORIZAÇÃO BD]`.
- [ ] **079 — Investigar `pipeline-classify-categories`.** Confirmar substituição ou necessidade e atribuir owner. **Restrição:** reativação somente com `[AUTORIZAÇÃO BD]`.
- [ ] **080 — Investigar `vacuum-high-dead-tuples`.** Determinar causa sem mutação e preparar limites de lock/tempo e rollback. **Restrição:** correção na etapa 090, com DBA e `[AUTORIZAÇÃO BD]`.
- [ ] **081 — Reconciliar ledger e arquivos.** Mapear as 2.354 versões vivas contra os 1.673 arquivos locais, hashes e efeitos. **Aceite:** cada versão possui estado conhecido.
- [ ] **082 — Resolver conceitualmente 37 colisões.** Definir política forward-only sem renomear história aplicada. **Aceite:** freeze de migrations mantido até a etapa 087.
- [ ] **083 — Mapear 33 arquivos sem versão inicial.** Relacionar cada nome ao ledger, hash e efeito. **Aceite:** nenhuma renomeação retroativa.
- [ ] **084 — Consolidar o manifesto canônico.** Classificar 13 grupos duplicados, 74 arquivos envolvidos e 27 referências ausentes. **Aceite:** manifesto `versão ↔ arquivo ↔ hash ↔ efeito` aprovado por DBA.
- [ ] **085 — Reconstruir banco descartável.** Aplicar somente o manifesto aprovado desde zero. **Aceite:** execução integral sem colisão ou ordem implícita.
- [ ] **086 — Comparar reconstrução e canônico.** Cobrir tabelas, colunas, constraints, índices, RLS, funções, triggers, views, enums, grants e jobs. **Aceite:** diferenças classificadas e justificadas.
- [ ] **087 — Criar gate para migrations novas.** Exigir timestamp/nome único e referências válidas. **Aceite:** colisão ou nome inválido bloqueia PR; somente então encerrar o freeze.

**Gate de saída do tipo 6:** histórico reproduzível em banco descartável, acesso testado e toda alteração remota ainda condicionada à autorização explícita.

## Tipo 7 — Edge Functions, integrações, testes e observabilidade

- [ ] **088 — Inventariar deploy das 105 Edge Functions.** Registrar versão, caller, segredo, JWT, ambiente, último uso e owner, incluindo `test-*`. **Aceite:** nenhuma função sem estado de ciclo de vida.
- [ ] **089 — Reconciliar `config.toml` e deploy real.** Revisar as 39 entradas explícitas e as 66 sem seção própria. **Restrição:** aposentadoria exige prova de não uso e `[VALIDAÇÃO PO]`.
- [ ] **090 — `[AUTORIZAÇÃO BD]` `[AUTORIZAÇÃO DEPLOY]` Executar mudanças aprovadas em staging.** Aplicar somente migrations, jobs e deploys aprovados, com canário. **Aceite:** rollback testado; produção permanece intocada.
- [ ] **091 — Padronizar contratos de integração.** Unificar request/response, CORS, idempotência, timeout, retry e erro. **Aceite:** contratos críticos versionados.
- [ ] **092 — `[AUTORIZAÇÃO EXTERNA]` Criar smoke tests reais.** Cobrir CRM, webhook, e-mail, Storage, mockup, catálogo externo e callbacks com credenciais de teste. **Aceite:** nenhum teste muta produção.
- [ ] **093 — Unificar observabilidade.** Correlacionar frontend, Edge e banco por request ID e canal canônico de erro. **Aceite:** um fluxo crítico é rastreável ponta a ponta.
- [ ] **094 — Corrigir falso verde por segredo ausente.** Reportar checks como `bloqueado/inconclusivo`, nunca aprovado. **Aceite:** dashboard distingue skip, bloqueio e sucesso real.
- [ ] **095 — Ampliar regressão automatizada.** Expandir além dos 26 arquivos core, proibir rede inesperada, falhar em console errors/rejeições e corrigir `test.poolOptions` e `focus: "auto"`. **Aceite:** falhas reais não passam silenciosamente.
- [ ] **096 — Unificar E2E, visual e acessibilidade.** Executar sobre as mesmas fixtures críticas. **Aceite:** design, teclado e leitor de tela aprovados.
- [ ] **097 — Corrigir métricas de bundle.** Rejustificar baselines impossíveis e medir chunks por rota/gzip antes de dividir módulos grandes. **Aceite:** redução comprovada sem redesign.

**Gate de saída do tipo 7:** deploys e integrações inventariados, contratos exercitados, testes sem falsos verdes e rastreabilidade ponta a ponta.

## Tipo 8 — Limpeza autorizada e release

- [ ] **098 — `[VALIDAÇÃO PO]` `[AUTORIZAÇÃO EXTERNA]` `[AUTORIZAÇÃO DEPLOY]` Limpar duplicados exatos aprovados.** Preservar URLs/aliases de logos, auditar CDN, paths case-sensitive e referências externas e limitar a mudança aos alvos individualmente aprovados. **Aceite:** deploy validado; nenhum ativo público ou consumidor externo quebrado.
- [ ] **099 — `[VALIDAÇÃO PO]` Triar históricos e artefatos.** Avaliar relatórios, Graphify/QA e stubs em lote separado. **Aceite:** migrations, fixtures, snapshots, baselines e evidência histórica preservados.
- [ ] **100 — `[AUTORIZAÇÃO DEPLOY]` Gerar a release candidate.** Executar todos os gates, canário e rollback. **Aceite:** aprovação do PO, zero P1, vulnerabilidades altas remediadas ou formalmente aceitas e nenhum risco crítico sem owner.

**Gate de saída do tipo 8:** release candidate aprovada, reversível e sustentada por evidências; somente então o sistema pode ser declarado tecnicamente pronto.

## Ordem executiva recomendada

1. **Primeiro:** tipos 1 e 2 — proteger o que existe e recuperar o sinal de CI.
2. **Depois:** tipos 3 e 4 — corrigir contratos e caminhos quebrados sem mutar o banco.
3. **Em paralelo controlado:** tipo 5 — remover falsos dados e provar jornadas em staging.
4. **Antes de qualquer DDL:** tipo 6 — reconciliar integralmente migrations e reconstruir banco descartável.
5. **Com inventário confirmado:** tipo 7 — testar integrações e executar somente mudanças autorizadas em staging.
6. **Por último:** tipo 8 — limpeza aprovada e release candidate.

## Critério global de conclusão

O checklist só estará concluído quando os 100 itens estiverem marcados com evidência, as autorizações necessárias estiverem registradas, o worktree e o histórico de migrations forem reproduzíveis, os fluxos críticos estiverem aprovados e nenhum item P1 permanecer aberto. O design atual e o Supabase `doufsxqlfjyuvxuezpln` continuam sendo contratos protegidos durante toda a execução.
