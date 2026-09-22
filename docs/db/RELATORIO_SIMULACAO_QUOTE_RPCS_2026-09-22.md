# RPCs de orçamento — propostas e simulação isolada

**22/09/2026, 21:00 UTC — preparação/simulação autorizadas pelo PO; aplicação NÃO autorizada.**

**Resultado: `SIMULATION_PASS_RELEASE_BLOCKED`.** Os testes passaram porque reproduzem os defeitos anteriores e verificam tanto caminhos válidos quanto rejeições esperadas. Não é certificado de prontidão produtiva. Nenhuma escrita ocorreu no Supabase; nenhum recibo de aplicação foi criado.

## Proveniência e escopo

- Base `main` `796a52f075c532344b02179fcd5aac2cb260d65d`, PR #1878 mergeada. Branch isolada `codex/quote-rpc-proposals-20260922`; trabalhos anteriores preservados.
- Captura somente leitura pela Management API, projeto `doufsxqlfjyuvxuezpln`, às `2026-09-22T20:51:22.652586Z`: `pg_proc`/`pg_get_functiondef`, owner, ACL e configuração das duas funções. Corpos mantêm os MD5 da auditoria anterior: create `d3f154669f068acb2d5087a4ae059e14`; update `2f716e5ee22dd3de4043feb5bedc6387`.
- Recoleta canônica às `2026-09-22T21:01:52.065699Z`: os dois corpos e `increment_quote_version` continuam com os mesmos MD5. Propostas não aplicadas; simulação repetida após formatação com o mesmo resultado (41 + seis).
- Catálogo adjacente: colunas/defaults/checks, FKs entrantes/saintes, triggers e expressões de policies em `quotes`, `quote_items`, `quote_item_personalizations`, além das policies de histórico e variantes. Não foram lidos registros de clientes nem segredos do banco.
- Fixture e evidências: `tests/fixtures/quote-rpc-{live,catalog}-20260922.json` e `tests/sql/quote-rpc-fixture.sql`.
- Único dependente por FK de `quote_items` observado: `quote_item_personalizations`, com `ON DELETE CASCADE`. A proposta mantém a substituição das linhas da RPC atual; **não preserva seus IDs**, nem garante integrações que guardem esses IDs sem FK. Pré-condição rejeita nova FK entrante de outra tabela.

## Arquivos propostos — NÃO são migrations aplicadas

| Objeto | Proposta | SHA-256 exato |
|---|---|---|
| `public.create_quote_transactional(jsonb,jsonb)` | [20260922210000_create_quote_lineage.sql](proposals/20260922210000_create_quote_lineage.sql) | `2c901797ec64a2e6da6d9b6c892cb8efe51d3193303a13d89d411038cd5d9941` |
| `public.update_quote_transactional(uuid,jsonb,jsonb,integer)` | [20260922211000_update_quote_lineage_lock.sql](proposals/20260922211000_update_quote_lineage_lock.sql) | `5836255383021dc087cd0d89ede13d75bfd24c71168ca9338e4766713d1cf112` |

Cada arquivo substitui apenas sua função. Não altera tabelas, policies, triggers, grants ou defaults. Fora de `supabase/migrations`; não foi feito `db push`, repair, deploy ou registro no ledger. Guards verificam corpo/owner/ACL/search_path e colunas/FK; update verifica também trigger, corpo da função de versão e dependências entrantes. Exigem transação única; são guardadas contra reaplicação, **não reentrantes**. Qualquer mudança no SQL exige novos hashes e nova validação.

### Criação

Grava variante e `artwork_urls`, verifica pertencimento da variante ao produto visível ao chamador e exige array para artes. Ausência de variante aceita legado; ausência de artes produz `[]`; JSON `null` de artes é rejeitado (limpeza explícita usa `[]`). Mantém organização/vendedor, SECURITY INVOKER, auditoria, personalizações e cálculos por triggers.

### Edição — candidata bloqueada

Adquire `FOR UPDATE` antes de verificar `_expected_version`. Preserva linhagem omitida quando há ID de linha válido ou correspondência legada exata e única por produto/SKU/cor/tamanho/grupo. Não infere variante pelo SKU. Rejeita ID de outro orçamento, duplicação de ID, ambiguidade e remoção implícita de linha protegida. Limpeza da variante exige ID de linha; artes usam `[]`. Recolhe totais/versão finais após os triggers, em vez de devolver o snapshot anterior aos itens.

**Não liberar como está:** com versão esperada informada, edição apenas de itens é rejeitada com `40001` e rollback. A causa é o trigger existente, não um falso erro do teste. Chamadas legadas com `_expected_version=NULL` continuam sem proteção otimista; o lock serializa execução, mas não identifica uma intenção obsoleta sem versão.

## Simulação executada

```bash
node scripts/simulate-quote-rpc-proposals.mjs
npx vitest run tests/scripts/quote-rpc-proposals.test.mjs
npx eslint scripts/simulate-quote-rpc-proposals.mjs tests/scripts/quote-rpc-proposals.test.mjs
```

Runner offline sem endpoint/credencial remota; argumentos como `--apply` são rejeitados. Container UUID próprio, `--network none`, sem portas publicadas e sem volumes de dados do host, PostgreSQL em tmpfs. Ao concluir, remove somente esse container e seus dados sintéticos. Imagem usada: `postgres@sha256:67f41722b7a8cbdb868a44a4995c846eddfdc2973bccb291ce937dce88ad5675`, PostgreSQL **17.11**; não é clone binário da versão patch de produção.

**41 verificações PostgreSQL aprovadas:**

| Verificações | Resultado comprovado no fixture |
|---|---|
| 1–3 | Antes: criação perde variante/artes; edição só de itens não avança versão; dois writers com a mesma versão conseguem sobrescrever |
| 4–13 | Drift de ACL, FK ausente, trigger desabilitado e nova dependência bloqueiam a proposta; falha tardia desfaz o CREATE OR REPLACE; reaplicação rejeitada |
| 14–17 | Criação preserva linhagem/custos/histórico; legado funciona; payload inválido, anon e vendedor de outro escopo são rejeitados |
| 18–24 | Variante de outro produto/inexistente, UUID inválido, artes inválidas, quantidade zero e personalização negativa revertem toda a criação |
| 25 e 35 | Edição preserva campos omitidos; retorna totais finais; limpeza explícita com ID funciona |
| 26 e 39 | Limites demonstrados: item-only versionado bloqueia; legado sem versão continua sem garantia otimista |
| 27–34 | Versão obsoleta, outro tenant, variante inválida, ID estranho, remoção implícita, limpeza sem ID e erro tardio deixam orçamento/filhos/auditoria intactos |
| 36–38 | Ambiguidade/ID repetido rejeitados; duas linhas semelhantes funcionam com IDs explícitos |
| 40 | Duas conexões reais, com espera por lock observada em `pg_stat_activity`: primeiro writer vence, segundo recebe `40001`, sem sobrescrita |
| 41 | ACL, SECURITY INVOKER e search_path permanecem iguais |

**6 testes estáticos/CLI aprovados:** exclusão da pasta autoaplicável, uma função por proposta, integridade dos corpos capturados/guards, rejeição de modo remoto e isolamento do runner. ESLint direcionado e `git diff --check` aprovados. Esses seis testes não substituem o PostgreSQL.

### Limites explícitos

O fixture usa as colunas/defaults/checks capturados, oito triggers reais (versão, cálculos, propagação e imutabilidade) e expressões de policies capturadas. `auth.uid`, associação a organização, papéis e tabelas auxiliares são fixtures reduzidos; grants de tabela são sintéticos. **Não** simula toda a cadeia de desconto/aprovação diferida, notificações, Auth, Edge, UI, wrappers de desconto/Kit Maker ou jobs. Concorrência de mutação do catálogo de variantes e writers diretos que não bloqueiem o orçamento também não foram certificadas. Não afirmar RLS global, E2E canônico, prontidão de release ou 50/50.

## Decisões necessárias antes de evoluir para release

1. **Autorizar preparar/simular alteração adicional de `public.increment_quote_version()`**, sem aplicar, e revisar seus consumidores. Corpo capturado MD5 `8dc69376bb204fa774c7b193a7bbce4f`. Ele ignora `version` e campos calculados ao decidir incremento; as duas RPCs sozinhas não oferecem versionamento seguro de todas as alterações de itens. Não falsificar alteração de notas/tags nem desabilitar trigger para forçar versão.
2. **Autorizar o contrato de IDs/remoção na interface:** transportar ID da linha existente e diferenciar atualização, troca e remoção explícita de itens com artes/variante. Não autorizar remoção pelo simples desaparecimento em payload legado ambíguo. Isso requer decisão sobre o comportamento e testes de consumidor; não foi implementado nesta rodada de SQL.
3. Completar ensaios de desconto/aprovação diferida, wrappers e autorização real em ambiente isolado representativo; revisar substituição de IDs com consumidores sem FK.
4. Somente então fechar SQL final/hash, aprovação específica de aplicação, janela/reviewer, recibo e validação canônica. **Não aplicar estas candidatas enquanto os bloqueios estiverem abertos.**

Tracking: [issue #1877](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1877). Etapas 37/39 seguem parciais; plano global permanece 10/50, sem alterações de cores ou schema canônico.
