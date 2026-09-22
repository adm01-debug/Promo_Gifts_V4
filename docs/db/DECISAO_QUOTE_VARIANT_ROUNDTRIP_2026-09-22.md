# Orçamento: identidade de variante e persistência — decisão pendente

## Escopo e evidência

Auditoria de 22/09/2026, base Git `4469f27a8` (PR #1876), projeto canônico `doufsxqlfjyuvxuezpln`. Consultas somente leitura pela Management API, usando `pg_catalog.pg_proc`, `pg_namespace`, `pg_attribute`, `pg_attrdef` e `pg_constraint`. Nenhum SQL de alteração, repair de ledger ou cadastro real foi executado nesta rodada.

`quote_items.product_variant_id` existe: `uuid`, nullable, sem default; FK `quote_items_product_variant_id_fkey` para `product_variants(id) ON DELETE SET NULL`. `size_code` é `text` nullable; `kit_group_id` é `uuid` nullable. A existência da coluna e dos tipos gerados **não** prova que as RPCs a preenchem.

Leitura de metadados às `2026-09-22T20:36:05.236816Z`, MD5 de `pg_proc.prosrc` (corpo, não arquivo de migration):

| Função | MD5 do corpo | Comportamento observado |
|---|---|---|
| `public.create_quote_transactional(jsonb,jsonb)` | `d3f154669f068acb2d5087a4ae059e14` | Lista explícita de INSERT em `quote_items` não contém `product_variant_id` nem `artwork_urls` |
| `public.update_quote_transactional(uuid,jsonb,jsonb,integer)` | `2f716e5ee22dd3de4043feb5bedc6387` | Exclui e recria linhas; INSERT também omite variante/artes; leitura de versão não usa `FOR UPDATE` e UPDATE posterior filtra por ID |

Ambas são SECURITY INVOKER e têm `search_path=public`. ACL observada de create: `{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`. ACL de update: `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`. Isso não demonstra acesso indevido: autorização efetiva depende também de RLS e das verificações internas. Não alterar esses grants por dedução nesta correção.

O wrapper Kit Maker em `supabase/migrations/20260912150000_kit_maker_quote_lineage_forward_only.sql` já valida variante/produto e complementa as linhas com identidade/artes. O código vivo das RPCs gerais demonstra que a edição por outro fluxo não oferece a mesma preservação. O risco de concorrência é inferido da sequência leitura/UPDATE sem lock; **ainda não foi reproduzido com duas sessões PostgreSQL**.

## Correções de código desta rodada

- [x] Transportar `product_variant_id` da seleção para o tipo de domínio, payload e duplicação.
- [x] Distinguir variantes pelo ID; não fundir duas variantes diferentes porque têm a mesma cor/tamanho.
- [x] Ler tamanho, agrupamento de kit, vínculo de variante e metadados de preço; ler versão e margem do orçamento.
- [x] Hidratar SKU pelo ID; em legados, exigir correspondência não ambígua de produto/cor/tamanho. Não escolher arbitrariamente entre dois tamanhos.
- [x] Filtrar linhas de quantidade menor que um antes de calcular totais e indexar personalizações; preservar a associação entre arte e item válido.
- [x] Simular os defeitos antes de corrigir: oito falhas de contrato/identidade e três casos de associação indevida de personalização reproduzidos em testes locais.
- [ ] Comprovar persistência round-trip no PostgreSQL e E2E autenticado após corrigir as RPCs.

Os testes do serviço usam RPCs mockadas. Eles comprovam payload/consumo, **não** gravação no Supabase. O caminho auxiliar `insertItemsWithPersonalizations` continua sequencial; a correção do índice não o torna transacional. A recuperação de artwork e a segurança de concorrência permanecem pendências explícitas, não resolvidas pelo novo campo TypeScript.

## Próxima onda proposta — exige decisão granular

Solicitar autorização para preparar e validar alterações forward-only **apenas** nas duas assinaturas acima. Aplicação canônica deve ter aprovação explícita do SQL final e dos respectivos hashes; esta documentação não autoriza sua própria execução.

1. Recolher definições, ACLs, dependências e triggers na janela; comparar com esta evidência, sem aceitar drift silencioso.
2. Criar uma proposta por função, fora do caminho de aplicação automática; não editar migrations históricas.
3. Preservar SECURITY INVOKER, grants, assinatura, contexto de organização/vendedor, validação de desconto e histórico de auditoria.
4. Gravar variante e artes explicitamente, verificando pertencimento da variante ao produto, sem confiar no cliente nem inferir ID pelo SKU.
5. Definir compatibilidade de legados sem variante e sem artes, distinguindo ausência de campo de remoção explícita; impedir que edição antiga apague dados de kit sem intenção.
6. Serializar atualização/versionamento por lock ou predicado de compare-and-swap com conferência de linha afetada. Não remover `_expected_version` nem mascarar erro `40001`.
7. Verificar dependências dos IDs de `quote_items` antes de conservar a estratégia DELETE/INSERT. Se exigir novo objeto/schema, interromper e pedir autorização adicional.
8. Simular em PostgreSQL isolado: duas sessões com a mesma versão, falha tardia, variante de produto diferente, FK inválida, payload antigo, duplicação, agrupamento de kit, valores/arte e controle de acesso por organização.
9. Exigir rollback integral em falha, apenas uma edição concorrente vencedora, preservação das demais linhas e nenhum privilégio novo.
10. Após aprovação do SQL, aplicar somente as versões aprovadas pelo fluxo controlado, validar catálogo/ledger e executar testes autorizados; não usar `db push` ou repair em massa.

## Critério de conclusão das etapas 37/39

O mesmo `product_variant_id`, tamanho, agrupamento e personalização devem sobreviver a criar → ler → editar → ler → duplicar nos consumidores aplicáveis, com SKU correto e validação canônica. Regressão local, PR mergeada e catálogo vivo são evidências distintas. Até essa prova, as etapas continuam **parciais**, independentemente de os tipos gerados coincidirem com o banco.
