# Simulação adversarial de cenários, falhas e gaps

- **Data:** 26 de agosto de 2026
- **Projeto:** Promo Gifts V4
- **Supabase canônico:** `doufsxqlfjyuvxuezpln`
- **Commit de partida:** `9ad56bf3da72e0b8e4d485e5cccb09bdeb0710cc`
- **Baseline funcional auditada:** `e42fc237eabe8855304eb90db84e4b46b8ebab91`
- **Plano relacionado:** `docs/PLANO_MELHORIAS_CORRECOES_100_ETAPAS_CHECKLIST_2026-08-26.md`
- **Branch isolada:** `codex/stabilization-100`
- **Modo:** diagnóstico, simulação e consultas somente leitura; nenhum DDL, DML, deploy, refresh, chamada de provedor ou exclusão foi executado

## Veredito executivo

O plano pode ser executado, mas não de forma cega ou linear. A simulação encontrou dependências que exigem uma ordem operacional mais estrita: congelar escritores concorrentes, recuperar a confiabilidade dos gates locais, resolver a instalação determinística, corrigir contratos sem mutar o banco, reconciliar o histórico de migrations e somente então considerar staging, deploy ou limpeza.

Não há evidência de corrupção maciça, perda generalizada de dados ou estrutura inválida em produção. Há, porém, bloqueadores reais de release:

1. os 30 runs mais recentes do GitHub Actions, cobrindo 13 workflows distintos, não executaram seus steps porque o orçamento do Actions bloqueou todos os jobs;
2. `npm ci --dry-run` falha por incompatibilidade entre React 19 e `cmdk@0.2.1`;
3. o typecheck reproduz oito erros;
4. a suíte de núcleo reprova um de 840 testes e permite duas falhas reais de rede no console sem reprovar o arquivo;
5. lint, detector de scripts e cobertura crítica falham antes de realizar a medição prometida;
6. contratos executáveis consultam objetos ausentes no Supabase canônico e alguns transformam falha em sucesso;
7. o banco vivo possui uma partição futura sem RLS, nove views públicas com `security_invoker=false` — estado cuja intenção precisa ser reconciliada com migrations historicamente contraditórias — e histórico de migrations não reproduzível pelo diretório local;
8. o fluxo de deploy de Edge Functions não demonstra canário nem rollback equivalente ao deploy web.

Portanto, “10/10” não será uma nota subjetiva. Será o estado em que instalação, build, typecheck, lint, testes, contratos código↔banco, migrations, E2E, visual, acessibilidade, observabilidade, canário e rollback produzirem evidências reais e nenhum P1 permanecer aberto.

## Método e limites

A simulação combinou:

- consulta ao grafo Graphify existente, com 29.262 nós;
- leitura de código, testes, workflows, migrations e documentação;
- execução local dos gates sem patches;
- Supabase MCP oficial read-only, limitado a `SELECT` e `pg_catalog`;
- inspeção somente leitura dos 30 runs recentes do GitHub Actions;
- seis revisões independentes por domínio.

Legenda usada abaixo:

- **E:** cenário reproduzido ou estado medido por comando/MCP;
- **M:** cenário modelado a partir do caminho executável e seus contratos;
- **P0:** corrupção/perda ativa; **P1:** bloqueador de release; **P2:** degradação relevante; **P3:** dívida controlada.

Nenhum cenário externo destrutivo foi disparado. Webhooks, CRM, e-mail, Storage, Edge Functions e deploys foram modelados a partir do código; a execução real pertence às etapas autorizadas de staging.

## Baseline reproduzida

| Verificação | Resultado | Leitura correta |
|---|---|---|
| `npm run ssot:all` | Passou | Projeto canônico e guardas preservados |
| `npm run build` | Passou; 6.220 módulos | Aplicação empacota, com avisos de Vite e chunks grandes |
| `npm run qa:typecheck` | Falhou; oito erros | Gate funcionalmente vermelho |
| `npm run test:ci-core -- --reporter=dot` | 839/840 | Sinal localizado, não cobertura geral |
| `npm run lint:baseline` | Crash no import de `minimatch` | Lint não foi executado |
| `npm run check:package-duplicate-scripts` | Crash “String não terminada” | Detector não mediu duplicidade |
| `npm run check:critical-coverage` | `coverage-summary.json` ausente | Cobertura crítica não foi medida |
| `npm run check:migration-refs` | 27 referências ausentes | Mistura docs reais com cache do Graphify |
| `npm run check:bundle-size` | Falhou | Baselines impossíveis de React/Router; total ainda abaixo do teto |
| `npm run check:edge-cors` | Passou | Verifica centralização e request ID, não CORS runtime completo |
| `npm run check:observability` | 5 passaram, 1 falhou, 3 skips | Não é sinal suficiente de prontidão remota |
| `npm run lint:lockfile` | Passou | `package-lock.json` está alinhado ao `package.json` atual |
| `npm ci --ignore-scripts --dry-run` | `ERESOLVE` | React 19 × peer React 18 de `cmdk@0.2.1` |
| GitHub Actions, últimos 30 runs | 30/30 bloqueados por orçamento | Nenhum produziu evidência de produto |
| Worktree original | Limpa | Nenhum artefato versionado foi alterado pela simulação |

O runtime usado na máquina foi Node `24.19.0`/npm `11.17.0`, enquanto o projeto fixa Node `20.20.2` e `npm@10.9.7`. Toda baseline sensível a runtime deverá ser repetida nas versões canônicas.

## Fotografia read-only do banco

| Evidência `pg_catalog` | Resultado |
|---|---:|
| Relações tabulares/partições em `public` | 391 |
| Views em `public` | 192 |
| Materialized views em `public` | 4 |
| Relações tabulares com RLS | 390/391 |
| Views sem `security_invoker=true` | 9 |
| Rotinas `SECURITY DEFINER` | 530 |
| Triggers de usuário desabilitados | 0 |
| Índices inválidos ou unready | 0 |
| Jobs cron | 137; 135 ativos |
| Versões no ledger | 2.354 distintas |

Objetos ausentes confirmados no catálogo do canônico: `webhook_events`, `simulation_runs`, `simulation_logs`, `bitrix_clients`, `audit_logs`, `system_error_logs`, `e2e_cleanup_audit`, `stock_notes`, `fn_ema_pipeline_health` e `check_auth_config_status`. A ausência, isoladamente, não prova que o objeto deva ser criado: cada candidato precisa ser associado a um consumidor executável e reconciliado com os objetos existentes — entre eles `inbound_webhook_events` e `audit_log` — antes de qualquer proposta de schema.

## Matriz consolidada de cenários

### A. Concorrência, governança e proteção

| ID | Nível | Cenário | Falha prevista | Detecção | Contenção/gate |
|---|---|---|---|---|---|
| S-01 | M/P1 | Claude, Hermes, Codex ou humano editam o mesmo arquivo | Patch correto sobrescreve mudança concorrente | status/diff antes e depois de cada lote | worktree e branch por agente; commits pequenos |
| S-02 | M/P1 | Lovable/autoheal faz push enquanto um lote é validado | Reintrodução silenciosa de SSOT, tipo ou configuração antiga | commit inesperado, Gate 0, sentinel | freeze de writers durante release |
| S-03 | M/P1 | conflito em `client.ts` resolvido por “main wins” | projeto proibido volta ao runtime e produção recebe 401 | `ssot:all`, diff semântico e grep canônico | arquivo protegido; revisão manual obrigatória |
| S-04 | M/P1 | regeneração de `types.ts` corre junto de correções do app | centenas de linhas e objetos protegidos desaparecem | contagens antes/depois e diff por conjunto | gerar em temporário; congelar regeneração concorrente |
| S-05 | M/P1 | migration nova entra antes do manifesto da etapa 087 | colisão/ordem não determinística aumenta | gate de nome/versão e ledger | freeze forward-only até 087 |
| S-06 | M/P2 | baseline antiga é usada após novo commit de outro agente | teste compara estados diferentes | SHA no relatório/PR e status limpo | rebase semântico e repetir gates afetados |

### B. CI, dependências e qualidade local

| ID | Nível | Cenário | Falha prevista | Detecção | Contenção/gate |
|---|---|---|---|---|---|
| S-07 | E/P1 | orçamento do Actions esgota | workflows ficam vermelhos sem executar steps | 30/30 runs com anotação de budget | classificar como bloqueio operacional, não bug |
| S-08 | M/P1 | npm e Bun resolvem árvores diferentes | bug aparece só em alguns workflows/caches | locks e workflows Bun; `bun.lockb` inexistente | escolher fonte única antes de regenerar lock |
| S-09 | E/P1 | instalação limpa resolve React 19 com `cmdk@0.2.1` | `ERESOLVE` ou árvore híbrida | `npm ci --dry-run` | compatibilizar pacote e tipos antes do lock |
| S-10 | E/P2 | Node/npm locais diferem dos canônicos | baselines variam por runtime | Node 24/npm 11 contra Node 20/npm 10 | repetir em runtime fixado |
| S-11 | E/P2 | `BrowserRouter.future` permanece no Router 7 | typecheck falha e testes usam flags heterogêneas | erro TS em `src/App.tsx` | tratar como contrato de navegação |
| S-12 | E/P2 | helpers de transição usam `motion` sem import | seis erros TS e caminho quebra quando usado | typecheck | patch isolado + regressão visual |
| S-13 | E/P2 | lint crasha no bootstrap | nenhuma regra é aplicada | import default de `minimatch` | corrigir executor antes da dívida |
| S-14 | E/P2 | detector de scripts interpreta aspas incorretamente | guard deixa de proteger 228 scripts | erro “String não terminada” | testes unitários do parser |
| S-15 | E/P2 | gate de cobertura lê artefato ausente/velho | falso vermelho ou falso verde | path/freshness do summary | alinhar produtor, consumidor e módulos reais |
| S-16 | E/P2 | baseline de bundle usa 225 bytes para React | gate falha sem representar regressão real | relatório do bundle | medir/gzip e rebaseline só com justificativa |
| S-17 | E/P2 | teste gera `fetch failed` sem reprovar o arquivo | rede inesperada vira falso verde | stderr da suíte | bloquear rede e falhar em console/rejection |
| S-18 | E/P2 | contrato espera ausência de `focus` | um teste falha após default `focus:auto` | diff do teste 179 | confirmar intenção antes de atualizar contrato |

### C. Contratos código ↔ banco e Edge handlers

| ID | Nível | Cenário | Falha prevista | Detecção | Contenção/gate |
|---|---|---|---|---|---|
| S-19 | M/P1 | webhook válido usa destino `webhook_events` ausente | ingestão retorna 500 e não persiste | handler real + `to_regclass` | ADR e teste real antes do patch |
| S-20 | M/P1 | produtor usa header HMAC histórico | 401 apesar de assinatura correta para outro contrato | matriz de headers/segredos | suportar contrato aprovado e deprecar explicitamente |
| S-21 | M/P1 | payload primitivo passa pelo HMAC | vira evento `unknown/custom` | teste de schema V1/V2 | rejeitar payload fora do envelope |
| S-22 | M/P1 | webhook é repetido após timeout | evento persiste duas vezes | idempotency key/nonce | comportamento idempotente testado; constraint, trigger ou tabela auxiliar somente com autorização BD |
| S-23 | M/P1 | simulation runner aceita 401/404/422 como êxito | relatório 200 produz confiança falsa | matriz de resultados | estados `passed/rejected/infra_failed/skipped` |
| S-24 | M/P1 | `simulation_runs/logs` falham ao persistir | simulação continua e apaga logs pendentes | erro de insert/update | partial failure explícito; sem DDL antecipado |
| S-25 | M/P1 | Bitrix remoto responde, upsert local falha | `sync_full` devolve `success:true` | teste de upsert rejeitado | separar sucesso remoto e persistência local |
| S-26 | M/P2 | helper grava em `audit_logs` ausente | trilha de segurança é perdida | canal canônico `audit_log` | logging best-effort, porém verificável |
| S-27 | M/P2 | visual search tenta registrar em tabela fantasma | falha principal perde causa forense | request ID + canal real | observabilidade canônica |
| S-28 | M/P1 | EMA health RPC ausente | painel falha e banner pode degradar silenciosamente | hooks ativos + catálogo | shape/testes antes de migration autorizada |
| S-29 | M/P2 | limpeza E2E falha em uma tabela | resposta geral ainda parece sucesso | mapa de erros por tabela | resultado parcial e idempotência |
| S-30 | M/P2 | `set_config` via PostgREST falha e é engolido | ator de revogação não chega ao audit trail | efeito observável do contexto | RPC explícita somente com autorização BD, ou retirada da tentativa |
| S-31 | M/P2 | `stock_notes` dormente é ligado à UI | caminho falha integralmente em runtime | detector `.from()`/consumidores | decisão PO antes de expor a feature ou remover o código órfão |

### D. Produto, UX, mocks e provenance

| ID | Nível | Cenário | Falha prevista | Detecção | Contenção/gate |
|---|---|---|---|---|---|
| S-32 | M/P1 | recomendação marcada como mock chama `QuickAddToQuote` | orçamento recebe ID sintético | teste sem side effect em preview | preview/demo não pode persistir |
| S-33 | M/P1 | magazine é criada com `organizationId:null` | dados órfãos ou invisíveis por RLS/filtro | contrato de org e E2E magazine | alinhar SSOT antes de alterar UX |
| S-34 | M/P1 | kit cria quote fora do helper canônico de organização | quotes e sync divergem entre fluxos | família de criadores de orçamento | payload único e contract tests |
| S-35 | M/P2 | preview de WhatsApp mostra fotos, `wa.me` envia texto | promessa visual não corresponde ao canal | teste preview×envio | explicitar capacidade ou mudar fluxo com design aprovado |
| S-36 | M/P1 | mockup salva `technique_id`/`product_id` nulos para continuar | provenance é perdida antes de IA/export | teste de origem e FK failure | falha explícita ou estado parcial sinalizado |
| S-37 | M/P2 | realtime de notificações falha durante burst | badge atrasa ou rede entra em flood | debounce/cache/polling e métricas | preservar canal único e testar degradação |
| S-38 | M/P2 | Product Match DEV usa mock em QA funcional | teste/screenshot não representa produção | marcador DEV/dataset | separar QA visual de funcional |

### E. Banco, RLS, jobs e migrations

| ID | Nível | Cenário | Falha prevista | Detecção | Contenção/gate |
|---|---|---|---|---|---|
| S-39 | E/P1 | partição `supplier_products_raw_history_p2026_11` entra em uso | acesso direto ocorre sem RLS | `pg_catalog` + grants | teste de acesso; mudança só com autorização BD |
| S-40 | E/P1 | nove views públicas mantêm `security_invoker=false` | semântica diverge da migration posterior | reloptions e histórico | reconciliar origem antes de `ALTER VIEW` |
| S-41 | E/P1 | `fn_super_filtro`/SECDEF é recriada com ACL antiga | superfície anônima reaparece | ACL por assinatura | nunca revogar/reaplicar em massa |
| S-42 | M/P1 | cron executa `TRUNCATE; INSERT` e segunda parte falha | tabela fica vazia até próximo run | definição e histórico do job | função transacional/idempotente |
| S-43 | M/P2 | vacuum multi-statement falha no primeiro alvo | alvos seguintes não recebem manutenção | `cron.job_run_details` | dividir/orquestrar com limites de lock |
| S-44 | E/P1 | rebuild trata 1.581 prefixos/version strings iniciais únicas locais como migrations replayáveis e os compara a 2.354 versões vivas | ambiente descartável não representa produção; a métrica local não é equivalência 1:1 com o ledger | manifesto version↔file↔hash↔effect | não aplicar nem renomear antes da reconciliação |
| S-45 | E/P1 | 37 prefixos colidem e 33 arquivos não têm versão | ordem lexical muda efeitos | gate de naming | política forward-only; sem rename retroativo |
| S-46 | E/P1 | migration crítica de 12/07 é reaplicada por existir no repo | efeitos parciais e referência a tabela ausente | comparar nove efeitos reais | classificar proveniência antes de qualquer replay |

### F. Integrações, deploy e release

| ID | Nível | Cenário | Falha prevista | Detecção | Contenção/gate |
|---|---|---|---|---|---|
| S-47 | M/P1 | `verify_jwt=false` e auth inline divergem | endpoint é bloqueado ou exposto indevidamente | inventário por função | reconciliar gateway, código e secrets |
| S-48 | M/P1 | `webhook-dispatcher` combina secret manual e JWT | JWT válido é rejeitado quando secret existe | teste dual-auth | um contrato de autorização |
| S-49 | M/P1 | limiter do callback CRM falha open sob storm | volume/duplicidade pressiona banco e Edge | rate/latência/request ID | idempotência + modo degradado explícito |
| S-50 | M/P2 | e-mail é logado antes de o provedor aceitar | dashboard parece entregue sem envio | estado `accepted/delivered/failed` | outbox/compensação observável |
| S-51 | M/P1 | deploy Edge paralelo não possui canário | regressão chega ao projeto inteiro | smoke pós-deploy | staging, lote pequeno e snapshot de versões |
| S-52 | M/P1 | rollback restaura web, mas não Edge/DB | produção fica em versões incompatíveis | matriz de compatibilidade | rollback unificado por camada |
| S-53 | M/P1 | drift-check pula por segredo ausente | release avança sem prova do banco | summary `skip/blocked` | gate não pode tratar skip como aprovação |
| S-54 | M/P1 | limpeza remove logo/alias público idêntico | URL externa/CDN quebra após deploy | inventário de consumidores | aprovação individual + alias + rollback |

## Gaps adicionais incorporados à execução

Os cenários revelaram dez requisitos transversais que não devem alterar a contagem de 100 etapas, mas passam a fazer parte de seus critérios de aceite:

1. **Freeze de escritores:** Lovable/autoheal, regeneração de types e migrations novas devem estar congelados durante a janela de release.
2. **Worktree obrigatória:** cada lote é isolado; `main` não recebe patch exploratório.
3. **Preview sem side effect:** todo componente `mock/demo/preview` deve provar que não persiste dado real.
4. **Família única de orçamento:** todos os criadores de quote precisam do mesmo contrato de organização e payload.
5. **Provenance antes de IA/export:** magazine, mockup e BI não podem degradar origem silenciosamente.
6. **Auth Edge em três camadas:** `config.toml`, gateway e handler precisam ser analisados juntos.
7. **CI executado de verdade:** `skip`, segredo ausente e orçamento não contam como verde.
8. **Rollback por camada:** web, Edge e banco precisam de versões compatíveis e reversão coordenada.
9. **Runtime canônico:** resultados finais serão repetidos em Node/npm fixados pelo projeto.
10. **Nenhuma limpeza junto do corte:** limpeza ocorre somente após estabilização observada e autorização por alvo.

## Ordem operacional após a simulação

### Onda 0 — proteção

- manter `main` limpa;
- trabalhar na branch/worktree isolada;
- registrar SHA antes de cada lote;
- revalidar status antes e depois de qualquer patch;
- não tocar migrations, banco ou deploy nesta onda.

### Onda 1 — recuperar a verdade dos gates

1. corrigir os erros locais e executores de typecheck/lint/scripts/cobertura;
2. resolver a instalação React/`cmdk` e fixar runtime/package manager;
3. repetir build, typecheck, lint, núcleo e bundle;
4. somente então usar a baseline como Definition of Done.

### Onda 2 — contratos sem DDL

1. criar testes reais dos handlers;
2. corrigir falsos verdes de webhook, simulação e Bitrix;
3. unificar logging/observabilidade em objetos existentes;
4. ampliar o detector código↔catálogo;
5. manter propostas de RPC/tabela somente como design até o manifesto de migrations.

### Onda 3 — produto e journeys

1. bloquear side effects de mocks;
2. reconciliar organização em magazine/kit/quotes;
3. preservar baselines visuais;
4. provar jornadas localmente com doubles e, depois, em staging autorizado.

### Onda 4 — banco e histórico

1. versionar fotografia `pg_catalog`;
2. mapear ledger, arquivos, hashes e efeitos;
3. reconstruir apenas banco descartável;
4. revisar RLS/ACL/jobs;
5. preparar migrations compensatórias sem aplicá-las remotamente.

### Onda 5 — Edge, staging e release

1. reconciliar deploy/auth/secrets das funções;
2. criar smokes e rollback de Edge equivalentes ao web;
3. executar staging/canário somente com autorizações específicas;
4. observar estabilidade;
5. limpar somente alvos individualmente aprovados.

## Stop conditions obrigatórias

A execução deve parar o lote, preservar evidências e reavaliar se ocorrer qualquer uma destas condições:

- worktree original ou branch-base ganha alteração concorrente não compreendida;
- diff toca arquivo protegido fora do escopo declarado;
- typecheck/teste perde campos críticos de `Product` ou guarda SSOT;
- nova migration aparece antes da etapa 087;
- um teste precisa de produção mutante para passar;
- um check retorna `skip` ou `inconclusivo` e é apresentado como verde;
- regressão visual não aprovada;
- rollback não consegue restaurar compatibilidade entre camadas;
- alteração de banco, GitHub, design, integração, deploy ou exclusão não possui a autorização específica do checklist.

## Gate de saída da simulação

Esta fase está concluída quando:

- a matriz acima estiver versionada;
- a implementação ocorrer em worktree isolada;
- os P1 estiverem ligados a teste, contenção e etapa do plano;
- produção continuar sem mutações;
- o primeiro lote se limitar a gates locais e correções reversíveis.

Atendidos esses requisitos, o próximo passo seguro é a Onda 1. Nenhum cenário desta simulação autoriza DDL, DML, deploy, chamada de provedor ou exclusão.
