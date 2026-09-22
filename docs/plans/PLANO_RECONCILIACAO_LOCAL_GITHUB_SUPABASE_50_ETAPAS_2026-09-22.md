# Plano de reconciliação Local ↔ GitHub ↔ Supabase canônico — 50 etapas

**Data-base:** 2026-09-22
**Escopo:** corrigir as divergências demonstradas na auditoria bidirecional e instituir provas repetíveis de paridade.
**Projeto Supabase único deste plano:** `doufsxqlfjyuvxuezpln`.
**Estado:** plano; nenhuma etapa abaixo autoriza por si só deploy, alteração de schema, reparo de ledger ou descarte de trabalho de outro agente.

Este documento substitui as **premissas operacionais**, não apaga o histórico, do [plano de 15/09](PLANO_RECONCILIACAO_LOCAL_GITHUB_SUPABASE_50_ETAPAS_2026-09-15.md). O [plano DBA de 16/09](PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md) continua sendo referência para decisões por objeto. Os itens abaixo são trabalho **pendente de revalidação ou execução**; evidência coletada em 22/09 é ponto de partida, não aprovação automática.

## Linha de base e limites

- Worktree principal limpa em `30e6e4501`, branch `claude/exec-plano-50-etapas-20260920` sem upstream; `origin/main` em `12c11e5dd`, com `2` commits exclusivos de cada lado e `17` caminhos diferentes. O código de runtime em `src/` não apresentou diff entre essas duas refs; doze migrations diferem apenas em comentários de rollback, mas isso ainda pode afetar hashes/recibos.
- A PR #1869 já está **mergeada** em `main`. Seu gate de ledger passou a falhar fechado. O check de linter do Supabase continua vermelho por HTTP `404` no endpoint de Management API; não converter isso em sucesso artificial.
- A CLI vinculada ao projeto canônico retornou `2.499` versões coincidentes, `474` somente locais e duas aparentemente somente remotas (`20260712` e `20260916155725`). Os `474` **não** são sinônimo de migrations pendentes. O primeiro ID remoto é colisão de prefixo local; o segundo corresponde a alteração direta de `public.zapp_catalog_stats()` com mirror forward-only ainda não aplicado.
- O snapshot vivo `SCHEMA_LIVE.sql` de 22/09 mostra mudança funcional em `public.zapp_catalog_stats()` em relação ao arquivo versionado de 16/09. `ALL_IN_ONE.sql` versionado também está desatualizado (18 blocos de migrations a menos). `SCHEMA_DRIFT.sql` é placeholder: não constitui prova de ausência de drift.
- Os tipos gerados temporariamente do banco vivo tinham `96` linhas adicionais, sem remoções: `quote_items.product_variant_id`, oito relações FK e as RPCs `set_custom_kit_pinned` e `zapp_catalog_stats`. Os nomes das `397` tabelas públicas, `193` views comuns e `15` enums comparados coincidiram; a contagem não cobre, por si só, todos os objetos/privileges do banco.
- O último relatório disponível de Edge Functions mostrou `108/108` alinhadas e `36` com `verify_jwt=false` documentado. É evidência temporal, não garantia contra deploy posterior fora do Git.

**Legenda:** `[RO]` leitura local/remota; `[GIT]` mudança de código/documentação/CI via PR; `[DB-RO]` somente leitura no banco; `[PO: DB]` exige autorização explícita do PO **por objeto/versão**, seguida de backup, janela, dry-run e rollback/compensação definidos. Nenhuma etapa inclui `db push` indiscriminado. Mudanças em workflow, GitHub ou Vercel devem respeitar as aprovações e proteções existentes.

**Definição de conclusão:** cada caixa só é marcada após registrar comando/consulta, alvo, horário UTC, SHA/versão, resultado e revisor em um relatório de execução. “Arquivo existe”, “CI verde” ou “CLI não reportou erro” isoladamente não bastam.

**Execução de 22/09:** dez etapas verificadas; as demais seguem parciais ou bloqueadas. Ver [relatório de execução](EXECUCAO_RECONCILIACAO_50_ETAPAS_2026-09-22.md). O estado global é **NÃO ALINHADO**: a migration de `handle_new_user()` existe no Git, mas a correção não aparece no corpo vivo da função.

## A. Controle de mudança e simulação de falhas (01–06)

- [x] **01. Congelar a linha de base** `[RO, P0]` — registrar SHA de `HEAD`, `origin/main`, refs de PRs relevantes, estado das worktrees, `git status`, versão da CLI e horário UTC. **Aceite:** manifesto reproduzível antes de qualquer edição.
- [ ] **02. Mapear trabalho simultâneo** `[RO, P0]` — ler reservas/ledger multiagente, branches, stashes e worktrees; identificar arquivos em disputa. **Aceite:** proprietário e destino de cada alteração conhecidos; nenhum arquivo de outro agente sobrescrito.
- [x] **03. Provar identidade de cada alvo** `[RO, P0]` — conferir project ref em `client.ts`, `.env.local` sem imprimir segredos, `supabase/.temp/project-ref`, CLI, workflow e metadata do artifact. **Aceite:** todos apontam para `doufsxqlfjyuvxuezpln`; MCP com inventário divergente é excluído da prova canônica.
- [ ] **04. Classificar fontes de verdade** `[RO, P0]` — separar código versionado, migrations aplicadas, schema vivo, snapshots gerados, configuração de Auth/Storage/Edge e dados de negócio. **Aceite:** cada comparação declara claramente qual lado é autoritativo e o que não consegue observar.
- [ ] **05. Simular concorrência e perda de trabalho** `[RO, P0]` — ensaiar novos commits do Lovable/Cline no meio da auditoria, branch remota apagada, PR já mergeada e arquivos modificados depois do baseline. **Aceite:** procedimento de rebase/recoleta sem `reset --hard` nem “main wins” cego.
- [ ] **06. Simular falsos positivos de sincronismo** `[RO, P0]` — testar colisão de IDs, migrations só locais já refletidas no catálogo, comentários SQL alterando hash, snapshot parcial e check 404. **Aceite:** matriz que distingue drift real, metadado divergente, diferença intencional e evidência insuficiente.

## B. Git, proveniência e publicação de código (07–14)

- [x] **07. Recoletar refs do GitHub** `[RO, P0]` — `fetch` sem merge, consultar estado da PR #1869 e comparar `HEAD...origin/main` por commit e por path. **Aceite:** deltas atuais registrados, sem reaproveitar a contagem de 22/09 se a main avançou.
- [ ] **08. Revisar os dois commits exclusivos locais** `[RO, P0]` — ler mensagens e diffs, associar cada alteração a autor/issue/PR e determinar se já existe equivalente semântico em main. **Aceite:** decisão individual de preservar, portar ou abandonar **com aprovação do proprietário**, nunca por antiguidade.
- [x] **09. Revisar os dois commits exclusivos remotos** `[RO, P0]` — validar scripts, testes e gate da PR #1869 contra sua justificativa; executar testes do gate. **Aceite:** adoção sem regressão das proteções de ledger e allowlist.
- [ ] **10. Tratar as 12 migrations com diff de comentário** `[RO/GIT, P0]` — comparar SQL executável normalizado, cabeçalhos, comentários de rollback e referências em manifestos. **Aceite:** comentários úteis preservados e decisão documentada para qualquer hash/recibo que mude; nenhum SQL histórico aplicado é reescrito para “resolver” divergência.
- [ ] **11. Reconciliar a branch local em worktree isolada** `[GIT, P0]` — integrar semanticamente as alterações remotas, mantendo proteção SSOT e mudanças locais legítimas; resolver conflitos arquivo a arquivo. **Aceite:** diff revisável, sem alterações acidentais em runtime/schema.
- [x] **12. Revalidar invariantes protegidos** `[GIT, P0]` — rodar Gate 0, conferir `CURRENT_PROJECT_ID`, guardas do projeto proibido e campos críticos de `Product`. **Aceite:** invariantes do `AGENTS.md` presentes antes/depois da integração.
- [ ] **13. Fechar refs sem upstream com rastreabilidade** `[GIT, P1]` — decidir destino da branch atual e de worktrees/branches antigas após verificar PRs, commits únicos e reservas. **Aceite:** nenhuma ref útil é descartada; refs obsoletas só são removidas mediante decisão explícita.
- [ ] **14. Publicar somente mudança revisada** `[GIT, P1]` — PR pequena, diff e testes anexados, revisão e checks obrigatórios; depois verificar SHA mergeado e SHA do deployment. **Aceite:** local, GitHub e build publicado apontam para a mesma linhagem de código, não apenas para nomes de branch iguais.

## C. Ledger e migrations (15–25)

- [ ] **15. Regerar inventário de migrations** `[RO/DB-RO, P0]` — listar arquivos por nome completo, prefixo/ID e checksum; obter ledger remoto por leitura. **Aceite:** arquivo de evidência com versões, colisões e data da coleta.
- [ ] **16. Reclassificar o aparente remoto-only `20260712`** `[RO/DB-RO, P0]` — relacionar as duas migrations locais de mesmo prefixo com o registro remoto e conteúdo aplicado. **Aceite:** falso positivo ou discrepância real demonstrada por SQL, não pela saída resumida da CLI.
- [ ] **17. Rastrear `20260916155725`** `[RO/DB-RO, P0]` — confrontar DDL vivo, logs/recibos disponíveis e o mirror `20260916210000_backfill_catalog_stats_price_range_top_colors_materials_20260916155725.sql`. **Aceite:** proveniência, efeito e risco de duplicação documentados.
- [ ] **18. Cruzar os 474 local-only com a classificação anterior** `[RO, P0]` — reconciliar por **arquivo e objeto**, não só por versão, com `CLASSIFICACAO_MIGRATIONS_SEM_LEDGER_2026-09-16.json`. **Aceite:** nenhuma versão classificada automaticamente como pendente apenas por ausência no ledger.
- [ ] **19. Investigar os 20 IDs ainda não classificados** `[RO/DB-RO, P0]` — incluir os novos pós-16/09 e colisões históricas; verificar efeitos atuais por `pg_catalog`. **Aceite:** status individual `aplicada sem ledger`, `pendente`, `obsoleta/no-op`, `colisão` ou `indeterminada`, com evidência.
- [ ] **20. Separar divergência de ledger da de schema** `[RO/DB-RO, P0]` — para cada versão local-only, comparar objetos/semântica antes de propor qualquer reparo. **Aceite:** duas filas independentes: metadados do histórico e DDL funcional realmente faltante.
- [ ] **21. Revisar ordem, dependências e idempotência** `[RO, P0]` — detectar migrations repetidas, renomeadas, com referências a funções/views inexistentes ou incompatíveis com PG17. **Aceite:** grafo de pré-requisitos e roteiro de dry-run por objeto.
- [ ] **22. Ensaiar falha em cada classe de migration** `[RO, P0]` — simular objeto já existente, função com assinatura diferente, política ativa, transação parcial e execução duplicada em clone isolado. **Aceite:** comportamento conhecido e reversão/compensação segura; nada executado no canônico.
- [ ] **23. Preparar pacotes de decisão para o PO** `[RO, P0]` — um pacote por objeto/versão com SQL exato, diff do catálogo, impacto, dependências, teste e plano de recuperação. **Aceite:** aprovação futura pode ser granular e informada.
- [ ] **24. Reparar metadados apenas se autorizado** `[PO: DB, P1]` — qualquer `migration repair`/registro equivalente exige aprovação por versão e prova de que o SQL correspondente já está vivo. **Aceite:** ledger pós-ação e catálogo inalterado conforme esperado; recibo arquivado.
- [ ] **25. Aplicar DDL apenas se autorizado** `[PO: DB, P1]` — migrations forward-only por objeto realmente faltante, após backup, revisão, dry-run e janela. **Aceite:** catálogo, grants/RLS, comportamento e ledger confirmados; sem aplicação em massa dos 474 IDs.

## D. Catálogo vivo, snapshots e integridade do banco (26–34)

- [ ] **26. Capturar catálogo canônico completo** `[DB-RO, P0]` — consultar `pg_catalog` para schemas, tabelas/partições, colunas/defaults, constraints, índices, funções, views/materialized views, triggers, enums, extensões, grants, RLS/policies, jobs e publicações. **Aceite:** contagens e definições datadas; sem confundir PostgREST com catálogo.
- [ ] **27. Comparar além do schema `public`** `[DB-RO, P0]` — identificar schemas de aplicação, Auth/Storage relevantes e objetos não cobertos pelo dump atual. **Aceite:** limite de cobertura e diferenças reportados explicitamente.
- [ ] **28. Revalidar `SCHEMA_LIVE.sql`** `[DB-RO, P0]` — comparar dump local versionado, artifact GitHub mais recente e nova captura, normalizando só quebras de linha/cabeçalhos transitórios. **Aceite:** diff funcional isolado e explicado.
- [ ] **29. Resolver semanticamente `zapp_catalog_stats()`** `[DB-RO, P0]` — validar assinatura, valores `price_min/max` e rankings de cor/material, privilégios e consumidores; comparar com mirror forward-only. **Aceite:** decisão documentada sobre fonte de verdade e migração necessária, sem supor que snapshot atualizado basta.
- [ ] **30. Atualizar snapshot versionado por fluxo gerador** `[GIT, P1]` — após decidir o item 29, regenerar `SCHEMA_LIVE.sql` com metadata de projeto/hora e diff revisado. **Aceite:** nenhuma substituição manual de definição nem omissão silenciosa de outro schema.
- [ ] **31. Regenerar `ALL_IN_ONE.sql` e reconciliar 18 blocos** `[GIT, P1]` — verificar inclusão, ordem e checksums de cada migration nova. **Aceite:** artefato reproduzível; sua presença não é usada como prova de aplicação no banco.
- [ ] **32. Restaurar cálculo real de drift** `[GIT/DB-RO, P1]` — investigar replay histórico, baseline e gaps; somente publicar `SCHEMA_DRIFT.sql` como resultado quando a comparação executar de fato. **Aceite:** falha explícita em caso de replay impossível, jamais comentário “não calculado” interpretado como zero drift.
- [ ] **33. Validar privilégios e comportamento de objetos críticos** `[DB-RO, P1]` — confrontar funções `SECURITY DEFINER`, `search_path`, grants, RLS/policies, triggers e cron com intenção documentada; simular perfis em ambiente isolado. **Aceite:** diferenças intencionais separadas de exposição/perda real.
- [ ] **34. Emitir inventário de mudanças fora de migration** `[DB-RO, P1]` — identificar DDL direto, alterações por dashboard, Edge/Auth/Storage settings e objetos sem proveniência. **Aceite:** cada achado tem origem provável, severidade, dono e ação proposta; desconhecido não vira “alinhado”.

## E. Tipos, contratos e testes de aplicação (35–41)

- [x] **35. Regenerar types em arquivo temporário** `[DB-RO, P0]` — usar `--project-id doufsxqlfjyuvxuezpln --schema public,graphql_public`, comparar AST e contagens antes de tocar `types.ts`. **Aceite:** diff revisado; nunca substituir cegamente o arquivo protegido.
- [x] **36. Validar cobertura de tabelas/views/enums** `[RO, P0]` — repetir comparação de nomes e colunas, incluindo `personalization_techniques`, `magazine_*`, `products`, `product_variants` e fornecedores. **Aceite:** nenhuma entidade previamente tipada desaparece sem explicação aprovada.
- [ ] **37. Reconciliar `quote_items.product_variant_id`** `[GIT, P1]` — adicionar Row/Insert/Update e oito relações FK por geração revisada; conferir nulabilidade/semântica no catálogo. **Aceite:** operações de orçamento compilam e testes de variante passam.
- [x] **38. Reconciliar as duas RPCs ausentes** `[GIT, P1]` — tipar `set_custom_kit_pinned` e `zapp_catalog_stats` conforme assinatura viva; revisar consumidor do Kit Maker e removê-lo de cast inseguro se possível. **Aceite:** chamadas compilam sem `as any` novo e preservam tratamento de erro.
- [ ] **39. Testar contratos de ponta a ponta** `[GIT, P1]` — cobrir preço/variante de orçamento, pin de kit, catálogo Zapp, concorrência e falhas de permissão com dados controlados. **Aceite:** testes reproduzem bug anterior e passam após ajuste; sem escrita em produção.
- [ ] **40. Rodar regressão proporcional ao diff** `[GIT, P1]` — typecheck, lint, unit/contract tests, Gate 0 e smoke de Kit Maker/Magazine/Auth. **Aceite:** falhas novas triadas por causa; snapshots não atualizados para esconder mudança de contrato.
- [ ] **41. Criar gate de drift de types** `[GIT, P2]` — comparar geração temporária com versão controlada e emitir diff claro em CI, com exceções documentadas para objetos não expostos. **Aceite:** uma coluna/RPC nova causa alerta acionável, não false green.

## F. Edge Functions, deploy e comportamento online (42–46)

- [ ] **42. Revalidar paridade das 108 Edge Functions** `[DB-RO, P1]` — obter relatório novo, hashes de fonte/deploy, projeto e horário; comparar com commit implantado. **Aceite:** diferenças posteriores ao artifact de 22/09 detectadas.
- [ ] **43. Auditar as 36 funções com JWT desativado** `[RO/DB-RO, P1]` — comprovar autenticação alternativa, segredo, assinatura/webhook, rate limit e grants de cada entrada. **Aceite:** exceção justificada por função; “documentado” não equivale a seguro.
- [ ] **44. Detectar deploy fora do repositório** `[RO/DB-RO, P1]` — comparar logs/metadata de Edge, dashboard e histórico Git; atribuir dono às publicações diretas. **Aceite:** plano de convergência sem sobrescrever Hotfix não versionado.
- [x] **45. Mapear GitHub → Vercel → produção** `[RO, P1]` — registrar commit de `main`, deployment ID, ambiente, domínio e status dos checks. **Aceite:** prova de que o código online corresponde ao SHA pretendido; “Vercel Success” isolado não basta.
- [ ] **46. Executar smoke não destrutivo de produção** `[RO, P1]` — `/api/health`, `/api/ready`, Auth/redirects e rotas críticas de Kit Maker e Magazine, com evidência visual/HTTP e conta de teste apropriada. **Aceite:** resultado por fluxo, sem criar pedidos, kits ou dados reais sem autorização específica.

## G. Gates, segurança e certificação (47–50)

- [x] **47. Corrigir o linter 404 sem false green** `[GIT, P0]` — confirmar contrato atual da Management API e substituir por auditoria `pg_catalog` read-only ou integração suportada; testar sucesso, 404, 401 e timeout. **Aceite:** falha real bloqueia, indisponibilidade é distinguida de zero findings.
- [ ] **48. Validar proteção efetiva dos gates** `[RO/GIT, P0]` — conferir rulesets/required checks, `continue-on-error`, permissões e branches alvo para Gate 0, ledger, schema e type drift. **Aceite:** PR de teste com divergência é realmente impedida de merge; orçamento/quota de Actions não vira aprovação.
- [ ] **49. Repetir auditoria bidirecional integral** `[RO/DB-RO, P0]` — comparar novamente Local↔GitHub, GitHub↔deploy, migrations↔ledger, snapshots↔catálogo, types↔schema, Edge↔repo e configurações relevantes. **Aceite:** relatório com SHA, project ref, checksums, horário e classificação de toda diferença residual.
- [ ] **50. Emitir veredito e fila residual** `[RO, P0]` — assinar `ALINHADO`, `ALINHADO COM EXCEÇÕES APROVADAS` ou `NÃO ALINHADO`; registrar lacunas, responsável, prazo e aprovações pendentes. **Aceite:** 50 evidências auditáveis, nenhum `indeterminado` convertido em concluído e nenhum objeto de banco alterado sem autorização granular.

## Ordem crítica, paradas e resultado esperado

**Caminho crítico:** 01–06 → 07–12 → 15–23 → 26–29/35–36 → decisões do PO para 24–25 → 30–46 → 47–50. Os itens independentes podem ser investigados em paralelo, mas a linha de base deve ser revalidada se `main` ou o banco mudar durante a execução.

**Parar e pedir direção** antes de: apagar/alterar migration histórica; `migration repair`; aplicar DDL no projeto canônico; descartar commits/stashes/branches de outro agente; trocar permissões/required checks; publicar deploy que substitua hotfix não versionado. Um resultado inconclusivo permanece aberto.

**Meta verificável:** paridade demonstrada por evidências atuais e limites explícitos, sem prometer “10/10” por contagem de checkboxes ou por um check verde isolado. O banco, o repositório e a produção podem estar em estados legitimamente distintos durante uma migração; a reconciliação fecha apenas quando cada diferença tiver explicação e destino aprovados.
