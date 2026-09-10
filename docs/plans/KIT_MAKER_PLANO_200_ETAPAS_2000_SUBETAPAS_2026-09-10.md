# Kit Maker — Plano de implementação em 200 etapas e 2.000 subetapas

Data: 10/09/2026
Projeto: Promo Gifts V4
Documento de planejamento: funcionalidades, integrações, diagramação, textos, efeitos, testes e entrega.
Escopo visual: as sete imagens de Kit Maker anexadas pelo PO, identificadas abaixo como R1–R7.
Restrição obrigatória: **manter as cores atuais do sistema**. O azul das referências não autoriza substituir a paleta atualmente em produção.

## Resultado esperado e limites desta entrega

Entregar uma experiência completa de montagem de kits, com os dois percursos — começar pelos itens ou começar pela caixa — convergindo em personalização, revisão e orçamento consistente. Todos os controles representados nas referências devem ter comportamento real, estados de erro e persistência quando cabível.

Este arquivo contém exatamente **200 etapas**, agrupadas em **20 áreas**, com **10 subetapas por etapa**, totalizando **2.000 itens de checklist**. A décima subetapa de cada etapa é seu fechamento verificável, não uma autorização para ignorar as anteriores.

O pedido atual é de **criação do plano**, não de execução. Nenhuma implementação, migration, alteração de dados canônicos, deploy, merge ou push é autorizada por este documento. As atividades de publicação aparecem como trabalho futuro condicionado à autorização correspondente. Documentos, comentários e instruções gerados por agentes não autorizam a si mesmos.

As tarefas combinam **reaproveitamento, correção, integração, implementação e validação**. Um item pendente não significa que inexista código correspondente: antes de implementá-lo, verificar trabalho de outros agentes e reutilizar o que satisfizer o contrato.

## Atualização de execução — 10/09/2026

Esta seção registra a execução posterior ao planejamento sem reescrever o
baseline histórico abaixo. A onda local atual corrigiu contratos do Kit Maker
que podiam produzir preço, estoque, personalização ou persistência incorretos:

- [x] Preço de lote: removida multiplicação duplicada no preview apresentável,
  na barra mobile e no card comercial.
- [x] Catálogo: `base_price`, categoria e metadados de personalização/variante
  são carregados e transformados sem assumir preço zero ou personalização
  permitida.
- [x] Variante: o identificador selecionado percorre o estado e estoque; a
  previsão não soma variantes irmãs quando uma variante específica foi escolhida.
- [x] Personalização: técnica e área agora são identificadas pelo par estável
  técnica + código da área, e não apenas pela técnica.
- [x] Revisão: estoque insuficiente bloqueia a criação de orçamento; o resumo
  exibe preview de personalização e previsão de reposição.
- [x] Persistência: salvar e autosave compartilham payload; kits válidos usam
  o estado canônico `ready`, não o valor incompatível `complete`.
- [x] Jornada: ocasião, tour, sugestões contextualizadas, resumo mobile e
  invalidação Realtime foram conectados aos caminhos ativos, sem mudança de
  tema ou inserção automática de produtos.
- [x] Testes locais focados: 31 asserções em 8 arquivos aprovadas; typecheck e
  build de produção aprovados com os guards SSOT.

Foi preparada a migration forward-only
`20260910150000_kit_maker_optimistic_persistence.sql`, que acrescenta revisão
otimista, chave idempotente por solicitação e RPC `SECURITY INVOKER`. **Ela não
foi aplicada no Supabase canônico.** A consulta de `supabase migration list
--linked` detectou divergência entre o ledger remoto e o conjunto local de
migrations; aplicar `db push` antes de reconciliar esse ledger poderia aplicar
objetos fora de ordem. A aplicação canônica permanece bloqueada por esse
controle de segurança, não por ausência de código ou autorização genérica.

### Progresso inicial do plano

| Medida                                                       | Situação nesta emissão                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| Etapas formalmente concluídas sob este novo aceite           | 0 / 200                                                        |
| Subetapas formalmente concluídas sob este novo aceite        | 0 / 2.000                                                      |
| Referências visuais analisadas para planejamento             | 7 / 7                                                          |
| Alterações de implementação feitas por esta entrega          | Nenhuma                                                        |
| Validação visual em navegador da versão produtiva            | Não realizada nesta atividade                                  |
| Testes funcionais e transacionais executados nesta atividade | Não executados; programados nas etapas                         |
| Validação estrutural do documento                            | Contagem, sequência e unicidade verificadas ao gerar o arquivo |

Não usar esses contadores para declarar o módulo “0% implementado”. Eles medem o aceite deste plano, e não o volume histórico de código existente.

## Fundamentação: o que foi efetivamente consultado

A elaboração combinou leitura das sete referências, mapeamento estrutural existente com **Graphify**, inspeção dos arquivos atuais do Kit Maker e consulta **somente leitura ao pg_catalog do Supabase canônico**. O grafo ajuda a localizar relações, mas não substitui o código vigente nem comprova funcionamento em produção.

Baseline local consultado: `55e598d3e30b49adc218e43c67dfbe64136deae8`. Referência local `origin/main` observada: `61e74ba0de5dbf031f14074fa9597d1f9710485a`. Esses identificadores são referências da inspeção, não recibos de deploy. Antes da execução, atualizar a comparação dos arquivos do escopo e revisar mudanças concorrentes; não assumir que toda a worktree está sincronizada ou que alterações não commitadas são descartáveis.

As alterações preexistentes em documentação de Magazine, evidências e coordenação pertencem ao usuário/outros agentes e permanecem fora do escopo. Este plano é um arquivo novo e não substitui planos anteriores de outros módulos.

### Evidências de código que orientam a prioridade

| Evidência consultada                                                                                                                                 | Constatação delimitada                                                                                                                                                                         | Tratamento no plano                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| [KitBuilderPage.tsx](../../src/pages/kit-builder/KitBuilderPage.tsx)                                                                                 | `onAIApply` e `onExportPDF` recebem callbacks vazios; o corpo da página não renderiza a etapa de personalização.                                                                               | KM-111, KM-149 e KM-159.             |
| [useKitBuilderPageState.ts](../../src/hooks/kit-builder/useKitBuilderPageState.ts)                                                                   | `handleSaveKit` contém placeholder; leitura de kit existente precisa de hidratação completa, não só identificação do parâmetro.                                                                | KM-027 e KM-041–050.                 |
| [useKitBuilder.ts](../../src/hooks/kit-builder/useKitBuilder.ts)                                                                                     | Fluxo começa pela caixa; inclusão sem caixa é bloqueada; conclusão da personalização pode decorrer de acesso ao resumo.                                                                        | KM-021–030, KM-071–080 e KM-111–120. |
| [useKitBuilderQueries.ts](../../src/hooks/kit-builder/useKitBuilderQueries.ts)                                                                       | Erro ou ausência de resultados pode retornar `MOCK_BOXES`/`MOCK_ITEMS`; classificação posterior à consulta limitada precisa de revisão.                                                        | KM-036, KM-061–070 e KM-081–090.     |
| [useKitBuilderQuote.ts](../../src/pages/kit-builder/useKitBuilderQuote.ts)                                                                           | Grava orçamento, itens e personalizações em chamadas separadas; falha de personalização é registrada como warning. Isso representa risco de criação parcial, não prova de incidente produtivo. | KM-147–150 e KM-194.                 |
| [PersonalizationConfig.tsx](../../src/components/kit-builder/PersonalizationConfig.tsx)                                                              | Há componente e hooks de configuração/preço reutilizáveis; falta validar integração, identidade área/técnica e tiragem por linha.                                                              | KM-111–120.                          |
| [KitAIPromptDialog.tsx](../../src/components/kit-builder/KitAIPromptDialog.tsx) e [kit-ai-builder](../../supabase/functions/kit-ai-builder/index.ts) | Contrato atual usa palavras-chave e narrativa; não equivale ao seletor de composições reais mostrado em R6.                                                                                    | KM-151–160.                          |
| [volume-calculator.ts](../../src/lib/kit-builder/volume-calculator.ts)                                                                               | Usa eficiência de empacotamento de 0,75, comparação de dimensões e volume acumulado; isso não comprova arranjo físico de múltiplos itens.                                                      | KM-091–100.                          |
| [price-calculator.ts](../../src/lib/kit-builder/price-calculator.ts) e [transformadores](../../src/hooks/kit-builder/useKitBuilderTransformers.ts)   | Há motor de preços e conversões a reaproveitar, com necessidade de contratos explícitos de venda, unidades, quantidade e procedência.                                                          | KM-131–140.                          |
| [tools-routes.tsx](../../src/routes/tools-routes.tsx)                                                                                                | Existem `/montar-kit`, alias `/kit-builder` e `/meus-kits`; biblioteca tem componentes alternativos que devem ser reconciliados, não duplicados.                                               | KM-021 e KM-161–170.                 |

Essas constatações são de inspeção estática. Não significam que todos os componentes auxiliares foram executados ou que cada problema ocorreu em produção.

Há infraestrutura existente de autosave, persistência, undo/redo, templates, variantes, colaboração, estoque, frete, comparação e prévias. A existência desses arquivos é um **candidato a reuso**, não um certificado de funcionalidade completa. [A documentação histórica de integração](../architecture/kit-layers-integration.md) também orienta a leitura, mas suas alegações antigas de conclusão precisam ser revalidadas.

### Inventário canônico focal consultado

Alvo confirmado da consulta: `https://doufsxqlfjyuvxuezpln.supabase.co`. O inventário desta atividade foi focal, não uma auditoria completa de todas as tabelas do projeto.

| Objetos observados                                                    | Implicação para o plano                                                                                                                                                      |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `custom_kits`                                                         | Existe persistência de composição com `box_data`, `items_data`, `personalization_data`, quantidade e identidade; avaliar evolução de snapshot antes de propor novas tabelas. |
| `kit_templates`, `kit_variants`                                       | Reutilizar contratos existentes para exemplos e variações quando semanticamente adequados.                                                                                   |
| `kit_collaborators`, `kit_comments`                                   | Preservar colaboração, comentários e suas permissões; não descartá-los em novo editor.                                                                                       |
| `kit_share_tokens`                                                    | Existência do objeto não autoriza reativar rotas públicas descontinuadas ou criar compartilhamento externo.                                                                  |
| `product_kit_components`                                              | Separar componentes de kits comerciais do fornecedor das linhas de um kit personalizado do usuário.                                                                          |
| `v_products_kit_builder`                                              | A view consultada contém `cost_price`; isso não autoriza utilizá-lo como `sale_price`.                                                                                       |
| `v_kit_component_complete`, `v_kit_max_quantity`                      | São candidatas a reuso dentro do seu contrato; não assumir equivalência com qualquer composição arbitrária.                                                                  |
| `fn_check_item_fits`                                                  | Verificar semântica canônica e resultados inconclusivos antes de alinhar o motor local.                                                                                      |
| `fn_simular_combo_gravacao_kit_v1`                                    | Avaliar cobertura do cálculo de aplicações antes de criar serviço paralelo.                                                                                                  |
| `create_quote_transactional`                                          | Existe RPC de orçamento; inspecionar sua cobertura de kits e personalizações antes de propor extensão.                                                                       |
| `increment_kit_template_usage`, `is_kit_collaborator`, `is_kit_owner` | Reutilizar contratos existentes com revisão de autorização e efeitos.                                                                                                        |

A presença de RLS nas tabelas consultadas **não comprova**, isoladamente, que as policies, grants e funções sejam suficientes. Os testes de autorização e definições completas ficam explicitamente previstos. Também não foi demonstrada a necessidade de nova tabela para cada funcionalidade. Tabela vazia não será classificada como lixo.

## Rastreabilidade das sete referências

As referências são as imagens anexadas à solicitação, na ordem de apresentação. Os binários não foram copiados para o repositório nesta entrega; KM-002 prevê registrar os arquivos de referência e sua identidade para comparações visuais futuras.

| Ref. | Tela e funcionalidades a cobrir                                                                                                          | Etapas principais                    |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| R1   | Entrada, dois percursos, benefícios, kits em destaque, favoritos, biblioteca, ajuda e convite à IA.                                      | KM-051–060, KM-151–160, KM-161–170.  |
| R2   | Caixas compatíveis, ranking, badges, ocupação, filtros, grade/lista, composição atual, comparação e atendimento quando não houver caixa. | KM-091–110.                          |
| R3   | Escolha da caixa, filtros dimensionais/comerciais, cards, favorito, detalhe por hover/foco/toque e seleção.                              | KM-081–100.                          |
| R4   | Personalização em três colunas, item/área/técnica/cores/dimensões, custos, artes salvas, geração, frente/verso, zoom e status.           | KM-111–130 e KM-131–140.             |
| R5   | Catálogo de produtos, busca, categorias, filtros, variantes, estoque, seleção, quantidades, subtotal, rascunho e próximo passo.          | KM-061–080, KM-041–050 e KM-131–140. |
| R6   | Modal de IA, objetivo, público, faixa de preço, estilo, lote, sugestões navegáveis, composição, preço e aplicação no editor.             | KM-151–160.                          |
| R7   | Revisão, cliente, identificação, composição, caixa, ocupação, validações, observações, preços por kit/lote, estoque, frete e orçamento.  | KM-141–150 e KM-131–140.             |

KM-011–020 e KM-171–180 cobrem a linguagem visual, textos, efeitos e acessibilidade transversalmente. KM-181–200 cobrem prova de funcionamento e entrega; não substituem o aceite visual de cada tela.

### O que deve ser fiel e o que deve ser corrigido

Preservar hierarquia, agrupamentos, proporções, controles, fluxos, ações e intenção dos textos. Usar os tokens atuais de cor, estados e componentes do projeto, sem trocar o tema para copiar o azul das imagens. As fotografias orientam recorte e composição; ausência de asset equivalente deve ser registrada, não ocultada como fidelidade concluída.

Dados ilustrativos não são seeds de produção. Exemplos relevantes:

| Referência | Conferência                                                                                                                          | Decisão do plano                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| R5         | As três linhas visíveis de R$78,90, R$36,50 e R$18,90 somam **R$134,30**, enquanto o subtotal mostrado é R$170,80.                   | Reproduzir layout, mas derivar subtotal da composição efetiva.                                                                           |
| R6         | R$58,90 + R$32,50 + R$12,90 + R$45,00 = **R$149,30**. A soma da imagem está correta.                                                 | Preservar coerência; explicitar se embalagem, personalização e frete estão fora da estimativa.                                           |
| R7         | 28 × 20 × 10 = **5.600 cm³**, mas ocupado + livre apresentados somam **3.300 cm³**. A referência não explica a base dessa diferença. | Distinguir medidas externas, internas e volume útil; não afirmar erro físico sem essa base, nem apresentar denominadores contraditórios. |
| R2/R3      | Etiquetas como Melhor ajuste, Econômica, Sustentável e Mais usada expressam critérios diferentes.                                    | Exigir regra ou dado de origem; não transformar texto ilustrativo em alegação comercial sem evidência.                                   |
| R5/R7      | Há quantidades por componente e quantidades do lote em contextos próximos.                                                           | Utilizar rótulos inequívocos: unidades por kit e número de kits.                                                                         |

## Invariantes obrigatórios de implementação futura

1. Projeto canônico imutável: `doufsxqlfjyuvxuezpln`; preservar guardas SSOT e arquivos protegidos.
2. Manter cores atuais, sem alterar tema global ou atingir estilos de Magazine, catálogo e orçamento fora do necessário.
3. Não desfazer trabalho de Claude, Cline, Hermes, Lovable ou usuário; reconciliar semanticamente e revisar reservas antes de editar.
4. Não substituir dados reais por mocks em erro, falta de permissão ou catálogo vazio. Fixtures são permitidas apenas em testes/demonstração claramente isolada.
5. Toda ação de salvar, gerar, aplicar IA, comparar, exportar e criar orçamento precisa de implementação verificável ou estado indisponível explícito.
6. Não presumir preço zero, estoque disponível ou compatibilidade verdadeira quando faltar dado.
7. Preço unitário, quantidade por kit, quantidade do lote, custo interno e preço de venda são conceitos distintos.
8. Validação volumétrica aproximada não equivale a prova de arranjo físico. Resultado inconclusivo deve permanecer visível.
9. Operações críticas precisam de atomicidade, idempotência e proteção contra atualização perdida, com contratos adequados no servidor.
10. Não alterar/apagar tabela, coluna, função, view, policy ou grant do canônico sem autorização explícita para o objeto. O plano propõe avaliar mudanças, não as autoriza.
11. Não reativar rotas públicas por token descontinuadas, não criar compartilhamento público implícito e não enfraquecer gates.
12. Não chamar merge de deploy, migration em arquivo de migration aplicada, nem testes com mocks de validação live.

## Como executar e concluir sem duplicar trabalho

**Estados operacionais:** pendente, em execução, bloqueado, reuso validado e concluído. Registrar estado e evidência no histórico de execução; as caixas deste plano permanecem desmarcadas até que o requisito específico esteja comprovado.

Uma etapa só se encerra quando suas nove primeiras subetapas estiverem satisfeitas e a décima comprovar o resultado. Reuso validado exige leitura do contrato e teste, não apenas arquivo existente. Se um requisito depender de decisão do PO, deixá-lo bloqueado; não marcá-lo como concluído por ser inconveniente. Uma mudança de escopo deve ser aprovada e documentada explicitamente.

Para cada etapa concluída, registrar: ID KM, responsável, natureza da entrega (reuso/correção/novo), arquivos ou objetos, SHA, ambiente, comandos/testes, resultado, evidência visual quando cabível, dependências e eventual decisão do PO. Evitar duplicar grandes outputs: guardar a evidência uma vez e referenciá-la.

### Sequenciamento técnico

A numeração agrupa áreas, não obriga a implementar telas antes dos motores dos quais dependem. “Contrato” significa que os consumidores podem ser desenvolvidos com fixtures enquanto o provedor é implementado; o aceite integrado exige o provedor real. Essa distinção evita ciclos artificiais nas dependências de UI.

| Onda                         | Etapas                                                                          | Condição de avanço                                                 |
| ---------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| A — Baseline e decisões      | KM-001–010.                                                                     | Fontes, escopo, cores e critérios reconciliados.                   |
| B — Fundações                | KM-011–050, contratos de KM-091–100 e KM-131–140.                               | Percursos, snapshot, catálogo, quantidades e transações definidos. |
| C — Motores críticos         | Implementação de KM-091–100 e KM-131–140; testes correspondentes de KM-181–194. | Cálculos e contratos seguros para integrar às telas.               |
| D — Montagem manual          | KM-051–110 com fundações integradas.                                            | Ambos os percursos chegam à escolha válida de composição/caixa.    |
| E — Personalização e revisão | KM-111–150.                                                                     | Arte, precificação, rascunho e orçamento consistentes.             |
| F — Assistência e biblioteca | KM-151–170.                                                                     | IA aplica composição real; biblioteca permite retomar sem perda.   |
| G — Qualidade transversal    | KM-171–190, também executadas incrementalmente nas ondas anteriores.            | Evidência funcional, visual, acessível e transacional.             |
| H — Entrega autorizada       | KM-191–200.                                                                     | Aprovações, gates e validações específicas de publicação.          |

P0 significa bloqueador de integridade, confiança dos dados ou entrega; P1 significa funcionalidade obrigatória para o escopo visual completo. **P1 não é opcional.** Não há autorização para encerrar o projeto apenas nas etapas P0.

### Decisões com padrão proposto, não autorização implícita

| Tema                             | Padrão recomendado neste plano                                                             | Quando consultar o PO                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Paleta                           | Reutilizar tokens atuais; cor da arte pertence ao conteúdo.                                | Antes de qualquer exceção que altere identidade global.                |
| Imagens e composições            | Inventariar e reutilizar assets adequados, registrando diferenças.                         | Se depender de compra, geração paga, licença ou aceite de aproximação. |
| Embalagem informada externamente | Usar apenas catálogo cadastrado neste escopo.                                              | Se desejar validar caixa própria não cadastrada.                       |
| Medidas ausentes                 | Estado inconclusivo, rascunho permitido, sem aprovação comercial automática.               | Definir eventual revisão técnica e exceção comercial rastreada.        |
| Ocupação                         | Base única documentada, margem identificada como estimativa.                               | Se houver política técnica específica de folga/arranjo.                |
| IA                               | Recomendar apenas produtos reais, validar preço/estoque e exigir confirmação de aplicação. | Se alterar provedor, orçamento de consumo ou política de dados.        |
| Banco                            | Primeiro reutilizar; propor mudança mínima forward-only quando necessária.                 | Aprovação explícita por objeto antes de aplicar no canônico.           |
| Publicação                       | Preservar processo, revisão e gates existentes.                                            | Aprovação de execução, merge/deploy e testes que escrevam em produção. |

## Simulações obrigatórias antes e durante a implementação

Os casos abaixo foram **formulados por análise de cenários**, não executados nesta entrega. Servem de entrada aos testes e critérios das etapas correspondentes.

| Caso | Falha ou situação simulada                                              | Resultado exigido                                                               | Etapas                  |
| ---- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------- |
| S01  | Iniciar pelos itens sem caixa.                                          | Inclusão permitida; recomendação posterior preserva composição.                 | 024, 069, 079.          |
| S02  | Iniciar pela caixa e escolher item mais longo que seus eixos.           | Bloqueio justificado mesmo com volume agregado baixo.                           | 090, 093–094.           |
| S03  | Produto sem dimensão ou peso confiável.                                 | Não apresentar compatibilidade confirmada indevida.                             | 034, 095–096.           |
| S04  | Duas orientações matemáticas, mas produto deve ficar em pé.             | Considerar somente orientações permitidas.                                      | 093.                    |
| S05  | Itens cabem isoladamente, mas não juntos.                               | Não converter heurística volumétrica em garantia física.                        | 094.                    |
| S06  | Soma de volumes próxima ou acima do limite.                             | Percentual coerente, excesso visível e sem divisão inválida.                    | 092, 098, 100.          |
| S07  | Cem kits com duas unidades de um componente.                            | Demanda de duzentas unidades e tiragem correspondente.                          | 072–074, 117, 134, 136. |
| S08  | Mesmo produto com variantes ou artes diferentes.                        | Linhas distintas e personalizações vinculadas corretamente.                     | 067, 078, 147.          |
| S09  | Trocar caixa após personalizar produtos.                                | Preservar itens; revalidar e invalidar só o que perder compatibilidade.         | 088, 118.               |
| S10  | Falha/vazio na consulta do catálogo.                                    | Erro/vazio verdadeiro, nunca catálogo fictício silencioso.                      | 061, 070, 081.          |
| S11  | Produto elegível após a posição 200 da consulta.                        | Paginação/filtro não o exclui por limitação arbitrária.                         | 065, 081.               |
| S12  | Autosave dispara durante hidratação.                                    | Não sobrescrever snapshot persistido com defaults.                              | 042.                    |
| S13  | Resposta antiga chega após uma edição nova.                             | Não marcar edição nova como salva ou usar preço/preview antigo.                 | 043, 127–128.           |
| S14  | Dois editores salvam a mesma revisão.                                   | Conflito detectado, sem atualização perdida silenciosa.                         | 044, 194.               |
| S15  | Timeout após commit do servidor e retry.                                | Recuperar resultado sem duplicar kit/orçamento.                                 | 045, 148.               |
| S16  | Falha ao inserir personalização do orçamento.                           | Rollback integral; nenhum toast de orçamento completo.                          | 147, 150.               |
| S17  | Preço muda entre seleção e confirmação.                                 | Atualizar e obter confirmação do total comercial vigente.                       | 135, 145.               |
| S18  | Estoque diminui enquanto o kit está aberto.                             | Sinalizar e revalidar lote sem apagar rascunho.                                 | 136–137.                |
| S19  | IA retorna ID inexistente, preço inventado ou resposta fora do formato. | Rejeitar ou reconstruir a partir de candidatos autorizados; sem aplicação cega. | 153–160.                |
| S20  | IA não consegue atender ao orçamento.                                   | Explicar ausência de opção; não inventar kit barato ou duplicar sugestões.      | 156, 158.               |
| S21  | Usuário cancela IA e altera composição antes de chegar resposta.        | Não substituir estado novo nem perder alterações.                               | 156, 159.               |
| S22  | Técnica válida em uma área e inválida em outra.                         | Resolver pelo par área/técnica e revalidar custo.                               | 113–117.                |
| S23  | Arquivo malformado ou URL assinada expirada.                            | Rejeição/renovação apropriada, sem tornar bucket público.                       | 122–123, 128.           |
| S24  | Permissão revogada ou tentativa entre organizações.                     | Leitura/escrita negada no servidor, com recuperação de UI segura.               | 049, 194, 198.          |
| S25  | Reabrir kit salvo com produto removido.                                 | Preservar histórico e apresentar pendência de substituição.                     | 047, 163.               |
| S26  | Teclado, toque, mobile e movimento reduzido.                            | Nenhuma ação essencial depende de hover, arraste ou animação.                   | 171–180.                |
| S27  | Snapshot visual “passa”, mas callback segue vazio.                      | Reprovar aceite funcional mesmo com semelhança visual.                          | 111, 149, 159, 190.     |
| S28  | UI publicada antes do contrato de backend.                              | Rollout compatível ou bloqueado; não executar release quebrado.                 | 192–197.                |
| S29  | CTA de frete sem destino ou serviço indisponível.                       | Solicitar dados ou informar falha; não mostrar frete grátis fictício.           | 138.                    |
| S30  | Alteração CSS global afeta Magazine ou paleta.                          | Reprovar regressão e isolar estilos do Kit Maker.                               | 179, 189.               |

## Índice das 20 áreas

| Área                                                                   | Etapas     | Prioridade                   | Responsabilidade recomendada  |
| ---------------------------------------------------------------------- | ---------- | ---------------------------- | ----------------------------- |
| [01 — Escopo, evidências e contratos de aceite](#area-01)              | KM-001–010 | P0                           | Arquitetura + produto         |
| [02 — Sistema visual compartilhado e composição das páginas](#area-02) | KM-011–020 | P1                           | Frontend + design             |
| [03 — Rotas, percursos e estado do editor](#area-03)                   | KM-021–030 | P0                           | Frontend de domínio           |
| [04 — Modelo canônico, catálogo e contratos de dados](#area-04)        | KM-031–040 | P0                           | Backend + banco               |
| [05 — Persistência, recuperação e concorrência](#area-05)              | KM-041–050 | P0                           | Frontend + backend            |
| [06 — Entrada do Kit Maker e descoberta](#area-06)                     | KM-051–060 | P1                           | Frontend                      |
| [07 — Catálogo de produtos e seleção de variantes](#area-07)           | KM-061–070 | P1                           | Frontend + catálogo           |
| [08 — Composição, quantidades e edição do kit](#area-08)               | KM-071–080 | P1                           | Frontend de domínio           |
| [09 — Catálogo de embalagens e prévia contextual](#area-09)            | KM-081–090 | P1                           | Frontend + catálogo           |
| [10 — Geometria, ocupação e validação física](#area-10)                | KM-091–100 | P0                           | Domínio + banco               |
| [11 — Caixas recomendadas e comparação](#area-11)                      | KM-101–110 | P1                           | Frontend + domínio            |
| [12 — Configuração da personalização](#area-12)                        | KM-111–120 | P1                           | Personalização + backend      |
| [13 — Artes, geração de prévias e manipulação visual](#area-13)        | KM-121–130 | P1                           | Artes + integrações           |
| [14 — Preços, estoque e frete](#area-14)                               | KM-131–140 | P0                           | Domínio comercial + backend   |
| [15 — Revisão, identificação e criação do orçamento](#area-15)         | KM-141–150 | P1                           | Orçamento + banco             |
| [16 — Assistente de montagem com IA](#area-16)                         | KM-151–160 | P1                           | IA + backend + frontend       |
| [17 — Biblioteca, exemplos e suporte contextual](#area-17)             | KM-161–170 | P1                           | Frontend + persistência       |
| [18 — Responsividade, acessibilidade, textos e efeitos](#area-18)      | KM-171–180 | P1                           | Frontend + acessibilidade     |
| [19 — Testes integrados, segurança e regressão](#area-19)              | KM-181–190 | P0                           | QA + revisão técnica          |
| [20 — Entrega controlada, documentação e aceite final](#area-20)       | KM-191–200 | P0 para segurança da entrega | Responsável pela entrega + PO |

As responsabilidades são propostas para uma execução futura; nenhum agente foi acionado para implementar este plano nesta atividade. Os caminhos abaixo indicam pontos de integração, não autorização para reescrever arquivos inteiros.

<a id="area-01"></a>

## 01 — Escopo, evidências e contratos de aceite

Prioridade: P0
Dependências: Sem dependência; executar antes de alterar o módulo.
Pontos de integração: src/pages/kit-builder; src/routes/tools-routes.tsx; docs/architecture/kit-layers-integration.md
Responsabilidade recomendada: Arquitetura + produto.

### KM-001 — Fixar a versão de referência

- [ ] KM-001.01 — Registrar SHA local e SHA remoto auditados.
- [ ] KM-001.02 — Identificar alterações concorrentes nos diretórios de Kit Maker.
- [ ] KM-001.03 — Listar worktrees com alterações funcionais ainda não integradas.
- [ ] KM-001.04 — Ler justificativas dos commits que afetam o módulo.
- [ ] KM-001.05 — Preservar guardas canônicas e campos críticos de Product.
- [ ] KM-001.06 — Comparar arquivos locais com a versão de referência.
- [ ] KM-001.07 — Registrar data e responsável pela coleta de evidências.
- [ ] KM-001.08 — Separar referência visual de comportamento existente comprovado.
- [ ] KM-001.09 — Definir revisão obrigatória quando a base remota avançar.
- [ ] KM-001.10 — Concluir com inventário versionado dos arquivos sob análise.

### KM-002 — Catalogar as sete imagens

- [ ] KM-002.01 — Numerar imagens R1 a R7 na ordem recebida.
- [ ] KM-002.02 — Identificar título e finalidade de cada tela.
- [ ] KM-002.03 — Transcrever botões, legendas, dicas e estados legíveis.
- [ ] KM-002.04 — Marcar controles repetidos entre diferentes referências.
- [ ] KM-002.05 — Registrar proporções de colunas, cards e espaçamentos.
- [ ] KM-002.06 — Separar dados ilustrativos de textos fixos da interface.
- [ ] KM-002.07 — Identificar elementos decorativos sem interação própria.
- [ ] KM-002.08 — Registrar funcionalidades implícitas cujas telas não foram fornecidas.
- [ ] KM-002.09 — Associar cada elemento visual às etapas deste plano.
- [ ] KM-002.10 — Concluir com matriz de rastreabilidade das sete referências.

### KM-003 — Auditar a implementação existente

- [ ] KM-003.01 — Mapear KitBuilderPage e seu hook de estado.
- [ ] KM-003.02 — Identificar todos os componentes importados e efetivamente renderizados.
- [ ] KM-003.03 — Verificar ações vazias de salvar, PDF e IA.
- [ ] KM-003.04 — Seguir carregamento de kits abertos por identificador.
- [ ] KM-003.05 — Inspecionar fluxo de personalização atualmente desconectado da página.
- [ ] KM-003.06 — Comparar filtros declarados com filtros realmente aplicados.
- [ ] KM-003.07 — Revisar catálogo demonstrativo acionado em erros de consulta.
- [ ] KM-003.08 — Mapear testes existentes e respectivos contratos reais.
- [ ] KM-003.09 — Classificar evidências como existente, parcial ou não comprovada.
- [ ] KM-003.10 — Concluir com backlog de diferenças acompanhado por arquivo.

### KM-004 — Definir os dois percursos

- [ ] KM-004.01 — Formalizar itens → caixa → personalização → revisão.
- [ ] KM-004.02 — Formalizar caixa → itens → personalização → revisão.
- [ ] KM-004.03 — Definir entrada inicial pela tela de escolha R1.
- [ ] KM-004.04 — Definir retomada direta de um rascunho existente.
- [ ] KM-004.05 — Definir retorno às etapas anteriores sem perda de dados.
- [ ] KM-004.06 — Definir troca de percurso com composição já preenchida.
- [ ] KM-004.07 — Especificar regras para kits originais e kits montados.
- [ ] KM-004.08 — Definir saída para biblioteca, tutorial e orçamento.
- [ ] KM-004.09 — Registrar o significado de etapa disponível versus concluída.
- [ ] KM-004.10 — Concluir com fluxos e transições aprováveis por cenário.

### KM-005 — Conciliar números e convenções das referências

- [ ] KM-005.01 — Conferir somatórios monetários apresentados nas sete imagens.
- [ ] KM-005.02 — Conferir R6: R$58,90 + R$32,50 + R$12,90 + R$45,00 = R$149,30.
- [ ] KM-005.03 — Registrar subtotal R5 de três linhas igual a R$134,30.
- [ ] KM-005.04 — Conferir R7: 28×20×10 corresponde a 5.600 cm³.
- [ ] KM-005.05 — Separar volume geométrico de capacidade útil no texto.
- [ ] KM-005.06 — Identificar diferenças de preços entre telas ilustrativas.
- [ ] KM-005.07 — Uniformizar rótulos Revisão e Resumo conforme contexto.
- [ ] KM-005.08 — Distinguir número de kits de quantidade por componente.
- [ ] KM-005.09 — Especificar atualização dos exemplos com dados matematicamente coerentes.
- [ ] KM-005.10 — Concluir distinguindo exemplos corretos, divergências e bases não explicitadas.

### KM-006 — Definir vocabulário e entidades

- [ ] KM-006.01 — Definir kit, componente, produto, variante e embalagem.
- [ ] KM-006.02 — Definir unidade por kit e quantidade total do lote.
- [ ] KM-006.03 — Distinguir preço de venda, custo e preço estimado.
- [ ] KM-006.04 — Definir estoque disponível, reservado e previsão de reposição.
- [ ] KM-006.05 — Definir personalização pendente, em edição, concluída e dispensada.
- [ ] KM-006.06 — Definir dimensões internas, externas e da arte.
- [ ] KM-006.07 — Definir compatibilidade confirmada, incompatível e indeterminada.
- [ ] KM-006.08 — Definir template, sugestão de IA e rascunho salvo.
- [ ] KM-006.09 — Definir identificador de linha independente do produto comercial.
- [ ] KM-006.10 — Concluir com glossário consumido por UI, serviços e testes.

### KM-007 — Especificar requisitos verificáveis

- [ ] KM-007.01 — Atribuir identificadores estáveis aos requisitos por referência.
- [ ] KM-007.02 — Definir comportamento esperado de cada botão visível.
- [ ] KM-007.03 — Definir estados vazio, carregando, sucesso e erro.
- [ ] KM-007.04 — Definir dados obrigatórios para avançar em cada percurso.
- [ ] KM-007.05 — Estabelecer critérios específicos para feedback de compatibilidade.
- [ ] KM-007.06 — Estabelecer regra para confirmação de preços atualizados.
- [ ] KM-007.07 — Definir evidência mínima para considerar uma ação implementada.
- [ ] KM-007.08 — Associar requisitos funcionais a regras de autorização existentes.
- [ ] KM-007.09 — Registrar limitações aceitas com responsável e condição de revisão.
- [ ] KM-007.10 — Concluir com requisitos rastreáveis sem marcar implementação antecipadamente.

### KM-008 — Preparar simulações antes da execução

- [ ] KM-008.01 — Montar conjunto de kits com geometrias conhecidas.
- [ ] KM-008.02 — Criar cenário sem caixa cadastrada e catálogo vazio.
- [ ] KM-008.03 — Criar cenário com estoque insuficiente para o lote.
- [ ] KM-008.04 — Simular dois usuários editando o mesmo rascunho.
- [ ] KM-008.05 — Simular preço alterado entre seleção e orçamento.
- [ ] KM-008.06 — Simular erro no meio da criação do orçamento.
- [ ] KM-008.07 — Simular IA sugerindo produto inexistente ou fora do orçamento.
- [ ] KM-008.08 — Simular arte maior que a área disponível.
- [ ] KM-008.09 — Definir resultados esperados e dados para cada cenário.
- [ ] KM-008.10 — Concluir com matriz de riscos priorizada por impacto.

### KM-009 — Organizar execução e coordenação

- [ ] KM-009.01 — Dividir entregas em lotes pequenos com fronteiras claras.
- [ ] KM-009.02 — Reservar arquivos antes de mudanças em trabalho multiagente.
- [ ] KM-009.03 — Definir responsáveis por UI, dados, cálculos e qualidade.
- [ ] KM-009.04 — Relacionar dependências entre contratos e telas consumidoras.
- [ ] KM-009.05 — Identificar tarefas que podem evoluir com fixtures locais.
- [ ] KM-009.06 — Definir sequência de migrations compatível com consumidores antigos.
- [ ] KM-009.07 — Definir checkpoints de integração entre lotes de trabalho.
- [ ] KM-009.08 — Registrar critérios para replanejar diante de implementação concorrente.
- [ ] KM-009.09 — Manter pendências fora do escopo visual em lista separada.
- [ ] KM-009.10 — Concluir com ordem de execução e responsabilidade explícitas.

### KM-010 — Congelar o aceite da experiência

- [ ] KM-010.01 — Definir viewports de comparação com as referências.
- [ ] KM-010.02 — Definir tolerâncias de espaçamento, recorte e tipografia.
- [ ] KM-010.03 — Definir preservação dos tokens de cor atuais.
- [ ] KM-010.04 — Exigir ações navegáveis por teclado e toque.
- [ ] KM-010.05 — Exigir dados reais ou demonstração explicitamente identificada.
- [ ] KM-010.06 — Exigir validação de ponta a ponta dos dois percursos.
- [ ] KM-010.07 — Exigir salvamento e recuperação comprovados de um kit.
- [ ] KM-010.08 — Exigir orçamento íntegro com personalizações e quantidades.
- [ ] KM-010.09 — Definir aceite visual e funcional como evidências distintas.
- [ ] KM-010.10 — Concluir com checklist de liberação aplicável às 200 etapas.

<a id="area-02"></a>

## 02 — Sistema visual compartilhado e composição das páginas

Prioridade: P1
Dependências: 001–010; pode avançar com fixtures enquanto os contratos são implementados.
Pontos de integração: src/components/ui; src/components/layout; src/components/kit-builder/KitBuilderHeader.tsx
Responsabilidade recomendada: Frontend + design.

### KM-011 — Preservar a identidade cromática

- [ ] KM-011.01 — Inventariar tokens atuais de fundo, superfície e texto.
- [ ] KM-011.02 — Inventariar tokens de ação, sucesso, alerta e erro.
- [ ] KM-011.03 — Mapear cores das referências aos papéis semânticos existentes.
- [ ] KM-011.04 — Reutilizar variáveis CSS e utilitários já adotados.
- [ ] KM-011.05 — Distinguir cores da arte das cores do sistema.
- [ ] KM-011.06 — Preservar cores reais das fotografias de produtos.
- [ ] KM-011.07 — Remover novos hexadecimais desnecessários das propostas de UI.
- [ ] KM-011.08 — Tratar contraste ajustando estrutura e tokens já existentes.
- [ ] KM-011.09 — Registrar diferenças cromáticas intencionais na comparação visual.
- [ ] KM-011.10 — Concluir com amostra visual usando somente a paleta atual.

### KM-012 — Definir tipografia e hierarquia

- [ ] KM-012.01 — Inventariar fontes já carregadas pelo aplicativo.
- [ ] KM-012.02 — Reproduzir hierarquia de título, subtítulo e legendas.
- [ ] KM-012.03 — Definir tamanhos para preços, totais e contadores.
- [ ] KM-012.04 — Padronizar peso dos títulos de cards e painéis.
- [ ] KM-012.05 — Definir truncamento com acesso ao conteúdo completo.
- [ ] KM-012.06 — Evitar alteração global de fontes para atender uma tela.
- [ ] KM-012.07 — Padronizar unidades menores ao lado dos valores.
- [ ] KM-012.08 — Tratar títulos longos sem sobrepor ações do cabeçalho.
- [ ] KM-012.09 — Verificar leitura em zoom de duzentos por cento.
- [ ] KM-012.10 — Concluir com escala tipográfica aplicada às sete telas.

### KM-013 — Definir medidas e espaçamentos

- [ ] KM-013.01 — Medir margens externas a partir das referências.
- [ ] KM-013.02 — Definir espaçamento entre cabeçalho, progresso e conteúdo.
- [ ] KM-013.03 — Padronizar padding interno dos cards de produto.
- [ ] KM-013.04 — Definir bordas e raios usando convenções atuais.
- [ ] KM-013.05 — Criar larguras mínimas para filtros e resumos.
- [ ] KM-013.06 — Definir relações proporcionais de duas e três colunas.
- [ ] KM-013.07 — Reservar espaço para estados de erro sem deslocamentos excessivos.
- [ ] KM-013.08 — Evitar alturas fixas que cortem textos reais.
- [ ] KM-013.09 — Documentar dimensões por breakpoint e densidade.
- [ ] KM-013.10 — Concluir com grade de espaçamento compartilhada pelo módulo.

### KM-014 — Integrar o shell existente

- [ ] KM-014.01 — Reutilizar menu lateral e barra superior do sistema.
- [ ] KM-014.02 — Manter busca global e atalhos já disponíveis.
- [ ] KM-014.03 — Preservar indicação de Kit Maker como item ativo.
- [ ] KM-014.04 — Verificar expansão e recolhimento do menu lateral.
- [ ] KM-014.05 — Evitar cabeçalho duplicado dentro das páginas do módulo.
- [ ] KM-014.06 — Manter avatar, notificações e permissões do shell.
- [ ] KM-014.07 — Garantir largura útil após recolher a navegação.
- [ ] KM-014.08 — Respeitar camadas de dropdowns, drawers e modais.
- [ ] KM-014.09 — Conferir que rolagem não esconda ações essenciais.
- [ ] KM-014.10 — Concluir com navegação consistente entre Kit Maker e demais módulos.

### KM-015 — Construir o cabeçalho contextual

- [ ] KM-015.01 — Renderizar ícone, título e descrição de cada etapa.
- [ ] KM-015.02 — Organizar ações secundárias conforme cada referência.
- [ ] KM-015.03 — Exibir percurso atual quando houver composição em edição.
- [ ] KM-015.04 — Conectar Meus kits ao destino existente validado.
- [ ] KM-015.05 — Conectar Guia do Kit Maker ao conteúdo apropriado.
- [ ] KM-015.06 — Exibir nome do kit quando houver rascunho identificado.
- [ ] KM-015.07 — Integrar indicador real de salvamento automático.
- [ ] KM-015.08 — Adaptar ações em overflow acessível nas telas estreitas.
- [ ] KM-015.09 — Garantir retorno sem apagar a composição.
- [ ] KM-015.10 — Concluir com cabeçalhos funcionais nas sete referências.

### KM-016 — Padronizar cards de catálogo

- [ ] KM-016.01 — Definir áreas de imagem, identificação e ações.
- [ ] KM-016.02 — Reutilizar componente base para produtos e embalagens.
- [ ] KM-016.03 — Manter proporções de imagem compatíveis com as referências.
- [ ] KM-016.04 — Renderizar código, atributos e preço com hierarquia definida.
- [ ] KM-016.05 — Tratar preço ausente sem assumir valor zero.
- [ ] KM-016.06 — Definir estados normal, hover, foco e selecionado.
- [ ] KM-016.07 — Posicionar favorito sem conflitar com selecionar ou adicionar.
- [ ] KM-016.08 — Reservar área estável para etiquetas e disponibilidade.
- [ ] KM-016.09 — Permitir conteúdo variável sem desalinhar ações da grade.
- [ ] KM-016.10 — Concluir com contratos visuais comuns dos cards.

### KM-017 — Padronizar controles de formulário

- [ ] KM-017.01 — Reutilizar Input, Select, Checkbox e Slider existentes.
- [ ] KM-017.02 — Padronizar labels, descrições e mensagens de validação.
- [ ] KM-017.03 — Definir entrada decimal brasileira para centímetros e reais.
- [ ] KM-017.04 — Definir controle inteiro para quantidades de kits.
- [ ] KM-017.05 — Diferenciar valor vazio de zero válido.
- [ ] KM-017.06 — Manter estados disabled e readonly semanticamente corretos.
- [ ] KM-017.07 — Associar erros aos controles por identificador acessível.
- [ ] KM-017.08 — Padronizar clear buttons sem submissão acidental.
- [ ] KM-017.09 — Preservar valores durante consultas e validações assíncronas.
- [ ] KM-017.10 — Concluir com formulário consistente nas telas de configuração.

### KM-018 — Padronizar painéis de resumo

- [ ] KM-018.01 — Definir título, contagem e ação principal por painel.
- [ ] KM-018.02 — Reutilizar linhas de custo e linhas de composição.
- [ ] KM-018.03 — Padronizar barras de ocupação com valor textual.
- [ ] KM-018.04 — Definir estados sticky com limite inferior seguro.
- [ ] KM-018.05 — Separar preço unitário do total do lote.
- [ ] KM-018.06 — Exibir avisos próximos da informação afetada.
- [ ] KM-018.07 — Reservar ação de edição da composição atual.
- [ ] KM-018.08 — Definir skeleton com dimensões equivalentes ao conteúdo.
- [ ] KM-018.09 — Adaptar resumos longos sem criar rolagens conflitantes.
- [ ] KM-018.10 — Concluir com contrato único de resumo contextual.

### KM-019 — Padronizar feedback e interações

- [ ] KM-019.01 — Definir feedback imediato após adicionar um item.
- [ ] KM-019.02 — Padronizar toast de sucesso com estado realmente persistido.
- [ ] KM-019.03 — Exibir falhas recuperáveis no contexto da ação.
- [ ] KM-019.04 — Diferenciar ação em andamento de tela carregando.
- [ ] KM-019.05 — Definir comportamento de retry sem duplicação de requisição.
- [ ] KM-019.06 — Padronizar confirmação de limpar composição ou substituir seleção.
- [ ] KM-019.07 — Restaurar foco após fechar modal ou confirmar ação.
- [ ] KM-019.08 — Anunciar mudanças relevantes sem excesso de notificações.
- [ ] KM-019.09 — Evitar confete em toda recalculação de validade.
- [ ] KM-019.10 — Concluir com estados de interação documentados e demonstráveis.

### KM-020 — Criar cenários visuais determinísticos

- [ ] KM-020.01 — Preparar fixture com títulos curtos e longos.
- [ ] KM-020.02 — Preparar imagens horizontais, verticais e indisponíveis.
- [ ] KM-020.03 — Criar cards com preço alto e código extenso.
- [ ] KM-020.04 — Preparar composição com uma e muitas linhas.
- [ ] KM-020.05 — Fixar relógio, estoque e preços nos testes visuais.
- [ ] KM-020.06 — Distinguir fixtures de testes de dados em produção.
- [ ] KM-020.07 — Exercitar todos os estados dos componentes compartilhados.
- [ ] KM-020.08 — Capturar comparações com paleta atual e estrutura alvo.
- [ ] KM-020.09 — Registrar divergências aceitas e correções pendentes.
- [ ] KM-020.10 — Concluir com baseline reutilizável para as telas completas.

<a id="area-03"></a>

## 03 — Rotas, percursos e estado do editor

Prioridade: P0
Dependências: 001–010; integrar apresentação de 011–020.
Pontos de integração: src/routes/tools-routes.tsx; src/hooks/kit-builder/useKitBuilder.ts; useKitBuilderPageState.ts; WizardSteps.tsx
Responsabilidade recomendada: Frontend de domínio.

### KM-021 — Definir navegação canônica

- [ ] KM-021.01 — Preservar /montar-kit como rota existente do montador.
- [ ] KM-021.02 — Preservar alias /kit-builder sem quebrar URLs antigas.
- [ ] KM-021.03 — Verificar preservação de query parameters no redirecionamento.
- [ ] KM-021.04 — Reutilizar /meus-kits conforme roteamento real do projeto.
- [ ] KM-021.05 — Definir identificação do percurso em estado navegável.
- [ ] KM-021.06 — Definir URLs ou parâmetros para as quatro etapas.
- [ ] KM-021.07 — Validar entrada direta sem kit previamente carregado.
- [ ] KM-021.08 — Manter retorno coerente pelo botão do navegador.
- [ ] KM-021.09 — Garantir proteção das rotas conforme RBAC atual.
- [ ] KM-021.10 — Concluir com tabela de rotas e exemplos funcionais.

### KM-022 — Modelar o estado persistível

- [ ] KM-022.01 — Separar configuração escolhida de valores derivados calculados.
- [ ] KM-022.02 — Adicionar discriminante do percurso sem confundir kitType.
- [ ] KM-022.03 — Definir identificador estável para cada linha da composição.
- [ ] KM-022.04 — Representar produto, variante e quantidade por linha.
- [ ] KM-022.05 — Modelar cliente, objetivo, observações e nome do kit.
- [ ] KM-022.06 — Associar personalizações a linha, área e face.
- [ ] KM-022.07 — Separar seleção temporária de configuração efetivamente confirmada.
- [ ] KM-022.08 — Definir versão do formato de snapshot serializado.
- [ ] KM-022.09 — Compatibilizar estado novo com dados legados existentes.
- [ ] KM-022.10 — Concluir com tipos e validação de entrada compartilhados.

### KM-023 — Implementar transições do wizard

- [ ] KM-023.01 — Derivar sequência de etapas do percurso selecionado.
- [ ] KM-023.02 — Definir eventos explícitos para avançar e voltar.
- [ ] KM-023.03 — Validar pré-condições antes de cada avanço.
- [ ] KM-023.04 — Permitir acesso às etapas concluídas anteriormente.
- [ ] KM-023.05 — Invalidar conclusão quando dados dependentes forem alterados.
- [ ] KM-023.06 — Manter personalização dispensada como decisão explícita.
- [ ] KM-023.07 — Impedir revisão completa por simples mudança de currentStep.
- [ ] KM-023.08 — Tratar recarregamento com etapa salva e dados incompletos.
- [ ] KM-023.09 — Expor motivo para uma etapa estar bloqueada.
- [ ] KM-023.10 — Concluir com testes de todas as transições permitidas.

### KM-024 — Habilitar itens antes da caixa

- [ ] KM-024.01 — Permitir addItem quando percurso iniciar pelos itens.
- [ ] KM-024.02 — Calcular composição sem exigir selectedBox.
- [ ] KM-024.03 — Exibir compatibilidade ainda não avaliada nesse momento.
- [ ] KM-024.04 — Permitir quantidade e variante antes da embalagem.
- [ ] KM-024.05 — Habilitar recomendação após composição mínima válida.
- [ ] KM-024.06 — Preservar produtos ao acessar seleção de caixas.
- [ ] KM-024.07 — Revalidar composição após escolher embalagem recomendada.
- [ ] KM-024.08 — Manter kit sem caixa como rascunho válido.
- [ ] KM-024.09 — Impedir orçamento final quando caixa for obrigatória.
- [ ] KM-024.10 — Concluir com percurso R5 → R2 executável.

### KM-025 — Manter caixa antes dos itens

- [ ] KM-025.01 — Inicializar percurso pela seleção de embalagem.
- [ ] KM-025.02 — Confirmar caixa antes de abrir catálogo compatível.
- [ ] KM-025.03 — Transmitir dimensões internas ao motor de elegibilidade.
- [ ] KM-025.04 — Distinguir produto impossível de produto sem dados suficientes.
- [ ] KM-025.05 — Expor caixa atual no resumo de itens.
- [ ] KM-025.06 — Recalcular elegibilidade quando a quantidade mudar.
- [ ] KM-025.07 — Permitir revisar detalhes da caixa sem resetar dados.
- [ ] KM-025.08 — Conservar seleção ao voltar da personalização.
- [ ] KM-025.09 — Tratar embalagem desativada durante uma sessão.
- [ ] KM-025.10 — Concluir com percurso R3 → itens executável.

### KM-026 — Tratar troca de percurso

- [ ] KM-026.01 — Detectar solicitação de troca com composição existente.
- [ ] KM-026.02 — Explicar efeito da troca sobre etapas concluídas.
- [ ] KM-026.03 — Preservar itens quando a caixa for removida.
- [ ] KM-026.04 — Substituir comportamento destrutivo de clearBox quando inadequado.
- [ ] KM-026.05 — Preservar personalizações ainda válidas após a troca.
- [ ] KM-026.06 — Invalidar apenas cálculos que dependam da embalagem.
- [ ] KM-026.07 — Manter histórico de undo para a operação inteira.
- [ ] KM-026.08 — Atualizar URL e indicador de percurso conjuntamente.
- [ ] KM-026.09 — Testar alternância repetida sem duplicar linhas.
- [ ] KM-026.10 — Concluir com troca reversível e composição preservada.

### KM-027 — Restaurar kits existentes

- [ ] KM-027.01 — Buscar kitId com escopo de acesso validado.
- [ ] KM-027.02 — Implementar carregamento real além de ler o parâmetro.
- [ ] KM-027.03 — Validar snapshots antes de hidratar o editor.
- [ ] KM-027.04 — Migrar formato legado em memória de maneira explícita.
- [ ] KM-027.05 — Resolver produtos removidos sem descartar todo o rascunho.
- [ ] KM-027.06 — Revalidar variantes, estoques e preços atualizados.
- [ ] KM-027.07 — Bloquear autosave enquanto a hidratação não terminar.
- [ ] KM-027.08 — Distinguir kit inexistente de acesso negado.
- [ ] KM-027.09 — Restaurar etapa possível com aviso de pendências.
- [ ] KM-027.10 — Concluir com abrir, recarregar e retomar o mesmo kit.

### KM-028 — Integrar atalhos de entrada

- [ ] KM-028.01 — Tratar productId sem duplicar item em StrictMode.
- [ ] KM-028.02 — Verificar elegibilidade do produto antes de adicionar.
- [ ] KM-028.03 — Escolher percurso apropriado quando entrada trouxer apenas produto.
- [ ] KM-028.04 — Carregar template sem substituir silenciosamente edição ativa.
- [ ] KM-028.05 — Permitir entrada pela biblioteca com contexto preservado.
- [ ] KM-028.06 — Validar identificadores recebidos por query string.
- [ ] KM-028.07 — Limitar URLs de retorno aos destinos internos permitidos.
- [ ] KM-028.08 — Tratar combinação inválida de kitId e productId.
- [ ] KM-028.09 — Documentar precedência entre parâmetros e rascunho salvo.
- [ ] KM-028.10 — Concluir com testes das entradas diretas suportadas.

### KM-029 — Integrar desfazer e refazer

- [ ] KM-029.01 — Capturar alterações sem repetir snapshots equivalentes.
- [ ] KM-029.02 — Incluir percurso, quantidades e personalização nos snapshots.
- [ ] KM-029.03 — Tratar aplicação de IA como uma operação lógica.
- [ ] KM-029.04 — Tratar troca de caixa como uma operação lógica.
- [ ] KM-029.05 — Preservar identificadores das linhas restauradas.
- [ ] KM-029.06 — Recalcular derivados após restaurar cada snapshot.
- [ ] KM-029.07 — Limitar memória do histórico durante sessões longas.
- [ ] KM-029.08 — Definir comportamento de undo após salvamento remoto.
- [ ] KM-029.09 — Evitar desfazer mudanças remotas de outro usuário silenciosamente.
- [ ] KM-029.10 — Concluir com ciclos undo/redo sem perda de configuração.

### KM-030 — Validar o estado transversal

- [ ] KM-030.01 — Testar navegação rápida durante consulta pendente.
- [ ] KM-030.02 — Testar troca de kit enquanto autosave está agendado.
- [ ] KM-030.03 — Testar logout com rascunho ainda não salvo.
- [ ] KM-030.04 — Testar refresh em cada etapa dos dois percursos.
- [ ] KM-030.05 — Testar seleção, remoção e retorno ao mesmo produto.
- [ ] KM-030.06 — Testar personalização desativada com configuração residual.
- [ ] KM-030.07 — Testar mudança de lote invalidando preços anteriores.
- [ ] KM-030.08 — Testar estados impossíveis recebidos do armazenamento.
- [ ] KM-030.09 — Registrar contratos invariantes em testes de estado.
- [ ] KM-030.10 — Concluir com matriz de navegação sem caminhos sem saída.

<a id="area-04"></a>

## 04 — Modelo canônico, catálogo e contratos de dados

Prioridade: P0
Dependências: 001–010; pré-requisito dos serviços e cálculos finais.
Pontos de integração: supabase/migrations; src/lib/kit-builder/types.ts; src/hooks/kit-builder/useKitBuilderQueries.ts; public.custom_kits
Responsabilidade recomendada: Backend + banco.

### KM-031 — Consolidar inventário canônico

- [ ] KM-031.01 — Confirmar projeto doufsxqlfjyuvxuezpln antes de consultas.
- [ ] KM-031.02 — Inventariar tabelas do kit por pg_catalog.
- [ ] KM-031.03 — Inspecionar colunas, defaults e nulabilidade efetiva.
- [ ] KM-031.04 — Inspecionar constraints e índices por objeto.
- [ ] KM-031.05 — Inspecionar RLS, policies e privilégios efetivos.
- [ ] KM-031.06 — Inspecionar triggers de custom_kits e tabelas relacionadas.
- [ ] KM-031.07 — Inventariar funções e respectivas assinaturas completas.
- [ ] KM-031.08 — Relacionar views, extensões e jobs que sustentam kits.
- [ ] KM-031.09 — Comparar migrations por conteúdo e intenção, além do nome.
- [ ] KM-031.10 — Concluir com inventário técnico datado sem inferir uso por contagem.

### KM-032 — Separar kits comerciais de composições

- [ ] KM-032.01 — Identificar product_kit_components como composição de produto comercial.
- [ ] KM-032.02 — Identificar custom_kits como composição personalizada do usuário.
- [ ] KM-032.03 — Distinguir kit_templates de um kit de cliente salvo.
- [ ] KM-032.04 — Preservar regras de componente opcional e substituível.
- [ ] KM-032.05 — Manter componentes não vendáveis individualmente identificados.
- [ ] KM-032.06 — Definir composição de kit original sem duplicar itens.
- [ ] KM-032.07 — Evitar misturar preço do kit fechado com componentes somados.
- [ ] KM-032.08 — Definir carregamento dos dois modelos através de adaptadores.
- [ ] KM-032.09 — Documentar qual modelo cada ação modifica.
- [ ] KM-032.10 — Concluir com contratos de domínio sem entidades duplicadas.

### KM-033 — Normalizar identificadores de catálogo

- [ ] KM-033.01 — Distinguir product_id, variant_id e component_id.
- [ ] KM-033.02 — Introduzir line_id estável no contrato de composição.
- [ ] KM-033.03 — Manter SKU comercial separado do identificador técnico.
- [ ] KM-033.04 — Validar allowed_variant_ids antes de aceitar substituição.
- [ ] KM-033.05 — Preservar identificação de componentes sem produto vinculado.
- [ ] KM-033.06 — Definir chave de preço por variante e fornecedor.
- [ ] KM-033.07 — Definir chave de estoque por variante e disponibilidade.
- [ ] KM-033.08 — Tratar itens homônimos sem agrupar indevidamente.
- [ ] KM-033.09 — Garantir ida e volta dos identificadores no snapshot.
- [ ] KM-033.10 — Concluir com exemplos de produtos iguais e variantes diferentes.

### KM-034 — Normalizar dimensões e procedência

- [ ] KM-034.01 — Escolher unidade interna consistente para cálculos geométricos.
- [ ] KM-034.02 — Converter milímetros para centímetros em fronteira explícita.
- [ ] KM-034.03 — Mapear comprimento, largura e altura sem inversões silenciosas.
- [ ] KM-034.04 — Separar dimensões internas das externas da embalagem.
- [ ] KM-034.05 — Registrar origem e confiança das medidas disponíveis.
- [ ] KM-034.06 — Tratar dados faltantes como desconhecidos, não como zero.
- [ ] KM-034.07 — Rejeitar NaN, infinito e dimensões negativas.
- [ ] KM-034.08 — Impedir capacidade em ml interpretada como altura.
- [ ] KM-034.09 — Revisar fallback histórico de parede fixa antes de reutilizar.
- [ ] KM-034.10 — Concluir com adaptadores e casos de unidades conflitantes.

### KM-035 — Definir contrato de embalagem

- [ ] KM-035.01 — Reutilizar produto ou componente de embalagem já existente.
- [ ] KM-035.02 — Mapear material, acabamento e tipo de fechamento.
- [ ] KM-035.03 — Mapear dimensões internas confirmadas e peso próprio.
- [ ] KM-035.04 — Mapear carga máxima com procedência verificável.
- [ ] KM-035.05 — Representar tampa, berço e espaço indisponível quando conhecidos.
- [ ] KM-035.06 — Definir preço, validade e quantidade mínima da embalagem.
- [ ] KM-035.07 — Mapear imagens e faces adequadas ao preview.
- [ ] KM-035.08 — Identificar personalização permitida na embalagem.
- [ ] KM-035.09 — Especificar campos ausentes sem preencher por adivinhação.
- [ ] KM-035.10 — Concluir com DTO de embalagem e mapeamento campo a campo.

### KM-036 — Definir consultas de catálogo

- [ ] KM-036.01 — Escolher readpath compatível com esquema canônico atual.
- [ ] KM-036.02 — Comparar products e v_products_kit_builder antes de selecionar fonte.
- [ ] KM-036.03 — Evitar usar cost_price como preço de venda.
- [ ] KM-036.04 — Selecionar apenas colunas consumidas pelo módulo.
- [ ] KM-036.05 — Aplicar classificação de embalagem antes da paginação.
- [ ] KM-036.06 — Aplicar filtros, ordenação e paginação no servidor quando necessário.
- [ ] KM-036.07 — Definir total filtrado sem contar apenas a página carregada.
- [ ] KM-036.08 — Incluir organização e filtros relevantes nas chaves de cache.
- [ ] KM-036.09 — Propagar erro e ausência de dados como estados distintos.
- [ ] KM-036.10 — Concluir com consultas verificáveis em catálogo maior que duzentos registros.

### KM-037 — Definir evolução dos snapshots

- [ ] KM-037.01 — Documentar formato atual de box_data e items_data.
- [ ] KM-037.02 — Definir versão explícita para snapshots novos.
- [ ] KM-037.03 — Adicionar line_id sem perder dados legados recuperáveis.
- [ ] KM-037.04 — Persistir percurso, cliente e observações com contrato definido.
- [ ] KM-037.05 — Persistir técnica, área, face, arte e dimensões.
- [ ] KM-037.06 — Separar cotação histórica de preço atualizado do catálogo.
- [ ] KM-037.07 — Definir migração de leitura para registros antigos.
- [ ] KM-037.08 — Manter reversibilidade do consumidor durante rollout gradual.
- [ ] KM-037.09 — Especificar validação de tamanho e profundidade do JSON.
- [ ] KM-037.10 — Concluir com fixtures de todas as versões suportadas.

### KM-038 — Projetar operações transacionais

- [ ] KM-038.01 — Inspecionar RPCs existentes antes de propor novas funções.
- [ ] KM-038.02 — Definir operação atômica de salvar composição completa.
- [ ] KM-038.03 — Definir operação atômica de duplicar kit.
- [ ] KM-038.04 — Definir criação idempotente de orçamento a partir do kit.
- [ ] KM-038.05 — Definir controle de versão para conflitos de edição.
- [ ] KM-038.06 — Recalcular valores autoritativos dentro da fronteira confiável.
- [ ] KM-038.07 — Definir erros de domínio e códigos estáveis.
- [ ] KM-038.08 — Especificar grants por papel e search_path das funções.
- [ ] KM-038.09 — Preparar migrations forward-only individualizadas quando necessárias.
- [ ] KM-038.10 — Concluir com contratos SQL revisáveis antes de qualquer aplicação.

### KM-039 — Definir isolamento e consistência

- [ ] KM-039.01 — Mapear proprietário, organização e colaborador do kit.
- [ ] KM-039.02 — Validar RLS para leitura, criação, edição e remoção.
- [ ] KM-039.03 — Verificar privilégios de views dependentes separadamente das tabelas.
- [ ] KM-039.04 — Impedir alteração arbitrária de user_id e organization_id.
- [ ] KM-039.05 — Validar referências entre kit, variantes e comentários.
- [ ] KM-039.06 — Definir limpeza de recursos associados sem cascatas inesperadas.
- [ ] KM-039.07 — Avaliar índices para consultas reais com planos explicados.
- [ ] KM-039.08 — Auditar funções de autorização quanto a recursão de policies.
- [ ] KM-039.09 — Preservar consumers existentes de tabelas compartilhadas.
- [ ] KM-039.10 — Concluir com matriz de acesso e integridade por operação.

### KM-040 — Preparar validação de banco

- [ ] KM-040.01 — Criar ambiente descartável compatível com PostgreSQL de produção.
- [ ] KM-040.02 — Aplicar apenas migrations necessárias em fixture representativa.
- [ ] KM-040.03 — Testar reaplicação quando o script prometer idempotência.
- [ ] KM-040.04 — Testar leitura de snapshots anteriores às mudanças.
- [ ] KM-040.05 — Testar rollback integral em falha intermediária.
- [ ] KM-040.06 — Testar concorrência com sessões de banco independentes.
- [ ] KM-040.07 — Conferir grants e policies através de pg_catalog.
- [ ] KM-040.08 — Documentar objetos e impactos de cada migration proposta.
- [ ] KM-040.09 — Manter aplicação canônica vinculada à autorização específica do PO.
- [ ] KM-040.10 — Concluir com evidências SQL e plano de rollout concreto.

<a id="area-05"></a>

## 05 — Persistência, recuperação e concorrência

Prioridade: P0
Dependências: 021–040; contratos aprovados antes de alteração canônica.
Pontos de integração: useKitBuilderPageState.ts; useKitAutoSave.ts; useCustomKitPersistence; custom_kits; kit_collaborators
Responsabilidade recomendada: Frontend + backend.

### KM-041 — Conectar o salvamento manual

- [ ] KM-041.01 — Substituir o corpo vazio de handleSaveKit.
- [ ] KM-041.02 — Reutilizar o serviço de persistência existente.
- [ ] KM-041.03 — Distinguir criação de atualização pelo identificador.
- [ ] KM-041.04 — Validar nome e composição conforme estado rascunho.
- [ ] KM-041.05 — Incluir percurso e etapa no contrato versionado.
- [ ] KM-041.06 — Desabilitar envio duplicado durante a solicitação.
- [ ] KM-041.07 — Exibir confirmação somente após retorno persistido.
- [ ] KM-041.08 — Manter alterações locais quando ocorrer erro.
- [ ] KM-041.09 — Retornar identificador utilizável pela biblioteca.
- [ ] KM-041.10 — Concluir com teste criar, editar e reabrir.

### KM-042 — Hidratar antes de salvar automaticamente

- [ ] KM-042.01 — Identificar como o rascunho inicial é carregado.
- [ ] KM-042.02 — Suspender autosave durante a hidratação remota.
- [ ] KM-042.03 — Separar estado vazio legítimo de carregamento.
- [ ] KM-042.04 — Cancelar requisições ao trocar o kit aberto.
- [ ] KM-042.05 — Descartar respostas de um kit anterior.
- [ ] KM-042.06 — Restaurar seleção, quantidades e personalizações existentes.
- [ ] KM-042.07 — Evitar gravar defaults sobre snapshots antigos.
- [ ] KM-042.08 — Liberar autosave após normalização e validação.
- [ ] KM-042.09 — Oferecer recuperação quando snapshot for incompatível.
- [ ] KM-042.10 — Concluir comprovando abertura sem escrita indevida.

### KM-043 — Serializar gravações automáticas

- [ ] KM-043.01 — Revisar debounce atual e gatilhos de alteração.
- [ ] KM-043.02 — Agendar somente alterações persistíveis e relevantes.
- [ ] KM-043.03 — Ordenar solicitações por revisão local crescente.
- [ ] KM-043.04 — Coalescer alterações intermediárias ainda não enviadas.
- [ ] KM-043.05 — Impedir resposta antiga de marcar estado atual salvo.
- [ ] KM-043.06 — Tratar desmontagem sem prometer gravação garantida.
- [ ] KM-043.07 — Distinguir salvando, salvo, pendente e erro.
- [ ] KM-043.08 — Implementar repetição limitada para falhas transitórias.
- [ ] KM-043.09 — Exibir horário real da última confirmação.
- [ ] KM-043.10 — Concluir com teste de respostas fora de ordem.

### KM-044 — Detectar conflitos entre editores

- [ ] KM-044.01 — Definir contrato de revisão esperada por kit.
- [ ] KM-044.02 — Verificar suporte existente antes de propor RPC.
- [ ] KM-044.03 — Planejar comparação atômica no servidor autorizado.
- [ ] KM-044.04 — Distinguir conflito de ausência de permissão.
- [ ] KM-044.05 — Preservar cópia local em caso de conflito.
- [ ] KM-044.06 — Mostrar resumo das diferenças relevantes ao usuário.
- [ ] KM-044.07 — Permitir recarregar mantendo opção de recuperação.
- [ ] KM-044.08 — Não sobrescrever alterações remotas silenciosamente.
- [ ] KM-044.09 — Documentar comportamento para duas abas simultâneas.
- [ ] KM-044.10 — Concluir com simulação de edição concorrente.

### KM-045 — Garantir idempotência das operações

- [ ] KM-045.01 — Definir identidade para criação de um rascunho.
- [ ] KM-045.02 — Propagar chave de operação quando houver suporte.
- [ ] KM-045.03 — Evitar duplicação por duplo clique e retry.
- [ ] KM-045.04 — Separar duplicação intencional de repetição técnica.
- [ ] KM-045.05 — Definir expiração e escopo da chave.
- [ ] KM-045.06 — Validar autorização antes de reutilizar resultados.
- [ ] KM-045.07 — Garantir consistência de resposta e identificador.
- [ ] KM-045.08 — Não usar apenas bloqueio visual como garantia.
- [ ] KM-045.09 — Preparar testes transacionais em ambiente isolado.
- [ ] KM-045.10 — Concluir demonstrando uma gravação por intenção.

### KM-046 — Recuperar alterações após interrupções

- [ ] KM-046.01 — Mapear pontos de perda ao fechar páginas.
- [ ] KM-046.02 — Identificar política atual de armazenamento local.
- [ ] KM-046.03 — Limitar recuperação local ao usuário e kit.
- [ ] KM-046.04 — Não persistir tokens ou URLs sensíveis localmente.
- [ ] KM-046.05 — Oferecer retomada após falha de conectividade.
- [ ] KM-046.06 — Invalidar recuperação após logout ou troca de usuário.
- [ ] KM-046.07 — Comparar revisão local com revisão persistida.
- [ ] KM-046.08 — Pedir escolha diante de versões divergentes.
- [ ] KM-046.09 — Informar limites da recuperação ao usuário.
- [ ] KM-046.10 — Concluir com simulações offline e reconexão.

### KM-047 — Versionar e migrar snapshots antigos

- [ ] KM-047.01 — Catalogar formatos reais em fixtures anonimizadas.
- [ ] KM-047.02 — Definir identificador explícito de versão do snapshot.
- [ ] KM-047.03 — Criar adaptadores determinísticos entre versões suportadas.
- [ ] KM-047.04 — Preservar campos desconhecidos quando seguro e necessário.
- [ ] KM-047.05 — Normalizar IDs, unidades e números sem inventar valores.
- [ ] KM-047.06 — Registrar incompatibilidades recuperáveis por campo.
- [ ] KM-047.07 — Não executar migração destrutiva durante leitura.
- [ ] KM-047.08 — Testar formatos contendo caixa, itens e artes.
- [ ] KM-047.09 — Definir política para versões futuras não suportadas.
- [ ] KM-047.10 — Concluir com corpus de snapshots históricos aprovado.

### KM-048 — Definir ciclo de vida do rascunho

- [ ] KM-048.01 — Mapear estados atuais em custom_kits.status.
- [ ] KM-048.02 — Separar rascunho incompleto de revisão pronta.
- [ ] KM-048.03 — Permitir salvar sem caixa no percurso por itens.
- [ ] KM-048.04 — Bloquear orçamento se faltarem dados obrigatórios.
- [ ] KM-048.05 — Preservar kit após criação bem-sucedida do orçamento.
- [ ] KM-048.06 — Definir retorno da biblioteca ao estado correto.
- [ ] KM-048.07 — Evitar exclusão automática por inatividade.
- [ ] KM-048.08 — Registrar cancelamento sem apagar trabalho salvo.
- [ ] KM-048.09 — Não ampliar enum ou constraint sem aprovação.
- [ ] KM-048.10 — Concluir validando transições legais e ilegais.

### KM-049 — Integrar permissões de colaboração existentes

- [ ] KM-049.01 — Ler policies de proprietário e colaborador.
- [ ] KM-049.02 — Mapear leitura e edição sem alterar políticas.
- [ ] KM-049.03 — Alinhar controles visuais à autorização efetiva.
- [ ] KM-049.04 — Verificar atualização após revogação de permissão.
- [ ] KM-049.05 — Proteger gravações de colaborador somente leitura.
- [ ] KM-049.06 — Tratar exclusão remota durante edição local.
- [ ] KM-049.07 — Evitar vazamento entre organizações ou usuários.
- [ ] KM-049.08 — Preservar comentários existentes ao editar snapshots.
- [ ] KM-049.09 — Não reativar compartilhamento público por token.
- [ ] KM-049.10 — Concluir com matriz de acesso positiva e negativa.

### KM-050 — Validar durabilidade do editor

- [ ] KM-050.01 — Criar fixtures de kits vazios e completos.
- [ ] KM-050.02 — Simular timeout com gravação já confirmada.
- [ ] KM-050.03 — Simular perda de conexão antes do envio.
- [ ] KM-050.04 — Simular navegação durante debounce pendente.
- [ ] KM-050.05 — Simular duas abas salvando a mesma revisão.
- [ ] KM-050.06 — Simular retorno de permissão negada.
- [ ] KM-050.07 — Conferir igualdade semântica ao reabrir rascunho.
- [ ] KM-050.08 — Registrar eventos sem conteúdo comercial sensível.
- [ ] KM-050.09 — Definir critérios de bloqueio para liberação.
- [ ] KM-050.10 — Concluir com suíte de persistência integralmente aprovada.

<a id="area-06"></a>

## 06 — Entrada do Kit Maker e descoberta

Prioridade: P1
Dependências: 011–030 e 041–050; referência R1.
Pontos de integração: KitBuilderPage.tsx; KitBuilderHeader; rotas /montar-kit e /meus-kits; kit_templates
Responsabilidade recomendada: Frontend.

### KM-051 — Construir a página inicial do módulo

- [ ] KM-051.01 — Separar entrada do editor sem duplicar rotas.
- [ ] KM-051.02 — Reproduzir hierarquia e espaçamento de R1.
- [ ] KM-051.03 — Manter sidebar e cabeçalho globais existentes.
- [ ] KM-051.04 — Exibir título Kit Maker e subtítulo aprovado.
- [ ] KM-051.05 — Adicionar ícone usando biblioteca já instalada.
- [ ] KM-051.06 — Posicionar ações de biblioteca e ajuda.
- [ ] KM-051.07 — Adaptar conteúdo ao espaço útil disponível.
- [ ] KM-051.08 — Usar tokens cromáticos atuais do sistema.
- [ ] KM-051.09 — Preservar acesso direto a kits em edição.
- [ ] KM-051.10 — Concluir comparando entrada com referência R1.

### KM-052 — Apresentar o percurso pelos itens

- [ ] KM-052.01 — Criar card Começar pelos itens.
- [ ] KM-052.02 — Exibir identificação de modo recomendado.
- [ ] KM-052.03 — Reproduzir explicação sobre composição e caixa.
- [ ] KM-052.04 — Listar escolha, quantidades, sugestões e compatibilidade.
- [ ] KM-052.05 — Usar CTA com destino do percurso correto.
- [ ] KM-052.06 — Inicializar estado sem embalagem obrigatória.
- [ ] KM-052.07 — Preservar rascunho existente antes de reiniciar.
- [ ] KM-052.08 — Oferecer descrição acessível da ilustração.
- [ ] KM-052.09 — Separar promessa comercial de validação calculada.
- [ ] KM-052.10 — Concluir com navegação funcional pelo primeiro card.

### KM-053 — Apresentar o percurso pela caixa

- [ ] KM-053.01 — Criar card Começar pela caixa.
- [ ] KM-053.02 — Exibir contexto para quem já possui embalagem definida.
- [ ] KM-053.03 — Reproduzir explicação e checklist do percurso.
- [ ] KM-053.04 — Conectar CTA ao catálogo de embalagens.
- [ ] KM-053.05 — Inicializar escolha da caixa antes dos itens.
- [ ] KM-053.06 — Não atribuir embalagem fictícia como default.
- [ ] KM-053.07 — Manter distinção entre embalagem própria e catálogo.
- [ ] KM-053.08 — Não prometer validação de caixa externa não cadastrada.
- [ ] KM-053.09 — Tratar retorno à entrada sem perda silenciosa.
- [ ] KM-053.10 — Concluir com navegação funcional pelo segundo card.

### KM-054 — Organizar ações e textos da entrada

- [ ] KM-054.01 — Conectar Meus kits à biblioteca existente.
- [ ] KM-054.02 — Conectar Ver tutoriais a conteúdo disponível.
- [ ] KM-054.03 — Conectar Como funciona ao guia contextual.
- [ ] KM-054.04 — Reproduzir mensagens institucionais visíveis em R1.
- [ ] KM-054.05 — Revisar ortografia e capitalização em português.
- [ ] KM-054.06 — Distinguir links externos de ações internas.
- [ ] KM-054.07 — Garantir estados de foco e carregamento.
- [ ] KM-054.08 — Não apresentar botões sem destino implementado.
- [ ] KM-054.09 — Validar comportamento com sessão expirada.
- [ ] KM-054.10 — Concluir auditando todos os links da entrada.

### KM-055 — Exibir benefícios com contratos verdadeiros

- [ ] KM-055.01 — Criar bloco Validação inteligente.
- [ ] KM-055.02 — Criar bloco Caixas recomendadas.
- [ ] KM-055.03 — Criar bloco Personalização completa.
- [ ] KM-055.04 — Criar bloco Orçamento em tempo real.
- [ ] KM-055.05 — Associar cada benefício à funcionalidade correspondente.
- [ ] KM-055.06 — Explicitar estimativas quando confirmação técnica faltar.
- [ ] KM-055.07 — Usar ícones e proporções consistentes com R1.
- [ ] KM-055.08 — Evitar alegações de garantia física não comprovada.
- [ ] KM-055.09 — Adaptar quatro cards ao layout móvel.
- [ ] KM-055.10 — Concluir verificando texto e destino dos benefícios.

### KM-056 — Construir a vitrine de kits em destaque

- [ ] KM-056.01 — Reutilizar catálogo de templates quando aplicável.
- [ ] KM-056.02 — Definir critério explícito de destaque.
- [ ] KM-056.03 — Renderizar imagem, título, categoria e quantidade.
- [ ] KM-056.04 — Contar itens a partir da composição válida.
- [ ] KM-056.05 — Separar exemplos editoriais de kits comercializáveis.
- [ ] KM-056.06 — Validar disponibilidade antes de reutilizar exemplo.
- [ ] KM-056.07 — Abrir detalhe ou iniciar composição claramente.
- [ ] KM-056.08 — Tratar ausência de destaques sem dados inventados.
- [ ] KM-056.09 — Adicionar ação Ver todos com destino real.
- [ ] KM-056.10 — Concluir com vitrine alimentada por dados rastreáveis.

### KM-057 — Conectar favoritos da vitrine

- [ ] KM-057.01 — Identificar persistência atual de favoritos por entidade.
- [ ] KM-057.02 — Distinguir favorito de template e favorito de kit.
- [ ] KM-057.03 — Evitar reaproveitar campo de entidade incorreta.
- [ ] KM-057.04 — Atualizar botão com retorno visual acessível.
- [ ] KM-057.05 — Reverter atualização otimista se persistência falhar.
- [ ] KM-057.06 — Manter favorito ao reabrir a página.
- [ ] KM-057.07 — Evitar propagação do clique para abertura do card.
- [ ] KM-057.08 — Tratar usuário sem permissão para favoritar.
- [ ] KM-057.09 — Preservar organização e identidade do favorito.
- [ ] KM-057.10 — Concluir com teste favoritar, recarregar e desfavoritar.

### KM-058 — Preparar composições de imagem da entrada

- [ ] KM-058.01 — Inventariar imagens reutilizáveis no repositório.
- [ ] KM-058.02 — Mapear ilustração para cada percurso de R1.
- [ ] KM-058.03 — Definir recortes sem deformar produtos.
- [ ] KM-058.04 — Registrar lacunas de assets ainda indisponíveis.
- [ ] KM-058.05 — Evitar inserir produtos inexistentes como oferta real.
- [ ] KM-058.06 — Preparar versões responsivas com dimensões declaradas.
- [ ] KM-058.07 — Preservar cores do shell independentemente da fotografia.
- [ ] KM-058.08 — Reproduzir anotações decorativas sem prejudicar leitura.
- [ ] KM-058.09 — Definir fallback visual com conteúdo honesto.
- [ ] KM-058.10 — Concluir com revisão de assets e direitos de uso.

### KM-059 — Conectar o convite de montagem por IA

- [ ] KM-059.01 — Posicionar faixa de ajuda conforme R1.
- [ ] KM-059.02 — Exibir Montar com IA como ação principal.
- [ ] KM-059.03 — Abrir modal sem descartar composição atual.
- [ ] KM-059.04 — Transportar contexto permitido do percurso ativo.
- [ ] KM-059.05 — Conectar Ver como funciona ao guia de IA.
- [ ] KM-059.06 — Explicar caráter sugestivo da geração.
- [ ] KM-059.07 — Mostrar indisponibilidade quando serviço estiver desativado.
- [ ] KM-059.08 — Não simular sucesso com catálogo fictício.
- [ ] KM-059.09 — Garantir fechamento e retorno ao foco original.
- [ ] KM-059.10 — Concluir com abertura e retorno acessíveis do modal.

### KM-060 — Validar a entrada em todos os estados

- [ ] KM-060.01 — Testar sessão autenticada e expirada.
- [ ] KM-060.02 — Testar catálogo carregado e vazio.
- [ ] KM-060.03 — Testar falha de carregamento dos destaques.
- [ ] KM-060.04 — Testar favoritos com persistência rejeitada.
- [ ] KM-060.05 — Testar retomada de kit existente.
- [ ] KM-060.06 — Testar ambos os CTAs com navegação por teclado.
- [ ] KM-060.07 — Testar viewport estreita sem rolagem horizontal.
- [ ] KM-060.08 — Conferir todos os textos visíveis em R1.
- [ ] KM-060.09 — Verificar ausência de mudanças nos tokens globais.
- [ ] KM-060.10 — Concluir com evidências visuais e funcionais da entrada.

<a id="area-07"></a>

## 07 — Catálogo de produtos e seleção de variantes

Prioridade: P1
Dependências: 031–040 e contratos de 091–100; referência R5.
Pontos de integração: useKitBuilderQueries.ts; ItemSelector; KitItem; catálogo canônico de produtos e variantes
Responsabilidade recomendada: Frontend + catálogo.

### KM-061 — Consultar produtos reais para montagem

- [ ] KM-061.01 — Revisar origem e campos da consulta atual.
- [ ] KM-061.02 — Consultar produtos elegíveis no servidor.
- [ ] KM-061.03 — Remover fallback demonstrativo silencioso em produção.
- [ ] KM-061.04 — Separar erro, vazio e dados de demonstração.
- [ ] KM-061.05 — Preservar preço de venda correto no mapeamento.
- [ ] KM-061.06 — Trazer metadados de dimensão e procedência.
- [ ] KM-061.07 — Excluir embalagens do catálogo de itens quando cabível.
- [ ] KM-061.08 — Não perder produtos por filtragem após limite arbitrário.
- [ ] KM-061.09 — Respeitar permissões e organização do usuário.
- [ ] KM-061.10 — Concluir com contrato de consulta e dados reais.

### KM-062 — Implementar busca de itens

- [ ] KM-062.01 — Pesquisar por nome, SKU e categoria.
- [ ] KM-062.02 — Normalizar espaços e acentos conforme contrato.
- [ ] KM-062.03 — Aplicar debounce sem travar digitação.
- [ ] KM-062.04 — Cancelar ou ignorar resultados de consultas antigas.
- [ ] KM-062.05 — Incluir busca na chave de cache.
- [ ] KM-062.06 — Reiniciar paginação quando a busca mudar.
- [ ] KM-062.07 — Preservar seleção já existente no kit.
- [ ] KM-062.08 — Exibir termo aplicado e resultado vazio.
- [ ] KM-062.09 — Não registrar conteúdo sensível da busca em logs.
- [ ] KM-062.10 — Concluir com testes de busca rápida e vazia.

### KM-063 — Conectar categorias e contadores

- [ ] KM-063.01 — Mapear categorias reais às opções da interface.
- [ ] KM-063.02 — Preservar categorias exibidas quando existirem no catálogo.
- [ ] KM-063.03 — Calcular contagem sobre escopo filtrado definido.
- [ ] KM-063.04 — Não hardcodar números presentes em R5.
- [ ] KM-063.05 — Aplicar categoria efetivamente à consulta.
- [ ] KM-063.06 — Distinguir Todos de seleção múltipla autorizada.
- [ ] KM-063.07 — Suportar categorias adicionais sem cortar controles.
- [ ] KM-063.08 — Manter contagem sincronizada com paginação.
- [ ] KM-063.09 — Exibir seleção com texto além da cor.
- [ ] KM-063.10 — Concluir com filtro e contadores consistentes.

### KM-064 — Implementar filtros avançados de itens

- [ ] KM-064.01 — Definir filtros suportados por dados existentes.
- [ ] KM-064.02 — Conectar material, disponibilidade e preço elegíveis.
- [ ] KM-064.03 — Adicionar limites dimensionais quando confiáveis.
- [ ] KM-064.04 — Separar compatibilidade desconhecida de incompatibilidade.
- [ ] KM-064.05 — Preservar filtros ao abrir e fechar painel.
- [ ] KM-064.06 — Oferecer limpar filtros com comportamento explícito.
- [ ] KM-064.07 — Validar intervalos invertidos ou negativos.
- [ ] KM-064.08 — Sincronizar filtros com chave de consulta.
- [ ] KM-064.09 — Não esconder itens selecionados do resumo.
- [ ] KM-064.10 — Concluir com combinação de filtros testada.

### KM-065 — Implementar ordenação e paginação

- [ ] KM-065.01 — Definir relevância com critério determinístico.
- [ ] KM-065.02 — Oferecer ordenação de preço e nome suportada.
- [ ] KM-065.03 — Usar desempate estável por identificador.
- [ ] KM-065.04 — Separar total encontrado de registros carregados.
- [ ] KM-065.05 — Escolher paginação compatível com infraestrutura existente.
- [ ] KM-065.06 — Evitar duplicação entre páginas carregadas.
- [ ] KM-065.07 — Preservar foco ao carregar mais resultados.
- [ ] KM-065.08 — Tratar fim da lista sem pedidos redundantes.
- [ ] KM-065.09 — Medir custo de consulta antes de ampliar limites.
- [ ] KM-065.10 — Concluir com teste de catálogo maior que duzentos.

### KM-066 — Reproduzir os cards de produtos

- [ ] KM-066.01 — Exibir fotografia com proporção de R5.
- [ ] KM-066.02 — Mostrar nome, SKU e especificações prioritárias.
- [ ] KM-066.03 — Exibir preço e unidade comercial inequívocos.
- [ ] KM-066.04 — Mostrar estoque real com data ou estado pertinente.
- [ ] KM-066.05 — Exibir badges somente com justificativa calculada.
- [ ] KM-066.06 — Conectar favorito sem acionar inclusão involuntária.
- [ ] KM-066.07 — Conectar Adicionar com retorno imediato e controlado.
- [ ] KM-066.08 — Manter botões acessíveis em títulos longos.
- [ ] KM-066.09 — Definir placeholders distintos de indisponibilidade.
- [ ] KM-066.10 — Concluir com card preenchido, incompleto e indisponível.

### KM-067 — Selecionar variantes comercializáveis

- [ ] KM-067.01 — Identificar variantes reais de cor e tamanho.
- [ ] KM-067.02 — Exigir seleção quando SKU variante for necessário.
- [ ] KM-067.03 — Mostrar imagem e estoque da variante escolhida.
- [ ] KM-067.04 — Não inferir variante apenas por texto de cor.
- [ ] KM-067.05 — Criar chave de linha que distinga variantes.
- [ ] KM-067.06 — Propagar dimensões específicas quando disponíveis.
- [ ] KM-067.07 — Recalcular preço e compatibilidade após mudança.
- [ ] KM-067.08 — Bloquear variante inativa sem remover histórico.
- [ ] KM-067.09 — Preservar escolha ao voltar entre etapas.
- [ ] KM-067.10 — Concluir com dois SKUs variantes do mesmo produto.

### KM-068 — Integrar favoritos de produtos

- [ ] KM-068.01 — Reutilizar mecanismo existente de favoritos do catálogo.
- [ ] KM-068.02 — Verificar identidade e escopo por usuário.
- [ ] KM-068.03 — Sincronizar favoritos entre listagem e detalhe.
- [ ] KM-068.04 — Tratar rejeição de atualização otimista.
- [ ] KM-068.05 — Expor estado pressionado para tecnologia assistiva.
- [ ] KM-068.06 — Evitar gravações repetidas por clique duplo.
- [ ] KM-068.07 — Manter seleção do kit independente do favorito.
- [ ] KM-068.08 — Tratar entidade removida após favoritação.
- [ ] KM-068.09 — Não criar tabela duplicada sem diagnóstico.
- [ ] KM-068.10 — Concluir com persistência e isolamento dos favoritos.

### KM-069 — Adicionar produtos com feedback consistente

- [ ] KM-069.01 — Validar produto e variante antes de incluir.
- [ ] KM-069.02 — Permitir inclusão sem caixa no percurso por itens.
- [ ] KM-069.03 — Validar restrições da caixa no percurso inverso.
- [ ] KM-069.04 — Incrementar linha existente somente quando semanticamente igual.
- [ ] KM-069.05 — Criar linha distinta para variante ou arte diferente.
- [ ] KM-069.06 — Mostrar motivo de inclusão bloqueada.
- [ ] KM-069.07 — Evitar confete em operações inválidas.
- [ ] KM-069.08 — Anunciar atualização do resumo de forma acessível.
- [ ] KM-069.09 — Preservar operação durante recarregamento do catálogo.
- [ ] KM-069.10 — Concluir com inclusão repetida, inválida e simultânea.

### KM-070 — Validar estados do catálogo de itens

- [ ] KM-070.01 — Simular consulta lenta com seleção já existente.
- [ ] KM-070.02 — Simular catálogo vazio sem recorrer a mocks.
- [ ] KM-070.03 — Simular erro de autenticação e autorização.
- [ ] KM-070.04 — Simular produto desativado entre busca e inclusão.
- [ ] KM-070.05 — Simular preço ausente e estoque desconhecido.
- [ ] KM-070.06 — Simular campos dimensionais incompletos.
- [ ] KM-070.07 — Conferir ausência de resultados fantasmas em filtros.
- [ ] KM-070.08 — Comparar composição visual com R5.
- [ ] KM-070.09 — Garantir retomada após recuperação da consulta.
- [ ] KM-070.10 — Concluir com matriz de estados integralmente aprovada.

<a id="area-08"></a>

## 08 — Composição, quantidades e edição do kit

Prioridade: P1
Dependências: 021–050 e 061–070; R5, compartilhado pelos dois percursos.
Pontos de integração: useKitBuilder.ts; KitItem; KitSummary; controles de composição
Responsabilidade recomendada: Frontend de domínio.

### KM-071 — Montar o painel Seu kit

- [ ] KM-071.01 — Reproduzir hierarquia do painel lateral de R5.
- [ ] KM-071.02 — Mostrar total de linhas e unidades separadamente.
- [ ] KM-071.03 — Exibir composição visual derivada dos itens escolhidos.
- [ ] KM-071.04 — Não usar imagem de kit diferente como confirmação.
- [ ] KM-071.05 — Apresentar subtotal com base no cálculo vigente.
- [ ] KM-071.06 — Mostrar aviso antes de escolher a caixa.
- [ ] KM-071.07 — Manter painel útil com composição vazia.
- [ ] KM-071.08 — Respeitar altura disponível sem ocultar ações.
- [ ] KM-071.09 — Adaptar painel a drawer ou seção no mobile.
- [ ] KM-071.10 — Concluir comparando estados vazio e preenchido com R5.

### KM-072 — Distinguir quantidade do lote e por item

- [ ] KM-072.01 — Definir quantidade de kits como multiplicador do lote.
- [ ] KM-072.02 — Definir quantidade por kit em cada linha.
- [ ] KM-072.03 — Substituir rótulo ambíguo por texto inequívoco.
- [ ] KM-072.04 — Não multiplicar quantidades em dois locais simultaneamente.
- [ ] KM-072.05 — Indicar unidade comercial de cada contador.
- [ ] KM-072.06 — Aplicar limites mínimos e máximos documentados.
- [ ] KM-072.07 — Tratar entrada decimal quando unidade exigir inteiro.
- [ ] KM-072.08 — Mostrar consequência no estoque e no preço.
- [ ] KM-072.09 — Preservar os dois valores no snapshot.
- [ ] KM-072.10 — Concluir com exemplo de cem kits e duas canecas.

### KM-073 — Editar quantidades por linha

- [ ] KM-073.01 — Conectar botões menos, campo e mais.
- [ ] KM-073.02 — Validar inteiros positivos conforme unidade do produto.
- [ ] KM-073.03 — Decidir comportamento de reduzir abaixo do mínimo.
- [ ] KM-073.04 — Não remover linha por acidente ao decrementar.
- [ ] KM-073.05 — Recalcular custo, peso e volume incrementalmente.
- [ ] KM-073.06 — Considerar estoque para quantidade total do lote.
- [ ] KM-073.07 — Impedir estado NaN durante edição do campo.
- [ ] KM-073.08 — Aplicar atualização otimista reversível.
- [ ] KM-073.09 — Anunciar quantidade alterada sem excesso de notificações.
- [ ] KM-073.10 — Concluir com testes de limite e digitação inválida.

### KM-074 — Editar a quantidade de kits

- [ ] KM-074.01 — Localizar controle principal sem duplicar autoridade.
- [ ] KM-074.02 — Aceitar somente lote comercialmente válido.
- [ ] KM-074.03 — Recalcular faixas de preço e personalização.
- [ ] KM-074.04 — Revalidar estoque de produtos e embalagem.
- [ ] KM-074.05 — Atualizar previsão de prazo quando disponível.
- [ ] KM-074.06 — Preservar quantidades individuais por kit.
- [ ] KM-074.07 — Sinalizar preço em recálculo sem falso definitivo.
- [ ] KM-074.08 — Tratar lote superior à capacidade disponível.
- [ ] KM-074.09 — Persistir valor após confirmação válida.
- [ ] KM-074.10 — Concluir com alteração de lote em todas as etapas.

### KM-075 — Remover um item da composição

- [ ] KM-075.01 — Identificar linha por chave estável e variante.
- [ ] KM-075.02 — Exibir ação remover com nome acessível.
- [ ] KM-075.03 — Confirmar quando houver personalização associada relevante.
- [ ] KM-075.04 — Remover arte vinculada apenas do snapshot pretendido.
- [ ] KM-075.05 — Não excluir arquivo compartilhado automaticamente.
- [ ] KM-075.06 — Recalcular recomendações após remoção.
- [ ] KM-075.07 — Manter foco previsível na próxima linha.
- [ ] KM-075.08 — Permitir desfazer dentro do histórico local.
- [ ] KM-075.09 — Persistir estado atualizado sem linha órfã.
- [ ] KM-075.10 — Concluir com remoção de uma entre variantes semelhantes.

### KM-076 — Limpar a composição com proteção

- [ ] KM-076.01 — Definir se limpar remove itens ou também caixa.
- [ ] KM-076.02 — Explicitar escopo no diálogo de confirmação.
- [ ] KM-076.03 — Informar perda de personalizações vinculadas.
- [ ] KM-076.04 — Preservar nome e cliente conforme contrato aprovado.
- [ ] KM-076.05 — Não apagar rascunho remoto silenciosamente.
- [ ] KM-076.06 — Oferecer cancelamento sem alterar estado.
- [ ] KM-076.07 — Registrar operação única no histórico de undo.
- [ ] KM-076.08 — Limpar resultados de compatibilidade obsoletos.
- [ ] KM-076.09 — Retornar ao estado adequado do percurso.
- [ ] KM-076.10 — Concluir com limpar, cancelar, desfazer e reabrir.

### KM-077 — Trocar produtos mantendo intenção

- [ ] KM-077.01 — Abrir seleção de substituto a partir da linha.
- [ ] KM-077.02 — Preservar quantidade quando comercialmente permitida.
- [ ] KM-077.03 — Exigir variante do produto substituto.
- [ ] KM-077.04 — Revalidar dimensões, peso e estoque.
- [ ] KM-077.05 — Invalidar técnica ou área não compatível.
- [ ] KM-077.06 — Oferecer reaplicação de arte apenas quando válida.
- [ ] KM-077.07 — Mostrar diferenças de preço antes da confirmação.
- [ ] KM-077.08 — Não associar personalização pelo índice visual.
- [ ] KM-077.09 — Preservar demais linhas e caixa escolhida.
- [ ] KM-077.10 — Concluir com substituição que altera material e dimensões.

### KM-078 — Ordenar e identificar linhas do kit

- [ ] KM-078.01 — Manter ordem estável durante recálculos.
- [ ] KM-078.02 — Separar identificador de linha do product_id.
- [ ] KM-078.03 — Preservar ordem ao salvar e reabrir.
- [ ] KM-078.04 — Reutilizar mecanismo de ordenação já existente se aplicável.
- [ ] KM-078.05 — Oferecer alternativa por teclado ao arraste opcional.
- [ ] KM-078.06 — Não alterar preço ao mudar ordem visual.
- [ ] KM-078.07 — Evitar troca de artes entre linhas reordenadas.
- [ ] KM-078.08 — Manter agrupamento de variantes compreensível.
- [ ] KM-078.09 — Testar linha duplicada com personalização diferente.
- [ ] KM-078.10 — Concluir com identidade persistida após reordenação.

### KM-079 — Navegar da composição para a embalagem

- [ ] KM-079.01 — Conectar Ver caixas compatíveis ao percurso correto.
- [ ] KM-079.02 — Exigir composição mínima antes de recomendar.
- [ ] KM-079.03 — Informar dimensões desconhecidas sem ocultar o problema.
- [ ] KM-079.04 — Mostrar cálculo em andamento sem concluir prematuramente.
- [ ] KM-079.05 — Transportar quantidades e variantes integralmente.
- [ ] KM-079.06 — Permitir voltar e editar itens sem perda.
- [ ] KM-079.07 — Invalidar recomendação quando composição mudar.
- [ ] KM-079.08 — Não inventar ocupação antes de existir caixa.
- [ ] KM-079.09 — Manter ação acessível no painel responsivo.
- [ ] KM-079.10 — Concluir com ida, edição e retorno à recomendação.

### KM-080 — Validar integridade da composição

- [ ] KM-080.01 — Verificar subtotal em cada operação de edição.
- [ ] KM-080.02 — Verificar peso e volume após multiplicadores.
- [ ] KM-080.03 — Simular clique rápido em adicionar e remover.
- [ ] KM-080.04 — Simular variante removida do catálogo.
- [ ] KM-080.05 — Simular troca de caixa preservando itens.
- [ ] KM-080.06 — Verificar undo de limpar e substituir.
- [ ] KM-080.07 — Verificar autosave após múltiplas alterações.
- [ ] KM-080.08 — Testar composição extensa sem perda de usabilidade.
- [ ] KM-080.09 — Comparar contadores com linhas realmente persistidas.
- [ ] KM-080.10 — Concluir com invariantes da composição documentadas e testadas.

<a id="area-09"></a>

## 09 — Catálogo de embalagens e prévia contextual

Prioridade: P1
Dependências: 031–040 e contratos de 091–100; referência R3.
Pontos de integração: BoxSelector; useKitBuilderQueries.ts; KitBox; metadados canônicos de embalagem
Responsabilidade recomendada: Frontend + catálogo.

### KM-081 — Consultar embalagens elegíveis

- [ ] KM-081.01 — Identificar fonte canônica que marca embalagens.
- [ ] KM-081.02 — Filtrar embalagens antes da paginação no servidor.
- [ ] KM-081.03 — Preservar classificação de embalagem dos componentes.
- [ ] KM-081.04 — Consultar somente registros permitidos ao usuário.
- [ ] KM-081.05 — Trazer SKU, imagens, preços e unidades.
- [ ] KM-081.06 — Distinguir dimensões internas de externas explicitamente.
- [ ] KM-081.07 — Não estimar espessura sem procedência registrada.
- [ ] KM-081.08 — Exibir lacunas de dados no detalhe.
- [ ] KM-081.09 — Não usar MOCK_BOXES quando a consulta falhar.
- [ ] KM-081.10 — Concluir com contrato real de catálogo de embalagens.

### KM-082 — Implementar busca e ordenação de caixas

- [ ] KM-082.01 — Pesquisar por nome, material e código.
- [ ] KM-082.02 — Normalizar busca conforme contrato do catálogo.
- [ ] KM-082.03 — Aplicar debounce e cancelamento de consultas obsoletas.
- [ ] KM-082.04 — Ordenar por relevância com desempate estável.
- [ ] KM-082.05 — Oferecer opções suportadas de preço e nome.
- [ ] KM-082.06 — Reiniciar paginação ao alterar ordenação.
- [ ] KM-082.07 — Manter filtros aplicados durante a pesquisa.
- [ ] KM-082.08 — Exibir total encontrado sem contagem fictícia.
- [ ] KM-082.09 — Preservar prévia da seleção quando possível.
- [ ] KM-082.10 — Concluir com busca combinada com ordenação.

### KM-083 — Filtrar material das embalagens

- [ ] KM-083.01 — Mapear categorias reais de material.
- [ ] KM-083.02 — Evitar duplicar sinônimos sem normalização.
- [ ] KM-083.03 — Exibir contadores de opções realmente disponíveis.
- [ ] KM-083.04 — Distinguir contagem global de contagem filtrada.
- [ ] KM-083.05 — Suportar seleção múltipla conforme UX definida.
- [ ] KM-083.06 — Desabilitar opção sem resultado com explicação.
- [ ] KM-083.07 — Preservar filtros selecionados ao recolher seção.
- [ ] KM-083.08 — Aplicar filtro à consulta e ao cache.
- [ ] KM-083.09 — Não inventar aço inox se não houver cadastro.
- [ ] KM-083.10 — Concluir com filtro material fiel aos dados.

### KM-084 — Filtrar dimensões internas

- [ ] KM-084.01 — Definir largura, altura e profundidade sem ambiguidade.
- [ ] KM-084.02 — Exibir unidade centímetro em todos os campos.
- [ ] KM-084.03 — Aceitar vírgula decimal na entrada localizada.
- [ ] KM-084.04 — Validar mínimo menor ou igual ao máximo.
- [ ] KM-084.05 — Rejeitar valores negativos ou não numéricos.
- [ ] KM-084.06 — Definir tratamento de dimensões desconhecidas.
- [ ] KM-084.07 — Aplicar filtros no eixo correto da embalagem.
- [ ] KM-084.08 — Não confundir tamanho externo com espaço útil.
- [ ] KM-084.09 — Preservar critérios ao alternar catálogo e detalhe.
- [ ] KM-084.10 — Concluir com testes de eixos e limites dimensionais.

### KM-085 — Filtrar preço, acabamento e fechamento

- [ ] KM-085.01 — Definir preço de referência e unidade do filtro.
- [ ] KM-085.02 — Sincronizar campos mínimo e máximo com slider.
- [ ] KM-085.03 — Manter controle de teclado no slider.
- [ ] KM-085.04 — Mapear acabamento a valores cadastrais reais.
- [ ] KM-085.05 — Normalizar ímã e magnético sem duplicação semântica.
- [ ] KM-085.06 — Permitir combinação coerente entre filtros.
- [ ] KM-085.07 — Indicar metadado não informado em vez de inferir.
- [ ] KM-085.08 — Não misturar custo interno com preço de venda.
- [ ] KM-085.09 — Recalcular resultados após limpar os critérios.
- [ ] KM-085.10 — Concluir com filtros combinados e limites monetários.

### KM-086 — Reproduzir cards do catálogo de caixas

- [ ] KM-086.01 — Exibir fotografia, nome e código conforme R3.
- [ ] KM-086.02 — Exibir dimensões com rótulo interno ou externo.
- [ ] KM-086.03 — Mostrar material e preço unitário confiáveis.
- [ ] KM-086.04 — Aplicar badges com regra e procedência documentadas.
- [ ] KM-086.05 — Conectar favorito separado da seleção.
- [ ] KM-086.06 — Destacar caixa selecionada com borda e texto.
- [ ] KM-086.07 — Conectar Selecionar caixa ao estado do editor.
- [ ] KM-086.08 — Tratar descrição e nomes muito extensos.
- [ ] KM-086.09 — Exibir fallback para imagem indisponível.
- [ ] KM-086.10 — Concluir com paridade estrutural dos cards de R3.

### KM-087 — Construir a prévia lateral da caixa

- [ ] KM-087.01 — Abrir detalhe por hover sem depender dele.
- [ ] KM-087.02 — Oferecer acesso equivalente por foco e toque.
- [ ] KM-087.03 — Mostrar imagem ampliada sem carregamento excessivo.
- [ ] KM-087.04 — Exibir código, dimensões, material e acabamento.
- [ ] KM-087.05 — Exibir fechamento e preço quando disponíveis.
- [ ] KM-087.06 — Não substituir seleção apenas por passar o mouse.
- [ ] KM-087.07 — Conectar Usar esta caixa à confirmação real.
- [ ] KM-087.08 — Exibir mensagem honesta sobre validação dos itens.
- [ ] KM-087.09 — Manter prévia legível em tela estreita.
- [ ] KM-087.10 — Concluir testando mouse, teclado e dispositivo de toque.

### KM-088 — Selecionar ou substituir embalagem

- [ ] KM-088.01 — Distinguir primeira seleção de troca da embalagem.
- [ ] KM-088.02 — Preservar composição ao selecionar outra caixa.
- [ ] KM-088.03 — Revalidar cada item e composição integral.
- [ ] KM-088.04 — Apresentar conflitos antes de confirmar troca.
- [ ] KM-088.05 — Invalidar personalização exclusiva da caixa anterior.
- [ ] KM-088.06 — Manter caixa antiga quando seleção for cancelada.
- [ ] KM-088.07 — Recalcular preço, estoque e ocupação.
- [ ] KM-088.08 — Persistir nova embalagem com identidade correta.
- [ ] KM-088.09 — Avançar conforme ordem do percurso ativo.
- [ ] KM-088.10 — Concluir com troca compatível, incompatível e cancelada.

### KM-089 — Organizar filtros e estados responsivos

- [ ] KM-089.01 — Reproduzir sidebar de filtros de R3.
- [ ] KM-089.02 — Permitir recolher grupos sem perder valores.
- [ ] KM-089.03 — Oferecer Limpar filtros com escopo completo.
- [ ] KM-089.04 — Exibir filtros ativos fora do drawer móvel.
- [ ] KM-089.05 — Preservar posição ao retornar do detalhe.
- [ ] KM-089.06 — Separar loading, erro, vazio e sem correspondência.
- [ ] KM-089.07 — Oferecer repetição de consulta sem reset destrutivo.
- [ ] KM-089.08 — Não ocultar botão de seleção em telas menores.
- [ ] KM-089.09 — Garantir leitura independente de cor ou hover.
- [ ] KM-089.10 — Concluir com estados visuais e responsivos revisados.

### KM-090 — Validar o percurso iniciado pela caixa

- [ ] KM-090.01 — Entrar pela opção correta na página inicial.
- [ ] KM-090.02 — Escolher embalagem com dimensões completas.
- [ ] KM-090.03 — Adicionar itens compatíveis e incompatíveis.
- [ ] KM-090.04 — Testar embalagem sem medidas internas confiáveis.
- [ ] KM-090.05 — Voltar ao catálogo preservando seleção.
- [ ] KM-090.06 — Alterar filtros sem alterar kit silenciosamente.
- [ ] KM-090.07 — Testar perda de disponibilidade da caixa.
- [ ] KM-090.08 — Verificar consistência entre card, prévia e resumo.
- [ ] KM-090.09 — Confirmar ausência de preços demonstrativos em produção.
- [ ] KM-090.10 — Concluir com percurso R3 funcional ponta a ponta.

<a id="area-10"></a>

## 10 — Geometria, ocupação e validação física

Prioridade: P0
Dependências: 031–040; contratos consumidos em 061–090 e 101–150.
Pontos de integração: volume-calculator.ts; fn_check_item_fits; KitBox; KitItem; testes de cálculo
Responsabilidade recomendada: Domínio + banco.

### KM-091 — Unificar unidades e dimensões

- [ ] KM-091.01 — Mapear unidades originais de produtos e embalagens.
- [ ] KM-091.02 — Converter milímetros e centímetros com regra única.
- [ ] KM-091.03 — Separar litros de capacidade e dimensão externa.
- [ ] KM-091.04 — Validar medidas positivas e finitas.
- [ ] KM-091.05 — Preservar procedência de cada medida normalizada.
- [ ] KM-091.06 — Marcar estimativas explicitamente no domínio.
- [ ] KM-091.07 — Distinguir dimensões do produto e da embalagem individual.
- [ ] KM-091.08 — Tratar unidades desconhecidas como informação pendente.
- [ ] KM-091.09 — Compartilhar fixtures entre frontend e backend.
- [ ] KM-091.10 — Concluir com tabela de conversão e testes cruzados.

### KM-092 — Calcular volume útil da embalagem

- [ ] KM-092.01 — Usar medidas internas confirmadas como primeira opção.
- [ ] KM-092.02 — Separar volume geométrico de volume útil estimado.
- [ ] KM-092.03 — Identificar origem do fator atual de eficiência.
- [ ] KM-092.04 — Evitar descontar margem técnica duas vezes.
- [ ] KM-092.05 — Explicitar volume indisponível por berço ou divisória.
- [ ] KM-092.06 — Não assumir espessura fixa universal.
- [ ] KM-092.07 — Registrar fórmula e versão do cálculo.
- [ ] KM-092.08 — Tratar volume zero ou desconhecido sem divisão inválida.
- [ ] KM-092.09 — Exibir unidade cúbica de forma localizada.
- [ ] KM-092.10 — Concluir com exemplos auditáveis de volume da caixa.

### KM-093 — Validar encaixe individual por orientação

- [ ] KM-093.01 — Enumerar orientações permitidas do produto.
- [ ] KM-093.02 — Considerar restrições como manter recipiente em pé.
- [ ] KM-093.03 — Comparar dimensões com limites internos corretos.
- [ ] KM-093.04 — Permitir folga técnica configurada e documentada.
- [ ] KM-093.05 — Tratar produto cilíndrico com contrato específico.
- [ ] KM-093.06 — Não aprovar objeto apenas pelo volume total.
- [ ] KM-093.07 — Retornar motivo dimensional legível ao usuário.
- [ ] KM-093.08 — Separar rotação permitida de rotação apenas matemática.
- [ ] KM-093.09 — Comparar comportamento com fn_check_item_fits existente.
- [ ] KM-093.10 — Concluir com item longo que não cabe por eixo.

### KM-094 — Validar composição com múltiplos itens

- [ ] KM-094.01 — Multiplicar dimensões ocupadas pelas quantidades pertinentes.
- [ ] KM-094.02 — Definir método inicial de estimativa de arranjo.
- [ ] KM-094.03 — Declarar limites do algoritmo de empacotamento.
- [ ] KM-094.04 — Considerar incompatibilidade entre arranjos individuais válidos.
- [ ] KM-094.05 — Não chamar heurística volumétrica de garantia física.
- [ ] KM-094.06 — Priorizar algoritmo determinístico e testável.
- [ ] KM-094.07 — Definir limite de complexidade por composição.
- [ ] KM-094.08 — Retornar resultado inconclusivo quando não houver prova.
- [ ] KM-094.09 — Permitir revisão técnica como fluxo explícito.
- [ ] KM-094.10 — Concluir com caso de volume suficiente sem encaixe viável.

### KM-095 — Tratar medidas desconhecidas e imprecisas

- [ ] KM-095.01 — Definir estados compatível, incompatível e inconclusivo.
- [ ] KM-095.02 — Preservar retorno desconhecido da validação canônica.
- [ ] KM-095.03 — Exibir quais itens impedem conclusão.
- [ ] KM-095.04 — Não converter medidas ausentes em zero válido.
- [ ] KM-095.05 — Não converter erro de consulta em aprovação.
- [ ] KM-095.06 — Permitir rascunho com dados ainda incompletos.
- [ ] KM-095.07 — Definir bloqueio ou aprovação técnica para orçamento.
- [ ] KM-095.08 — Registrar procedência da aprovação excepcional quando autorizada.
- [ ] KM-095.09 — Não preencher medidas de produção automaticamente.
- [ ] KM-095.10 — Concluir com casos null, zero e estimativa de fornecedor.

### KM-096 — Validar peso e capacidade estrutural

- [ ] KM-096.01 — Normalizar gramas e quilogramas em uma base.
- [ ] KM-096.02 — Somar peso por item e quantidade individual.
- [ ] KM-096.03 — Adicionar peso da embalagem quando conhecido.
- [ ] KM-096.04 — Distinguir peso por kit de peso do lote.
- [ ] KM-096.05 — Usar limite estrutural documentado da caixa.
- [ ] KM-096.06 — Não assumir capacidade por material sem evidência.
- [ ] KM-096.07 — Tratar ausência de limite como inconclusão apropriada.
- [ ] KM-096.08 — Mostrar excesso de peso com valor e motivo.
- [ ] KM-096.09 — Revalidar após troca de item ou caixa.
- [ ] KM-096.10 — Concluir com caixa volumetricamente válida e peso excedido.

### KM-097 — Modelar folgas, berços e acessórios

- [ ] KM-097.01 — Inventariar metadados atuais de divisórias e berços.
- [ ] KM-097.02 — Distinguir espaço comercial da área realmente utilizável.
- [ ] KM-097.03 — Permitir apenas ajustes sustentados por dados existentes.
- [ ] KM-097.04 — Definir margem de segurança em contrato versionado.
- [ ] KM-097.05 — Considerar itens frágeis e proteção necessária.
- [ ] KM-097.06 — Evitar misturar espessura de papel com folga operacional.
- [ ] KM-097.07 — Planejar evolução de dados sem criar schema prematuro.
- [ ] KM-097.08 — Exibir restrições relevantes nos detalhes da caixa.
- [ ] KM-097.09 — Incluir acessórios cobrados também no cálculo financeiro.
- [ ] KM-097.10 — Concluir com fixture de embalagem com divisória.

### KM-098 — Exibir ocupação sem contradições

- [ ] KM-098.01 — Definir denominador único para percentual apresentado.
- [ ] KM-098.02 — Derivar ocupado, livre e total da mesma base.
- [ ] KM-098.03 — Distinguir volume geométrico de estimativa de ocupação.
- [ ] KM-098.04 — Exibir texto quando percentual não puder ser calculado.
- [ ] KM-098.05 — Não limitar visualmente cem por cento ocultando excesso.
- [ ] KM-098.06 — Usar tokens de estado atuais com legenda textual.
- [ ] KM-098.07 — Evitar arredondamento que indique compatibilidade incorreta.
- [ ] KM-098.08 — Explicar margem técnica em ajuda contextual.
- [ ] KM-098.09 — Sincronizar números entre catálogo, comparação e revisão.
- [ ] KM-098.10 — Concluir com invariantes matemáticos da ocupação.

### KM-099 — Alinhar validação local e canônica

- [ ] KM-099.01 — Inspecionar definição real das funções utilizadas.
- [ ] KM-099.02 — Mapear diferenças entre cálculo TypeScript e SQL.
- [ ] KM-099.03 — Escolher fonte autoritativa para confirmação comercial.
- [ ] KM-099.04 — Reutilizar funções canônicas quando contrato for suficiente.
- [ ] KM-099.05 — Preparar proposta forward-only se houver lacuna comprovada.
- [ ] KM-099.06 — Não aplicar DDL sem aprovação específica do objeto.
- [ ] KM-099.07 — Validar paridade em fixtures idênticas.
- [ ] KM-099.08 — Registrar versão de regra no resultado persistido.
- [ ] KM-099.09 — Revalidar no servidor antes da operação final.
- [ ] KM-099.10 — Concluir com diferenças resolvidas ou explicitamente bloqueadas.

### KM-100 — Testar propriedades físicas e limites

- [ ] KM-100.01 — Criar casos de rotação válida e proibida.
- [ ] KM-100.02 — Criar casos de item maior que cada eixo.
- [ ] KM-100.03 — Criar casos de volume e peso nos limites.
- [ ] KM-100.04 — Criar casos de múltiplas unidades e divisórias.
- [ ] KM-100.05 — Criar casos de precisão decimal e conversão.
- [ ] KM-100.06 — Criar casos de informações desconhecidas.
- [ ] KM-100.07 — Verificar monotonicidade ao aumentar quantidade.
- [ ] KM-100.08 — Verificar determinismo para a mesma composição.
- [ ] KM-100.09 — Definir orçamento de tempo para cálculo interativo.
- [ ] KM-100.10 — Concluir com suíte física e limitações documentadas.

<a id="area-11"></a>

## 11 — Caixas recomendadas e comparação

Prioridade: P1
Dependências: 071–080, 081–100 e contrato financeiro de 131–140; referência R2.
Pontos de integração: BoxSelector; CompatibilityResult; volume-calculator.ts; componentes de recomendações
Responsabilidade recomendada: Frontend + domínio.

### KM-101 — Consultar candidatas compatíveis com a composição

- [ ] KM-101.01 — Transportar todos os itens, variantes e quantidades.
- [ ] KM-101.02 — Buscar embalagens elegíveis além da primeira página.
- [ ] KM-101.03 — Excluir candidatas incompatíveis com restrições obrigatórias.
- [ ] KM-101.04 — Separar candidatas inconclusivas de compatíveis.
- [ ] KM-101.05 — Aplicar filtros sem perder escopo da composição.
- [ ] KM-101.06 — Recalcular quando itens ou quantidades mudarem.
- [ ] KM-101.07 — Cancelar resultados de uma composição anterior.
- [ ] KM-101.08 — Tratar nenhuma candidata sem fallback fictício.
- [ ] KM-101.09 — Expor critérios usados na busca.
- [ ] KM-101.10 — Concluir com composição real e lista rastreável.

### KM-102 — Definir ranking de recomendação

- [ ] KM-102.01 — Definir prioridades entre encaixe, preço e apresentação.
- [ ] KM-102.02 — Separar restrições obrigatórias de preferências comerciais.
- [ ] KM-102.03 — Documentar pesos e critérios de desempate.
- [ ] KM-102.04 — Usar preços da mesma quantidade de referência.
- [ ] KM-102.05 — Penalizar dados desconhecidos sem fingir certeza.
- [ ] KM-102.06 — Evitar recomendar produto indisponível como melhor ajuste.
- [ ] KM-102.07 — Não inferir sustentabilidade apenas pela cor da caixa.
- [ ] KM-102.08 — Versionar regra para permitir auditoria futura.
- [ ] KM-102.09 — Garantir estabilidade para entradas idênticas.
- [ ] KM-102.10 — Concluir com ranking explicável e testes determinísticos.

### KM-103 — Aplicar badges com evidência

- [ ] KM-103.01 — Definir regra para Melhor ajuste.
- [ ] KM-103.02 — Definir comparação que sustenta Econômica.
- [ ] KM-103.03 — Definir evidência cadastral para Sustentável.
- [ ] KM-103.04 — Definir classificação comercial de Premium.
- [ ] KM-103.05 — Separar descritores editoriais de afirmações calculadas.
- [ ] KM-103.06 — Não usar Mais usada sem métrica confiável.
- [ ] KM-103.07 — Exibir alternativa neutra quando faltar comprovação.
- [ ] KM-103.08 — Usar tokens existentes em vez de novas cores globais.
- [ ] KM-103.09 — Permitir entendimento sem depender da cor.
- [ ] KM-103.10 — Concluir com origem documentada de cada badge.

### KM-104 — Reproduzir cards de compatibilidade

- [ ] KM-104.01 — Exibir imagem, SKU e dimensões internas.
- [ ] KM-104.02 — Mostrar material e preço unitário vigente.
- [ ] KM-104.03 — Apresentar ocupação e margem livre calculadas.
- [ ] KM-104.04 — Listar razões específicas de compatibilidade.
- [ ] KM-104.05 — Distinguir estimativa física de validação confirmada.
- [ ] KM-104.06 — Conectar Selecionar ao estado real do kit.
- [ ] KM-104.07 — Conectar Comparar à seleção de comparação.
- [ ] KM-104.08 — Preservar ação de favorito independente.
- [ ] KM-104.09 — Evitar poluição visual em textos longos.
- [ ] KM-104.10 — Concluir comparando cards com R2 e cálculos reais.

### KM-105 — Organizar filtros e modos de visualização

- [ ] KM-105.01 — Mapear chips de R2 às categorias disponíveis.
- [ ] KM-105.02 — Tratar fechamento e material como facetas distintas.
- [ ] KM-105.03 — Conectar ordenação de relevância e preço.
- [ ] KM-105.04 — Alternar grade e lista sem perder seleção.
- [ ] KM-105.05 — Preservar comparação ao mudar visualização.
- [ ] KM-105.06 — Exibir total de candidatas após filtros.
- [ ] KM-105.07 — Oferecer limpeza de filtros sem limpar composição.
- [ ] KM-105.08 — Adaptar lista a viewport estreita.
- [ ] KM-105.09 — Sincronizar estado visual com conteúdo consultado.
- [ ] KM-105.10 — Concluir testando grade, lista e filtros combinados.

### KM-106 — Construir o resumo da composição atual

- [ ] KM-106.01 — Exibir miniaturas das linhas efetivamente selecionadas.
- [ ] KM-106.02 — Mostrar quantidade por kit sem confundir lote.
- [ ] KM-106.03 — Exibir volume estimado com unidade e base.
- [ ] KM-106.04 — Conectar Editar itens ao estado preservado.
- [ ] KM-106.05 — Mostrar recomendação principal e justificativa.
- [ ] KM-106.06 — Listar razões específicas em vez de texto fixo.
- [ ] KM-106.07 — Atualizar resumo após qualquer mudança da composição.
- [ ] KM-106.08 — Tratar imagem ausente de forma consistente.
- [ ] KM-106.09 — Manter CTA Comparar caixas acessível.
- [ ] KM-106.10 — Concluir conferindo resumo contra estado persistido.

### KM-107 — Implementar seleção para comparação

- [ ] KM-107.01 — Definir limite utilizável de caixas simultâneas.
- [ ] KM-107.02 — Adicionar e remover candidatas explicitamente.
- [ ] KM-107.03 — Exibir contador e seleção atual.
- [ ] KM-107.04 — Evitar duplicação do mesmo identificador.
- [ ] KM-107.05 — Manter composição de referência da comparação.
- [ ] KM-107.06 — Invalidar resultados quando essa composição mudar.
- [ ] KM-107.07 — Informar item removido do catálogo durante seleção.
- [ ] KM-107.08 — Suportar teclado e leitor de tela.
- [ ] KM-107.09 — Não alterar caixa escolhida ao apenas comparar.
- [ ] KM-107.10 — Concluir com seleção múltipla estável e acessível.

### KM-108 — Construir a comparação lado a lado

- [ ] KM-108.01 — Comparar preço, material, fechamento e acabamento.
- [ ] KM-108.02 — Comparar dimensões internas na mesma convenção.
- [ ] KM-108.03 — Comparar ocupação, folga e limite de peso.
- [ ] KM-108.04 — Exibir dados ausentes sem equivalência falsa.
- [ ] KM-108.05 — Destacar diferenças úteis sem depender de cor.
- [ ] KM-108.06 — Mostrar razões do ranking no contexto.
- [ ] KM-108.07 — Permitir selecionar caixa diretamente da comparação.
- [ ] KM-108.08 — Manter versão responsiva navegável.
- [ ] KM-108.09 — Preservar seleção anterior ao fechar o comparador.
- [ ] KM-108.10 — Concluir com comparação de candidatas heterogêneas.

### KM-109 — Tratar ausência de caixa adequada

- [ ] KM-109.01 — Exibir Nenhuma caixa atende com linguagem clara.
- [ ] KM-109.02 — Distinguir falta de catálogo de incompatibilidade física.
- [ ] KM-109.03 — Indicar item ou restrição que causa o bloqueio.
- [ ] KM-109.04 — Oferecer edição de quantidade e composição.
- [ ] KM-109.05 — Conectar Falar com o comercial a canal existente.
- [ ] KM-109.06 — Não enviar dados do cliente automaticamente.
- [ ] KM-109.07 — Preparar contexto mínimo para solicitação de ajuda.
- [ ] KM-109.08 — Não prometer produção sob medida sem oferta validada.
- [ ] KM-109.09 — Preservar rascunho e permitir retorno posterior.
- [ ] KM-109.10 — Concluir com cenários sem caixa e dados incompletos.

### KM-110 — Validar recomendações de ponta a ponta

- [ ] KM-110.01 — Testar melhor ajuste e empate de ranking.
- [ ] KM-110.02 — Testar candidata barata mas incompatível.
- [ ] KM-110.03 — Testar caixa sem dimensões internas confiáveis.
- [ ] KM-110.04 — Testar estoque insuficiente para o lote.
- [ ] KM-110.05 — Testar edição de itens durante consulta pendente.
- [ ] KM-110.06 — Testar comparação após mudança de composição.
- [ ] KM-110.07 — Verificar percentuais idênticos nos componentes.
- [ ] KM-110.08 — Conferir textos e ações representados em R2.
- [ ] KM-110.09 — Validar seleção e avanço para personalização.
- [ ] KM-110.10 — Concluir com relatório funcional da recomendação.

<a id="area-12"></a>

## 12 — Configuração da personalização

Prioridade: P1
Dependências: 021–050, 071–100 e contratos 131–140; referência R4.
Pontos de integração: PersonalizationConfig.tsx; KitBuilderPage.tsx; useProductCustomizationOptions; useCustomizationPriceReactive; áreas canônicas
Responsabilidade recomendada: Personalização + backend.

### KM-111 — Conectar a etapa real de personalização

- [ ] KM-111.01 — Adicionar renderização da etapa hoje ausente.
- [ ] KM-111.02 — Reutilizar PersonalizationConfig antes de criar substituto.
- [ ] KM-111.03 — Transportar itens, caixa e configurações salvas.
- [ ] KM-111.04 — Reproduzir organização em três colunas de R4.
- [ ] KM-111.05 — Manter ordem do wizard conforme percurso ativo.
- [ ] KM-111.06 — Definir avanço quando personalização não for desejada.
- [ ] KM-111.07 — Não marcar etapa concluída apenas ao visitar resumo.
- [ ] KM-111.08 — Mostrar restrições e dados indisponíveis explicitamente.
- [ ] KM-111.09 — Preservar configurações ao voltar etapas.
- [ ] KM-111.10 — Concluir com navegação efetiva pela etapa conectada.

### KM-112 — Selecionar item e acompanhar status

- [ ] KM-112.01 — Listar imagem, nome e variante de cada linha.
- [ ] KM-112.02 — Distinguir pendente, em edição e concluído.
- [ ] KM-112.03 — Adicionar estado sem personalização quando aplicável.
- [ ] KM-112.04 — Identificar linha por chave estável, não posição.
- [ ] KM-112.05 — Manter item selecionado após recálculo.
- [ ] KM-112.06 — Mostrar ação de trocar item com validação.
- [ ] KM-112.07 — Evitar perda de alterações ao alternar itens.
- [ ] KM-112.08 — Usar ícones e textos além da cor.
- [ ] KM-112.09 — Sincronizar seleção com resumo lateral.
- [ ] KM-112.10 — Concluir com estados independentes em quatro itens.

### KM-113 — Consultar técnicas elegíveis por produto

- [ ] KM-113.01 — Ler contrato real das opções de personalização.
- [ ] KM-113.02 — Consultar técnicas por produto, componente e variante.
- [ ] KM-113.03 — Relacionar técnica à área de aplicação específica.
- [ ] KM-113.04 — Exibir Laser, Silk, Tampografia e UV quando elegíveis.
- [ ] KM-113.05 — Não oferecer técnica apenas por existir globalmente.
- [ ] KM-113.06 — Mostrar descrição e limitações de cada opção.
- [ ] KM-113.07 — Desabilitar técnica indisponível com justificativa.
- [ ] KM-113.08 — Revalidar após mudança de material ou item.
- [ ] KM-113.09 — Preservar origem canônica da técnica selecionada.
- [ ] KM-113.10 — Concluir com matriz produto, área e técnica.

### KM-114 — Selecionar área e face de aplicação

- [ ] KM-114.01 — Carregar áreas reais disponíveis para o item.
- [ ] KM-114.02 — Exibir nome compreensível e face correspondente.
- [ ] KM-114.03 — Distinguir frente, verso e superfícies adicionais.
- [ ] KM-114.04 — Vincular técnica à área correta pelo identificador.
- [ ] KM-114.05 — Não assumir áreas iguais entre variantes diferentes.
- [ ] KM-114.06 — Mostrar limites úteis da área de gravação.
- [ ] KM-114.07 — Manter seleção válida ao trocar técnica.
- [ ] KM-114.08 — Invalidar configuração quando área for removida.
- [ ] KM-114.09 — Relacionar área à prévia visual do produto.
- [ ] KM-114.10 — Concluir com duas áreas da mesma técnica sem confusão.

### KM-115 — Configurar cores da arte

- [ ] KM-115.01 — Vincular cores configuradas à arte, nunca aos tokens globais.
- [ ] KM-115.02 — Exibir opções padrão sem alterar tema global.
- [ ] KM-115.03 — Permitir cor personalizada quando técnica autorizar.
- [ ] KM-115.04 — Aplicar limite de cores conforme técnica selecionada.
- [ ] KM-115.05 — Tratar laser como efeito material quando pertinente.
- [ ] KM-115.06 — Validar formato de cor e representação acessível.
- [ ] KM-115.07 — Preservar valores reais no snapshot da arte.
- [ ] KM-115.08 — Não recalcular preço por simples mudança de foco.
- [ ] KM-115.09 — Mostrar impacto comercial da quantidade de cores.
- [ ] KM-115.10 — Concluir com técnicas monocromáticas e multicoloridas.

### KM-116 — Validar dimensões da aplicação

- [ ] KM-116.01 — Aceitar largura e altura em centímetros.
- [ ] KM-116.02 — Normalizar vírgula decimal sem truncamento silencioso.
- [ ] KM-116.03 — Exigir dimensões positivas e finitas.
- [ ] KM-116.04 — Comparar arte com limites da área selecionada.
- [ ] KM-116.05 — Preservar proporção quando houver bloqueio ativado.
- [ ] KM-116.06 — Distinguir tamanho da arte de tamanho do produto.
- [ ] KM-116.07 — Considerar orientação e restrições técnicas reais.
- [ ] KM-116.08 — Mostrar erro junto ao campo correspondente.
- [ ] KM-116.09 — Impedir conclusão com aplicação fora da área.
- [ ] KM-116.10 — Concluir com limites exatos e excedidos da gravação.

### KM-117 — Calcular custo da personalização

- [ ] KM-117.01 — Usar preço proveniente do serviço canônico.
- [ ] KM-117.02 — Calcular tiragem pela quantidade de itens no lote.
- [ ] KM-117.03 — Incluir técnica, área, cores e dimensões na consulta.
- [ ] KM-117.04 — Separar custo fixo de custo por unidade.
- [ ] KM-117.05 — Mostrar carregamento durante mudança de parâmetros.
- [ ] KM-117.06 — Cancelar preços referentes à configuração anterior.
- [ ] KM-117.07 — Evitar efeito reativo que cause ciclo de atualização.
- [ ] KM-117.08 — Não tratar falha de preço como custo zero.
- [ ] KM-117.09 — Exibir aviso de estimativa quando preço não for firme.
- [ ] KM-117.10 — Concluir com tiragens distintas por linha do kit.

### KM-118 — Permitir personalização da embalagem

- [ ] KM-118.01 — Verificar elegibilidade real da caixa escolhida.
- [ ] KM-118.02 — Reutilizar áreas e técnicas específicas da embalagem.
- [ ] KM-118.03 — Não copiar área do produto para a caixa.
- [ ] KM-118.04 — Exibir embalagem como alvo distinto no editor.
- [ ] KM-118.05 — Incluir arte e custo da caixa no resumo.
- [ ] KM-118.06 — Revalidar configuração ao substituir a embalagem.
- [ ] KM-118.07 — Manter opção explícita de caixa sem personalização.
- [ ] KM-118.08 — Separar impressão externa e interna quando suportadas.
- [ ] KM-118.09 — Não criar serviços de produção inexistentes.
- [ ] KM-118.10 — Concluir com caixa personalizável e caixa não elegível.

### KM-119 — Confirmar configuração sem falso sucesso

- [ ] KM-119.01 — Distinguir salvar configuração de gerar prévia.
- [ ] KM-119.02 — Validar campos obrigatórios antes de confirmar.
- [ ] KM-119.03 — Persistir referência de técnica, área e versão.
- [ ] KM-119.04 — Marcar concluído somente quando requisitos forem satisfeitos.
- [ ] KM-119.05 — Manter status pendente se geração obrigatória falhar.
- [ ] KM-119.06 — Oferecer correção sem apagar configuração anterior.
- [ ] KM-119.07 — Sincronizar autosave após confirmação válida.
- [ ] KM-119.08 — Invalidar status quando configuração relevante mudar.
- [ ] KM-119.09 — Mostrar mensagem objetiva de sucesso ou erro.
- [ ] KM-119.10 — Concluir com transições reais de conclusão da personalização.

### KM-120 — Validar a matriz completa de personalização

- [ ] KM-120.01 — Testar item sem técnica disponível.
- [ ] KM-120.02 — Testar técnica removida após carregamento.
- [ ] KM-120.03 — Testar mesma técnica em duas áreas distintas.
- [ ] KM-120.04 — Testar variante que muda material e limites.
- [ ] KM-120.05 — Testar arte com excesso de cores.
- [ ] KM-120.06 — Testar preço que depende da tiragem total.
- [ ] KM-120.07 — Testar troca de caixa com arte existente.
- [ ] KM-120.08 — Testar persistência e reabertura de configurações.
- [ ] KM-120.09 — Comparar estrutura, textos e controles com R4.
- [ ] KM-120.10 — Concluir com matriz de personalização aprovada.

<a id="area-13"></a>

## 13 — Artes, geração de prévias e manipulação visual

Prioridade: P1
Dependências: 111–120 e persistência 041–050; referência R4, integrações existentes de arte/mockup.
Pontos de integração: Integrações existentes de storage, mockup e artes salvas; preview do Kit Maker
Responsabilidade recomendada: Artes + integrações.

### KM-121 — Inventariar e integrar a biblioteca de artes

- [ ] KM-121.01 — Identificar serviço existente de artes salvas.
- [ ] KM-121.02 — Mapear proprietário, cliente e permissão de acesso.
- [ ] KM-121.03 — Conectar Ver artes salvas ao seletor real.
- [ ] KM-121.04 — Pesquisar arte por metadados permitidos.
- [ ] KM-121.05 — Exibir thumbnail, nome e informações úteis.
- [ ] KM-121.06 — Não listar arquivos de outros clientes indevidamente.
- [ ] KM-121.07 — Confirmar seleção antes de substituir arte atual.
- [ ] KM-121.08 — Guardar referência estável e versão do arquivo.
- [ ] KM-121.09 — Tratar arte removida depois da seleção.
- [ ] KM-121.10 — Concluir com seleção e retomada de arte autorizada.

### KM-122 — Receber arquivos de arte válidos

- [ ] KM-122.01 — Reutilizar upload existente quando compatível.
- [ ] KM-122.02 — Definir formatos e tamanho conforme pipeline real.
- [ ] KM-122.03 — Validar extensão, MIME e conteúdo no servidor.
- [ ] KM-122.04 — Restringir SVG ativo ou conteúdo executável.
- [ ] KM-122.05 — Exibir progresso e opção de cancelamento.
- [ ] KM-122.06 — Tratar arquivo corrompido sem travar o editor.
- [ ] KM-122.07 — Informar resolução insuficiente quando mensurável.
- [ ] KM-122.08 — Não prometer validação gráfica que não exista.
- [ ] KM-122.09 — Evitar logar arquivo ou URL assinada sensível.
- [ ] KM-122.10 — Concluir com upload válido, inválido e interrompido.

### KM-123 — Persistir arquivos e vínculos com segurança

- [ ] KM-123.01 — Usar bucket e política apropriados já existentes.
- [ ] KM-123.02 — Separar arquivo original e preview derivado.
- [ ] KM-123.03 — Aplicar autorização por usuário e organização.
- [ ] KM-123.04 — Não publicar bucket para facilitar o preview.
- [ ] KM-123.05 — Usar URLs temporárias conforme necessidade existente.
- [ ] KM-123.06 — Renovar acesso sem gravar URL expirada no snapshot.
- [ ] KM-123.07 — Preservar arquivos reutilizados por outros kits.
- [ ] KM-123.08 — Definir limpeza apenas após autorização de exclusão.
- [ ] KM-123.09 — Registrar vínculo da arte à linha correta.
- [ ] KM-123.10 — Concluir com acesso permitido, expirado e negado.

### KM-124 — Posicionar arte sobre a área real

- [ ] KM-124.01 — Definir coordenadas normalizadas da aplicação.
- [ ] KM-124.02 — Separar escala visual de dimensão física.
- [ ] KM-124.03 — Restringir movimentação aos limites permitidos.
- [ ] KM-124.04 — Tratar rotação apenas quando técnica suportar.
- [ ] KM-124.05 — Manter proporção quando configurada.
- [ ] KM-124.06 — Converter posição para o contrato do gerador.
- [ ] KM-124.07 — Evitar deslocamento ao redimensionar a tela.
- [ ] KM-124.08 — Preservar posição por face e por linha.
- [ ] KM-124.09 — Oferecer controles acessíveis sem depender de arraste.
- [ ] KM-124.10 — Concluir com posicionamento consistente em diferentes escalas.

### KM-125 — Construir prévias de frente e verso

- [ ] KM-125.01 — Mapear imagem correta para cada face.
- [ ] KM-125.02 — Desabilitar face sem imagem com explicação.
- [ ] KM-125.03 — Carregar arte configurada sobre a face correspondente.
- [ ] KM-125.04 — Não espelhar imagem como substituto enganoso do verso.
- [ ] KM-125.05 — Exibir legenda de simulação visual quando pertinente.
- [ ] KM-125.06 — Preservar seleção de face ao editar cor.
- [ ] KM-125.07 — Sincronizar área selecionada com vista ativa.
- [ ] KM-125.08 — Tratar produto sem imagem utilizável.
- [ ] KM-125.09 — Evitar carregar originais pesados sem necessidade.
- [ ] KM-125.10 — Concluir com troca frente e verso fiel ao cadastro.

### KM-126 — Implementar zoom e tela cheia

- [ ] KM-126.01 — Definir escala inicial que enquadre o produto.
- [ ] KM-126.02 — Conectar aumentar e reduzir com limites claros.
- [ ] KM-126.03 — Oferecer restaurar enquadramento padrão.
- [ ] KM-126.04 — Garantir pan acessível quando ampliado.
- [ ] KM-126.05 — Abrir tela cheia com fechamento por Escape.
- [ ] KM-126.06 — Restaurar foco no controle de origem.
- [ ] KM-126.07 — Não alterar dimensões físicas ao aplicar zoom.
- [ ] KM-126.08 — Respeitar gestos de toque sem prender navegação.
- [ ] KM-126.09 — Preservar legibilidade dos controles sobre a imagem.
- [ ] KM-126.10 — Concluir com zoom, reset e fullscreen testados.

### KM-127 — Conectar geração real da personalização

- [ ] KM-127.01 — Identificar função existente adequada para geração.
- [ ] KM-127.02 — Enviar produto, variante, área, técnica e arte validados.
- [ ] KM-127.03 — Autorizar invocação no servidor pelo usuário correto.
- [ ] KM-127.04 — Aplicar limite de chamadas e tempo de execução.
- [ ] KM-127.05 — Distinguir solicitação aceita de geração concluída.
- [ ] KM-127.06 — Acompanhar job existente quando operação for assíncrona.
- [ ] KM-127.07 — Tratar repetição sem criar múltiplas cobranças involuntárias.
- [ ] KM-127.08 — Permitir recuperação de resultado após reconexão.
- [ ] KM-127.09 — Não simular geração com sucesso meramente visual.
- [ ] KM-127.10 — Concluir com geração real em ambiente autorizado.

### KM-128 — Controlar resultados obsoletos e falhas

- [ ] KM-128.01 — Vincular resultado à revisão da configuração.
- [ ] KM-128.02 — Descartar preview de arte ou técnica anterior.
- [ ] KM-128.03 — Não sobrescrever edição recente com resposta tardia.
- [ ] KM-128.04 — Exibir erro de geração com opção de repetir.
- [ ] KM-128.05 — Manter última prévia válida claramente identificada.
- [ ] KM-128.06 — Distinguir timeout de erro definitivo do provedor.
- [ ] KM-128.07 — Não inventar progresso percentual sem informação real.
- [ ] KM-128.08 — Garantir cancelamento local sem prometer cancelamento remoto.
- [ ] KM-128.09 — Registrar causa técnica sem expor conteúdo da arte.
- [ ] KM-128.10 — Concluir com respostas concorrentes e fora de ordem.

### KM-129 — Reutilizar artes entre itens com validação

- [ ] KM-129.01 — Oferecer reutilização explícita da arte escolhida.
- [ ] KM-129.02 — Revalidar técnica e área para cada destino.
- [ ] KM-129.03 — Ajustar tamanho somente com confirmação visível.
- [ ] KM-129.04 — Não copiar dimensões incompatíveis automaticamente.
- [ ] KM-129.05 — Manter referências e resultados separados por linha.
- [ ] KM-129.06 — Distinguir arte comum de personalização idêntica.
- [ ] KM-129.07 — Recalcular preço por destino e tiragem.
- [ ] KM-129.08 — Preservar configuração de itens não selecionados.
- [ ] KM-129.09 — Permitir desfazer aplicação em lote.
- [ ] KM-129.10 — Concluir com reutilização entre garrafa, caderno e caixa.

### KM-130 — Validar fidelidade e limites do preview

- [ ] KM-130.01 — Conferir correspondência de item, variante e face.
- [ ] KM-130.02 — Conferir cor configurada e efeito técnico disponível.
- [ ] KM-130.03 — Verificar posição após salvar e reabrir.
- [ ] KM-130.04 — Comparar aparência estrutural com R4.
- [ ] KM-130.05 — Identificar previews ilustrativos sem aprovação industrial.
- [ ] KM-130.06 — Verificar contraste e acessibilidade dos controles.
- [ ] KM-130.07 — Testar falha de imagem e expiração de URL.
- [ ] KM-130.08 — Testar memória com várias artes grandes.
- [ ] KM-130.09 — Documentar diferenças entre preview e produto final.
- [ ] KM-130.10 — Concluir com aceite visual e técnico das prévias.

<a id="area-14"></a>

## 14 — Preços, estoque e frete

Prioridade: P0
Dependências: 031–050; contratos alimentam catálogo, personalização, IA e revisão.
Pontos de integração: price-calculator.ts; useKitBuilderTransformers.ts; useCustomizationPriceReactive; serviços existentes de estoque e frete
Responsabilidade recomendada: Domínio comercial + backend.

### KM-131 — Definir a fonte autoritativa de preço

- [ ] KM-131.01 — Inventariar sale_price, base_price e cost_price disponíveis.
- [ ] KM-131.02 — Separar preço de venda de custo interno.
- [ ] KM-131.03 — Preservar invariantes do tipo Product.
- [ ] KM-131.04 — Identificar tabelas de faixa de preço existentes.
- [ ] KM-131.05 — Não adotar cost_price da view como venda.
- [ ] KM-131.06 — Registrar unidade e condição do preço consultado.
- [ ] KM-131.07 — Distinguir preço ausente de preço zero permitido.
- [ ] KM-131.08 — Definir vigência e moeda da precificação.
- [ ] KM-131.09 — Documentar precedência sem fallback comercial silencioso.
- [ ] KM-131.10 — Concluir com contrato único de preço do Kit Maker.

### KM-132 — Calcular subtotais por linha e kit

- [ ] KM-132.01 — Multiplicar preço unitário pela quantidade por kit.
- [ ] KM-132.02 — Separar itens, caixa e personalização.
- [ ] KM-132.03 — Incluir acessórios cobrados quando fizerem parte da oferta.
- [ ] KM-132.04 — Somar parcelas em representação monetária apropriada.
- [ ] KM-132.05 — Não multiplicar lote antes do subtotal unitário.
- [ ] KM-132.06 — Evitar dupla cobrança da embalagem.
- [ ] KM-132.07 — Tratar itens com múltiplas unidades comerciais.
- [ ] KM-132.08 — Preservar memória de cálculo legível.
- [ ] KM-132.09 — Corrigir discrepâncias numéricas ilustrativas de R5.
- [ ] KM-132.10 — Concluir com subtotais reproduzíveis e testes de fórmula.

### KM-133 — Aplicar precisão e arredondamento monetário

- [ ] KM-133.01 — Identificar utilitário monetário existente no projeto.
- [ ] KM-133.02 — Evitar erro cumulativo de ponto flutuante.
- [ ] KM-133.03 — Definir regra de arredondamento por parcela.
- [ ] KM-133.04 — Alinhar precisão frontend e PostgreSQL.
- [ ] KM-133.05 — Não usar texto formatado como entrada matemática.
- [ ] KM-133.06 — Formatar BRL segundo localidade brasileira.
- [ ] KM-133.07 — Tratar valores altos dentro dos limites definidos.
- [ ] KM-133.08 — Definir comportamento para negativos e não finitos.
- [ ] KM-133.09 — Documentar regra para diferenças de centavos.
- [ ] KM-133.10 — Concluir com casos de precisão e somas extensas.

### KM-134 — Calcular lote e faixas comerciais

- [ ] KM-134.01 — Calcular demanda por SKU a partir do lote.
- [ ] KM-134.02 — Aplicar faixa de preço à tiragem correta.
- [ ] KM-134.03 — Distinguir faixa de produto e de personalização.
- [ ] KM-134.04 — Separar custo fixo de custo variável.
- [ ] KM-134.05 — Mostrar preço por kit e total do lote.
- [ ] KM-134.06 — Recalcular quando quantidade de kits mudar.
- [ ] KM-134.07 — Não aplicar desconto sem política existente.
- [ ] KM-134.08 — Preservar rastreabilidade da faixa selecionada.
- [ ] KM-134.09 — Invalidar valores antigos durante recálculo.
- [ ] KM-134.10 — Concluir com lotes abaixo, no limite e acima da faixa.

### KM-135 — Revalidar preços antes do orçamento

- [ ] KM-135.01 — Capturar revisão e momento da estimativa.
- [ ] KM-135.02 — Consultar preço vigente antes da confirmação final.
- [ ] KM-135.03 — Comparar alteração relevante com valor mostrado.
- [ ] KM-135.04 — Solicitar confirmação se total comercial mudar.
- [ ] KM-135.05 — Preservar composição enquanto usuário revisa diferença.
- [ ] KM-135.06 — Não salvar orçamento com preço desatualizado silenciosamente.
- [ ] KM-135.07 — Executar validações no lado autoritativo.
- [ ] KM-135.08 — Respeitar políticas existentes de desconto e margem.
- [ ] KM-135.09 — Registrar valores efetivamente aprovados no orçamento.
- [ ] KM-135.10 — Concluir com mudança de preço durante a revisão.

### KM-136 — Calcular disponibilidade do lote

- [ ] KM-136.01 — Consultar estoque da variante e fornecedor corretos.
- [ ] KM-136.02 — Multiplicar quantidade individual pelo número de kits.
- [ ] KM-136.03 — Incluir demanda da embalagem no mesmo lote.
- [ ] KM-136.04 — Distinguir disponível, insuficiente e desconhecido.
- [ ] KM-136.05 — Não confundir estoque físico com disponível para venda.
- [ ] KM-136.06 — Reutilizar cálculo canônico de disponibilidade quando aplicável.
- [ ] KM-136.07 — Não usar v_kit_max_quantity fora do seu contrato.
- [ ] KM-136.08 — Mostrar componente limitante de forma compreensível.
- [ ] KM-136.09 — Não reservar estoque apenas por visualizar o editor.
- [ ] KM-136.10 — Concluir com gargalo real por item e por caixa.

### KM-137 — Atualizar estoque sem perder a edição

- [ ] KM-137.01 — Definir atualização por foco ou eventos existentes.
- [ ] KM-137.02 — Evitar assinatura realtime duplicada por componente.
- [ ] KM-137.03 — Invalidar consultas após eventos relevantes.
- [ ] KM-137.04 — Exibir data e condição da informação de estoque.
- [ ] KM-137.05 — Tratar produto indisponível após inclusão no kit.
- [ ] KM-137.06 — Preservar rascunho sem permitir falsa confirmação.
- [ ] KM-137.07 — Revalidar disponibilidade antes de gerar orçamento.
- [ ] KM-137.08 — Respeitar comportamento atual de reserva comercial.
- [ ] KM-137.09 — Liberar assinaturas ao sair do editor.
- [ ] KM-137.10 — Concluir com alteração de estoque durante montagem.

### KM-138 — Conectar cálculo de frete

- [ ] KM-138.01 — Identificar serviço de frete já usado no sistema.
- [ ] KM-138.02 — Solicitar destino mínimo necessário para cotação.
- [ ] KM-138.03 — Usar peso e dimensões logísticas corretos.
- [ ] KM-138.04 — Distinguir embalagem individual de volumes de transporte.
- [ ] KM-138.05 — Considerar quantidade de kits na simulação.
- [ ] KM-138.06 — Não usar volume útil interno como cubagem logística.
- [ ] KM-138.07 — Mostrar frete estimado separado do preço dos itens.
- [ ] KM-138.08 — Indicar validade e transportadora quando disponíveis.
- [ ] KM-138.09 — Tratar serviço indisponível sem frete zero fictício.
- [ ] KM-138.10 — Concluir com cotação autorizada para lote conhecido.

### KM-139 — Definir limites comerciais transparentes

- [ ] KM-139.01 — Verificar pedido mínimo e múltiplos comerciais.
- [ ] KM-139.02 — Exibir prazo real ou estado não informado.
- [ ] KM-139.03 — Separar estimativa de orçamento comercial vinculante.
- [ ] KM-139.04 — Indicar valores não incluídos no total exibido.
- [ ] KM-139.05 — Não criar tributos ou taxas por suposição.
- [ ] KM-139.06 — Aplicar regras existentes de acesso a preço.
- [ ] KM-139.07 — Preservar validação de desconto do projeto.
- [ ] KM-139.08 — Tratar cliente sem condição comercial cadastrada.
- [ ] KM-139.09 — Documentar exceções que exigem decisão do PO.
- [ ] KM-139.10 — Concluir com regras comerciais revisadas e testáveis.

### KM-140 — Validar consistência financeira transversal

- [ ] KM-140.01 — Comparar preço do card com resumo correspondente.
- [ ] KM-140.02 — Comparar composição, personalização e revisão.
- [ ] KM-140.03 — Conferir total por kit multiplicado pelo lote.
- [ ] KM-140.04 — Verificar orçamento criado contra snapshot aprovado.
- [ ] KM-140.05 — Simular alteração de preço entre etapas.
- [ ] KM-140.06 — Simular estoque insuficiente na confirmação.
- [ ] KM-140.07 — Simular frete sem destino ou com erro.
- [ ] KM-140.08 — Validar total da IA incluindo ou discriminando parcelas ausentes.
- [ ] KM-140.09 — Garantir ausência de custos internos expostos indevidamente.
- [ ] KM-140.10 — Concluir com suíte financeira e memória de cálculo.

<a id="area-15"></a>

## 15 — Revisão, identificação e criação do orçamento

Prioridade: P1
Dependências: 041–050, 071–140; referência R7.
Pontos de integração: KitSummary; useKitBuilderQuote.ts; create_quote_transactional; quotes; quote_items; quote_item_personalizations
Responsabilidade recomendada: Orçamento + banco.

### KM-141 — Construir a tela de revisão

- [ ] KM-141.01 — Reproduzir distribuição em duas colunas de R7.
- [ ] KM-141.02 — Exibir etapas concluídas somente com validação real.
- [ ] KM-141.03 — Mostrar ação Voltar para o Kit Maker.
- [ ] KM-141.04 — Preservar estado ao retornar a qualquer etapa.
- [ ] KM-141.05 — Agrupar identificação, composição, validação e observações.
- [ ] KM-141.06 — Agrupar caixa, preços, estoque e frete.
- [ ] KM-141.07 — Manter ações finais visíveis sem sobrepor conteúdo.
- [ ] KM-141.08 — Exibir pendências impeditivas antes da confirmação.
- [ ] KM-141.09 — Usar cores e componentes atuais do sistema.
- [ ] KM-141.10 — Concluir comparando estrutura da revisão com R7.

### KM-142 — Identificar kit e cliente corretamente

- [ ] KM-142.01 — Exigir nome do kit conforme regra comercial.
- [ ] KM-142.02 — Oferecer seleção de cliente do CRM existente.
- [ ] KM-142.03 — Listar somente clientes autorizados ao usuário.
- [ ] KM-142.04 — Preservar client_id além do nome apresentado.
- [ ] KM-142.05 — Definir etiqueta ou objetivo com contrato existente.
- [ ] KM-142.06 — Não salvar Sem cliente como cliente real.
- [ ] KM-142.07 — Permitir rascunho incompleto com aviso correspondente.
- [ ] KM-142.08 — Tratar cliente removido ou inacessível.
- [ ] KM-142.09 — Persistir identificação ao voltar entre etapas.
- [ ] KM-142.10 — Concluir com seleção, alteração e restauração do cliente.

### KM-143 — Renderizar a composição revisável

- [ ] KM-143.01 — Exibir produto, variante, SKU e imagem.
- [ ] KM-143.02 — Mostrar quantidade por kit e preço unitário.
- [ ] KM-143.03 — Calcular total de cada linha corretamente.
- [ ] KM-143.04 — Exibir embalagem e personalização em linhas distinguíveis.
- [ ] KM-143.05 — Não confundir quantidade de aplicações com produtos.
- [ ] KM-143.06 — Conectar menu da linha à edição pertinente.
- [ ] KM-143.07 — Manter identidade em produtos repetidos com variantes.
- [ ] KM-143.08 — Mostrar dados desatualizados com sinalização explícita.
- [ ] KM-143.09 — Adaptar tabela sem ocultar valores essenciais.
- [ ] KM-143.10 — Concluir conferindo tabela contra snapshot do kit.

### KM-144 — Exibir caixa e ocupação finais

- [ ] KM-144.01 — Mostrar caixa efetivamente selecionada e sua imagem.
- [ ] KM-144.02 — Exibir dimensões com base interna identificada.
- [ ] KM-144.03 — Conectar Alterar caixa à edição preservada.
- [ ] KM-144.04 — Usar cálculo único de ocupado, livre e total.
- [ ] KM-144.05 — Apresentar percentual coerente com a base adotada.
- [ ] KM-144.06 — Distinguir ausência de dados de zero ocupação.
- [ ] KM-144.07 — Exibir restrições de peso e encaixe pertinentes.
- [ ] KM-144.08 — Explicar a base dos volumes apresentados em R7.
- [ ] KM-144.09 — Atualizar resumo ao confirmar outra caixa.
- [ ] KM-144.10 — Concluir verificando invariantes físicas na revisão.

### KM-145 — Construir o resumo comercial final

- [ ] KM-145.01 — Alternar Por kit e Total do lote.
- [ ] KM-145.02 — Exibir subtotal dos produtos e embalagem.
- [ ] KM-145.03 — Exibir personalização sem duplicar custo de setup.
- [ ] KM-145.04 — Permitir editar lote com revalidação imediata.
- [ ] KM-145.05 — Mostrar total com atualização de preço sinalizada.
- [ ] KM-145.06 — Conectar detalhamento de estoque à disponibilidade real.
- [ ] KM-145.07 — Conectar Calcular frete ao serviço existente.
- [ ] KM-145.08 — Identificar parcelas incluídas e não incluídas.
- [ ] KM-145.09 — Não mostrar verde conclusivo durante erro ou recálculo.
- [ ] KM-145.10 — Concluir conferindo todos os valores de R7 com cálculos.

### KM-146 — Implementar validações impeditivas e observações

- [ ] KM-146.01 — Separar validação física, financeira e cadastral.
- [ ] KM-146.02 — Marcar disponibilidade desconhecida como pendência.
- [ ] KM-146.03 — Exibir resumo de erros com links de correção.
- [ ] KM-146.04 — Exigir personalização válida quando solicitada.
- [ ] KM-146.05 — Aceitar observações com limite de quinhentos caracteres.
- [ ] KM-146.06 — Preservar quebras de linha sem aceitar conteúdo executável.
- [ ] KM-146.07 — Não usar observações como comando para automações.
- [ ] KM-146.08 — Manter texto ao corrigir outros campos.
- [ ] KM-146.09 — Permitir salvar rascunho mesmo com pendências compatíveis.
- [ ] KM-146.10 — Concluir com validações positivas, negativas e observações persistidas.

### KM-147 — Criar orçamento de forma transacional

- [ ] KM-147.01 — Inspecionar contrato real de create_quote_transactional.
- [ ] KM-147.02 — Comparar cobertura de quote_items e personalizações.
- [ ] KM-147.03 — Substituir gravações fragmentadas por operação atômica suficiente.
- [ ] KM-147.04 — Preservar políticas de desconto e autorização existentes.
- [ ] KM-147.05 — Relacionar personalização à chave correta de linha.
- [ ] KM-147.06 — Incluir caixa e quantidades comerciais sem duplicação.
- [ ] KM-147.07 — Garantir rollback integral se qualquer parte falhar.
- [ ] KM-147.08 — Preparar extensão forward-only apenas se contrato exigir.
- [ ] KM-147.09 — Obter autorização por objeto antes de aplicar no canônico.
- [ ] KM-147.10 — Concluir comprovando ausência de orçamento parcialmente criado.

### KM-148 — Tornar confirmação idempotente e rastreável

- [ ] KM-148.01 — Definir chave da intenção de criar orçamento.
- [ ] KM-148.02 — Vincular intenção ao usuário, kit e revisão.
- [ ] KM-148.03 — Desabilitar confirmação enquanto operação estiver pendente.
- [ ] KM-148.04 — Recuperar resultado de retry após timeout.
- [ ] KM-148.05 — Não emitir dois orçamentos para o mesmo clique.
- [ ] KM-148.06 — Distinguir nova versão comercial de tentativa repetida.
- [ ] KM-148.07 — Mostrar número e identificador somente após commit.
- [ ] KM-148.08 — Registrar revisão do kit que originou o orçamento.
- [ ] KM-148.09 — Respeitar política existente de auditoria comercial.
- [ ] KM-148.10 — Concluir com duplo clique, timeout e repetição testados.

### KM-149 — Conectar sucesso, rascunho e documentos

- [ ] KM-149.01 — Salvar rascunho com confirmação de persistência real.
- [ ] KM-149.02 — Redirecionar orçamento criado para rota existente.
- [ ] KM-149.03 — Permitir retorno ao kit sem perder vínculo.
- [ ] KM-149.04 — Exibir mensagem compatível com resultado efetivo.
- [ ] KM-149.05 — Não anunciar sucesso após falha de personalização.
- [ ] KM-149.06 — Conectar exportação já exposta à infraestrutura existente.
- [ ] KM-149.07 — Não manter onExportPDF vazio como funcionalidade concluída.
- [ ] KM-149.08 — Preservar representação financeira entre tela e documento.
- [ ] KM-149.09 — Tratar falha de exportação sem invalidar orçamento salvo.
- [ ] KM-149.10 — Concluir com abrir orçamento, reabrir kit e documento válido.

### KM-150 — Validar a revisão nos dois percursos

- [ ] KM-150.01 — Executar revisão originada pelo fluxo de itens.
- [ ] KM-150.02 — Executar revisão originada pelo fluxo de caixa.
- [ ] KM-150.03 — Testar cliente inexistente e acesso revogado.
- [ ] KM-150.04 — Testar preço alterado na confirmação.
- [ ] KM-150.05 — Testar caixa incompatível e estoque insuficiente.
- [ ] KM-150.06 — Testar personalização inválida em uma linha.
- [ ] KM-150.07 — Testar falha transacional após iniciar gravação.
- [ ] KM-150.08 — Testar orçamento com variantes repetidas.
- [ ] KM-150.09 — Comparar revisão, persistência e documento gerado.
- [ ] KM-150.10 — Concluir com evidência ponta a ponta de R7.

<a id="area-16"></a>

## 16 — Assistente de montagem com IA

Prioridade: P1
Dependências: 031–050, 061–100 e 131–150; referência R6.
Pontos de integração: KitAIPromptDialog.tsx; kit-ai-builder/index.ts; KitBuilderHeader; contrato de catálogo
Responsabilidade recomendada: IA + backend + frontend.

### KM-151 — Reproduzir o modal de montagem assistida

- [ ] KM-151.01 — Construir layout de duas colunas de R6.
- [ ] KM-151.02 — Exibir título e explicação do objetivo.
- [ ] KM-151.03 — Manter composição atual preservada ao abrir.
- [ ] KM-151.04 — Oferecer fechamento por botão e Escape.
- [ ] KM-151.05 — Restaurar foco ao elemento que abriu o modal.
- [ ] KM-151.06 — Adaptar formulário e resultado para mobile.
- [ ] KM-151.07 — Separar estado inicial de sugestão efetivamente gerada.
- [ ] KM-151.08 — Não apresentar resultado estático como resposta de IA.
- [ ] KM-151.09 — Usar tokens atuais nas superfícies e controles.
- [ ] KM-151.10 — Concluir com modal estruturalmente comparado a R6.

### KM-152 — Validar objetivo e campos do formulário

- [ ] KM-152.01 — Exigir objetivo com limite de quinhentos caracteres.
- [ ] KM-152.02 — Exibir contador derivado do texto real.
- [ ] KM-152.03 — Adicionar público-alvo com opções revisadas.
- [ ] KM-152.04 — Adicionar faixa de preço por kit inequívoca.
- [ ] KM-152.05 — Adicionar estilo sem alterar tema do sistema.
- [ ] KM-152.06 — Adicionar quantidade de kits independente dos itens.
- [ ] KM-152.07 — Normalizar moeda e números antes de enviar.
- [ ] KM-152.08 — Oferecer Limpar campos sem apagar composição do editor.
- [ ] KM-152.09 — Tratar campos inválidos com mensagens específicas.
- [ ] KM-152.10 — Concluir com formulário completo e limites testados.

### KM-153 — Evoluir contrato de sugestões estruturadas

- [ ] KM-153.01 — Documentar retorno atual baseado em palavras-chave.
- [ ] KM-153.02 — Definir retorno com IDs reais de candidatos.
- [ ] KM-153.03 — Representar três sugestões quando houver opções válidas.
- [ ] KM-153.04 — Incluir nome, justificativa, itens e quantidades.
- [ ] KM-153.05 — Separar produtos, embalagem e personalização no orçamento.
- [ ] KM-153.06 — Indicar parcelas ainda não incluídas na estimativa.
- [ ] KM-153.07 — Validar estrutura retornada antes de renderizar.
- [ ] KM-153.08 — Versionar contrato para clientes antigos quando necessário.
- [ ] KM-153.09 — Não considerar narrativa prova de compatibilidade.
- [ ] KM-153.10 — Concluir com schema de resposta e fixtures válidas.

### KM-154 — Fundamentar sugestões no catálogo real

- [ ] KM-154.01 — Buscar candidatos elegíveis com autorização adequada.
- [ ] KM-154.02 — Restringir escolhas a IDs fornecidos pelo backend.
- [ ] KM-154.03 — Usar variantes, medidas e estoque disponíveis.
- [ ] KM-154.04 — Aplicar orçamento à mesma base comercial do formulário.
- [ ] KM-154.05 — Filtrar produtos inativos ou indisponíveis.
- [ ] KM-154.06 — Não confiar em preço inventado pelo modelo.
- [ ] KM-154.07 — Recalcular valores após receber a sugestão.
- [ ] KM-154.08 — Distinguir atributos comprovados de linguagem promocional.
- [ ] KM-154.09 — Evitar alegação sustentável sem cadastro confiável.
- [ ] KM-154.10 — Concluir com sugestão composta apenas por itens verificados.

### KM-155 — Proteger invocação e consumo do serviço

- [ ] KM-155.01 — Verificar sessão e autorização na Edge Function.
- [ ] KM-155.02 — Não confiar apenas em guarda da interface.
- [ ] KM-155.03 — Validar tamanho e tipo de todos os campos.
- [ ] KM-155.04 — Manter credenciais somente no ambiente autorizado.
- [ ] KM-155.05 — Definir limite de tempo e tamanho da resposta.
- [ ] KM-155.06 — Reutilizar quotas e controle de custo existentes.
- [ ] KM-155.07 — Tratar conteúdo do usuário como dados não instruções privilegiadas.
- [ ] KM-155.08 — Não enviar dados desnecessários do CRM ao provedor.
- [ ] KM-155.09 — Registrar falha sem expor prompt ou segredos.
- [ ] KM-155.10 — Concluir com testes de acesso, abuso e payload inválido.

### KM-156 — Gerar sugestões com feedback recuperável

- [ ] KM-156.01 — Exibir estado de geração e impedir envio duplicado.
- [ ] KM-156.02 — Não inventar percentuais de progresso.
- [ ] KM-156.03 — Permitir cancelar espera sem perder formulário.
- [ ] KM-156.04 — Distinguir falta de candidatos de falha do modelo.
- [ ] KM-156.05 — Preservar resultado anterior com indicação de revisão.
- [ ] KM-156.06 — Invalidar resposta de formulário já alterado.
- [ ] KM-156.07 — Aplicar retry limitado conforme erro retornado.
- [ ] KM-156.08 — Informar quando nenhuma opção atender ao orçamento.
- [ ] KM-156.09 — Não forçar três opções duplicadas para preencher layout.
- [ ] KM-156.10 — Concluir com geração lenta, erro e zero candidatos.

### KM-157 — Apresentar sugestões navegáveis

- [ ] KM-157.01 — Exibir posição atual e total real de sugestões.
- [ ] KM-157.02 — Conectar setas anterior e próxima com limites.
- [ ] KM-157.03 — Mostrar nome, justificativa e tag comprovada.
- [ ] KM-157.04 — Exibir imagem ilustrativa corretamente identificada.
- [ ] KM-157.05 — Listar produtos, quantidades e preços recalculados.
- [ ] KM-157.06 — Mostrar custo estimado por kit e parcelas excluídas.
- [ ] KM-157.07 — Preservar coerência aritmética demonstrada no exemplo de R6.
- [ ] KM-157.08 — Preservar formulário ao navegar resultados.
- [ ] KM-157.09 — Anunciar troca de sugestão para leitor de tela.
- [ ] KM-157.10 — Concluir com navegação entre sugestões distintas.

### KM-158 — Validar orçamento e compatibilidade da IA

- [ ] KM-158.01 — Recalcular total usando fonte autoritativa de preço.
- [ ] KM-158.02 — Incluir quantidade de kits no teste de disponibilidade.
- [ ] KM-158.03 — Aplicar mesmas regras físicas do editor manual.
- [ ] KM-158.04 — Não aceitar item sem dimensão como compatível confirmado.
- [ ] KM-158.05 — Comparar total com limite informado pelo usuário.
- [ ] KM-158.06 — Explicar tradeoffs sem mudar limite silenciosamente.
- [ ] KM-158.07 — Separar recomendação parcial de kit pronto.
- [ ] KM-158.08 — Identificar embalagem pendente quando não sugerida.
- [ ] KM-158.09 — Invalidar sugestão após alteração relevante de catálogo.
- [ ] KM-158.10 — Concluir com sugestão barata mas fisicamente impossível rejeitada.

### KM-159 — Aplicar sugestão ao editor de verdade

- [ ] KM-159.01 — Substituir callback onAIApply atualmente vazio.
- [ ] KM-159.02 — Converter sugestão validada para estado versionado.
- [ ] KM-159.03 — Pedir confirmação antes de substituir composição existente.
- [ ] KM-159.04 — Distinguir substituir de adicionar ao kit atual.
- [ ] KM-159.05 — Preservar nome e cliente conforme escolha explícita.
- [ ] KM-159.06 — Gerar linhas com IDs e variantes corretos.
- [ ] KM-159.07 — Invalidar personalizações incompatíveis com novos itens.
- [ ] KM-159.08 — Posicionar usuário na próxima etapa apropriada.
- [ ] KM-159.09 — Persistir somente após aplicação confirmada.
- [ ] KM-159.10 — Concluir com sugestão aplicada e reaberta na biblioteca.

### KM-160 — Validar o assistente ponta a ponta

- [ ] KM-160.01 — Testar objetivo vazio, extenso e malformado.
- [ ] KM-160.02 — Testar resposta fora do contrato estruturado.
- [ ] KM-160.03 — Testar ID de produto inexistente retornado.
- [ ] KM-160.04 — Testar preço e estoque alterados após geração.
- [ ] KM-160.05 — Testar orçamento insuficiente para qualquer opção.
- [ ] KM-160.06 — Testar cancelamento e resposta tardia.
- [ ] KM-160.07 — Testar aplicação sobre kit personalizado existente.
- [ ] KM-160.08 — Verificar ausência de alterações nas cores globais.
- [ ] KM-160.09 — Comparar modal e textos com R6.
- [ ] KM-160.10 — Concluir com suíte funcional e limites da IA documentados.

<a id="area-17"></a>

## 17 — Biblioteca, exemplos e suporte contextual

Prioridade: P1
Dependências: 041–060 e contratos do editor; ações auxiliares visíveis em R1–R7.
Pontos de integração: /meus-kits; MeusKitsPage; KitLibraryPage; useKitTemplates; custom_kits; kit_templates
Responsabilidade recomendada: Frontend + persistência.

### KM-161 — Reconciliar a biblioteca com a rota existente

- [ ] KM-161.01 — Identificar qual página atende /meus-kits atualmente.
- [ ] KM-161.02 — Comparar capacidades de MeusKitsPage e KitLibraryPage.
- [ ] KM-161.03 — Evitar criar biblioteca paralela sem necessidade.
- [ ] KM-161.04 — Conectar Meus kits e Biblioteca à experiência definida.
- [ ] KM-161.05 — Preservar URLs já utilizadas no sistema.
- [ ] KM-161.06 — Separar kits próprios de templates de inspiração.
- [ ] KM-161.07 — Consultar registros conforme permissão efetiva.
- [ ] KM-161.08 — Exibir estados de carregamento e erro reais.
- [ ] KM-161.09 — Preservar funcionalidades existentes fora do novo layout.
- [ ] KM-161.10 — Concluir com uma entrada canônica para a biblioteca.

### KM-162 — Listar e localizar rascunhos

- [ ] KM-162.01 — Exibir nome, imagem, estado e data atualizados.
- [ ] KM-162.02 — Mostrar composição resumida sem preço obsoleto definitivo.
- [ ] KM-162.03 — Implementar busca em campos cadastrais autorizados.
- [ ] KM-162.04 — Oferecer ordenação por atualização e nome.
- [ ] KM-162.05 — Definir paginação consistente com volume esperado.
- [ ] KM-162.06 — Distinguir kit vazio de registro corrompido.
- [ ] KM-162.07 — Indicar propriedade e acesso compartilhado quando existentes.
- [ ] KM-162.08 — Preservar filtros ao abrir e voltar.
- [ ] KM-162.09 — Não mostrar dados de organizações indevidas.
- [ ] KM-162.10 — Concluir com busca e paginação de rascunhos reais.

### KM-163 — Retomar kits e validar disponibilidade

- [ ] KM-163.01 — Abrir kit pelo identificador persistido.
- [ ] KM-163.02 — Hidratar percurso, etapa e composição corretos.
- [ ] KM-163.03 — Restaurar cliente, lote, artes e observações.
- [ ] KM-163.04 — Revalidar catálogo sem sobrescrever histórico silenciosamente.
- [ ] KM-163.05 — Indicar preço ou disponibilidade alterados.
- [ ] KM-163.06 — Oferecer correção de produtos removidos.
- [ ] KM-163.07 — Manter arte histórica referenciada quando autorizada.
- [ ] KM-163.08 — Não salvar automaticamente defaults durante abertura.
- [ ] KM-163.09 — Registrar último uso conforme mecanismo existente.
- [ ] KM-163.10 — Concluir com retomada integral de kit dos dois percursos.

### KM-164 — Duplicar composição com independência

- [ ] KM-164.01 — Reutilizar operação existente se preservar integridade.
- [ ] KM-164.02 — Criar novo identificador de kit e linhas.
- [ ] KM-164.03 — Copiar configuração sem copiar vínculo de orçamento.
- [ ] KM-164.04 — Preservar referências de arte somente com permissão.
- [ ] KM-164.05 — Não copiar colaboradores ou tokens automaticamente.
- [ ] KM-164.06 — Atribuir proprietário e organização corretamente.
- [ ] KM-164.07 — Revalidar produtos, preços e disponibilidade.
- [ ] KM-164.08 — Prevenir duplicação acidental por retry.
- [ ] KM-164.09 — Abrir cópia sem alterar o original.
- [ ] KM-164.10 — Concluir comprovando independência dos dois kits.

### KM-165 — Gerenciar favoritos e organização da biblioteca

- [ ] KM-165.01 — Usar is_favorite e is_pinned quando contrato permitir.
- [ ] KM-165.02 — Separar favoritar kit de favoritar produto.
- [ ] KM-165.03 — Exibir estado persistido ao recarregar.
- [ ] KM-165.04 — Permitir organização sem alterar composição comercial.
- [ ] KM-165.05 — Respeitar permissões para kits compartilhados.
- [ ] KM-165.06 — Não usar exclusão como atalho para arquivamento.
- [ ] KM-165.07 — Verificar estados suportados antes de expor arquivar.
- [ ] KM-165.08 — Proteger operações destrutivas com confirmação explícita.
- [ ] KM-165.09 — Preservar filtros quando a lista mudar.
- [ ] KM-165.10 — Concluir com organização persistente e não destrutiva.

### KM-166 — Aplicar templates e kits em destaque

- [ ] KM-166.01 — Carregar template real com snapshot versionado.
- [ ] KM-166.02 — Exibir conteúdo antes de substituir composição.
- [ ] KM-166.03 — Criar instância independente do template original.
- [ ] KM-166.04 — Revalidar variantes e preços no catálogo atual.
- [ ] KM-166.05 — Distinguir template indisponível de composição vazia.
- [ ] KM-166.06 — Incrementar uso somente na ação definida.
- [ ] KM-166.07 — Evitar incrementos duplicados em renderização ou retry.
- [ ] KM-166.08 — Não alterar template global por edição de instância.
- [ ] KM-166.09 — Preservar caminho de volta à vitrine.
- [ ] KM-166.10 — Concluir com aplicar template e editar sem afetar origem.

### KM-167 — Criar o guia dos dois percursos

- [ ] KM-167.01 — Explicar quando começar pelos itens.
- [ ] KM-167.02 — Explicar quando começar pela caixa.
- [ ] KM-167.03 — Descrever estimativa versus confirmação de compatibilidade.
- [ ] KM-167.04 — Explicar quantidades por item e número de kits.
- [ ] KM-167.05 — Explicar diferenças entre rascunho e orçamento.
- [ ] KM-167.06 — Usar exemplos consistentes com cálculos reais.
- [ ] KM-167.07 — Conectar Guia do Kit Maker nas telas correspondentes.
- [ ] KM-167.08 — Oferecer navegação sem abandonar composição atual.
- [ ] KM-167.09 — Manter conteúdo versionado junto da funcionalidade.
- [ ] KM-167.10 — Concluir com guia cobrindo ambos os percursos.

### KM-168 — Criar ajuda de personalização e IA

- [ ] KM-168.01 — Explicar técnicas disponíveis sem prometer disponibilidade universal.
- [ ] KM-168.02 — Explicar dimensões, área e cores da arte.
- [ ] KM-168.03 — Explicar limites do preview e aprovação técnica.
- [ ] KM-168.04 — Explicar como escolher ou carregar arte.
- [ ] KM-168.05 — Explicar objetivo, orçamento e público da IA.
- [ ] KM-168.06 — Indicar limitações e necessidade de conferir sugestões.
- [ ] KM-168.07 — Conectar tutoriais a conteúdo realmente publicado.
- [ ] KM-168.08 — Oferecer alternativa textual a vídeo existente.
- [ ] KM-168.09 — Não criar links decorativos ou destinos vazios.
- [ ] KM-168.10 — Concluir com ajuda vinculada a R4 e R6.

### KM-169 — Conectar atendimento comercial contextual

- [ ] KM-169.01 — Usar canal comercial já aprovado pelo projeto.
- [ ] KM-169.02 — Distinguir pedido de ajuda de criação de orçamento.
- [ ] KM-169.03 — Pré-preencher contexto somente quando autorizado.
- [ ] KM-169.04 — Não transmitir dados do cliente sem ação explícita.
- [ ] KM-169.05 — Informar ausência de caixa ou restrição detectada.
- [ ] KM-169.06 — Preservar composição para retomada posterior.
- [ ] KM-169.07 — Tratar canal indisponível com alternativa real.
- [ ] KM-169.08 — Não prometer contato automático sem integração implementada.
- [ ] KM-169.09 — Registrar interação apenas no escopo consentido.
- [ ] KM-169.10 — Concluir com CTA comercial funcional e sem envio oculto.

### KM-170 — Validar ações auxiliares e regressões da biblioteca

- [ ] KM-170.01 — Testar todos os links Meus kits e Biblioteca.
- [ ] KM-170.02 — Testar favorito, retomada e duplicação.
- [ ] KM-170.03 — Testar template com produto removido.
- [ ] KM-170.04 — Testar kit sem acesso após revogação.
- [ ] KM-170.05 — Testar guia sem conexão a conteúdo externo.
- [ ] KM-170.06 — Testar retorno ao editor após ajuda.
- [ ] KM-170.07 — Verificar ausência de reativação de rotas públicas antigas.
- [ ] KM-170.08 — Verificar preservação de comentários e colaboração existentes.
- [ ] KM-170.09 — Comparar comportamento com contratos anteriores preservados.
- [ ] KM-170.10 — Concluir com biblioteca e suporte sem ações vazias.

<a id="area-18"></a>

## 18 — Responsividade, acessibilidade, textos e efeitos

Prioridade: P1
Dependências: Componentes de 011–170; aplicação transversal, aceite sobre R1–R7.
Pontos de integração: Design system atual; componentes do Kit Maker; CSS local; testes visuais existentes
Responsabilidade recomendada: Frontend + acessibilidade.

### KM-171 — Validar diagramação desktop das sete telas

- [ ] KM-171.01 — Definir viewports de referência a partir dos anexos.
- [ ] KM-171.02 — Medir largura útil excluindo navegação global.
- [ ] KM-171.03 — Comparar hierarquia de cabeçalhos e ações.
- [ ] KM-171.04 — Comparar grades e proporções dos painéis.
- [ ] KM-171.05 — Preservar densidade sem esmagar textos e controles.
- [ ] KM-171.06 — Conferir alinhamentos, margens e ritmo vertical.
- [ ] KM-171.07 — Usar recortes de imagem coerentes com referência.
- [ ] KM-171.08 — Documentar diferenças justificadas por conteúdo real.
- [ ] KM-171.09 — Não alterar paleta para obter falsa semelhança.
- [ ] KM-171.10 — Concluir com comparativo visual de R1 a R7.

### KM-172 — Adaptar experiência para tablets

- [ ] KM-172.01 — Definir breakpoints com base no conteúdo real.
- [ ] KM-172.02 — Reduzir colunas do catálogo sem perder informações.
- [ ] KM-172.03 — Reposicionar resumo sem duplicar estado do editor.
- [ ] KM-172.04 — Converter filtros laterais quando espaço for insuficiente.
- [ ] KM-172.05 — Manter wizard identificável com rótulos legíveis.
- [ ] KM-172.06 — Evitar ações dependentes de hover.
- [ ] KM-172.07 — Preservar tamanho de alvos de toque.
- [ ] KM-172.08 — Testar orientação retrato e paisagem.
- [ ] KM-172.09 — Não ocultar ações finais abaixo de overlays.
- [ ] KM-172.10 — Concluir com percursos completos em viewport intermediária.

### KM-173 — Adaptar experiência para dispositivos móveis

- [ ] KM-173.01 — Empilhar cartões da entrada com CTAs visíveis.
- [ ] KM-173.02 — Transformar painéis laterais em seções ou drawers.
- [ ] KM-173.03 — Preservar acesso à composição durante seleção.
- [ ] KM-173.04 — Disponibilizar filtros e resumo sem conflito de foco.
- [ ] KM-173.05 — Adaptar comparação de caixas para leitura sequencial.
- [ ] KM-173.06 — Manter preço e quantidade compreensíveis nas linhas.
- [ ] KM-173.07 — Adaptar modal de IA e preview de arte.
- [ ] KM-173.08 — Evitar rolagem horizontal não intencional.
- [ ] KM-173.09 — Considerar teclado virtual e áreas seguras.
- [ ] KM-173.10 — Concluir com ambos os percursos em tela estreita.

### KM-174 — Garantir navegação integral por teclado

- [ ] KM-174.01 — Definir ordem de tabulação de cada tela.
- [ ] KM-174.02 — Manter indicadores de foco usando tokens atuais.
- [ ] KM-174.03 — Permitir seleção de cards sem mouse.
- [ ] KM-174.04 — Oferecer alternativa ao arraste e hover.
- [ ] KM-174.05 — Implementar Escape em modais e painéis.
- [ ] KM-174.06 — Devolver foco ao acionador após fechamento.
- [ ] KM-174.07 — Evitar armadilhas de foco em zoom e preview.
- [ ] KM-174.08 — Manter foco ao remover ou adicionar itens.
- [ ] KM-174.09 — Testar ações do wizard por teclado.
- [ ] KM-174.10 — Concluir sem etapa dependente exclusivamente de mouse.

### KM-175 — Garantir semântica e leitor de tela

- [ ] KM-175.01 — Usar headings em hierarquia consistente.
- [ ] KM-175.02 — Associar rótulos a todos os campos.
- [ ] KM-175.03 — Nomear ícones de favorito, remover e ampliar.
- [ ] KM-175.04 — Expor estado selecionado e expandido corretamente.
- [ ] KM-175.05 — Anunciar salvamento e erros com prioridade adequada.
- [ ] KM-175.06 — Evitar anúncios repetidos durante recálculos.
- [ ] KM-175.07 — Descrever status sem depender somente de cor.
- [ ] KM-175.08 — Estruturar tabelas de revisão com cabeçalhos válidos.
- [ ] KM-175.09 — Fornecer texto alternativo útil às imagens funcionais.
- [ ] KM-175.10 — Concluir com leitura assistiva dos percursos principais.

### KM-176 — Revisar formulários e mensagens de erro

- [ ] KM-176.01 — Padronizar obrigatoriedade e dicas de preenchimento.
- [ ] KM-176.02 — Manter mensagem próxima do campo inválido.
- [ ] KM-176.03 — Apresentar resumo de erros na confirmação final.
- [ ] KM-176.04 — Não limpar campos válidos após falha.
- [ ] KM-176.05 — Aceitar formatos brasileiros de número e moeda.
- [ ] KM-176.06 — Distinguir aviso, impedimento e erro técnico.
- [ ] KM-176.07 — Não expor stack trace ou resposta interna.
- [ ] KM-176.08 — Informar como resolver cada pendência conhecida.
- [ ] KM-176.09 — Preservar contexto em mensagens de sessão expirada.
- [ ] KM-176.10 — Concluir com catálogo de erros e recuperação testada.

### KM-177 — Reproduzir efeitos sem comprometer operação

- [ ] KM-177.01 — Mapear hover, seleção, elevação e transições visíveis.
- [ ] KM-177.02 — Usar durações e tokens de movimento existentes.
- [ ] KM-177.03 — Implementar skeleton sem mudança brusca de layout.
- [ ] KM-177.04 — Respeitar preferência de movimento reduzido.
- [ ] KM-177.05 — Evitar animação contínua sem função informativa.
- [ ] KM-177.06 — Usar sucesso visual somente após operação confirmada.
- [ ] KM-177.07 — Revisar confete para preservar paleta atual.
- [ ] KM-177.08 — Impedir efeitos de bloquear cliques ou leitura.
- [ ] KM-177.09 — Testar foco e seleção com animação desativada.
- [ ] KM-177.10 — Concluir com inventário de efeitos acessíveis aprovado.

### KM-178 — Padronizar textos e microcopy

- [ ] KM-178.01 — Catalogar textos funcionais presentes nos sete anexos.
- [ ] KM-178.02 — Reproduzir textos compatíveis com a operação real.
- [ ] KM-178.03 — Corrigir ortografia sem alterar intenção de negócio.
- [ ] KM-178.04 — Uniformizar caixa, item, kit, lote e personalização.
- [ ] KM-178.05 — Evitar promessas superiores às capacidades implementadas.
- [ ] KM-178.06 — Substituir números fictícios por valores derivados.
- [ ] KM-178.07 — Padronizar singular, plural e contadores.
- [ ] KM-178.08 — Definir textos para vazio, loading e erro.
- [ ] KM-178.09 — Registrar divergências deliberadas com justificativa.
- [ ] KM-178.10 — Concluir com inventário textual rastreado a R1–R7.

### KM-179 — Preservar identidade e isolamento visual

- [ ] KM-179.01 — Capturar valores atuais dos tokens de cor.
- [ ] KM-179.02 — Não modificar tema global nem paleta da aplicação.
- [ ] KM-179.03 — Restringir estilos novos ao módulo e componentes necessários.
- [ ] KM-179.04 — Distinguir cores de arte de cores da interface.
- [ ] KM-179.05 — Verificar contraste usando combinações existentes adequadas.
- [ ] KM-179.06 — Sinalizar necessidade de exceção sem executá-la silenciosamente.
- [ ] KM-179.07 — Não introduzir fontes externas sem necessidade comprovada.
- [ ] KM-179.08 — Comparar módulos vizinhos após alteração visual.
- [ ] KM-179.09 — Evitar seletores globais que atinjam Magazine ou catálogo.
- [ ] KM-179.10 — Concluir com diff de tema e regressão visual sem alteração cromática.

### KM-180 — Validar desempenho percebido da interface

- [ ] KM-180.01 — Medir carga inicial e principais interações.
- [ ] KM-180.02 — Definir orçamento a partir do baseline existente.
- [ ] KM-180.03 — Carregar imagens no tamanho realmente exibido.
- [ ] KM-180.04 — Aplicar lazy loading fora da área inicial.
- [ ] KM-180.05 — Evitar recalcular geometria em renderizações irrelevantes.
- [ ] KM-180.06 — Controlar quantidade de assinaturas e requisições.
- [ ] KM-180.07 — Avaliar virtualização somente se volume justificar.
- [ ] KM-180.08 — Testar interação durante rede e CPU degradadas.
- [ ] KM-180.09 — Verificar estabilidade visual com imagens atrasadas.
- [ ] KM-180.10 — Concluir com métricas comparáveis e sem regressão relevante.

<a id="area-19"></a>

## 19 — Testes integrados, segurança e regressão

Prioridade: P0
Dependências: Contratos 021–050, 091–100 e 131–140; validar telas conforme implementação.
Pontos de integração: tests/hooks; tests/lib; tests/components/kit-builder; tests/pages/kit-builder; testes SQL e E2E existentes
Responsabilidade recomendada: QA + revisão técnica.

### KM-181 — Consolidar estratégia e inventário de testes

- [ ] KM-181.01 — Mapear testes existentes por funcionalidade do módulo.
- [ ] KM-181.02 — Separar testes unitários, integração, visuais e live.
- [ ] KM-181.03 — Identificar mocks que escondem falhas de persistência.
- [ ] KM-181.04 — Vincular cada requisito a pelo menos uma evidência.
- [ ] KM-181.05 — Definir fixtures determinísticas sem dados de clientes.
- [ ] KM-181.06 — Inspecionar configurações antes de escolher projetos E2E.
- [ ] KM-181.07 — Não inventar nome de projeto Playwright.
- [ ] KM-181.08 — Separar execução local de testes com efeitos externos.
- [ ] KM-181.09 — Definir critérios para falha, bloqueio e não aplicabilidade.
- [ ] KM-181.10 — Concluir com matriz requisito, teste e ambiente.

### KM-182 — Testar o domínio com cenários e propriedades

- [ ] KM-182.01 — Expandir testes atuais de volume e preço.
- [ ] KM-182.02 — Testar invariantes de quantidade e identidade da linha.
- [ ] KM-182.03 — Cobrir rotação, peso, desconhecido e limites físicos.
- [ ] KM-182.04 — Cobrir precisão monetária e faixas de tiragem.
- [ ] KM-182.05 — Testar transições legais dos dois percursos.
- [ ] KM-182.06 — Verificar desfazer após operações compostas.
- [ ] KM-182.07 — Testar snapshots históricos e versões futuras.
- [ ] KM-182.08 — Usar geradores determinísticos quando já disponíveis.
- [ ] KM-182.09 — Registrar sementes para reproduzir falhas.
- [ ] KM-182.10 — Concluir com suíte de domínio sem falso verde.

### KM-183 — Testar serviços e contratos canônicos

- [ ] KM-183.01 — Comparar consultas com colunas realmente disponíveis.
- [ ] KM-183.02 — Validar mapeamento de variantes, preços e dimensões.
- [ ] KM-183.03 — Verificar erro de consulta sem fallback demonstrativo.
- [ ] KM-183.04 — Testar persistência e retorno de identificadores.
- [ ] KM-183.05 — Testar contrato estruturado da geração de IA.
- [ ] KM-183.06 — Testar relação de artes com linhas distintas.
- [ ] KM-183.07 — Validar timeout, cancelamento e resposta desatualizada.
- [ ] KM-183.08 — Separar testes simulados de contrato live.
- [ ] KM-183.09 — Não usar PostgREST como inventário completo de schema.
- [ ] KM-183.10 — Concluir com contratos verificáveis e falhas reproduzíveis.

### KM-184 — Testar transações e isolamento no banco

- [ ] KM-184.01 — Preparar ambiente isolado com objetos necessários.
- [ ] KM-184.02 — Inspecionar policies, grants e funções via pg_catalog.
- [ ] KM-184.03 — Testar proprietário, colaborador e usuário não autorizado.
- [ ] KM-184.04 — Testar tentativa entre organizações diferentes.
- [ ] KM-184.05 — Testar rollback de orçamento com linha inválida.
- [ ] KM-184.06 — Testar idempotência sob requisições concorrentes.
- [ ] KM-184.07 — Testar revisão otimista com dois editores.
- [ ] KM-184.08 — Verificar grants efetivos e execução das funções.
- [ ] KM-184.09 — Não executar escritas de teste no canônico sem autorização.
- [ ] KM-184.10 — Concluir com resultados SQL e objetos testados identificados.

### KM-185 — Executar o percurso completo pelos itens

- [ ] KM-185.01 — Entrar pela página inicial conforme R1.
- [ ] KM-185.02 — Escolher produtos e variantes em R5.
- [ ] KM-185.03 — Alterar quantidades e salvar rascunho.
- [ ] KM-185.04 — Retomar rascunho e recomendar caixas em R2.
- [ ] KM-185.05 — Comparar candidatas e selecionar embalagem válida.
- [ ] KM-185.06 — Personalizar itens elegíveis em R4.
- [ ] KM-185.07 — Identificar cliente e revisar valores em R7.
- [ ] KM-185.08 — Criar orçamento em ambiente de teste autorizado.
- [ ] KM-185.09 — Conferir persistência de itens, caixa e artes.
- [ ] KM-185.10 — Concluir com evidência E2E do percurso pelos itens.

### KM-186 — Executar o percurso completo pela caixa

- [ ] KM-186.01 — Entrar pela opção de embalagem de R1.
- [ ] KM-186.02 — Aplicar filtros e escolher caixa em R3.
- [ ] KM-186.03 — Adicionar item compatível e rejeitar incompatível.
- [ ] KM-186.04 — Tratar medida desconhecida sem aprovação falsa.
- [ ] KM-186.05 — Editar lote e validar disponibilidade.
- [ ] KM-186.06 — Personalizar produto e embalagem quando elegíveis.
- [ ] KM-186.07 — Salvar, sair e retomar estado exato.
- [ ] KM-186.08 — Revisar e criar orçamento sem perda de configuração.
- [ ] KM-186.09 — Comparar resultado ao percurso equivalente pelos itens.
- [ ] KM-186.10 — Concluir com evidência E2E do percurso pela caixa.

### KM-187 — Executar cenários de falha e concorrência

- [ ] KM-187.01 — Interromper rede durante autosave.
- [ ] KM-187.02 — Simular gravação concluída com resposta perdida.
- [ ] KM-187.03 — Simular dois usuários editando mesma revisão.
- [ ] KM-187.04 — Revogar permissão durante edição ativa.
- [ ] KM-187.05 — Desativar produto após ele ser selecionado.
- [ ] KM-187.06 — Alterar preço antes de criar orçamento.
- [ ] KM-187.07 — Retornar geração de IA fora de ordem.
- [ ] KM-187.08 — Expirar URL de arte durante preview.
- [ ] KM-187.09 — Verificar mensagens e recuperação sem perda silenciosa.
- [ ] KM-187.10 — Concluir com cenários negativos reproduzíveis.

### KM-188 — Verificar segurança e exposição de dados

- [ ] KM-188.01 — Revisar autorização de funções invocadas pelo módulo.
- [ ] KM-188.02 — Testar payload adulterado com produto de outro escopo.
- [ ] KM-188.03 — Testar upload malformado e conteúdo ativo.
- [ ] KM-188.04 — Verificar ausência de credenciais nos bundles.
- [ ] KM-188.05 — Revisar URLs assinadas e logs de geração.
- [ ] KM-188.06 — Evitar acesso público novo por conveniência de preview.
- [ ] KM-188.07 — Preservar guarda do projeto Supabase canônico.
- [ ] KM-188.08 — Verificar políticas existentes de desconto e auditoria.
- [ ] KM-188.09 — Não alterar autenticação global fora do escopo.
- [ ] KM-188.10 — Concluir com achados classificados e correções específicas aprovadas.

### KM-189 — Executar regressões visuais e funcionais adjacentes

- [ ] KM-189.01 — Comparar sete telas com snapshots determinísticos.
- [ ] KM-189.02 — Verificar modos de foco e movimento reduzido.
- [ ] KM-189.03 — Testar breakpoints desktop, tablet e mobile.
- [ ] KM-189.04 — Verificar catálogo, orçamento e biblioteca existentes.
- [ ] KM-189.05 — Verificar ausência de regressão no módulo Magazine.
- [ ] KM-189.06 — Inspecionar alterações de tokens e seletores globais.
- [ ] KM-189.07 — Distinguir mudança intencional de snapshot de regressão.
- [ ] KM-189.08 — Não atualizar baseline automaticamente para esconder falha.
- [ ] KM-189.09 — Registrar diferenças aceitas com justificativa do PO.
- [ ] KM-189.10 — Concluir com relatório de regressão e imagens comparativas.

### KM-190 — Fechar a validação sem falso verde

- [ ] KM-190.01 — Executar typecheck, lint e build aplicáveis.
- [ ] KM-190.02 — Executar guardas SSOT e testes focados.
- [ ] KM-190.03 — Conferir testes pulados e motivos explícitos.
- [ ] KM-190.04 — Separar testes locais de validação de produção.
- [ ] KM-190.05 — Verificar evidência para todas as funcionalidades visíveis.
- [ ] KM-190.06 — Classificar bloqueios reais sem convertê-los em PASS.
- [ ] KM-190.07 — Não relaxar gates para alcançar conclusão.
- [ ] KM-190.08 — Reexecutar suíte afetada após última alteração.
- [ ] KM-190.09 — Vincular resultados ao SHA efetivamente avaliado.
- [ ] KM-190.10 — Concluir com parecer técnico de liberação ou impedimento.

<a id="area-20"></a>

## 20 — Entrega controlada, documentação e aceite final

Prioridade: P0 para segurança da entrega; execução condicionada à aprovação futura.
Dependências: Integração de 001–190; não autoriza publicação nesta tarefa.
Pontos de integração: docs/plans; docs/coordenacao; migrations revisadas; CI existente; integração Vercel e Supabase canônico
Responsabilidade recomendada: Responsável pela entrega + PO.

### KM-191 — Consolidar a matriz de prontidão

- [ ] KM-191.01 — Relacionar os duzentos itens às evidências coletadas.
- [ ] KM-191.02 — Marcar reuso validado separadamente de implementação nova.
- [ ] KM-191.03 — Distinguir código local, PR, main e produção.
- [ ] KM-191.04 — Distinguir migration preparada de objeto aplicado.
- [ ] KM-191.05 — Distinguir Edge Function versionada de implantada.
- [ ] KM-191.06 — Registrar bloqueios de dados, arte ou decisão comercial.
- [ ] KM-191.07 — Não chamar protótipo visual de funcionalidade concluída.
- [ ] KM-191.08 — Identificar responsáveis pela resolução de cada pendência.
- [ ] KM-191.09 — Atualizar contadores somente com evidência verificável.
- [ ] KM-191.10 — Concluir com matriz de prontidão auditável.

### KM-192 — Revisar mudanças de banco propostas

- [ ] KM-192.01 — Listar somente lacunas comprovadas do contrato.
- [ ] KM-192.02 — Identificar função, coluna ou policy afetada individualmente.
- [ ] KM-192.03 — Comparar definição atual com proposta forward-only.
- [ ] KM-192.04 — Reutilizar objetos existentes quando suficientes.
- [ ] KM-192.05 — Preparar pré-condições e pós-condições verificáveis.
- [ ] KM-192.06 — Avaliar locks, tempo de execução e compatibilidade.
- [ ] KM-192.07 — Definir recuperação sem apagar dados históricos.
- [ ] KM-192.08 — Obter autorização explícita por objeto do PO.
- [ ] KM-192.09 — Não promover rascunho de migration automaticamente.
- [ ] KM-192.10 — Concluir com pacote de banco revisado e autorização registrada.

### KM-193 — Preparar publicação compatível entre camadas

- [ ] KM-193.01 — Definir ordem de servidor, banco e interface.
- [ ] KM-193.02 — Manter clientes antigos compatíveis durante transição.
- [ ] KM-193.03 — Inspecionar contratos da Edge Function de IA.
- [ ] KM-193.04 — Planejar rollout gradual usando mecanismo existente.
- [ ] KM-193.05 — Evitar novos flags sem necessidade demonstrada.
- [ ] KM-193.06 — Definir reversão da interface sem remover schema aditivo.
- [ ] KM-193.07 — Preservar cores atuais durante rollout e fallback.
- [ ] KM-193.08 — Registrar SHA e versões das dependências de entrega.
- [ ] KM-193.09 — Testar coexistência de versões em ambiente isolado.
- [ ] KM-193.10 — Concluir com estratégia de publicação e recuperação ensaiada.

### KM-194 — Validar em ambiente de preview autorizado

- [ ] KM-194.01 — Configurar preview sem apontamento acidental à produção.
- [ ] KM-194.02 — Confirmar URL e projeto de cada dependência.
- [ ] KM-194.03 — Usar fixtures ou dados de teste autorizados.
- [ ] KM-194.04 — Executar smoke dos dois percursos.
- [ ] KM-194.05 — Testar IA e artes com credenciais de teste.
- [ ] KM-194.06 — Gerar orçamento somente no ambiente permitido.
- [ ] KM-194.07 — Comparar telas com referências e tokens atuais.
- [ ] KM-194.08 — Verificar carregamento direto e atualização das rotas.
- [ ] KM-194.09 — Registrar limitações não cobertas no preview.
- [ ] KM-194.10 — Concluir com aceite técnico de homologação identificado.

### KM-195 — Preparar revisão e integração no GitHub

- [ ] KM-195.01 — Rever alterações concorrentes antes de abrir entrega.
- [ ] KM-195.02 — Respeitar reserva de arquivos e protocolo multiagente.
- [ ] KM-195.03 — Separar commits de UI, contratos e testes quando útil.
- [ ] KM-195.04 — Não incluir alterações alheias ou arquivos temporários.
- [ ] KM-195.05 — Explicar decisões e divergências visuais no PR.
- [ ] KM-195.06 — Exigir gates reais sem continue-on-error indevido.
- [ ] KM-195.07 — Resolver conflitos semanticamente preservando guardas.
- [ ] KM-195.08 — Verificar branch e SHA antes de integrar.
- [ ] KM-195.09 — Não fazer merge sem autorização de execução correspondente.
- [ ] KM-195.10 — Concluir com revisão e checks do SHA candidato.

### KM-196 — Publicar camadas autorizadas com rastreabilidade

- [ ] KM-196.01 — Confirmar autorização de publicação e alvos exatos.
- [ ] KM-196.02 — Aplicar somente migrations individualmente aprovadas.
- [ ] KM-196.03 — Verificar pós-condições via pg_catalog no canônico.
- [ ] KM-196.04 — Implantar apenas funções modificadas dentro do escopo.
- [ ] KM-196.05 — Publicar interface pelo processo já adotado.
- [ ] KM-196.06 — Conferir SHA do deployment efetivo da Vercel.
- [ ] KM-196.07 — Não assumir merge como prova de produção atualizada.
- [ ] KM-196.08 — Preservar trilha de execução sem expor segredos.
- [ ] KM-196.09 — Interromper avanço diante de incompatibilidade de contrato.
- [ ] KM-196.10 — Concluir com recibos distintos de código, banco e funções.

### KM-197 — Validar a produção após publicação

- [ ] KM-197.01 — Confirmar respostas de /api/health quando existente.
- [ ] KM-197.02 — Confirmar prontidão de /api/ready quando existente.
- [ ] KM-197.03 — Abrir /montar-kit e biblioteca com sessão autorizada.
- [ ] KM-197.04 — Verificar catálogos e imagens sem dados demonstrativos.
- [ ] KM-197.05 — Conferir ambos os percursos sem alterar registros reais.
- [ ] KM-197.06 — Validar persistência apenas com kit de teste autorizado.
- [ ] KM-197.07 — Validar orçamento produtivo somente com permissão específica.
- [ ] KM-197.08 — Verificar ausência de erros novos no console e logs.
- [ ] KM-197.09 — Confirmar paleta e módulos adjacentes preservados.
- [ ] KM-197.10 — Concluir com smoke produtivo e limites explicitados.

### KM-198 — Monitorar operação e definir recuperação

- [ ] KM-198.01 — Definir janela de acompanhamento após release.
- [ ] KM-198.02 — Monitorar erros de salvamento e geração de orçamento.
- [ ] KM-198.03 — Monitorar latência de catálogo e cálculo físico.
- [ ] KM-198.04 — Monitorar falhas e consumo da IA.
- [ ] KM-198.05 — Monitorar rejeições de permissão sem dados sensíveis.
- [ ] KM-198.06 — Comparar métricas com baseline anterior.
- [ ] KM-198.07 — Definir limiares objetivos para suspender funcionalidade.
- [ ] KM-198.08 — Preparar retorno à versão de interface compatível.
- [ ] KM-198.09 — Não reverter migrations com perda de dados.
- [ ] KM-198.10 — Concluir com responsáveis e procedimento de recuperação operacional.

### KM-199 — Atualizar documentação e handoff operacional

- [ ] KM-199.01 — Registrar arquitetura final e fontes de dados.
- [ ] KM-199.02 — Documentar os dois percursos com imagens atuais.
- [ ] KM-199.03 — Documentar limites da validação física e da IA.
- [ ] KM-199.04 — Documentar regras de preço, quantidade e personalização.
- [ ] KM-199.05 — Atualizar testes e comandos realmente utilizados.
- [ ] KM-199.06 — Registrar migrations e deploys com evidências.
- [ ] KM-199.07 — Descrever manutenção de assets e textos.
- [ ] KM-199.08 — Listar pendências remanescentes sem linguagem de conclusão falsa.
- [ ] KM-199.09 — Preparar handoff com responsáveis e próximos bloqueios.
- [ ] KM-199.10 — Concluir com documentação sincronizada ao SHA publicado.

### KM-200 — Formalizar o aceite integral do Kit Maker

- [ ] KM-200.01 — Conferir exatamente duzentas etapas no plano.
- [ ] KM-200.02 — Conferir dez subetapas verificadas por etapa.
- [ ] KM-200.03 — Reconciliar cobertura funcional das sete referências.
- [ ] KM-200.04 — Validar preservação das cores atuais do sistema.
- [ ] KM-200.05 — Confirmar inexistência de CTAs vazios ou mocks ocultos.
- [ ] KM-200.06 — Confirmar atomicidade e recuperação das operações críticas.
- [ ] KM-200.07 — Confirmar acessibilidade, responsividade e testes aprovados.
- [ ] KM-200.08 — Confirmar versão publicada e contratos canônicos correspondentes.
- [ ] KM-200.09 — Registrar aceite do PO e exceções formalmente delimitadas.
- [ ] KM-200.10 — Concluir somente com evidências completas ou declarar pendências.

## Registro de execução e evidência

Usar este modelo no documento de acompanhamento ou no PR da etapa. Não preencher “concluído” antes da prova. Para controlar tamanho, guardar logs e imagens separadamente, ligados ao registro.

```text
Etapa: KM-NNN
Natureza: reuso validado / correção / integração / implementação nova
Responsável:
Estado: pendente / em execução / bloqueado / concluído
Dependências satisfeitas:
Arquivos e objetos envolvidos:
Commit / PR:
Ambiente e projeto Supabase:
Decisão/autorização do PO, quando necessária:
Testes executados e resultado:
Evidência visual R1–R7:
Evidência de persistência/contrato:
Limitações, riscos e pendências:
Revisão da décima subetapa:
```

### Comandos existentes para a futura validação

Os comandos abaixo foram identificados na configuração atual do repositório. **Não foram executados como testes funcionais nesta entrega de planejamento.** Antes de usá-los, ler configurações e fixtures, confirmar ambiente, permissões e ausência de efeitos produtivos. Não atualizar baselines automaticamente para esconder regressões.

```bash
node scripts/validate-supabase-config.mjs
npm run typecheck
npm run typecheck:full
npm run lint:baseline
npm run build
npm run test -- tests/lib/kit-builder-volume.test.ts tests/lib/kit-builder-price.test.ts
npm run test -- tests/hooks/useKitBuilder-extended.test.ts
npm run test -- tests/components/kit-builder/KitBuilderComponents.test.tsx
npm run test -- tests/components/pages/KitBuilderPage.test.tsx
npm run test -- tests/pages/kit-builder/useKitBuilderQuote.test.ts
```

`typecheck` usa baseline; `typecheck:full` realiza checagem completa. Diferenciar falhas preexistentes de regressões, sem promover baseline novo como correção. Estes testes existentes são pontos de partida, não cobertura integral das 200 etapas. SQL transacional, autenticação, IA live, testes visuais e E2E exigem a preparação específica prevista no plano. Inspecionar o arquivo Playwright completo e projetos disponíveis antes de montar comandos; não deduzir projeto válido por um script antigo do package.json.

## Critério final de aceite

“Concluído” significa que o comportamento das sete telas está integrado aos dados autorizados, com cálculos corretos, persistência confiável, tratamento de falhas, acessibilidade e evidências. A semelhança estrutural deve respeitar a restrição de cores e registrar diferenças de assets aceitas. A publicação efetiva, quando autorizada, precisa de recibos separados para GitHub, Vercel, migrations e Edge Functions afetadas.

Uma demonstração visual, um teste mockado, um arquivo de migration ou um toast de sucesso não substituem essas provas. Caso alguma dependência permaneça bloqueada, a conclusão deve declarar a pendência nominalmente, sem afirmar “10/10”, “100% implementado” ou “produção validada”.
