# Magazine — plano de correções e melhorias em 50 etapas

Data: 09/09/2026. Projeto: Promo Gifts V4. Responsável pelo planejamento: Codex.

**Execução iniciada após solicitação explícita do PO em 09/09/2026. A primeira rodada de correções está na branch `codex/magazine-integrity-20260909`, em worktree isolada. Este documento não autoriza DDL ou publicação por si mesmo.**

Acompanhamento: [execução e pendências das 50 etapas](MAGAZINE_EXECUCAO_2026-09-09.md). A implementação é parcial; não há certificação 10/10, merge ou deployment nesta rodada.

## 1. Objetivo e regras de execução

Concluir os fluxos do Magazine e aproximar sua composição das cinco referências fornecidas pelo PO, corrigindo primeiro as falhas de integridade e persistência. O resultado deve funcionar de ponta a ponta: criar, selecionar template, editar, selecionar produtos, organizar páginas, salvar, publicar, abrir e exportar.

**As cores atuais do sistema serão preservadas.** A referência orienta estrutura, hierarquia, conteúdo e interação; suas cores não substituem o design system atual. Não reativar `useBluePremiumTheme`, modificar tokens globais ou converter o shell para o tema das imagens. A paleta escolhida pelo usuário para o conteúdo de uma revista continua sendo um recurso próprio do Magazine.

Regras obrigatórias:

1. Conferir o estado atual antes de cada tarefa: outro agente pode já ter corrigido o problema. Implementação existente deve ser validada e aproveitada, não refeita.
2. Respeitar reservas, trabalhos não commitados, decisões anteriores do PO e invariantes de `AGENTS.md`. Não resolver conflitos com substituição integral ou “main wins”.
3. Não alterar/apagar tabela, coluna ou função, aplicar migration, mudar grants/RLS ou executar operação produtiva por inferência. Apresentar objetos e impacto e obter autorização explícita do PO. Banco canônico: `doufsxqlfjyuvxuezpln`.
4. Não remover os templates adicionais, dados, testes ou funcionalidades de outros agentes para imitar apenas o recorte das imagens.
5. Toda ação visível precisa de implementação e resultado verificável; toast, botão decorativo, mock ou resposta HTTP inferior a 500 não provam sucesso.
6. Não usar dados produtivos em simulações destrutivas. Executar falhas, concorrência e testes de escrita em ambiente isolado autorizado, sem fallback silencioso para produção.
7. Tratar divergência intencional separadamente de defeito. Ausência de acesso ou decisão é bloqueio de validação, não aprovação.
8. Não alterar snapshots para esconder regressões; não desabilitar gates, pular cenários críticos ou usar retries para obter um resultado artificialmente verde.

## 2. Base de evidências e limites

Base de código da auditoria: `55e598d3e30b49adc218e43c67dfbe64136deae8`. O SHA de `main` remoto correspondia ao local na consulta daquela auditoria; isso não certifica o deployment atual.

Relatório de origem, ainda temporário: `/tmp/AUDITORIA_MAGAZINE_REFERENCIAS_2026-09-09.md`. Artefatos: `/tmp/promo-magazine-audit-20260909-poDRwT/`. A etapa 001 prevê preservação durável das evidências pertinentes. Caso os temporários não existam mais, reproduzir; não inventar resultados.

Resultados anteriores, não reexecutados pela criação deste plano:

- 745 testes existentes passaram, 3 foram ignorados e nenhum falhou, em 39 arquivos.
- Typecheck passou. Dois contratos novos de integridade falharam: preservação dos itens após falha de gravação e estabilidade dos IDs.
- 23 cenários de navegador foram concluídos, incluindo reproduções de defeitos; isso **não significa 23 aprovações**.
- Browser local usou fixtures e componentes reais, sem o shell autenticado completo e com rede externa bloqueada. Não houve certificação pixel a pixel, de RLS, de triggers ou de publicação real.
- A instalação existente tinha discrepância entre a versão instalada do Vitest e a declarada no manifesto. É necessário repetir a validação em instalação isolada reproduzida pelo lockfile.

O [plano visual anterior](../design/blue-premium/MAGAZINE_BLUE_PREMIUM_PLAN.md) permanece histórico. Seus checklists não são herdados automaticamente: algumas ações assinaladas como concluídas não foram confirmadas na auditoria atual. A instrução atual de preservar cores prevalece sobre qualquer orientação visual anterior incompatível.

### Referências funcionais

| Referência | Tela | Contrato principal |
|---|---|---|
| R1 | Biblioteca | Cinco KPIs; busca; status; ordenação; grade/lista; capas; metadados e ações por revista |
| R2 | Galeria | Famílias e densidades; cards com identidade própria; favoritos; preview e criação pelo template |
| R3 | Preview Vogue | Modal amplo; informações; tipografia; página A4; navegação; zoom e tela cheia |
| R4 | Editor / Identidade | Cinco etapas; formulário + página + trilho; CRM; marca; salvamento real e gestão editorial |
| R5 | Editor / Produtos | Catálogo navegável; busca e filtros; seleção; variantes; favoritos; resumo lateral consistente |

### Convenções do checklist

São **exatamente 50 etapas**, em 10 grupos. O checklist de encerramento permanece **0/50 homologadas integralmente**. Isso não significa ausência de entregas: existem correções implementadas e testadas localmente, detalhadas no relatório de execução. Não confundir avanço de código com aceite completo de cada etapa, que inclui integrações e cenários ainda pendentes.

Cada etapa só pode ser marcada como concluída com evidência do critério de aceite, identificação do commit/ambiente e registro de limitações. Estados de acompanhamento: pendente, em execução, bloqueada, implementada sem validação, validada em teste, validada em produção ou não aplicável com justificativa aprovada. Um item dispensado não deve ser apresentado como funcionalidade implementada.

Prioridade: **P1** = integridade ou fluxo essencial quebrado; **P2** = completude funcional/fidelidade; **GATE** = pré-condição ou aprovação. As dependências abaixo são lógicas, não autorização para mudar sistemas externos. Etapas independentes podem ser distribuídas entre agentes somente com coordenação explícita e arquivos reservados.

## Grupo A — Reconciliação, evidências e decisões (001–005)

- [ ] **001 — Reconciliar código, planos e trabalhos dos agentes.** `GATE`
  - Entrega: identificar branch, SHA, PRs pertinentes, worktrees, alterações locais e reservas; comparar semanticamente com a base auditada. Preservar relatório e evidências úteis em destino durável aprovado, sem credenciais ou dumps de clientes. Mapear tarefas já atendidas pelo Cline, Codex ou outro agente.
  - Cenários/aceite: correção presente só em branch, commit equivalente na main, arquivo modificado sem commit e checklist antigo contraditório. Cada tarefa deve apontar implementação existente ou lacuna comprovada; não sobrescrever trabalho paralelo.
  - Dependências: nenhuma. Evidência: mapa tarefa → arquivo/commit/teste e SHA-base da nova rodada.

- [ ] **002 — Estabelecer ambiente de validação reproduzível e isolado.** `GATE`
  - Entrega: worktree/ambiente de teste separado; versões de Node e gerenciador compatíveis com o projeto; instalação pelo lockfile; navegador correspondente ao Playwright instalado. Identificar configuração real de testes antes de executar scripts.
  - Cenários/aceite: dependência instalada divergente, navegador ausente, secret ausente e URL apontando para produção. Falhar explicitamente sem redirecionar para o canônico; não reinstalar dependências na worktree compartilhada. Registrar versões e comandos.
  - Dependências: 001. Sem alteração de lockfile apenas para acomodar o ambiente de auditoria.

- [ ] **003 — Transformar reproduções em baseline de regressão.** `GATE / P1`
  - Entrega: preservar e incorporar os dois contratos que falharam, fixtures determinísticas e capturas dos cinco estados. Registrar IDs/ordem de itens antes e depois, dimensões do renderer e tokens/cores atuais do sistema.
  - Cenários/aceite: DELETE seguido de INSERT com falha; mudança de título que recria IDs; update nulo; saída antes de 400 ms. Os testes devem demonstrar os defeitos na base, quando ainda presentes, sem aceitar perda de dados como comportamento esperado.
  - Dependências: 001–002. Evidência: falha reproduzida ou prova de que outro agente já a corrigiu, sempre com versão identificada.

- [ ] **004 — Fechar ambiguidades das referências com decisões de produto.** `GATE / PO`
  - Entrega: registrar decisões sobre densidade do 2×3 — seis produtos sugere 5+, apesar do badge 2–4 da imagem —; pontos do modal versus páginas; fontes/famílias; seleção imediata ou em lote; favoritos; ativos fotográficos e conteúdo editorial livre versus estruturado.
  - Cenários/aceite: contadores ilustrativos 1/12 e seis miniaturas não viram valores fixos; oito templates visíveis não significam excluir os outros quatro. Manter a remoção de miniaturas do popover já atribuída ao PO, salvo nova decisão. Preservação de cores é requisito decidido, não pergunta pendente.
  - Dependências: 001. Bloquear somente a implementação que dependa de decisão ainda ausente; avançar nas correções independentes.

- [ ] **005 — Inventariar contratos de persistência e permissões, somente leitura.** `GATE / BD`
  - Entrega: conferir identidade do projeto conectado antes de qualquer consulta; mapear serviço/types/migrations e, quando houver acesso autorizado, inspecionar `pg_catalog` para tabelas/views/RPCs, constraints, índices, triggers, políticas e privilégios ligados ao Magazine. Não usar OpenAPI como inventário de schema.
  - Cenários/aceite: tipos gerados desatualizados, MCP apontando para outro projeto, RLS filtrando update, objeto com mesmo nome e assinatura distinta. Produzir matriz de contratos reais, lacunas de acesso e possíveis objetos afetados; nenhum DDL ou reparo automático.
  - Dependências: 001. A falta de acesso live impede certificação do banco, mas não a inspeção e os testes isolados de código.

## Grupo B — Autosave confiável e preservação de dados (006–010)

- [ ] **006 — Separar patches de metadados das mutações de itens.** `P1`
  - Entrega: ajustar o hook e `magazineService` para que título, subtítulo ou branding não enviem uma substituição integral de `items`. Distinguir campo ausente, lista vazia intencional e atualização parcial.
  - Cenários/aceite: editar apenas título em revista com 100 itens gera somente a alteração necessária; nenhum DELETE/INSERT de itens é disparado. Falha de metadados não modifica produtos. Testar payload antigo compatível, evitando regressão de consumidores existentes.
  - Dependências: 003; contratos de código levantados em 005. Achado: F01.

- [ ] **007 — Preservar IDs e reconciliar o resultado persistido.** `P1`
  - Entrega: manter IDs de itens existentes em edições; gerar identidade apenas para novos itens; reconciliar no estado o retorno confirmado do serviço, inclusive `updatedAt`, IDs e versões disponíveis. Não usar índice visual como identidade persistente.
  - Cenários/aceite: renomear, reordenar, trocar variante e salvar repetidamente preserva IDs; criação pendente reconciliada não duplica item; retorno parcial/nulo não apaga estado válido. O segundo contrato de integridade deve passar sem relaxamento.
  - Dependências: 006. Achados: F02–F03.

- [ ] **008 — Controlar gravações concorrentes e respostas fora de ordem.** `P1`
  - Entrega: fila/coalescência por revista, identificação da revisão salva e proteção contra resposta antiga. Definir detecção de conflito entre abas/usuários; usar mecanismo de comparação atômica existente ou propor solução explícita se exigir RPC/schema.
  - Cenários/aceite: digitação rápida, rede lenta, resposta B antes de A, troca de revista durante request, retry de request com resultado desconhecido e dois editores simultâneos. Não sobrescrever silenciosamente alteração mais recente; conflito deve ser recuperável e visível.
  - Dependências: 005–007. Controle apenas no cliente não deve ser descrito como proteção transacional multiusuário.

- [ ] **009 — Implementar estados verdadeiros de salvamento.** `P1`
  - Entrega: estado explícito `dirty/saving/saved/error`, revisão pendente e horário do último sucesso confirmado. “Salvar rascunho” e Ctrl/Cmd+S devem chamar a mesma operação aguardável, não apenas emitir toast.
  - Cenários/aceite: retorno `null`, exceção, timeout, update sem linha retornada e edição ocorrida durante gravação. A UI não exibe “salvo” até confirmar a revisão correspondente; erro mantém dados editáveis e oferece retry sem duplicação.
  - Dependências: 007–008. Achado: F03. Gravação antiga bem-sucedida não limpa o estado dirty de uma revisão nova.

- [ ] **010 — Proteger saída, troca de template, publicação e impressão.** `P1`
  - Entrega: flush aguardável ao navegar dentro do app, trocar template, publicar ou exportar; impedir corrida com debounce. Para fechamento abrupto, definir aviso e recuperação local proporcional ao risco, com isolamento por usuário/revista e política de descarte.
  - Cenários/aceite: sair em menos de 400 ms, fechar aba offline, logout com pendência e imprimir após última tecla. Falha permite permanecer/repetir/descartar conscientemente. Não prometer que `beforeunload` aguardará uma Promise ou que armazenamento local é persistência no servidor.
  - Dependências: 008–009. Achado: F04. Recuperação não pode reapresentar conteúdo de outra conta.

## Grupo C — Operações atômicas, erros e publicação (011–015)

- [ ] **011 — Garantir atomicidade nas operações com múltiplos itens.** `P1 / BD condicional`
  - Entrega: substituir sequências destrutivas não atômicas por contrato transacional adequado. Reutilizar RPC existente somente após conferir semântica, permissões e ownership; caso necessário, preparar proposta forward-only específica, testes e aprovação por objeto.
  - Cenários/aceite: falhar no segundo item ou após exclusão mantém o conjunto anterior íntegro; retry não duplica; usuário sem acesso não altera revista alheia. Não tratar sequência de chamadas HTTP como uma transação PostgreSQL.
  - Dependências: 005–008. O primeiro contrato de integridade deve passar. Aplicação no canônico fica condicionada à etapa 049 e à autorização explícita.

- [ ] **012 — Unificar operações em lote, reordenação e desfazer.** `P1`
  - Entrega: contrato consistente para adicionar/remover vários produtos, limpar seleção persistida e desfazer exclusões, respeitando a atomicidade disponível. Aguardar resultado agregado e impedir ações concorrentes incompatíveis sem bloquear desnecessariamente a UI.
  - Cenários/aceite: duplo clique, limpar durante autosave, undo depois de nova edição e falha parcial simulada. Nenhuma operação informa sucesso com subconjunto aplicado; compensação, quando necessária, deve ser explícita e não apagar alterações posteriores.
  - Dependências: 009–011. Manter separadas a limpeza da seleção temporária e a exclusão dos itens já gravados.

- [ ] **013 — Distinguir carregamento, vazio, erro, ausência e acesso negado.** `P1`
  - Entrega: revisar respostas de listagem/leitura do serviço e estados das telas. Não converter falha de consulta em `[]`; tratar também erro na consulta complementar de itens. Invalidar caches e respostas de conta/revista anterior.
  - Cenários/aceite: rede indisponível, sessão expirada, RLS bloqueando, revista inexistente e lista realmente vazia. A interface não anuncia “nenhuma revista” enquanto carrega nem destrói dados locais ao tentar novamente. Erros não expõem dados de outros usuários.
  - Dependências: 005, 009. Evidência: testes dos cinco estados com componentes reais e respostas controladas.

- [ ] **014 — Fechar o contrato salvar → publicar → acessar → revogar.** `P1`
  - Entrega: publicação usa a revisão confirmada, retorna estado/token válidos e só então libera cópia/abertura do link. Revisar comportamento de rascunhos, republicação, arquivamento e despublicação conforme o lifecycle existente.
  - Cenários/aceite: última edição ainda pendente, clique repetido, timeout com resultado desconhecido, token inválido/revogado e acesso anônimo permitido somente à superfície pública prevista. Não apresentar uma URL como publicada se o backend não confirmou.
  - Dependências: 005, 010–013. Testes de escrita/publicação são isolados e autorizados; regras live continuam dependentes de validação real.

- [ ] **015 — Executar a bateria de integridade antes de avançar a entrega visual.** `GATE / P1`
  - Entrega: simulações determinísticas de falha de rede, latência, erro de autorização, rejeição de gravação, repetição e concorrência, com comparação de valores, IDs, ordem e quantidade antes/depois.
  - Cenários/aceite: nenhum item perdido, nenhuma confirmação falsa, nenhum update silencioso sobre revisão conflitante; ambos os novos contratos passam e regressões de salvamento/publicação são bloqueantes. Documentar o que depende de banco real, sem atribuir cobertura live aos mocks.
  - Dependências: 006–014. Este gate bloqueia liberação funcional, não atividades independentes de desenho e investigação.

## Grupo D — Renderer, fontes, preview e PDF (016–020)

- [ ] **016 — Corrigir escala e origem da transformação no renderer compartilhado.** `P1`
  - Entrega: alinhar o elemento transformado e seu `transform-origin`, dimensões lógicas e área reservada pelo wrapper. Revisar `MagazinePageRenderer.tsx` e os seletores relacionados em `magazine.css`.
  - Cenários/aceite: editor, modal, capa da biblioteca e miniaturas exibem a página dentro do contêiner, inclusive após resize. Medir bounding boxes em mais de uma largura; não corrigir por offsets mágicos exclusivos de um screenshot.
  - Dependências: 002–003. Achado: F05. Não alterar cores, tokens ou o tamanho lógico dos documentos sem justificativa.

- [ ] **017 — Compartilhar escopo CSS e carregamento independente de navegação.** `P1`
  - Entrega: definir uma entrada confiável de estilos e variáveis locais do Magazine para cards, galeria, modal, editor e página pública. Remover dependência de visitar o editor antes da galeria, sem vazar estilos para o restante do app.
  - Cenários/aceite: acesso direto, reload frio, retorno pelo histórico e navegação após editor geram a mesma geometria. Cards/preview usam o mesmo contrato A4 quando aplicável; classes ausentes não produzem canvas com altura diferente.
  - Dependências: 016. Achado: F06. Registrar comparação de rotas frias/quentes e preservação dos estilos externos.

- [ ] **018 — Reconciliar fontes declaradas, carregadas e demonstradas.** `P2`
  - Entrega: mapear fontes/pesos reais do registry e decisões de 004; disponibilizar arquivos licenciados quando necessário e aplicar `fontFamily` nas amostras. Restringir tipografia editorial ao conteúdo do template, sem trocar a fonte global do sistema.
  - Cenários/aceite: carregamento inicial lento, fonte indisponível, impressão e texto com acentos. Amostra, página e PDF usam a família/peso aprovados; fallback é definido e não causa overflow oculto. Etiqueta de fonte não serve como prova de carregamento.
  - Dependências: 004, 017. Achados: F06/F17. Não importar silenciosamente fontes externas sem conferir convenções do projeto.

- [ ] **019 — Concluir navegação, zoom e tela cheia acessíveis.** `P2`
  - Entrega: estado coerente de página ativa, anterior/próxima, contador, pontos conforme decisão do PO, ajuste ao espaço e zoom limitado. Manter foco, Escape, atalhos apropriados e retorno da tela cheia.
  - Cenários/aceite: uma página, várias páginas, remoção da última, resize com sidebar aberta e navegação só por teclado. Contador representa o conjunto efetivo; controles impossíveis ficam desabilitados; nenhum zoom deixa a página permanentemente inacessível.
  - Dependências: 004, 016–018. Paridade de comportamento entre preview do template e editor, respeitando contextos diferentes.

- [ ] **020 — Validar exportação e impressão com o renderer real.** `P1/P2`
  - Entrega: garantir salvamento/versão correta, prontidão de imagens/fontes, A4, quebras, margens e ordenação. Definir mensagem de falha para asset que impeça exportação; não exportar screenshot estático fingindo documento funcional.
  - Cenários/aceite: produto sem foto, imagem lenta, descrição longa, várias páginas, capa/contracapa e última edição pendente. PDF/print e preview mostram os mesmos produtos, textos e ordem; controles de UI não aparecem nas páginas impressas.
  - Dependências: 010, 016–019. Complementar depois de 045 para os novos tipos editoriais; não aprovar somente porque `window.print` foi chamado.

## Grupo E — Templates e galeria equivalentes às referências (021–025)

- [ ] **021 — Reconciliar registry sem quebrar revistas existentes.** `P2 / PO`
  - Entrega: revisar nome, família, densidade, descrição e fontes dos oito templates de referência, preservando os adicionais. Tratar explicitamente Vogue, Magazine, Manifesto, Executivo e os catálogos com metadados divergentes; definir compatibilidade/versionamento quando a mudança alterar paginação existente.
  - Cenários/aceite: abrir revista antiga após atualização não perde produtos/páginas nem muda composição publicada silenciosamente. IDs são estáveis; filtros refletem metadados reais. Toda divergência intencional tem decisão registrada.
  - Dependências: 004–005, 018. Achado: F17. Reclassificar não é autorização para remover templates.

- [ ] **022 — Substituir placeholders da vitrine por ativos autorizados.** `P2 / PO quando necessário`
  - Entrega: conjunto de imagens demonstrativas e conteúdo editorial próprio por template, com origem/licença e fallback documentados. Separar fixture de demonstração de dados comerciais reais; usar assets locais ou storage previsto pelo projeto.
  - Cenários/aceite: os cards têm identidade fotográfica coerente com R2; ausência de foto real possui fallback honesto. Não usar a imagem inteira da referência para simular botões, tipografia ou editor funcionando. Não inventar preço/cliente produtivo para obter igualdade visual.
  - Dependências: 004, 021. Se os assets exatos não estiverem disponíveis, registrar limite de fidelidade e obter aprovação da alternativa.

- [ ] **023 — Ajustar composições dos templates e seus cards.** `P2`
  - Entrega: conferir hierarquia, proporção imagem/texto, recortes, grade, densidade, espaços e legibilidade de Vogue, Magazine, Hero Grid, Mono, Manifesto, Catálogo 2×3, Catálogo 3×3 e Executivo. Validar também que os quatro extras permanecem funcionais.
  - Cenários/aceite: título longo, uma ou várias imagens, quantidades incompletas e ausência de descrição. Renderização real corresponde à composição aprovada sem alterar as cores do shell; não reduzir texto a imagem para evitar problemas de layout.
  - Dependências: 016–018, 021–022. Evidência: matriz por template e exemplos com dados distintos, não somente a fixture ideal.

- [ ] **024 — Completar informações e estrutura do modal de preview.** `P2`
  - Entrega: descrição detalhada, formato/orientação, páginas por layout, estilo, público, características, casos de uso, amostras tipográficas e paleta do template; header, ações e fechamento equivalentes a R3. Menu de reticências só aparece com ações definidas e operantes.
  - Cenários/aceite: conteúdo cabe com rolagem adequada; teclado/foco não escapam indevidamente do modal; dados vêm de fonte única e não divergem dos cards/renderer. Criar revista utiliza o template visualizado.
  - Dependências: 019, 021–023. Separar paleta editorial do template das cores imutáveis da interface.

- [ ] **025 — Corrigir criação pelo template, retorno e favoritos da galeria.** `P1/P2`
  - Entrega: “Usar template” sem `returnTo` cria efetivamente a revista com o `templateId` escolhido e abre seu editor; com retorno válido, aplica à revista correta após flush. Ordenação “recentes” usa dado real ou recebe rótulo honesto aprovado. Definir favoritos conforme 004, isolados por conta quando aplicável.
  - Cenários/aceite: duplo clique, create rejeitado, destino externo/malformado, troca de conta e reload. Não navegar como sucesso se criação falhou; não perder escolha; não usar localStorage global como prova de persistência multiusuário.
  - Dependências: 010, 013, 021–024. Achado: F07. Corrigir o teste que hoje aprova apenas voltar para a lista.

## Grupo F — Biblioteca, cards, busca e lifecycle (026–030)

- [ ] **026 — Validar header, cinco KPIs e controles da biblioteca.** `P2`
  - Entrega: verificar título/subtítulo, ações de entrada, totais, filtros de status, ordenação/direção e grade/lista no shell real. Definir se KPIs representam todo o conjunto acessível ou o filtro aplicado, com comportamento consistente.
  - Cenários/aceite: loading, conjunto vazio, muitos registros e erro de contagem; não exibir zero como resultado confirmado antes de carregar. Layout se aproxima de R1 preservando cores e sem fixar os números da imagem.
  - Dependências: 013, 017. Se a lista for paginada, não calcular totais globais apenas da página visível.

- [ ] **027 — Completar os cards e ações por status.** `P2`
  - Entrega: capa paisagem, badge sobre a imagem, empresa com ícone, quantidade/template, data relativa, views, menu inferior e CTA “Abrir revista”/“Continuar edição”. Definir explicitamente a ação de arquivadas e paridade de informações no modo lista.
  - Cenários/aceite: título/cliente longos, capa ausente, rascunho sem token e publicada válida. Ação pública não abre editor por engano; menu funciona em touch/teclado sem depender de hover; links e botões não têm interação aninhada inválida.
  - Dependências: 014, 016, 021, 026. Achado: F15. Não apenas atualizar textos sem ligar as ações reais.

- [ ] **028 — Cumprir o contrato de busca, filtros e ordenação da biblioteca.** `P2`
  - Entrega: buscar título, cliente e campo de descrição/subtítulo definido em 004, combinando status, ordenação estável e navegação do conjunto completo. Rever escopo local versus servidor conforme volume e contrato existente.
  - Cenários/aceite: descrição conhecida, caixa/acentos, busca sem resultado, datas empatadas, filtro após mudança de página e revista editada que muda de posição. Contagem e resultados permanecem coerentes; não prometer “descrição” se ela não for pesquisada.
  - Dependências: 004, 013, 026. Achado: F14. Testar ordenação ascendente/descendente e atualização após mutações.

- [ ] **029 — Revalidar criação, duplicação, arquivamento e exclusão com desfazer.** `P1/P2`
  - Entrega: verificar lifecycle completo, confirmações proporcionais, invalidação da lista e atualização de KPIs. Duplicação gera identidades próprias e não reutiliza acidentalmente token público, mantendo os campos previstos pelo produto.
  - Cenários/aceite: clique repetido, revista aberta em outra aba, exclusão negada, desfazer tardio e duplicação com falha. Não ressuscitar dados nem apagar mudança de outro agente/usuário; resultado exibido corresponde ao servidor.
  - Dependências: 011–014, 025–028. Testar exclusão somente com fixtures e ambiente autorizado, não dados produtivos existentes.

- [ ] **030 — Unificar URLs públicas e validar a superfície de acesso.** `P1`
  - Entrega: centralizar a construção do link na rota canônica existente `/revista-publica/:token`; eliminar geração inconsistente de `/m/:token` nos consumidores. Investigar eventual uso externo antes de propor alias/redirect de compatibilidade.
  - Cenários/aceite: link de menu, CTA, publicar, copiar e compartilhar aponta ao mesmo destino; token inexistente/expirado/revogado não serve conteúdo indevido. Acesso anônimo só é aprovado com resposta e conteúdo esperados, não status genérico `<500`.
  - Dependências: 014, 027–029. Achado: F08. Mudança de permissões ou contratos de publicação exige análise/autorização própria.

## Grupo G — Identidade, CRM e marca (031–035)

- [ ] **031 — Corrigir a busca e o alcance do seletor CRM.** `P2`
  - Entrega: separar busca textual e por documento, só comparar dígitos quando a consulta contiver dígitos úteis; paginação/busca no servidor conforme contrato existente, sem restringir silenciosamente aos primeiros 200 clientes.
  - Cenários/aceite: `ZZZInexistente` retorna vazio, não todos; nome com acento, documento parcial/formatado, cliente fora do lote inicial, erro e permissão. Respostas atrasadas não substituem a consulta atual.
  - Dependências: 005, 013. Achado: F10. Não ampliar privilégios do CRM para contornar erro de consulta.

- [ ] **032 — Persistir o vínculo CRM e manter o preenchimento manual.** `P2`
  - Entrega: salvar `clientCrmId` e reconciliar nome/logo conforme regra explícita; seleção e limpeza por ID, não igualdade de nome. Definir como overrides manuais interagem com mudança/desvinculação de cliente.
  - Cenários/aceite: duas empresas homônimas, cliente sem logo, limpeza, troca rápida e cliente posteriormente indisponível. Reload preserva vínculo correto; alterar nome manual não muda identidade sem intenção; cache não mistura empresas de contas diferentes.
  - Dependências: 007–009, 031. Achado: F11. Campo já existente deve ser aproveitado; migration só se comprovadamente necessária e autorizada.

- [ ] **033 — Completar validação e feedback do formulário de Identidade.** `P2`
  - Entrega: conferir título, subtítulo, contadores, limites 80/200 propostos nas referências, mensagens e seção manual avançada. Definir tratamento compatível de textos existentes maiores, sem truncamento silencioso.
  - Cenários/aceite: colar texto longo, espaços, acentos, título vazio e falha de autosave. Erros ficam ligados ao campo; preview e persistência usam o mesmo valor; bloquear avanço somente por regra real, não por restrição visual arbitrária.
  - Dependências: 004, 009, 032. Não modificar constraints do banco para igualar a imagem sem revisão e aprovação.

- [ ] **034 — Corrigir sincronização de hex e presets da marca.** `P2`
  - Entrega: sincronizar estado local de `SwatchField` com valor externo; validar hex, cancelar entrada inválida de forma clara e aplicar presets atomicamente ao branding da revista. Preservar edição manual e desfazer conforme contrato disponível.
  - Cenários/aceite: aplicar preset e desfocar campo não restaura cor antiga; update externo, hex incompleto, reload e undo mantêm botão/input/preview iguais. Nenhum token do shell, sidebar ou tema global muda.
  - Dependências: 006, 009, 033. Achado: F12. Corrigir o controle não autoriza redesenhar a paleta atual do sistema.

- [ ] **035 — Harmonizar layout e navegação das cinco etapas do editor.** `P2`
  - Entrega: conferir header, template selecionado, troca segura, autosave e ações; composição de três colunas em Identidade e adaptação do painel em Produtos; stepper com estado/foco e navegação coerentes. Garantir que formulários e preview não percam estado na troca de etapa.
  - Cenários/aceite: viewport menor, conteúdo comprido, retorno da galeria e erro de salvamento. Não sobrepor ações nem esconder dados essenciais; preservar decisões anteriores sobre o popover, cores e recursos já aprovados.
  - Dependências: 010, 019, 025, 031–034. R4/R5; gestão efetiva de páginas é entregue no grupo I, não por botões decorativos aqui.

## Grupo H — Catálogo, seleção, variantes e resumo (036–040)

- [ ] **036 — Tornar o catálogo completo, pesquisável e honestamente ordenado.** `P2`
  - Entrega: superar o lote fixo de 80 com paginação/carregamento incremental; busca por nome/SKU/categoria, filtros e totais coerentes. “Mais relevantes” requer ranking real ou rótulo alternativo aprovado; não representar ordem alfabética como relevância.
  - Cenários/aceite: produto na página seguinte, categoria fora do primeiro lote, mudança de consulta durante fetch, catálogo vazio e erro recuperável. Não somar categorias somente dos itens carregados como se fossem totais globais; preservar seleção ao navegar.
  - Dependências: 005, 013, 035. Achado: F13. Conferir índices/plano de consulta antes de propor alteração no banco por desempenho.

- [ ] **037 — Preservar seleção entre buscas, filtros e páginas.** `P1/P2`
  - Entrega: manter identidade e dados necessários da seleção independentemente de `filtered`; deduplicar por regra de produto/variante; distinguir selecionado pendente de item já gravado. Aplicar a modalidade imediata ou em lote aprovada em 004.
  - Cenários/aceite: selecionar Garrafa, filtrar Mochila, selecionar Mochila e adicionar 2 realmente adiciona ambas; erro não limpa seleção; retry não duplica. Estado visual e contador nunca prometem itens que o payload descartou.
  - Dependências: 004, 007, 011–012, 036. Achado: F09. Testar também item removido/indisponível no catálogo após seleção.

- [ ] **038 — Implementar favoritos de produtos com identidade e erro explícitos.** `P2 / PO`
  - Entrega: integrar coração e filtro pertinente ao mecanismo de favoritos já existente, se compatível. Definir escopo por usuário, persistência e comportamento offline; não criar tabela paralela sem investigar consumidores atuais e obter aprovação.
  - Cenários/aceite: favoritar/desfavoritar, reload, duas contas, falha de gravação e seleção simultânea. Coração não deve adicionar produto por propagação do clique; feedback reflete persistência real. Não confundir favorito de template com favorito de produto.
  - Dependências: 004–005, 036–037. Achado: F18. Se faltar decisão/infraestrutura, registrar bloqueio, não entregar controle sem efeito.

- [ ] **039 — Tornar variantes, imagens e preços coerentes no fluxo inteiro.** `P2`
  - Entrega: swatches selecionáveis quando houver variantes; imagem, cor, identificação e preço correspondentes no catálogo, item selecionado e renderer. Preservar campos críticos de `Product`, inclusive `price` e `sale_price`, respeitando regra comercial existente.
  - Cenários/aceite: variante sem foto/preço, preço de venda zero válido versus ausente, produto sem variantes, troca após inclusão e variantes de mesmo nome. Não escolher fallback por truthiness que descarte zero; não mostrar imagem principal como se fosse a variante selecionada.
  - Dependências: 007, 021, 036–037. Achado: F18. Mudança de cálculo comercial não pode ser inferida apenas da fotografia ou do preço ilustrativo.

- [ ] **040 — Fechar o resumo lateral e a estimativa real de páginas.** `P2`
  - Entrega: template, quantidade selecionada/persistida, lista com SKU/cor/imagem, remover individual, limpar tudo e mensagens condicionadas à operação. Usar o mesmo cálculo de paginação do documento para estimar capa, produtos, seções e contracapa.
  - Cenários/aceite: limpar falha sem exibir sucesso; seleção pendente é identificada; nove produtos Vogue com capa/contracapa não anunciam nove páginas quando o documento tem onze. Recalcular ao trocar template e após gestão editorial do grupo I.
  - Dependências: 012, 021, 037–039. Achados: F13/F18. Evitar loop assíncrono não aguardado e aprovação baseada somente em `items.length > 0`.

## Grupo I — Páginas editoriais e conteúdo persistente (041–045)

- [ ] **041 — Definir modelo editorial compatível com os dados atuais.** `P2 / PO / BD condicional`
  - Entrega: confrontar `pageOrder`, `pageNumber`, `introText`, `closingText` e tipos atuais com o renderer/paginador. Definir identidade estável de página, tipos suportados, conteúdo, ordem, relação com produtos e comportamento ao trocar template.
  - Cenários/aceite: revista legada sem páginas explícitas, seções vazias, produto removido, layout de densidade diferente e capa obrigatória. Propor aproveitamento do contrato existente antes de novas tabelas; não confundir ordem de produtos com ordem de páginas.
  - Dependências: 004–005, 007, 021, 040. Achado: F16. Aprovar limites do editor: páginas estruturadas versus composição livre.

- [ ] **042 — Preparar persistência editorial e evolução forward-only, se necessária.** `GATE / BD condicional`
  - Entrega: contrato validado de leitura/gravação e compatibilidade retroativa. Se houver mudança de schema/RPC/grants, listar cada objeto, diff, consumidores, permissões, migração de dados, testes e recuperação; preparar migrations específicas, sem aplicar ao canônico.
  - Cenários/aceite: dados antigos continuam legíveis, JSON inválido é rejeitado, versão nova não destrói campos desconhecidos e retry não duplica páginas. Validar em ambiente isolado autorizado e demonstrar estratégia de recuperação; não declarar backup disponível sem comprovação.
  - Dependências: 005, 011, 041. Se schema atual for suficiente, registrar “sem DDL necessário” com evidência, não criar migration vazia para cumprir checklist.

- [ ] **043 — Implementar criação e menus de páginas com persistência.** `P2`
  - Entrega: “Nova página”, seleção, nome, duplicação, configuração e exclusão/undo conforme tipos aprovados. Representar capa, sobre nós, produtos, kits, sustentabilidade e contato quando suportados pelo modelo, sem hardcode do número de páginas da imagem.
  - Cenários/aceite: criar duas vezes, duplicar página com produtos, excluir selecionada, falhar ao salvar e abrir novamente. IDs e conteúdo permanecem corretos; ações indisponíveis são explicadas; menus não são ornamentais.
  - Dependências: 009–012, 041–042. Autorização de DDL, se necessária, não é substituída pela existência do botão no frontend.

- [ ] **044 — Implementar reordenação acessível e paginação determinística.** `P2`
  - Entrega: reordenar por arrastar e por teclado/alternativa acessível; aplicar `pageOrder` no paginador real e sincronizar trilho, preview e documento. Preservar identidade/seleção ao alterar agrupamento ou densidade do template.
  - Cenários/aceite: mover primeira/última página, desfazer, recarregar, mudar template, duas operações rápidas e conflito entre editores. Não duplicar ou omitir produtos ao repaginar; posição visual só é confirmada como salva após persistência.
  - Dependências: 008, 019, 041–043. Ordem deve ser estável e testável, sem depender de índice mutável usado como ID.

- [ ] **045 — Integrar conteúdo editorial em preview, público e exportação.** `P2`
  - Entrega: conectar efetivamente introdução, encerramento, textos institucionais, logos e conteúdos dos tipos aprovados; fazer os toggles de Conteúdo/Design e Layout & Gerar afetarem os consumidores previstos. Compartilhar composição/paginação entre editor, página pública e PDF.
  - Cenários/aceite: conteúdo vazio, texto longo, imagem ausente, caracteres especiais e edição após publicação. Número/ordem/texto/imagens coincidem nos três destinos; conteúdo de usuário é renderizado com tratamento seguro, sem HTML arbitrário não validado.
  - Dependências: 014, 020–023, 030, 043–044. Revalidar estimativa da etapa 040. Campo presente no type ou fixture não prova integração funcional.

## Grupo J — Testes finais, aprovações e entrega rastreável (046–050)

- [ ] **046 — Reconciliar contratos de teste e fechar cobertura de regressão.** `GATE`
  - Entrega: revisar testes que aprovam comportamentos errados; substituir IDs visuais inexistentes pelos reais; testar registry/renderer sem mocks nos contratos relevantes. Integrar os dois testes de integridade e cobrir todos os achados F01–F18 com critérios explícitos.
  - Cenários/aceite: testes falham se voltar o redirecionamento sem criação, o autosave destrutivo ou o preview fora do contêiner. Justificar cada skip/fixme; não aceitar 401/403 como prova de sucesso. Executar typecheck e suítes relevantes sem retries mascaradores.
  - Dependências: 015–045 para encerramento; testes devem acompanhar cada alteração, não ser adiados até este gate. Evidência: resultados por suite, ambiente, SHA e falhas remanescentes.

- [ ] **047 — Exercitar os fluxos completos no app e backend de teste autorizados.** `GATE`
  - Entrega: E2E no shell real com usuário de teste, fixtures controladas e dados persistidos: galeria → criação → CRM → produtos → conteúdo/design → páginas → salvar → reabrir → publicar → abrir → exportar → revogar. Acrescentar acessos diretos e reload frio das cinco telas.
  - Cenários/aceite: perfis autorizados/não autorizados, sessão expirada, rede lenta/indisponível, variantes e conflito entre abas. Validar corpo/estado de resposta e leitura posterior, não apenas toast/status. Se faltar ambiente/credencial, apontar o cenário bloqueado.
  - Dependências: 046 e backend de teste compatível com 011/042. Nenhum teste escreve no canônico por fallback de configuração.

- [ ] **048 — Homologar fidelidade visual, acessibilidade e desempenho.** `GATE / PO`
  - Entrega: comparar R1–R5 com capturas do shell completo em viewport equivalente; fixar dados, assets, fontes e estado. Testar também larguras menores, teclado/foco, contraste das cores existentes, zoom, overflow e volumes representativos de produtos/páginas.
  - Cenários/aceite: não há clipping, controles inacessíveis ou paginação que bloqueie a UI. Aprovar diferenças intencionais explicitamente; tolerância visual pode excluir cores deliberadamente preservadas e dados ilustrativos, mas não ocultar geometria/elementos ausentes. Registrar métricas e orçamento de desempenho acordado, sem inventar nota “10/10”.
  - Dependências: 004, 046–047. Comparar tokens/estilos globais antes/depois. Ajuste de cor por acessibilidade, se necessário, é nova decisão do PO, não permissão implícita.

- [ ] **049 — Validar e aplicar somente mudanças de backend explicitamente autorizadas.** `GATE / BD / DEPLOY`
  - Entrega: consolidar diferenças reais de 005/011/042; apresentar por objeto a operação, impacto, compatibilidade, teste, recuperação e ordem de aplicação. Confirmar projeto canônico, autorização vigente, recuperação viável e sucesso em teste antes de migration ou deploy de função necessária ao Magazine.
  - Cenários/aceite: permissão insuficiente, função com assinatura diferente, migração já aplicada por outro agente e frontend antigo durante deploy. Após aplicação autorizada, comparar catálogo/definições/permissões e validar leitura funcional; mutações de teste em produção exigem escopo próprio aprovado. Não executar DDL destrutivo ou repetir migration cegamente.
  - Dependências: 005, 011, 042, 047–048; qualquer exceção na ordem deve ter motivo e aprovação. Se não houver mudança de backend, registrar prova de compatibilidade e ausência de DDL, sem aplicar nada.

- [ ] **050 — Entregar versão revisada e relatório de conclusão por evidência.** `GATE / GITHUB / DEPLOY / PO`
  - Entrega: revisão semântica do diff, PR/commits identificados, gates obrigatórios aprovados e documentação conciliada. Quando autorizado, integrar e publicar; verificar SHA de main, artefato efetivamente implantado, frontend servido e backend compatível. Atualizar este checklist com evidências e pendências reais.
  - Cenários/aceite: merge sem deploy, deploy antigo, frontend novo com backend antigo e smoke verde com ação quebrada devem ser detectados. Fazer smoke pós-publicação não destrutivo e registrar estratégia de reversão de código/compensação de dados. Release notes distinguem preservado, corrigido, adicionado, desviado por decisão e bloqueado.
  - Dependências: 046–049 e autorizações de integração/publicação aplicáveis. Não marcar produção concluída só por commit local, push, preview da Vercel ou migrations existentes no repositório.

## 3. Rastreabilidade dos achados

| Achado da auditoria | Problema | Etapas principais |
|---|---|---|
| F01 | Snapshot de autosave apaga/reinsere itens; risco de perda | 003, 006, 011–012, 015 |
| F02 | IDs regenerados e retorno não reconciliado | 007–008, 015 |
| F03 | Falso salvo; rascunho/atalho sem gravação | 007, 009, 013, 015 |
| F04 | Edição perdida antes do debounce/na saída | 008–010, 014–015, 020 |
| F05 | Preview escalado fora do contêiner | 016, 019–020, 048 |
| F06 | CSS dependente de navegação; fontes/escopo incompletos | 017–018, 022–024, 047 |
| F07 | Usar template não cria revista | 025, 046–047 |
| F08 | Rota pública inconsistente | 014, 030, 047 |
| F09 | Seleção descartada entre filtros | 036–037, 040 |
| F10 | Busca CRM devolve todos para texto sem dígitos | 031 |
| F11 | Cliente selecionado sem `clientCrmId` | 032–033 |
| F12 | Campo hex mantém valor antigo | 034 |
| F13 | Catálogo limitado; totais e estimativa incorretos | 026, 036, 040, 044–045 |
| F14 | Descrição prometida, mas não pesquisada | 004, 028 |
| F15 | Cards sem ações/metadados/composição da referência | 026–027, 048 |
| F16 | Páginas editoriais sem operações e integração | 035, 041–045 |
| F17 | Templates/metadata/arte divergentes | 004, 018, 021–024, 048 |
| F18 | Favoritos, variantes e estados de produtos incompletos | 004, 012, 037–040 |

As etapas 001–005 e 046–050 tratam também das lacunas de evidência, coordenação e liberação; não representam apenas mudanças cosméticas.

## 4. Sequência de entrega e limites de autorização

1. **Preparar e decidir:** 001–005. Produzir base confiável; resolver decisões de produto sem bloquear investigação independente.
2. **Proteger o que já existe:** 006–015. Nenhuma entrega funcional é aprovada com risco reproduzido de perda de itens ou falso salvamento.
3. **Estabilizar a renderização:** 016–020. Este trabalho pode avançar independentemente das correções de persistência, com reservas separadas, mas sua liberação continua condicionada aos gates.
4. **Concluir os fluxos das referências:** 021–040, respeitando dependências entre templates, biblioteca, CRM e catálogo.
5. **Completar a estrutura editorial:** 041–045, após decisão sobre modelo e eventual autorização dos objetos necessários.
6. **Homologar e publicar quando autorizado:** 046–050. Não agrupar mock, staging, GitHub e produção sob um único “PASS”.

Não fazem parte deste plano: rebranding do sistema, limpeza indiscriminada do repositório, exclusão de tabelas vazias, refatoração global sem relação com Magazine, rotação ampla de segredos ou mudanças de outras áreas comerciais. Achados fora do escopo devem ser registrados separadamente.

## 5. Registro mínimo para encerrar cada etapa

Usar o mesmo formato no relatório de execução, sem criar uma segunda numeração concorrente:

```text
Etapa: NNN
Estado:
Requisito / achado / referência:
Base examinada (SHA, branch, ambiente):
Implementação já existente aproveitada:
Arquivos e objetos realmente afetados:
Decisão e autorização do PO, quando exigidas:
Simulação anterior à mudança e resultado:
Commit/PR da correção, se houver:
Testes executados, comandos, resultado e artefatos:
Validação visual e preservação de cores:
Banco: não aplicável / simulado / teste / canônico validado:
Deployment: não solicitado / pendente / SHA e ambiente verificados:
Riscos, divergências aprovadas e bloqueios restantes:
Responsável e data:
```

**Critério de conclusão:** os 50 itens estão validados ou formalmente resolvidos, sem P1 aberto; R1–R5 têm aceite com exceções explícitas; salvamento e publicação são verdadeiros; dados/identidades são preservados; testes representam os fluxos reais; cores atuais permanecem; código, banco e deployment têm situação individualmente comprovada. Aprovação deste plano não equivale a aprovação antecipada de schema, de exclusões ou de publicação.
