# Schemas

Schemas internos do Supabase ficam fora da introspecção geral (`_analytics, _realtime, _supavisor, auth, cron, extensions, graphql, graphql_public, net, pg_stat_statements, pgbouncer, pgmq, pgsodium, pgsodium_masks, pgtle, realtime, repack, storage, supabase_functions, supabase_migrations, vault`).

| schema | owner | USAGE para roles da API | comentário |
|---|---|---|---|
| analytics | postgres | anon, authenticated, service_role | Schema interno de objetos analíticos e materialized views. Não destinado à exposição direta pelo PostgREST; acesso conforme os privilégios do banco e as views/RPCs de consumo autorizadas. |
| api | postgres | anon, authenticated | Namespace para objetos de banco específicos da camada API do projeto. Revisar privilégios e exposição via PostgREST antes de adicionar ou publicar objetos. |
| cf_recon | postgres |  | Schema de reconciliação entre o inventário do Cloudflare Images e os metadados mantidos no banco. Contém mirror de imagens, execuções de crawl, métricas, fila de verificações e trilha de ações/remediações. |
| classification_audit | postgres |  | Área de auditoria das sugestões de classificação de categorias. Guarda candidatos, sinais, pontuações e resultados intermediários para revisão; não substitui os vínculos canônicos em public.product_category_assignments. |
| internal | postgres | anon, authenticated | Namespace reservado para objetos internos específicos do projeto. Não tratar como contrato público da aplicação; revisar privilégios e dependências antes de expor ou alterar objetos neste schema. |
| prod_audit | postgres |  | Área de auditoria e suporte à classificação de produtos. Contém evidências de testes, regras e projeções de atributos/categorias usadas para revisar resultados de classificação; não é a fonte de verdade do catálogo de produção. |
| public | pg_database_owner | anon, authenticated, service_role | Schema principal da aplicação Promo Brindes. Contém o catálogo Gold, organizações, cotações, pedidos, usuários de aplicação e módulos operacionais. Tabelas acessadas pela API conforme configuração do PostgREST e políticas RLS; consultar os comentários de cada tabela/coluna para a semântica específica. |
| supplier_stricker | postgres | service_role | Área de integração com o catálogo da Stricker/SPOT. Contém espelhos sincronizados da API do fornecedor, estruturas de staging, categorias externas e tabelas de apoio para mapear produtos, variantes, estoque, cores e personalização para o modelo canônico da aplicação. |
