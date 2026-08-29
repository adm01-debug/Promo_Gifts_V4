# Plano de melhorias e correções — checklist de 100 etapas

- **Data:** 26 de agosto de 2026
- **Projeto:** Promo Gifts V4
- **Supabase canônico:** `doufsxqlfjyuvxuezpln`
- **Auditoria de origem:** `docs/AUDITORIA_EXAUSTIVA_E_PLANO_100_ETAPAS_2026-08-26.md`
- **Baseline funcional auditada:** `e42fc237eabe8855304eb90db84e4b46b8ebab91`
- **Estado inicial:** 0 de 100 etapas concluídas
- **Estado comprovado em 28/08/2026:** 32 de 100 etapas concluídas local/operacionalmente; itens remotos continuam condicionados aos marcadores de autorização
- **Estado reconciliado em 29/08/2026:** 42 concluídas, 42 parciais, 15 dependentes de decisão/autorização externa e 1 pendente de release; a matriz item a item está no fim deste documento
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
| 1. Governança, proteção e aceite | 001–010 | 10 | Fixar baseline, owners, fluxos críticos e regras de mudança | 2/10 |
| 2. CI, dependências e gates | 011–025 | 15 | Recuperar sinal de qualidade e instalação determinística | 14/15 |
| 3. TypeScript e qualidade de código | 026–035 | 10 | Sincronizar tipos e reduzir dívida mensurável | 8/10 |
| 4. Ligações código ↔ banco | 036–055 | 20 | Corrigir contratos quebrados e falsos verdes | 13/20 |
| 5. Produto, UX e dados simulados | 056–066 | 11 | Impedir mocks enganosos e provar jornadas críticas | 2/11 |
| 6. Banco, jobs e migrations | 067–087 | 21 | Reconciliar `pg_catalog`, ACLs, jobs e histórico | 4/21 |
| 7. Edge, integrações e observabilidade | 088–097 | 10 | Provar deploys, contratos e rastreabilidade | 1/10 |
| 8. Limpeza e release | 098–100 | 3 | Limpar somente o aprovado e gerar release candidate | 0/3 |
| **Total** | **001–100** | **100** | **Estabilização completa** | **42/100** |

---

## Tipo 1 — Governança, proteção e critérios de aceite

- [x] **001 — Congelar a baseline auditável.** Registrar o commit `e42fc237`, a fotografia `pg_catalog` e a auditoria de origem como referências imutáveis. **Aceite:** toda mudança futura consegue declarar exatamente contra qual baseline foi comparada.
- [ ] **002 — Definir os fluxos críticos com o PO.** Classificar catálogo, busca, orçamento, carrinho, estoque, mockup, magazine, kit e CRM. **Entregável:** matriz `fluxo × owner × criticidade × critério de sucesso` aprovada.
- [ ] **003 — Mapear todas as rotas.** Ligar cada rota pública, autenticada e administrativa ao componente, hook, serviço, tabela/RPC, Edge Function e teste correspondente. **Aceite:** nenhuma rota sem owner ou dependência identificada.
- [ ] **004 — Proteger o design existente.** Capturar baselines visuais desktop e mobile dos fluxos críticos. **Aceite:** comparação visual versionada antes de qualquer correção perceptível.
- [ ] **005 — Criar fixtures confiáveis.** Preparar dados estáveis, anonimizados e reproduzíveis para os fluxos críticos. **Aceite:** testes não dependem de dados voláteis de produção.
- [ ] **006 — Implantar template de mudança.** Exigir impacto, contratos tocados, testes, autorização e rollback; congelar migrations novas até a etapa 087. **Aceite:** PR incompleto não avança.
- [ ] **007 — Definir feature flags.** Cobrir módulos parciais, mocks produtivos e integrações instáveis. **Aceite:** funcionalidade incompleta não fica exposta por acidente.
- [ ] **008 — Formalizar ownership.** Atribuir responsáveis por domínio e pelos arquivos protegidos em `AGENTS.md`. **Entregável:** `CODEOWNERS` coerente com os responsáveis reais.
- [ ] **009 — Validar recuperação e rollback.** Testar restauração sem tocar produção e documentar compensação forward-only. **Aceite:** RTO/RPO, owner e procedimento comprovados.
- [x] **010 — Fixar a Definition of Done.** Exigir build, typecheck, lint, testes, E2E crítico, regressão visual, contrato DB e observabilidade verdes. **Aceite:** declaração de “pronto” depende do PO e de evidências.

**Gate de saída do tipo 1:** fluxos críticos, owners, baseline visual, fixtures, autorizações e Definition of Done aprovados.

## Tipo 2 — CI, dependências e gates determinísticos

- [x] **011 — `[AUTORIZAÇÃO GITHUB]` Restaurar capacidade do GitHub Actions.** Resolver o bloqueio de orçamento. **Aceite:** workflow mínimo inicia e termina com jobs realmente executados.
- [ ] **012 — Classificar os 30 runs vermelhos.** Separar orçamento, credencial, runner, flake, contrato e defeito de produto. **Entregável:** painel causal, sem assumir que toda falha tem a mesma origem.
- [ ] **013 — `[AUTORIZAÇÃO GITHUB]` Reorganizar workflows.** Separar obrigatórios, agendados e opcionais e reduzir schedules redundantes. **Aceite:** gates obrigatórios continuam bloqueantes.
- [ ] **014 — `[AUTORIZAÇÃO GITHUB]` Confirmar e corrigir branch protection.** Revisar Required Checks e Gate 0 depois da restauração do CI e corrigir somente divergências aprovadas. **Aceite:** `main` não aceita merge sem os checks definidos.
- [x] **015 — Escolher o package manager canônico.** Adotar npm ou alternativa explicitamente aprovada antes de remover locks. **Aceite:** uma única fonte de resolução documentada.
- [x] **016 — Resolver React 19 × `cmdk@0.2.1`.** Atualizar ou substituir com testes dos command menus. **Aceite:** `npm ci` funciona sem `--legacy-peer-deps`.
- [x] **017 — Alinhar a geração das dependências.** Compatibilizar React, React DOM, tipos, Router, Vite e plugins. **Aceite:** árvore sem peer conflict e sem dupla geração React 18/19.
- [x] **018 — Regenerar somente o lock aprovado.** Fazer commit isolado e comparar a árvore resolvida. **Aceite:** duas instalações limpas produzem árvore equivalente.
- [x] **019 — Criar gate de instalação limpa.** Executar com cache frio e scripts controlados. **Aceite:** build e testes não dependem de `node_modules` antigo.
- [x] **020 — Fixar Node e npm.** Alinhar `engines`, documentação e setups de CI. **Aceite:** versões locais e remotas coincidem.
- [x] **021 — Corrigir `BrowserRouter.future`.** Adaptar ao React Router 7 e testar rotas relativas/splat. **Aceite:** erro TypeScript removido sem regressão de navegação.
- [x] **022 — Corrigir `motion` em `PageTransition.tsx`.** Importar corretamente ou retirar apenas exports comprovadamente sem uso. **Aceite:** seis erros eliminados e baseline visual preservada.
- [x] **023 — Reparar o lint baseline.** Corrigir o import de `minimatch`. **Aceite:** lint executa de verdade e retorna achados, não crash.
- [x] **024 — Reparar o detector de scripts duplicados.** Corrigir `check-package-duplicate-scripts.mjs`. **Aceite:** as 228 chaves são analisadas sem crash.
- [x] **025 — Reparar o gate de cobertura crítica.** Corrigir produtor, paths reais, abrangência e freshness do `coverage-summary.json`. **Aceite:** os três módulos-alvo são medidos por artefato atual.

**Gate de saída do tipo 2:** instalação limpa reproduzível e todos os validadores executando, ainda que revelem dívida real a ser tratada.

## Tipo 3 — Contratos TypeScript e qualidade de código

- [x] **026 — Gerar tipos em arquivo temporário.** Obter fotografia diretamente de `doufsxqlfjyuvxuezpln` sem tocar o arquivo canônico. **Aceite:** contagens antes/depois registradas conforme `AGENTS.md`.
- [x] **027 — Comparar tipos por conjunto completo.** Cruzar 391 tabelas, 196 views/MVs, 1.273 funções e 15 enums. **Entregável:** diff integral de correspondentes, omitidos e fantasmas.
- [x] **028 — Validar objetos protegidos.** Preservar `personalization_techniques`, produtos, variantes, fornecedores, raw e `magazine_*`. **Aceite:** nenhuma tabela protegida desaparece.
- [x] **029 — Validar o contrato `Product`.** Confirmar `price`, `sale_price`, `shortDescription`, `category_id` e `category_name`. **Aceite:** campos críticos presentes e usos compilando.
- [x] **030 — Atualizar `types.ts` isoladamente.** Substituir somente após revisar o diff, sem casts oportunistas. **Aceite:** nenhum objeto vivo removido e todo fantasma classificado.
- [x] **031 — Tipar `mv_stock_velocity`.** Corrigir `useStockVelocityPrefetch`. **Aceite:** erro TypeScript eliminado sem `as any`.
- [x] **032 — Recalcular baselines de dívida.** Medir `as any`, `eslint-disable`, `ts-ignore`, `ts-expect-error` e `console.*`. **Aceite:** baseline cobre todo o código de produção.
- [ ] **033 — Reduzir os 54 `as any`.** Começar pelas fronteiras de banco e integrações. **Aceite:** cada lote reduz a baseline e possui teste de contrato.
- [ ] **034 — Revisar supressões.** Remover apenas quando houver tipagem ou teste equivalente. **Aceite:** nenhuma limpeza cosmética esconde falha real.
- [x] **035 — Bloquear dívida nova.** Tornar novos warnings TypeScript/lint impeditivos e manter baseline antiga decrescente. **Aceite:** PR não aumenta dívida sem exceção registrada.

**Gate de saída do tipo 3:** typecheck verde, tipos sincronizados e baselines confiáveis sem perda dos invariantes do projeto.

## Tipo 4 — Ligações quebradas entre código e banco

- [x] **036 — Testar o handler real de `webhook-inbound`.** Cobrir HMAC correto/incorreto, V1/V2, `slug`, persistência e idempotência sem respostas pré-programadas. **Aceite:** assinatura ou payload inválido nunca persiste.
- [x] **037 — Reconciliar os contratos do webhook.** Unificar handler, schema compartilhado e testes; decidir o destino `inbound_webhook_events`. **Entregável:** ADR com envelope, headers, retenção e compatibilidade.
- [x] **038 — Corrigir `webhook-inbound`.** Implementar o contrato aprovado. **Aceite:** evento válido persiste uma vez e nenhum 401/404 é sucesso do caminho positivo.
- [x] **039 — Corrigir a semântica da simulação.** Distinguir `passed`, `rejected`, `infra_failed` e `skipped`. **Aceite:** 4xx/5xx e falha de persistência não contam como sucesso.
- [ ] **040 — Reconciliar simulação e webhook.** Alinhar header, HMAC e segredo; decidir a trilha `simulation_runs`/`simulation_logs`. **Restrição:** schema novo exige etapas 081–090 e `[AUTORIZAÇÃO BD]`; aposentadoria exige inventário das etapas 088–089, `[VALIDAÇÃO PO]` e, para retirada remota, `[AUTORIZAÇÃO DEPLOY]`.
- [x] **041 — Separar `bitrix-sync` por ação.** Mapear API direta, `sync_full`, leitura armazenada e logs. **Aceite:** teste reproduz e impede regressão do falso verde do upsert.
- [x] **042 — Corrigir persistência Bitrix.** Fazer erro de upsert falhar explicitamente. **Restrição:** schema/RLS novo exige `[AUTORIZAÇÃO BD]`; retirada de ação ou deploy exige inventário das etapas 088–089, `[VALIDAÇÃO PO]` e `[AUTORIZAÇÃO DEPLOY]`.
- [x] **043 — Unificar `audit_logs` e `audit_log`.** Corrigir o helper compartilhado. **Aceite:** evento chega ao canal canônico e falha de logging não derruba a requisição.
- [x] **044 — Corrigir telemetria de visual search.** Substituir `system_error_logs` pela observabilidade canônica. **Aceite:** request ID, função e causa ficam rastreáveis.
- [ ] **045 — Isolar `e2e_cleanup_audit`.** Restringir ao ambiente de teste ou formalizar o contrato. **Aceite:** E2E não exige tabela fantasma em produção.
- [x] **046 — Procurar equivalente de `fn_ema_pipeline_health`.** Definir o shape exigido pelos dois hooks. **Aceite:** testes cobrem freshness, erro e ausência.
- [x] **047 — Especificar a RPC EMA se necessária.** Desenhar migration mínima somente se não houver equivalente. **Restrição:** criação bloqueada até 081–090 e `[AUTORIZAÇÃO BD]`.
- [ ] **048 — Decidir o destino de `runAuthAudit`.** Confirmar ligação ou aposentadoria do código hoje dormente. **Aceite:** nenhuma RPC é criada para caller inexistente por suposição.
- [ ] **049 — Especificar diagnóstico de auth se aprovado.** Procurar equivalente ou definir retorno, grants e exposição. **Restrição:** adaptação/criação exige 081–090 e `[AUTORIZAÇÃO BD]`.
- [x] **050 — Corrigir a tentativa de RPC `set_config`.** Definir RPC pública explícita ou remover a atribuição ineficaz. **Restrição:** RPC nova exige 081–090 e `[AUTORIZAÇÃO BD]`.
- [ ] **051 — `[VALIDAÇÃO PO]` Decidir o futuro de `stock_notes`.** Escolher feature completa ou remoção autorizada. **Aceite:** nenhuma implementação órfã permanece indefinida.
- [ ] **052 — Especificar notas de estoque se aprovadas.** Desenhar tabela, FKs, índices, RLS, policies e testes. **Restrição:** criação exige 081–090 e `[AUTORIZAÇÃO BD]`.
- [x] **053 — Automatizar referências ausentes.** Detectar `.from()`/`.rpc()` reconhecendo Storage, clientes externos, wrappers e placeholders. **Aceite:** referência executável nova a objeto ausente bloqueia o PR.
- [x] **054 — Criar contract test código ↔ catálogo.** Comparar inicialmente as chamadas com a fotografia temporária da etapa 026; na etapa 067, promover exatamente esse contrato revisado a artefato versionado e trocar a fonte do teste. **Aceite:** o teste inicial funciona sem depender de etapa futura e zero fantasma novo passa silenciosamente.
- [ ] **055 — Proibir `as any` para mascarar drift.** Exigir justificativa, owner e prazo para exceções. **Aceite:** drift é corrigido no contrato, não ocultado.

**Gate de saída do tipo 4:** caminhos ativos não consultam objetos inexistentes nem transformam erro em sucesso; propostas de schema continuam não aplicadas até autorização.

## Tipo 5 — Produto, UX e dados simulados

- [x] **056 — Inventariar mocks e fallbacks.** Mapear BI, badges e estados mistos até notificações, IA, exportações e CTAs. **Entregável:** matriz `campo × origem × consumidor × risco × prazo`.
- [ ] **057 — `[AUTORIZAÇÃO DESIGN]` Tornar provenance estrutural.** Identificar origem por campo e bloquear notificações, IA, PDF/PPTX, WhatsApp e badges quando entrada decisória for simulada. **Aceite:** baseline visual aprovada.
- [ ] **058 — `[AUTORIZAÇÃO DESIGN]` Tornar o kit builder fail-explicit.** Sob feature flag, impedir `MOCK_BOXES/MOCK_ITEMS` silenciosos em produção e manter a flag desligada até aprovação do estado de erro. **Aceite:** fallback oculto impossível antes da etapa 064 e comparação visual aprovada.
- [ ] **059 — `[AUTORIZAÇÃO DESIGN]` Separar confiança real e simulada.** Exibir rating simulado separado do lead time real. **Aceite:** origem explícita e regressão visual aprovada.
- [x] **060 — Isolar demos intencionais.** Garantir Trends mock apenas com `?demo=1` e ProductMatch mock apenas em desenvolvimento. **Aceite:** mocks impossíveis no build produtivo normal.
- [ ] **061 — `[AUTORIZAÇÃO EXTERNA]` Provar orçamento em staging.** Usar fixtures, credenciais de teste e provedores sandbox/dry-run; sem autorização, substituir chamadas externas por doubles locais. **Aceite:** jornada completa sem mutar produção e com limpeza definida.
- [ ] **062 — Provar magazine em staging.** Executar template, edição, publicação, leitura, reação e estado do leitor. **Aceite:** jornada repetível sobre as fixtures da etapa 061.
- [ ] **063 — `[AUTORIZAÇÃO EXTERNA]` Provar mockup em staging.** Executar upload, geração, cobrança simulada, aprovação, compartilhamento e auditoria; sem autorização, substituir provedores externos por doubles locais. **Aceite:** idempotência comprovada.
- [ ] **064 — Provar kit em staging.** Executar template, composição, variante, colaboração, comentários e share token. **Aceite:** nenhum fallback oculto.
- [ ] **065 — Provar recursos pessoais e organizacionais.** Validar notificações, preferências, favoritos, comparações e filtros com dois usuários e duas organizações. **Aceite:** isolamento correto.
- [ ] **066 — Publicar readiness por feature.** Classificar cada módulo como `ativo`, `parcial`, `demo`, `desativado` ou `legado`. **Aceite:** owner e evidência obrigatórios.

**Gate de saída do tipo 5:** jornadas críticas comprovadas em staging e nenhum dado simulado apresentado ou propagado como fato real.

## Tipo 6 — Banco, RLS, jobs e migrations

- [x] **067 — Versionar fotografia canônica do `pg_catalog`.** Registrar contagens e assinaturas sem dados sensíveis. **Aceite:** diff reproduzível e reutilizado pelos contracts tests.
- [x] **068 — Comparar com `SCHEMA_REFERENCE.md`.** Explicar cada adição, remoção e mudança. **Aceite:** nenhuma diferença permanece classificada apenas por suposição.
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
- [x] **082 — Resolver conceitualmente 37 colisões.** Definir política forward-only sem renomear história aplicada. **Aceite:** freeze de migrations mantido até a etapa 087.
- [ ] **083 — Mapear 33 arquivos sem versão inicial.** Relacionar cada nome ao ledger, hash e efeito. **Aceite:** nenhuma renomeação retroativa.
- [ ] **084 — Consolidar o manifesto canônico.** Classificar 13 grupos duplicados, 74 arquivos envolvidos e 27 referências ausentes. **Aceite:** manifesto `versão ↔ arquivo ↔ hash ↔ efeito` aprovado por DBA.
- [ ] **085 — Reconstruir banco descartável.** Aplicar somente o manifesto aprovado desde zero. **Aceite:** execução integral sem colisão ou ordem implícita.
- [ ] **086 — Comparar reconstrução e canônico.** Cobrir tabelas, colunas, constraints, índices, RLS, funções, triggers, views, enums, grants e jobs. **Aceite:** diferenças classificadas e justificadas.
- [x] **087 — Criar gate para migrations novas.** Exigir timestamp/nome único e referências válidas. **Aceite:** colisão ou nome inválido bloqueia PR; somente então encerrar o freeze.

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
- [x] **097 — Corrigir métricas de bundle.** Rejustificar baselines impossíveis e medir chunks por rota/gzip antes de dividir módulos grandes. **Aceite:** redução comprovada sem redesign.

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

---

## Reconciliação exaustiva item a item — 29/08/2026

Esta matriz revisa os critérios originais, não apenas a existência de código. Um
item parcial pode ter implementação extensa e testes verdes, mas continua aberto
quando falta uma jornada, owner, aprovação, ambiente ou prova exigida pelo próprio
critério de aceite.

| Estado | Quantidade | Interpretação |
|---|---:|---|
| ✅ Concluída | 42 | Critério comprovado por artefato versionado e teste/auditoria correspondente |
| 🟡 Parcial | 42 | Há implementação ou evidência, mas o aceite integral ainda não foi atingido |
| ⏸ Dependência externa | 15 | Exige decisão nominal, configuração, credencial, staging, DBA ou autorização indicada |
| ⬜ Pendente | 1 | Ainda não pode ser encerrada |

| ID | Estado | Evidência e conclusão da revisão |
|---:|:---:|---|
| 001 | ✅ | Baseline, commit, fotografia e auditoria estão versionados e preservados. |
| 002 | ⏸ | Há inventários de fluxos, mas falta matriz final `owner × criticidade × sucesso` aprovada pelo PO. |
| 003 | 🟡 | Rotas e consumidores foram amplamente inventariados; não existe ainda mapa integral rota → UI → hook → DB/Edge → teste → owner. |
| 004 | 🟡 | Foram criadas 32 baselines Linux para dialogs/toasts; faltam desktop/mobile de todos os fluxos críticos. |
| 005 | 🟡 | Existem fixtures e 1.520 simulações determinísticas, porém não cobrem todas as jornadas críticas e staging. |
| 006 | 🟡 | Templates/gates existem, mas a obrigatoriedade uniforme nos 100+ workflows e em todo PR ainda não foi comprovada. |
| 007 | 🟡 | Há flags e fail-closed em módulos sensíveis; módulos parciais ainda não possuem cobertura uniforme. |
| 008 | 🟡 | `CODEOWNERS` e arquivos protegidos existem; ownership de domínio por responsável real ainda não foi aprovado. |
| 009 | 🟡 | Dump estrutural foi restaurado em PG17 descartável; faltam RTO/RPO e rollback/canário integral comprovados. |
| 010 | ✅ | Definition of Done e gates de saída foram formalizados neste plano e nos workflows. |
| 011 | ✅ | Capacidade do Actions foi restaurada e jobs voltaram a executar; a renovação foi confirmada pelo PO. |
| 012 | 🟡 | Falhas recentes foram classificadas e reproduzidas; não há painel causal fechado para os 30 runs históricos. |
| 013 | 🟡 | Runners, browsers e dependências foram corrigidos; a reorganização completa de 100+ workflows não foi concluída. |
| 014 | ⏸ | Ruleset protege `main`, mas o required check final só pode ser fixado após o gate hospedado ficar verde. |
| 015 | ✅ | npm é canônico: `packageManager: npm@10.9.7`, runtime fixado e produção sem comando Bun. |
| 016 | ✅ | React 19 e command menus reconciliados; `npm ci` funciona sem peer-deps permissivo. |
| 017 | ✅ | React/DOM/types/Router/Vite foram alinhados e reinstalados com árvore íntegra. |
| 018 | ✅ | `package-lock.json` aprovado foi exercitado por instalações limpas locais e hospedadas equivalentes. |
| 019 | ✅ | CI usa `npm ci`, valida lock/runtime e executa build/testes sem reutilizar `node_modules` local. |
| 020 | ✅ | Node 22.22.1 e npm 10.9.7 estão fixados e o contrato lê `.nvmrc` como SSOT. |
| 021 | ✅ | `BrowserRouter` usa a API v7 (`useTransitions={false}`) e o contrato de roteamento passou. |
| 022 | ✅ | Contrato de motion/PageTransition foi corrigido sem regressão visual conhecida. |
| 023 | ✅ | Lint executa integralmente e o baseline retorna achados reais, sem crash de `minimatch`. |
| 024 | ✅ | Detector de chaves duplicadas analisa o `package.json` sem crash. |
| 025 | ✅ | Cobertura crítica usa artefato atual e os 327 testes do gate passaram. |
| 026 | ✅ | Tipos foram primeiro gerados/revisados em arquivo temporário contra `doufsxqlfjyuvxuezpln`, com contagens registradas. |
| 027 | ✅ | Comparação integral cobriu 391 tabelas, 196 views/MVs, rotinas e 15 enums; o retrato posterior contém 1.280 rotinas. |
| 028 | ✅ | Todas as relações protegidas por `AGENTS.md` permanecem no contrato gerado. |
| 029 | ✅ | `Product` preserva `price`, `sale_price`, `shortDescription`, `category_id` e `category_name`. |
| 030 | ✅ | `types.ts` foi regenerado isoladamente no commit `85a137691`, preservando 391 tabelas/196 views. |
| 031 | ✅ | `mv_stock_velocity` está tipada sem o cast que mascarava o contrato. |
| 032 | ✅ | Baselines de TypeScript/ESLint e supressões foram recalculadas e possuem ratchet. |
| 033 | 🟡 | Houve redução em fronteiras críticas, mas a meta de revisar os 54 `as any` originais não foi encerrada por lote. |
| 034 | 🟡 | Supressões tocadas foram justificadas; falta revisão nominal de todo o inventário legado. |
| 035 | ✅ | Gates bloqueiam aumento de dívida TypeScript/ESLint além do baseline. |
| 036 | ✅ | Handler real do webhook cobre HMAC válido/inválido, V1/V2, slug e idempotência. |
| 037 | ✅ | ADR do envelope/headers/persistência do webhook foi versionado. |
| 038 | ✅ | `webhook-inbound` corrigido, testado e implantado; erro não é convertido em happy-path. |
| 039 | ✅ | Simulação separa `passed`, `rejected`, `infra_failed` e `skipped`; persistência indisponível falha fechada. |
| 040 | 🟡 | Header/HMAC e fail-closed foram melhorados; persistência, lifecycle, sandbox de produto e decisão efêmera × persistente seguem abertos. |
| 041 | ✅ | Bitrix foi separado por ação e o falso verde do caminho de upsert está coberto. |
| 042 | ✅ | Falha de persistência Bitrix agora propaga erro; storage canônico continua fora do escopo autorizado. |
| 043 | ✅ | Helper aponta para o canal canônico de auditoria e não derruba a requisição em falha secundária. |
| 044 | ✅ | Visual search registra no canal canônico com contexto correlacionável. |
| 045 | 🟡 | A referência foi detectada, mas `e2e_cleanup_audit` ainda não foi formalizada ou isolada por ambiente. |
| 046 | ✅ | Equivalentes canônicos `fn_rupture_health_check`/`fn_rupture_quick_stats` foram encontrados e testados. |
| 047 | ✅ | A investigação concluiu que nova RPC EMA não é necessária; a fronteira protegida `ema-pipeline-health` reutiliza RPCs existentes. |
| 048 | 🟡 | `runAuthAudit` foi identificado como dormente e fail-soft; ligação ou aposentadoria ainda não foi decidida. |
| 049 | 🟡 | Ausência da RPC foi catalogada; retorno, grants e exposição só serão especificados se o caller for aprovado. |
| 050 | ✅ | Uso inválido de `set_config` via PostgREST foi removido/substituído por contrato explícito. |
| 051 | ⏸ | `stock_notes` segue sem consumidor ativo e aguarda decisão nominal de produto. |
| 052 | ⏸ | Tabela/FKs/RLS de notas não serão inventados antes da decisão da etapa 051 e autorização por objeto. |
| 053 | ✅ | Scanner reconhece `.from()`/`.rpc()`, wrappers e exceções classificadas; novas ausências bloqueiam o gate. |
| 054 | ✅ | Catálogo temporário e contract tests cruzam chamadas de código com referências Supabase. |
| 055 | 🟡 | Fronteiras corrigidas deixaram de esconder drift, mas a proibição global de `as any` ainda depende da etapa 033. |
| 056 | ✅ | Matriz de mocks/fallbacks e consumidores foi inventariada. |
| 057 | ⏸ | Provenance por campo e bloqueios perceptíveis dependem de aprovação de design. |
| 058 | ⏸ | Kit fail-explicit depende de decisão de produto/design e prova da jornada da etapa 064. |
| 059 | ⏸ | Separação visual entre confiança real/simulada aguarda baseline e aprovação de design. |
| 060 | ✅ | Trends mock exige `?demo=1`; ProductMatch mock fica restrito ao desenvolvimento. |
| 061 | ⏸ | Orçamento precisa de staging, credenciais de teste/sandbox e autorização externa. |
| 062 | 🟡 | Testes de magazine e simulações de publicação existem; jornada completa em staging não foi executada. |
| 063 | ⏸ | Mockup completo depende de credenciais sandbox, cobrança simulada e autorização externa. |
| 064 | 🟡 | Contratos do kit existem; composição/colaboração/share token ainda não foram provados ponta a ponta em staging. |
| 065 | 🟡 | Testes unitários/contratos cobrem partes; matriz dois usuários × duas organizações não foi executada integralmente. |
| 066 | 🟡 | Há inventários de módulos, mas readiness final com owner/evidência por feature não está publicada. |
| 067 | ✅ | Fotografia sanitizada de `pg_catalog` está versionada e reutilizada pela auditoria/contratos. |
| 068 | ✅ | Deltas contra `SCHEMA_REFERENCE.md` foram classificados; diferenças sem proveniência permanecem explicitamente “não reconciliadas”, sem suposição de perda/lixo. |
| 069 | 🟡 | As 136 estimativas zero estão listadas; falta owner e lifecycle nominal para cada relação. |
| 070 | 🟡 | Dependências de objetos críticos foram cavadas; o mapa integral coluna × todos os consumidores não terminou. |
| 071 | 🟡 | Constraints/1.170 índices foram inventariados; falta plano de uso/custo por candidato. |
| 072 | 🟡 | ACL/RLS/anon foram auditados read-only; falta matriz executável completa dos objetos excepcionais por papel. |
| 073 | ⏸ | Correção da partição sem RLS exige migration forward-only e autorização específica de banco. |
| 074 | 🟡 | Lints e allowlist cobrem rotinas expostas, mas as 530 `SECURITY DEFINER` não têm revisão humana completa por caller/finalidade. |
| 075 | 🟡 | Cinco enums foram inventariados; prova integral de dependência/zero uso não foi concluída. |
| 076 | 🟡 | Dezesseis extensões foram inventariadas; owner/necessidade individual ainda não foram fechados. |
| 077 | 🟡 | Grants, `security_invoker` e RLS foram comparados em recortes críticos; matriz efetiva integral segue aberta. |
| 078 | 🟡 | Job `process-webhook-outbox` foi identificado, mas consumidor substituto/segredo/idempotência não foram fechados. |
| 079 | 🟡 | `pipeline-classify-categories` está inventariado; substituição/owner ainda não têm prova final. |
| 080 | 🟡 | `vacuum-high-dead-tuples` foi levantado sem mutação; causa, limites de lock/tempo e rollback não estão aprovados. |
| 081 | 🟡 | Manifesto cobre 2.354 versões, mas 1.247 são live-only e 531 arquivos locais não têm versão viva; efeito equivalente não está provado para todos. |
| 082 | ✅ | As 37 colisões têm política forward-only e não houve renomeação/replay retroativo. |
| 083 | 🟡 | Os 33 nomes sem versão têm hash/tamanho/efeito lexical, mas 0/33 possui equivalência exata com o ledger. |
| 084 | 🟡 | Manifestos classificam duplicatas e ausências; falta aprovação DBA do mapeamento versão ↔ arquivo ↔ efeito. |
| 085 | ⏸ | Dump estrutural foi restaurado, mas replay integral de migrations foi corretamente bloqueado até manifesto aprovado. |
| 086 | 🟡 | Estrutura canônica foi reconstruída em PG17; não houve comparação pós-replay de um manifesto aprovado. |
| 087 | ✅ | Gate bloqueia timestamps/nomes colidentes ou inválidos em migrations novas. |
| 088 | 🟡 | Autorização cobre 107/107 e descritores 106/106; faltam owner, último uso, segredos e lifecycle completos. |
| 089 | 🟡 | Drift repo × live foi comparado; `mcp-query` é exceção canônica documentada, mas lifecycle/config integral continua aberto. |
| 090 | ⏸ | Deploys/migrations autorizados anteriores foram aplicados; staging canário e rollback integral ainda não estão comprovados. |
| 091 | 🟡 | Webhook, CRM e funções críticas ganharam contratos; padronização de todas as integrações não terminou. |
| 092 | ⏸ | Happy-path CRM/webhook/e-mail depende de segredos/JWTs de teste ainda ausentes. |
| 093 | 🟡 | Logging/request IDs foram melhorados; falta provar rastreio completo frontend → Edge → banco. |
| 094 | 🟡 | Gates `--require-live` e bloqueios por secret evitam falso verde local; falta confirmação hospedada de todos os dashboards desta branch. |
| 095 | 🟡 | A suíte ampla passou dezenas de milhares de testes; o fuzz de 1.000 cenários agora é hermético e Edge coverage mede 65/107 implantáveis. Cobertura de todas as jornadas e flakes remotos segue aberta. |
| 096 | 🟡 | Dialogs compartilham testes visual/a11y; as mesmas fixtures ainda não cobrem todos os E2E críticos. |
| 097 | ✅ | Bundle/chunks são medidos com orçamento realista; build atual permanece abaixo do limite. |
| 098 | ⏸ | Nenhum duplicado/ativo foi removido sem validação nominal do PO e consumidores externos. |
| 099 | ⏸ | Relatórios, Graphify, snapshots, fixtures e históricos foram preservados até triagem nominal. |
| 100 | ⬜ | Release candidate depende dos gates remotos, branch protection, staging/canário e aceite do PO. |

### Gaps de infraestrutura descobertos nesta revisão

- Os dois MCPs de banco disponíveis nesta sessão não apontam para o projeto
  `doufsxqlfjyuvxuezpln`: um expõe um catálogo menor e o outro um PostgreSQL 15
  com tabelas de outra aplicação. Ambos foram descartados como evidência do banco
  canônico. Até a configuração ser corrigida, validação live usa a Management API
  Supabase somente leitura no GitHub Actions e snapshots `pg_catalog` versionados.
- `mcp-query` existe somente no ambiente canônico e foi classificada no arquivo
  `audit/edge-functions-canonical-only.json` como gateway MCP administrado fora do
  deploy normal deste repositório. Ela não deve ser copiada ou apagada por inferência.
- Code scanning continua indisponível para este repositório privado. O workflow
  agora diferencia “capacidade não habilitada” de erro inesperado e volta a
  executar a análise automaticamente quando o recurso estiver habilitado.

### Funções sugeridas ou parciais que permanecem abertas

1. `simulation-orchestrator`: persistência/lifecycle, sandbox de produto e
   decisão efêmera versus persistente (040).
2. `runAuthAudit`: caller dormente; decidir ligação ou aposentadoria antes de
   qualquer RPC nova (048–049).
3. `stock_notes`: hook sem consumidor/objeto canônico; decisão de produto antes
   de tabela, RLS e policies (051–052).
4. `e2e_cleanup_audit`: isolar em teste ou formalizar contrato (045).
5. Bitrix: o falso verde foi eliminado, mas storage canônico ainda depende de
   decisão/autorização específica (041–042).
6. Aprovação de desconto: RPCs transacionais e testes de contrato existem; a
   confirmação live de trigger/policies/notificação única permanece no gate
   canônico read-only e em teste opt-in autenticado.
7. Jobs `process-webhook-outbox`, `pipeline-classify-categories` e
   `vacuum-high-dead-tuples`: investigação/owner/limites ainda parciais (078–080).
