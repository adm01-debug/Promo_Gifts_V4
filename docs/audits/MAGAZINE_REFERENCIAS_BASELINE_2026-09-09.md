# Auditoria do Magazine contra as cinco referências visuais

Data: 09/09/2026. Projeto: Promo Gifts V4.

## Conclusão

**Não: as melhorias das cinco imagens não estão integralmente implementadas como nas referências.** Há uma estrutura considerável já pronta, mas também funcionalidades ausentes, diferenças de composição e falhas funcionais reproduzidas. Nenhuma das cinco telas pode receber aprovação de fidelidade integral nesta rodada.

**As cores atuais do sistema devem permanecer.** Diferenças de cor entre o aplicativo e as imagens não são defeitos nesta auditoria e não justificam reativar o tema Blue Premium. Não alterei código de aplicação, CSS, dependências, GitHub ou Supabase.

Achados que mais afetam o resultado:

1. Autosave pode informar sucesso sem gravar; sair antes do debounce perde a última edição.
2. O autosave envia o snapshot completo e o serviço apaga/reinsere os itens. Uma falha intermediária pode perder itens; os IDs também são recriados.
3. O preview escalado está deslocado para fora do seu contêiner; cards, miniaturas e editor compartilham esse renderer.
4. Galeria e preview usam `/placeholder.svg`, não as fotografias/composições das referências. Há problemas adicionais de escopo CSS e carregamento de fontes.
5. “Usar template” fora do editor não cria a revista nem preserva a escolha.
6. Faltam ações e metadados nos cards da biblioteca, gestão de páginas editoriais e favoritos de produtos.
7. Busca de clientes, vínculo CRM e seleção de produtos entre filtros estão incompletos ou incorretos.

## Base, método e limites

- Código examinado: `main`, commit `55e598d3e30b49adc218e43c67dfbe64136deae8`.
- `git ls-remote origin refs/heads/main` confirmou o mesmo SHA remoto durante a auditoria. Isso confirma a versão do código no GitHub, não o deployment em produção.
- Referências: R1 biblioteca; R2 galeria; R3 preview do Vogue; R4 editor/Identidade; R5 editor/Produtos.
- Leitura de páginas, componentes, registry, hooks, serviço, paginação, estilos, rotas e testes diretamente ligados a essas telas.
- Graphify utilizado para localizar componentes e relações; conclusões conferidas nos arquivos atuais, não apenas no grafo.
- Chromium headless local: componentes reais e CSS atual, com autenticação, produtos, CRM e persistência substituídos por fixtures em memória. Requisições externas bloqueadas. Nenhum dado produtivo criado, alterado ou excluído.
- O harness não contém o shell completo do aplicativo, o ThemeProvider da sessão do usuário nem dados reais. As capturas são evidência da renderização isolada dos componentes, **não screenshots autenticadas de produção nem prova pixel a pixel**. Fontes externas do shell foram bloqueadas; fontes locais e declarações do módulo foram examinadas separadamente.
- O navegador MCP não abriu: a extensão Playwright não estava disponível. Foi usada a alternativa headless local, sem instalar extensões.
- Não houve consulta `pg_catalog` ao Supabase nesta rodada. RLS, triggers, dados existentes, concorrência live e publicação pública real não estão certificados por estes testes.
- Valores de exemplo — 8 revistas, 482 produtos, clientes, preços e contadores — não devem ser hardcoded para imitar as imagens.

## Resultados executados

| Verificação | Resultado | Alcance |
|---|---|---|
| Suítes existentes de Magazine, serviço, paginação e guardas | **745 passaram; 3 ignorados; 0 falhas**, 39 arquivos coletados | Unitários/integração simulada; execução sem retries |
| TypeScript: `npm run qa:typecheck` | **Passou**, exit 0 | `tsc -p tsconfig.app.json --noEmit` |
| Cenários de navegador | **23 cenários concluídos com evidências** | 13 de auditoria + 10 de controles/dimensões; incluem reprodução de defeitos, não 23 aprovações |
| Contratos novos sobre o serviço real com DB simulado | **2 falharam** | Preservação dos itens após falha e estabilidade dos IDs |
| Fidelidade integral às cinco imagens | **Não aprovada** | Diferenças demonstradas abaixo |
| Produção autenticada / Supabase real | **Não validado nesta rodada** | Não confundir mocks com validação live |

Ambiente: Node `v24.19.0`, Vite `8.0.16`, React `19.2.8`, Playwright package `1.59.1`; Chromium instalado no cache `chromium-1243`, selecionado explicitamente porque o executável padrão esperado não estava presente. Vitest instalado `4.1.8`, enquanto o manifesto pede `^4.1.11`: **a rodada não equivale a um `npm ci` reproduzido do lockfile**. Não reinstalei dependências da worktree compartilhada.

Legenda das matrizes: **Implementado** = estrutura/ação encontrada, com o nível de evidência indicado; **Parcial** = existe, mas não atende ao conjunto do requisito; **Ausente** = não encontrado no fluxo examinado; **Divergente** = há implementação diferente da referência, podendo exigir decisão de produto. Nenhum desses rótulos significa aprovação pixel a pixel.

## R1 — Biblioteca de revistas

| Item da referência | Situação | Evidência / diferença |
|---|---|---|
| Título Magazine, ícone e texto explicativo | Implementado | `MagazineListPage`, header |
| Explorar templates | Implementado | Link para `/magazine/templates` |
| Nova revista | Implementado em código | Cria com `magazineService.create`; guarda contra clique repetido; gravação real não exercitada |
| Cinco KPIs | Implementado | `MagazineStatsCards`: total, rascunhos, publicadas, arquivadas, visualizações |
| Contadores vindos das revistas | Implementado | Derivados da lista; não são valores fixos das imagens |
| Busca por título e cliente | Implementado em código | Filtro local case-insensitive |
| Busca por descrição | **Ausente no filtro** | Placeholder promete descrição, mas busca apenas `title` e `branding.clientName`; consulta por subtítulo conhecido retornou zero |
| Filtros de status com contagem | Implementado | Simulação selecionou Rascunhos e retornou 3 cards |
| Ordenação e inversão | Implementado em código | Atualização, nome e views; inversor separado |
| Grade/lista | Implementado | Alternância exercitada no navegador |
| Quatro colunas desktop | Implementado estruturalmente | `xl:grid-cols-4`; dimensões do shell real ainda precisam de comparação |
| Capa real em paisagem | **Parcial** | Usa renderer real e recorte 11:5, mas sofre deslocamento do renderer; fotos dependem dos produtos |
| Badge sobre a imagem, canto superior direito | **Divergente** | Status fica abaixo do título, no rodapé informativo |
| Empresa com ícone, produtos e nome do template | **Parcial** | Nome do cliente existe; faltam ícone e linha produtos/template no card da grade. A lista tem parte dos dados |
| Edição relativa e visualizações | Implementado | Data relativa e contador com ícone |
| Menu inferior sempre visível | **Divergente** | Menu fica ao lado do título e aparece no hover/foco |
| Abrir revista / Continuar edição como CTA inferior | **Ausente** | Zero botões com esses textos nos oito cards simulados; clique da capa vai ao editor |
| Abertura pública pelo menu | **Defeito de rota** | Link usa `/m/:token`; rota declarada e publicação usam `/revista-publica/:token` |
| Estados vazio/carregando/erro distinguíveis | **Parcial** | Loading dos KPIs existe, mas lista vazia inicial já mostra “Nenhuma revista”; erro da consulta vira `[]` no serviço |

Fontes: [biblioteca](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/MagazineListPage.tsx:174), [cards](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/MagazineListPage.tsx:437), [rota pública do menu](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/MagazineListPage.tsx:489), [rota registrada](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/routes/public-routes.tsx:56), [serviço de listagem](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/services/magazineService.ts:256).

## R2 — Galeria de templates

| Item da referência | Situação | Evidência / diferença |
|---|---|---|
| Título, subtítulo e voltar | Implementado | Página e retorno ao editor quando há `returnTo` |
| Filtros Editorial/Catálogo/Corporativo | Implementado | Filtram o registry, mas a classificação diverge para Magazine e Manifesto |
| Densidade 1, 2–4 e 5+ | Implementado | Filtros reais; 1/página retornou Vogue e Mono |
| Mais recentes | **Parcial** | Mantém ordem do registry; não usa data de criação/atualização |
| Outras ordenações | Implementado em código | Nome e densidade |
| Grade/lista | Implementado | Lista preservou os 12 cards |
| Os oito templates nomeados nas imagens | Implementado nominalmente | Todos existem, com diferenças de configuração; há mais quatro templates, o que não é defeito por si só |
| Fotografias e composições individuais | **Ausente na vitrine atual** | Os nove produtos de demonstração usam `/placeholder.svg`; mesma base sintética nos diferentes designs |
| Descrição, família, densidade, fonte, três swatches | Implementado estruturalmente | Valores e apresentação não são todos iguais à referência |
| Coração/favorito | Implementado com limite | Um favorito em localStorage; Mono persistiu e ficou primeiro após reload. Não há sincronização comprovada entre contas/dispositivos |
| Preview | **Parcial** | Abre modal real; CSS/renderização/ativos ainda impedem fidelidade |
| Usar template para criar revista | **Não implementado nesse fluxo** | Sem `returnTo`, mostra toast e navega à lista; nenhum `create` e nenhuma escolha preservada |
| Usar template para revista existente | Implementado em código | Navega com `applyTemplate`; guardas rejeitam destinos inválidos |

### Diferenças concretas do registry

| Template | Referência | Implementação |
|---|---|---|
| Vogue | Playfair Display; corpo Inter no modal | Cormorant Garamond / Work Sans |
| Magazine | Corporativo; Instrument Sans | Editorial; Instrument Serif / Inter |
| Hero Grid | DM Serif Display, 5+ produtos | Cabeçalho DM Serif Display, 5 produtos; corpo Fira Sans |
| Mono | Archivo Black, Editorial, 1/página | Metadados principais correspondem; corpo Hind e composição distinta |
| Manifesto | Corporativo; Montserrat; 1/página | Editorial; Playfair Display / Inter; **2/página** |
| Catálogo 2×3 | Inter; seis produtos na descrição | Playfair Display / Inter; 6/página |
| Catálogo 3×3 | Inter; 9 produtos | Playfair Display / Inter; 9/página |
| Executivo | Montserrat; Corporativo; 2–4 produtos | Instrument Serif / Work Sans; Corporativo; 3/página |

A etiqueta de fonte não garante que a fonte esteja carregada. `magazine.css` importa localmente Playfair Display, DM Serif Display, Great Vibes e Inter; várias fontes declaradas no registry não têm import correspondente nesse módulo. Na amostra `Aa` do modal, o `fontFamily` nem é aplicado: ambos os exemplos usaram a fonte global do shell no navegador.

Fontes: [ações e ordenação](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/templates-gallery/MagazineTemplatesGalleryPage.tsx:84), [registry](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/components/templates/TemplateRegistry.ts:39), [mock da galeria](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/templates-gallery/mockMagazine.ts:19), [fontes locais](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/magazine.css:11).

## R3 — Preview do template

| Item da referência | Situação | Evidência / diferença |
|---|---|---|
| Modal amplo com fechar | Implementado | Abriu; Escape fechou |
| Título, família e densidade no header | Implementado estruturalmente | Valores vêm do registry divergente |
| Menu de opções | Implementado parcialmente | Oferece ação de favorito |
| Criar revista | **Divergente/incompleto** | Label é “Usar template”; fora do editor não cria |
| Sobre o template com descrição desenvolvida | **Parcial** | Repete descrição curta do card |
| Formato A4 / retrato | Implementado como metadado | Não basta para garantir dimensão real do canvas |
| Páginas por layout | **Divergente** | Mostra produtos por página, conceito diferente |
| Estilo e público-alvo | Implementado | Metadata do registry |
| Checklist de características | Implementado | Vogue contém as cinco características principais |
| Casos de uso | Implementado | Chips previstos presentes |
| Tipografia com amostras reais | **Parcial** | Labels existem; `Aa` não recebe a fonte indicada |
| Cinco amostras de paleta | **Divergente** | Exibe três tokens; não alterar a paleta global para corrigir estrutura |
| Composição Vogue com foto, título e rodapé iguais | **Não corresponde** | Placeholder; layout do template posiciona outros elementos e não reproduz a arte fornecida |
| Setas, contador e pontos | Implementado | Mudança de Página 2 de 11 para Página 3 de 11 reproduzida |
| Zoom | Implementado | Seleção de 150% funcionou |
| Fullscreen | Implementado em código | API condicional; comportamento real em fullscreen não exercitado |
| Carregamento direto da galeria com A4 correto | **Falhou no isolamento local** | CSS de Magazine não é importado pela galeria; canvas no card mediu 1920×1049 em vez de 1920×2716 e não tinha ancestral `.mag-scope` |

Dois problemas distintos: (1) galeria/preview não possuem import próprio de `magazine.css`, dependendo de uma rota anterior; (2) `TemplateCard` chama o componente do template diretamente, sem o wrapper `.mag-scope` e variáveis fornecidos por `MagazinePageRenderer`. Carregar o CSS sozinho não resolve ambos.

Fontes: [modal](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/templates-gallery/TemplatePreviewDialog.tsx:154), [tipografia](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/templates-gallery/TemplatePreviewDialog.tsx:298), [render do card](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/templates-gallery/TemplateCard.tsx:121), [Vogue](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/components/templates/editorial/VogueTemplate.tsx:16).

## R4 — Editor / Identidade

| Item da referência | Situação | Evidência / diferença |
|---|---|---|
| Breadcrumb, título e chip do template | **Parcial/divergente** | Breadcrumb local é “Magazines / Editor”; título usa o título da revista, em vez de fixar “Nova Revista” |
| Trocar template | Implementado em código | Popover aplica template sem substituir lista de produtos |
| Cinco etapas | Implementado | Identidade, Produtos, Conteúdo, Design, Layout & Gerar |
| Identidade em três colunas desktop | Implementado estruturalmente | Formulário / preview / páginas; sidebar visível em 1433 e 1672 px |
| Título e subtítulo com contadores 80/200 | Implementado | Limites são avisos, não bloqueios; a imagem não define qual deve ser a regra de bloqueio |
| Cliente CRM, limpar e dropdown | Implementado estruturalmente | Consulta filtra empresas `is_customer=true` |
| Busca de cliente | **Defeituosa** | Texto sem dígitos faz a condição de CNPJ procurar `''`, que corresponde a qualquer CNPJ |
| Vínculo identificável ao cliente CRM | **Parcial** | Seleção salva nome/logo, não `clientCrmId`; dois clientes homônimos não são distinguidos por ID |
| Busca em toda a base CRM | **Limitada** | Carrega até 200 empresas e mostra até 40; busca é local nesse subconjunto |
| Preenchimento manual recolhível | Implementado | Nome e URL do logo |
| Três cores da revista e seis presets | Implementado estruturalmente | Esses controles são branding da revista, não autorização para mudar cores do aplicativo |
| Hex coerente após aplicar preset | **Defeituoso** | Botão passou a `#111827`, mas input continuou `#0c2340` |
| Preview central A4 legível | **Defeituoso** | Conteúdo escalado usa origem central, não canto superior esquerdo; deslocamento medido |
| Salvo automaticamente | **Defeituoso como confirmação** | `update → null` termina o estado “saving” e apresenta sucesso, sem gravar |
| Preservar edição ao navegar | **Defeituoso** | Saída antes de 400 ms cancela timer; nenhuma chamada de update no cenário |
| Preview / PDF / Publicar / menu | Implementado em código, parcialmente validado | Drawer e handlers existem; PDF abre página de impressão, não gera arquivo imediatamente; publicação real não exercitada |
| Páginas com miniaturas, número e seleção | **Parcial** | Lista existe, seleção funciona estruturalmente, miniaturas sofrem problema de escala |
| Nova página | **Ausente** | Zero controles correspondentes; PagesRail não recebe callback de criação |
| Arrastar páginas e menu por página | **Ausente** | PagesRail oferece apenas seleção, não reorder/menu |
| Capa / Sobre nós / Kits / Sustentabilidade / Contato | **Ausente como páginas editoriais livres** | Paginação gera capa, produtos, seções por categoria e contracapa |
| Zoom/páginas/fullscreen no centro | **Parcial** | Controles presentes; níveis Fit/150/200/300 diferem; renderização comprometida |

`pageOrder` e `pageNumber` existem no modelo/persistência, mas não são consumidos para ordenar páginas livres na paginação atual. `introText` e `closingText` existem no tipo e nos mocks, porém não há campos correspondentes no `ContentStep` nem páginas editoriais que completem o fluxo mostrado. Não remover esses campos: primeiro definir o modelo editorial e reconciliar o que outros agentes planejaram.

Fontes: [layout do editor](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/MagazineEditorPage.tsx:71), [formulário](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/components/steps/IdentityStep.tsx:36), [CRM](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/components/MagazineClientPicker.tsx:61), [hex](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/components/BrandColorPicker.tsx:174), [PagesRail](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/components/PagesRail.tsx:29), [paginação](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/pagination.ts:25), [Conteúdo](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/components/steps/ContentStep.tsx:101).

## R5 — Editor / Produtos

| Item da referência | Situação | Evidência / diferença |
|---|---|---|
| Header com PDF, preview, salvar, continuar | Implementado visualmente | Botão salvar apenas emite toast; não força nem confirma gravação |
| Catálogo + Na revista | Implementado | Duas áreas em desktop |
| Busca de produtos | Implementado em código | Envia search ao serviço; busca real completa não foi exercitada |
| Categorias e Mais | **Parcial** | Contadores derivados somente dos produtos carregados; até 7 categorias visíveis |
| Todos / total do catálogo | **Parcial/enganoso** | Requisição tem `limit:80`, sem paginação no componente; “Todos” não representa a base inteira |
| Ordenar por relevância | **Parcial** | “relevance” preserva ordem recebida; backend padrão ordena por nome, sem ranking explícito |
| Menor/maior preço e nome | Implementado em código | Ordena apenas o lote carregado |
| Filtros avançados | Implementado | Somente personalizáveis e ocultar adicionados |
| Cards com foto/nome/SKU/preço | Implementado estruturalmente | Dados sintéticos usados no navegador; ativos reais não certificados |
| Quatro colunas | Implementado em desktop largo | `2xl:grid-cols-4`; três em faixa intermediária |
| Favorito no canto superior esquerdo | **Ausente** | Não há controle/handler de favorito de produto |
| Selecionados permanecem no grid com check | **Divergente** | Adicionados são ocultados por padrão; quando expostos, ficam desabilitados, não com o mesmo estado da imagem |
| Check adiciona à revista | **Divergente** | Check faz seleção temporária; botão adicional “Adicionar (N)” confirma. `+` faz adição direta |
| Seleção atravessando buscas/filtros | **Defeituosa** | UI mostrou “Adicionar (2)”, mas só enviou o produto visível no último filtro |
| Swatches no card | Implementado como indicação | Não são controles de troca de variante no grid |
| Template ativo e trocar | Implementado | Troca leva a Design |
| Contagem de itens / páginas estimadas | **Parcial** | Estimativa ignora capa, contracapa e seções; precisa indicar que conta somente páginas de produtos |
| Linhas selecionadas com cor e remoção | Implementado com lacuna | Seletor de cor existe; thumbnail continua usando imagem principal, mesmo ao mudar variante |
| Limpar tudo | **Parcial** | Confirmação existe, mas dispara remoções individuais sem await agregado nem resultado global de falhas |
| Tudo certo! | **Parcial como confirmação** | Depende de `items.length > 0`, não do sucesso da operação mais recente |

Fontes: [catálogo limitado e seleção](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/components/steps/ProductsStep.tsx:97), [seleção entre filtros](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/components/steps/ProductsStep.tsx:142), [grid](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/components/steps/ProductsStep.tsx:355), [sidebar](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/components/steps/ProductsStep.tsx:576), [consulta limitada](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/lib/external-db/products.ts:85).

## Falhas reproduzidas e prioridade de correção

### P1 — Integridade e confirmação de salvamento

**F01 — Autosave não transacional sobre os itens.** `persist(next)` passa a revista inteira para `update`, incluindo `items`. O serviço executa DELETE e INSERT separados. Teste com um item e INSERT recusado: restaram zero itens. Isso demonstra uma vulnerabilidade do fluxo sob falha simulada, **não comprova que produção já perdeu dados**.

**F02 — IDs de itens instáveis após editar metadados.** A reinserção não inclui o ID original. Teste representando geração de ID pelo banco: `stable-item` virou `regenerated-0`. O hook não substitui seu snapshot pelo retorno do autosave. Consequência a validar live: ações posteriores podem usar IDs antigos e não afetar a linha esperada.

**F03 — Falso sucesso.** Simular `update` retornando `null`, editar título e aguardar debounce: input mostrou título novo, persistência reteve o antigo, UI mostrou “Salvo automaticamente”. Além disso, “Salvar rascunho” e Ctrl/Cmd+S apenas emitem toast. `updatedAt` do retorno do autosave não é reconciliado, comprometendo o indicador de tempo.

**F04 — Edição perdida ao sair rapidamente.** Editar e navegar para a galeria antes de 400 ms: timer foi cancelado no unmount, zero updates. Impressão/publicação também não aguardam explicitamente o flush do último snapshot; essa combinação deve ganhar teste próprio antes da correção.

Correção recomendada: distinguir patches de metadados e mutações de itens; IDs estáveis; estado dirty/saving/saved/error; flush aguardável antes de navegar/publicar/imprimir; tratamento de `null` e rejeições; proteção de concorrência. Se a solução exigir RPC/DDL, preparar proposta por objeto e obter autorização antes de aplicar ao canônico.

Fontes: [persist/debounce](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/useMagazineEditor.ts:65), [cancelamento](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/useMagazineEditor.ts:101), [DELETE/INSERT](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/services/magazineService.ts:326), [salvar apenas toast](/home/joaquim_ataides/projetos/Promo_Gifts_V4/src/pages/magazine/MagazineEditorPage.tsx:346).

### P1 — Preview inutilizável e fluxo de entrada incompleto

**F05 — Origem de escala incorreta.** Wrapper mediu aproximadamente `x=553,y=244,w=694,h=982`; filho escalado começou em `x=1166,y=1111`. `transform-origin` computado: `960px 1358px`. A regra CSS mira `.mag-preview-wrapper > .mag-page`, mas o filho direto é um `div` intermediário. Alinhar a transformação desse elemento, sem mexer em cores. Verificar editor, miniaturas, lista e impressão.

**F06 — Galeria sem contrato de renderização compartilhado.** Em acesso frio, card Vogue mediu altura 1049, não 2716. `TemplateCard` não usa `.mag-scope`; galeria/preview não importam o CSS. A aparência depende da sequência de navegação. Há ainda dependência de fontes não carregadas e assets placeholder.

**F07 — Criar a partir do template não funciona como prometido.** Clicar “Usar template” no Mono levou à lista; zero chamadas e template armazenado permaneceu Vogue. O serviço já aceita `templateId` em `create`: o fluxo de UI é que não o utiliza.

**F08 — Link público inconsistente.** Menu da biblioteca usa `/m/`; rota válida do projeto é `/revista-publica/`. Nenhum alias `/m/:token` foi encontrado nas rotas/rewrites examinadas.

### P2 — Seleção, CRM e controles

**F09 — Seleção perdida entre filtros.** Selecionar Garrafa, buscar Mochila e selecioná-la: botão anunciou 2, mas `onAdd` recebeu apenas Mochila. Causa: `filtered.filter(...)` e limpeza de todo o Set. Preservar o conjunto de produtos selecionados independentemente da consulta atual.

**F10 — Busca textual do CRM não filtra.** `ZZZInexistente` retornou Alfa e Beta porque retirar dígitos produz string vazia. Comparação por CNPJ deve exigir dígitos; busca não pode limitar silenciosamente a base aos primeiros 200 clientes.

**F11 — Seleção CRM sem identidade.** Escolher Beta atualizou nome/logo, mas `clientCrmId` permaneceu `null`. Persistir identidade real e usar ID para seleção/limpeza, preservando a opção manual.

**F12 — Hex stale.** Após aplicar Vibrante, botão mostrou `#111827`, input manteve `#0c2340`; um blur posterior pode reaplicar a cor antiga. Sincronizar estado local com o valor externo. Isso é correção de consistência do controle, não mudança de paleta do sistema.

**F13 — Escopo de catálogo e estimativa enganosos.** Não há próxima página para o limite 80; categorias e ordenação são do lote. Estimativa de 9 páginas para fixture de 9 produtos Vogue corresponde a 11 páginas reais com capa/contracapa.

**F14 — Busca por descrição ausente.** Corrigir contrato do filtro ou texto do campo, conforme decisão de produto.

### P2 — Fidelidade estrutural ainda não entregue

**F15 — Cards da biblioteca incompletos:** CTA inferior por status, menu na posição esperada, produtos/template, ícone de empresa e status sobre a capa.

**F16 — Páginas editoriais não implementadas:** criar, nomear, reordenar e configurar páginas, menus individuais e conteúdos institucionais. Não basta desenhar os botões: modelo, paginação, autosave, preview e PDF precisam concordar.

**F17 — Templates não equivalentes às artes:** resolver metadata/fonts/famílias/densidade e selecionar assets autorizados; manter templates adicionais já existentes. Não usar uma imagem estática de referência para fingir um editor funcional.

**F18 — Produtos sem favorito e estados diferentes:** decidir seleção imediata versus seleção em lote; persistência de favoritos e estados pending/error; thumbnail da variante e limpar tudo com resultado agregado.

## Lacunas dos testes existentes

- A suíte de galeria testa como sucesso o retorno à lista sem criação. Ela confirma o comportamento atual, não o requisito visual de criar a partir do template.
- `gallery.test.tsx` substitui registry/componentes por mocks; não prova fotografia, fonte, A4 ou composição real.
- Muitos testes de preview substituem `MagazinePageRenderer`; os rings podem passar enquanto o preview real fica fora do contêiner.
- A suíte visual da galeria usa quatro IDs, dos quais três não existem no registry atual: `editorial-drop-cap`, `catalog-grid`, `corporate-clean`.
- Há testes de screenshot do header marcados `test.fixme`; outros pulam quando a conta não tem revista. Smoke não substitui a matriz das cinco imagens.
- Smoke da lista aceita status `<500`, incluindo 401/403, como indício de backend tocado; isso não comprova carregamento bem-sucedido.
- Não foi executada comparação pixel a pixel com os cinco anexos. Seria necessário fixar viewport, shell, dados, assets e fontes, excluindo deliberadamente a diferença de cores solicitada pelo usuário.
- Os dois novos contratos que falharam precisam entrar na futura correção; não devem ser ajustados para aceitar perda de dados ou IDs instáveis.

Fontes: [galeria E2E](/home/joaquim_ataides/projetos/Promo_Gifts_V4/e2e/magazine/magazine-templates-gallery.spec.ts:59), [IDs visuais](/home/joaquim_ataides/projetos/Promo_Gifts_V4/e2e/magazine/magazine-templates-gallery-visual.spec.ts:24), [fixme](/home/joaquim_ataides/projetos/Promo_Gifts_V4/e2e/flows/magazine-header-responsive.spec.ts:153), [smoke](/home/joaquim_ataides/projetos/Promo_Gifts_V4/e2e/flows/magazine-smoke.spec.ts:58).

## Diferenças que precisam de decisão, não de alteração automática

1. **Cores do sistema:** preservar, por instrução expressa. O hook `useBluePremiumTheme` é no-op; não reativá-lo.
2. **Catálogo 2×3:** referência diz seis produtos, mas badge diz “2–4”. Recomendo seis produtos e classificação 5+, mantendo coerência matemática; confirmar antes de usar como critério final.
3. **Modal:** referência mostra “Página 1 de 1” e dois pontos. Definir se os pontos navegam páginas, exemplos ou variações; não copiar contadores contraditórios.
4. **Páginas editoriais:** a imagem mostra 1/12 e seis miniaturas visíveis; isso não obriga a fixar seis nem doze páginas.
5. **Templates extras:** a existência de doze, com oito visíveis na referência, não autoriza remover quatro.
6. **Miniaturas no popover Trocar template:** comentário atual registra remoção solicitada pelo PO. O screenshot não exige essas miniaturas; não restaurar por impulso.
7. **Números, clientes e preços:** são exemplos. Validar consistência com os dados, não igualdade literal.

## Sequência recomendada e critérios de aceite

- [ ] 1. Corrigir F01–F04 primeiro: preservar itens/IDs e confirmar gravação de verdade, com testes de erro, concorrência e saída rápida.
- [ ] 2. Corrigir renderer/escala e acesso frio às três rotas. Preview, miniaturas e impressão devem usar o mesmo contrato de dimensões e fontes.
- [ ] 3. Corrigir criação com template e link público; testar criar → editar → salvar → publicar → abrir → imprimir, em ambiente de teste.
- [ ] 4. Corrigir busca CRM, identidade, busca por descrição, seleção entre filtros, catálogo paginado e estado do hex.
- [ ] 5. Fechar os cards da biblioteca e os controles de produtos conforme as referências, preservando o design system atual.
- [ ] 6. Definir/persistir páginas editoriais e suas operações; obter aprovação por objeto se exigir alterações de schema.
- [ ] 7. Reconciliar registry com decisões de produto e fornecer assets de vitrine próprios por template. Não remover funções/objetos existentes de outros agentes.
- [ ] 8. Atualizar testes de contrato, IDs e screenshots defasados. Testar navegação direta e após visitar o editor para detectar dependência de CSS.
- [ ] 9. Reexecutar em instalação isolada do lockfile e Chromium correspondente; capturar os cinco estados com fixtures controladas no shell completo.
- [ ] 10. Validar publicação/PDF e persistência no ambiente autorizado, incluindo RLS e erros de rede; somente então declarar o módulo conforme. Preservar as cores atuais em todas as etapas.

Critério final: toda ação visível deve executar e persistir sua finalidade, toda confirmação deve refletir o resultado real, e a composição das cinco telas deve corresponder às referências salvo exceções aprovadas. Não há base para nota “10/10” neste momento.

## Evidências e reprodução

Diretório isolado: `/tmp/promo-magazine-audit-20260909-poDRwT`.

- [Resultados das suítes existentes](/tmp/promo-magazine-audit-20260909-poDRwT/existing-tests.json)
- [13 cenários funcionais e achados](/tmp/promo-magazine-audit-20260909-poDRwT/scenario-results.json)
- [10 verificações de controles/dimensões](/tmp/promo-magazine-audit-20260909-poDRwT/controls-results.json)
- [Contratos de integridade que falharam](/tmp/promo-magazine-audit-20260909-poDRwT/service-contract.test.ts)
- Capturas locais: [biblioteca](/tmp/promo-magazine-audit-20260909-poDRwT/01-list.png), [galeria](/tmp/promo-magazine-audit-20260909-poDRwT/02-gallery.png), [modal](/tmp/promo-magazine-audit-20260909-poDRwT/03-preview.png), [Identidade](/tmp/promo-magazine-audit-20260909-poDRwT/04-identity.png), [Produtos](/tmp/promo-magazine-audit-20260909-poDRwT/05-products.png).

Essas capturas usam fixtures. Em Produtos, todos os nove produtos da fixture já estão adicionados, por isso o catálogo fica vazio com o filtro padrão; isso documenta a divergência do estado de seleção, não ausência de produtos reais.

Comandos executados a partir da raiz do repositório:

```bash
npm run test -- --retry=0 src/pages/magazine tests/magazine src/services/__tests__/magazine tests/integration/magazine-service-fuzz.test.ts src/lib/security/__tests__/magazine-guard.test.ts
npm run qa:typecheck
./node_modules/.bin/vitest run --config /tmp/promo-magazine-audit-20260909-poDRwT/vitest.config.mjs
```

O último comando deve falhar no código auditado: são os dois contratos de integridade ainda violados. Scripts do navegador e servidor estão no diretório isolado; exigem iniciar `server.mjs` e executar `scenarios.mjs` / `controls.mjs`. Bloqueiam requisições externas e não contêm credenciais reais.

Os artefatos em `/tmp` são temporários. A auditoria não foi commitada nem publicada; a worktree do projeto permaneceu sem alterações de arquivos versionados.
