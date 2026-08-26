# Plano de governança do banco — auditoria read-only (etapas 069–080)

> **Projeto canônico:** `doufsxqlfjyuvxuezpln` (Gold/Medallion)
>
> **Data:** 26 de agosto de 2026
>
> **Escopo:** etapas 069–080 do plano de 100 etapas: tabelas com estimativa zero, dependências de colunas, constraints/índices, RLS/policies, `SECURITY DEFINER`, enums, extensões, grants e jobs/manutenção.
>
> **Limite desta entrega:** somente análise e plano. Nenhum dado de aplicação foi lido; nenhum DDL, DML, `VACUUM`, `ANALYZE`, `REFRESH`, mudança de cron, GRANT/REVOKE, migration, deploy ou configuração remota foi executado.

## 1. Estado da evidência e regra de interpretação

Esta auditoria não trata um snapshot antigo como se fosse estado atual. A tabela abaixo separa a evidência confirmada **na data de cada fotografia** do que permanece sem confirmação ao vivo em 26/08.

| Nível | Fonte | Data/alcance | O que pode ser afirmado | Limitação |
|---|---|---|---|---|
| E1 — fotografia de referência | `docs/SCHEMA_REFERENCE.md` | 16/07/2026; `pg_catalog`/`information_schema`, read-only | Contagens e postura de segurança daquela fotografia: 388 relações `public`, 1.277 funções (529 `SECURITY DEFINER`), 906 policies, 1.242 índices, 136 crons (134 ativos) e 16 extensões. | É explicitamente um retrato datado. |
| E2 — fotografia mais recente do repositório | `docs/AUDITORIA_EXAUSTIVA_E_PLANO_100_ETAPAS_2026-08-26.md` | 26/08/2026; auditoria documentada como `pg_catalog`/leitura | Inventário detalhado de 391 relações, RLS, ACL, jobs, tipos e drift de segurança descritos neste documento. | Não foi repetida por **este** gateway; deve ser reconciliada com a fotografia live read-only preparada em paralelo. |
| E3 — evidência estática local | migrations, scripts, testes e fontes do repositório | 26/08/2026 | Relações históricas e contratos versionados; por exemplo, intenção de jobs, hardening e referências literais a enums/extensões. | Não prova o que está aplicado no banco nem captura SQL dinâmico/consumidores externos. |
| E4 — confirmação live deste canal | MCP `supabase_producao`, somente leitura | Tentada em 26/08/2026 | **Nenhuma contagem nova neste canal.** O gateway recusou todos os `SELECT` de metadados porque a RPC interna `exec_sql()` não existe e solicitou bootstrap ou token de Management API. | Não foi feito bootstrap, configuração de secret ou qualquer contorno, pois isso alteraria infraestrutura fora do escopo read-only. |

**Escopo do bloqueio E4:** ele é específico ao gateway `supabase_producao`; não afirma indisponibilidade de outro canal autorizado e somente leitura. A fotografia live independente do canal `supabase-prod-ro` foi versionada em [`FOTOGRAFIA_PG_CATALOG_2026-08-26.md`](FOTOGRAFIA_PG_CATALOG_2026-08-26.md), com projeto, método, assinaturas e limitações. Seus resultados prevalecem para contagens atuais; este documento continua sendo a matriz de governança/decisão, não uma fonte concorrente de números live.

Portanto, termos como “confirmado” abaixo significam “confirmado na fotografia E1 ou E2, com fonte e data identificadas”, exceto quando substituídos pela fotografia live paralela identificada acima. Nada abaixo autoriza concluir que o estado remoto ainda é idêntico sem essa reconciliação.

### 1.1 Contagens que exigem reconciliação, não suposição

| Objeto | E1 — 16/07 | E2 — 26/08 | Leitura segura |
|---|---:|---:|---|
| Relações tabulares `r` + `p` | 388 | 391 | Há +3; duas partições foram explicadas, mas resta uma relação de auditoria sem proveniência reconciliada. |
| Atributos em todas as relações | 7.571 | 7.723 | Há +152 aparentes; partições/projeções tornam a comparação bruta insuficiente para chamar coluna de “nova” ou “perdida”. |
| Views | 190 | 192 | Há +2; uma materialized view foi movida para `internal`, não há prova de perda por essa mudança isolada. |
| Materialized views em `public` | 5 | 4 | A diferença é explicada pela movimentação de `mv_product_leaf_category` para `internal`, mas deve constar no diff canônico. |
| Overloads de função | 1.277 | 1.280 | Há +3; não classificar como criação intencional sem versão/assinatura/owner. |
| Policies | 906 | 927 | Há +21; RLS e policy precisam ser comparados por objeto e expressão, não por total agregado. |
| Índices | 1.242 | 1.170 | Há −72; migrations de deduplicação são evidência parcial, não prova de que cada remoção foi segura. |
| Foreign keys | 395 | 396 | Há +1; precisa de diff de definição e dependência. |
| Cron jobs / ativos | 136 / 134 | 137 / 135 | Há +1 / +1; falta ligar nome, comando, histórico e owner ao ledger. |

## 2. Invariantes de governança aplicáveis a todas as etapas

1. `reltuples`, `n_live_tup`, ausência de scan ou ausência de referência literal não são prova de abandono. Há casos históricos documentados de pai particionado e tabela nunca analisada que aparentavam zero, mas não estavam vazios.
2. Nenhuma tabela, coluna, função, extensão, índice, policy, privilégio ou job é candidato a alteração apenas por este plano. Ações remotas continuam condicionadas a `[AUTORIZAÇÃO BD]` explícita do PO.
3. A fonte de inventário é `pg_catalog`; PostgREST/OpenAPI não é fonte suficiente para trigger, policy, cron, GRANT, dependência ou distinção entre view e tabela.
4. O escopo de segurança é o efeito combinado de ownership, ACL, `SECURITY DEFINER`/`security_invoker`, RLS, policy e caller. Um GRANT isolado não prova acesso; a falta de RLS numa relação com GRANT amplo, porém, é material.
5. Uma migration histórica não é prova de aplicação. O ledger e o catálogo vivo precisam concordar antes de se corrigir “drift”.

## 3. Etapa 069 — relações com estimativa zero: finalidade e owner

### Evidência confirmada nas fotografias

- E2 identificou **136 relações com `reltuples = 0`**. A lista completa está em `AUDITORIA_EXAUSTIVA_E_PLANO_100_ETAPAS_2026-08-26.md` na seção “Tabelas com estimativa de zero linhas”.
- O próprio snapshot registra que várias têm foreign keys, policies, índices ou triggers. Logo, “zero” significa apenas candidato a investigação.
- Há falsos positivos históricos importantes: `supplier_products_raw_history` como pai particionado e tabelas que nunca tinham recebido `ANALYZE`; há também tabelas de uso real via `SECURITY DEFINER`, como `organization_members` no levantamento anterior.
- As partições futuras de magazine e de histórico de fornecedores aparecem na lista. Isso é compatível com ciclo de vida planejado e não é evidência de lixo.

### Matriz de triagem — não é atribuição fictícia de owner

| Cluster de finalidade provável | Exemplos da fotografia E2 | Situação técnica | Dono responsável a confirmar |
|---|---|---|---|
| Partições, retenção e manutenção | `magazine_public_view_events_*`, `supplier_products_raw_history_p2026_09..11` | Ciclo de vida temporal plausível; pai/filha não podem ser avaliados apenas por estatística. | Engenharia de Dados / DBA — nome e política de retenção pendentes. |
| Segurança, auditoria, chaves, rate limit e telemetria excepcional | `access_blocked_log`, `audit_log`, `bot_detection_log`, `mcp_*`, `rls_denial_log`, `step_up_*`, `edge_function_invocations` | Logs/tokens podem estar corretamente vazios até o primeiro evento; vários protegem fluxos de exceção. | Segurança/Plataforma — nome, retenção e consumidor pendentes. |
| Catálogo, normalização e enriquecimento | `attribute_equivalences`, `product_component_*`, `product_group_*`, `product_sync_logs`, `optimization_queue*` | Pode ser feature de backoffice, fila ou pipeline ainda sem carga; depende de triggers, RPCs e Edge Functions. | Catálogo/Medallion — owner e condição de ativação pendentes. |
| Kits, magazines, mockups e Magic Up | `kit_*`, `magazine_*`, `mockup_*`, `magic_up_*`, `generated_mockups` | O relatório E2 classifica essas estruturas como “em construção/sem uso observado”, não como lixo. | Produto — owner de feature, data de lançamento e critério de arquivamento pendentes. |
| Webhooks e integrações | `webhook_*`, `external_connections*`, `connection_test_history`, `companies`, `expert_*` | Há ligações incompletas e job desativado; vazio pode ser consequência de defeito, não de abandono. | Integrações/PO — contrato externo e substituto pendentes. |
| Preferências, favoritos, comparações e notificações | `user_*`, `favorite_*`, `recently_viewed_products`, `notifications`, `push_subscriptions` | São estruturas por usuário/organização; zero é normal antes de adoção ou em ambiente novo. | Produto/Identidade — owner e métrica de adoção pendentes. |
| Comercial e planejamento | `quote_*`, `seller_cart*`, `sales_goals`, `scheduled_reports`, `saved_trends_views` | Podem ser módulos parciais ou com gatilho ausente; não há evidência de descarte. | Comercial/Produto — decisão de continuidade pendente. |

### Estado da etapa

**Parcial e bloqueada para aceite.** O inventário e a taxonomia foram preservados, mas não existe atribuição de owner nominal, finalidade confirmada e ciclo de vida para as 136 relações. Não há proposta de exclusão.

### Perguntas obrigatórias ao PO/DBA

1. Quem é o owner nominal de cada cluster e quem aprova retenção/arquivamento?
2. Quais módulos estão deliberadamente pré-provisionados para lançamento futuro e qual é a janela esperada de primeira escrita?
3. Quais tabelas de log/token são obrigatoriamente “vazias até incidente”, e quais precisam de alerta se continuarem vazias por período definido?
4. Para cada relação com origem em integração, há consumidor externo ou somente código local?
5. Há tabela de backup/arquivo fora dos schemas canônicos que depende de política de retenção do PO, em vez de inferência por estatística?

## 4. Etapa 070 — mapa de dependências de colunas

### Evidência confirmada nas fotografias

Na fotografia E2 foram registrados **5.086 atributos** de relações `r/p` e **7.723 colunas** contando views/MVs; também foram levantadas **1.324 constraints**, **1.170 índices**, **385 triggers** e **192 views**. Isso é uma base de cobertura estrutural, não uma prova de que todas as colunas sem referência literal estejam órfãs.

O repositório contém gates e histórico que reconhecem dependências além do frontend: `pg_depend`, defaults/colunas geradas, constraints, índices, triggers, policies, corpos de função, views/MVs e comandos de cron. Essa abrangência é necessária porque helpers de RLS, por exemplo, podem parecer órfãos no código da UI e ainda serem essenciais em policy.

### Protocolo de prova antes de chamar uma coluna de órfã

Uma coluna só pode entrar em lista de depreciação depois de evidência acumulada para todos os itens abaixo:

1. Não participa de PK, FK, unique, check, exclusion, default ou coluna gerada.
2. Não é lida/escrita por view, MV, regra de reescrita, trigger ou índice/expressão parcial.
3. Não é usada em policy RLS nem em função de política por dependência direta ou indireta.
4. Não é referenciada em assinatura, corpo de função, SQL dinâmico conhecido, job/cron ou Edge Function.
5. Não aparece nos contratos TypeScript, serviços, testes, fixtures, integrações externas ou exportações públicas; busca literal sozinha não basta.
6. O owner do domínio confirma que não há consumidor fora do repositório e que existe rollback testável.

### Estado da etapa

**Preparada, não concluída.** A fotografia fornece contagens globais e o protocolo evita falsos positivos, mas ainda falta o mapa `coluna → todos os dependentes` e a inspeção de SQL dinâmico/consumidores externos. Nenhuma coluna foi classificada como órfã.

### Bloqueios

- O gateway MCP `supabase_producao` não conseguiu executar a leitura de `pg_depend`/`pg_attribute` nesta sessão; isso não invalida a fotografia `supabase-prod-ro` em produção paralela.
- Não há autorização para executar testes de mutação ou para consultar conteúdo de dados de aplicação.
- O histórico de migrations contém drift e nomes sem versão; a origem de uma dependência pode estar apenas no banco vivo.

## 5. Etapa 071 — constraints e índices

### Evidência confirmada nas fotografias

| Medida na fotografia E2 | Quantidade | Leitura correta |
|---|---:|---|
| Relações tabulares com PK | 391/391 | Saúde estrutural positiva; não prova ausência de problema de modelo. |
| Foreign keys | 396 | Nenhuma estava marcada como não validada. |
| Unique constraints | 190 | Nenhuma estava marcada como não validada. |
| Check constraints | 347 | Nenhuma estava marcada como não validada. |
| Índices | 1.170 | Todos apareciam válidos e prontos; isso não mede seletividade, custo de escrita ou valor de negócio. |
| Índices únicos | 632 | Incluem os índices de PK; não podem ser tratados como índice comum sem avaliar constraint associada. |

Não foi encontrado índice inválido ou `unready` nem constraint `NOT VALID` na fotografia E2. A redução de **72 índices** entre E1 e E2 continua sem classificação individual. A existência de migrations de deduplicação explica parte do cenário, mas não autoriza marcar todo o delta como intencional.

### Estado da etapa

**Parcial.** A integridade catalográfica foi fotografada; ainda faltam uso de índices ao longo de ciclo de carga, planos de consulta, custo de escrita, FK sem índice de suporte quando aplicável e rollback por proposta. Nenhum índice/constraint deve ser removido, recriado ou validado nesta etapa.

### Perguntas ao DBA

1. As estatísticas de uso foram acumuladas tempo suficiente após reset/redeploy para suportar decisão?
2. Qual é a janela de carga representativa para catálogo, Bronze/Silver/Gold, auth e jobs?
3. Para cada índice do delta −72, qual é a definição anterior, migration/ledger, motivo, plano e rollback?
4. Há constraints com regra de negócio ainda não expressa no frontend, Edge Function ou documentação?

## 6. Etapas 072 e 073 — matriz de RLS/policies e partição sem RLS

### Evidência confirmada nas fotografias

| Item | E1 — 16/07 | E2 — 26/08 | Situação |
|---|---:|---:|---|
| Relações com RLS | 388/388 | 390/391 | O aumento de relações exige reconciliação; E2 aponta uma exceção material. |
| Policies | 906 | 927 sobre 388 relações | Diferença precisa ser explicada por policy/expressão, não por contagem. |
| `FORCE ROW LEVEL SECURITY` | — | `mcp_api_keys` | Registrado em E2; deve ser preservado até prova contrária. |
| Relação RLS sem policy: `anon_catalog_grant_audit_log` | 0 no agregado E1 | presente em E2 | `deny-all` provável; intenção e criação não estão reconciliadas com o repositório. |
| Relação RLS sem policy: `magazine_public_view_events_2026_11` | 0 no agregado E1 | presente em E2 | Partição futura sem grant direto a `anon`/`authenticated`; o pai possui regra aplicável ao acesso normal. Intenção plausível, ainda a confirmar. |
| Relação sem RLS: `supplier_products_raw_history_p2026_11` | não registrada em E1 | presente em E2 | Exceção real: há grants diretos de `SELECT/INSERT/UPDATE/DELETE` a `authenticated` segundo E2. |
| Views com `security_invoker=false` | 0 | 9 | Drift confirmado na fotografia E2 contra a intenção da migration `20260717000063_fix_public_grant_revoke_and_analytics_schema.sql`. |

As nove views que exigem matriz de acesso são: `v_kit_component_media_public`, `v_kit_component_print_areas_public`, `v_product_compositions_public`, `v_product_properties_public`, `v_product_tags_public`, `v_products_public`, `v_suppliers_public`, `v_tabela_preco_gravacao_oficial_public` e `v_variant_sale_prices_public`.

### Matriz de teste a registrar antes de qualquer mutação

| Alvo | Personas a testar | Evidência necessária | Estado |
|---|---|---|---|
| Relação sem RLS `supplier_products_raw_history_p2026_11` | `anon`, `authenticated`, `service_role` | leitura/escrita permitida ou negada por operação, GRANT efetivo, herança de partição e comportamento antes/depois proposto. | Não executado; requer acesso read-only e ambiente/personas controladas. |
| Relações `deny-all` prováveis | `anon`, `authenticated`, `service_role` | prova de negação intencional e justificativa de policy explícita ou ausência deliberada. | Não executado; origem live-only não reconciliada. |
| Nove views públicas | `anon`, `authenticated`, `service_role` | conjunto de colunas expostas, ACL, owner e efeito de `security_invoker` sobre as bases. | Não executado; E2 registra regressão, não correção. |

### Estado das etapas

- **072 — Parcial:** há testes e scripts de RLS no repositório, mas a matriz de acesso atual não foi rodada nesta sessão e os testes com credenciais podem pular quando o endpoint/meta não está disponível. Não se deve interpretar `skip` como verde.
- **073 — Preparada e bloqueada por autorização:** há evidência suficiente para priorizar `supplier_products_raw_history_p2026_11` antes de seu primeiro uso, mas nenhuma policy/RLS/grant foi alterada. A mudança só pode ser desenhada, testada e aplicada na etapa 090 com `[AUTORIZAÇÃO BD]` e rollback aprovado.

### Perguntas ao PO/DBA

1. A partição `supplier_products_raw_history_p2026_11` pode receber escrita antes de a correção ser aplicada? Se sim, qual é a mitigação operacional imediata aprovada?
2. `anon_catalog_grant_audit_log` deve permanecer `deny-all` por design? Quem é o único writer/leitor esperado?
3. A partição de magazine sem policy deve continuar herdando o comportamento do pai ou receber policies explícitas para auditabilidade?
4. As nove views foram recriadas por uma alteração pós-migration 063, por objeto live-only ou por reversão? Qual PR/migration é a fonte de verdade?

## 7. Etapa 074 — rotinas `SECURITY DEFINER`

### Evidência confirmada nas fotografias

- E1 registrou **529** rotinas `SECURITY DEFINER`, com **zero** sem `search_path` e 22 executáveis por `anon` naquele momento.
- E2 registrou **530** rotinas `SECURITY DEFINER`; **10** executáveis efetivamente por `anon`, **70** por `authenticated` e **uma** por `PUBLIC`. As categorias de acesso se sobrepõem, portanto não devem ser somadas como população distinta.
- E2 apontou a assinatura de `fn_super_filtro` como executável por `PUBLIC`, `anon`, `authenticated` e `service_role`, contrariando a intenção documentada da migration `20260716000059_fix_revoke_public_grant_catalog_functions.sql`.
- O repositório contém checks de hardening de novas migrations e um gate de ACL, mas o gate runtime pode pular sem credenciais. Ele não substitui a revisão por assinatura/caller do estoque já existente.

### Ordem de revisão sem revogação em massa

| Prioridade | Lote | Critério de aceite antes de mudar ACL/search path |
|---|---|---|
| P0 | `fn_super_filtro` e toda rotina com `PUBLIC` efetivo | Reconstruir caller, assinatura, dados retornados, dependência de policy/view, ACL desejada e teste de regressão do catálogo público. |
| P1 | 10 rotinas executáveis por `anon` | Classificar explicitamente: API pública intencional, helper de token, função de policy ou exposição indevida; documentar assinatura completa, não apenas nome. |
| P2 | 70 rotinas executáveis por `authenticated` | Separar funções de usuário, admin, pipeline/cron e helper RLS; validar papel mínimo e políticas chamadoras. |
| P3 | Demais `SECURITY DEFINER` | Confirmar caller, `search_path`, owner, dependências, grants e justificativa operacional por lote de domínio. |

### Estado da etapa

**Parcial.** Há inventário, prioridades e um drift material identificado; ainda faltam 530 fichas por assinatura, caller e finalidade. A condição “zero sem `search_path`” é confirmada apenas para E1, não revalidada ao vivo nesta sessão. Nenhuma revogação está preparada em massa.

## 8. Etapa 075 — enums sem coluna direta

E2 identificou **28 enums no total**, sendo **15 em `public`**. Cinco não aparecem associados diretamente a coluna na fotografia: `categoria_cor_enum`, `familia_cor_enum`, `payment_status`, `silver_norm_status` e `tipo_cor_enum`.

Uma varredura estática local, sem incluir snapshots concatenados e sem ler dados, encontrou o seguinte. É evidência de referência no repositório, não prova de dependência completa no banco:

| Enum | Evidência estática encontrada | Conclusão segura |
|---|---|---|
| `categoria_cor_enum` | Criação/reconciliação em migration histórica. | Pode ser reserva de evolução, tipo de função ou objeto live-only; não propor remoção. |
| `familia_cor_enum` | Criação/reconciliação em migration histórica. | Mesma conclusão; ausência de uso literal no app não prova ausência de dependência. |
| `tipo_cor_enum` | Criação/reconciliação em migration histórica. | Mesma conclusão. |
| `payment_status` | Criação/reconciliação, variável tipada em `sync_order_payment_status()` e campos homônimos no tipo gerado. | Há dependência de rotina/contrato histórico; não é candidato a depreciação. |
| `silver_norm_status` | Nenhuma referência literal encontrada nos diretórios de código/migrations verificados. | Continua indeterminado: pode ser dependência de função, SQL dinâmico, tipo de domínio/array, consumer externo ou apenas estado live-only. |

### Estado da etapa

**Parcial.** A lista de cinco e a evidência estática estão registradas, mas falta varrer dependências catalográficas e confirmar consumo externo. Nenhum enum é candidato a remoção nesta fase.

## 9. Etapa 076 — extensões

E1 e E2 registram **16 extensões instaladas**: `http`, `hypopg`, `index_advisor`, `moddatetime`, `pg_cron`, `pg_graphql`, `pg_net`, `pg_stat_statements`, `pg_trgm`, `pgcrypto`, `pgmq`, `plpgsql`, `supabase_vault`, `unaccent`, `uuid-ossp` e `wrappers`.

| Família | Extensões | Evidência de necessidade ou cautela | Owner nominal a confirmar |
|---|---|---|---|
| Linguagem e plataforma | `plpgsql`, `supabase_vault`, `wrappers` | Parte do runtime/infraestrutura Supabase ou dependência potencialmente indireta. Não há prova de removibilidade. | DBA/Plataforma. |
| Jobs e integração de rede | `pg_cron`, `pg_net`, `http`, `pgmq` | Há jobs e Edge Functions chamados por cron; `pg_net` aparece em fluxos de cron/reconciliação. A simples ausência de nome literal de `pgmq` não prova ausência de objetos dependentes. | Plataforma/Integrações. |
| Segurança, identificadores e busca | `pgcrypto`, `uuid-ossp`, `pg_trgm`, `unaccent` | Há usos históricos de `digest`, UUID, ranking/busca e normalização textual. Mudar schema/search path pode quebrar funções endurecidas. | Catálogo/DBA. |
| API e observabilidade | `pg_graphql`, `pg_stat_statements` | Há hardening de superfície GraphQL e observabilidade/slow-query documentada. | Segurança/Plataforma. |
| Diagnóstico/otimização | `hypopg`, `index_advisor` | Não foram encontrados usos literais locais nesta varredura curta; podem ser ferramentas de DBA instaladas e não devem ser chamadas de lixo. | DBA. |
| Triggers utilitários | `moddatetime` | Há triggers versionados que chamam `moddatetime('updated_at')`. | DBA/Catálogo. |

### Estado da etapa

**Parcial.** As 16 estão inventariadas e nenhuma foi classificada como lixo. Falta mapear objeto dependente, owner, ambiente, custo e plano de reversão antes que qualquer uma sequer se torne candidata a remoção.

## 10. Etapa 077 — matriz de grants efetivos

### Evidência confirmada na fotografia E2

As contagens seguintes abrangem relações (tabelas, views e MVs), portanto podem superar o número de relações tabulares:

| Papel/superfície | Evidência E2 | Interpretação correta |
|---|---|---|
| `anon` em relações | `SELECT` em 56, `INSERT` em 231, `UPDATE`/`DELETE` em 229 | Em tabela com RLS, ACL nominal não basta para concluir acesso; em view/MV, a análise depende de ACL, owner, `security_invoker` e bases. |
| `authenticated` em relações | `SELECT` em 432 e mutação em mais de 330 | Precisa de matriz por endpoint/objeto; o total não permite revogação segura. |
| `service_role` | Bypassa RLS | É necessário para Edge Functions, mas cada caller/secret/escopo deve ser revisado separadamente. |
| `PUBLIC`/funções | `fn_super_filtro` aparece como caso de drift | Grant de função exige análise de assinatura, RLS helper e consumidor, nunca regexp por nome. |
| Partição sem RLS | `supplier_products_raw_history_p2026_11` com grant direto a `authenticated` | É a combinação que transforma ACL ampla em risco imediato; deve ter prioridade antes de uso. |

### Estado da etapa

**Parcial.** Há medidas globais e um caso prioritário, mas não a matriz efetiva `role × objeto × operação × caller × resultado RLS`. Nenhum `REVOKE` foi proposto ou executado.

## 11. Etapas 078–080 — jobs, cron e manutenção

### Evidência confirmada nas fotografias

| Job | Evidência | O que é confirmado | O que continua em aberto |
|---|---|---|---|
| `process-webhook-outbox` | E2; migration local `cron_p0_disable_webhook_outbox_missing_secret_20260623.sql` | Está desativado na fotografia por falta de `WEBHOOK_DISPATCHER_URL`; o job originalmente chamava `fn_process_webhook_outbox_batch()` a cada minuto. | Não há consumidor substituto confirmado, segredo configurado, teste de idempotência ou decisão de produto sobre a fila. Reativar poderia descarregar backlog ou duplicar dispatch. |
| `pipeline-classify-categories` | E2 e documentação histórica divergente | Está desativado e sem execução na fotografia E2. Uma migration antiga o agenda para `fn_backfill_product_categories(300, false)`. | Há conflito documental: um certificado de arquitetura posterior o chama de legado, com alvo removido e classificação trigger-driven. É preciso escolher fonte de verdade antes de reativar/remover. |
| `vacuum-high-dead-tuples` | E2; `docs/estado/13_RUNTIME_BANCO.md` | Ativo, semanal; E2 registra uma falha em 23/08 e nenhum sucesso nos sete dias observados. Fotografia anterior registrava três execuções e três falhas. | A definição/comando e o erro de `cron.job_run_details` não aparecem nas migrations locais encontradas; pode ser drift/live-only. Sem esses dados não se conhece causa nem correção segura. |

O E1 também registrou **61 jobs multi-statement** e explicitou que `VACUUM` em `pg_cron` precisa respeitar as limitações de transação/single-statement. Isso é alerta histórico: não permite concluir que os mesmos 61 comandos ainda existam em 26/08 sem leitura atual de `cron.job` e de seus detalhes de execução.

### Estado das etapas

- **078 — Parcial e bloqueada:** a causa da desativação é documentada, mas falta validar endpoint/segredo/idempotência/backlog e obter aprovação para qualquer mudança.
- **079 — Parcial e bloqueada:** há evidência de versões contraditórias do desenho de categorias; o owner de Medallion precisa declarar se o trigger-driven substitui de fato o cron.
- **080 — Preparada e bloqueada:** o job falho foi priorizado, mas falta ler o comando e erro atuais, definir limites de lock/tempo, rollback e janela DBA. Não rodar `VACUUM`, especialmente `FULL`, é a postura correta até então.

### Perguntas ao PO/DBA

1. Qual endpoint é o dispatcher canônico de webhook, como o segredo é fornecido e qual é o limite seguro de backlog/retry?
2. A fila `webhook_outbox` deve ser drenada, descartada por regra de retenção ou mantida parada até que o webhook inbound/outbound seja corrigido?
3. `pipeline-classify-categories` foi substituído por trigger? Em caso afirmativo, qual trigger/função e qual métrica prova que produtos novos recebem categoria corretamente?
4. Qual é o comando atual e o texto de erro de `vacuum-high-dead-tuples`? Ele tenta `VACUUM`, `VACUUM FULL`, `ANALYZE` ou múltiplos statements?
5. Qual owner DBA aprova limite de lock, `statement_timeout`, janela de manutenção e rollback para o job de vacuum?

## 12. Quadro de progresso das etapas 069–080

| Etapa | Situação após esta auditoria | Aceite ainda pendente |
|---:|---|---|
| 069 | Parcial: 136 relações preservadas e agrupadas sem inferir descarte. | Owner nominal, finalidade e ciclo de vida de cada relação. |
| 070 | Parcial: protocolo de prova de dependência definido. | Mapa completo coluna → view/função/trigger/FK/índice/policy/job/código/externo. |
| 071 | Parcial: saúde estrutural fotografada. | Uso, planos, custo e rollback por proposta de constraint/índice. |
| 072 | Parcial: alvos e matriz de personas definidos. | Execução registrada contra estado atual, sem tratar `skip` como sucesso. |
| 073 | Preparada: exceção de RLS identificada. | Design, matriz pós-mudança e `[AUTORIZAÇÃO BD]` da etapa 090. |
| 074 | Parcial: 530 SECDEF priorizados por exposição. | Revisão por assinatura/caller/search path/grant/finalidade. |
| 075 | Parcial: cinco enums e referências estáticas identificados. | Dependências catalográficas, migrações e clientes externas zeradas antes de qualquer depreciação. |
| 076 | Parcial: 16 extensões inventariadas, nenhuma chamada de lixo. | Owner, dependentes e plano de rollback por extensão. |
| 077 | Parcial: ACL nominal separada de RLS e caso crítico destacado. | Matriz efetiva por objeto/operação/caller. |
| 078 | Parcial/bloqueada: motivo de desativação documentado. | Consumidor, segredo, idempotência, backlog e autorização. |
| 079 | Parcial/bloqueada: conflito de arquitetura identificado. | Decisão de fonte de verdade e owner. |
| 080 | Preparada/bloqueada: falha de manutenção priorizada. | Comando/erro atual, plano DBA, limites e autorização. |

## 13. Próxima sequência segura, sem mutação

1. Usar a fotografia `supabase-prod-ro` já versionada, preservando projeto, timestamp, método e limitações; não fazer bootstrap implícito no gateway `supabase_producao`.
2. Comparar a fotografia live assinada com E1/E2 por nome e definição, não só por totais.
3. Preencher owner nominal e ciclo de vida com PO para as 136 relações, mantendo “desconhecido” onde não houver resposta.
4. Construir o mapa de dependências de coluna em lote read-only e publicar candidatos apenas quando todos os gates forem negativos.
5. Registrar matriz de acesso para a partição, duas relações `deny-all` prováveis e nove views, em ambiente/personas autorizados.
6. Produzir fichas de `SECURITY DEFINER` primeiro para `PUBLIC`/`anon`, depois `authenticated`, preservando signatures e callers.
7. Cruzar cada extensão e enum com dependências catalográficas e responsável operacional.
8. Capturar definição e histórico dos três jobs prioritários; separar falha de configuração, falha de comando e decisão intencional de produto.
9. Somente após esses artefatos, solicitar uma autorização de BD separada, explícita e limitada para uma correção por vez, com rollback.

---

### Fontes consultadas

- `docs/SCHEMA_REFERENCE.md` (§§ 1–3, 5–10; fotografia de 16/07/2026)
- `docs/AUDITORIA_EXAUSTIVA_E_PLANO_100_ETAPAS_2026-08-26.md` (§§ inventário, RLS, ACL, jobs, relações com estimativa zero)
- `docs/PLANO_MELHORIAS_CORRECOES_100_ETAPAS_CHECKLIST_2026-08-26.md` (etapas 069–080 e critérios de aceite)
- `docs/FAXINA_DB_2026-06-20_TIER3b.md` (armadilhas conhecidas de `n_live_tup` e dependências)
- `docs/architecture/medallion-estado-certificado-2026-06-26.md`, `docs/estado/13_RUNTIME_BANCO.md`, `docs/estado/ESTADO_ATUAL.md` (histórico e contradições de jobs)
- Migrations e scripts locais citados no texto, somente para evidência estática.

*Esta entrega é de governança read-only. Ela não autoriza nem executa alteração no banco canônico.*
