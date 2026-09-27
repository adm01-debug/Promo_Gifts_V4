# Kit Maker — plano de correções e melhorias em 50 etapas

Data: 27/09/2026. Responsável pela elaboração: Codex. Escopo exclusivo: Kit Maker, rota `/montar-kit` e seus contratos de dados, biblioteca, IA, personalização e orçamento.

**Estado inicial: 0/50 etapas encerradas neste plano.** Isso não significa que o módulo esteja vazio: várias funcionalidades já existem e devem ser preservadas. Cada etapa abaixo manda verificar primeiro, corrigir somente a lacuna e produzir evidência. Criar ou aprovar este documento não comprova sua execução.

**Autorização desta entrega:** criar e commitar documentação. Não autoriza executar o plano, alterar dados/schema, criar contas, consumir serviços pagos, mudar gates, fazer merge ou publicar em produção. Autorizações anteriores só podem ser reutilizadas quando o objeto, operação e escopo coincidirem e houver referência verificável.

## 1. Base, evidências e limites

Base remota examinada: `origin/main` em `46d36b6d6218b4d2861b29e6360fe36b230fc1f7`. A pasta principal local estava em `b55faeb825a671a626045b2efa43eecaee4f468d`, 34 commits atrás; foi preservada. A análise usou uma worktree isolada. Confirmar novamente os SHAs antes de executar, pois outros agentes continuam trabalhando.

Fontes de escopo, preservadas sem sobrescrita:

- [Plano de 100 etapas de 22/09](KIT_MAKER_PLANO_MELHORIAS_100_ETAPAS_2026-09-22.md), IDs `KM3-001` a `KM3-100`.
- [Plano de finalização de 20 etapas de 23/09](KIT_MAKER_PLANO_FINALIZACAO_20_ETAPAS_2026-09-23.md), referido abaixo como `F20`.
- [Código do módulo no SHA auditado](https://github.com/adm01-debug/Promo_Gifts_V4/tree/46d36b6d6218b4d2861b29e6360fe36b230fc1f7/src/components/kit-builder).
- Imagens fornecidas pelo PO no chat: referência de composição, hierarquia, interações e conteúdo, **não autorização para trocar a paleta atual**.

Este plano consolida remediação e verificação; não cancela silenciosamente requisitos dos planos anteriores. Divergência precisa de decisão explícita do PO e registro na matriz da etapa 003. Não há promessa de plano infalível: há critérios para detectar erros e impedir encerramento sem prova.

### Retrato observado em 27/09, não certificação de produção

| Evidência                               | Resultado                                                                                                        | Limite da conclusão                                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Suíte local direcionada                 | 293 testes aprovados, 41 arquivos, nenhum ignorado                                                               | Unitários/componentes/contratos; não substituem sessão autenticada real                                  |
| Persistência do rascunho                | `__draft` contém versão, cliente e notas; não contém fluxo nem briefing da IA                                    | Inspeção de `src/lib/kit-builder/persistence.ts`                                                         |
| Listagem de itens                       | `sortedItems.map` em grade/lista; modo inicial em `useState('grid')`                                             | Não há virtualização nesse caminho nem persistência local desse modo                                     |
| Biblioteca                              | Filtro de publicados inclui `ready`; salvamento válido pode gerar `ready`                                        | Pronto para orçamento não comprova publicação                                                            |
| Personalização                          | Payload usa `positionX: 50` e `positionY: 50`                                                                    | Posição fixa exige análise do contrato geométrico; centro não é necessariamente incorreto para toda área |
| Banco canônico, consulta às 15:27 UTC   | 14 embalagens; 13 com medidas internas; 0 com acabamento preenchido; ausência da coluna de fechamento consultada | Retrato dos filtros consultados; ausência de dado não autoriza inventá-lo                                |
| Catálogo ativo `product_type='product'` | 6.733 produtos; 3.140 com área de impressão                                                                      | Aproximadamente 46,6%; não comparar com outro denominador como se fosse perda                            |
| Kits                                    | 0 templates ativos; 4 kits personalizados                                                                        | Cadastro vazio não é defeito de schema nem autorização para seed                                         |
| RPCs consultadas                        | `save_custom_kit_atomic(uuid,uuid,integer,jsonb)` e `create_kit_quote_transactional(uuid,jsonb,jsonb)` presentes | Presença, assinatura e grants não provam execução ponta a ponta                                          |
| Ledger consultado                       | `20260911130357`, `20260911172000`, `20260912150000`, `20260912151000` presentes                                 | Não reaplicar; ledger sozinho não prova equivalência semântica de funções                                |
| HTTP e navegador                        | `/api/health`, `/api/ready`, `/montar-kit`: HTTP 200; navegador sem sessão chega a `/auth`                       | Não foi validado o fluxo autenticado completo                                                            |
| Publicação Vercel                       | SHA servido pelo domínio ainda não comprovado                                                                    | Não inferir deploy por HTTP 200 nem por merge no GitHub                                                  |

Os JSONs de auditoria anteriores foram gerados em `/tmp` e não são evidência durável do repositório. A etapa 001 deverá anexar recibos sanitizados/reproduzíveis. Testes exploratórios de gaps não revisados não entram na contagem de defeitos comprovados. O Graphify foi usado como orientação estrutural; o índice não substitui a fonte no SHA auditado.

### Comando da suíte já executada

```bash
TZ=America/Sao_Paulo npx vitest run \
  tests/components/kit-builder tests/components/kit-library \
  tests/components/pages/KitBuilderPage.test.tsx tests/hooks/useKit \
  tests/lib/kit tests/lib/buildCustomKitInsert.test.ts \
  tests/pages/kit-builder tests/audit/kit-maker-plan-review.test.tsx \
  tests/contracts/kit-maker src/lib/external-db/kit-coverage.test.ts \
  --maxWorkers=1 --retry=0
```

Esse resultado é histórico do SHA auditado. Toda alteração posterior exige nova execução proporcional ao risco; a quantidade de testes não deve virar meta artificial.

## 2. Regras de execução e conclusão

1. Preservar cores/tokens atuais, guardas SSOT, regras comerciais e trabalho dos demais agentes. Nenhuma reforma do shell global ou do Magazine está incluída.
2. Reservar arquivos/objetos no ledger multiagente antes de editar; partir da `main` remota atual em branch/worktree própria. Não usar `reset --hard`, `main wins` ou stage indiscriminado.
3. Antes de cada etapa, verificar commits/PRs de outros agentes. Se já implementada, testar e registrar evidência; não reescrever por preferência pessoal.
4. Usar componentes existentes quando atendem ao contrato. Nome de arquivo diferente do proposto não é defeito por si só.
5. Separar quatro dimensões de entrega: código, dados, teste real e publicação. Um verde não substitui o outro.
6. Banco canônico: `doufsxqlfjyuvxuezpln`. Auditar schema apenas por `pg_catalog`; não usar OpenAPI/PostgREST como inventário de policies, funções, triggers ou grants.
7. Não executar `db push` em massa, DDL/DML canônico, deploy de Edge Functions, backfill ou rotação de segredos como efeito implícito deste plano. Mudança de banco requer proposta forward-only por objeto e autorização específica.
8. Nunca copiar tokens, JWTs, dados pessoais ou `storageState` para Git, screenshots, logs ou PRs. Segredos publicados anteriormente exigem tratamento próprio, sem reproduzi-los aqui.
9. Simulações destrutivas, concorrência, estoque e criação de orçamento usam ambiente descartável autorizado. Produção recebe apenas verificações read-only até aprovação operacional específica.
10. Não desabilitar assertions, hooks ou gates para obter verde; não engolir falhas com `catch(() => {})`. Erro de infraestrutura é bloqueio documentado, não aprovação.
11. Não marcar uma etapa concluída se depende de PO, dado, credencial ou deploy pendente. Registrar `BLOQUEADA` com responsável e critério de desbloqueio.
12. Checklist só recebe `[x]` com evidência revisável: SHA, comando, ambiente, resultado e referência durável. Exceção aceita é `DISPENSADA PELO PO`, separada de `CONCLUÍDA`.

Estados permitidos: `PENDENTE`, `EM EXECUÇÃO`, `IMPLEMENTADA LOCAL`, `VALIDADA EM HOMOLOGAÇÃO`, `PUBLICADA`, `CONCLUÍDA`, `BLOQUEADA`, `DISPENSADA PELO PO`. Progresso deve mostrar cada estado, sem somar bloqueadas/dispensadas como implementação.

### Decisões que precisam ser resolvidas, não presumidas

| Decisão                 | Informação necessária                                                                              | Etapas afetadas                   |
| ----------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------- |
| D1 — Fechamento         | Fonte confiável, enumeração e armazenamento; não deduzir de nome por heurística                    | 004, 012, 027, 032                |
| D2 — Dados de embalagem | Medidas internas, acabamento, peso, tolerância e responsável comercial                             | 004, 011, 029, 044                |
| D3 — Templates/assets   | Seleção dos seis kits pretendidos e imagens autorizadas; distinguir aproximação de reprodução fiel | 002, 013, 016, 038                |
| D4 — Frete              | Provedor, credenciais, cobrança, origem, SLA, cache e fallback                                     | 004, 044                          |
| D5 — PDF                | Impressão do navegador suficiente ou serviço separado; aceitar que diálogos variam                 | 004, 045                          |
| D6 — Badges             | Critérios de mais usada, econômica, sustentável e premium; nenhum selo inventado                   | 004, 022, 028, 029                |
| D7 — Publicação         | Evento que distingue pronto, compartilhado, orçado e publicado                                     | 004, 037, 043                     |
| D8 — Validação externa  | Contas de teste, dataset, teto de custo de IA, gravações e publicação autorizadas                  | 005, 009, 035, 039, 043, 047, 049 |

Decisões são gates, não novos requisitos silenciosos. Ausência de decisão deve permitir entregar etapas independentes, sem ocultar a pendência.

## 3. Plano executável — 50 etapas

Cada etapa tem cinco ações e um aceite final. O responsável indicado é um papel a designar, não um agente já executando. Dependências abaixo referem-se aos números deste plano. Itens marcados como verificação preservam melhorias existentes.

### Bloco A — Escopo, referências e ambientes

### KM50-001 — Fixar a linha de base e os recibos

**Prioridade:** P0. **Responsável:** liderança técnica/QA. **Depende de:** nenhuma. **Origem:** KM3-002, 006, 097.

- [ ] Registrar SHAs da pasta principal, branch de trabalho e `origin/main`, data UTC e estado sujo/limpo.
- [ ] Conferir PRs/commits de outros agentes que alterem Kit Maker; listar mudanças posteriores à auditoria.
- [ ] Preservar planos antigos e registrar o inventário de componentes, hooks, RPCs, testes e integrações.
- [ ] Reproduzir a suíte de referência e guardar resumo sanitizado com comando, SHA e cobertura funcional, sem contar mocks como banco real.
- [ ] Publicar recibo versionado da auditoria; guardar artefatos grandes em armazenamento aprovado e referenciar hashes/URLs e retenção.

**Aceite:** qualquer revisor consegue identificar exatamente qual código e ambiente foram examinados. **Simulação/prova:** introduzir uma diferença de SHA no recibo de teste e verificar que a reconciliação aponta a inconsistência.

### KM50-002 — Congelar as referências visuais e as exceções

**Prioridade:** P0. **Responsável:** design/PO. **Depende de:** 001. **Origem:** KM3-001, 008, 096.

- [ ] Catalogar oito superfícies: entrada, itens, caixas recomendadas, caixa primeiro, personalização, revisão, biblioteca e IA.
- [ ] Salvar referências autorizadas em `docs/references/kit-maker/`, com origem, resolução e hash; solicitar anexos faltantes sem recriá-los por memória.
- [ ] Separar alternativas de tela e estados vazio/preenchido; decidir com o PO qual composição prevalece onde os modelos divergem.
- [ ] Medir hierarquia, colunas, espaçamentos, proporção das imagens, textos e ações; mapear cores para tokens já existentes.
- [ ] Registrar assets exatos disponíveis e aproximações permitidas; uma aproximação não recebe selo de igualdade visual.

**Aceite:** matriz referência → estado → viewport → exceções aprovada antes de implementar layout. **Simulação/prova:** comparar um hero sem imagens com o alvo e garantir que seja classificado como divergência, mesmo com botões funcionais.

### KM50-003 — Criar rastreabilidade sem perder requisitos antigos

**Prioridade:** P0. **Responsável:** liderança técnica/QA. **Depende de:** 001, 002. **Origem:** KM3-001–100; F20-01–20.

- [ ] Abrir registro por requisito legado com componente, estado atual, evidência, etapa nova e responsável.
- [ ] Classificar cada requisito em ausente, parcial, implementado sem prova real ou comprovado; evitar percentuais subjetivos.
- [ ] Usar o Anexo A deste documento para conferir cobertura de todos os 100 IDs e dos 20 itens posteriores.
- [ ] Acrescentar diferenças intencionais aprovadas sem apagar o requisito original ou tratá-las como correção realizada.
- [ ] Definir o recibo padrão do Anexo C e atualizar a matriz após cada lote, incluindo falhas e bloqueios.

**Aceite:** nenhum requisito fica sem destino e nenhuma etapa fecha apenas por existência de arquivo. **Simulação/prova:** retirar uma evidência e confirmar que o requisito volta a não comprovado.

### KM50-004 — Fechar contratos de negócio e decisões pendentes

**Prioridade:** P0. **Responsável:** PO/comercial/liderança técnica. **Depende de:** 003. **Origem:** KM3-004, 009–015, 067, 069, 075.

- [ ] Registrar decisões D1–D8 com responsável, prazo e referência de aprovação, reaproveitando decisões anteriores ainda válidas.
- [ ] Definir unidades: centímetros internos, peso, quantidade de unidades por kit e quantidade de kits do lote.
- [ ] Definir semântica de compatibilidade/inconclusivo, validade de preço/estoque, publicação e estimativa versus cotação.
- [ ] Selecionar fontes reais de badges, templates, impressão e frete; documentar fallback honesto para ausência de dados.
- [ ] Separar autorizações de código, DML, DDL, chamadas pagas e publicação; listar nominalmente objetos afetados antes de solicitar aprovação.

**Aceite:** contratos necessários ao lote estão decididos; demais itens continuam bloqueados de forma explícita. **Simulação/prova:** kit válido mas nunca compartilhado não pode ser rotulado publicado por conveniência de implementação.

### KM50-005 — Preparar fixtures e autenticação de teste

**Prioridade:** P0. **Responsável:** QA/segurança. **Depende de:** 001, 004. **Origem:** KM3-006, 007; F20-01, 02.

- [ ] Escolher ambiente isolado autorizado, validando URL e projeto antes de qualquer fixture; proibir fallback automático para produção.
- [ ] Preparar dois usuários com papéis reais e dados descartáveis por execução, inclusive casos sem permissão e sessão expirada.
- [ ] Definir fixtures de caixa completa/incompleta, variantes, estoque zero/desconhecido, técnicas e produtos sem imagem.
- [ ] Configurar autenticação Playwright compatível com os projetos existentes; manter sessão/segredos fora do Git e artefatos públicos.
- [ ] Definir orçamento de IA, limpeza por IDs de teste e controles que impeçam disparo comercial ou criação de pedidos reais.

**Aceite:** E2E inicia autenticado, identifica seu ambiente e falha fechado sem credenciais. **Simulação/prova:** remover a configuração do ambiente e confirmar interrupção, sem chamar o canônico.

### Bloco B — Estado, persistência e banco

### KM50-006 — Preservar o fluxo escolhido ao salvar e reabrir

**Prioridade:** P1. **Responsável:** frontend. **Depende de:** 004, 005. **Origem:** KM3-005, 088.

- [ ] Rastrear `flow` entre URL, `useKitBuilder`, estado da página, salvamento manual e autosave.
- [ ] Acrescentar o fluxo ao contrato persistido compatível com rascunhos antigos; documentar regra de leitura para ausência/valor inválido.
- [ ] Restaurar fluxo, passo válido e dados ao reabrir pela biblioteca, sem forçar o caminho caixa primeiro por padrão de rota.
- [ ] Preservar o fluxo em undo/redo, duplicação e retorno do orçamento; não confundir passo atual com origem da montagem.
- [ ] Exibir selo e sequência do wizard a partir de uma única fonte de estado.

**Aceite:** os dois fluxos sobrevivem a salvar, sair e reabrir sem perder composição. **Simulação/prova:** round-trip de ambos, snapshot legado e URL conflitante; documentar precedência.

### KM50-007 — Preservar briefing da IA e origem do kit

**Prioridade:** P1. **Responsável:** frontend/dados. **Depende de:** 004, 006. **Origem:** KM3-071, 082.

- [ ] Definir estrutura mínima de briefing: objetivo, público, orçamento, estilo e quantidade, com limites e política de privacidade.
- [ ] Persistir briefing e identificação da sugestão aplicada no snapshot, sem guardar segredos nem conversa desnecessária.
- [ ] Registrar origem manual/template/IA sem inferir a partir do nome ou preço do kit.
- [ ] Restaurar metadados no editor, na biblioteca e na duplicação; permitir limpar o briefing de forma explícita.
- [ ] Compatibilizar kits antigos e tratar metadados malformados sem impedir abertura do rascunho.

**Aceite:** reabrir um kit mantém intenção e procedência verificáveis. **Simulação/prova:** salvar após aplicar sugestão, duplicar, editar manualmente e recarregar sem reutilizar briefing de outro kit.

### KM50-008 — Revalidar autosave, idempotência e conflitos

**Prioridade:** P0. **Responsável:** frontend/backend. **Depende de:** 005, 006, 007. **Origem:** KM3-029, 068, 093.

- [ ] Preservar `save_custom_kit_atomic`, revisão esperada e request ID por operação; confirmar o código existente antes de alterá-lo.
- [ ] Diferenciar salvando, salvo, falhou e conflito; não exibir sucesso antes da confirmação do servidor.
- [ ] Coordenar salvar manual/autosave, desmontagem e troca de kit para evitar respostas antigas aplicadas ao novo estado.
- [ ] Oferecer resolução explícita de conflito sem sobrescrever a revisão remota silenciosamente.
- [ ] Garantir retry da mesma operação sem criar outro kit e nova operação quando conteúdo mudou.

**Aceite:** nenhum dado é perdido ou duplicado nos cenários de disputa. **Simulação/prova:** duas abas na mesma revisão, conexão interrompida após commit, duplo clique, troca de kit durante request e sessão expirada.

### KM50-009 — Auditar contratos e segurança do banco do módulo

**Prioridade:** P0. **Responsável:** banco/segurança. **Depende de:** 001, 004, 005. **Origem:** KM3-093; F20-06.

- [ ] Inventariar via `pg_catalog` tabelas/views/RPCs/triggers/policies/grants efetivamente consumidos pelo Kit Maker, incluindo pin e recibos de operação.
- [ ] Comparar assinatura, corpo, ACL, search_path e ledger com migrations revisadas; separar diferença intencional de perda real.
- [ ] Confirmar isolamento por proprietário/papel e ausência de elevação por metadata editável; avaliar leitura, escrita e troca de proprietário.
- [ ] Executar testes negativos em ambiente autorizado com dois usuários, anon e sessão expirada; simular falha no meio de transação.
- [ ] Se houver divergência, preparar proposta mínima por objeto, simular localmente e pedir aprovação antes de aplicar; se não houver, registrar sem nova migration.

**Aceite:** contrato e autorização comprovados; presença da função no ledger não basta. **Simulação/prova:** usuário B não lê/altera kit de A nem reaproveita recibo de A para obter informação.

### KM50-010 — Reconciliar tipos e adaptadores sem regressão global

**Prioridade:** P1. **Responsável:** frontend/banco. **Depende de:** 009. **Origem:** KM3-016.

- [ ] Mapear o caminho real de dados entre hooks, projeções, adaptador e Supabase, incluindo aliases de categoria, preço e variante.
- [ ] Comparar contratos TypeScript com objetos canônicos consumidos; preservar campos críticos de `Product` e guardas SSOT.
- [ ] Regenerar types somente se necessário e com acesso autorizado; comparar inventário antes/depois sem remover Magazine ou tabelas alheias.
- [ ] Eliminar casts inseguros apenas no escopo alterado quando houver contrato correto; não mascarar divergência com `any`.
- [ ] Rodar testes de contrato e typecheck, registrando diferenças de schema que permanecerem bloqueadas.

**Aceite:** campos e nulabilidade consumidos pelo módulo coincidem com o banco/projeção. **Simulação/prova:** resposta sem área, sem preço ou com categoria nula gera estado previsto, não erro de renderização.

### Bloco C — Qualidade de dados e disponibilidade

### KM50-011 — Completar dados confiáveis de embalagens

**Prioridade:** P1. **Responsável:** comercial/dados. **Depende de:** 004, 009, 010. **Origem:** KM3-009, 011, 015.

- [ ] Recontar embalagens ativas com critérios explícitos e listar faltas de medidas internas, acabamento, peso e capacidade de carga.
- [ ] Solicitar fonte do fornecedor/comercial; distinguir medida externa de interna e unidade de origem.
- [ ] Preparar correções com valor anterior/proposto/fonte/IDs, sem inventar dado a partir da imagem.
- [ ] Aplicar DML apenas após autorização do lote e com condição de não sobrescrever alteração concorrente; manter recibo recuperável.
- [ ] Mostrar dados desconhecidos e exclusão de recomendação com motivo até a correção comprovada.

**Aceite:** toda embalagem elegível possui dados necessários ou uma restrição explícita. **Simulação/prova:** caixa sem medida não vira compatível; correção aprovada passa a aparecer após invalidar cache.

### KM50-012 — Resolver o contrato de fechamento da embalagem

**Prioridade:** P1. **Responsável:** banco/comercial. **Depende de:** 004, 009, 011. **Origem:** KM3-010, 043, 046.

- [ ] Confirmar ausência/presença do atributo canônico e decidir fonte/armazenamento antes de criar coluna.
- [ ] Definir valores admitidos e diferença entre fechamento, abertura e acabamento, com estado desconhecido explícito.
- [ ] Se necessário, preparar migration forward-only e plano de preenchimento separados, com validação e sem editar migrations antigas.
- [ ] Simular versões antigas da aplicação, nulos e valores inválidos; revisar grants/projeções/índices só se exigidos pelo consumo.
- [ ] Após autorização e aplicação, conectar types, filtros, card e preview; até lá, não oferecer filtro inoperante como concluído.

**Aceite:** o atributo tem fonte e percurso ponta a ponta ou permanece bloqueado por decisão identificada. **Simulação/prova:** caixa com fechamento ausente não é classificada automaticamente como magnética.

### KM50-013 — Curar templates reais e seguros

**Prioridade:** P1. **Responsável:** PO/comercial/frontend. **Depende de:** 004, 011. **Origem:** KM3-012, 074, 077.

- [ ] Selecionar com o PO os seis templates pretendidos e validar itens, variantes, caixa, quantidade, etiqueta e imagens reais.
- [ ] Validar preço, estoque e compatibilidade atuais sem congelar os números ilustrativos dos mockups como dados comerciais.
- [ ] Preparar cadastro pelo caminho administrativo existente; confirmar rota/permissão e autorização de gravação.
- [ ] Implementar estados sem template, template indisponível e ação administrativa apenas para quem tem acesso.
- [ ] Revalidar composição ao usar template; produto descontinuado exige ajuste explícito e não desaparece silenciosamente.

**Aceite:** destaques e biblioteca exibem templates reais aprovados, sem dados fictícios em produção. **Simulação/prova:** template com produto inativo, caixa inválida ou preço alterado não gera orçamento enganoso.

### KM50-014 — Medir e ampliar cobertura de áreas de impressão

**Prioridade:** P1. **Responsável:** dados/personalização. **Depende de:** 009, 010. **Origem:** KM3-013, 050; F20-11, 12.

- [ ] Refazer contagem com denominador e filtros reproduzíveis, por categoria/fornecedor e status ativo.
- [ ] Identificar a fonte realmente consumida de área/técnica; não contar tabelas homônimas sem vínculo com o módulo.
- [ ] Inventariar código, face, imagem, limites físicos e geometria quando disponíveis; separar cobertura de área de cobertura geométrica.
- [ ] Preparar enriquecimento apenas com dado validado e autorização, priorizando os produtos de uso real.
- [ ] Definir fallback que informe área não cadastrada e impeça promessa de personalização impossível.

**Aceite:** relatório de cobertura reproduzível e lacunas visíveis ao usuário; 100% não é presumido. **Simulação/prova:** produto com técnica mas sem geometria não recebe posição supostamente exata.

### KM50-015 — Revalidar estoque, variantes e cache do catálogo

**Prioridade:** P0. **Responsável:** dados/frontend/QA. **Depende de:** 005, 010. **Origem:** KM3-014, 019, 066; F20-13, 14.

- [ ] Confirmar projeção e fonte por variante, preservando estados carregando, disponível, insuficiente e desconhecido.
- [ ] Revisar chave de cache baseada em IDs reais, não apenas na quantidade de produtos; reproduzir troca de conjuntos de mesmo tamanho.
- [ ] Inspecionar transporte real do adaptador e limites de lote; só concluir risco de URL/payload após medição, não por suposição.
- [ ] Testar carga paginada de milhares de produtos, erros parciais e invalidação após mudança de variante/quantidade.
- [ ] Exibir estado de estoque no card e revalidar antes do orçamento sem alegar reserva transacional se ela não existir.

**Aceite:** nenhum estoque de outro conjunto/variante é reaproveitado; erro não vira zero ou disponibilidade fictícia. **Simulação/prova:** conjuntos A/B de mesmo tamanho, timeout, estoque alterado durante revisão e catálogo ampliado.

### Bloco D — Estrutura visual, navegação e reuso

### KM50-016 — Aproximar a entrada do modelo aprovado

**Prioridade:** P1. **Responsável:** frontend/design. **Depende de:** 002, 004, 013. **Origem:** KM3-001–003, 074, 087.

- [ ] Ajustar `KitMakerLanding` com dois caminhos distintos, hierarquia e proporção equivalentes à referência aprovada.
- [ ] Usar assets autorizados nos heroes, preservar legibilidade e definir fallback sem fingir equivalência fotográfica.
- [ ] Reorganizar benefícios em cards compactos, evitando títulos gigantes e espaços vazios desproporcionais.
- [ ] Conectar destaques, Meus kits, tutoriais e CTA da IA aos destinos reais, mantendo estados vazio/erro.
- [ ] Conferir textos e elementos adicionais como ocasião; mover apenas conforme decisão visual registrada, sem eliminar funcionalidade útil às cegas.

**Aceite:** entrada atende às medidas/ações da referência usando a paleta atual. **Simulação/prova:** screenshot antes/depois no mesmo viewport, imagens indisponíveis e entrada nos dois fluxos.

### KM50-017 — Unificar header, breadcrumb e wizard

**Prioridade:** P1. **Responsável:** frontend. **Depende de:** 002, 006. **Origem:** KM3-005, 047, 088.

- [ ] Mapear títulos, subtítulos, ícones, CTA e breadcrumbs por passo e fluxo.
- [ ] Fazer o wizard refletir Itens→Caixa ou Caixa→Itens sem duplicar estado nem rotas inconsistentes.
- [ ] Preservar composição ao voltar/avançar e explicar passos bloqueados por requisitos pendentes.
- [ ] Revisar acesso direto, refresh, histórico do navegador e reabertura por biblioteca.
- [ ] Remover divergência de nomenclatura visível entre montar-kit/Kit Maker somente dentro do módulo e do contrato de navegação aprovado.

**Aceite:** usuário sempre sabe onde está, de onde veio e como retornar sem perder dados. **Simulação/prova:** back/forward, URL direta no passo inválido e rascunho salvo nos dois fluxos.

### KM50-018 — Conectar guias e ajuda às ações reais

**Prioridade:** P2. **Responsável:** frontend/conteúdo. **Depende de:** 002, 017. **Origem:** KM3-047, 056, 087.

- [ ] Unificar Como funciona, Ver tutoriais e Guia do Kit Maker no contrato aprovado de ajuda.
- [ ] Corrigir a âncora isolada da landing quando ela não entrega o guia solicitado; não manter dois comportamentos incoerentes.
- [ ] Definir capítulos por fluxo, caixas, personalização, orçamento e limitações dos dados.
- [ ] Garantir foco inicial, retorno ao gatilho, fechamento por teclado e leitura acessível.
- [ ] Validar todos os links/conteúdos e oferecer alternativa textual se mídia não carregar.

**Aceite:** nenhuma ação de ajuda é decorativa ou aponta para seção inexistente. **Simulação/prova:** navegação só por teclado e mídia externa bloqueada.

### KM50-019 — Consolidar primitivas sem mudar o tema

**Prioridade:** P1. **Responsável:** frontend/design system. **Depende de:** 002, 004. **Origem:** KM3-003, 004, 089.

- [ ] Inventariar componentes reutilizáveis de chips, badges, barras, stats, empty state e skeleton; não criar duplicatas por nome.
- [ ] Separar badge comercial de compatibilidade, com texto e semântica além da cor.
- [ ] Tornar chips interativos botões ou controles equivalentes acessíveis, com estado selecionado anunciado.
- [ ] Reusar tokens/variants existentes e limitar estilos ao módulo; proibir hex novo copiado do mockup.
- [ ] Testar componentes em foco, disabled, loading, texto longo e ausência de dados.

**Aceite:** componentes compartilhados consistentes e operáveis por teclado, sem alteração da paleta global. **Simulação/prova:** revisão de diff CSS/tokens e interação por Enter/Espaço sem mouse.

### KM50-020 — Corrigir a arquitetura de colunas e estados de tela

**Prioridade:** P1. **Responsável:** frontend/design. **Depende de:** 002, 017, 019. **Origem:** KM3-002, 008, 090.

- [ ] Definir largura útil, alturas, grids e painéis por superfície nos três viewports de referência.
- [ ] Revisar o encaixe do BoxSelector no workspace externo para evitar grade interna espremida por colunas aninhadas.
- [ ] Manter editor e resumo visíveis sem scroll horizontal da página; sticky não pode cobrir CTAs.
- [ ] Projetar skeleton, vazio, erro, carregamento parcial e conteúdo longo com a mesma estrutura espacial.
- [ ] Validar que o shell atual permanece intacto e que assets/fontes não introduzem salto excessivo de layout.

**Aceite:** cada tela tem composição legível e proporcional ao modelo, não apenas todos os elementos presentes. **Simulação/prova:** 390, 1280 e 1440 px, zoom de 200% e nomes extensos.

### Bloco E — Catálogo e seleção de itens

### KM50-021 — Corrigir busca, facetas e contagens de itens

**Prioridade:** P1. **Responsável:** frontend/dados. **Depende de:** 010, 015, 019. **Origem:** KM3-021, 025.

- [ ] Definir busca por nome, SKU, categoria e tags realmente disponíveis, com acentos/caixa e debounce coerentes.
- [ ] Derivar opções de facetas de fonte estável e contagens segundo regra documentada, sem sumir opções por filtrar a própria lista.
- [ ] Exibir contagens reais nos chips; não copiar os números do mockup.
- [ ] Oferecer limpar filtros, indicação de filtros ativos e estado nenhum resultado distinto de catálogo indisponível.
- [ ] Preservar itens selecionados fora do filtro e resultados estáveis quando uma resposta antiga chega atrasada.

**Aceite:** filtros combinados são previsíveis, reversíveis e acessíveis. **Simulação/prova:** busca acentuada, SKU parcial, categoria sem resultados e alternância rápida entre filtros.

### KM50-022 — Completar cards de produto e variantes

**Prioridade:** P1. **Responsável:** frontend. **Depende de:** 004, 015, 019, 020. **Origem:** KM3-017–020, 033.

- [ ] Preservar o card vertical existente e ajustar imagem, nome, SKU, três atributos e CTA conforme referência.
- [ ] Exibir preço correto e seu escopo, sem trocar `sale_price`/`price` nem formatar nulo como grátis.
- [ ] Conectar variante, estoque e quantidade; seleção incompleta deve ser explicada antes de adicionar.
- [ ] Revalidar favoritos com persistência, erro e isolamento de usuário; badges comerciais só após D6.
- [ ] Garantir fallback de imagem, alt apropriado, nome completo acessível e ausência de deslocamento ao carregar.

**Aceite:** card informa e adiciona a variante correta, sem selo ou disponibilidade fabricados. **Simulação/prova:** imagem quebrada, produto sem preço, estoque zero, variante esgotada e favorito com falha de rede.

### KM50-023 — Virtualizar a listagem e limitar trabalho desnecessário

**Prioridade:** P1. **Responsável:** frontend/performance. **Depende de:** 020, 021, 022. **Origem:** KM3-022, 091.

- [ ] Medir DOM, render, memória e requests com o catálogo de referência antes de escolher a estratégia.
- [ ] Implementar virtualização/paginação adequada a grade e lista, reutilizando dependências existentes quando possível.
- [ ] Preservar keys, foco, scroll e seleção ao filtrar, redimensionar e voltar de outro passo.
- [ ] Distinguir total do catálogo, total filtrado e intervalo renderizado; evitar contador enganoso.
- [ ] Definir orçamento mensurável de nós montados, latência e payload e anexar medição antes/depois.

**Aceite:** milhares de produtos não viram milhares de cards simultâneos no DOM. **Simulação/prova:** fixture de pelo menos 7.000 produtos, rolagem até o final, busca e seleção por teclado em item fora da janela inicial.

### KM50-024 — Persistir visualização e tornar ordenação determinística

**Prioridade:** P1. **Responsável:** frontend. **Depende de:** 019, 021, 023. **Origem:** KM3-023, 024, 032, 045, 076.

- [ ] Definir preferência grade/lista por superfície e guardar em armazenamento local com leitura segura.
- [ ] Restaurar preferência ao remontar/recarregar, tratando storage indisponível e valor inválido.
- [ ] Implementar opções previstas de preço, nome e relevância com desempate estável por identidade.
- [ ] Explicar relevância por dados verificáveis; não atribuir popularidade/sugestão sem fonte.
- [ ] Manter seleção, quantidade, filtros e scroll coerentes ao trocar modo ou ordem.

**Aceite:** preferência permanece e a ordenação não oscila entre renders equivalentes. **Simulação/prova:** unmount/remount, preços iguais, nomes iguais, valor nulo e storage bloqueado.

### KM50-025 — Entregar painel de filtros utilizável

**Prioridade:** P1. **Responsável:** frontend/acessibilidade. **Depende de:** 019, 020, 021, 024. **Origem:** KM3-025, 030.

- [ ] Implementar o botão Filtros e o painel lateral/drawer conforme referência, reaproveitando controles existentes.
- [ ] Agrupar categoria, material, preço, personalização e medidas com labels, contagens e seleção coerente.
- [ ] Decidir aplicação imediata ou confirmada e tornar esse comportamento consistente em desktop/mobile.
- [ ] Manter foco dentro do drawer, Escape, retorno ao gatilho e resumo acessível dos filtros aplicados.
- [ ] Testar limpar tudo sem apagar a composição do kit e sem resetar preferências não relacionadas.

**Aceite:** painel completo funciona por toque e teclado sem alterar seleção do kit indevidamente. **Simulação/prova:** abrir/fechar durante busca, nenhum resultado, limpar filtros e viewport estreito.

### Bloco F — Composição e recomendação de caixas

### KM50-026 — Completar o painel Seu kit e as quantidades

**Prioridade:** P1. **Responsável:** frontend/domínio. **Depende de:** 006, 008, 015, 020, 022. **Origem:** KM3-026–030, 035.

- [ ] Ajustar colagem, contagem, subtotal e lista de itens ao modelo aprovado, preservando miniaturas reais.
- [ ] Distinguir unidades de cada produto por kit de quantidade total de kits; decidir explicitamente o controle global previsto.
- [ ] Validar inteiros, mínimos/máximos e estoque por variante sem aceitar negativo, fracionário ou NaN.
- [ ] Revalidar remover item e limpar tudo com confirmação, undo quando suportado e estado do autosave.
- [ ] Conectar próximo passo, edição da composição e ocupação ainda não calculada com mensagens honestas.

**Aceite:** preços/quantidades permanecem consistentes em painel, revisão e snapshot. **Simulação/prova:** cliques rápidos, remoção do último item, quantidade limite e limpar durante salvamento.

### KM50-027 — Completar filtros dimensionais e comerciais de caixas

**Prioridade:** P1. **Responsável:** frontend/dados. **Depende de:** 011, 012, 019, 024. **Origem:** KM3-031, 032, 041–045; F20-16.

- [ ] Manter busca por nome/código/material e chips de tipo com contagens e conjunto de opções estável.
- [ ] Implementar intervalos dimensionais válidos em centímetros internos; min maior que max deve mostrar erro, não esvaziar silenciosamente.
- [ ] Conectar slider de preço aos campos numéricos com arredondamento monetário e acessibilidade.
- [ ] Exibir material, acabamento e fechamento segundo dados aprovados; distinguir desconhecido de inexistente.
- [ ] Implementar ordenação prevista por nome, preço, ocupação e dimensão com definição clara do eixo/volume e desempate.

**Aceite:** todos os controles alteram resultados de forma explicável e reversível. **Simulação/prova:** intervalos invertidos, limites iguais, vírgula decimal, dados nulos e combinação que zera resultados.

### KM50-028 — Refinar cards e favoritos de caixas

**Prioridade:** P1. **Responsável:** frontend/design. **Depende de:** 004, 011, 019, 020, 027. **Origem:** KM3-033, 034, 038.

- [ ] Exibir foto, código, dimensões internas, material, preço e ocupação na hierarquia aprovada.
- [ ] Produzir checklist de motivos a partir do cálculo real, sem frases estáticas de compatibilidade.
- [ ] Separar apresentação comercial e status técnico; só renderizar selos comerciais com regra aprovada.
- [ ] Persistir favoritos com feedback de erro, sem compartilhar estado privado entre usuários.
- [ ] Garantir igualdade funcional entre grade/lista, imagem ausente e caixa sem dado suficiente.

**Aceite:** nenhum card contradiz o motor de compatibilidade ou promete característica ausente. **Simulação/prova:** ocupação desconhecida, peso excedido, favorita removida do catálogo e preço atualizado.

### KM50-029 — Tornar a recomendação explicável e conservadora

**Prioridade:** P0. **Responsável:** domínio/QA. **Depende de:** 004, 011, 015, 026, 028. **Origem:** KM3-034–036.

- [ ] Revisar volume, dimensões, peso, orientação, tolerância e quantidade sem equiparar volume suficiente a encaixe físico comprovado.
- [ ] Preservar estados compatível, incompatível e inconclusivo, explicitando limites da heurística.
- [ ] Excluir inconclusivos de afirmações como menor preço entre compatíveis; criar texto específico quando faltam dados.
- [ ] Mostrar recomendação com motivos calculados e ocupação derivada da mesma fonte dos cards/resumo.
- [ ] Documentar critérios de ranking e desempate e invalidar recomendação quando composição/caixa mudar.

**Aceite:** motivos e seleção recomendada são reproduzíveis; ausência de dados nunca vira confirmação. **Simulação/prova:** volume cabe mas dimensão não, peso desconhecido, múltiplas unidades, 100% de ocupação e empate de preço.

### KM50-030 — Completar comparação de caixas com vencedora explicada

**Prioridade:** P1. **Responsável:** frontend/domínio. **Depende de:** 027, 028, 029. **Origem:** KM3-039, 040.

- [ ] Revalidar seleção de até três caixas e remoção de IDs obsoletos, preservando a implementação existente.
- [ ] Comparar dimensões internas, preço, material, ocupação, peso/limites e qualidade dos dados com unidades iguais.
- [ ] Destacar vencedora somente quando os critérios permitem; suportar empate e nenhuma vencedora.
- [ ] Exibir explicação vinculada ao ranking, sem tratar caixa mais barata como melhor em todo cenário.
- [ ] Manter foco, responsividade e ação selecionar sem perder os itens atuais.

**Aceite:** comparação ajuda a decidir com os mesmos números do catálogo. **Simulação/prova:** três caixas empatadas, todas inconclusivas, uma excluída durante comparação e alteração de quantidade.

### Bloco G — Saídas de exceção e personalização

### KM50-031 — Corrigir a saída Nenhuma caixa atende

**Prioridade:** P1. **Responsável:** frontend/comercial. **Depende de:** 004, 026, 027, 029. **Origem:** KM3-037, 040.

- [ ] Cobrir catálogo vazio, filtros sem resultado e todas as caixas incompatíveis como estados diferentes.
- [ ] Exibir a ação comercial também quando a lista de recomendações tem comprimento zero.
- [ ] Definir canal comercial aprovado e incluir contexto mínimo do kit mediante ação consciente do usuário; não redirecionar apenas para listagem genérica.
- [ ] Oferecer limpar filtros/editar itens e preservar composição ao retornar.
- [ ] Evitar envio automático de dados pessoais, spam ou abertura de serviço externo sem interação.

**Aceite:** usuário sempre encontra caminho útil quando não há caixa selecionável. **Simulação/prova:** zero caixas, zero por filtro, incompatibilidade geral e canal comercial indisponível.

### KM50-032 — Completar a prévia e o fluxo Caixa primeiro

**Prioridade:** P1. **Responsável:** frontend/QA. **Depende de:** 006, 011, 012, 020, 027–031. **Origem:** KM3-041–048.

- [ ] Exibir preview com foto, código, medidas, material, acabamento, fechamento e preço quando disponíveis.
- [ ] Suportar selecionar preview por teclado/toque, não apenas hover, mantendo foco e estado selecionado distintos.
- [ ] Conectar Usar esta caixa ao fluxo correto e preservar seleção ao buscar/adicionar itens.
- [ ] Mostrar restrições e incompatibilidades de novos itens sem ocultar que produto sem medidas é inconclusivo.
- [ ] Ao trocar caixa, revalidar itens/personalização/preço e avisar antes de descartar ajustes incompatíveis.

**Aceite:** percurso caixa→itens chega à revisão com a mesma caixa e validações coerentes. **Simulação/prova:** troca por caixa menor, caixa removida do catálogo e produto sem dimensões.

### KM50-033 — Fechar seleção de técnica e troca de item

**Prioridade:** P1. **Responsável:** frontend/personalização. **Depende de:** 014, 019, 026. **Origem:** KM3-049, 052, 056, 057.

- [ ] Revalidar cards de técnica a partir de disponibilidade real por produto e material.
- [ ] Tratar produto sem técnica, técnica inativa e área indisponível com explicação e ações válidas.
- [ ] Conectar Trocar item preservando os outros itens e solicitando confirmação para personalização que deixará de ser válida.
- [ ] Invalidar orçamento de técnica/preview somente quando suas entradas relevantes mudarem.
- [ ] Conferir guia contextual, teclado, estados disabled e navegação da lista de itens.

**Aceite:** técnica escolhida é aplicável ao item/área e não vaza de um produto para outro. **Simulação/prova:** alternar rapidamente item/técnica e substituir um item já personalizado.

### KM50-034 — Conectar área física, geometria e face da arte

**Prioridade:** P0. **Responsável:** personalização/backend/frontend. **Depende de:** 004, 014, 033. **Origem:** KM3-050, 051; F20-12.

- [ ] Documentar contrato de código de área, face, imagem, unidade, largura/altura e coordenadas aceitas pelo gerador.
- [ ] Substituir o centro fixo por geometria real quando disponível; centro só pode ser fallback assumido e comunicado, não precisão inventada.
- [ ] Validar limites de arte e técnica com unidades corretas, incluindo rotação/escala apenas quando suportadas.
- [ ] Diferenciar frente/verso pela imagem e identificação da área; coordenadas iguais não são, por si, defeito entre faces distintas.
- [ ] Persistir os dados necessários e bloquear alegação de resultado final quando falta geometria/fonte.

**Aceite:** área selecionada chega corretamente à geração e o preview declara suas limitações. **Simulação/prova:** área fora do centro, duas faces com mesmo centro, dimensão excedida e produto sem geometria.

### KM50-035 — Validar geração de mockup, preview e recuperação

**Prioridade:** P0. **Responsável:** frontend/Edge/QA. **Depende de:** 005, 033, 034. **Origem:** KM3-051, 058.

- [ ] Conferir contrato cliente/Edge implantada, autorização e origem dos assets sem enviar segredos ao navegador.
- [ ] Preservar proteção contra resposta atrasada, duplo clique e aplicação do mockup ao item errado.
- [ ] Implementar ou validar frente/verso, zoom, fullscreen, artes salvas e recuperação após erro sem perder a configuração.
- [ ] Rodar happy path autorizado com identidade real e limite de custo, guardando recibo sanitizado de request/resultados.
- [ ] Testar timeout, recusa de arquivo, 401/403/429/5xx e link de imagem expirado, sem retry cobrado indefinidamente.

**Aceite:** uma geração real corresponde ao item/área/configuração e falhas deixam estado recuperável. **Simulação/prova:** gerar A, mudar para B antes da resposta e garantir que a imagem de A não substitua B.

### Bloco H — Personalização, biblioteca e IA

### KM50-036 — Unificar status e custo da personalização

**Prioridade:** P1. **Responsável:** frontend/domínio. **Depende de:** 033–035. **Origem:** KM3-053–055, 058.

- [ ] Definir pendente, em edição, concluído, sem personalização e inválido com critérios distintos.
- [ ] Atualizar lista lateral e resumo pela mesma fonte, sem declarar concluído apenas porque uma técnica foi clicada.
- [ ] Mostrar custo adicional por unidade e discriminar setup/lote quando existentes.
- [ ] Recalcular custo ao alterar área, dimensões, cores, quantidade ou produto e invalidar aprovação anterior quando necessário.
- [ ] Conferir persistência e restauração dos status sem depender da existência momentânea do preview.

**Aceite:** status, preço e configuração não se contradizem entre editor e revisão. **Simulação/prova:** gerar arte, trocar técnica, limpar personalização e reabrir kit salvo.

### KM50-037 — Corrigir a semântica da biblioteca

**Prioridade:** P0. **Responsável:** domínio/frontend/PO. **Depende de:** 004, 006–008, 009. **Origem:** KM3-071, 072, 075.

- [ ] Documentar relação entre estados persistidos `draft`, `ready`, `shared`, `archived` e rótulos da interface, conferindo legados.
- [ ] Parar de tratar `ready` como publicação comprovada; aplicar D7 sem introduzir estado que o trigger não aceita.
- [ ] Definir qual evento deixa evidência de compartilhamento/orçamento/publicação e mostrar somente a afirmação sustentada por ele.
- [ ] Alinhar contadores, filtros, badges e CTA primário com a mesma função de classificação.
- [ ] Planejar eventual reconciliação de dados antigos separadamente, sem atualizar status canônico em massa como efeito de render.

**Aceite:** salvar kit válido não o apresenta falsamente como publicado. **Simulação/prova:** matriz com todos os status, kit antigo, kit orçado não compartilhado e operação de publicação malsucedida.

### KM50-038 — Completar biblioteca, templates e ações dos cards

**Prioridade:** P1. **Responsável:** frontend/QA. **Depende de:** 007, 013, 024, 037. **Origem:** KM3-071–074, 076–078.

- [ ] Ajustar cards com cliente, editado há, origem, contagem, valor estimado e CTA coerente com o estado.
- [ ] Implementar busca por nome/cliente/conteúdo disponível, filtros, favoritos e modos grade/lista com contagem correta.
- [ ] Revalidar duplicar, favoritar, fixar, arquivar/excluir com autorização, confirmação e recuperação prevista.
- [ ] Completar preview do template com composição, limites e valores atuais; usar template cria cópia sem mutar original.
- [ ] Testar falhas e concorrência, preservando kits de outros usuários e o ordenamento de pins suportado pela RPC real.

**Aceite:** todas as ações visíveis têm efeito correto e persistente; template vazio não é mascarado. **Simulação/prova:** duplo clique em duplicar, falha ao favoritar, excluir kit aberto em outra aba e template desatualizado.

### KM50-039 — Validar contrato, erros e telemetria da IA

**Prioridade:** P0. **Responsável:** Edge/QA. **Depende de:** 004, 005, 010. **Origem:** KM3-079, 083–085; F20-17, 18.

- [ ] Conferir schema de entrada/saída de `kit-ai-builder`, limites e campos título/descrição/estilo já implementados.
- [ ] Garantir que textos e sugestões não permitam executar instruções arbitrárias, SQL ou mutações comerciais.
- [ ] Validar autenticação, erros legíveis, timeout, rate limit, cancelamento e política de retry com teto de custo.
- [ ] Auditar telemetria de duração/status/uso sem registrar tokens de acesso ou dados pessoais do briefing.
- [ ] Comparar versão da Edge implantada ao código e rodar teste real autorizado; mocks não fecham o contrato externo.

**Aceite:** payload válido gera resposta utilizável e falhas são rastreáveis sem vazamento. **Simulação/prova:** JSON inválido, texto excessivo, prompt malicioso, provedor fora do ar e usuário não autorizado.

### KM50-040 — Fechar a experiência de sugestões da IA

**Prioridade:** P1. **Responsável:** frontend/domínio. **Depende de:** 007, 015, 026, 029, 039. **Origem:** KM3-080–082, 085, 086.

- [ ] Ajustar modal aos modelos aprovados: briefing, público, faixa de preço, estilo, quantidade e resultado lado a lado quando couber.
- [ ] Exibir título/descrição reais, colagem dos produtos disponíveis, contador e navegação das sugestões.
- [ ] Recalcular preço/estoque/compatibilidade com dados do catálogo, não aceitar valores inventados pela IA como cotação.
- [ ] Aplicar sugestão com confirmação se substituir composição; preservar briefing e permitir edição manual posterior.
- [ ] Explicar sugestão acima do orçamento, sem caixa, incompleta ou indisponível, sem fabricar sucesso.

**Aceite:** sugestão aplicada produz composição editável e rastreável, consistente com catálogo. **Simulação/prova:** ID inexistente, itens repetidos, preço alterado, falta de estoque e orçamento muito baixo.

### Bloco I — Revisão, orçamento, frete e impressão

### KM50-041 — Completar identificação e edição da revisão

**Prioridade:** P1. **Responsável:** frontend. **Depende de:** 026, 032, 036. **Origem:** KM3-059–063.

- [ ] Alinhar nome do kit, cliente CRM, objetivo/etiqueta e edição à referência e às permissões reais.
- [ ] Completar tabela com produto/variante, quantidade, preço, personalização e caixa sem duplicar custos.
- [ ] Oferecer ações de editar/remover por linha previstas no modelo; retornar ao passo correto preservando o restante.
- [ ] Exibir card da caixa, ocupação e motivos de validação com dados compartilhados com o motor.
- [ ] Preservar observações com limite/contador, cliente e contexto ao salvar/reabrir; sanitizar apresentação.

**Aceite:** toda informação exibida pode ser rastreada até a composição atual e alterada pelo caminho correto. **Simulação/prova:** remover item personalizado, trocar cliente e caixa e revisar valores/avisos resultantes.

### KM50-042 — Revalidar preços, lote e estoque final

**Prioridade:** P0. **Responsável:** domínio/QA. **Depende de:** 015, 026, 029, 036, 041. **Origem:** KM3-062, 064–066, 070.

- [ ] Revisar fórmula de produtos, caixa, personalização, setup, descontos permitidos e total, com arredondamento monetário definido.
- [ ] Alinhar toggle Por kit/Total do lote e quantidade de kits sem multiplicar setup indevidamente.
- [ ] Exibir estoque suficiente/insuficiente/desconhecido de acordo com demanda de cada variante vezes lote.
- [ ] Bloquear conclusão quando preço, estoque ou compatibilidade necessários estiverem sem validação, com ação corretiva explícita.
- [ ] Revalidar quando dados mudarem durante a revisão e informar estimativa versus preço confirmado.

**Aceite:** UI e payload transacional produzem os mesmos valores e quantidades. **Simulação/prova:** lote 1/50/100, setup único, centavos, quantidade extrema, mudança de estoque e ausência de preço.

### KM50-043 — Comprovar criação de orçamento ponta a ponta

**Prioridade:** P0. **Responsável:** frontend/banco/QA. **Depende de:** 005, 008–010, 037, 041, 042. **Origem:** KM3-068, 094; F20-05.

- [ ] Preservar integração existente com `create_kit_quote_transactional` e confirmar contrato de cliente, variantes, personalização, notas e kit origem.
- [ ] Verificar atomicidade e autorização do conjunto, sem modificar RPCs gerais de orçamento fora de proposta autorizada.
- [ ] Testar request ID/fingerprint em timeout após commit, retry e duplo clique, com resposta equivalente e sem duplicata.
- [ ] Criar orçamento descartável no ambiente autorizado e consultar readback: itens, totais, vínculo do kit e revisão.
- [ ] Confirmar navegação ao orçamento real, feedback de erro, recuperação e limpeza restrita aos IDs de teste.

**Aceite:** um kit gera exatamente um orçamento por operação lógica, com dados corretos e sem resíduo parcial. **Simulação/prova:** falha ao inserir item intermediário, usuário sem acesso e repetição da mesma operação.

### KM50-044 — Resolver frete sem transformar estimativa em promessa

**Prioridade:** P1. **Responsável:** integração/comercial. **Depende de:** 004, 011, 042. **Origem:** KM3-015, 067; F20-15.

- [ ] Registrar D4 e preservar a estimativa atual claramente identificada até existir contrato real autorizado.
- [ ] Definir origem/destino, CEP, dimensões embaladas, peso por lote, valor declarado e produtos com restrição de transporte.
- [ ] Se aprovado, integrar provedor pelo backend com segredo dedicado, timeout e cache por todas as entradas relevantes.
- [ ] Tratar peso desconhecido, CEP inválido, sem cobertura e cotação expirada sem usar valores fictícios como frete contratado.
- [ ] Exibir validade, serviço, prazo e valor estimado/cotado separadamente do pedido, sem contratar frete automaticamente.

**Aceite:** resultado real é rastreável ao provedor; caso seja escolhida só estimativa, registrar redução explícita do requisito legado. **Simulação/prova:** peso nulo, mudança de lote, CEP não atendido e indisponibilidade do provedor.

### KM50-045 — Validar impressão/PDF apresentável

**Prioridade:** P1. **Responsável:** frontend/QA/PO. **Depende de:** 004, 041–044. **Origem:** KM3-069, 070; F20-20.

- [ ] Confirmar D5 e preservar a folha já existente se atender ao contrato, sem adicionar serviço caro por padrão.
- [ ] Conferir identidade, cliente, composição, personalização, caixa, preços e observações na versão impressa.
- [ ] Remover shell/botões, controlar quebras de página, cabeçalhos, imagens e fallback de fonte sem truncar itens.
- [ ] Testar kit curto/longo, ausência de foto, muitos itens e caracteres portugueses nos navegadores suportados.
- [ ] Guardar PDF de amostra sanitizado e comparação com a revisão, sem alegar que `window.print()` sozinho valida exportação.

**Aceite:** documento legível e fiel aos dados, sem cortes ou total divergente. **Simulação/prova:** tabela multipágina, observação com 500 caracteres, zoom e carregamento tardio de imagens.

### Bloco J — Qualidade, publicação e encerramento

### KM50-046 — Fechar acessibilidade e responsividade transversal

**Prioridade:** P1. **Responsável:** QA/frontend. **Depende de:** 016–020, 025, 030–032, 035, 038, 040, 045. **Origem:** KM3-089, 090; F20-09, 10.

- [ ] Auditar teclado, nome acessível, foco, modais, anúncios de status e contraste nos oito estados/superfícies aprovados.
- [ ] Corrigir chips não interativos e ações somente em hover; incluir controles equivalentes para toque/leitor de tela.
- [ ] Testar 390 px, desktop e zoom de 200%, sem overflow da página nem controles inacessíveis atrás de painéis.
- [ ] Respeitar redução de movimento e validar efeitos/transições sem adicionar animação que prejudique tarefa.
- [ ] Combinar scanner automático com roteiro manual; registrar exceções por impacto, não somente contagem de violações.

**Aceite:** fluxos essenciais funcionam sem mouse e no mobile, preservando tema e legibilidade. **Simulação/prova:** sessão só por teclado do início ao orçamento e retorno de foco após todos os diálogos.

### KM50-047 — Fortalecer E2E e testes negativos reais

**Prioridade:** P0. **Responsável:** QA/segurança. **Depende de:** 005, 008, 009, 032, 035, 038, 040, 043, 046. **Origem:** KM3-085, 092–095; F20-03–06.

- [ ] Reconciliar specs antigas com rotas/seletores reais; remover falso verde e assertions engolidas, sem enfraquecer contratos válidos.
- [ ] Cobrir Itens→Caixa e Caixa→Itens até orçamento, incluindo personalização, rascunho, reabertura e biblioteca.
- [ ] Validar RLS/ownership com dois usuários, concorrência de revisões e isolamento de recibos, sem permissões administrativas mascarando resultados.
- [ ] Incluir expiração de sessão, rede intermitente, serviços indisponíveis, dados incompletos e regressões descobertas nesta rodada.
- [ ] Guardar trace/log sanitizado, SHA e ambiente; separar E2E mockado, integração real e smoke read-only de produção.

**Aceite:** falha funcional real quebra a suíte apropriada; não há aprovação por apenas sair da tela de login. **Simulação/prova:** retirar deliberadamente uma ação em fixture de teste e confirmar falha do contrato, revertendo a simulação local.

### KM50-048 — Fechar fidelidade visual, performance e regressão

**Prioridade:** P0. **Responsável:** QA/design/liderança técnica. **Depende de:** 002, 003, 023, 045–047. **Origem:** KM3-008, 030, 040, 048, 058, 070, 078, 086, 091, 095, 096; F20-07, 08.

- [ ] Capturar oito superfícies em 390, 1280 e 1440 px: pelo menos 24 evidências-base, acrescentando estados críticos.
- [ ] Fixar dados, fontes, relógio e viewport; separar diff visual automático de aprovação humana de fidelidade ao mockup.
- [ ] Medir catálogo grande, bundle, render, rede e interação; adotar orçamento a partir da baseline aprovada na etapa 023.
- [ ] Rodar typecheck, lint, build e regressão relevante; preservar gates obrigatórios e investigar flakes em vez de ignorá-los.
- [ ] Submeter diferenças ao PO por tela, com lista de exceções e comparação lado a lado; não atualizar baseline automaticamente para esconder regressão.

**Aceite:** evidência visual e funcional revisada, sem requisito não mapeado nem falha crítica aberta. **Simulação/prova:** card sem imagem, coluna espremida e texto excessivo devem produzir divergência detectável.

### KM50-049 — Reconciliar GitHub, Vercel e Supabase no release

**Prioridade:** P0. **Responsável:** release/banco. **Depende de:** 009, 010, 047, 048 e autorização operacional. **Origem:** KM3-098, 099.

- [ ] Registrar PRs/SHAs, gates obrigatórios, aprovação e ausência de conflito semântico; não presumir que branch enviada já está na `main`.
- [ ] Antes de aplicar qualquer pacote de banco aprovado, comparar ledger e definições, conferir alvo e simular; aplicar só objetos explicitamente autorizados e registrar recibos.
- [ ] Verificar versões das Edge Functions necessárias e seus contratos, sem expor valores de secrets nem redeploy indiscriminado.
- [ ] Identificar na Vercel o deployment de produção e SHA realmente associado ao domínio; distinguir preview, build concluído e alias publicado.
- [ ] Executar smoke autorizado em `/api/health`, `/api/ready` e `/montar-kit`, conferir assets/cache e monitorar 24 horas com critérios de reversão definidos antes do deploy.

**Aceite:** código aprovado, deployment servido e contratos do banco correspondem entre si; acesso Vercel ausente mantém esta etapa bloqueada. **Simulação/prova:** domínio apontando para SHA antigo, migration no ledger com corpo divergente e Edge desatualizada devem ser detectados. Reversão de código por processo aprovado; banco somente compensação forward-only autorizada.

### KM50-050 — Encerrar com prova e pendências explícitas

**Prioridade:** P0. **Responsável:** liderança técnica/PO. **Depende de:** 001–049.

- [ ] Atualizar matriz de todos os requisitos legados e checklists, anexando teste, screenshot/trace, commit e ambiente por entrega.
- [ ] Separar concluído, bloqueado e dispensado pelo PO; não usar “100% implementado” se existir requisito obrigatório pendente.
- [ ] Confirmar preservação de cores, guardas SSOT, dados e mudanças de outros agentes; liberar reservas do trabalho concluído.
- [ ] Registrar problemas remanescentes com severidade, responsável e prazo, além de runbook e limitações comerciais do módulo.
- [ ] Obter aceite final do PO sobre visual e comportamento em produção e publicar resumo verificável do release.

**Aceite:** encerramento baseado em evidência e concordância explícita, não em nota subjetiva 10/10. **Simulação/prova:** uma etapa marcada concluída sem recibo, deployment divergente ou fluxo bloqueado impede declarar implementação total.

## 4. Ondas, dependências e pontos de parada

| Onda                         | Etapas  | Entrega e ponto de parada                                                                        |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| A — Contratos                | 001–005 | Base, referências, rastreabilidade, decisões e ambiente seguro                                   |
| B — Estado e dados           | 006–015 | Contratos confiáveis; parar objetos bloqueados por DDL/DML sem impedir trabalho independente     |
| C — Estrutura e catálogo     | 016–026 | Entrada, navegação, layout, itens, filtros e composição; revisar visual antes de espalhar padrão |
| D — Caixas e personalização  | 027–036 | Dois fluxos, recomendações, exceções e mockup real; bloquear promessas sem dados                 |
| E — Biblioteca, IA e revisão | 037–045 | Status honestos, sugestões aplicáveis, orçamento, frete e impressão                              |
| F — Prova de entrega         | 046–050 | E2E, visual, performance, release e aceite do PO                                                 |

Executar testes pequenos em cada etapa, não só na última onda. Dependência é condição de entrada, não obrigação de esperar todo o bloco: 017–020 podem avançar enquanto D3 bloqueia 016; mocks determinísticos permitem preparar UI sem declarar a integração concluída. Manter PRs pequenos por superfície/contrato e nunca incluir ajustes globais oportunistas.

Parar o lote afetado quando houver: conflito de reserva; fonte de dado indefinida; divergência de schema; teste que requer produção sem autorização; custo externo não aprovado; quebra de gate obrigatória; referência visual ambígua; segredo aparecendo em artefato. Registrar bloqueio e seguir apenas itens independentes.

## Anexo A — Cobertura do plano anterior de 100 etapas

Esta tabela indica destino, **não conclusão**. A etapa 003 deve detalhar requisito por requisito e ligar as evidências reais. Os intervalos são inclusivos.

| Requisitos KM3 | Etapas deste plano que os implementam ou validam |
| -------------- | ------------------------------------------------ |
| 001–003        | 001–003, 016, 019, 020                           |
| 004–008        | 002, 004–006, 019, 022, 028, 048                 |
| 009–016        | 004, 009–015, 044                                |
| 017–020        | 015, 022                                         |
| 021–025        | 021, 023–025                                     |
| 026–030        | 008, 026, 047, 048                               |
| 031–034        | 024, 027–029                                     |
| 035–040        | 026, 028–031, 047, 048                           |
| 041–048        | 011, 012, 017, 018, 027, 032, 047, 048           |
| 049–052        | 014, 033–035                                     |
| 053–058        | 018, 033, 035, 036, 047, 048                     |
| 059–063        | 029, 041, 042                                    |
| 064–070        | 042–045, 047, 048                                |
| 071–075        | 007, 013, 037, 038                               |
| 076–078        | 024, 038, 047, 048                               |
| 079–086        | 007, 039, 040, 047, 048                          |
| 087–090        | 006, 017–020, 046                                |
| 091–094        | 005, 009, 023, 043, 047, 048                     |
| 095–100        | 001, 003, 047–050                                |

## Anexo B — Cobertura do plano posterior de 20 etapas

| Requisitos F20                | Destino                 |
| ----------------------------- | ----------------------- |
| 01–02 — ambiente/autenticação | 005                     |
| 03–04 — dois percursos        | 017, 026, 032, 047      |
| 05 — orçamento real           | 043                     |
| 06 — RLS/concorrência         | 008, 009, 047           |
| 07–08 — visual/aceite         | 002, 020, 048, 050      |
| 09–10 — mobile/acessibilidade | 019, 020, 025, 046      |
| 11–12 — áreas                 | 014, 033–035            |
| 13–14 — estoque               | 015, 022, 042           |
| 15 — peso no frete            | 011, 044                |
| 16 — busca de caixas          | 027                     |
| 17–18 — IA/telemetria         | 039, 040                |
| 19 — badges comerciais        | 004, 019, 022, 028, 029 |
| 20 — impressão                | 045                     |

## Anexo C — Recibo obrigatório por etapa

Preencher em documento de execução versionado ou PR referenciada pela matriz:

```text
Etapa: KM50-NNN
Estado: PENDENTE | EM EXECUÇÃO | IMPLEMENTADA LOCAL | VALIDADA EM HOMOLOGAÇÃO |
        PUBLICADA | CONCLUÍDA | BLOQUEADA | DISPENSADA PELO PO
Responsável e reserva:
Requisitos KM3/F20 atendidos:
Base examinada e implementação já existente:
Mudança realizada (ou manutenção justificada):
Arquivos e objetos afetados:
Dependências e autorizações (referências):
Simulações positivas/negativas e resultados:
Comandos de teste, SHA, data UTC e ambiente:
Evidência visual/API/banco e localização durável sanitizada:
PR/commit e deployment/versão Edge, quando aplicável:
Falhas, limitações e itens não executados:
Reversão/compensação prevista:
Revisor e aceite do PO, quando exigido:
```

## Anexo D — Checklist final de liberação

- [ ] Exatamente 50 etapas possuem estado e responsável, sem item silenciosamente excluído.
- [ ] Todos os requisitos KM3-001–100 e F20-01–20 possuem destino e evidência ou dispensa explícita.
- [ ] Fluxo, briefing, origem, variantes e personalização sobrevivem ao round-trip.
- [ ] Nenhum kit apenas `ready` é apresentado como publicação comprovada.
- [ ] Dado desconhecido não aparece como compatível, em estoque, frete real ou preço confirmado.
- [ ] Nenhum mockup é declarado geometricamente preciso com dados insuficientes.
- [ ] Dois fluxos completos e orçamento idempotente foram testados com autenticação real em ambiente autorizado.
- [ ] RLS/concorrência foram testadas sem credencial administrativa mascarando o papel do usuário.
- [ ] Oito superfícies têm referência, capturas nos três viewports e aceite visual separado do funcional.
- [ ] Nenhuma cor global foi alterada e nenhum trabalho de outro agente foi revertido.
- [ ] Gates obrigatórios aprovados, SHA publicado comprovado e contratos canônicos reconciliados.
- [ ] Relatório final distingue implementado, publicado, bloqueado e dispensado, sem alegação de perfeição não comprovada.
