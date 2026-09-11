# Kit Maker — plano corretivo de implementação em 100 etapas

Data: 11/09/2026. Projeto: Promo Gifts V4. Rota principal: `/montar-kit`.

**Estado: planejamento. 0/100 etapas aceitas neste plano; 400 verificações pendentes.** Esses números medem o aceite novo, não a quantidade de código existente. Nenhuma função será reescrita só porque seu aceite está pendente.

## Registro de execução incremental

O plano passou a ser executado em 11/09/2026. Os registros abaixo distinguem
implementação local de aceite: nenhum deles aumenta o contador de etapas
aceitas até que as quatro verificações da respectiva etapa estejam completas,
incluindo comparação visual contra as referências e validação em ambiente
canônico quando aplicável.

| Trabalho entregue no lote inicial | Etapas relacionadas | Estado | Evidência local | Limite explícito |
| --- | --- | --- | --- | --- |
| Reconstrução da landing com os dois percursos, cards visuais, benefícios, destaques de catálogo e CTA de IA | 011–015, 031–037 | `IMPLEMENTADA_AGUARDA_VALIDACAO` | `KitMakerLanding.tsx`; teste de componente com 3 cenários | Ainda requer comparação por viewport com os anexos e dados canônicos autenticados. |
| Correção do contrato Gold: itens usam `sale_price`; embalagens são filtradas por `product_type=packaging` e não por heurística de texto | 021–025, 051–060 | `IMPLEMENTADA_AGUARDA_VALIDACAO` | `useKitBuilderQueries.ts`; teste de contrato/paginação | Não substitui a auditoria completa de schema/compatibilidade nem autoriza DDL. |
| Bloqueio comercial de itens e embalagens sem preço verificável, sem converter ausência em `R$ 0,00` | 026, 046, 084 | `IMPLEMENTADA_AGUARDA_VALIDACAO` | transformadores, consulta, deeplink e teste unitário do cenário S01 | Ainda requer execução autenticada com catálogo canônico e validação da política comercial para produtos sem preço. |
| Cartões de caixa com ocupação, motivo de compatibilidade e ação explícita; incompatíveis não podem ser selecionados | 054–060 | `IMPLEMENTADA_AGUARDA_VALIDACAO` | `BoxSelector.tsx`; testes de seleção compatível e bloqueio incompatível | Ainda requer comparação visual nos viewports de referência e teste com medidas/embalagens canônicas. |
| Briefing de IA estruturado com objetivo, público, orçamento, estilo, quantidade e aplicação explícita de filtros | 071–077 | `IMPLEMENTADA_AGUARDA_VALIDACAO` | `KitAIPromptDialog.tsx`; dois testes de componente para estado vazio e aplicação | A Edge Function ainda retorna palavras-chave, não IDs de produto/caixa; seleção comercial automática continua bloqueada por contrato. |
| Substituição da cobertura E2E falsa de `external-db-bridge` por `v_products_public`, com fixture de tour e autenticação mock declarada | 006–010, 091–095 | `IMPLEMENTADA_AGUARDA_VALIDACAO` | sete cenários Chromium autenticados em modo mock; controles de IA testados pelo rótulo acessível | Não equivale a execução com usuário e dados produtivos reais. |

Resultado do lote: lint específico passou; 36 testes unitários/focados passaram;
build de desenvolvimento passou; sete cenários E2E Chromium próprios do Kit Maker, com mock, passaram.
O typecheck completo permanece fora deste recibo enquanto a incompatibilidade
pré-existente entre TypeScript e `@vitejs/plugin-react` impedir sua execução.
Não houve migration, DDL, alteração no banco canônico, merge ou deploy neste
lote.

## Resultado contratado

Entregar as telas e interações dos modelos apresentados pelo PO: entrada com dois percursos, biblioteca, catálogo de itens, escolha e recomendação de caixas, personalização, assistente de IA e revisão com orçamento. Preservar as cores e os tokens atuais do sistema. Reproduzir composição, hierarquia, proporções, imagens, textos, controles e efeitos dentro do módulo, com dados reais e comportamento verificável.

Nenhum plano é infalível. Este enfrenta as causas da entrega anterior com critérios testáveis, validação visual desde a primeira tela e impedimento de declarar uma entrega parcial como concluída. Criar arquivos, passar build, obter HTTP 200 ou aplicar migration não comprova entrega de uma funcionalidade.

Este documento substitui o plano anterior como sequência proposta de execução do Kit Maker, mantendo o documento de 200 etapas como histórico e fonte de requisitos. A etapa 004 fará a reconciliação integral para não perder requisitos. O pedido que originou este arquivo é de planejamento: o arquivo não executa nem autoriza por si mesmo DDL, alterações de dados, deploy ou merge. Autorizações do PO já existentes continuam válidas em seu escopo; não devem ser solicitadas novamente.

## Base de evidências e incertezas

Base local observada ao elaborar este documento: `cda54f39e92cf50234bf16f15fb53ef0e6e7322e`. As constatações abaixo são da auditoria anterior desta conversa e devem ser revalidadas na etapa 001; não são uma nova certificação do estado remoto.

| Constatação | Consequência para a execução |
| --- | --- |
| A landing ativa era textual e não renderizava imagens. | Reconstruir sua composição, não apenas reenviar o bundle. |
| Títulos locais herdavam o tamanho global de `h2`. | Definir tipografia local e testar isolamento de estilos. |
| A consulta de itens solicitava `base_price` inexistente em `v_products_public`. | Validar a consulta real e o preço comercial antes da interface. |
| Caixas eram inferidas de produtos; 1.610 candidatos não tinham as três dimensões internas. | Usar o domínio de embalagens e distinguir dados ausentes. |
| Existiam `packagings`, `supplier_packagings`, `product_packagings` e `vw_packagings_catalog`. | Inspecionar contratos e reutilizar o modelo canônico. |
| A view de embalagens expunha custo, não necessariamente preço de venda, e faltavam imagens. | Definir contrato comercial e conteúdo visual sem fabricar margem. |
| Havia zero `kit_templates` e três `custom_kits` na consulta. | Planejar curadoria e estados vazios; contagens são temporais. |
| IA retornava palavras-chave; personalização não tinha a prévia do modelo. | Implementar contratos completos e integração das telas. |
| Persistência otimista e orçamento transacional receberam melhorias posteriores ao plano antigo. | Confirmar o ledger atual; não reaplicar migrations históricas cegamente. |
| Testes permissivos passavam com controles ausentes e mocks incompatíveis. | Fazer os testes falharem quando um requisito não for entregue. |

Fontes locais para revalidação:

- [Plano histórico](KIT_MAKER_PLANO_200_ETAPAS_2000_SUBETAPAS_2026-09-10.md).
- [Execução parcial histórica](../audits/KIT_MAKER_EXECUCAO_PARCIAL_2026-09-10.md).
- [Página ativa](../../src/pages/kit-builder/KitBuilderPage.tsx), [landing](../../src/components/kit-builder/KitMakerLanding.tsx), [queries](../../src/hooks/kit-builder/useKitBuilderQueries.ts) e [transformadores](../../src/hooks/kit-builder/useKitBuilderTransformers.ts).
- [Biblioteca](../../src/pages/kit-builder/KitLibraryPage.tsx), [personalização](../../src/components/kit-builder/PersonalizationConfig.tsx), [IA](../../src/components/kit-builder/KitAIPromptDialog.tsx) e [revisão](../../src/components/kit-builder/KitSummary.tsx).
- [Protocolo multiagente](../PROTOCOLO_MULTIAGENTE_2026-08-29.md) e [reservas](../coordenacao/reservas-ativas.md).

## Referências e decisões de composição

| Código | Superfície de aceite | Cobertura principal |
| --- | --- | --- |
| R01 | Landing com dois grandes cards fotográficos, benefícios, destaques e IA | 031–037 |
| R02 | Biblioteca com métricas, filtros, fotos e ações | 038–040 |
| R03 | Workspace de produtos, seleção vazia e composição preenchida | 041–050 |
| R04 | Caixas recomendadas, comparação e composição lateral | 056–060 |
| R05 | Escolha da caixa com filtros e preview | 051–055 |
| R06 | Personalização em três colunas, frente/verso e resumo | 061–070 |
| R07 | Modal amplo de IA com formulário e sugestões navegáveis | 071–080 |
| R08 | Revisão em dois painéis, preços, estoque, frete e orçamento | 081–090 |

Os anexos repetidos de IA representam uma única superfície. As versões de produtos serão tratadas como estados do workspace; a landing promocional permanece a entrada. Fotos dos modelos orientam direção visual; dados e textos comerciais não serão usados como registros verdadeiros. O menu e o cabeçalho globais existentes permanecem como contexto do módulo: diferenças do shell serão registradas separadamente, sem redesenhar todo o sistema.

Uma substituição de imagem é uma aproximação identificada até seu aceite visual. Não transferir automaticamente ao Kit Maker autorizações de assets dadas para Magazine. Se as imagens originais não estiverem disponíveis localmente, a estrutura poderá avançar com assets existentes identificados; paridade fotográfica continuará pendente.

## Regras de conclusão

Cada etapa contém quatro verificações. A quarta é a evidência de aceite, e não um atalho para as três anteriores. Registrar: etapa, responsável, escopo/arquivos, SHA, ambiente, teste/cenário, resultado, artefatos, data, limitações e revisor. Nunca registrar segredos ou dados pessoais nas evidências.

Estados permitidos: `PENDENTE`, `EM_EXECUCAO`, `BLOQUEADA`, `IMPLEMENTADA_AGUARDA_VALIDACAO`, `ACEITA`. Ausência de acesso, asset, teste ou credencial significa pendência/bloqueio; nunca aprovação. Código reaproveitado pode ser aceito mediante os mesmos testes. O contador de etapas aceitas só aumenta quando as quatro verificações estiverem cumpridas. Funcionalidade local, integração, publicação e aceite visual terão campos distintos no registro.

Toda tela precisa de: comparação com R correspondente; captura desktop no viewport da referência; capturas em 1440, 1024 e 390 pixels de largura; estado carregado, vazio, erro e carregamento; navegação por teclado; caminho funcional real. Ausência de controles, imagens essenciais, painéis ou seções reprova o aceite visual. Diferenças de cor exigidas pelo tema atual são intencionais. Capturas de teste determinísticas usam fixtures identificadas; validação canônica usa dados reais e é registrada separadamente.

Snapshots só se tornam baseline após revisão contra o modelo. Não atualizar screenshots automaticamente para fazer CI passar. Máscaras só podem cobrir informação dinâmica especificada, nunca uma seção defeituosa. Texto financeiro e ocupação devem ser matematicamente corretos mesmo quando o exemplo ilustrativo apresentar inconsistência.

Invariantes: projeto canônico `doufsxqlfjyuvxuezpln`; preservar guardas SSOT, tipos críticos, tema, trabalhos concorrentes e migrations aplicadas. Não usar custo como venda, dado ausente como zero, volume como prova de encaixe, página HTTP 200 como E2E ou mock como validação do banco. Consultar `pg_catalog` para schema, RLS, grants, funções e triggers. Nenhuma limpeza de tabelas vazias ou exclusão de arquivos alheios está incluída.

## Ordem e entregas revisáveis

As dependências de cada etapa são obrigatórias, mas números não impedem trabalho independente. A landing pode avançar depois de 010/015 enquanto o catálogo é corrigido; seu aceite integrado aguarda as fontes reais necessárias. Evitar acumular toda a UI para o final. Primeiro validar a composição de uma tela em preview; depois expandir esse padrão.

| Marco | Condição para seguir |
| --- | --- |
| M1 — base verificável | 001–010 aceitas; referências, rastreabilidade e cenários registrados |
| M2 — contratos e persistência | 011–030 aceitas; produtos/embalagens com consulta real e gravação validada |
| M3 — primeira entrega visual | 031–040 aceitas; landing e biblioteca comparadas aos modelos |
| M4 — montagem completa | 041–060 aceitas; os dois percursos funcionam com dados reais |
| M5 — personalização e IA | 061–080 aceitas; prévias e sugestões aplicáveis ao kit |
| M6 — venda integrada | 081–090 aceitas; revisão e orçamento transacional coerentes |
| M7 — produção comprovada | 091–100 aceitas; gates, deployment e aceite final com recibos |

Se um marco falhar, corrigir a causa e executar novamente os cenários afetados. Pode-se continuar trabalho independente, mas não declarar o marco aprovado nem publicar sua funcionalidade como completa. Não ampliar escopo para corrigir módulos inteiros sem relação com a jornada.

## Grupo A — baseline, contrato visual e prevenção de retrabalho

### KM100-001 — Confirmar o estado real de código e produção
Dependências: nenhuma.

- [ ] Registrar branch, SHA, alterações locais, PRs abertos e responsáveis por mudanças do Kit Maker.
- [ ] Comparar arquivos do módulo com a main remota e o SHA informado pela produção; distinguir implementação, merge e deploy.
- [ ] Revalidar os defeitos da auditoria, incluindo consulta de itens e origem das caixas, com respostas sanitizadas.
- [ ] Aceite: inventário datado distingue defeito atual, correção já entregue e ponto ainda não verificável.

### KM100-002 — Preservar autoria e delimitar áreas de edição
Dependências: 001.

- [ ] Ler reservas e protocolo vigentes; identificar trabalho de Cline, Claude, Hermes e usuário no escopo.
- [ ] Escolher branch/worktree compatível com o estado existente e registrar ownership dos arquivos a editar.
- [ ] Definir reconciliação semântica, revisão antes de integração e preservação de alterações não commitadas.
- [ ] Aceite: mapa de edição evita sobreposição e registra os invariantes que nenhum merge poderá remover.

### KM100-003 — Catalogar e medir os modelos visuais
Dependências: 001.

- [ ] Identificar R01–R08 e localizar os binários disponíveis, com origem, dimensões e hash quando acessíveis.
- [ ] Medir colunas, proporções, gaps, alturas, recortes, tipografia, textos, ícones e ações de cada modelo.
- [ ] Registrar duplicatas, variantes de workspace e diferenças intencionais de tema/shell.
- [ ] Aceite: especificação por tela permite comparação objetiva; assets ausentes são explicitamente pendentes.

### KM100-004 — Reconciliar requisitos antigos e novos
Dependências: 003.

- [ ] Mapear as 200 etapas e 2.000 subetapas antigas para estas 100 etapas, agrupando requisitos equivalentes.
- [ ] Relacionar cada controle dos modelos a uma etapa, consumidor de código e teste esperado.
- [ ] Identificar extras fora dos modelos, como recursos experimentais, sem apagá-los ou incluí-los silenciosamente no aceite.
- [ ] Aceite: nenhum requisito antigo fica órfão; adiamentos e mudanças de escopo ficam identificados para decisão do PO.

### KM100-005 — Definir o registro único de evidências
Dependências: 001, 004.

- [ ] Criar registro com os campos de conclusão definidos acima e separar estado local, remoto e produtivo.
- [ ] Relacionar recibos existentes à etapa correspondente; não copiar aprovação histórica para um SHA diferente sem análise.
- [ ] Estabelecer contador derivado das etapas aceitas e lista independente de bloqueios.
- [ ] Aceite: um item sem teste ou captura obrigatória não pode aparecer como concluído no relatório.

### KM100-006 — Preparar ambiente representativo de validação
Dependências: 001, 002.

- [ ] Identificar preview/staging e autenticação de teste, com usuários e dados isolados para fluxos de escrita.
- [ ] Fixar viewports, fuso, fontes, relógio e dados de screenshots sem mascarar defeitos da interface.
- [ ] Separar testes com fixtures dos testes reais de contratos, gravação e permissões.
- [ ] Aceite: executar uma captura e uma consulta reais de demonstração; falta de acesso fica bloqueada, nunca simulada como sucesso.

### KM100-007 — Definir cenários de falha antes da implementação
Dependências: 004, 006.

- [ ] Especificar resultados esperados para preço/medidas ausentes, estoque insuficiente, variante removida e embalagem indisponível.
- [ ] Especificar timeout, sessão expirada, duas abas, retry, atualização concorrente e falha tardia de orçamento.
- [ ] Incluir textos longos, imagens quebradas, zero resultados, teclado, mobile e limites de quantidade.
- [ ] Aceite: catálogo de cenários tem entrada, resultado esperado e etapa responsável, sem depender de comportamento atual defeituoso.

### KM100-008 — Projetar as jornadas e transições
Dependências: 003, 007.

- [ ] Definir itens → caixa → personalização → revisão e caixa → itens → personalização → revisão.
- [ ] Especificar retorno, troca de percurso, retomada, deep link e preservação/invalidação de decisões posteriores.
- [ ] Definir diferença entre selecionado, válido, concluído e apenas visitado no wizard.
- [ ] Aceite: walkthrough dos dois percursos demonstra ausência de telas sem saída e conclusão indevida.

### KM100-009 — Definir arquitetura e reaproveitamento
Dependências: 002, 008.

- [ ] Mapear estado, queries, domínio, persistência, cálculos e componentes conectados à rota ativa.
- [ ] Identificar componentes sem consumidores e decidir reuso, adaptação ou manutenção fora do fluxo, sem exclusão automática.
- [ ] Projetar composições específicas por tela mantendo uma fonte de estado e serviços compartilhados.
- [ ] Aceite: mapa relaciona cada painel ao componente e cada ação ao serviço real; nenhum callback vazio permanece no desenho.

### KM100-010 — Fixar critérios de aprovação visual e funcional
Dependências: 003, 005, 007, 009.

- [ ] Preparar checklist visual por R01–R08 com elementos obrigatórios e diferenças intencionais explicitadas.
- [ ] Definir erro bloqueante: função ausente, consulta quebrada, perda de dados, preço incoerente ou seção visual não implementada.
- [ ] Registrar quem revisará cada captura e como divergências serão encerradas sem aprovar automaticamente snapshots.
- [ ] Aceite: M1 tem critérios reproduzíveis antes de se iniciar a reconstrução das telas.

## Grupo B — linguagem visual, estado e persistência

### KM100-011 — Preservar o tema e controlar estilos locais
Dependências: 009, 010.

- [ ] Inventariar tokens atuais de cor, contraste, foco, borda e elevação consumidos pelo módulo.
- [ ] Criar estilos de composição locais sem sobrescrever regras globais de Magazine, produtos ou orçamento.
- [ ] Remover a dependência indevida dos títulos de benefícios em relação ao tamanho global de `h2`.
- [ ] Aceite: comparações antes/depois preservam a paleta e comprovam títulos locais com tamanho correto.

### KM100-012 — Definir grade, dimensões e responsividade
Dependências: 003, 011.

- [ ] Implementar os containers e grades de landing, catálogo, três colunas e revisão conforme as proporções medidas.
- [ ] Definir colapso de filtros/sidebar em telas menores, evitando overflow e controles encobertos pelo shell.
- [ ] Fixar comportamento de rolagem, painéis sticky e conteúdo longo por etapa.
- [ ] Aceite: protótipos no app funcionam nos quatro viewports de aceite sem cortes ou sobreposições.

### KM100-013 — Padronizar tipografia, textos e ícones
Dependências: 011, 012.

- [ ] Aplicar hierarquia de títulos, textos auxiliares, preços, badges e legendas consistente com os modelos.
- [ ] Usar textos de interface das referências, ajustando apenas ambiguidades, acessibilidade e afirmações sem base comercial.
- [ ] Reutilizar ícones existentes com rótulos acessíveis e tamanhos adequados; tratar truncamento e quebra de linha.
- [ ] Aceite: catálogo de textos e comparação visual não mostram títulos enormes, botões truncados ou ícones sem significado.

### KM100-014 — Preparar assets com procedência e recorte
Dependências: 003, 010.

- [ ] Relacionar heroes, capas de kits, imagens de caixas, itens e prévias de IA a arquivos existentes ou aquisição pendente.
- [ ] Definir imagem principal, proporção, foco do recorte, variantes responsivas e fallback honesto.
- [ ] Otimizar arquivos, dimensões e carregamento; registrar separadamente qualquer imagem aproximada aguardando aceite.
- [ ] Aceite: manifesto de assets cobre todas as superfícies e não usa foto de outro produto como representação real.

### KM100-015 — Implementar estados e efeitos compartilhados
Dependências: 012, 013, 014.

- [ ] Criar skeleton, vazio, erro recuperável, seleção, hover, foco, disabled e feedback de salvamento consistentes.
- [ ] Aplicar transições discretas e respeitar redução de movimento; não depender de hover para detalhes essenciais.
- [ ] Definir animações e placeholders sem deslocar o layout durante carregamento de imagens.
- [ ] Aceite: amostra de componentes demonstra todos os estados por mouse, teclado e toque.

### KM100-016 — Consolidar estado e validação do wizard
Dependências: 008, 009.

- [ ] Reconciliar reducer, hooks e tipos existentes para percurso, composição, embalagem e personalização.
- [ ] Invalidar somente resultados dependentes após alteração de produto, caixa, lote ou arte.
- [ ] Manter seleção, validação e persistência coerentes ao navegar, desfazer e refazer.
- [ ] Aceite: testes de transição cobrem os dois percursos, retorno e substituição sem perda de estado independente.

### KM100-017 — Hidratar rascunhos e recuperar navegação
Dependências: 016.

- [ ] Restaurar cliente, identidade, percurso, produtos/variantes, caixa, personalizações e revisão persistida.
- [ ] Suspender autosave durante hidratação e apresentar conflitos de versões antigas do payload.
- [ ] Suportar refresh, URL de edição, navegador voltar/avançar e kit removido ou sem permissão.
- [ ] Aceite: reabrir um rascunho reproduz sua composição sem gravar estado vazio por cima.

### KM100-018 — Confirmar o contrato transacional existente
Dependências: 001, 006, 016.

- [ ] Reconciliar ledger e definição live da RPC de persistência já trabalhada; verificar schema por `pg_catalog`.
- [ ] Conferir revisionamento, idempotência, payload, grants e políticas sem reaplicar migrations concluídas.
- [ ] Preparar alteração forward-only somente se houver lacuna comprovada, identificando objetos e autorização aplicável.
- [ ] Aceite: salvar/repetir uma operação em ambiente de teste não duplica kit nem produz gravação parcial.

### KM100-019 — Tratar autosave, conflito e recuperação
Dependências: 017, 018.

- [ ] Unificar salvar manual/autosave, serializar requisições e associar respostas à revisão enviada.
- [ ] Exibir pendente, salvando, salvo, erro e conflito; preservar edição local durante falha e sessão expirada.
- [ ] Testar dois usuários/abas, resposta fora de ordem, retry e alteração enquanto um save está em voo.
- [ ] Aceite: conflito não sobrescreve silenciosamente o vencedor e o usuário consegue recuperar seu trabalho.

### KM100-020 — Validar propriedade, compartilhamento e isolamento
Dependências: 018, 019.

- [ ] Conferir o modelo existente de dono/colaborador e limitar UI, leitura e gravação ao mesmo contrato.
- [ ] Testar usuário autorizado, outro usuário, sessão expirada e tentativa de trocar IDs no payload.
- [ ] Confirmar que erros de permissão não viram vazio, mock ou sucesso de salvamento.
- [ ] Aceite: operações permitidas funcionam e acesso indevido é negado na camada de dados, não apenas na interface.

## Grupo C — contratos reais de catálogo, embalagens e preços

### KM100-021 — Inventariar o schema necessário ao Kit Maker
Dependências: 001, 006.

- [ ] Inspecionar via `pg_catalog` colunas, chaves, views, funções, grants, RLS e triggers dos objetos usados pelo módulo.
- [ ] Distinguir produtos, variantes, embalagens, preços, fornecedores e vínculos de compatibilidade.
- [ ] Registrar nulabilidade, unidades, origem, disponibilidade e divergências de types sem classificar tabela vazia como lixo.
- [ ] Aceite: contrato versionado aponta origem verificável de cada campo consumido pelas telas.

### KM100-022 — Corrigir a consulta real de produtos
Dependências: 021.

- [ ] Ajustar projeção e mapeamento de `v_products_public`, incluindo a divergência de `base_price`.
- [ ] Validar todos os demais campos selecionados; preservar o contrato crítico de `Product` e `sale_price`.
- [ ] Executar consulta paginada com o papel real do aplicativo e diferenciar erro de contrato de coleção vazia.
- [ ] Aceite: consulta live retorna dados válidos; teste detecta remoção/renomeação de qualquer coluna obrigatória.

### KM100-023 — Ligar as caixas ao domínio de embalagens
Dependências: 021.

- [ ] Integrar `packagings` e relações existentes em vez da heurística de `packing_type` de produtos.
- [ ] Mapear ID de embalagem, fornecedor, SKU e vínculos, verificando compatibilidade com persistência e orçamento existentes.
- [ ] Tratar migração de rascunhos antigos sem converter IDs de produtos em IDs de embalagem indevidamente.
- [ ] Aceite: caixa selecionada sobrevive ao save/load e chega à revisão com a mesma identidade canônica.

### KM100-024 — Definir projeção comercial de embalagens
Dependências: 021, 023.

- [ ] Separar custo, preço de venda, impostos e disponibilidade; avaliar view/RPC existente antes de propor novo objeto.
- [ ] Definir dimensões internas/externas, material, acabamento, fechamento, peso, imagem e regras de exposição por papel.
- [ ] Documentar lacunas reais de dados e eventual migration por objeto com compatibilidade de rollout e autorização vigente.
- [ ] Aceite: consulta do usuário não expõe custo indevido e distingue preço ausente de embalagem gratuita.

### KM100-025 — Consolidar unidades, moeda e quantidades
Dependências: 022, 024.

- [ ] Normalizar comprimento, volume e peso com origem explícita; evitar conversões implícitas entre mm e cm.
- [ ] Separar unidades do componente por kit, número de kits e quantidade total comprada.
- [ ] Centralizar arredondamento monetário e formato pt-BR sem fazer cálculos sobre texto formatado.
- [ ] Aceite: casos de múltiplas unidades e lote produzem valores e dimensões independentes da formatação visual.

### KM100-026 — Implementar preço comercial verificável
Dependências: 025.

- [ ] Reconciliar preço de venda de produto/variante, caixa, personalização e faixas de tiragem no motor existente.
- [ ] Mostrar origem/validade da estimativa; não inventar margem para converter custo em venda.
- [ ] Testar valores ausentes, arredondamento, desconto, mudança de lote e dupla multiplicação.
- [ ] Aceite: cards, carrinho, biblioteca estimada e revisão usam contrato único e soma rastreável.

### KM100-027 — Consultar estoque por variante e lote
Dependências: 022, 023, 025.

- [ ] Mapear variante selecionada e estoque de embalagem/produto sem somar variantes incompatíveis.
- [ ] Calcular demanda total e distinguir disponível, insuficiente, desconhecido e previsão de reposição.
- [ ] Atualizar validações quando lote, item, fornecedor ou disponibilidade mudar.
- [ ] Aceite: lote acima do disponível e dados desconhecidos não recebem o selo de estoque suficiente.

### KM100-028 — Implementar busca, paginação e ordenação confiáveis
Dependências: 022, 024.

- [ ] Aplicar filtros na fonte adequada com paginação estável e sem carregar todo o catálogo a cada tecla.
- [ ] Cancelar/ignorar respostas obsoletas e manter contagens consistentes com filtros.
- [ ] Testar resultados além do primeiro lote, nomes iguais, acentos, busca por SKU e zero resultados.
- [ ] Aceite: item conhecido após a posição 200 é localizável sem duplicação ou desaparecimento entre páginas.

### KM100-029 — Conectar imagens e conteúdo canônico
Dependências: 014, 022, 024.

- [ ] Ligar URLs válidas aos produtos e embalagens, mantendo indicação de imagem ilustrativa quando aplicável.
- [ ] Definir como cadastrar capas de templates e fotos de embalagens ausentes sem alterar dados reais implicitamente.
- [ ] Validar carregamento, permissões, expiração, dimensões e falhas de imagem com placeholders do mesmo tamanho.
- [ ] Aceite: fixtures cobrem todas as fotos do layout e registros reais têm cobertura ou lacuna identificada.

### KM100-030 — Fechar os contratos de dados e a prontidão da base
Dependências: 020, 026, 027, 028, 029.

- [ ] Executar testes reais de produtos, variantes, caixas, preços, permissões e persistência com rastreabilidade por ambiente.
- [ ] Regenerar types somente se necessário, comparar exports e preservar tabelas/guardas conforme as regras do projeto.
- [ ] Confirmar ausência de fallback para mocks e diferenciar fixture, consulta live e escrita validada nos resultados.
- [ ] Aceite: M2 comprovado; qualquer migration ainda não aplicada aparece como pendência explícita de integração.

## Grupo D — landing e biblioteca com fidelidade visual

### KM100-031 — Reconstruir cabeçalho da landing
Dependências: 010, 015.

- [ ] Implementar ícone, título, subtítulo, breadcrumbs e agrupamento de ações conforme R01.
- [ ] Conectar Meus kits, tutoriais e Como funciona às superfícies efetivas.
- [ ] Adequar espaçamento ao shell atual e impedir quebra do cabeçalho em larguras intermediárias.
- [ ] Aceite: captura comparativa comprova hierarquia e cada ação navega ou abre conteúdo real.

### KM100-032 — Construir hero de começar pelos itens
Dependências: 031, 014, 016.

- [ ] Montar card com imagem, selo recomendado, indicação de público, checklist e CTA de R01.
- [ ] Aplicar proporção texto/foto e recorte especificados sem esticar produtos ou esconder conteúdo.
- [ ] Iniciar o percurso correto e oferecer retomada quando já houver rascunho, sem sobrescrita silenciosa.
- [ ] Aceite: comparação visual e teste de clique comprovam composição e estado inicial corretos.

### KM100-033 — Construir hero de começar pela caixa
Dependências: 032.

- [ ] Implementar segundo card fotográfico, selo, orientações e CTA com a hierarquia do modelo.
- [ ] Conectar o percurso box-first e preservar rascunho existente quando apropriado.
- [ ] Garantir equivalência de interação por teclado/toque e proporção dos dois cards em desktop.
- [ ] Aceite: o CTA abre escolha da caixa e a comparação não revela card substituído por bloco textual vazio.

### KM100-034 — Reconstruir benefícios e ajuda contextual
Dependências: 033.

- [ ] Implementar quatro benefícios compactos com ícones distintos, títulos e textos do contrato visual.
- [ ] Reposicionar ocasião/tour já existentes sem ocupar o espaço das seções obrigatórias do modelo.
- [ ] Implementar tutorial/guia real com retorno ao fluxo; preservar preferências de fechamento quando cabível.
- [ ] Aceite: benefícios não herdam títulos gigantes e ajuda explica ações disponíveis, sem prometer função ausente.

### KM100-035 — Conectar kits em destaque
Dependências: 029, 034.

- [ ] Selecionar fonte de templates/destaques com capa, nome, categoria e quantidade de componentes.
- [ ] Implementar cards, favoritos e Ver todos com origem real; usar fixtures apenas no teste visual.
- [ ] Preparar curadoria identificada para ausência de templates e estado vazio útil sem contagens inventadas.
- [ ] Aceite: template real pode ser aberto; seção preenchida é comparada ao modelo e vazio não é aprovado como equivalência visual.

### KM100-036 — Construir CTA de IA e navegação da entrada
Dependências: 034, 035.

- [ ] Implementar faixa de IA com composição, texto e ação de R01.
- [ ] Conectar abertura do assistente compartilhado e fechar retornando ao ponto anterior.
- [ ] Exibir carregamento/indisponibilidade verdadeiro enquanto contrato completo depende de 071–080.
- [ ] Aceite: a faixa está visualmente pronta; este aceite cobre abertura, não declara geração de kits concluída.

### KM100-037 — Validar a primeira tela completa
Dependências: 030, 031, 032, 033, 034, 035, 036.

- [ ] Capturar landing carregada, vazia, erro de destaques e mobile conforme 010.
- [ ] Comparar seções, alturas, tipografia, fotos, botões e posição da dobra com R01.
- [ ] Corrigir diferenças e registrar explicitamente fotografias aproximadas ou conteúdo ainda faltante.
- [ ] Aceite: landing aprovada visualmente e navegação testada; sem aprovação não replicar um padrão visual defeituoso nas próximas telas.

### KM100-038 — Reconstruir estrutura da biblioteca
Dependências: 015, 020, 029.

- [ ] Implementar título, criar kit, métricas, busca, status, favoritos, ordenação e grade/lista de R02.
- [ ] Definir significado real de rascunho/publicado sem mapear automaticamente `ready` para publicação.
- [ ] Derivar métricas dos dados do usuário, distinguindo total geral e total filtrado.
- [ ] Aceite: filtros/contadores coerentes e layout comparado nos quatro viewports, inclusive estado vazio.

### KM100-039 — Implementar cards e ações de biblioteca
Dependências: 018, 038.

- [ ] Ligar capa, cliente, status, origem, data, componentes e valor estimado ao contrato do cartão.
- [ ] Implementar abrir/continuar, duplicar, favoritar, fixar e excluir com propriedade, confirmação e feedback adequados.
- [ ] Copiar kit atomicamente, sem duplicar IDs compartilhados nem manter vínculo de edição com o original.
- [ ] Aceite: ações sobrevivem ao reload; exclusão testada só sobre fixture própria e erro preserva o card original.

### KM100-040 — Validar biblioteca e fechar a primeira entrega visual
Dependências: 037, 039.

- [ ] Percorrer criar → salvar → listar → editar → duplicar → favoritar → remover fixture.
- [ ] Testar datas longas, preço ausente, capa quebrada, usuário sem kits e permissões de outro usuário.
- [ ] Comparar cards preenchidos e métricas com R02; registrar dados/artefatos utilizados.
- [ ] Aceite: M3 comprovado com landing e biblioteca integradas, não apenas componentes isolados.

## Grupo E — catálogo e composição de itens

### KM100-041 — Construir workspace de itens
Dependências: 012, 016, 030.

- [ ] Implementar cabeçalho, wizard, catálogo e composição lateral de R03.
- [ ] Representar variantes vazio/preenchido do workspace sem criar dois editores independentes.
- [ ] Distribuir ações de biblioteca, salvar e IA conforme a referência, com comportamento acessível.
- [ ] Aceite: estrutura completa no app mantém estado único e colunas corretas em desktop/mobile.

### KM100-042 — Construir cards comerciais de produtos
Dependências: 026, 027, 029, 041.

- [ ] Mostrar imagem, nome, SKU, medidas, material, variante, preço e estoque com origem real.
- [ ] Implementar seleção, favorito e adicionar sem conflito de clique entre botão e card.
- [ ] Diferenciar badge comprovado de sugestão; não usar Em alta/Mais vendido sem fonte.
- [ ] Aceite: card fiel a R03 e testes cobrem estoque/preço desconhecido, título longo e imagem quebrada.

### KM100-043 — Integrar filtros, categorias e contagens
Dependências: 028, 042.

- [ ] Implementar busca, categorias, material, faixa de preço, personalização e existência de medidas.
- [ ] Definir combinação de filtros, limpar, intervalo inválido e persistência de preferência de grade/lista.
- [ ] Manter contagens e ordenação sincronizadas com a fonte de dados e respostas recentes.
- [ ] Aceite: combinar três filtros retorna resultados corretos e limpar restaura o universo esperado.

### KM100-044 — Selecionar variantes e quantidades por componente
Dependências: 027, 042.

- [ ] Oferecer seleção explícita de variantes comercializáveis e indicar atributos que alteram preço/estoque/medidas.
- [ ] Validar quantidades inteiras positivas, limites e quantidade mínima sem aceitar NaN ou valores negativos.
- [ ] Distinguir linhas de variantes diferentes e mesclar somente componentes equivalentes.
- [ ] Aceite: acrescentar duas variantes preserva identidade, preço e estoque individual no estado e no rascunho.

### KM100-045 — Construir composição lateral do kit
Dependências: 026, 044.

- [ ] Implementar miniaturas, quantidade por componente, remover, limpar tudo e resumo visual de R03.
- [ ] Separar quantidade de kits do lote da quantidade de itens por kit, com rótulos inequívocos.
- [ ] Derivar subtotal, número de componentes e mensagens da composição efetiva.
- [ ] Aceite: alterações recalculam os valores corretos; cancelar limpeza preserva todas as escolhas.

### KM100-046 — Aplicar validação durante a seleção
Dependências: 025, 027, 045.

- [ ] Exibir medidas/estoque insuficientes e validar imediatamente quando já houver caixa selecionada.
- [ ] Em items-first, permitir montagem sem caixa e mostrar que a compatibilidade ainda será calculada.
- [ ] Não confundir produto individual compatível com conjunto que cabe; comunicar limite excedido e inconclusivo.
- [ ] Aceite: casos S01–S03/S06 da matriz abaixo produzem os resultados esperados sem selo falso.

### KM100-047 — Salvar e retomar uma seleção real
Dependências: 019, 045.

- [ ] Conectar salvar manual e autosave aos controles visíveis com estado de processamento.
- [ ] Preservar filtros apropriados, itens, variantes e lote ao sair para biblioteca e retornar.
- [ ] Testar sessão expirada, rede interrompida e resposta atrasada durante alteração de quantidades.
- [ ] Aceite: reload conserva a última revisão confirmada e informa alterações ainda não salvas.

### KM100-048 — Integrar o avanço para caixas
Dependências: 016, 046, 047.

- [ ] Implementar Encontrar caixas compatíveis, com resumo da composição e validação mínima exigida.
- [ ] Manter a sequência correta quando o fluxo começou pela caixa e permitir editar itens sem reiniciar.
- [ ] Definir estado claro para medidas faltantes, catálogo indisponível ou nenhum resultado compatível.
- [ ] Aceite: composição e lote chegam intactos à etapa de caixas, inclusive depois de voltar e editar.

### KM100-049 — Fechar acessibilidade e desempenho do catálogo
Dependências: 043, 048.

- [ ] Garantir foco visível, anúncios de inclusão/remoção, botões nomeados e navegação completa sem mouse.
- [ ] Otimizar imagens e renderização/paginação conforme medições, sem acrescentar virtualização que quebre teclado.
- [ ] Testar catálogo grande, filtros rápidos e rolagem com sidebar sem travar interação.
- [ ] Aceite: perfil e navegação documentados não mostram regressão impeditiva nem requisições ilimitadas.

### KM100-050 — Aceitar a tela de itens
Dependências: 041, 042, 043, 044, 045, 046, 047, 048, 049.

- [ ] Executar jornada com produto real, variante, múltiplas unidades e lote, incluindo recarga do rascunho.
- [ ] Comparar estados vazio/preenchido com R03 e testar todas as ações obrigatórias sem condicionais permissivas.
- [ ] Registrar resultados de erro, teclado, mobile, preços e consulta real por SHA.
- [ ] Aceite: tela funcional e visualmente aprovada; HTTP 200 ou apenas heading visível não satisfazem a etapa.

## Grupo F — catálogo de caixas e recomendação

### KM100-051 — Construir tela de escolha de caixa
Dependências: 024, 029, 030, 015.

- [ ] Implementar filtros à esquerda, cards centrais e preview à direita conforme R05.
- [ ] Usar identidade real da embalagem, imagem, dimensões, material e preço comercial.
- [ ] Mostrar disponibilidade, carregamento e vazio sem retornar produtos embalados como se fossem caixas vazias.
- [ ] Aceite: uma embalagem real com dimensões é exibida, selecionável e corretamente identificada.

### KM100-052 — Implementar filtros específicos de embalagem
Dependências: 028, 051.

- [ ] Integrar material, dimensões internas, faixa de preço, acabamento e fechamento.
- [ ] Normalizar unidades e distinguir eixos; validar mínimo/máximo e filtros sem opções disponíveis.
- [ ] Definir badges Econômica, Sustentável e Mais usada a partir de dados/regras comprováveis.
- [ ] Aceite: filtros combinados encontram a embalagem esperada e não apresentam contagens estáticas dos modelos.

### KM100-053 — Construir preview e seleção da caixa
Dependências: 051, 052.

- [ ] Implementar foto ampliada, características, favorito e Usar esta caixa com os dados de R05.
- [ ] Atualizar preview por foco/clique/toque, com hover apenas como conveniência.
- [ ] Confirmar seleção e manter o preview distinto da escolha persistida até a ação explícita.
- [ ] Aceite: navegar por cards não troca silenciosamente a caixa já salva; selecionar persiste a embalagem correta.

### KM100-054 — Reconciliar a validação de encaixe
Dependências: 025, 027, 046, 053.

- [ ] Avaliar dimensões internas úteis, orientação permitida, folga, peso, quantidade e restrições de embalagem.
- [ ] Reutilizar o motor existente com saída compatível/incompatível/inconclusiva e explicação por motivo.
- [ ] Separar triagem volumétrica de encaixe físico comprovado; representar berços e restrições conhecidas.
- [ ] Aceite: volume baixo com dimensão longa, peso excedido e medidas ausentes não são aprovados indevidamente.

### KM100-055 — Calcular ocupação e espaço livre coerentes
Dependências: 054.

- [ ] Definir denominador de volume interno/útil e somar quantidades por kit sem multiplicar pelo lote.
- [ ] Mostrar ocupação estimada, folga, limites e indisponibilidade quando faltar base confiável.
- [ ] Manter o percentual real em sobreocupação; limitar apenas a renderização da barra sem esconder o erro.
- [ ] Aceite: ocupação e espaço livre são coerentes com o volume útil, sem copiar números ilustrativos inconsistentes.

### KM100-056 — Construir ranking de caixas recomendadas
Dependências: 048, 054, 055.

- [ ] Classificar candidatas por viabilidade, qualidade dos dados, folga, disponibilidade e preço válido.
- [ ] Gerar Melhor ajuste e demais recomendações com critérios rastreáveis, sem promover inconclusivo como compatível.
- [ ] Explicar por que uma caixa aparece e recalcular após mudar a composição.
- [ ] Aceite: casos conhecidos ordenam corretamente e desempates não produzem oscilação arbitrária.

### KM100-057 — Reconstruir página de recomendações
Dependências: 015, 056.

- [ ] Implementar grid/lista, tabs, ordenação, cards com ocupação e ações de R04.
- [ ] Construir composição lateral com fotos, volume estimado, recomendação e edição de itens.
- [ ] Preservar responsividade e densidade visual sem reduzir recomendações a uma lista textual.
- [ ] Aceite: captura preenchida compara corretamente com R04 e todas as caixas exibem dados efetivos.

### KM100-058 — Integrar comparação de caixas
Dependências: 053, 056, 057.

- [ ] Reutilizar/adaptar `KitComparisonDialog` para comparar candidatas sem criar estado paralelo desconectado.
- [ ] Comparar medidas internas, preço, disponibilidade, ocupação, material e razões de compatibilidade.
- [ ] Permitir remover comparadas, selecionar a vencedora e retornar à mesma composição.
- [ ] Aceite: comparar não altera o kit até confirmar e diferenças desconhecidas não são preenchidas com zeros.

### KM100-059 — Tratar ausência de caixa e troca posterior
Dependências: 054, 058.

- [ ] Exibir motivos, editar itens, ajustar quantidades e contato comercial funcional quando nenhuma caixa atender.
- [ ] Trocar caixa sem apagar itens; invalidar somente personalizações/regras dependentes da embalagem.
- [ ] Revalidar disponibilidade e preço antes de avançar, com confirmação de alterações comerciais relevantes.
- [ ] Aceite: nenhuma alternativa inventa caixa ou sinaliza kit válido após incompatibilidade confirmada.

### KM100-060 — Aceitar os dois percursos de montagem
Dependências: 050, 051, 052, 053, 054, 055, 056, 057, 058, 059.

- [ ] Executar items-first e box-first até personalização com casos compatível, incompatível e inconclusivo.
- [ ] Comparar R04/R05 em desktop/mobile, filtros, preview, ocupação e comparação.
- [ ] Validar save/load de embalagem e composição contra dados reais, sem mocks ocultando o domínio.
- [ ] Aceite: M4 aprovado; catálogo de caixas e regras funcionam na jornada ativa.

## Grupo G — personalização visual e produção de arte

### KM100-061 — Definir contrato de personalização por item
Dependências: 021, 025, 060.

- [ ] Mapear técnicas, áreas, materiais, dimensões, cores e quantidades permitidas por produto/variante/caixa.
- [ ] Identificar técnica + área por chave estável e representar lados/frentes conforme dados reais.
- [ ] Definir estado pendente, editando, concluído e sem personalização com critérios de validade.
- [ ] Aceite: contrato impede técnica ou área inexistente e não conclui item apenas por abrir a tela.

### KM100-062 — Construir personalização em três colunas
Dependências: 015, 061.

- [ ] Implementar lista de itens, configuração central e preview/resumo lateral conforme R06.
- [ ] Mostrar item ativo, status e navegação entre produtos sem perder edição confirmada.
- [ ] Adaptar painéis no mobile com acesso previsível à configuração e prévia.
- [ ] Aceite: estrutura visual corresponde ao modelo e todos os itens do kit permanecem acessíveis.

### KM100-063 — Implementar seleção de técnica e área
Dependências: 062.

- [ ] Conectar cards de Laser, Silk, Tampografia e UV apenas quando suportados pelo item.
- [ ] Filtrar áreas, cores e dimensões conforme técnica selecionada, preservando valores ainda válidos.
- [ ] Explicar incompatibilidade e tratar produto sem opções disponíveis.
- [ ] Aceite: alterar técnica invalida configuração incompatível sem manter preço ou preview da opção anterior.

### KM100-064 — Validar cores, dimensões e custo
Dependências: 026, 063.

- [ ] Implementar paleta da arte sem alterar o tema do sistema, quantidade de cores e dimensões em cm.
- [ ] Validar limites da área, precisão decimal pt-BR e regras específicas, como cores não aplicáveis a Laser.
- [ ] Integrar custo/preço adicional por aplicação, quantidade por kit e tiragem total com tratamento de indisponibilidade.
- [ ] Aceite: limites e tiragens alteram preço corretamente e entradas inválidas não geram personalização.

### KM100-065 — Integrar upload e biblioteca de artes
Dependências: 020, 061.

- [ ] Reutilizar infraestrutura de arquivos existente com formatos, tamanho e propriedade definidos.
- [ ] Implementar envio, progresso, erro, cancelamento e escolha de arte previamente salva.
- [ ] Validar conteúdo ativo/SVG e acesso a arquivos de outro usuário; não inserir segredo em URL pública.
- [ ] Aceite: arte autorizada pode ser retomada e arquivo inválido é recusado sem quebrar a configuração do item.

### KM100-066 — Implementar prévia frente/verso e zoom
Dependências: 029, 064, 065.

- [ ] Renderizar produto, arte e área selecionada com escala/posição coerentes em cada lado disponível.
- [ ] Implementar frente/verso, zoom, ajuste à tela e fullscreen acessíveis.
- [ ] Identificar representação ilustrativa e não apresentar render inexistente como prova final de produção.
- [ ] Aceite: trocar lado/área altera a prévia correta e não reutiliza acidentalmente a arte de outro componente.

### KM100-067 — Conectar geração de personalização
Dependências: 066.

- [ ] Identificar serviço de mockup existente e integrar contrato com versão da arte e configuração enviada.
- [ ] Implementar fila/estado assíncrono, timeout, retry idempotente e recusa de resultado obsoleto.
- [ ] Definir cancelamento e feedback de erro sem marcar item como concluído antes da resposta válida.
- [ ] Aceite: geração real ou serviço determinístico aprovado produz artefato associado ao item; indisponibilidade permanece explícita.

### KM100-068 — Persistir personalizações e artes de cada item
Dependências: 018, 019, 067.

- [ ] Salvar técnica, área, lado, cores, dimensões, arte, preço e versão no contrato transacional do kit.
- [ ] Reabrir e editar configurações sem duplicar aplicações ou compartilhar estado entre variantes.
- [ ] Invalidar resultados dependentes ao trocar produto/caixa ou excluir arte, preservando histórico necessário.
- [ ] Aceite: save/load reproduz configuração e preview; duas abas não substituem a arte uma da outra silenciosamente.

### KM100-069 — Construir resumo e bloqueios de personalização
Dependências: 064, 068.

- [ ] Mostrar status, técnica, área e dimensões de todos os itens no painel lateral de R06.
- [ ] Distinguir opção explícita sem personalização de configuração incompleta.
- [ ] Integrar custos e pendências ao wizard e à revisão, com ação direta para corrigir o item.
- [ ] Aceite: revisar kit incompleto informa exatamente o que falta; não há conclusão automática por navegação.

### KM100-070 — Aceitar personalização completa
Dependências: 061, 062, 063, 064, 065, 066, 067, 068, 069.

- [ ] Percorrer múltiplos itens, técnicas, lados, arte salva, geração, reload e alteração posterior.
- [ ] Testar arquivo inválido, área pequena, timeout, resultado atrasado e acesso indevido.
- [ ] Comparar R06 com preview e configuração reais nos viewports previstos.
- [ ] Aceite: personalização visual, persistência e custo aprovados; lista textual sozinha não satisfaz a referência.

## Grupo H — assistente de IA com sugestões reais

### KM100-071 — Redesenhar contrato de sugestão de kit
Dependências: 021, 025, 054, 061.

- [ ] Definir saída estruturada com IDs de produtos/variantes/embalagem, quantidades, justificativa e escopo de preço.
- [ ] Validar schema e limites; tratar texto gerado como entrada não confiável, nunca como SQL ou comando.
- [ ] Separar sugestão comercial da validação determinística de preço, estoque e compatibilidade.
- [ ] Aceite: contrato representa composição aplicável ao editor, não apenas palavras-chave de filtro.

### KM100-072 — Construir formulário amplo de IA
Dependências: 015, 071.

- [ ] Implementar objetivo com limite de caracteres, público, faixa por kit, estilo e quantidade de kits conforme R07.
- [ ] Conectar validação, campos obrigatórios, limpar e exemplos sem submeter automaticamente.
- [ ] Definir limites da estimativa: embalagem, personalização e frete incluídos ou explicitamente separados.
- [ ] Aceite: formulário fiel ao modelo produz solicitação estruturada e orçamento inequívoco.

### KM100-073 — Buscar candidatos reais para a IA
Dependências: 022, 024, 027, 028, 071.

- [ ] Selecionar candidatos do catálogo atual por atributos e restrições do pedido, evitando enviar dados desnecessários.
- [ ] Incluir IDs válidos, disponibilidade, preços comerciais e medidas relevantes no contexto permitido.
- [ ] Restringir tamanho da consulta e estabelecer fallback determinístico identificado quando o provedor falhar.
- [ ] Aceite: candidato inexistente ou indisponível não entra silenciosamente em uma sugestão aplicável.

### KM100-074 — Gerar e validar composições alternativas
Dependências: 026, 054, 072, 073.

- [ ] Produzir alternativas distintas com componentes, quantidades e caixa selecionável.
- [ ] Recalcular soma, tiragem, disponibilidade e compatibilidade fora do modelo de linguagem.
- [ ] Recusar IDs inventados, preço fabricado e composição acima do orçamento sem indicação explícita e justificativa.
- [ ] Aceite: sugestão só é aplicável após validação; nenhum resultado é aprovado por narrativa convincente.

### KM100-075 — Construir painel de sugestões navegáveis
Dependências: 029, 074.

- [ ] Implementar Sugestão N de M, título, justificativa, badges, imagem, componentes e preço conforme R07.
- [ ] Gerar composição visual identificável com fotos reais ou montagem ilustrativa rotulada sem inventar produto.
- [ ] Navegar alternativas mantendo estado e explicitando custos excluídos da estimativa.
- [ ] Aceite: painel tem conteúdo comercial consistente e composição comparável ao modelo, não apenas texto e badges.

### KM100-076 — Aplicar sugestão ao editor atomicamente
Dependências: 016, 018, 074, 075.

- [ ] Converter resposta validada para o mesmo estado e payload dos percursos manuais.
- [ ] Confirmar substituição de composição existente quando necessária e preservar possibilidade de recuperação.
- [ ] Revalidar dados antes de aplicar; não concluir personalização ainda não configurada.
- [ ] Aceite: Usar esta sugestão cria uma composição editável completa com IDs, quantidades e caixa corretos.

### KM100-077 — Tratar disponibilidade e falhas do provedor
Dependências: 074, 076.

- [ ] Implementar timeout, cancelamento, retry controlado e idempotência da aplicação.
- [ ] Diferenciar sessão expirada, limite de uso, serviço indisponível e falta de candidatos.
- [ ] Descartar resposta de solicitação antiga após alteração dos campos ou fechamento da janela.
- [ ] Aceite: duplo clique ou retry não duplica kit e erro nunca exibe composição fictícia como resultado real.

### KM100-078 — Controlar custo e observabilidade da IA
Dependências: 073, 077.

- [ ] Medir latência, volume de solicitações, respostas inválidas e taxa de aplicação sem registrar dados sensíveis do prompt.
- [ ] Definir limites por sessão/usuário segundo infraestrutura e orçamento existentes.
- [ ] Garantir que credenciais fiquem no servidor e diagnóstico tenha correlação por requisição.
- [ ] Aceite: é possível diagnosticar uma falha e limitar consumo sem expor segredos ou conteúdo privado.

### KM100-079 — Integrar IA a todas as entradas
Dependências: 036, 041, 076.

- [ ] Compartilhar o assistente entre landing e editor com o contexto apropriado do kit.
- [ ] Fechar, cancelar e retornar sem perda de composição; mover foco corretamente no modal.
- [ ] Atualizar preços, caixa, wizard e persistência após aplicação sem recarga completa.
- [ ] Aceite: as entradas geram o mesmo resultado de domínio e não mantêm implementações divergentes.

### KM100-080 — Aceitar IA e personalização integradas
Dependências: 070, 071, 072, 073, 074, 075, 076, 077, 078, 079.

- [ ] Testar sugestões reais dentro/acima do orçamento, catálogo insuficiente, IDs inválidos e produto alterado antes da aplicação.
- [ ] Comparar R07 preenchida/carregando/erro e validar acessibilidade do modal.
- [ ] Aplicar sugestão, personalizar um item, salvar e reabrir o kit completo.
- [ ] Aceite: M5 comprovado; sugestões reais e prévias funcionam na jornada, sem depender apenas de fixtures.

## Grupo I — revisão, preço final e orçamento

### KM100-081 — Construir revisão em dois painéis
Dependências: 015, 055, 069.

- [ ] Implementar identificação/composição/validação à esquerda e caixa/preços/estoque/frete à direita conforme R08.
- [ ] Reaproveitar cards úteis com hierarquia compacta, sem repetir uma longa pilha genérica.
- [ ] Garantir ações finais visíveis e responsividade sem ocultar avisos críticos.
- [ ] Aceite: estrutura comparada ao modelo com kit preenchido, textos longos e diferentes tamanhos de composição.

### KM100-082 — Persistir identidade e vínculo com cliente
Dependências: 017, 020, 081.

- [ ] Integrar nome do kit, cliente CRM, objetivo/etiqueta e observações no rascunho e no payload final.
- [ ] Reutilizar seleção de cliente autorizada e alternativa manual já suportada, sem inventar relacionamento inexistente.
- [ ] Validar comprimentos, obrigatoriedade e mudança de cliente após precificação vinculada.
- [ ] Aceite: cliente e observações sobrevivem ao reload e chegam ao orçamento correspondente.

### KM100-083 — Implementar composição revisável e totais
Dependências: 026, 068, 081.

- [ ] Mostrar produtos/variantes, unidades por kit, preço, aplicações e caixa com agrupamento compreensível.
- [ ] Conectar editar/remover aos passos relevantes e recalcular tudo ao retornar.
- [ ] Impedir dupla contagem de caixa ou personalização e separar preço unitário, por kit e do lote.
- [ ] Aceite: soma reproduzível por linha coincide com os painéis e o payload do orçamento.

### KM100-084 — Confirmar preço e validade comercial
Dependências: 026, 082, 083.

- [ ] Reconsultar preços e faixas de tiragem antes de finalizar; exibir alteração desde a estimativa salva.
- [ ] Aplicar regras existentes de desconto/aprovação sem contorná-las na origem Kit Maker.
- [ ] Identificar componentes sem preço, moeda e validade da proposta, impedindo total enganoso.
- [ ] Aceite: mudança comercial exige revisão dos valores e o preço final nunca depende apenas do estado do navegador.

### KM100-085 — Confirmar estoque, prazo e frete
Dependências: 027, 082, 083.

- [ ] Revalidar demanda do lote, embalagem e variantes perto da criação do orçamento.
- [ ] Integrar simulação de frete existente com destino, peso/dimensões disponíveis e indicação de estimativa.
- [ ] Distinguir orçamento de reserva de estoque; não prometer garantia logística que o sistema não oferece.
- [ ] Aceite: indisponibilidade, ausência de CEP ou dados de frete não aparecem como custo zero ou entrega garantida.

### KM100-086 — Auditar o contrato transacional de orçamento
Dependências: 021, 084, 085.

- [ ] Inspecionar `create_quote_transactional` e consumidores para produtos, embalagem, personalizações e identificação do kit.
- [ ] Mapear idempotência, validação server-side, permissões e tratamento de preço desatualizado.
- [ ] Preparar mudança forward-only somente para lacuna demonstrada e dentro da autorização aplicável.
- [ ] Aceite: contrato cobre todas as linhas e define resposta de sucesso/erro sem depender de inserts separados no cliente.

### KM100-087 — Integrar criação idempotente do orçamento
Dependências: 018, 082, 086.

- [ ] Criar uma única solicitação identificada a partir da revisão validada e bloquear submissão duplicada visualmente.
- [ ] Registrar vínculo kit/orçamento e oferecer navegação ao orçamento realmente criado.
- [ ] Repetir após timeout consultando o resultado da operação, sem gerar novo documento indevidamente.
- [ ] Aceite: duplo clique e resposta perdida resultam em um orçamento com todas as linhas esperadas.

### KM100-088 — Garantir atomicidade e falhas tardias
Dependências: 087.

- [ ] Injetar falha de teste após validação, durante gravação de itens e durante personalizações em ambiente isolado.
- [ ] Verificar rollback completo, resposta determinística e ausência de vínculo com orçamento inexistente.
- [ ] Testar edição concorrente, item removido, preço alterado e permissão revogada entre revisão e envio.
- [ ] Aceite: nenhum cenário deixa orçamento parcial ou informa sucesso quando a transação não concluiu.

### KM100-089 — Finalizar rascunho, visualização e saída
Dependências: 039, 083, 087.

- [ ] Implementar salvar rascunho e abertura posterior da revisão, com status semântico coerente na biblioteca.
- [ ] Conectar previews/exportações já presentes e exigidos pela matriz 004, com valores consistentes e permissões.
- [ ] Revisar qualquer ação visível de compartilhar/publicar; indisponibilidade declarada não conta como funcionalidade concluída.
- [ ] Aceite: não há botão sem consumidor e os documentos gerados correspondem à revisão validada.

### KM100-090 — Aceitar revisão e orçamento ponta a ponta
Dependências: 080, 081, 082, 083, 084, 085, 086, 087, 088, 089.

- [ ] Executar os dois percursos e o percurso IA até orçamento com cliente, caixa, variante e personalização.
- [ ] Comparar R08 e conferir valores/IDs no documento e nas relações persistidas do ambiente de teste.
- [ ] Validar erro de frete, estoque alterado, conflito e retomada sem resultados parciais.
- [ ] Aceite: M6 comprovado com recibos transacionais e aprovação visual da revisão.

## Grupo J — testes de aceitação, integração e produção

### KM100-091 — Tornar os testes existentes exigentes
Dependências: 010, 050, 060, 070, 080, 090.

- [ ] Substituir mocks obsoletos e condicionais que passam quando botão, total ou seção obrigatória não existe.
- [ ] Validar comportamento e resultado de domínio, sem apenas verificar heading, ausência de crash ou nomes de componentes.
- [ ] Introduzir defeitos controlados localmente para comprovar que os testes detectam controles ausentes e query inválida.
- [ ] Aceite: regressões conhecidas da auditoria provocam falha reproduzível na suíte correspondente.

### KM100-092 — Consolidar baselines visuais aprovadas
Dependências: 037, 040, 050, 060, 070, 080, 090.

- [ ] Armazenar capturas aprovadas por tela/estado/viewport, com fontes carregadas e fixtures determinísticas identificadas.
- [ ] Configurar comparação visual com tolerância justificada para antialiasing, sem mascarar layout/imagens/controles.
- [ ] Revisar diferenças dos modelos e substituir baseline somente após revisão humana de mudança intencional.
- [ ] Aceite: ausência de hero, coluna, card ou tamanho tipográfico incorreto é detectada antes do merge.

### KM100-093 — Fechar testes reais de integração e concorrência
Dependências: 030, 088, 091.

- [ ] Rodar contratos de consulta, gravação, permissões e concorrência em ambiente com schema equivalente ao canônico.
- [ ] Executar matriz de produto/variante/caixa/arte/cliente com fixtures próprias e cleanup delimitado.
- [ ] Registrar diferenças de ambiente e validar no canônico em leitura; escrita produtiva de teste depende do escopo autorizado.
- [ ] Aceite: resultados especificam o que foi live, staging e simulado, sem apresentar uma categoria como prova de outra.

### KM100-094 — Fechar acessibilidade e compatibilidade
Dependências: 090, 092.

- [ ] Percorrer todos os fluxos por teclado, foco de modal, leitor de tela e redução de movimento.
- [ ] Testar navegadores suportados pelo projeto, zoom de 200%, mobile e dimensões intermediárias.
- [ ] Corrigir contraste, labels, alvos de toque e conteúdo cortado usando os tokens atuais.
- [ ] Aceite: nenhum controle obrigatório fica inacessível e os percursos permanecem completos sem mouse.

### KM100-095 — Medir desempenho e observabilidade
Dependências: 049, 078, 090.

- [ ] Medir bundle do módulo, imagens, consultas, latência e interações com perfil/dispositivo/rede documentados.
- [ ] Definir orçamento a partir da base medida antes do fechamento, corrigindo regressões e consultas redundantes.
- [ ] Implementar correlação de erros de catálogo, save, IA e orçamento sem incluir credenciais ou artes privadas nos logs.
- [ ] Aceite: relatório demonstra atendimento aos limites definidos e permite diagnosticar falha sem reprodução manual integral.

### KM100-096 — Reconciliar documentação e cobertura final
Dependências: 004, 005, 091, 092, 093, 094, 095.

- [ ] Atualizar matriz requisito → tela → ação → serviço → teste → evidência, incluindo requisitos antigos sem duplicação.
- [ ] Corrigir alegações contraditórias de `IMPLEMENTADO_TOTAL` e registrar histórico de migrations/deploy com datas reais.
- [ ] Revisar os 100 aceites, extraindo pendências em vez de substituir falhas por resumo positivo.
- [ ] Aceite: documentação e produto concordam; exclusão de requisito exige decisão registrada, não omissão do contador.

### KM100-097 — Preparar integração com revisão semântica
Dependências: 002, 096.

- [ ] Atualizar a comparação com main e reconciliar mudanças concorrentes por comportamento, preservando SSOT e campos críticos.
- [ ] Preparar PRs coesos com problema, resultado, capturas, testes e migrations aplicáveis; relacionar artefatos aos SHAs.
- [ ] Revisar plano de rollout, compatibilidade entre versões e recuperação antes da publicação.
- [ ] Aceite: resultado concreto está revisável e conflitos resolvidos não reintroduzem lacunas previamente encerradas.

### KM100-098 — Cumprir gates e validar preview final
Dependências: 097.

- [ ] Executar build de produção, typecheck, lint do escopo, SSOT e suítes exigidas pelos workflows atuais.
- [ ] Verificar checks obrigatórios no SHA final, resolvendo falhas reais sem desabilitar gates ou usar sucesso de commit anterior.
- [ ] Percorrer preview integrado com R01–R08, fluxos reais e recibo de contratos do banco alvo.
- [ ] Aceite: CI e preview aprovados no mesmo conjunto de mudanças; indisponibilidade externa fica registrada como bloqueio.

### KM100-099 — Publicar e verificar a versão efetiva
Dependências: 098.

- [ ] Executar merge/deploy dentro das autorizações vigentes e aplicar somente mudanças de banco revisadas e explicitamente autorizadas.
- [ ] Confirmar SHA em main, deployment Vercel, `/api/health`, `/api/ready` e carregamento autenticado do módulo.
- [ ] Validar consultas, imagens e artefatos produtivos; conferir ledger/definições por catálogo e ordem compatível de rollout.
- [ ] Aceite: recibo relaciona código, banco e deployment reais; ausência de migration necessária impede declarar publicação completa.

### KM100-100 — Encerrar com aceite visual e operacional
Dependências: 099.

- [ ] Repetir em produção os percursos autorizados, incluindo biblioteca, itens/caixa, personalização, IA e revisão, sem gerar transações comerciais indevidas.
- [ ] Entregar comparações R01–R08, links, SHAs, evidências e lista explícita de qualquer limitação ao PO para aceite final.
- [ ] Registrar acompanhamento pós-deploy e procedimento de recuperação testado, sem rollback destrutivo de dados.
- [ ] Aceite: 100 etapas só serão marcadas aceitas após o PO validar a entrega visual e todas as verificações obrigatórias terem evidência; bloqueios permanecem visíveis.

## Matriz mínima de simulações antes e durante a execução

Os cenários abaixo são especificações, não resultados de testes já realizados neste plano. Cada etapa relevante deve executá-los novamente quando sua implementação mudar.

| ID | Cenário | Resultado exigido | Etapas |
| --- | --- | --- | --- |
| S01 | Produto sem preço de venda | Preço indisponível; não assumir zero nem liberar total falso | 022, 026, 046, 084 |
| S02 | Produto ou caixa sem medidas | Compatibilidade inconclusiva; explicar dado necessário | 025, 046, 054 |
| S03 | Volume cabe, dimensão longa não | Não classificar como compatível | 054, 055 |
| S04 | Peso excede o limite | Bloquear compatibilidade com motivo específico | 054 |
| S05 | 100 kits com dois itens iguais por kit | Demanda de 200 unidades; sem multiplicação duplicada de preço | 025–027, 083 |
| S06 | Aumentar quantidade após escolher caixa | Recalcular conjunto, ocupação e pendências | 046, 054–059 |
| S07 | Variante indisponível, irmã disponível | Não somar estoque da irmã | 027, 044, 085 |
| S08 | Query solicita coluna removida | Teste de contrato falha; UI mostra erro recuperável | 022, 030, 091 |
| S09 | Produto localizado após a posição 200 | Busca/paginação encontram o registro | 028, 043 |
| S10 | Catálogo vazio ou sem permissão | Estados diferentes; nenhum fallback de dados inventados | 020, 028, 051 |
| S11 | Nenhum template cadastrado | Vazio útil; aceite do visual preenchido continua pendente | 035, 038–040 |
| S12 | Imagem falha ou carrega lentamente | Área preservada e fallback identificado | 014, 029, 042 |
| S13 | Rascunho abre durante autosave | Hidratação não sobrescreve dados | 017, 019 |
| S14 | Duas abas salvam a mesma revisão | Conflito detectado e edição recuperável | 019, 068 |
| S15 | Resposta de save chega fora de ordem | Não marcar uma revisão nova como salva por resposta antiga | 019, 047 |
| S16 | Usuário altera ID de kit/arte | Banco nega acesso indevido | 020, 065 |
| S17 | Trocar técnica ou lado da aplicação | Área, arte e preço coerentes; invalidar somente dependências | 063–068 |
| S18 | Geração de arte termina após nova edição | Descartar resultado obsoleto | 067 |
| S19 | IA retorna produto inexistente ou custo inventado | Rejeitar resultado e não aplicar ao kit | 071, 074 |
| S20 | IA excede orçamento ou não encontra caixa | Explicação explícita; não afirmar sugestão compatível | 074, 075 |
| S21 | Duplo clique em aplicar IA | Uma aplicação, preservando estado anterior quando necessário | 076, 077 |
| S22 | Preço/estoque muda durante revisão | Revalidar e comunicar antes da criação | 084, 085, 088 |
| S23 | Falha após começar a criar orçamento | Rollback completo; nenhum orçamento parcial | 086–088 |
| S24 | Timeout depois de orçamento criado | Retry recupera o mesmo documento | 087, 088 |
| S25 | Frete indisponível ou sem endereço | Não apresentar entrega grátis nem prazo garantido | 085 |
| S26 | Controle obrigatório removido da tela | Teste falha, sem `if (isVisible)` contornando o requisito | 091 |
| S27 | Título cresce por CSS global | Regressão visual detectada | 011, 034, 092 |
| S28 | 390 px, zoom 200%, teclado e modal | Ações acessíveis, sem perda de foco ou corte impeditivo | 012, 094 |
| S29 | Commit mais novo de outro agente | Reconciliar comportamento e repetir verificações afetadas | 002, 097, 098 |
| S30 | Deploy com SHA diferente do aprovado | Não declarar release validada; investigar origem | 099, 100 |

## Evidência mínima por entrega

Modelo de registro a preencher durante execução:

```text
Etapa: KM100-NNN
Estado: PENDENTE | EM_EXECUCAO | BLOQUEADA | IMPLEMENTADA_AGUARDA_VALIDACAO | ACEITA
Responsável e revisor:
Requisitos/referências cobertos:
Arquivos e SHA:
Ambiente e identidade do schema/deployment:
Cenários e comandos executados:
Resultado e data:
Capturas/artefatos/recibos:
Diferenças intencionais e aprovação correspondente:
Pendências e dependências:
Autorização aplicável, se houver mudança de banco/publicação:
```

Não fixar comandos inexistentes no CI. Confirmar scripts/projetos atuais antes de executá-los. O projeto consultado possui `npm test`, `npm run build` e guardas SSOT; selecionar também o typecheck/lint e os projetos Playwright realmente configurados. `build:dev` não substitui o build produtivo. Contratos reais e screenshots aprovadas são necessários além da suíte unitária.

## Estratégia de publicação e recuperação

Publicar incrementos revisáveis por marco, sempre informando quais telas estão aceitas e quais permanecem em implementação. Uma entrega de dados pode preceder a UI, mas não receber o rótulo de módulo completo. Mudanças de banco necessárias devem ser aditivas quando possível, preservar clientes anteriores e ser aplicadas na ordem que mantenha compatibilidade com o código em produção. Reutilizar migrations já aplicadas; corrigir divergências com nova migration revisada, sem editar o passado.

Antes de cada publicação, registrar o deployment anterior recuperável e as condições de retorno. Reverter código só é seguro se o schema permanecer compatível. Recuperação de banco será uma correção forward-only apropriada ao defeito, nunca exclusão automática de dados. Testes mutantes usam ambiente isolado; qualquer fixture produtiva autorizada terá identificação e cleanup delimitados, sem atingir kits ou orçamentos reais.

## Situação na criação deste documento

- Plano criado; implementação destas etapas ainda não executada nesta atividade.
- 100 etapas numeradas, com quatro verificações cada, incluindo evidência obrigatória de aceite.
- O plano anterior permanece disponível como histórico; seus contadores não foram transferidos.
- Criar este documento não altera código de aplicação, banco canônico, workflow, tema ou deployment.
- Nenhum percentual de conclusão do produto é inferido da quantidade de arquivos, linhas ou testes verdes.
