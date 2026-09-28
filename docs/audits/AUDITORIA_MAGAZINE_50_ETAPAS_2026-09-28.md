# Magazine — auditoria das 50 etapas
Data: 28/09/2026. Escopo exclusivo: módulo Magazine.
Plano revisado: `docs/plans/MAGAZINE_EXECUCAO_2026-09-09.md` e critérios de `docs/plans/MAGAZINE_CORRECOES_E_MELHORIAS_50_ETAPAS_2026-09-09.md`.

## Veredito

**Não: o plano não está integralmente implementado nem homologado.** Há entregas reais no GitHub, na produção e no banco, mas permanecem funcionalidades ausentes, operações parciais e lacunas de segurança/validação. Os testes existentes passam; dois cenários adicionais expuseram problemas não encerrados por essa cobertura.

Não atribuo percentual de conclusão: as etapas combinam implementação, comportamento, validação integrada e aceite visual. Somar checkboxes de naturezas diferentes daria uma medida enganosa.

Esta rodada foi uma auditoria. Não alterei código da aplicação, cores, policies, grants, migrations, dados ou deployments. Testes destrutivos usaram somente fixtures locais e PostgreSQL descartável. Este relatório foi preservado em `docs/audits/AUDITORIA_MAGAZINE_50_ETAPAS_2026-09-28.md` por solicitação posterior do PO. Scripts e logs das simulações permanecem em /tmp; o commit de documentação não altera os resultados nem certifica novas correções.

## Base verificada

- Local: `421cd769900470872dffbcab2db626fa62d85b88`, worktree limpa.
- GitHub origin/main: `5a8977bfa1a8e5e4a4e06b99c866e88bc868030d`.
- Local está dois commits atrás, mas os 11 arquivos diferentes são exclusivamente workflows. Não há diferença do código Magazine ou de suas migrations entre esses dois SHAs.
- Produção /api/health informa `5a8977bfa1a8e5e4a4e06b99c866e88bc868030d`; /api/ready informa ready, config/auth/PostgREST OK.
- PR #1853 mergeado em 09/09/2026 23:52:46Z, commit `61e74ba0de5dbf031f14074fa9597d1f9710485a`, ancestral de origin/main.
- PR #1899, correções posteriores de templates/Edge pública/teste, mergeado em 24/09/2026, commit `e48e660301c8612c7d141ce815ab38fa60eec57c`.
- Navegação real não autenticada a /magazine redirecionou a /auth. Isso confirma a proteção de entrada, não o funcionamento do editor autenticado.
- Não foram usadas as credenciais expostas no histórico da conversa.
- Mapeamento Graphify usado como orientação; evidências finais vêm dos arquivos atuais, testes e pg_catalog, não de um grafo presumido atualizado.

## Testes reexecutados

| Verificação | Resultado | Limite |
|---|---|---|
| Vitest Magazine | 45 arquivos, 831 testes aprovados, zero falhas/ignorados nessa seleção; retry=0 | Mocks/contratos não equivalem a E2E com Supabase |
| Browser existente | 11 cenários aprovados, zero erros de página | Chromium, componentes reais, shell mínimo e backend simulado |
| Typecheck | 0 erros, baseline 0 | Não prova comportamento |
| PostgreSQL 17.6 descartável | MAGAZINE_HARDENING_V2_PG17_OK | Schema sintético, não clone completo da produção |
| Simulação adicional de limpar tudo | Falha de atomicidade reproduzida: 9 → 8 itens quando a segunda remoção falha | Apenas fixture em memória |
| Simulação adicional de DML legado/RLS | Membro da organização excluiu 1 item; versão permaneceu 2 → 2 | Predicados equivalentes ao catálogo canônico, reproduzidos em PostgreSQL descartável |
| Fontes do preview | Cormorant Garamond/Work Sans e outras fontes declaradas não constam dos FontFace importados pelo Magazine | Fontes globais remotas foram bloqueadas pelo harness; seus erros não são incidentes de produção |

Comandos principais:

```bash
TZ=America/Sao_Paulo npx vitest run --retry=0 --maxWorkers=2 \
  src/pages/magazine tests/magazine src/services/__tests__/magazine \
  tests/integration/magazine-service-fuzz.test.ts \
  src/lib/security/__tests__/magazine-guard.test.ts
node tests/magazine/browser/server.mjs
node tests/magazine/browser/verify.mjs
npm run typecheck
bash scripts/test-magazine-hardening-v2.sh
```

Node v24.19.0; Vitest 4.1.11; Playwright 1.63.0. Foram utilizadas as dependências existentes, sem reinstalação nem mudança no lockfile. Isso não satisfaz sozinho o requisito de instalação limpa isolada da etapa 002.

O script PostgreSQL testa reaplicação/idempotência, compatibilidade legada, RPCs, reordenação, importação e corridas add/add, publish/add, publish/remove, duplicate/duplicate e import/import. **Parte dos testes roda após aplicar o draft restritivo no banco descartável; produção ainda está na fase anterior.** Portanto seu resultado verde não certifica as permissões atuais do canônico.

## Achados prioritários

### A01 — P1: permissões legadas deixam um caminho de escrita fora do CAS das RPCs

Evidência canônica:
- authenticated mantém INSERT/UPDATE/DELETE em magazines e magazine_items.
- As seis RPCs antigas *_atomic permanecem executáveis por authenticated.
- A policy magazine_items_via_owner_or_org é FOR ALL. Seu USING permite proprietário OU membro da organização; WITH CHECK restringe novas linhas ao proprietário.
- DELETE é autorizado pelo USING, não pelo WITH CHECK.
- O trigger magazine_items_guard_v2 valida estado/estrutura e bloqueia a revista, mas não exige ownership nem incrementa edit_version da revista para DML direto.
- magazine_lock_v2 faz ownership/admin e comparação atômica de versão, mas só protege os consumidores que a invocam.

Reprodução isolada: proprietário criou item em revista compartilhada; outra identidade da organização executou DELETE direto; resultado DELETE 1, zero itens restantes e edit_version inalterado em 2. A política de acesso reproduzida usa os mesmos predicados relevantes, mas o ambiente não é um clone completo do catálogo/RLS de produção.

Conclusão: há risco concreto no caminho legado e divergência em relação à UI, que diz que somente o proprietário edita. Não há evidência de exploração ou perda produtiva nesta auditoria. A proteção multiusuário via v2 existe, mas não é uma barreira universal enquanto DML direto continuar permitido.

A manutenção dos grants foi uma escolha de rollout documentada, não perda de migration. O draft `qa/migrations-draft/2026-09-09_magazine_rpc_only_contract.sql` não foi aplicado; exige smoke autenticado, revisão de consumidores e autorização específica. Não deve ser aplicado cegamente apenas porque este achado existe.

Fontes: draft acima; `supabase/migrations/20260909200000_magazine_hardening_v2.sql:371`; pg_catalog/pg_policies desta rodada.

### A02 — P1: “Limpar tudo” é parcial sob falha

`src/pages/magazine/components/steps/ProductsStep.tsx:191` executa um loop de onRemove, uma transação por item. A RPC magazine_remove_items_v2 aceita um array, mas `magazineService.removeItem` passa um único ID.

Cenário reproduzido no componente real: 9 itens; primeira remoção confirmada; segunda falha; 8 itens persistem. O toast admite interrupção, portanto não há falso sucesso nesse caso, mas o critério “tudo ou nada” das etapas 012/040 não foi atendido.

Necessário: operação de remoção em lote integrada ao serviço/hook/fila; proteção contra reentrada; testes de falha e concorrência. Não exige presumir nova tabela.

### A03 — P1/P2: recuperação de edição na saída permanece incompleta

`src/pages/magazine/useMagazineEditor.ts:73` faz flush best-effort no unmount e ignora a rejeição porque o componente saiu. Há beforeunload e ações próprias com flush aguardado, mas não há recuperação local isolada por conta/revista nem bloqueio abrangente da navegação do shell.

Conflitos são sinalizados, mas a mensagem orienta recarregar. Sem mecanismo de recuperação/mesclagem, recarregar pode descartar a edição local. Não considero etapa 010 concluída.

### A04 — P2: galeria continua usando placeholder em vez dos assets aprovados

`src/pages/magazine/templates-gallery/mockMagazine.ts:20`: PLACEHOLDER='/placeholder.svg'; os snapshots demonstrativos reutilizam esse fallback. TemplateCard e o modal consomem essa mesma fixture.

Autorizar usar assets atuais como aproximação não significa que essa integração foi feita. A vitrine não reproduz a identidade fotográfica das referências; esse gap é comprovado pelo código, não resolvido pela aprovação de testes geométricos.

### A05 — P2: registry e fontes divergem do que a interface promete

`TemplateRegistry.ts:47`: Vogue declara Cormorant Garamond/Work Sans; as referências indicam Playfair Display/Inter. Magazine continua classificado editorial; Manifesto também, com dois produtos/página; as referências indicam outras classificações/densidades. A ambiguidade do badge 2×3 deve ser resolvida sem reduzir seis produtos arbitrariamente.

`magazine.css:12` importa Playfair Display, DM Serif Display, Great Vibes e Inter. Há várias famílias no registry sem disponibilização correspondente: Instrument Serif, Archivo Black, Hind, Fira Sans, Sora, Manrope, Space Grotesk, DM Sans, entre outras.

Aplicar fontFamily na amostra não carrega a fonte. Registrar família licenciada/fallback e homologar card, renderer e PDF. Preservar os 12 templates e cores globais.

### A06 — P2: favoritos e “Mais recentes” da galeria são incompletos

`templates-gallery/useFavoriteTemplate.ts:11` usa a chave global magazine:favorite-template e guarda um único template, sem identidade de usuário/conta. Erro no storage é silenciado.
`MagazineTemplatesGalleryPage.tsx:99`: “recent” conserva a ordem do registry; não usa data real. Favorito também é promovido ao topo.

Criação com template foi corrigida e testada; isso não conclui os outros requisitos da etapa 025.

### A07 — P2: CRM limitado, erros confundidos com vazio e cache sem escopo de conta

`components/MagazineClientPicker.tsx:47`: queryKey constante, limit=200, filtro local e slice(0,40). Não encontra empresas fora do lote. O componente não trata isError; erro pode aparecer como “Nenhum cliente encontrado”.

O vínculo clientCrmId e a separação de texto/CNPJ foram corrigidos. Isolamento do cache e transição entre contas ainda exigem correção/teste específico; não afirmo vazamento produtivo ocorrido.

### A08 — P2: catálogo deixou de ter limite 80, mas completude ainda não é garantida

ProductsStep usa useProducts sem limit: houve avanço real. Porém `src/lib/external-db/products.ts:134` acumula páginas até limite/30 segundos; duas falhas de timeout interrompem e retornam produtos já coletados como array normal.

ProductsStep calcula categorias, quantidade e preço ordenado desse array sem indicador de truncamento. Portanto pode apresentar subconjunto como catálogo completo. Também renderiza todos os cards carregados, sem paginação visual/virtualização nesse componente.

Necessário: contrato explícito de paginação, total/completude e cancelamento; tratar timeouts sem “vazio/sucesso parcial” silencioso e medir desempenho com volume representativo.

### A09 — P2: favoritos de produtos não implementados; swatches decorativos

ProductsStep não contém integração de favorito de produto. Swatches são spans aria-hidden, não controles de escolha. Após inclusão existe VariantColorSelect por nome; isso não equivale a variante identificada com SKU/preço/imagem próprios em todo o fluxo.

O fallback sale_price ?? price preserva zero, e a imagem por cor no resumo é avanço existente. Não confundir esses acertos com a conclusão das etapas 038/039.

### A10 — P2: biblioteca ainda depende de uma listagem não paginada

`src/services/magazineService.ts:371` consulta revistas sem range/loop; os itens agregados foram paginados, as revistas não. KPIs/busca/status são calculados sobre a lista recebida, sujeitos ao teto da API.

`MagazineListPage.tsx:192` pesquisa título/subtítulo/cliente com toLowerCase, sem normalização de acento. Ordenação não inclui desempate por ID. É risco de escala/contrato, não prova de truncamento no volume produtivo atual.

### A11 — P2: PDF ainda não tem gate de prontidão e saída homologada

`MagazinePrintPage.tsx:93`: botão chama window.print() diretamente. Não aguarda document.fonts.ready e decodificação de todas as imagens nem oferece erro por asset faltante.

Flush antes da navegação, erro de leitura, CSS de impressão A4 e renderer comum existem. Browser comprovou transform removido na mídia print; não houve geração/inspeção de PDF integral com assets lentos, várias páginas e conteúdo real.

### A12 — P2: páginas estruturadas implementadas, mas não todas as interações da referência

StructuredPagesEditor cria seção/institucional, move por botões, edita conteúdo e persiste page_order v2. Contudo `StructuredPagesEditor.tsx:136` habilita duplicar/excluir apenas institucional/seção. Não há undo editorial; não há drag-and-drop editorial nesse componente.

PagesRail é um trilho de seleção: não contém “Nova página” nem menu por miniatura como R4. Existe funcionalidade em outro painel; isso é implementação parcial da experiência solicitada, não ausência total do modelo.

### A13 — P2: limites de Identidade ainda têm contrato ambíguo

IdentityStep mostra 80/200, mas não usa esses valores como limites de entrada; SQL permite título até 200 e subtítulo até 300. A cor de alerta no contador não explica se o limite é recomendação visual ou regra de negócio.

Não truncar dados antigos nem alterar constraints para imitar imagem. Definir mensagem e validação coerentes, cobrindo colagem de texto, vazio e legado.

### A14 — Governança: documento de execução contradiz o estado atual

Execução linhas 42/44 ainda diz PR1853 aberto e hardening não publicado. A tabela diz callers pendentes/ausência de CAS, embora serviço atual use RPCs v2. A antiga impossibilidade de ler Edge source também já não se aplica: leitura e paridade foram verificadas nesta rodada.

O checklist 0/50 de homologação é uma convenção conservadora do plano, não uma medição de ausência de implementação. Atualizar por evidências, sem substituir por “100%” só porque merge/testes passaram.

## Banco e Edge: o que ficou comprovado

Consulta oficial somente leitura no projeto doufsxqlfjyuvxuezpln:
- 15 versões de 09/09 previstas no conjunto de rollout presentes no ledger (incluem sitemap/ACL além do Magazine).
- 25 corpos de funções Magazine *_v2 e *_atomic comparados com a última definição local correspondente: 25 coincidentes, normalizando CRLF e espaços nas extremidades.
- Essa comparação é do corpo; assinaturas, SECURITY DEFINER, search_path e grants foram inspecionados separadamente. Não constitui diff integral de todo o schema Supabase.
- As 15 RPCs públicas v2 de mutação/importação existem; anon sem EXECUTE. Helpers não ficam executáveis por authenticated.
- magazines.edit_version bigint e CHECK nonnegative presentes.
- Triggers guard/version e items_guard ativos.
- RLS habilitada nos objetos magazine_* inventariados; anon sem SELECT direto nesses objetos.
- UNIQUE de produto por revista e posição presentes; posição DEFERRABLE; FKs magazines/owner/organization/template e itens→magazine presentes.
- Índices de ambas as FKs de magazine_duplicate_requests presentes.
- magazine_duplicate_requests sem acesso direto authenticated é intencional, não tabela abandonada.
- Três jobs Magazine ativos: partition-maintenance, cleanup-nightly e view-rollup-hourly. Existência/ativação não certifica sucesso de toda execução histórica.

Paridade de Edge Functions: todos os arquivos retornados do bundle comparados ao repositório, normalizando finais de linha/espaço final:
- magazine-public-view versão 40: coincide.
- magazine-import-local versão 42: coincide.
- magazine-public-react versão 40: coincide.

Não fiz chamadas produtivas que criam views/reactions/importações; não publiquei/revoguei revista de cliente. Fluxo público completo e importação autenticada seguem sem homologação E2E nesta rodada.

## Matriz das 50 etapas

Legenda: **V** = núcleo implementado e validado no escopo indicado, não aceite produtivo integral; **P** = parcial; **A** = requisito ausente; **B** = validação/decisão pendente. Cada linha lista o restante necessário; nenhuma equivale a aprovação automática do plano inteiro.

| Etapa | Estado | Evidência atual / restante para encerramento |
|---|---|---|
| 001 | P | SHAs/PRs reconciliados nesta auditoria; documentos do repositório ainda precisam refletir o estado real. |
| 002 | P | Versões registradas, mocks e PostgreSQL isolados; não repetida instalação limpa em worktree separada. |
| 003 | P | Contratos de persistência incorporados e verdes; baseline visual completo R1–R5 não homologado. |
| 004 | P | Cores preservadas, páginas estruturadas e aproximação de assets autorizadas; fonte/densidade/favoritos ainda carecem reconciliação. |
| 005 | V | pg_catalog, funções, ACL/RLS, constraints, índices, triggers e jobs relevantes consultados; risco A01 registrado. |
| 006 | V | Autosave envia EditorPatch de metadados, não reescreve itens; suite de regressão aprovada. |
| 007 | V | IDs estáveis, reconciliação e controle de retorno confirmado no serviço/fila; testes verdes. |
| 008 | P | Fila e CAS via v2 funcionam; DML legado pode escapar da versão e recuperação de conflito é limitada. |
| 009 | V | dirty/saving/error e flush real/Ctrl+S/falha-retry aprovados em teste. |
| 010 | P | Flush em ações próprias + beforeunload; falta recuperação offline e proteção geral do shell. |
| 011 | V | RPCs transacionais aplicadas e corpos coincidentes; cenários PG locais aprovados. |
| 012 | P | Add/reorder v2 integrados; clear-all usa sequência individual e falha parcialmente. |
| 013 | P | Lista/editor tratam erro vs vazio; CRM ainda oculta erro, catálogo pode retornar parcial. |
| 014 | P | Publicação/revogação versionadas, token/estado e testes SQL existem; lifecycle autenticado+anônimo real não exercitado. |
| 015 | P | Bateria de integridade passa; novos cenários A01/A02 impedem considerar gate global encerrado. |
| 016 | V | Escala/origem e Fit aprovados no browser existente; não é certificação visual integral. |
| 017 | V | CSS A4 compartilhado e galeria fria aprovados no harness; sem mudar tema global. |
| 018 | P | Amostras recebem fontFamily; várias fontes prometidas não estão carregadas. |
| 019 | P | Navegação/zoom/Fit/tela cheia têm implementação; falta bateria completa de foco/teclado/fullscreen real. |
| 020 | P | Renderer/print CSS/flush existem; faltam prontidão e validação de PDF completo. |
| 021 | P | 12 templates preservados; metadados dos oito de referência ainda divergem. |
| 022 | A | Assets aproximados aprovados não integrados à vitrine, que usa placeholder.svg. |
| 023 | P | Componentes dos 12 templates existem e correções de crash foram mergeadas; composições de referência não homologadas. |
| 024 | P | Modal com descrição, especificações, características, fontes/paleta; depende de fontes/metadata e aceite geométrico. |
| 025 | P | Criação e retorno seguro testados; favoritos não são por conta e “recentes” não usa recência. |
| 026 | P | Header/cinco KPIs/status/grade-lista existem; contagem global limitada à listagem recebida. |
| 027 | P | Cards/CTAs/menu por status e lista mobile testados; paridade fullshell/referência pendente. |
| 028 | P | Busca inclui subtítulo; falta paginação global, normalização de acentos e desempate estável. |
| 029 | P | Duplicate idempotente e delete/restore v2 existem; falta fluxo real com undo concorrente e resolver caminho direto legado. |
| 030 | P | Consumidores principais usam revista-publica; Edge coincide; lifecycle real de token não homologado. |
| 031 | P | Busca textual não casa com CNPJ vazio; limite200/filtro40/erro/paginação ainda abertos. |
| 032 | P | clientCrmId persistido e seleção por ID; isolamento de cache/contas e overrides completos pendentes. |
| 033 | P | Contadores e formulário existem; 80/200 não conciliado com regra/legado 200/300. |
| 034 | V | Sincronização do hex/presets coberta em regressão; hook de tema global é no-op. |
| 035 | P | Cinco etapas, save real e layout responsivo implementados; shell completo, foco e paridade visual pendentes. |
| 036 | P | Lote fixo80 removido; bridge pode retornar parcial e não há paginação visual/virtualização adequada. |
| 037 | P | Map preserva seleção entre filtros e retry; seleção depende de snapshot, falta ciclo completo com indisponibilidade e backend real. |
| 038 | A | Favoritos de produtos não integrados no ProductsStep. |
| 039 | P | sale_price zero e seleção de cor posterior existem; swatches/variante identificada/preço por variante incompletos. |
| 040 | P | Resumo usa paginateMagazine; limpar tudo não atômico e completude do catálogo pendente. |
| 041 | V | Modelo v2 de páginas estruturadas, IDs e compatibilidade legada implementados/testados. |
| 042 | V | page_order persistido/validado por v2, corpos SQL coincidentes, testes isolados aprovados. |
| 043 | P | Cria/edita/duplica/exclui institucional/seção; não todos os tipos/undo nem gestão no trilho da referência. |
| 044 | P | Paginação determinística e mover por botões; drag-and-drop editorial e homologação concorrente ponta a ponta ausentes. |
| 045 | P | Renderer/paginador compartilhados e institucional/contato testados; público/PDF real não homologados. |
| 046 | P | 831 testes e11 browser verdes; cobertura ainda não bloqueia A01/A02 nem fechamento de todos os gaps. |
| 047 | B | Falta E2E autenticado completo em ambiente de teste autorizado com perfis/fixtures/backend compatível. |
| 048 | B | Falta comparação visual R1–R5 no shell completo, aceite PO e orçamento de desempenho medido. |
| 049 | P | Rollout expand aplicado/coincidente; contração RPC-only permanece propositalmente pendente de gates/autorização. |
| 050 | P | Merges e produção confirmados; documentação, gaps e homologação impedem declarar plano concluído. |

## Sequência recomendada, sem executar correções nesta auditoria

1. Tratar A01 com revisão de todos os consumidores e teste de migração expand→contract; decidir rollout autorizado. Enquanto isso, registrar claramente que CAS não protege escritas legadas diretas.
2. Integrar clear-all em uma única chamada da RPC já existente e converter reprodução A02 em teste bloqueante.
3. Fechar proteção de saída e recuperação de conflito sem perder rascunhos.
4. Corrigir CRM/catálogo/biblioteca: paginação/completude/erros/cache por identidade.
5. Integrar assets autorizados e conciliar registry/fontes com as referências, preservando cores e 12 templates.
6. Completar favoritos/variantes/páginas e prontidão PDF.
7. Homologar fluxo autenticado e público em ambiente controlado; comparar visualmente R1–R5 no shell real.
8. Conciliar execução/plano com evidências de cada etapa e só então encerrar os gates.

## Artefatos locais desta revisão

- /tmp/magazine-audit-20260928-vitest.log
- /tmp/magazine-audit-20260928-browser.log
- /tmp/magazine-browser-results-9suQ7I/verified-results.json
- /tmp/magazine-audit-20260928-typecheck.log
- /tmp/magazine-audit-20260928-postgres.log
- /tmp/magazine-audit-20260928-extra.mjs
- /tmp/magazine-audit-20260928-extra-final.log
- /tmp/magazine-audit-20260928-legacy.sql
- /tmp/magazine-audit-20260928-legacy.sh
- /tmp/magazine-audit-20260928-legacy.log

Os containers descartáveis de teste foram removidos pelos traps dos scripts; nenhum dado produtivo foi removido. Logs e scripts temporários foram preservados. O servidor local do harness foi encerrado ao finalizar.
