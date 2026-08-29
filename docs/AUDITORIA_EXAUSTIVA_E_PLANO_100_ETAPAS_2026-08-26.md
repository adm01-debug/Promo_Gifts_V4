# Auditoria exaustiva do Promo Gifts V4 e plano de 100 etapas

- **Data da fotografia:** 26 de agosto de 2026
- **Repositório/branch:** `adm01-debug/Promo_Gifts_V4`, `main`
- **Commit auditado:** `e42fc237eabe8855304eb90db84e4b46b8ebab91`
- **Supabase canônico:** `doufsxqlfjyuvxuezpln`
- **Modo da auditoria:** código somente leitura; banco consultado somente por `pg_catalog`/SQL de leitura
- **Alteração versionável desta entrega:** apenas este documento; o Graphify gerou artefatos locais ignorados pelo Git e a validação instalou dependências em `node_modules`, também ignorado. Nenhum código funcional, dado, tabela, coluna, constraint, índice, policy, função, trigger, view, enum, privilégio, job ou migration foi alterado

**Parecer:** ainda não liberar uma nova versão. Os três bloqueios principais são contrato código↔banco desatualizado, ambiente de dependências/migrations não determinístico e ausência de CI remoto executando nos gates inspecionados. A próxima decisão do PO é confirmar a matriz de fluxos críticos da etapa 2; nenhuma faxina ou mudança de banco é pré-condição para essa decisão.

## Conclusão executiva

O sistema tem, de fato, uma superfície funcional e visual grande e madura. O build de produção conclui, os guardas do Supabase canônico passam e a suíte selecionada `test:ci-core` apresenta 855 de 855 casos aprovados. Essa suíte cobre somente 28 dos 1.207 arquivos `test/spec` encontrados em `src`/`tests`, além de não cobrir os 568 arquivos `test/spec` em `e2e`; portanto ela é um sinal positivo localizado, não uma taxa geral de aprovação. A orientação correta é preservar o design e trabalhar por contratos, com mudanças pequenas, reversíveis e protegidas por testes de regressão.

O banco canônico não apresenta sinal de colapso estrutural nem evidência de perda generalizada de schema. As 391 relações tabulares (`relkind r/p`) possuem chave primária; todos os 1.170 índices estão válidos/prontos; não há constraint não validada nem trigger de usuário desabilitado. A hipótese predominante é que a maior parte das diferenças desde julho seja evolução intencional, mas a classificação permanece provisória até reconciliar principalmente os 72 índices a menos, ACLs e objetos live-only.

O risco principal está na ligação entre as camadas. O `types.ts` declara 153 tabelas, mas só 135 correspondem às 391 tabelas vivas; declara quatro views, mas só duas correspondem às 196 views/materialized views atuais. Ele omite 256 tabelas e 194 views existentes e ainda contém 18 tabelas e duas views inexistentes. Há Edge Functions que consultam objetos ausentes, uma RPC inexistente consumida por dois hooks, uma chamada dormente a RPC deliberadamente ausente, gates locais quebrados antes de executar a verificação e uma cadeia de migrations que não é deterministicamente reproduzível.

A percepção de “90% pronto” é plausível para interface e fluxos mais usados, mas ainda não é uma medida segura de prontidão de release. Hoje não há sinal agregado confiável de CI: os 30 runs mais recentes aparecem vermelhos; nos dois gates inspecionados, os jobs nem começaram porque o orçamento bloqueou a execução. Os outros 28 ainda não tiveram causa classificada, portanto vermelho não significa que todos estejam quebrados nem que todos falharam por orçamento.

Não foi encontrado “lixo” que possa ser apagado automaticamente. Foram encontrados candidatos fortes a consolidação — documentos duplicados por caixa, logos idênticos, relatórios históricos potencialmente sobrepostos e um teste duplicado — mas toda remoção ficou apenas proposta para validação do PO. Migrations, snapshots, fixtures e tabelas vazias não foram classificados como lixo.

## Parecer de prontidão

| Área | Estado observado | Parecer |
|---|---|---|
| Design/UI | Grande cobertura de páginas e componentes; nenhuma mudança visual feita | Preservar e cercar com regressão visual antes das correções |
| Build de produção | Aprovado, 6.220 módulos | Funcional, com dívida de chunking e avisos de Vite |
| Testes de núcleo | 839 aprovados, um reprovado na suíte selecionada de 26 arquivos | Suíte localizada quase verde; não representa a cobertura total do repositório |
| Typecheck | Oito erros | Gate obrigatório antes de release |
| Lint | Não chega a executar | Infraestrutura do gate quebrada |
| Banco | Estruturalmente íntegro | Não há justificativa para “faxina” destrutiva |
| Código ↔ banco | Drift severo de tipos e referências | Maior frente técnica imediata |
| Migrations | 1.673 arquivos, colisões de versão e nomes inválidos | Reprodutibilidade insuficiente até reconciliar ledger |
| CI remoto | 30/30 runs recentes marcados como falha; dois gates amostrados bloqueados por orçamento | Sinal agregado inconclusivo; 28 causas ainda não classificadas |
| Segurança | Controles extensos, com exceções pontuais | Registrar; tratar depois da estabilização funcional conforme prioridade do PO |
| Limpeza do repo | Há candidatos, nenhum autorizado | Fazer somente em lotes aprovados e reversíveis |

## Escopo e método

Foram examinados o repositório, as relações entre arquivos, o grafo sintático/semântico, os contratos TypeScript, rotas, hooks, serviços, páginas, componentes, Edge Functions, scripts, workflows, testes, migrations e o banco canônico.

O levantamento combinou:

- fotografia Git do commit e do worktree;
- inventário de 6.534 arquivos, com 5.958 arquivos de código, 529 documentos, quatro papers e 43 imagens;
- grafo AST com 27.294 nós e 52.097 arestas, além da extração semântica documental;
- busca de referências literais a `.from()`, `.rpc()` e `functions.invoke()`;
- comparação entre os nomes gerados em `src/integrations/supabase/types.ts` e o catálogo vivo;
- build, typecheck, testes de núcleo, gates SSOT, checks de rotas, bundle e scripts de QA;
- consultas somente leitura a `pg_catalog`, `cron` e ao ledger `supabase_migrations`;
- inspeção dos runs recentes do GitHub Actions e de suas anotações.

Limitações conscientes:

- não foram feitos DDL, DML, refresh de view, deploy, chamada mutante ou alteração de configuração;
- integrações externas sem credenciais não foram exercitadas ponta a ponta;
- `reltuples = 0` é estimativa estatística, não prova de tabela literalmente vazia; um `count(*)` exato em 391 tabelas seria desnecessariamente invasivo/caro;
- ausência de referência literal no frontend não prova abandono: tabelas podem ser usadas por RPC, view, trigger, cron ou Edge Function;
- a auditoria identifica dívida e perda de contrato; implementação e remoção dependem das aprovações indicadas no plano.

O extrator AST produziu 27.294 nós e 52.097 arestas brutas; depois da união semântica, validação de endpoints e deduplicação de pares, o grafo final reuniu 29.262 nós e 37.649 arestas. O diagnóstico marcou 15.843 arestas com endpoint não materializado, 11 self-loops e colapsos de pares em um corpus muito grande e fragmentado. Por honestidade metodológica, ele foi usado para descoberta/navegação; nenhum achado crítico dependeu exclusivamente de uma aresta do Graphify. As conclusões foram reconfirmadas por código, testes ou `pg_catalog`. Os artefatos locais gerados são `graphify-out/graph.json` (SHA-256 `1e7317925357950480261a4a24a872fbf0290be851f6141eca667fc479c60b18`) e `graphify-out/graph.html` (SHA-256 `73661996b6150157052eb488c674bbdb8e67b85a5295f5674293df78ece3dfa1`); ambos são ignorados pelo Git.

## Mapa estrutural

| Camada | Conteúdo observado | Volume |
|---|---|---:|
| Frontend | React + TypeScript + Vite, páginas, componentes, hooks, contexts, serviços | 2.565 arquivos em `src` |
| Componentes | Catálogo, admin, orçamento, estoque, mockup, revistas, kits, CRM, BI | 1.302 arquivos em `src/components` |
| Hooks | Acesso a dados, domínio, inteligência, estoque, kits e integrações | 419 arquivos em `src/hooks` |
| Páginas | Rotas públicas, autenticadas e administrativas | 317 arquivos em `src/pages` |
| Bibliotecas | Supabase, contratos, adapters, telemetria e domínio | 301 arquivos em `src/lib` |
| Backend | Supabase Edge Functions, `_shared` e contratos | 105 diretórios com `index.ts` |
| Banco como código | Migrations e snapshots | 1.673 migrations `.sql` |
| Testes | Unitários/contratos e E2E | 639 arquivos em `tests`; 652 em `e2e` |
| Automação | GitHub Actions | 107 arquivos em `.github/workflows` |
| Scripts | QA, auditoria, validação, gates e manutenção | 187 arquivos em `scripts` |
| Documentação | Arquitetura, runbooks, auditorias e referências | 297 arquivos em `docs` |

O fluxo de dados segue a convenção Medallion declarada pelo projeto: ingestão/bronze, normalização/silver e modelos/views/RPCs de consumo/gold. O frontend consome Supabase diretamente, por hooks/serviços, e indiretamente por RPCs e Edge Functions. As integrações externas também usam clientes separados; por isso nomes como `contacts`, `customers` e `product_categories` não podem ser julgados contra o schema canônico sem observar qual cliente é usado.

## Evidências de build, testes e gates

| Verificação | Resultado | Diagnóstico |
|---|---|---|
| `node scripts/validate-supabase-config.mjs` | Passou | Projeto canônico e guarda SSOT preservados |
| `npm run ssot:all` | Passou | Invariantes do Supabase canônico preservados |
| `npm run build` | Passou | 6.220 módulos; avisos de plugin React, imports dinâmicos e chunks grandes |
| `npm run qa:typecheck` | Falhou | Oito erros objetivos descritos abaixo |
| `npm run test:ci-core -- --reporter=dot` | Falhou por um caso | 25 arquivos passaram, um falhou; 839 testes passaram, um falhou |
| `npm run lint:baseline` | Quebrou antes do lint | Import default incompatível de `minimatch` em `check-eslint-baseline.mjs` |
| `npm run check:package-duplicate-scripts` | Quebrou antes do check | Parser próprio trata a aspa final como início de nova string |
| `npm run ci:verify` | Passou | Executa outro `vite build`; prova integridade de build/JSX, não a estrutura do CI |
| Checks de rota/error-element/asChild | Passaram | Contratos estruturais de roteamento aprovados |
| `npm run check:bundle-size` | Falhou | Baselines de vendor obsoletos; chunk de produtos é observação separada, não a violação atual |
| `npm run check:critical-coverage` | Falhou | `coverage-summary.json` ausente; produtor cobre só dois módulos e o gate procura três paths inexistentes |
| `npm run check:migration-refs` | Falhou | 27 referências ausentes, incluindo documentação/cache desatualizados |
| Gate CORS/Request-ID | Passou | Valida uso do helper/headers e presença de `x-request-id`; não exercita o contrato CORS completo em runtime |
| Checks DB dependentes de segredo | Pularam | Retornam verde/skip sem credenciais, criando risco de falso positivo |

### Erros atuais de TypeScript

- `src/App.tsx:95`: `BrowserRouter` do React Router 7 não aceita mais a prop `future` usada no código.
- `src/components/effects/PageTransition.tsx:121,137,143,145,158,170`: seis usos de `motion` sem import/definição. Os helpers secundários parecem pouco ou não utilizados hoje, mas quebram assim que forem consumidos.
- `src/hooks/intelligence/useStockVelocityPrefetch.ts:72`: `mv_stock_velocity` existe no banco, porém não existe nos tipos gerados; é drift de contrato, não perda da view.

### Teste de núcleo reprovado

`tests/contracts/migrated-endpoints.contract.test.ts:179` espera um objeto sem `focus`; o schema atual acrescenta `focus: "auto"` como default. A evidência favorece teste de contrato desatualizado, não defeito do comportamento. A correção deve validar a intenção do contrato antes de mudar snapshot/expectativa.

O resultado 839/840 é restrito ao comando selecionado no `package.json`. Durante a suíte de filtros, duas falhas reais de `fetch` ao Supabase foram emitidas no console sem reprovar os cinco testes daquele arquivo; o Vitest também avisa que `test.poolOptions` foi removido. Rede inesperada, erros de console e rejeições não tratadas precisam passar a falhar o teste apropriado para evitar falsos verdes.

### Dependências e locks

- `package.json` e `package-lock.json` apontam para React `^19.2.8`; `bun.lock` ainda aponta para React/React DOM `^18.3.1`.
- o repositório declara `npm@10.9.7`, mas mantém lock de Bun divergente;
- `npm ci --ignore-scripts` falha por `cmdk@0.2.1` declarar peer de React 18;
- a instalação somente conclui com `--legacy-peer-deps`;
- `@types/react` permanece na família 18 enquanto a aplicação usa React 19;
- `package.json` contém 228 scripts; o verificador de duplicidade quebra, embora a extração direta tenha encontrado 228 chaves distintas.

A instalação reportou cinco vulnerabilidades de severidade alta. Conforme a prioridade atual do PO, nenhum `audit fix`, upgrade automático ou mudança de segurança foi aplicado; o item fica registrado para uma fase posterior, porque correção automática de dependência poderia alterar comportamento.

Isso torna a instalação dependente de uma flag permissiva e explica parte das incompatibilidades de Vite/Vitest/React Router.

### Bundle e complexidade

O JavaScript total gerado foi de aproximadamente 11,09 MB, abaixo do teto global de 13,07 MB, mas com 387 chunks. A falha atual do gate é causada pelos baselines de vendor: `react-vendor` mede cerca de 175,1 KB contra baseline impossível de 225 bytes e `router-vendor` mede 47,4 KB contra 30 KB. O chunk de produtos chega a 852,6 KB, mas está abaixo do limite global e não é a violação atual; é candidato a medição por rota e tamanho gzip antes de concluir impacto na carga inicial ou exigir code splitting.

Arquivos de produção especialmente grandes e que merecem decomposição sem redesign:

- `QuoteBuilderSummaryColumn.tsx`, aproximadamente 83 KB;
- `VisualSearchPage.tsx`, aproximadamente 68 KB;
- `PromoFlixPlayer.tsx`, aproximadamente 57 KB;
- `SellerCartsPage.tsx`, aproximadamente 52 KB;
- `useSellerCarts.ts`, aproximadamente 48 KB.

No código de produção foram observados 54 `as any`, um `@ts-ignore`, um `@ts-expect-error`, 177 `eslint-disable` e 65 `console.*`. A baseline de `any` declara somente um caso, portanto a própria medição está fora de sincronia. O maior foco de supressões está em `expert-chat` e `materials-api`.

## Achados priorizados

| ID | Severidade | Achado | Impacto | Natureza |
|---|---|---|---|---|
| A-01 | P1 | `types.ts` cobre fração pequena do schema vivo e mantém objetos fantasmas | Type safety falsa, casts, queries bloqueadas e regressões silenciosas | Perda real de contrato |
| A-02 | P1 | Edge Functions consultam tabelas inexistentes no canônico | 500, telemetria perdida ou fluxo sem persistência | Implementação parcial/quebrada |
| A-03 | P1 | `fn_ema_pipeline_health` é consumida por dois hooks e não existe | Painéis/diagnóstico de estoque incompletos | Perda real de contrato |
| A-04 | P1 | Instalação limpa exige `--legacy-peer-deps`; locks divergem | Ambiente não reproduzível | Dívida de release |
| A-05 | P1 | Dois gates remotos amostrados não iniciaram por bloqueio de orçamento; 28 runs vermelhos ainda não foram classificados | Nenhuma garantia remota confiável | Bloqueio operacional/investigação pendente |
| A-06 | P1 | 37 versões locais de migration colidem e 33 nomes não têm versão inicial | Ordem ambígua e reconstrução insegura | Dívida estrutural |
| A-07 | P1 | `webhook-inbound` diverge do destino, versionamento e testes declarados | Modo padrão falha; payload inválido pode virar `unknown`; testes não executam o handler real | Defeito funcional/contratual provável |
| A-08 | P1 | `simulation-orchestrator` usa tabelas ausentes e contabiliza vários 4xx/5xx como sucesso | Rota ativa pode produzir relatório HTTP 200 e falso verde sem persistência confiável | Implementação parcial/quebrada |
| A-09 | P1 | Ações locais de `bitrix-sync` usam três tabelas ausentes e `sync_full` responde sucesso mesmo com erro de upsert | Sync/consultas armazenadas falham ou produzem falso verde; ações diretas via API não são afetadas | Implementação parcial por ação |
| A-10 | P2 | Oito erros de TypeScript | Gate de qualidade vermelho | Correção localizada |
| A-11 | P2 | Lint e detector de scripts quebram antes de analisar | Falso senso de qualidade | Infraestrutura de QA |
| A-12 | P2 | Um contrato de teste está desatualizado | Núcleo 839/840 | Teste/contrato a reconciliar |
| A-13 | P2 | Baselines de vendor obsoletos quebram o gate; chunk de produtos merece medição separada | Gate vermelho e dívida de performance ainda não quantificada por rota | Performance/QA |
| A-14 | P1 | BI e badges misturam dados reais e simulados enquanto algumas respostas mantêm `isMock:false` | Simulação pode alimentar notificações, IA, PDF/PPTX, resumo comercial, WhatsApp e badges como se fosse fato | Implementação parcial/falso dado |
| A-15 | P2 | Dois crons estão desativados e um job de vacuum falhou | Fila/pipeline pode não rodar; manutenção sem sucesso | Operação de banco |
| A-16 | P2 | Partição futura de histórico tem RLS desligado e grants a `authenticated` | Acesso direto potencial | Segurança registrada, não alterada |
| A-17 | P2 | Checks que dependem de segredo pulam e podem ficar verdes | Gate falso positivo | QA/segurança |
| A-18 | P2 | Auditoria DB↔frontend pode retornar sucesso sem `psql` e omitir o banco | Relatório enganoso | Ferramenta de auditoria |
| A-19 | P2 | Config explícita cobre 39 de 105 Edge Functions | Drift de deploy/JWT difícil de provar | Governança de backend |
| A-20 | P3 | Duplicatas documentais, logos idênticos e teste duplicado | Ruído e custo cognitivo | Candidato a limpeza com aprovação |
| A-21 | P1 | `fn_super_filtro` voltou a ter EXECUTE para `PUBLIC`/`anon`, contrariando migrations 046/059 | RPC `SECURITY DEFINER` autenticada ficou novamente exposta | Drift real de ACL |
| A-22 | P1 | Nove views voltaram a `security_invoker=false` após migration 063 exigir `true` em todas | Segurança/semântica das views diverge do histórico versionado | Drift real a reconciliar |
| A-23 | P1 | Há versões aplicadas ausentes do repo e os efeitos nomeados da migration RLS de 12/07 não correspondem ao catálogo atual | Banco não é reproduzível pelo repositório atual | Perda real de histórico/drift não reconciliado |
| A-24 | P2 | `runAuthAudit` chama deliberadamente `check_auth_config_status` ausente, mas nenhum caller/import foi encontrado | Código dormente retorna falha se futuramente ligado | Dívida latente, não quebra ativa comprovada |

P0: não foi encontrada evidência de corrupção ativa, perda maciça de dados ou objeto estrutural inválido. Isso não elimina os P1; apenas evita uma intervenção destrutiva precipitada.

## Banco canônico — inventário por `pg_catalog`

### Relações e colunas

| Objeto | Quantidade |
|---|---:|
| Tabelas ordinárias em `public` | 389 |
| Tabelas particionadas em `public` | 2 |
| Relações tabulares (`r` + `p`) | 391 |
| Atributos dessas relações | 5.086 |
| Colunas de todas as relações, incluindo views/MVs | 7.723 |
| Views | 192 |
| Materialized views em `public` | 4 |
| Sequences | 23 |

As quatro materialized views públicas — `mv_ema_kpi_by_level`, `mv_product_images_audit`, `mv_stock_rupture_alert` e `mv_supplier_reliability` — têm `relispopulated=true` e estimativas não zero de 5, 72.007, 19.365 e 3 linhas, respectivamente; isso não é um `count(*)` exato. `mv_product_leaf_category`, anteriormente contada em `public`, foi movida para `internal` e permanece com conteúdo estimado; não há evidência de perda. As materializações analíticas `mv_product_intelligence` e `mv_stock_velocity` existem na camada analítica e são expostas por views públicas.

Comparação com `docs/SCHEMA_REFERENCE.md` de 16/07/2026:

| Objeto | Referência de julho | Atual | Leitura |
|---|---:|---:|---|
| Relações tabulares | 388 | 391 | +3; duas partições são explicadas, tabela de auditoria ainda não reconciliada |
| Posições de coluna em relações | 7.571 | 7.723 | +152 aparente; inclui repetição em partições/projeções e o predicado histórico é incerto |
| Views | 190 | 192 | +2 |
| Views com `security_invoker=false` | 0 | 9 | Regressão de postura contra a migration 063 |
| Materialized views públicas | 5 | 4 | Uma foi movida para `internal`, não perdida |
| Overloads de função | 1.277 | 1.280 | +3 |
| Policies | 906 | 927 | +21 |
| Triggers | 385 | 385 | Estável |
| Índices | 1.242 | 1.170 | -72; existem migrations de deduplicação, mas cada remoção deve ser reconciliada |
| Foreign keys | 395 | 396 | +1 |
| Cron jobs | 136 | 137 | +1; ativos passaram de 134 para 135 |

Não foi encontrado índice atual inválido, mas a redução de 72 índices não deve ser rotulada automaticamente como intencional: o histórico local contém migrations explícitas de remoção de duplicados, porém a comprovação final exige o diff de nomes/definições e planos de consulta.

### Constraints e índices

| Objeto | Quantidade | Integridade |
|---|---:|---|
| Primary keys | 391 | Todas as relações tabulares têm PK |
| Foreign keys | 396 | Nenhuma não validada |
| Unique constraints | 190 | Nenhuma não validada |
| Check constraints | 347 | Nenhuma não validada |
| Índices | 1.170 | Todos válidos e prontos |
| Índices únicos | 632 | Incluem 391 índices de PK |

Não foi encontrado índice inválido/unready nem constraint marcada `NOT VALID`. Isso é evidência forte de saúde estrutural, mas não prova que todos os índices sejam necessários ou que nenhum índice adicional seja útil.

### RLS e policies

- 390 das 391 tabelas têm RLS habilitado; `mcp_api_keys` usa `FORCE ROW LEVEL SECURITY`.
- existem 927 policies sobre 388 relações.
- `anon_catalog_grant_audit_log` tem RLS e nenhum policy: embora haja grants de mutação, a ausência de policy mantém `anon`/`authenticated` bloqueados; a intenção de `deny-all` é provável, mas sua criação não foi reconciliada com o repo.
- a partição futura `magazine_public_view_events_2026_11` tem RLS sem policy e sem grant direto para `anon`/`authenticated`; o pai possui a política aplicável ao acesso normal, comportamento explicitado pela migration de hardening de partições.
- `supplier_products_raw_history_p2026_11` é a única relação tabular sem RLS. É uma partição futura, mas possui grants diretos de `SELECT/INSERT/UPDATE/DELETE` a `authenticated`; deve ser corrigida antes de entrar em uso, mediante autorização de schema.

### Funções, triggers e views

| Objeto | Quantidade |
|---|---:|
| Overloads de rotinas públicas | 1.280 |
| Nomes distintos de rotina | 1.273 |
| Rotinas PL/pgSQL | 1.078 |
| Rotinas SQL | 202 |
| `SECURITY DEFINER` | 530 |
| `SECURITY INVOKER` | 750 |
| Triggers não internos | 385 |
| Triggers de usuário desabilitados | 0 |

Das 192 views públicas, 183 são `security_invoker`. Nove usam `security_invoker = false`: `v_kit_component_media_public`, `v_kit_component_print_areas_public`, `v_product_compositions_public`, `v_product_properties_public`, `v_product_tags_public`, `v_products_public`, `v_suppliers_public`, `v_tabela_preco_gravacao_oficial_public` e `v_variant_sale_prices_public`. Isso é drift, não exceção comprovadamente intencional: a migration posterior `20260717000063_fix_public_grant_revoke_and_analytics_schema.sql` faz sweep de todas as views públicas para `security_invoker=true`. Recriação posterior ou migration live-only precisa ser reconciliada antes de qualquer mudança.

`vw_image_type_dropblockers` tem criação explícita no repo como inspeção de catálogo. `vw_spot_color_separator_reference` é constante no banco vivo, mas o repo só contém ALTER/REVOKE, sem sua criação; deve ser classificada como objeto live-only não reconciliado, não como abandono.

Das 530 rotinas `SECURITY DEFINER`, 10 são executáveis efetivamente por `anon`, 70 por `authenticated` e uma por `PUBLIC`; a análise deve ser por assinatura, não só por nome. A assinatura `fn_super_filtro(text,text,uuid,text[],boolean,numeric,numeric,text[],boolean,boolean,boolean,boolean,text[],text[],text[],text[],boolean,integer,integer,text)` tem EXECUTE para `PUBLIC` (OID 0), `anon`, `authenticated` e `service_role`. Isso contradiz `20260716000059_fix_revoke_public_grant_catalog_functions.sql`, que documenta “auth required” e revoga `PUBLIC`; é regressão/drift de ACL confirmada, registrada sem alteração.

### Enums e extensões

O banco possui 28 enums no total, 15 no schema `public`. Cinco enums públicos não são usados diretamente por coluna: `categoria_cor_enum`, `familia_cor_enum`, `payment_status`, `silver_norm_status` e `tipo_cor_enum`. Isso não autoriza remoção: podem ser contrato de função, legado de migration ou reserva de evolução. Os enums em uso incluem papéis, conversas, magazines, organizações, step-up e status de fornecedor/raw.

As 16 extensões observadas são: `http`, `hypopg`, `index_advisor`, `moddatetime`, `pg_cron` 1.6.4, `pg_graphql`, `pg_net`, `pg_stat_statements`, `pg_trgm`, `pgcrypto`, `pgmq`, `plpgsql`, `supabase_vault`, `unaccent`, `uuid-ossp` e `wrappers`. Nenhuma foi classificada como lixo.

### Privilégios

Os ACLs explícitos são amplos. A contagem abaixo abrange relações, incluindo tabelas, views e MVs; por isso pode exceder as 391 relações tabulares. Nas tabelas, RLS é a barreira complementar: `anon` tem grant direto de `SELECT` em 56 relações, `INSERT` em 231 e `UPDATE`/`DELETE` em 229; `authenticated` tem `SELECT` em 432 e mutação em mais de 330. Em views/MVs não há RLS próprio equivalente: segurança depende de ACL, `security_invoker`/owner e das bases. Grant não equivale a acesso efetivo em tabela com RLS, mas torna qualquer partição sem RLS especialmente relevante.

Nenhum privilégio foi modificado. A recomendação é inventariar endpoint por endpoint depois da estabilização funcional, sem revogação em massa.

### Jobs e cron

Existem 137 jobs, 135 ativos. As exceções relevantes são:

- `process-webhook-outbox`, a cada minuto, foi desativado deliberadamente por ausência de `WEBHOOK_DISPATCHER_URL`, conforme migration local sem prefixo numérico; é mitigação intencional ainda não resolvida e a fila não será drenada por esse job;
- `pipeline-classify-categories`, a cada dez minutos, desativado e sem execução: confirmar se o pipeline foi substituído ou abandonado;
- `vacuum-high-dead-tuples`, semanal, ativo: uma falha em 23/08/2026 e nenhum sucesso nos sete dias observados.

Jobs sem execução recente não foram automaticamente considerados defeituosos: agendamentos mensais e jobs condicionais podem estar corretos.

### Migrations e ledger

O ledger vivo contém 2.354 versões, todas distintas, de `001` até `20260718135800`. A pasta local contém 1.673 arquivos `.sql`, dos quais 1.581 versões iniciais distintas. Foram encontrados:

- 37 valores de versão repetidos entre arquivos diferentes;
- 33 arquivos sem timestamp/versão numérica no início do nome;
- 31 arquivos com menos de 100 bytes;
- 13 grupos de conteúdo exatamente duplicado, abrangendo 74 arquivos — muitos são marcadores/aplicados vazios, mas há duplicatas de SQL real;
- 27 referências de migration ausentes segundo o check local.

A diferença bruta entre ledger e arquivos não basta sozinha, mas o levantamento anterior versionado em `docs/estado/13_RUNTIME_BANCO.md` comprovou, no recorte de julho, 150 de 152 versões aplicadas ausentes do repo; cinco versões amostradas só aparecem hoje nesse documento, não em SQL. Para `20260712_fix_rls_policies_critical.sql`, a verificação atual cobriu todos os nove efeitos nomeados de policy/índice: as seis policies estão ausentes; dos três índices, apenas `idx_workspace_notifications_user_unread` existe. Os outros dois estão ausentes. As duas tabelas já têm RLS habilitado, mas essa condição e o índice existente podem anteceder o arquivo, portanto não provam que ele tenha sido aplicado. Além disso, a última instrução do arquivo escreve em `public.migrations_log`, relação que não existe no catálogo atual e não é criada por nenhuma migration local. Já `idx_user_roles_user_id_role` e `idx_workspace_notifications_user_unread_v2`, ambos presentes, pertencem a `20260712_performance_indexes.sql` e não servem como evidência do arquivo crítico. A conclusão correta é drift de efeito/proveniência **não reconciliado**, não uma porcentagem conhecida de aplicação. O total de arquivos “nunca aplicados” continua **não verificado**, pois conteúdo pode ter sido aplicado sob outro ID. Está confirmado, porém, que o repo não reproduz deterministicamente o histórico vivo. Nenhuma migration deve ser renomeada, apagada ou reaplicada antes da equivalência `ledger ↔ arquivo ↔ hash ↔ efeito`.

### Matriz de completude por classe de objeto

| Classe | Sinal verificado em todo o catálogo | Parcial/lacuna confirmada | O que não pode ser inferido |
|---|---|---|---|
| Tabelas | 391 relações `r/p`, todas com PK; RLS/policies/dependências e estimativa de linhas levantadas | Uma partição futura sem RLS; código aponta para tabelas ausentes | Vazio ou sem `.from()` literal não significa abandono |
| Colunas | 5.086 atributos de relações `r/p`; participação em constraints/índices/dependências coberta | Contrato TypeScript omite centenas de relações e contém fantasmas | Coluna não citada no frontend pode alimentar view/função/trigger |
| Constraints | 1.324 entre PK/FK/unique/check; todas validadas | Nenhuma partial estrutural encontrada | Utilidade de cada constraint exige regra de negócio |
| Índices | 1.170, todos válidos/prontos | Queda histórica de 72 precisa reconciliação | “Pouco usado” não autoriza drop sem ciclo completo de carga |
| RLS/policies | 390 tabelas com RLS; 927 policies em 388 relações | `supplier_products_raw_history_p2026_11` é exceção real | Policy sem tráfego não é necessariamente morta |
| Funções | 1.280 overloads; linguagem, security mode e ACL levantados | Uma RPC ausente tem consumidores ativos; uma chamada dormente aponta para ausência deliberada; cinco fantasmas nos tipos | Função sem caller no repo pode ser RPC externa, trigger ou cron |
| Triggers | 385 triggers de usuário, todos habilitados | Nenhum partial estrutural encontrado | Frequência zero depende de eventos/dados, não do schema |
| Views/MVs | 192 views, quatro MVs públicas; invoker/definição/população verificados | 194 relações de leitura omitidas dos tipos | View sem acesso recente pode ser API/relatório eventual |
| Enums | 15 públicos; uso em colunas levantado | Cinco sem coluna direta exigem investigação | Podem existir em assinatura de função/cliente/migration |
| Extensões | 16 instaladas e identificadas | Nenhuma partial confirmada | Uso pode ser indireto em operador, tipo ou função |
| Privilégios | ACL por role e RLS foram separados | Grants amplos tornam a partição sem RLS relevante | Grant não prova acesso efetivo quando RLS atua |
| Jobs | 137 jobs, estado e janela de execução levantados | Dois desativados; um vacuum falhou | Job mensal/condicional sem run recente não é quebrado |
| Migrations | Repo, versões, hashes e ledger contados | Colisões, nomes inválidos e duplicatas impedem replay determinístico | Arquivo pequeno/duplicado não é lixo sem mapear o ledger |

Essa matriz é deliberadamente conservadora: “não possui código frontend interligado” é apenas um sinal. A classificação como perda exige também ausência de dependência no catálogo, caller externo, job, trigger, view, histórico e owner.

## Drift entre banco e tipos TypeScript

| Classe | Banco vivo | Declarados no `types.ts` | Correspondentes | Existentes omitidos | Fantasmas nos tipos |
|---|---:|---:|---:|---:|---:|
| Tabelas | 391 | 153 | 135 | 256 | 18 |
| Views + materialized views | 196 | 4 | 2 | 194 | 2 |
| Funções, nomes distintos | 1.273 | 131 | 126 | 1.147 | 5 |
| Enums públicos | 15 | 6 | 6 | 9 | 0 |

“Fantasma” significa apenas uma declaração em tipos/código sem objeto da mesma classe e nome no `pg_catalog`; não significa candidato automático a exclusão. Em cada linha, `correspondentes + omitidos = banco vivo`; já `declarados + omitidos` excede o vivo quando há fantasmas.

Tabelas fantasmas em `types.ts`: `admin_audit_log_y2025m12`, `admin_audit_log_y2026m01`, `admin_audit_log_y2026m02`, `admin_audit_log_y2026m03`, `admin_audit_log_y2026m04`, `admin_audit_log_y2026m05`, `admin_audit_log_y2026m06`, `ai_insights_cache`, `app_vitals`, `audit_logs`, `auth_login_attempts`, `category_icons`, `e2e_cleanup_audit`, `simulation_logs`, `simulation_runs`, `system_error_logs`, `webhook_delivery_metrics_y2026m05` e `webhook_delivery_metrics_y2026m06`.

Views fantasmas: `product_popularity_30d` e `v_full_scope_grants`. Funções fantasmas: `check_auth_config_status`, `cleanup_inbound_webhook_events`, `cleanup_simulation_telemetry`, `fn_check_dead_letters` e `refresh_product_popularity`.

O arquivo também omite objetos em uso, como `mv_stock_velocity`, explicando o erro de compilação. A regeneração precisa respeitar as salvaguardas do projeto: medir exports antes/depois, preservar as tabelas protegidas e confirmar os campos críticos de `Product`.

## Ligações ausentes ou parciais confirmadas

Foram encontrados 166 nomes literais em `.from()` e 96 em `.rpc()` no código de produção/frontend. A comparação contra todas as relações e rotinas do banco foi feita considerando o cliente utilizado; buckets de Storage e bancos externos foram separados.

| Código | Objeto ausente | Diagnóstico | Ação segura |
|---|---|---|---|
| `src/hooks/stock/useStockNotes.ts` | `stock_notes` | Hook sem consumidor encontrado e tabela inexistente | Decidir se a feature entra no produto ou remover depois de aprovação |
| `supabase/functions/simulation-orchestrator` | `simulation_runs`, `simulation_logs` | Tipos/migrations históricas existem, produção não; erros são ignorados e status rejeitados podem contar como êxito | Definir estados de resultado, alinhar webhook e só então decidir persistência/aposentadoria |
| `supabase/functions/webhook-inbound` | `webhook_events` | A tabela real relacionada é `inbound_webhook_events`; modo padrão tende a falhar | Teste de contrato e correção de nome/compatibilidade |
| `supabase/functions/_shared/security.ts` | `audit_logs` | Produção possui `audit_log`; eventos podem ser perdidos | Unificar contrato de auditoria |
| `supabase/functions/bitrix-sync` | `bitrix_clients`, `bitrix_deals`, `sync_logs` | Só `sync_full`, `get_stored_*` e `get_sync_logs` dependem deles; API direta continua separada | Corrigir falso verde do sync e decidir persistência por ação |
| `supabase/functions/visual-search` | `system_error_logs` | Telemetria de erro aponta para tabela fantasma | Usar canal canônico de erros; fluxo principal parece tolerar falha |
| `supabase/functions/e2e-cleanup` | `e2e_cleanup_audit` | Objeto de suporte de teste inexistente | Isolar do ambiente produtivo ou restaurar contrato de teste |
| `src/hooks/stock/useEmaPipelineHealth.ts` e `useEmaRiskSummary.ts` | `fn_ema_pipeline_health` | RPC é realmente chamada por consumidores ativos | Implementar com autorização ou adaptar a RPC viva equivalente |
| `src/lib/auth/auth-audit.ts` | `check_auth_config_status` | `runAuthAudit` não teve caller/import encontrado; migration declara ausência intencional e fallback | Decidir se a auditoria será ligada ou se o código dormente será aposentado; não criar RPC por suposição |
| `supabase/functions/mcp-keys-revoke` | `set_config` via PostgREST | É função de `pg_catalog`, não RPC pública | A atribuição de ator provavelmente não é aplicada; criar RPC explícita se necessária |

Referências ausentes que não são perda do banco canônico:

- `personalization-images`, `supplier-logos`, `product-videos`, `avatars`, `mockup-art-files`, `mockup-assets` e `art-files` são buckets de Storage;
- `contacts` e `customers` em `expert-chat` usam cliente de CRM externo;
- `product_categories` em `categories-api` usa cliente externo Promobrind;
- `tpgo` e `tpgo_faixa` aparecem como exemplos/comentários;
- `fn`, `fn_my_rpc` e `...` são placeholders de helpers genéricos, não chamadas reais.

## Módulos com dados simulados, fallback ou ligação incompleta

| Módulo | Estado encontrado | Classificação |
|---|---|---|
| BI de cliente/afinidade/tendências/benchmark | Há mocks explícitos, mas também estados mistos: categorias e benchmark setorial simulados podem retornar com `isMock:false` | Parcial e perigosamente sub-sinalizado; downstream inclui notificações, IA, PDF/PPTX e resumo comercial |
| Badges de inteligência de produto | Ausência de inteligência/velocidade real aciona fallback determinístico e pode gerar `Hot Item`/tendência/best-seller | Parcial; badge comercial pode parecer dado real |
| Confiança de fornecedor | Rating simulado determinístico porque não há tabela de avaliações; lead time usa dado real | Parcial; separar visualmente real de simulado |
| Kit builder | Usa `MOCK_BOXES`/`MOCK_ITEMS` quando banco externo está vazio ou falha | Parcial e potencialmente enganoso por fallback silencioso |
| Trends demo | Mock somente com `?demo=1` | Intencional; preservar |
| ProductMatch | Mock somente em desenvolvimento e quando o banco está vazio | Intencional; preservar fora de produção |
| External DB bridge/RPC native | Seis stubs `NOT_IN_DB` retornam fallback vazio seguro; sem callers encontrados no corpus | Compatibilidade descontinuada, candidato futuro a limpeza |
| Stock notes | Hook existe, tabela e consumidores não | Implementação não ligada |
| EMA pipeline health | Dois hooks dependem de RPC ausente | Implementação ligada, backend ausente |
| Simulation orchestrator | Rota ativa, tabelas ausentes, erros de persistência ignorados e códigos 4xx/5xx aceitos em cenários positivos | Implementação parcial com falso verde |
| Webhook inbound | Handler, schema compartilhado e testes descrevem contratos distintos; destino padrão não existe | Defeito funcional/contratual provável |
| Bitrix sync | Ações diretas usam API externa; somente `sync_full`/`get_stored_*`/`get_sync_logs` dependem das tabelas ausentes | Implementação parcial por ação; `sync_full` pode devolver falso verde |
| Visual search telemetry | Fluxo principal existe, tabela de erro não | Observabilidade parcial |
| Quote/magazine/mockup/kit collaboration | Estruturas completas no banco, várias com estimativa zero | Em construção/sem uso observado; não são lixo |

## Tabelas com estimativa de zero linhas

Há 136 tabelas com `reltuples = 0` na fotografia. Isso é uma lista de investigação, não uma lista de exclusão. Muitas possuem FKs, policies, índices e triggers, demonstrando implementação estrutural mesmo sem uso/dados. Partições futuras são deliberadas.

`access_blocked_log`, `ai_usage_events`, `art_file_attachments`, `attribute_equivalences`, `audit_log`, `bot_detection_log`, `cart_templates`, `cf_recon_inflight`, `city_whitelist`, `collection_item_reactions`, `collection_items`, `collection_items_trash`, `commemorative_date_exclusions`, `companies`, `company_email_patterns`, `comparison_reactions`, `component_media`, `connection_test_history`, `content_articles`, `conversation_audit_logs`, `conversation_delivery_status`, `conversation_event_history`, `cron_watchdog_log`, `custom_kits`, `device_login_notifications`, `discount_approval_audit`, `discount_approval_requests`, `edge_function_invocations`, `enrichment_log`, `expert_conversations`, `expert_messages`, `external_connections`, `external_connections_sync_log`, `favorite_item_reactions`, `favorite_items_trash`, `file_scan_logs`, `generated_mockups`, `geo_allowed_countries`, `hardening_health_snapshots`, `ip_whitelist`, `kill_switch_hits`, `kit_collaborators`, `kit_comments`, `kit_share_tokens`, `kit_templates`, `kit_variants`, `magazine_public_reactions`, `magazine_public_view_events`, `magazine_public_view_events_2026_07`, `magazine_public_view_events_2026_08`, `magazine_public_view_events_2026_09`, `magazine_public_view_events_2026_10`, `magazine_public_view_events_default`, `magazine_reader_state`, `magazine_templates`, `magic_up_brand_kits`, `magic_up_campaigns`, `magic_up_comments`, `magic_up_generations`, `magic_up_public_shares`, `magic_up_reactions`, `mcp_access_violations`, `mcp_api_keys`, `mcp_full_grantors`, `mcp_key_auto_revocations`, `mockup_approval_links`, `mockup_generation_jobs`, `mockup_prompt_configs`, `mockup_prompt_history`, `mockup_templates`, `notification_preferences`, `notifications`, `optimization_queue`, `optimization_queue_runs`, `order_item_personalizations`, `ownership_repair_logs`, `password_reset_requests`, `personalization_simulations`, `product_component_location_techniques`, `product_component_locations`, `product_components`, `product_group_components`, `product_group_location_techniques`, `product_group_locations`, `product_group_members`, `product_groups`, `product_price_freshness_overrides`, `product_search_logs`, `product_sync_logs`, `product_target_audiences`, `public_token_failures`, `push_subscriptions`, `quote_approval_tokens`, `quote_drafts`, `quote_item_personalizations`, `quote_templates`, `quote_versions`, `recently_viewed_products`, `rls_denial_log`, `role_migration_batches`, `role_migration_items`, `sales_goals`, `saved_filters`, `saved_trends_views`, `scheduled_reports`, `search_queries`, `secret_rotation_log`, `security_settings`, `seller_cart_items`, `seller_carts`, `simulator_wizard_drafts`, `step_up_audit_log`, `step_up_challenges`, `step_up_tokens`, `supplier_products_raw_history_p2026_09`, `supplier_products_raw_history_p2026_10`, `supplier_products_raw_history_p2026_11`, `user_2fa_settings`, `user_allowed_ips`, `user_comparisons`, `user_favorites`, `user_filter_presets`, `user_ip_allowlist`, `user_known_devices`, `user_notification_preferences`, `user_preferences`, `user_search_history`, `user_token_revocations`, `variant_commemorative_dates`, `video_variant_links`, `visual_search_feedback`, `webhook_deliveries`, `webhook_delivery_locks`, `webhook_delivery_metrics`, `webhook_outbox`, `webhook_request_nonces`.

Agrupamento de decisão:

- **intencionais/operacionais:** partições futuras, logs que só recebem evento excepcional, filas, tokens, locks e tabelas de segurança;
- **features em construção:** colaboração de kits/magazines, mockups, Magic Up, templates, aprovações, notificações, comparações e preferências;
- **precisam de prova de ligação:** `companies`, `expert_*`, `product_groups*`, `sales_goals`, `saved_trends_views`, `scheduled_reports`, `seller_carts*` e `webhook_*`;
- **jamais apagar só por vazio:** qualquer uma das 136, especialmente as que têm FK/trigger/policy ou aparecem em migration/contrato.

## Diferenças intencionais versus perdas reais

| Evidência | Classificação | Razão |
|---|---|---|
| 391 relações tabulares agora versus 388 em julho | Parcialmente explicado | Duas partições são intencionais; tabela de auditoria ainda não foi reconciliada |
| `mv_product_leaf_category` fora de `public` | Evolução intencional provável | Existe em `internal`; não há evidência de perda |
| `anon_catalog_grant_audit_log` com RLS sem policy | Provável `deny-all`, live-only | Acesso normal é negado, mas criação não foi reconciliada com o repo |
| Partição `magazine_public_view_events_2026_11` com RLS sem policy | Intencional no acesso direto | Migration de hardening explicita policies no pai e fechamento da filha |
| Partição `supplier_products_raw_history_p2026_11` sem RLS | Lacuna real | Grant direto a `authenticated` torna a exceção relevante |
| Nove views com `security_invoker=false` | Drift real | Migration 063 posterior exige `true` em todas; origem da reversão é desconhecida |
| `fn_super_filtro` com EXECUTE `PUBLIC`/`anon` | Drift real | Migration 059 posterior exige autenticação e revoga `PUBLIC` |
| Efeitos nomeados da migration RLS de 12/07 divergem do catálogo | Drift/proveniência não reconciliados | 0/6 policies e 1/3 índices existem; RLS já está ativo, mas a origem desses estados não foi provada |
| 136 tabelas com estimativa zero | Indeterminado, não perda | Projeto em construção e estatística não prova abandono |
| `mv_stock_velocity` ausente nos tipos | Perda de contrato | View existe e é consumida; tipos estão desatualizados |
| 18 tabelas fantasmas nos tipos | Perda de contrato | Código pode compilar contra objetos inexistentes |
| `simulation_*`, `audit_logs`, `system_error_logs` em código/tipos mas não no banco | Perda real ou código legado | Há caminhos executáveis que ainda os consultam |
| `contacts`, `customers`, `product_categories` ausentes no canônico | Intencional | Clientes externos separados |
| Locks npm/Bun divergentes | Lacuna real | Ambientes resolvem árvores diferentes |
| 30 runs vermelhos | Inconclusivo | Dois runs amostrados foram bloqueados por orçamento; 28 causas não classificadas |

## Edge Functions e integrações

O repositório contém 105 Edge Functions com `index.ts`. Somente 39 têm seção explícita em `supabase/config.toml`; 66 não têm entrada específica. Isso não prova que 66 estejam ausentes de produção — a seção é usada principalmente para opções como `verify_jwt` —, mas impede usar o arquivo como inventário canônico de deploy.

A busca direta por `.functions.invoke()` encontrou oito nomes literais, mas isso não é um inventário de chamadas: o wrapper `invokeEdge` acrescenta, entre outras, `log-login-attempt`, `send-transactional-email`, `secrets-manager`, `validate-access`, `quote-sync`, `visual-search`, `bi-copilot`, `mcp-keys-revoke` e chamadas com nome dinâmico. O inventário de deploy/caller precisa resolver wrappers, aliases, imports e eventos externos. Funções sem referência literal não devem ser apagadas porque podem ser acionadas por webhook, cron, API externa ou outra função.

Candidatas a revisão de ciclo de vida — nunca a remoção automática — incluem utilitários administrativos, funções `test-*`, orquestradores de teste, `cors-audit`, `audit-suite`, `bulk-random-passwords`, `product-visual-search`, `quote-sync-promo-champions` e `verify-email`. Para cada uma é necessário provar deploy, caller, segredo, evento disparador e último uso.

O gate estático de CORS cobre 105 funções e reconhece 101 que usam o helper compartilhado e quatro de uso somente servidor. Ele valida a centralização dos headers e `x-request-id`, não uma chamada CORS runtime completa. Em contrapartida, verificações de ACL/DB que não encontram credenciais pulam a execução; o resultado precisa ser “inconclusivo/bloqueado”, não verde.

## GitHub Actions

Os 30 runs mais recentes consultados em 25–26/08/2026 estavam concluídos como `failure`, todos disparados por `schedule`, abrangendo quote-number hardening, schema drift, Edge Function drift, Required Checks Guard, simulações diárias, magazine flakiness, callback de CRM, Supabase linter, Gitleaks, estoque e kits.

Dois gates representativos foram abertos:

- `Required Checks Guard`, run `32951895682`: o job não iniciou porque um orçamento do GitHub Actions impediu novo uso;
- `db-schema-drift-check`, run `32954709399`: o job também não iniciou pelo mesmo bloqueio de orçamento.

Logo, não é correto afirmar que os 30 fluxos falharam por bugs ou pelo mesmo motivo. Também não é correto tratá-los como aprovados: os dois gates inspecionados não produziram evidência e os outros 28 permanecem sem classificação causal. O primeiro trabalho de CI é restabelecer execução e separar ambiente, credencial, flake e produto.

## Candidatos a limpeza — aguardando autorização

Nenhum item abaixo foi apagado, movido ou renomeado.

### Alta confiança técnica, ainda dependente do PO

| Candidato | Evidência | Risco da remoção | Proposta |
|---|---|---|---|
| `docs/RUNBOOKS/CF_RECONCILIATION.md` e `docs/runbooks/CF_RECONCILIATION.md` | SHA-256 `15ffa64a62b10421708b27dc1c6ca5a0441ffbf76f2613685bf1dc05dfa8c7fb` idêntico | Links/case entre sistemas | Propor `docs/runbooks/CF_RECONCILIATION.md` e redirecionar referências |
| `docs/RUNBOOKS/EDGE_FUNCTIONS_BASE_URL.md` e `docs/runbooks/EDGE_FUNCTIONS_BASE_URL.md` | SHA-256 `7f8f9e4acfd9ebefec71c9c6d9b519639c63c72832d886549a35b547e816f834` idêntico | Links existentes | Propor `docs/runbooks/EDGE_FUNCTIONS_BASE_URL.md` após mapear referências |
| `docs/INCIDENTS/2026-05-22-crm-db-bridge-url-malformada.md` e `docs/incidents/2026-05-22-crm-db-bridge-url-malformada.md` | SHA-256 `654eadd1b1fef8766916b6ce06486309fa35feef121b85cc564d1be100539314` idêntico | Referências históricas | Propor `docs/incidents/2026-05-22-crm-db-bridge-url-malformada.md` como canônico |
| `docs/FAXINA_DB_2026-06-20_TIER3B.md` e `docs/FAXINA_DB_2026-06-20_TIER3b.md` | SHA-256 `d9d61128d7e2f164c878bb6dd0f270f1deb733f25d7373adf98d5776f00c8102` idêntico | Links/documentação histórica | Propor `docs/FAXINA_DB_2026-06-20_TIER3B.md`; preservar história e atualizar links |
| Três logos PNG | SHA-256 `a6500f1ec237458463157c340c7bde072abce380c074bfc8468cdb1328b0b2cf` idêntico | URLs públicas e CDN | Preservar URLs/aliases; só a fonte sem uso é candidata inicial |
| `tests/__deprecated__/bridge/external-db-bridge.test.ts` e `tests/edge-functions/live/external-db-bridge.test.ts` | SHA-256 `e6ba54e5bcd4afe5b86cfd27ffdced6a090c830cb9b2889d689ec5f08ae90e5b` idêntico | Runners têm escopos diferentes | Manter LIVE; cópia deprecated é candidata após PO |

Os três logos idênticos são `src/assets/logo-promobrindes.png`, `public/images/promo-brindes-logo.png` e `public/images/promo-brindes-logo-v2.png`. As duas URLs públicas têm usos confirmados em componentes e E2E; a cópia em `src/assets` não teve referência literal encontrada no corpus. Igualdade de bytes não autoriza quebrar URLs públicas. A pasta `tests/__deprecated__` é excluída pelo Vitest, enquanto a cópia `tests/edge-functions/live` integra a suíte LIVE.

### Média confiança; preservar até triagem humana

- relatórios de auditoria na raiz: `AUDIT_200_COMMITS_2026-07-16.md`, `AUDIT_FINAL_REPORT.md`, `AUDIT_REPORT.md`, `AUDIT_REPORT_2026.md` e `audit-report.txt`;
- artefatos versionados do Graphify e relatórios QA “latest” versus cópias timestampadas;
- PDFs, imagens e schemas em pastas de QA que podem ser fixtures/baselines;
- stubs de compatibilidade do External DB Bridge;
- documentos históricos de faxina que podem ser evidência de incidente.

### Excluídos da limpeza automática

- todas as migrations, inclusive marcadores, duplicatas e arquivos pequenos;
- snapshots de schema, fixtures, golden files e baselines de testes;
- tabelas/colunas/views/funções vazias ou sem caller literal;
- guardas SSOT, comentários de segurança e arquivos protegidos pelo `AGENTS.md`;
- qualquer ativo público antes de confirmar URLs e cache/CDN.

## Detalhe das colisões de migrations

Os 37 valores de versão local repetidos são: `20260602`, `20260610120000`, `20260611120000`, `20260611120100`, `20260611120200`, `20260611120300`, `20260611120400`, `20260615`, `20260618000001`, `20260618160000`, `20260619000001`, `20260619000002`, `20260619000003`, `20260619100000`, `20260620000001`, `20260620150000`, `20260620160000`, `20260620170000`, `20260620190000`, `20260621000000`, `20260621100000`, `20260621120000`, `20260621210000`, `20260621`, `20260622130000`, `20260622`, `20260623000001`, `20260623120000`, `20260623130000`, `20260623`, `20260712`, `20260716000041`, `20260716000042`, `20260716000043`, `20260716000044`, `20260716000045` e `20260716000046`.

Os 33 arquivos sem versão numérica inicial são:

`bronze_stalled_cleanup_20260623.sql`, `create_process_notifications_queue_rpcs_20260623.sql`, `cron_p0_disable_webhook_outbox_missing_secret_20260623.sql`, `fix_rls_head_requests.sql`, `fn_system_health_summary_bughsc1_check2_20260623.sql`, `gravacao_fix1_dtf_tiers_7_20260623.sql`, `gravacao_fix3_personalization_technique_mappings_20260623.sql`, `gravacao_fix4_drop_dead_calculate_personalization_price_20260623.sql`, `gravacao_fix5_reactivate_hot_stamping_20260623.sql`, `gravacao_fix6_health_check_p2_warning_20260623.sql`, `indexes_3_missing_fk_indexes_20260623.sql`, `products_1_sku_promo_backfill_and_autosync_trigger_20260623.sql`, `products_2c_quality_dashboard_fix2_20260623.sql`, `products_3_new_check_constraints_20260623.sql`, `products_5_ai_coverage_view_20260623.sql`, `products_5_comments_high_null_cols_20260623.sql`, `products_8_ai_columns_and_table_comment_20260623.sql`, `products_cleanup_7_hard_delete_xbz_manual_v2_20260623.sql`, `products_comments_core_batch1_20260623.sql`, `products_dimensions_5_drop_jsonb_column_20260623.sql`, `products_dimensions_b1_backfill_scalars_from_jsonb_20260623.sql`, `products_dimensions_d1_add_dimension_source_column_20260623.sql`, `products_flag_morta_a1_hardening_check_constants_20260623.sql`, `products_indexes_8_drop_dead_indexes_20260623.sql`, `products_ncm_6_fix_format_and_comment_20260623.sql`, `products_quality_10_sku_promo_constraint_20260623.sql`, `products_quality_9_is_deleted_hardening_20260623.sql`, `v_system_alerts_bugalert1_cron_threshold_20260623.sql`, `v_system_alerts_bugalert2_ai_worker_detection_20260623.sql`, `v_system_alerts_cron_threshold_fix_20260623.sql`, `verify_rls_policies.sql`, `vpp_4c_expose_ipi_ncm_bitrix_20260623.sql` e `vss_2_comment_zero_fill_columns_v2_20260623.sql`.

Esses nomes devem ser mapeados ao ledger; não devem ser “corrigidos” por renomeação retroativa sem uma estratégia compatível com ambientes já aplicados.

## Plano de melhorias e correções em exatamente 100 etapas

### Fundação, proteção e critérios de aceite

1. Registrar o commit `e42fc237`, a fotografia `pg_catalog` e este relatório como baseline; gate: nenhum trabalho começa sobre uma referência móvel.
2. Definir com o PO os fluxos críticos de negócio — catálogo, busca, orçamento, carrinho, estoque, mockup, magazine, kit e CRM; entregável: matriz fluxo × responsável × criticidade.
3. Inventariar todas as rotas públicas, autenticadas e administrativas e ligar cada uma a componente, hook, serviço, tabela/RPC e teste; gate: nenhuma rota sem dono.
4. Capturar baselines visuais desktop/mobile dos fluxos críticos para proteger o design atual; gate: correções funcionais não alteram pixels sem aprovação.
5. Criar dados/fixtures de teste estáveis e anonimizados para os fluxos críticos; gate: testes não dependem de dados voláteis de produção.
6. Adotar template de mudança com impacto, rollback, contratos tocados e autorização necessária; congelar migrations novas até o gate da etapa 87; gate: PR sem esses campos não entra.
7. Definir feature flags para módulos parciais e integrações instáveis; gate: nova função incompleta não fica exposta por acidente.
8. Atribuir ownership por domínio e pelos arquivos protegidos do projeto; entregável: CODEOWNERS coerente com responsáveis reais.
9. Validar, sem restaurar produção, backups e rollback; para migrations forward-only, “volta” significa restore ou migration compensatória nova, nunca renomear/desfazer história aplicada.
10. Fixar critérios de “pronto”: build, typecheck, lint, testes, E2E crítico, visual, contrato DB e observabilidade verdes; aceite final pertence ao PO.

### CI, dependências e gates determinísticos

11. `[AUTORIZAÇÃO GITHUB]` Restaurar o orçamento/capacidade do GitHub Actions; gate: um workflow simples inicia e termina, em vez de falhar antes do job.
12. Reexecutar os 30 workflows recentes e classificar cada falha como orçamento, credencial, runner, flake, contrato ou produto; entregável: painel sem falsos vermelhos.
13. `[AUTORIZAÇÃO GITHUB]` Separar workflows obrigatórios, agendados e opcionais e reduzir schedules redundantes; gate: checks obrigatórios continuam bloqueantes.
14. Confirmar branch protection e Required Checks após a capacidade voltar; gate: `main` não aceita merge sem Gate 0 e gates definidos.
15. Escolher um único package manager/lock canônico — hoje o projeto declara npm — e submeter a decisão ao PO antes de remover outro lock.
16. Resolver o conflito React 19 × `cmdk@0.2.1` com upgrade/substituição compatível e teste dos command menus; gate: `npm ci` sem `--legacy-peer-deps`.
17. Alinhar `@types/react`, `@types/react-dom`, React, React DOM, Router, Vite e plugins nas mesmas gerações suportadas; gate: árvore sem peer conflict.
18. Regenerar somente o lock canônico em commit isolado e comparar a árvore; gate: instalação idêntica em duas máquinas/containers.
19. Adicionar gate de clean install com scripts controlados e cache frio; gate: build/teste não dependem de `node_modules` antigo.
20. Documentar versões de Node/npm e validar local/CI; gate: engines e setup dos workflows concordam.
21. Corrigir a prop `future` obsoleta de `BrowserRouter` e testar rotas relativas/splat; gate: comportamento atual preservado no Router 7.
22. Corrigir os seis usos de `motion` em `PageTransition.tsx` ou remover apenas exports comprovadamente sem uso; gate: typecheck e regressão visual.
23. Corrigir o import de `minimatch` em `check-eslint-baseline.mjs`; gate: lint realmente executa e reporta achados.
24. Corrigir o parser de strings em `check-package-duplicate-scripts.mjs`; gate: os 228 scripts são analisados sem crash.
25. Corrigir `check:critical-coverage` de ponta a ponta: produtor da cobertura, paths reais dos três módulos, abrangência e freshness de `coverage-summary.json`; gate: artefato atual e módulos-alvo realmente medidos.

### Contratos TypeScript e disciplina de código

26. Gerar em arquivo temporário uma nova fotografia de tipos diretamente do projeto canônico, sem tocar o arquivo canônico nem o banco; registrar contagens conforme `AGENTS.md`.
27. Comparar por conjunto as 391 tabelas, 196 views/MVs, 1.273 funções e 15 enums contra os tipos; entregável: diff completo, não amostra.
28. Preservar explicitamente `personalization_techniques`, produtos, variantes, fornecedores, raw e tabelas `magazine_*`; gate: nenhuma proteção regredida.
29. Confirmar `price`, `sale_price`, `shortDescription`, `category_id` e `category_name` no tipo `Product`; gate: todos os usos compilam.
30. Substituir o `types.ts` em commit isolado, sem casts oportunistas; gate: nenhum objeto vivo some e fantasmas são investigados.
31. Corrigir `useStockVelocityPrefetch` usando a view tipada `mv_stock_velocity`; gate: erro TS desaparece sem `as any`.
32. Recalcular baselines de `any`, `eslint-disable`, `ts-ignore` e `console`; gate: baseline mede todo o código de produção.
33. Queimar gradualmente os 54 `as any`, começando por fronteiras de banco/integração; gate: cada lote reduz a baseline.
34. Remover supressões apenas com teste de contrato equivalente; gate: nenhuma redução cosmética oculta erro real.
35. Tornar warnings novos de TypeScript/lint bloqueantes e manter dívida antiga em baseline decrescente; gate: “boy scout rule” mensurável.

### Ligações quebradas entre código e banco

36. Criar teste local/handler-real de `webhook-inbound`, sem resposta pré-programada, cobrindo HMAC correto/incorreto, versionamento V1/V2, `slug`, persistência e idempotência; gate: assinatura/payload inválido nunca persiste.
37. Reconciliar os três contratos de `webhook-inbound` — handler, schema compartilhado e testes — e confirmar se o destino canônico é `inbound_webhook_events`; entregável: ADR com envelope, headers, idempotência, retenção e compatibilidade.
38. Corrigir `webhook-inbound` no código para o contrato aprovado; gate: evento válido persiste uma vez, duplicado é idempotente e nenhum 401/404 é aceito como sucesso do caminho positivo.
39. Tratar `simulation-orchestrator` como rota ativa até prova contrária e criar testes que distingam `passed`, `rejected`, `infra_failed` e `skipped`; gate: 4xx/5xx e falha de persistência não viram sucesso.
40. Alinhar HMAC/header/segredo da simulação ao webhook e decidir com o PO a trilha `simulation_runs`/`simulation_logs`; schema novo fica para futura `[AUTORIZAÇÃO BD]`, aposentadoria só após as etapas 88–90 e `[VALIDAÇÃO PO]`.
41. Separar `bitrix-sync` por ação: API direta, `sync_full`, leitura armazenada e logs; entregável: diagrama, fonte de verdade e teste que reproduz o falso verde do upsert.
42. Fazer erro de persistência Bitrix falhar explicitamente; se persistência local for aprovada, especificar schema/RLS/migration para futura `[AUTORIZAÇÃO BD]`; aposentadoria de ações/deploy só após as etapas 88–90 e `[VALIDAÇÃO PO]`.
43. Unificar `audit_logs` versus `audit_log` no helper compartilhado; gate: evento de segurança chega ao canal canônico e erro de logging não derruba request.
44. Redirecionar `system_error_logs` de visual search para a observabilidade canônica; gate: falhas possuem request ID, função e causa.
45. Isolar `e2e_cleanup_audit` ao ambiente de teste ou definir seu contrato; gate: E2E não exige tabela fantasma em produção.
46. Procurar RPC viva equivalente a `fn_ema_pipeline_health` e definir o shape esperado pelos dois hooks; gate: teste de freshness/erro/ausência.
47. Se não houver equivalente, desenhar e revisar a migration mínima de `fn_ema_pipeline_health`; criação/aplicação fica bloqueada até as etapas 81–90 e `[AUTORIZAÇÃO BD]`.
48. Decidir se `runAuthAudit`, hoje sem caller encontrado e com fallback deliberado, deve ser ligado ou aposentado; gate: não criar `check_auth_config_status` para código dormente por suposição.
49. Somente se a feature for aprovada, procurar equivalente ou especificar RPC de diagnóstico de auth, retorno, grants e exposição; criação/adaptação fica bloqueada até as etapas 81–90 e `[AUTORIZAÇÃO BD]`.
50. Especificar contrato público explícito para substituir a tentativa de RPC `set_config`, ou remover a atribuição ineficaz; qualquer RPC nova exige etapas 81–90 e `[AUTORIZAÇÃO BD]`.
51. Decidir o futuro de `stock_notes` com o PO; gate: ou feature completa e testada, ou código removido em lote autorizado.
52. Se notas de estoque forem aprovadas, desenhar tabela, FK, índices, RLS, policies e testes; criação fica bloqueada até as etapas 81–90 e `[AUTORIZAÇÃO BD]`.
53. Revisar toda referência literal ausente a cada PR com detector que reconheça Storage e clientes externos; gate: zero falso positivo silencioso.
54. Criar contract test que compare `.from()`/`.rpc()` com a fotografia temporária da etapa 26; a etapa 67 versionará o mesmo artefato; gate: objeto fantasma novo bloqueia CI.
55. Proibir `as any` como correção para drift de schema; gate: exceção exige justificativa e issue com prazo.

### Módulos parciais e experiência do usuário

56. Inventariar todos os pontos de mock/fallback no BI e badges, incluindo estados mistos e cada consumidor downstream; entregável: matriz campo × origem × tela × notificação/IA/exportação/CTA × prazo.
57. `[AUTORIZAÇÃO DESIGN]` Tornar provenance estrutural por campo, não só `isMock` global; bloquear notificações persistentes, IA, PDF/PPTX, resumo/WhatsApp e badges comerciais quando qualquer entrada decisória for simulada, com baseline visual no PR.
58. Sob feature flag até a etapa 64 passar, fazer o kit builder falhar explicitamente quando o banco externo falha, sem `MOCK_BOXES/MOCK_ITEMS` silenciosos em produção.
59. `[AUTORIZAÇÃO DESIGN]` Separar rating simulado e lead time real na confiança de fornecedor; gate: origem explícita e baseline visual aprovada.
60. Testar que Trends só usa demo com `?demo=1` e que ProductMatch só usa mock em desenvolvimento; gate: mocks impossíveis no build produtivo normal.
61. Em staging, com fixtures, credenciais de teste, provedores sandbox/dry-run e limpeza definida para as etapas 61–65, executar a jornada completa de orçamento.
62. Sob as precondições da etapa 61, executar a jornada de magazine: template, edição, publicação, leitura, reação e estado do leitor.
63. Sob as precondições da etapa 61, executar mockup: upload, geração, cobrança simulada, aprovação, compartilhamento e auditoria; gate: idempotência.
64. Sob as precondições da etapa 61, executar kit: template, composição, variante, colaboração, comentários e share token; gate: nenhum fallback oculto.
65. Sob as precondições da etapa 61, validar notificações, preferências, favoritos, comparações e filtros com dois usuários/duas organizações.
66. Criar painel de readiness por feature com estados “ativo”, “parcial”, “demo”, “desativado” e “legado”; owner e evidência obrigatórios.

### Banco, jobs e migrations — leitura primeiro

67. Versionar uma fotografia `pg_catalog` canônica das contagens e assinaturas, excluindo dados sensíveis; gate: diff reproduzível.
68. Comparar automaticamente a fotografia atual com `docs/SCHEMA_REFERENCE.md`, explicando cada adição, remoção e mudança de schema.
69. Atribuir owner e finalidade a cada uma das 136 tabelas com estimativa zero; gate: nenhuma exclusão baseada apenas em contagem.
70. Mapear colunas por dependência de view, função, trigger, FK, índice e código antes de chamar qualquer coluna de órfã.
71. Revisar constraints e índices por uso/custo, mantendo a evidência atual de validade; gate: proposta inclui query plan e rollback.
72. Criar testes que reproduzam separadamente a relação sem RLS e as duas relações `deny-all` sem policy, além das nove views públicas sanitizadas.
73. Preparar a correção de RLS/policies da partição e repetir a matriz `anon/auth/service_role`; aplicação fica para a etapa 90 com `[AUTORIZAÇÃO BD]`.
74. Revisar os 530 `SECURITY DEFINER` por caller, search path, grants e finalidade; priorizar expostos, sem revogação em massa.
75. Confirmar dependências dos cinco enums públicos sem coluna antes de propor depreciação; gate: zero função/migration/cliente dependente.
76. Documentar owner/necessidade das 16 extensões; gate: extensão só é candidata a remoção após prova de zero dependência.
77. Produzir matriz de grants efetivos por role e objeto, separando ACL de resultado RLS; gate: nenhuma conclusão baseada só em grant.
78. Confirmar consumidor substituto de `process-webhook-outbox`; `[AUTORIZAÇÃO BD]` só reativar/alterar cron após teste e aprovação.
79. Confirmar substituto ou necessidade de `pipeline-classify-categories`; `[AUTORIZAÇÃO BD]` decidir reativação somente com owner e idempotência.
80. Investigar o erro de `vacuum-high-dead-tuples` sem mutação; preparar correção, limites de lock/tempo e rollback para etapa 90 com revisão DBA e `[AUTORIZAÇÃO BD]`.
81. Construir tabela de equivalência das 2.354 versões do ledger com os 1.673 arquivos locais, hashes e efeitos conhecidos.
82. Resolver conceitualmente as 37 colisões sem renomear história aplicada; publicar política forward-only e manter o freeze de migrations até a etapa 87.
83. Mapear os 33 nomes sem versão a versões do ledger e seus hashes; gate: nenhuma alteração retroativa ainda.
84. Classificar os 13 grupos duplicados, resolver as 27 referências ausentes e produzir manifesto ordenado `versão ↔ arquivo ↔ hash ↔ efeito`, aprovado por DBA.
85. Subir banco descartável do zero usando somente o manifesto canônico aprovado; gate: aplicação completa sem colisão/ordem implícita.
86. Comparar o banco reconstruído com o canônico por tabelas, colunas, constraints, índices, RLS, funções, triggers, views, enums, grants e jobs.
87. Adicionar gate de naming/versão única para migrations novas; gate: colisão ou nome sem timestamp bloqueia PR.

### Edge, integrações, testes e observabilidade

88. Inventariar deploy real das 105 Edge Functions e classificar `test-*`/utilitários: versão, caller, segredo, JWT, último uso, ambiente e owner.
89. Reconciliar as 39 entradas de `config.toml` e aprovar plano de deploy/aposentadoria; remoção exige prova de não uso e `[VALIDAÇÃO PO]`.
90. `[AUTORIZAÇÃO BD]` `[AUTORIZAÇÃO DEPLOY]` Executar em staging somente migrations/jobs/deploys aprovados nas etapas anteriores, com canário e rollback; produção permanece intocada.
91. Padronizar schema de request/response, CORS, idempotência, timeout, retry e erro das integrações críticas; gate: contratos versionados.
92. `[AUTORIZAÇÃO EXTERNA]` Criar smoke tests de CRM, webhook, email, Storage, mockup, catálogo externo e callback com credenciais de teste, nunca produção mutante.
93. Unificar observabilidade com request ID, correlação frontend/Edge/DB e canal de erro existente; gate: um fluxo pode ser rastreado ponta a ponta.
94. Tornar checks sem segredo “bloqueados/inconclusivos”, não verdes; gate: relatório distingue skip de aprovação.
95. Ampliar testes de regressão a partir dos 26 arquivos da suíte core, proibir rede inesperada e fazer console errors/rejeições não tratadas falharem; corrigir `test.poolOptions` e o contrato `focus: "auto"` somente após validar a intenção.
96. Estabelecer E2E crítico, regressão visual e acessibilidade sobre os mesmos fixtures; gate: design preservado e teclado/leitor de tela aprovados.
97. Corrigir/rejustificar baselines impossíveis do bundle e dividir chunk de produtos/arquivos gigantes por domínio; gate: redução mensurada sem redesign.

### Limpeza autorizada e release

98. `[VALIDAÇÃO PO]` Limpar duplicados exatos aprovados; para logos, preservar URLs/aliases, auditar CDN/case e validar deploy, não apenas build/testes.
99. `[VALIDAÇÃO PO]` Triar relatórios históricos, artefatos Graphify/QA e stubs em lote separado; preservar migrations, fixtures, snapshots e histórico necessário.
100. `[AUTORIZAÇÃO DEPLOY]` Gerar release candidate, gates, canário e rollback; declarar 100% só com aceite do PO, zero P1 e todas as vulnerabilidades altas remediadas ou formalmente aceitas.

## Ordem recomendada de execução

O caminho crítico é: restaurar o sinal de CI e a instalação determinística; zerar TypeScript/lint/teste de núcleo; atualizar os tipos; corrigir código sem mutar banco; provar fluxos em staging; reconciliar migrations nas etapas 81–87; inventariar Edge nas etapas 88–89; só então executar mudanças autorizadas na etapa 90 e a limpeza aprovada.

Os marcadores `[AUTORIZAÇÃO BD]`, `[AUTORIZAÇÃO GITHUB]`, `[AUTORIZAÇÃO DESIGN]`, `[AUTORIZAÇÃO EXTERNA]` e `[AUTORIZAÇÃO DEPLOY]` exigem aprovação explícita no escopo indicado. `[VALIDAÇÃO PO]` cobre remoção, consolidação ou aposentadoria. Ausência de marcador não amplia autorização: este documento é plano, não ordem de execução.

## Execução validada em 26/08/2026

### Concluídas e comprovadas

- [x] 25. Gate de cobertura crítica refeito com produtor atual e seis testes/36 asserções; os três módulos-alvo são medidos por artefato atual.
- [x] 28–29. Tipos protegidos e campos críticos de `Product` foram restaurados/verificados sem remover objetos vivos.
- [x] 31. `useStockVelocityPrefetch` passou a consumir `mv_stock_velocity` tipada, sem recorrer a `as any`.
- [x] 16. Compatibilização do toolchain React 19 com instalação/testes locais viáveis no branch de estabilização.
- [x] 17. Alinhamento de React/Router/Vite/Vitest/`@types` suficiente para `qa:full`, `build` e `test:ci-core` verdes.
- [x] 21. Remoção da prop obsoleta `future` de `BrowserRouter`, preservando o comportamento atual.
- [x] 22. Correção dos usos de `motion` em `PageTransition.tsx`, eliminando bloqueio de typecheck.
- [x] 23. Correção do import de `minimatch` em `check-eslint-baseline.mjs`; o gate de lint voltou a executar de ponta a ponta.
- [x] 24. Correção do parser de `check-package-duplicate-scripts.mjs`; o verificador voltou a analisar os 232 scripts atuais sem crash.
- [x] 43. Helpers compartilhados de segurança passaram a registrar no `bot_detection_log` existente e compatível, preservando a resposta primária quando a auditoria falha.
- [x] 44. `visual-search` passou a registrar falhas no canal canônico `edge_function_invocations`, com contrato Deno cobrindo falha primária e falha do próprio logger.
- [x] 50. A chamada ineficaz a `set_config` como RPC pública foi removida e recebeu teste de contrato; nenhuma RPC ou migration nova foi criada.
- [x] 53. Detector AST de referências Supabase revisando `.from()`/`.rpc()` com separação explícita entre PostgREST canônico, Storage, clientes externos, placeholders e dispatch dinâmico.
- [x] 54. Contract test e gate local para o catálogo temporário de referências Supabase, hoje aprovados no branch.
- [x] 56. Inventário de 20 caminhos de mocks/fallbacks e consumidores downstream, sem alterar a UI ou apresentar dados como reais.
- [x] 60. Teste de isolamento de demo garantindo que Trends só usa mock com `?demo=1` e que ProductMatch mock fica restrito ao contexto previsto.
- [x] 67. Fotografia `pg_catalog` versionada localmente nesta rodada para sustentar a reconciliação dos próximos passos sem tocar no banco.
- [x] 68. Diff recorrente e somente documental entre `SCHEMA_REFERENCE.md` e a fotografia `pg_catalog`, com aviso explícito de que delta agregado não prova perda/intenção por objeto.
- [x] 87. Gate forward-only bloqueando migrations novas sem timestamp UTC válido ou versão única, mantendo o legado explicitamente baselined.
- [x] 97. Baseline de bundle impossível foi reconstituída em checkout limpo, com hashes e gate novamente mensurável; o alerta de `products` foi preservado.

### Parciais com evidência pronta

- [x] 39. `simulation-orchestrator` distingue `passed`, `rejected`, `infra_failed` e `skipped`; 4xx inesperado, 5xx e falha de persistência não contam como sucesso. A decisão sobre o canal canônico permanece na etapa 40.
- [x] 41–42. `bitrix-sync` foi separado por ação, o falso verde do upsert foi corrigido e a Edge Function foi implantada como versão 243; a decisão de criar/manter storage permanece pendente.
- [ ] 45. `e2e-cleanup` já tem teste de caracterização hermético e ADR, mas continua dependente de decisão do PO: isolar ao ambiente de teste ou registrar no canal canônico.
- [ ] 46. A ausência de `fn_ema_pipeline_health` já está comprovada e protegida por teste de contrato; ainda falta decidir RPC equivalente ou especificação nova.
- [ ] 94. Lote inicial aplicado em RPC/ACL/lint: os gates live agora distinguem `static-pass` de `inconclusive` e os workflows principais usam `--require-live`; ainda faltam schema, smoke, carga, E2E e classificação dos consumers advisory.
- [ ] 95. O núcleo de regressão cresceu de 35 para 37 arquivos e passou a rodar com `STRICT_TEST_SIDE_EFFECTS=1`: `fetch` não mockado e `console.error` não interceptado falham o teste; `dangerouslyIgnoreUnhandledErrors: false` ficou explícito. A intenção de `focus: "auto"` foi confirmada no schema e no runtime, e o `poolOptions` legado não existe no config ativo. O fluxo mockado de aprovação de desconto voltou a usar o provider padronizado, e a auditoria estática de mockup passou a verificar o caminho atual até a Edge Function. Também foram reconciliados cinco contratos determinísticos de UI/integração: OAuth passou a mockar `authService`, estoque futuro usa data relativa, títulos vazios de revista seguem a normalização do serviço, a matriz de user-agent do PDF desempacota corretamente `it.each`, e a navegação suspensa do sidebar exercita o `NavLink` real. O `BrowserRouter` passou a declarar `useTransitions={false}`, coerente com a intenção já documentada no `App` e com o contrato de destaque durante carregamento de rota. A expansão do mesmo guard para as suítes não-core depende da classificação dos mocks legítimos já existentes.
- [x] Complemento da 95. O adaptador `invokeEdge` agora preserva o status HTTP em seu envelope compatível; os caminhos legados de `external-db` e CRM reidratam o erro sem perder `status`/`request_id`. Com isso, `410` volta a acionar o kill-switch, `502/503` mantêm retry e `404` do CRM preserva o retorno nulo esperado. Os harnesses foram alinhados à guarda de sessão e à fronteira real `invokeEdge`, com 124 testes de contrato/integração focal aprovados. Nenhum banco, migration ou design foi alterado.
- [ ] 69–80. A governança read-only agora tem matriz de evidência, donos a confirmar e próximos testes por RLS/ACL/SECDEF/jobs; a execução exige confirmação por objeto e, quando aplicável, autorização do PO/DBA.

### Bloqueadas por autorização ou capacidade externa

- [ ] 11. Restaurar capacidade/orçamento do GitHub Actions.
- [ ] 12. Reexecutar e classificar os 30 workflows vermelhos depois que o GitHub Actions voltar a rodar.
- [ ] 13. Reorganizar workflows obrigatórios/agendados/opcionais.
- [ ] 14. Revalidar branch protection e Required Checks remotamente.
- [ ] 47. Qualquer criação de RPC nova continua bloqueada por `[AUTORIZAÇÃO BD]`.
- [ ] 73, 78, 79, 80, 90. Correções de RLS/jobs/migrations/deploy seguem bloqueadas por autorização explícita de banco/deploy.
- [ ] 92. Smokes com credenciais externas de teste continuam pendentes de `[AUTORIZAÇÃO EXTERNA]`.
- [ ] 98–100. Limpeza autorizada e release continuam fora de escopo até zerar P1 e concluir as decisões pendentes.

### Verificações desta rodada

- [x] `corepack npm run test:ci-core` -> 37 arquivos, 885 testes, tudo verde sob `STRICT_TEST_SIDE_EFFECTS=1`.
- [x] Fixture negativa do guard estrito -> subprocesso hermético confirmou reprovação de `fetch` e `console.error` não mockados.
- [x] `corepack npm run qa:full` -> verde de ponta a ponta.
- [x] `corepack npm run test:quality` -> 977 arquivos aprovados, 125 ignorados intencionalmente; 23.435 testes aprovados e 1.101 ignorados, encerrando com código 0.
- [x] `corepack npm run build -- --logLevel warn` -> verde; restam apenas warnings não bloqueantes de chunk/import dinâmico.
- [x] `corepack npm run check:bundle-size` -> verde após baseline limpa; alerta de tamanho de `products` preservado.
- [x] `node scripts/check-migration-filename-contract.mjs` e teste Vitest correspondente -> verde; nenhum arquivo de migration foi alterado.
- [x] `deno test --config supabase/functions/deno.json --allow-env --allow-net supabase/functions/visual-search/observability_contract_test.ts`
- [x] `deno test --config supabase/functions/deno.json --allow-env --allow-net supabase/functions/e2e-cleanup/handler_characterization_test.ts`
- [x] `corepack npm exec vitest run src/hooks/stock/__tests__/ema-pipeline-health.contract.test.tsx tests/contracts/demo-data-isolation.contract.test.ts`
- [x] `STRICT_TEST_SIDE_EFFECTS=1 corepack npm exec vitest run tests/integration/discountApprovalFlow.test.ts src/hooks/mockup/__tests__/mockup-audit.test.ts --maxWorkers=1` -> 362 testes verdes e 1 skip opt-in; nenhum caminho live foi executado.
- [x] `node scripts/check-supabase-reference-catalog.mjs`
- [x] `npm run check:schema-reference-drift` -> retrato documental E1/E2 reproduzido, sem inferir alteração de objetos.
- [x] `git diff --check`

### Histórico de diagnóstico e execução ampla final

`corepack npm run test:quality` foi iniciado somente para diagnóstico, com o modo estrito desligado, e encontrou falhas antes de terminar (incluindo então `mockup-audit`, `discountApprovalFlow`, `magazine-service-fuzz` e testes de UI); o processo encerrou com sinal `143` durante um caso lento de PDF. Não foi usado como aprovação nem como motivo para alterar testes em massa.

Para separar regressão de baseline, o subconjunto inicial foi reproduzido no commit-base isolado `b9dbeeabd`: os mesmos dois arquivos falharam com 6 falhas, 356 passes e 1 skip. O lote mínimo posterior corrigiu somente a infraestrutura de teste: `discountApprovalFlow` passou a usar `renderHookWithProviders`, que reproduz o `QueryClientProvider` existente no app; `mockup-audit` deixou de procurar a chamada textual legada `supabase.functions.invoke` e verifica a pré-validação no bloco atual de `generateMockupApi`. Ambos passaram com 362 testes e 1 skip, inclusive sob o guard estrito. O bloco live permaneceu opt-in e não foi acionado.

Uma nova execução integral de `corepack npm run test:quality`, depois do reparo do caso de PDF, chegou ao fim sem sinal `143`, mas ainda fechou com **79 falhas de teste e 8 suítes que não iniciaram**. O resultado foi classificado, não tratado como aprovação: há mocks desatualizados após a migração para `invokeEdge` e `SAFE_MESSAGES`, expectativas síncronas para fluxos agora assíncronos, contagens/baselines estáticos vencidos, testes live sem descritores ou credenciais e alguns defeitos de contrato reais a corrigir (principalmente a preservação de mensagem de erro no fluxo de mockup). As correções devem seguir por famílias, com reprodução isolada e sem usar o resultado amplo para editar testes em massa.

Após a classificação e os lotes mínimos descritos nos commits desta rodada, a execução final de `corepack npm run test:quality` encerrou normalmente em **393,07 s**, com código 0: **977 arquivos aprovados, 125 ignorados; 23.435 testes aprovados, 1.101 ignorados**. Os ignores remanescentes são caminhos opt-in/live sem credenciais reais ou cenários explicitamente indisponíveis no ambiente local; não foram tratados como aprovação de infraestrutura externa. Os avisos de `canvas`, navegação jsdom e mocks legados de PDF foram registrados como ruído de ambiente/futuro endurecimento, sem falha de contrato nesta execução.

## Validação complementar em 27/08/2026

Esta rodada manteve a regra de não tocar em schema, dados, grants, jobs ou migrations do Supabase canônico. As mudanças ficaram restritas ao código da aplicação, testes locais e este documento.

### Correções implementadas e reconfirmadas

- [x] Fluxo de aprovação de desconto: a atualização de `quotes` agora precisa confirmar sucesso antes de registrar `quote_history` ou notificar o vendedor; o teste de integração cobre explicitamente o caminho de falha da escrita principal.
- [x] CRM resiliente sem falso verde: `statement_timeout` continua degradando leituras (`select`/`search`) para `stale`, mas escritas (`insert`/`update`/`delete`) agora rejeitam com resultado indeterminado em vez de parecer sucesso vazio.
- [x] Telemetria/admin: os snapshots de `invokeTelemetrySink` e `secretsManagerCallMetrics` ficaram estáveis para `useSyncExternalStore`, e a página de telemetria recebeu seletores/test IDs menos frágeis para exportações e tabela.
- [x] Acessibilidade/teclado: o `DatePickerField` removeu o aninhamento de controle interativo e passou a usar botão real para limpar; `PresetsBar`, `KitComposition`, `VoiceSearchOverlay` e `ProductStatusBadge` tiveram o comportamento de teclado alinhado e coberto por testes.
- [x] Live suite opt-in: casos happy-path sem JWT de teste agora usam `skip` explícito, evitando falso verde silencioso.
- [x] Watchers de coleções/favoritos: `workspace_notifications.insert()` passou a ser verificado antes de incrementar o contador de notificações enviadas; falha de persistência agora aborta a execução em vez de confirmar sucesso contraditório.
- [x] Contrato SSOT local: o teste de fallback deixou de exigir URL canônica quando o próprio contrato permite `localhost`; continua proibindo o projeto legado e confirma que o cliente preserva a URL local resolvida.
- [x] Harness de `MainLayout`: o teste de breadcrumbs agora isola Header, Sidebar e background lazy, pois seu contrato não é o carrinho/telemetria desses componentes; isso elimina falha cruzada de montagem sem esconder comportamento da breadcrumb.

### Verificações executadas hoje

- [x] `node scripts/validate-supabase-config.mjs` -> verde.
- [x] `git diff --check` -> verde.
- [x] `corepack npm run build -- --logLevel warn` -> verde; restaram apenas warnings não bloqueantes de chunk/import dinâmico.
- [x] `corepack npm run qa:full` -> verde com código 0 nesta fotografia do worktree.
- [x] `corepack npm exec -- vitest run src/components/ui/__tests__/date-picker-field.test.tsx src/components/filters/__tests__/PresetsBar.test.tsx src/components/products/__tests__/ProductStatusBadge.test.tsx tests/components/KitComposition.test.tsx tests/components/search/VoiceSearchOverlay.test.tsx src/lib/edge/__tests__/invokeTelemetrySink.test.ts src/lib/telemetry/__tests__/secretsManagerCallMetrics.test.ts tests/pages/AdminTelemetriaPage.test.tsx tests/edge-functions/live/product-visual-search.test.ts tests/pages/DiscountRequestDetailPage.test.tsx tests/components/AdminRoute.test.tsx tests/lib/crm-db-fixed.test.ts tests/integration/discountApprovalFlow.test.ts --maxWorkers=1 --retry=0` -> **12 arquivos verdes, 1 skip, 186 testes verdes, 12 skips**.
- [x] `deno test --no-config --allow-read supabase/functions/collections-watcher/notification-insert.contract_test.ts supabase/functions/favorites-watcher/notification-insert.contract_test.ts` -> **6/6 verdes**.
- [x] `deno check --config supabase/functions/deno.json supabase/functions/collections-watcher/index.ts supabase/functions/favorites-watcher/index.ts` -> verde.
- [x] `corepack npm exec -- vitest run src/components --maxWorkers=1 --retry=0` -> **230 arquivos verdes, 3 skips; 5.649 testes verdes, 43 skips**.
- [x] `corepack npm exec -- vitest run src/hooks src/lib src/pages src/services src/contexts src/routes src/logic src/stores src/integrations src/types src/utils src/tests src/App.router-contract.test.tsx --maxWorkers=1 --retry=0` -> **370 arquivos verdes, 4 skips; 9.676 testes verdes, 11 skips**.
- [x] `corepack npm exec -- vitest run tests --exclude 'tests/hooks/**' --maxWorkers=1 --retry=0` -> **937 arquivos verdes, 124 skips; 22.925 testes verdes, 1.098 skips**.
- [x] `corepack npm exec -- vitest run e2e/scripts/__tests__ scripts/__tests__ --maxWorkers=1 --retry=0` -> **6 arquivos verdes, 1 skip; 78 testes verdes, 4 skips**.
- [x] Contratos adicionais do hook de descontos (`tests/hooks/useDiscountApproval.test.ts`, `src/hooks/quotes/__tests__/discountApprovalFlow.test.ts`, `src/hooks/quotes/__tests__/useDiscountApproval.test.ts`) -> **3 arquivos, 83 testes verdes**.
- [ ] `node scripts/map-drafts-to-migrations.mjs --check` -> continua bloqueando corretamente o rascunho `2026-07-23_get_edge_invoke_summary.sql` sem revisão registrada; não foi mascarado.

### Observações e limites honestos desta rodada

- [ ] O rerun monolítico de `corepack npm run test:quality` em 27/08/2026 foi interrompido com código `143`, portanto ele não é usado como prova de aprovação. A validação desta rodada foi repetida em blocos seriais documentados acima, que também revelaram e corrigiram dois defeitos de harness; a última aprovação integral em um único comando continua sendo a registrada em 26/08/2026.
- [ ] A trilha de aprovação de desconto ainda não é atômica no banco; ela apenas deixou de gerar histórico/notificação contraditórios no cliente. Qualquer consolidação via RPC/transação continua dependendo de catálogo real e `[AUTORIZAÇÃO BD]`.
- [ ] A reconciliação de schema `pg_catalog` ↔ `types.ts` e qualquer ação sobre grants/RLS/jobs seguem fora desta rodada por dependerem de capacidade externa e autorização explícita.

## Execução complementar em 28/08/2026

Esta rodada ocorreu na worktree isolada
`codex/stabilization-completion-100`, derivada de `7b38096c9`. O worktree
principal e os arquivos ainda editados por outros agentes não foram incorporados
nem sobrescritos. Nenhum schema, dado, migration, job, grant, segredo, deploy ou
configuração remota foi alterado.

### Correções novas comprovadas

- [x] Etapas 36–38: `webhook-inbound` voltou ao domínio canônico por `slug`,
  segredo por endpoint, V2 strict/V1 restrito, HMAC com aliases controlados,
  allowlists, persistência em `inbound_webhook_events`, idempotência sequencial e
  concorrente, headers sanitizados e resposta sem fila fictícia.
- [x] Etapas 41–42: `bitrix-sync.sync_full` deixou de responder
  `HTTP 200/success:true` quando o upsert falha; o teste do handler real cobre
  falha explícita e sucesso sintético.
- [x] Painel inbound: consultas e exportação usam `created_at`, `ip_address` e
  `error_message`; falha de leitura agora aparece como erro, não como lista vazia.
- [x] Kill switch `edge_ai_recommendations`: o handler consulta o controle remoto
  existente antes de autenticação, rate limit, credenciais ou gateway de IA; o
  teste real prova 410 e nenhuma chamada posterior.
- [x] Harnesses `__test/*`: as oito rotas/imports agora existem somente em DEV;
  um gate pós-build reprova qualquer rota ou chunk correspondente em `dist/`.
- [x] Regressão de `FiltersPage`: o teste de ordenação passou a isolar o ranking
  de fornecedor, eliminando acesso Supabase fora do contrato da suíte estrita.
- [x] Contrato compartilhado do webhook: expectativa antiga
  `validation_error` foi alinhada ao envelope canônico `validation_failed`.
- [x] Etapa 39: o handler real do `simulation-orchestrator` foi revalidado com
  4/4 cenários; persistência indisponível retorna 503 e alvos gated retornam 424.

### Evidências desta rodada

- [x] `npm run test:ci-core` → **38 arquivos, 887/887 testes verdes** com
  `STRICT_TEST_SIDE_EFFECTS=1`.
- [x] `npm run qa:full` → runtime, scripts, catálogo Supabase, migrations, lint,
  typecheck e ESLint completos verdes.
- [x] `npm run build` → verde; busca no bundle confirmou zero
  rota/chunk `__test`, agora protegida por `check-production-harnesses.mjs`.
- [x] `npm run test:quality` → **981 arquivos e 23.455 testes verdes**; 125
  arquivos/1.101 testes opt-in ou indisponíveis foram ignorados conforme contrato.
- [x] Deno handler-real/contratos críticos → webhook, Bitrix e kill switch de IA
  com **5/5 testes verdes**; `deno check` verde nas três funções e `deno lint`
  verde nos módulos novos de webhook/IA.
- [x] Bundle dentro do orçamento: **10,86 MB / 13,06 MB**, maior chunk
  **812,6 KB / 970,2 KB**; cobertura crítica com **327/327 testes verdes**.
- [x] Simulação diária local: **1.520 cenários**, zero falhas, cobrindo cálculo
  de orçamento, freshness de preço, CNPJ, invoke policy, idempotência de webhook
  e publicação de magazine; evidência em `qa/reports/daily-flows-simulation-2026-08-28.*`.
- [x] Vitest focal de contratos → webhooks, matriz de cenários, parsing de IA e
  transição de rotas: **118 testes verdes e 14 skips declarados**.
- [x] `git diff --check` e guarda do Supabase canônico verdes.

### Limites que permanecem obrigatórios

- [ ] O checklist comprovado está em **32/100**, não em 100/100. As 68 etapas
  abertas incluem decisões de produto/design, staging, credenciais externas,
  reconciliação de migrations, banco descartável, RLS/jobs, limpeza e release.
- [ ] D7 do webhook (retenção/cron) exige `[AUTORIZAÇÃO BD]`; o código local não
  corrige nem executa a função/cron live.
- [ ] Bitrix ainda não possui storage canônico aprovado; a correção impede falso
  verde, mas não inventa as tabelas ausentes.
- [ ] O lint isolado do arquivo Bitrix ainda registra três débitos preexistentes:
  um import e `parseColor` sem uso, além de um `any`. O helper não foi apagado ou
  classificado como lixo sem `[VALIDAÇÃO PO]`; o typecheck e o teste real estão verdes.
- [x] Branch publicada no GitHub e PR #1799 aberto; Edge Functions implantadas no
  Supabase canônico: `ai-recommendations` 273, `bitrix-sync` 243 e
  `webhook-inbound` 279. Smokes não mutantes aprovaram preflight/contratos de
  autenticação. Nenhuma migration, DDL, DML, segredo ou job foi alterado.
- [ ] O PR ainda não foi mesclado e o frontend/Vercel não foi implantado. Staging
  mutante, canário de negócio e rollback exercitado continuam pendentes.
- [ ] Itens com `[VALIDAÇÃO PO]` não foram apagados, aposentados ou “limpos”.

## Continuação forward-only validada em 28/08/2026

Esta continuação usa a worktree isolada
`/tmp/promo-gifts-codex-completion-20260828`, branch
`codex/plan-100-forward-only-20260828`, sobre o merge canônico
`bf16e5eb4` do PR #1799. O worktree principal compartilhado com Claude/Hermes
permaneceu intocado. Nenhuma migration histórica foi editada, renomeada, apagada
ou aplicada.

### Cenários simulados antes das novas correções

- [x] Restauração do dump estrutural canônico em PostgreSQL 17 descartável:
  391 tabelas, 196 views/materialized views, 1.280 funções e 15 enums
  reconstruídos; as materialized views foram atualizadas com sucesso. O único
  encerramento não reproduzido foi um event trigger de plataforma ausente na
  imagem descartável, sem perda dos objetos de aplicação já carregados.
- [x] `fn_rupture_health_check()` e `fn_rupture_quick_stats()` foram executadas
  no banco descartável, incluindo o estado vazio; nenhuma chamada atingiu o
  banco canônico.
- [x] O ledger canônico foi exportado por acesso somente leitura para arquivo
  temporário e saneado antes de versionar: nenhum SQL, rollback, autor, chave de
  idempotência, dado ou segredo bruto foi incluído no repositório.
- [x] O replay integral de `supabase/migrations` foi rejeitado como cenário
  inseguro: o ledger e o diretório local não são equivalentes por versão nem por
  bytes. Portanto, `supabase db push` continua proibido nesta árvore legada.

### Contratos, código e Edge Functions concluídos

- [x] `src/integrations/supabase/types.ts` foi regenerado diretamente do projeto
  canônico. O contrato passou de 158 tabelas/5 views para 391 tabelas/196 views,
  preservando todas as relações protegidas pelo `AGENTS.md` e os campos críticos
  de `Product`.
- [x] Os hooks EMA deixaram de depender da RPC inexistente
  `fn_ema_pipeline_health`. A nova Edge Function `ema-pipeline-health`, protegida
  pela autorização central de papel `dev`, agrega as RPCs canônicas já existentes
  e possui contrato de handler e descritor live.
- [x] O manifesto de autorização cobre 107/107 Edge Functions e a suíte live
  possui descritor para 106/106 funções implantáveis; o diretório `_shared` não é
  uma função implantável.
- [x] `crm-callback-alerts` agora exige Bearer de `service_role` em comparação de
  tempo constante mesmo com `verify_jwt=false`, mantendo compatibilidade com o
  cron existente.
- [x] Erros de parsing/import em `generate-ad-image`,
  `market-intelligence-insights` e quatro specs Playwright foram corrigidos. A
  coleção completa agora encontra 28.360 casos em 516 arquivos sem erro de
  sintaxe/import.
- [x] Logger, structured logger e tooltip passaram a tolerar execução Node sem
  `import.meta.env`, eliminando falhas de coleta/teste sem alterar runtime web.
- [x] O teste de ordenação de filtros passou a isolar `useColorSystem`; a consulta
  assíncrona que escapava depois do `afterEach` não gera mais tentativa de rede
  nem `console.error` tardio sob `STRICT_TEST_SIDE_EFFECTS=1`.

### Dependências, CI, SEO e acessibilidade

- [x] Instalação limpa real com `npm ci` aprovou 888 pacotes sem
  `--legacy-peer-deps`; `npm ls --depth=0` ficou íntegro. Node foi fixado em
  22.22.1 no projeto e nos workflows.
- [x] `nanoid` foi fixado em versão corrigida. Permanecem duas vulnerabilidades
  altas transitivas em `image-size`/`pptxgenjs`, sem correção publicada na versão
  atual do pacote pai; não foram mascaradas nem aceitas como resolvidas.
- [x] Todos os workflows passam no `actionlint`. Foram corrigidos contextos
  inválidos de `matrix`, interpolação insegura de mensagem de commit, chaves YAML
  duplicadas, combinação ilegal de `paths`/`paths-ignore` e configuração quebrada
  de dry-run/lock do workflow visual.
- [x] O gate de restauração de carrinho usa a assinatura real
  `restore_seller_cart(jsonb)`, exige `service_role` no modo estrito e valida o
  contrato antes de qualquer escrita; o falso negativo via `anon` foi removido.
- [x] O `canonical` estático e o `PageSEO` passaram a compartilhar um único nó
  por rota, eliminando URLs conflitantes. O progressbar do live region recebeu
  nome e texto acessíveis. Três execuções Lighthouse consecutivas em `/auth`
  obtiveram performance 0,89, acessibilidade 1,00, boas práticas 1,00 e SEO 1,00.

### Evidências reproduzidas após instalação limpa

- [x] `npm run qa:full` — runtime, catálogo, migration gate, lint baseline,
  typecheck e ESLint verdes.
- [x] `npm run test:ci-core` — 38 arquivos e 888 testes verdes após adicionar
  o contrato live de ACL da RPC protegida.
- [x] `npm run test:edge:integration:all` — 40 arquivos e 969 testes verdes.
- [x] `npm run build` — build Vite 8 verde, guarda canônica e ausência de harness
  produtivo confirmadas.
- [x] `npx playwright test --list` — 28.360 casos coletados em 516 arquivos.
- [x] `actionlint .github/workflows/*.yml` e `git diff --check` — verdes.
- [x] Manifesto do ledger sanitizado em
  `docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-08-28.json`: 2.354 versões,
  114 matches exatos em bytes, 993 matches somente por versão, 1.247 versões sem
  arquivo local e 531 arquivos versionados locais sem versão no ledger.

### Estado remoto e limites que continuam explícitos

- [x] O PR #1799 foi mesclado em `main` no commit `bf16e5eb4`; a afirmação
  histórica acima de que ele ainda estava aberto foi superada por este registro.
- [ ] A capacidade do GitHub Actions executou os jobs até o commit
  `6196ed1a6`: 20 workflows dessa rodada chegaram a verde, incluindo Gate 5,
  SSOT, build/bundle e contratos. Na rodada final o orçamento foi esgotado e 60
  workflows terminaram antes do primeiro step com a anotação oficial
  `Actions budget is preventing further use`; esses registros são falha de
  capacidade, não evidência de regressão. As causas reproduzíveis encontradas
  antes do bloqueio foram corrigidas e testadas localmente.
- [x] Existe o ruleset ativo `Protect main`, exigindo PR e bloqueando delete e
  non-fast-forward.
- [ ] O ruleset não exige nenhum status check, zero aprovações e permite bypass
  permanente ao papel administrativo; isso exige decisão administrativa antes
  de tornar os gates tecnicamente bloqueantes para `main`.
- [ ] O upload do CodeQL continua bloqueado porque code scanning não está
  habilitado nas configurações do repositório (HTTP 403). O workflow não foi
  enfraquecido para esconder o problema.
- [x] As quatro Edge Functions desta continuação foram implantadas no canônico:
  `ema-pipeline-health` v1, `crm-callback-alerts` v55,
  `generate-ad-image` v273 e `market-intelligence-insights` v263. O download
  posterior confirmou os quatro hashes `index.ts` idênticos ao GitHub; 32/32
  cenários live não mutantes passaram, com um happy-path de IA ignorado por
  ausência deliberada de credencial de teste.
- [ ] Nenhum DDL/DML/grant/policy/job foi aplicado ao Supabase canônico. O
  catálogo demonstrou que nenhuma migration forward-only adicional é necessária
  para as correções desta continuação; mudanças futuras de RLS/ACL/jobs continuam
  dependendo de autorização específica por objeto.
- [ ] Nenhum candidato de limpeza foi removido. Logos, relatórios, snapshots,
  fixtures e migrations permanecem preservados até `[VALIDAÇÃO PO]` nominal.

### Fechamento operacional do PR #1800

- [x] O Gate 5 passou a reconhecer de forma estrita o grant `anon` intencional
  de `fn_product_active_for_rls(uuid)`, exigido por duas policies de catálogo e
  pelo tripwire `fn_verify_anon_catalog_grants`; qualquer outro achado continua
  bloqueante.
- [x] `get_profile_and_roles(_user_id uuid)` e `fn_rpc_exists(_fname text)` usam
  agora as assinaturas canônicas. A proibição de EXECUTE para `anon` é comprovada
  pelo endpoint live com SQLSTATE `42501`, sem tentar auditar
  `information_schema` via PostgREST.
- [x] O drift check de Edge foi atualizado para a Supabase CLI atual. A última
  comparação completa antes do deploy encontrou 102 funções alinhadas e somente
  as quatro alterações desta branch; todas as quatro ficaram alinhadas após o
  deploy controlado.
- [x] O handler-direct de `log-login-attempt` usa o `deno.json` canônico e seus
  38 testes isolam o circuit breaker por cenário, eliminando dependência de
  ordem sem enfraquecer os casos de abertura/recuperação.
- [x] O smoke Thumb QuickView executa apenas o Chromium que instala; a matriz
  bloqueante posterior preserva Chromium, Firefox e WebKit. A coleta focal lista
  cinco testes no smoke, em vez de tentar 25 cenários em browsers ausentes.
- [ ] O workflow CRM no-mock permanece corretamente bloqueado: faltam no GitHub
  os secrets `CRM_CALLBACK_API_KEY`, `E2E_ADMIN_EMAIL` e
  `E2E_ADMIN_PASSWORD`. O gate não foi convertido em skip/falso verde.
- [ ] O CodeQL continua dependente de habilitar code scanning no repositório.
  O bloqueio anterior do Vercel foi resolvido e está documentado no fechamento
  final abaixo.

### Fechamento final de GitHub e produção em 28/08/2026

- [x] O PR #1800 foi mesclado em `main` no commit
  `050678a44694487b5311b7f008fde23e1863baef`, preservando o SSOT
  `doufsxqlfjyuvxuezpln`, os campos críticos de `Product` e todo o histórico de
  migrations sem replay ou reescrita.
- [x] O primeiro deploy desse merge concluiu o build, mas o gate de produção
  encontrou textos de harness somente em source maps ocultos. A causa foi
  reproduzida: `SENTRY_AUTH_TOKEN` ativava `sourcemap: hidden`, embora o projeto
  não possuísse uploader/plugin do Sentry, deixando mapas órfãos no artefato.
- [x] O PR #1801 corrigiu o contrato: enquanto não houver uploader que remova os
  mapas após o envio, a produção usa `sourcemap: false`. Um teste de configuração
  impede regressão para o gatilho incompleto baseado apenas no token. O hotfix
  foi mesclado em `main` no commit
  `8c9d71f993a6e0ae80c84c07dfdf6370e38b9e50`.
- [x] A reprodução local com `SENTRY_AUTH_TOKEN` fictício passou no build e em
  `check-production-harnesses`, sem gerar `.map`. O deployment Vercel
  `dpl_ExqmBED9pweaSeyHCDic42CqxU6Z` do merge #1801 ficou `READY` e recebeu os
  aliases `promogifts.com.br`, `www.promogifts.com.br`,
  `promo-gifts-v4-juca1.vercel.app` e o alias de `main`.
- [x] Smokes HTTP no domínio oficial retornaram 200 com HTML em `/`, `/auth`,
  `/produtos`, `/categorias` e `/contato`. O JavaScript publicado contém o ID
  canônico e não contém o ID legado nem URL HTTP/WSS para o projeto proibido.
  A única ocorrência do ID legado no HTML é um comentário explicando a remoção
  do antigo preconnect; não há referência executável.
- [ ] Os jobs novos do GitHub Actions continuam impedidos de iniciar pelo limite
  de budget da conta. Isso não foi tratado como verde: a validação equivalente
  foi executada localmente, mas a evidência hospedada depende da renovação ou
  ampliação do budget.
- [ ] Continuam externos ao código: habilitar CodeQL/code scanning, cadastrar
  `CRM_CALLBACK_API_KEY`, `E2E_ADMIN_EMAIL` e `E2E_ADMIN_PASSWORD`, endurecer o
  ruleset com status checks/aprovações e obter validação nominal do PO para
  limpezas, canários mutantes, regressão visual e alterações futuras de banco.

## Critério para encerrar a estabilização

O sistema estará tecnicamente pronto quando houver instalação limpa sem flags permissivas, build/typecheck/lint/testes verdes, CI realmente executando, contratos DB↔TypeScript sincronizados, zero referência executável a objeto inexistente, migrations reproduzíveis em banco descartável, fluxos críticos aprovados pelo PO, regressão visual sem alteração indesejada e rollback testado.

Até lá, a estratégia mais segura é evolução incremental. O design existente deve ser tratado como contrato e o banco canônico como SSOT; nenhuma “faxina” deve preceder prova de uso, dependência e autorização.

---

## Revisão exaustiva de implementação — 29/08/2026

Esta revisão foi executada na branch isolada
`codex/actions-gates-20260829`, partindo do commit
`0de3631b2bcc1160d37ac6e418bbe63488663581`. A worktree principal compartilhada
com outros agentes e o Supabase canônico não receberam mutação nesta rodada.

### Resultado do plano de 100 etapas

- [x] Os 100 itens foram reconciliados individualmente em
  `docs/PLANO_MELHORIAS_CORRECOES_100_ETAPAS_CHECKLIST_2026-08-26.md`, sem
  transformar implementação parcial em conclusão por inferência.
- [x] Estado comprovado: **42 concluídas, 42 parciais, 15 dependentes de
  decisão/autorização/infraestrutura externa e 1 pendente de release**.
- [x] Dez etapas documentadas como abertas no retrato anterior foram encerradas
  por evidência posterior: npm canônico (015), lock/install limpos (018–019),
  geração/comparação/atualização integral de tipos (026–027/030), fronteira EMA
  baseada em RPCs existentes (046–047) e fotografia/diff `pg_catalog` (067–068).
- [ ] O projeto não está em 100/100. Permanecem abertos produto/design, fixtures
  críticas, branch protection, staging, credenciais externas, lifecycle de
  módulos parciais, ledger reproduzível, RLS/jobs, observabilidade ponta a ponta,
  limpeza nominal e release candidate.

### Melhorias desta rodada submetidas a revalidação

- [x] Gate de smoke passou a usar o projeto Playwright dedicado
  `chromium-smoke`, eliminando coleta acidental de 438 testes e retries do projeto
  público; o recorte correto contém 55 testes, dos quais 10 executam localmente e
  45 exigem ambiente/credencial declarada.
- [x] Drift de segurança (`lint-0011`, `lint-0029` e grants `anon`) usa um helper
  comum de SQL somente leitura, com Management API canônica como fonte primária
  e pg-meta local apenas como fallback explícito.
- [x] Allowlists foram atualizadas a partir do catálogo canônico: 72 assinaturas
  `lint-0029`, zero `lint-0011` e 10 assinaturas `anon`, todas com razão literal
  registrada em `docs/security/ALLOWLISTS_MEMORY.md`.
- [x] Drift de Edge Functions diferencia função canônica intencional de orphan
  desconhecido. `mcp-query` foi documentada como gateway externo gerenciado e as
  107 funções do repositório tiveram hash comparado ao deploy canônico.
- [x] Os RPCs transacionais de aprovação de desconto foram incluídos no catálogo
  de referência; o hook não faz mais sequência cliente de escritas em orçamento,
  auditoria e notificação.
- [x] O contrato local do Supabase foi inicializado em ambiente descartável sem
  tentar reaplicar o arquivo histórico legado sobre a migration forward-only em
  teste. A restauração do diretório ocorre por `trap`, inclusive em falha.
- [x] O workflow CodeQL ganhou preflight de capacidade: análise executa quando
  code scanning está habilitado, a indisponibilidade específica do produto é
  registrada como notice e qualquer resposta inesperada continua bloqueante.
- [x] Baselines visuais Linux foram produzidas para alert dialog, confirm dialog,
  dialog e undo toast; 32/32 cenários passaram sem alterar o componente
  compartilhado de design.
- [x] A simulação diária de 29/08 executou 1.520 cenários, zero falhas, com
  relatório versionável em `qa/reports/daily-flows-simulation-2026-08-29.*`.

### Evidência local reproduzida após a reconciliação

- [x] `npm run test:quality` — **985 arquivos e 23.491 testes verdes**;
  128 arquivos/1.133 testes foram ignorados por contratos opt-in ou ambiente
  indisponível. Duração: 384,48 s.
- [x] Contratos focais de router, runtime, aprovação transacional e drift de
  segurança — **23 testes verdes e 1 live opt-in ignorado**.
- [x] `npm run e2e:dialogs` — **32/32** cenários visuais Linux verdes em
  180/320/375/768 px.
- [x] `npm run test:e2e:smoke` — **10 verdes e 45 skips declarados**, usando
  `chromium-smoke`, em 21,6 s.
- [x] `npm run test:deploy-gate` — **327/327 testes verdes**.
- [x] `npm run build` — **6.186 módulos**, build e guarda de harness produtivo
  verdes; somente avisos conhecidos de imports estático/dinâmico ineficazes.
- [x] `npm run lint:check`, TypeScript e ESLint — **0 erros e 0 warnings**;
  actionlint e `git diff --check` verdes.
- [x] A primeira execução hospedada expôs dois gaps adicionais sem rebaixar os
  gates: o medidor de Edge contava o diretório não implantável `functions/tests`
  e `massive-fuzzing` tentava `localhost:54321` quando havia service-role sem URL.
  O denominador agora exige `index.ts` (**65/107 = 61%**) e o fuzz executa 1.000
  cenários herméticos, determinísticos e sem rede/produção.
- [x] `ema-pipeline-health` ganhou contrato cliente para happy-path, freshness
  `UNKNOWN`, autenticação 401 e indisponibilidade 503, complementando os testes
  Deno e live já existentes.
- [x] A validação hospedada do AlertDialog revelou um erro de coleta, não de
  pixel: o job instalava Chromium, mas o comando sem `--project` coletava também
  Firefox, WebKit e projetos autenticados/móveis. Os dois jobs agora fixam
  `chromium-public`, coerente com os baselines versionados e com o script
  `e2e:dialogs`; nenhum baseline ou componente visual foi afrouxado. A correção
  foi confirmada no GitHub Actions run `33258159195`: AlertDialog, ConfirmDialog e
  OptimizedImage encerraram com `success`.

### Gaps e funções ainda parciais confirmadas

- [ ] `simulation-orchestrator` permanece fail-closed, mas a decisão de
  persistência/lifecycle, sandbox de produto e UI efêmera versus persistente não
  foi tomada.
- [ ] `runAuthAudit` continua dormente e degradando com segurança quando a RPC
  ausente é chamada; não há justificativa para criar backend sem caller aprovado.
- [ ] `stock_notes` continua sem objeto canônico e sem consumidor ativo; feature
  completa ou aposentadoria requer decisão do PO.
- [ ] `e2e_cleanup_audit` ainda precisa ser isolada a teste ou formalizada.
- [ ] O storage Bitrix não foi inventado; somente o falso verde de persistência
  foi corrigido.
- [ ] O manifesto do ledger classifica 2.354 versões, mas 1.247 não têm arquivo
  local e 531 arquivos versionados não têm versão viva. Os 33 nomes sem versão
  têm inventário, porém zero equivalências exatas com o ledger. Replay integral
  continua inseguro.
- [ ] As 530 rotinas `SECURITY DEFINER`, jobs críticos, grants efetivos e objetos
  com RLS excepcional têm inventário e gates parciais, não revisão nominal
  integral por owner/caller/finalidade.
- [ ] Happy-path autenticado de CRM/webhook/e-mail e confirmação live de
  notificação única na aprovação de desconto dependem de segredos/JWTs de teste.

### Limitação dos MCPs de banco nesta sessão

Os dois endpoints MCP disponíveis com nomes de produção/canônico foram consultados
somente para identificação. Nenhum corresponde ao SSOT `doufsxqlfjyuvxuezpln`:
um expôs contagens significativamente menores e outro expôs PostgreSQL 15 com
tabelas de uma aplicação diferente. Seus resultados foram descartados. Evidência
canônica desta revisão vem de snapshots `pg_catalog` versionados e de consultas
read-only da Supabase Management API executadas com o project ref protegido.
Corrigir a configuração desses MCPs permanece um gap operacional; não autoriza
inferir, comparar ou alterar schema no endpoint errado.
