# Contrato de referências Supabase — etapas 053–054

O gate `scripts/check-supabase-reference-catalog.mjs` impede que uma nova
referência executável a uma relação ou RPC do Supabase entre no PR sem contrato.
Ele é complementar ao `lint-untyped-from.sh`: aquele cobre somente
`untypedFrom()` × `types.ts`; este percorre o AST de `src/` e
`supabase/functions/`.

## Artefato temporário

`audit/supabase-reference-catalog.temporary.json` é a fotografia usada nesta
etapa. Foi obtida em 2026-08-26, somente por `pg_catalog`, no projeto canônico
`doufsxqlfjyuvxuezpln`, sem consultar dados nem executar DDL.

- 177 relações `public` consumidas por código foram confirmadas.
- 93 nomes de RPC `public` consumidos por código foram confirmados.
- O artefato não é substituto de `docs/SCHEMA_REFERENCE.md` e não autoriza
  mudanças de banco. Na etapa 067, este contrato deve ser promovido para a
  fotografia canônica versionada, mantendo a mesma semântica.

## Classificação deliberada

| Chamada | Tratamento |
|---|---|
| `supabase.from('…')`, `supabase.rpc('…')` | Comparada ao catálogo `pg_catalog` temporário. |
| `untypedFrom`, `goldFrom`, `dbInvoke`, `restNativeInvoke`, `untypedRpc`, `callRpc` | Literais dos wrappers também são comparados. |
| `supabase.storage.from('bucket')` | Storage; não é tratado como relação PostgREST. O gate não valida bucket. |
| Clientes CRM/Promobrind construídos por factory/credencial reconhecida | Banco externo; não é comparado ao SSOT. |
| `Array.from()` e equivalentes | Ignorado como API não-Supabase. |
| `@supabase-reference-placeholder` | Placeholder documentado, visível no resultado e fora do catálogo. |
| Despacho dinâmico (`.from(table)`, `.rpc(name)`) | Baseline source-scoped; uma ocorrência nova falha até revisão explícita. |

O parser é AST, portanto comentários, documentação e exemplos não contam como
chamadas executáveis.

## Exceções e aliases

Nenhuma relação ausente foi adicionada como se existisse. As exceções têm
`kind`, `name`, `file`, `occurrences`, motivo e etapa de resolução. Elas cobrem
somente a quantidade já existente naquele arquivo; acrescentar outra chamada
ao mesmo objeto volta a falhar.

As exceções existentes apontam para decisões já abertas no plano: Bitrix (042),
simulação (040), webhook-inbound (038), e2e-cleanup (045), EMA (046), auth
audit (048) e stock notes (051). Elas não permitem criar tabela, RPC, migration
ou deploy.

Os aliases `customization_price_tables` e `tecnica_gravacao` são aceitos apenas
via `dbInvoke`, pois o wrapper os resolve para
`tabela_preco_gravacao_oficial`. Uma chamada direta ao alias continua falhando.

## Uso e manutenção

```bash
npm run check:supabase-reference-catalog
npm run test:ci-core
```

Para atualizar uma referência legítima, primeiro confirmar a relação/RPC no
`pg_catalog` read-only. Depois atualizar o catálogo e os testes no mesmo PR.
Para uma ausência conhecida, registrar uma exceção mínima, source-scoped, com
motivo e etapa de remoção — nunca mascarar com `as any` nem incluir o nome na
lista de relações existentes.

Limitações intencionais: o gate não valida colunas, grants, RLS, assinatura de
RPC, bucket de Storage, nem objetos de bancos externos. A detecção de cliente
externo é deliberadamente conservadora: reconhece factories CRM conhecidas e
`createClient()` alimentado por credenciais externas explícitas (inclusive
`getCrmCreds()`); um wrapper novo ou ambíguo deve falhar para revisão, não ser
liberado pelo nome da variável. Esses contratos exigem as etapas específicas
do plano e a fotografia canônica da etapa 067.
