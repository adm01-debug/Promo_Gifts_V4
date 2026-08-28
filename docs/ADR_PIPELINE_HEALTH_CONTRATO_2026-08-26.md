# ADR — contrato de saúde EMA e pipeline de ruptura

- **Data da auditoria:** 2026-08-26
- **Status:** PROPOSTO — sem alteração de produção
- **Etapa do plano:** 046
- **Sistema canônico:** Supabase doufsxqlfjyuvxuezpln
- **Escopo:** consumidores React do health EMA, objetos PostgreSQL correlatos e contrato de fallback

## 1. Decisão executiva

A função **fn_ema_pipeline_health() não existe** no catálogo do banco canônico.
O problema não é somente uma RPC ausente: os dois hooks que a chamam pressupõem
formatos incompatíveis para o mesmo retorno.

| Consumidor | Contrato esperado hoje | Efeito da ausência |
|---|---|---|
| useEmaPipelineHealth → /admin/ema-health e StockRiskHero | componente, status, ultima_execucao, proxima_execucao, detalhe | a página técnica entra em erro; o hero, se montado, degrada para aviso/sem dados |
| useEmaRiskSummary → StockHeroRiskBanner | componente, status, valor, observacao, incluindo EMA_FRESCOR | se o sumário existir mas o health falhar, o hook silencia o erro e cai em WARN |

O banco possui observabilidade equivalente **em partes**, mas não uma substituta
direta, acessível ao navegador e com o shape das telas:

- fn_rupture_health_check() é a fonte semântica mais próxima para checks de
  ruptura/EMA, mas só service_role pode executá-la e ela não tem timestamps nem
  próxima execução;
- fn_rupture_quick_stats() é executável por authenticated e expõe
  refreshed_at, mas descreve agregados por nível, não componentes de pipeline;
- fn_pipeline_health() e fn_pipeline_health_monitor() são diagnósticos
  genéricos, também somente service_role, e não atendem o formato EMA;
- as materialized views mv_stock_rupture_alert e mv_ema_kpi_by_level existem e
  têm leitura para authenticated, mas não substituem diagnóstico de jobs/crons.

**Decisão recomendada:** não criar a RPC ausente, não conceder EXECUTE direto ao
navegador e não trocar o hook para um objeto de shape diferente. Depois de
aprovação de autorização/deploy, introduzir um adaptador servidor-side autorizado
para a área técnica, consumindo os objetos canônicos já existentes e publicando
um contrato de transporte único. Alteração de banco, se ainda necessária depois
disso, continua dependente de autorização explícita do PO.

## 2. Limites e método

Esta auditoria foi intencionalmente não mutante:

- leitura de fontes, rotas, hooks, migrations e testes no worktree isolado;
- consulta ao grafo já existente apenas como orientação, seguida de validação
  direta no fonte;
- consultas somente leitura ao catálogo pg_catalog do projeto canônico;
- nenhuma chamada PostgREST, DDL, migration, função mutante, leitura de dados
  de negócio, deploy, alteração de grant, RLS, trigger, cron ou registro.

O pedido citava src/components/admin/ObservabilityDashboard.tsx, mas esse
arquivo não existe. A tela real é src/pages/admin/ObservabilityDashboard.tsx;
ela consome exclusivamente useKillSwitchObservability e useSmokeTests, sem
import ou chamada do health EMA. Portanto, ela não é candidata a correção nesta
etapa.

## 3. Superfícies executáveis e contratos atuais

### 3.1 useEmaPipelineHealth

Fonte: src/hooks/stock/useEmaPipelineHealth.ts, linhas 9–32.

| Campo | Tipo esperado |
|---|---|
| componente | string |
| status | string, com uso visual de OK, ATRASO e FALHA |
| ultima_execucao | ISO string ou null |
| proxima_execucao | ISO string ou null |
| detalhe | string ou null |

O hook chama fn_ema_pipeline_health, usa staleTime de 30 s, refetchInterval de
60 s e uma tentativa de retry. Resposta null sem erro vira lista vazia; erro da
RPC é propagado ao React Query.

EmaHealthPage, em src/pages/admin/EmaHealthPage.tsx:51–151, é uma rota DevRoute
e exibe explicitamente última/próxima execução e detalhe. StockRiskHero, em
src/components/inventory/risk/StockRiskHero.tsx:68–117, toma o pior status e o
maior ultima_execucao para renderizar pulse e frescor. Ele não expõe o erro da
query; ausência de dados se torna aviso.

### 3.2 useEmaRiskSummary

Fonte: src/hooks/stock/useEmaRiskSummary.ts, linhas 10–78.

Esse hook chama em paralelo:

    fn_ema_risk_summary()
    fn_ema_pipeline_health()

Além de fn_ema_risk_summary também não existir, o mesmo health é assumido com
outro formato:

| Campo | Uso |
|---|---|
| componente | procura a linha EMA_FRESCOR |
| status | convertido para OK, WARN ou ERROR |
| valor | timestamp de freshness |
| observacao | metadado de texto |

Esse formato não contém ultima_execucao, proxima_execucao ou detalhe.

Há um fallback assimétrico: summaryRes.error é lançado, mas healthRes.error não
é verificado (linhas 50–58). Se um sumário futuro responder e o health falhar,
a tela recebe health vazio e mostra WARN/sem timestamp em vez de sinalizar falha
de transporte. Isso é comportamento atual a substituir deliberadamente, não
fallback canônico.

StockHeroRiskBanner ainda chama fn_ema_coverage_stats diretamente
(src/components/inventory/StockHeroRiskBanner.tsx:94–103), outra RPC ausente.
O banner não possui montagem viva no código pesquisado; isso reduz impacto
imediato, mas não elimina a dívida de contrato.

### 3.3 Rotas e montagens

| Superfície | Estado observado | Consequência |
|---|---|---|
| /admin/ema-health | rota viva sob DevRoute | falha diretamente observável por usuário técnico |
| StockRiskHero | componente/export vivo, flag useEmaRupture, sem montagem encontrada | falha latente até integração na página de estoque |
| StockHeroRiskBanner | componente/export vivo, sem montagem encontrada | as RPCs ausentes são dívida latente |
| /admin/observabilidade | rota/tela viva, sem EMA | não misturar esse dashboard com a correção EMA |

## 4. Snapshot estrutural do banco canônico

O snapshot abaixo vem de pg_catalog em 2026-08-26. Ele descreve o estado
observado e não autoriza alteração alguma.

### 4.1 Objetos ausentes

Não foram encontradas em public.pg_proc as rotinas abaixo:

- fn_ema_pipeline_health();
- fn_ema_risk_summary();
- fn_ema_coverage_stats().

Também não há definição de nenhuma dessas três rotinas na árvore
supabase/migrations pesquisada. Isso demonstra uma lacuna de
reprodutibilidade do repositório, mas não autoriza recriar qualquer função por
suposição.

### 4.2 Candidatos existentes

| Objeto live | Forma/escopo | authenticated pode executar/ler? | Cobertura real | Lacuna contra contrato atual |
|---|---|---:|---|---|
| fn_rupture_health_check() | TABLE(check_name, status, value_atual, threshold, severidade); SECURITY DEFINER | não | checks C01–C11: freshness velocity, 5 níveis KPI e 3 crons | não traz ultima/proxima execução ou EMA_FRESCOR; browser não pode chamar |
| fn_rupture_quick_stats() | TABLE(nivel_alerta, prioridade, total_variantes, total_gap_unidades, total_valor_estoque, com_anomalia_spike, avg_cobertura, refreshed_at) | sim | agregados EMA e timestamp de refresh | não traz checks de cron/pipeline; total_variantes não é total |
| fn_ema_kpi_by_level(boolean) | KPI por nível; SECURITY DEFINER | não | lê mv_ema_kpi_by_level | parâmetro atual é ignorado; falta timestamp no retorno; hook browser atual tende a 403 |
| fn_pipeline_health() | jsonb; SECURITY DEFINER | não | Bronze/Silver/Gold, backlog e tick de promoção | não é diagnóstico específico EMA e não é tabular |
| fn_pipeline_health_monitor() | checks de imagem/órfãos; SECURITY DEFINER | não | qualidade de catálogo/Cloudflare | não observa fluxo EMA |
| mv_ema_kpi_by_level | materialized view, SELECT para authenticated | sim, leitura | KPI por nível e refreshed_at | não contém status de jobs nem agenda |
| mv_stock_rupture_alert | materialized view, SELECT para authenticated | sim, leitura | alertas por variante/fornecedor | não contém timestamp de refresh nem saúde de pipeline |

fn_rupture_health_check() referencia internamente a freshness de
analytics.mv_stock_velocity, os cinco níveis de mv_ema_kpi_by_level e a
presença de três jobs cron. É, portanto, a melhor fonte semântica de
diagnóstico. Sua ACL somente service_role é uma proteção a preservar — não uma
anomalia a corrigir com GRANT automático.

fn_rupture_quick_stats() e mv_ema_kpi_by_level expõem refreshed_at como
timestamp com fuso. Esse campo descreve refresh de read model; ele **não prova**
que todo ETL, cada cron ou a atualização de estoque foi concluído. A UI não deve
rotulá-lo como “última execução do pipeline inteiro” sem decisão de semântica.

### 4.3 Privilégios observados

As verificações com pg_catalog.has_function_privilege mostraram:

| Função | authenticated | anon | service_role |
|---|---:|---:|---:|
| fn_ema_kpi_by_level(boolean) | não | não | sim |
| fn_ingestion_health() | não | não | sim |
| fn_pipeline_health() | não | não | sim |
| fn_pipeline_health_monitor() | não | não | sim |
| fn_rupture_health_check() | não | não | sim |
| fn_rupture_quick_stats() | sim | não | sim |

Materialized views não suportam RLS como tabelas ordinárias; os grants são o
controle relevante. Ambas as MVs EMA têm SELECT para authenticated, e anon
permanece bloqueado. Isso coincide com as migrations de hardening de 2026-07 e
não deve ser ampliado sem revisão de exposição.

## 5. Matriz código ↔ objeto canônico

| Chamada/campo no código | Situação atual | Fonte canônica possível | Decisão de adaptação |
|---|---|---|---|
| fn_ema_pipeline_health em useEmaPipelineHealth | ausente | fn_rupture_health_check + fn_rupture_quick_stats | usar somente atrás de boundary servidor-side; normalizar contrato |
| status do hero | espera OK/ATRASO/FALHA | status e severidade de rupture_health_check | definir mapeamento explícito; não comparar strings semânticas diferentes |
| ultima_execucao | requerida em duas telas | refreshed_at de rupture_quick_stats | rotular como refresh de read model; não prometer execução integral |
| proxima_execucao | exibida na página técnica | nenhum candidato fornece | manter null até contrato autorizado de agenda; não inventar data de cron |
| detalhe | requerida na página técnica | value_atual, threshold, severidade | gerar texto no adaptador e manter valores estruturados em telemetria/testes |
| EMA_FRESCOR.valor | requerido por useEmaRiskSummary | refreshed_at de quick stats/MV | retirar protocolo implícito; expor freshness tipado |
| fn_ema_risk_summary e total | ausentes/divergentes | quick_stats.total_variantes | adaptar somente com decisão sobre níveis e SEM_SINAL |
| fn_ema_coverage_stats | ausente | nenhum equivalente confirmado | separar como subcontrato, sem dados sintéticos |

## 6. Contrato alvo proposto

O browser não deve conhecer cron.job, funções SECURITY DEFINER ou o shape de
materialized views. O adaptador deve devolver uma única resposta versionada:

    type EmaHealthStatus = 'OK' | 'WARN' | 'ERROR' | 'UNKNOWN';

    interface EmaHealthComponentV1 {
      id: string;                 // por exemplo C06_VELOCITY_FRESCA
      status: EmaHealthStatus;
      last_refreshed_at: string | null;
      next_scheduled_at: string | null;
      detail: string;
      source: 'rupture_health_check' | 'rupture_quick_stats';
    }

    interface EmaHealthResponseV1 {
      checked_at: string;
      freshness: {
        last_refreshed_at: string | null;
        status: EmaHealthStatus;
        semantics: 'read_model_refresh';
      };
      components: EmaHealthComponentV1[];
    }

Regras que precisam ser fixadas antes da implementação:

1. WARN e ERRO existentes precisam de mapeamento aprovado para WARN/ERROR,
   considerando severidade; não se deve chamar tudo de FALHA.
2. last_refreshed_at só pode vir de fonte observada. Para checks sem timestamp,
   deve ser null.
3. next_scheduled_at deve ficar null enquanto não houver fonte autorizada que
   calcule agenda/UTC de forma confiável. Um schedule cron não é próximo disparo.
4. retorno vazio, erro de transporte, erro de autorização e freshness ausente
   são estados distintos; nenhum vira implicitamente OK.
5. o adaptador exige autorização servidor-side equivalente à área técnica.
   DevRoute no cliente não autoriza service_role.

Com esse contrato, EmaHealthPage renderiza a tabela sem depender do nome de uma
RPC do banco. StockRiskHero usa response.freshness; useEmaRiskSummary recebe
freshness tipado, em vez da linha mágica EMA_FRESCOR.

## 7. Fallbacks e riscos previstos

| Cenário | Comportamento atual | Risco | Comportamento alvo |
|---|---|---|---|
| RPC ausente | erro na página; hero degrada silenciosamente | falso “apenas sem dados” | UNKNOWN/erro observável, sem dados inventados |
| quick stats vazia e sem erro | lista vazia ou freshness nula | confundir banco em criação com saúde | UNKNOWN e detalhe sem evidência de refresh |
| check crítico retornado | não há consumo atual | UI futura reduzir ERROR a warning | preservar severidade/origem no adaptador e testar mapeamento |
| cron não observável | UI espera próxima execução | fabricar horário | next_scheduled_at null, sem promessa operacional |
| GRANT de SECURITY DEFINER ao browser | atalho tentador | vazamento de diagnóstico/regressão de hardening | manter ACL; usar boundary autorizado |
| fn_ema_risk_summary ausente | banner quebra quando montado | ausência de summary e health mascara causa | separar contrato de summary do health |
| definição live sem migration | drift possível em outro ambiente | redeploy incompleto | reconciliação forward-only com autorização |

## 8. Decisões pendentes e sequência segura

1. **D46-1 — owner e boundary:** aprovar se a superfície técnica recebe Edge
   Function/BFF read-only com autorização de servidor. Recomendado.
2. **D46-2 — semântica de status:** aprovar mapeamento
   OK/WARN/ERRO + severidade → OK/WARN/ERROR/UNKNOWN.
3. **D46-3 — freshness/SLO:** definir se refreshed_at basta para o badge, qual
   limite gera WARN e se existe fonte para próxima execução.
4. **D46-4 — summary e cobertura:** decidir se fn_ema_risk_summary e
   fn_ema_coverage_stats serão adaptadas dos objetos live ou terão contrato
   próprio. Não criar as funções por inferência.
5. **D46-5 — proveniência:** reconciliar fn_rupture_health_check,
   fn_rupture_quick_stats e fn_ema_kpi_by_level com migrations forward-only.
   Qualquer migration, GRANT, alteração de função ou cron exige autorização
   explícita do PO.
6. Só após D46-1–D46-4: implementar adaptador, refatorar os dois hooks,
   cobrir erro/ausência/freshness e validar em ambiente aprovado.

## 9. Critérios de aceite para reabertura da etapa 046

- [ ] nenhum hook browser chama fn_ema_pipeline_health, fn_ema_risk_summary ou
  fn_ema_coverage_stats inexistentes;
- [ ] os dois consumidores usam um único tipo público de health;
- [ ] erro de health não é silenciosamente rebaixado para WARN;
- [ ] freshness tem origem/semântica declaradas e teste de limiar;
- [ ] ausência de dados e falha de autorização/transporte são distinguíveis;
- [ ] nenhuma data de próxima execução é inventada;
- [ ] grants e funções SECURITY DEFINER permanecem inalterados sem autorização;
- [ ] testes locais cobrem sucesso, freshness, retorno vazio e erro da fonte;
- [ ] ambiente aprovado confirma autorização do boundary e ausência de regressão
  nas MVs de ruptura.

### 9.1 Caracterização local adicionada

O teste src/hooks/stock/__tests__/ema-pipeline-health.contract.test.tsx
documenta o contrato atual sem alterar produção: preservação do timestamp e da
cadência 30 s/60 s, distinção entre lista vazia e erro de RPC, e o fallback
WARN hoje silencioso quando somente a chamada de health falha. Ele não valida
nem autoriza a presença de uma função no banco; essa confirmação permanece
exclusivamente no catálogo live.

## 10. Evidências reproduzíveis (somente leitura)

    -- existência, assinatura, retorno, ACL e search_path
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid),
           pg_get_function_result(p.oid), p.proacl, p.proconfig
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'fn_ema_pipeline_health', 'fn_rupture_health_check',
        'fn_rupture_quick_stats', 'fn_pipeline_health'
      );

    -- shape e ACL de materialized views envolvidas
    SELECT c.relname, c.relkind, c.relacl, a.attnum, a.attname,
           pg_catalog.format_type(a.atttypid, a.atttypmod)
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relname IN ('mv_stock_rupture_alert', 'mv_ema_kpi_by_level')
      AND a.attnum > 0 AND NOT a.attisdropped
    ORDER BY c.relname, a.attnum;

Essas consultas não leem linhas de negócio e não executam a função auditada.
