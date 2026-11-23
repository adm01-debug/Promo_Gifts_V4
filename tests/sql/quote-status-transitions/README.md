# Teste de transições de status de orçamento (etapa 093 · ACH-086)

Prova que `public.quotes` **aceita** transições de status que o frontend proíbe.
É um teste **vermelho por desenho**: ele documenta o defeito que a etapa 094
(migration com a tabela de pares válidos) precisa fechar. Quando a 094 entrar,
o mesmo teste, sem alteração, deve passar inteiro.

## Como funciona

1. `extract-transitions.mts` importa `QUOTE_VALID_TRANSITIONS` de
   `src/lib/quote-status-config.ts` — a fonte única de verdade do front — e
   imprime o mapa como JSON. Os pares **não são redigitados** no teste: se o
   mapa mudar, o teste acompanha.
2. O runner deriva todos os pares `de → para`:
   - **proibidos** = todo par que não está no mapa do FE (70 pares hoje);
   - **permitidos** = todo par que está no mapa (30 pares hoje).
3. Sobe um `postgres:17` descartável com `--network none`, label de posse e
   `POSTGRES_HOST_AUTH_METHOD=trust`. Nunca lê `DATABASE_URL` nem credencial
   Supabase; nunca conecta em PostgreSQL externo.
4. Aplica `fixture.sql`, que reproduz fielmente o `CHECK valid_quote_status` de
   produção (`supabase/migrations-snapshot/SCHEMA_LIVE.sql:8940`) e o corpo
   atual de `fn_quotes_enforce_immutability` (idem, linha 38779).
5. Para cada par, roda `BEGIN; INSERT …; UPDATE status; ROLLBACK;` — nada
   persiste. O `INSERT` usa um `id` fixo e a transação é revertida sempre.
6. `request.jwt.claim.sub` é definido para que `auth.uid()` não seja NULL; sem
   isso o trigger bypassa tudo (`IF auth.uid() IS NULL THEN RETURN NEW`). O
   claim `role='service_role'` deliberadamente **não** é definido: queremos o
   caminho que o trigger não bypassa.

## Resultado atual (antes da etapa 094)

| Métrica | Valor |
| --- | --- |
| Pares proibidos derivados do FE | 70 |
| Aceitos pelo banco (deveriam falhar) | **55** |
| Rejeitados corretamente pelo banco | 15 |
| Pares permitidos pelo FE | 30 |
| Permitidos aceitos pelo banco | 30 (nenhuma regressão de fluxo) |

Os 15 pares proibidos que o banco já rejeita são os que saem de `approved` e
`converted` — a única coisa que `fn_quotes_enforce_immutability` valida hoje.
Todo o resto passa: `cancelled → approved`, `rejected → approved`,
`draft → converted`, `sent → draft`, entre outros.

Saída completa na execução em `work/quote-status-transitions-sql/sql-test-results.json`
(`forbiddenAcceptedByDatabase`, `allowedRejectedByDatabase`).

## Uso

```bash
npm run test:quote-transitions:postgres
```

Exit code 1 enquanto houver par proibido aceito — é o comportamento esperado
até a etapa 094.

## Avisos

- **Não** corrija o `fixture.sql` para bloquear os pares. Ele reproduz produção;
  corrigi-lo tornaria o teste cego ao defeito.
- O teste não toca banco de produção, não lê segredos e não deixa dado.
- Se `npx tsx` falhar, o runner aborta em vez de rodar com lista vazia.
