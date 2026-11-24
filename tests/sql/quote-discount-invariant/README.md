# Teste de invariante de desconto unico (etapa 108 - ACH-090)

Prova que `public.quotes` termina com **dois** descontos gravados ao mesmo
tempo: `discount_percent = 10` e `discount_amount = 10`. E um teste **vermelho
por desenho**: documenta o defeito que a etapa 109 (trigger/migration) precisa
fechar. Quando a 109 entrar, o mesmo teste, sem alteracao, deve passar.

## Como funciona

1. `discount-fixture.sql` reproduz fielmente, sem corrigir, as duas funcoes de
   producao que escrevem desconto:
   - `fn_quote_items_calc_subtotal` (`supabase/migrations-snapshot/SCHEMA_LIVE.sql:38710`)
   - `fn_quotes_recalc_subtotal_from_items` (idem, linha 38853)
   Mais as tabelas `public.quotes` / `public.quote_items` minimas e os triggers
   que as chamam.
2. O runner sobe um `postgres:17` descartavel com `--network none`, label de
   posse e `POSTGRES_HOST_AUTH_METHOD=trust`. Nunca le `DATABASE_URL` nem
   credencial Supabase; nunca conecta em PostgreSQL externo.
3. Cenario: vendedor digita 10% de desconto e adiciona uma linha de 10 x 10,00.
   Tudo em `BEGIN ... ROLLBACK`: nenhum dado persiste.
4. Le de volta `discount_percent`, `discount_amount`, `subtotal` e `total`, e
   falha se **ambos** os campos de desconto estiverem diferentes de zero.

## Resultado atual (antes da etapa 109)

```
FAIL invariante de desconto unico em public.quotes
{"discount_percent": 10.0, "discount_amount": 10.0, "subtotal": 100.0, "total": 90.0}
```

O vendedor digita percentual, mas a funcao grava **tambem** o valor absoluto
correspondente e mantem o percentual. Os dois campos passam a descrever o
mesmo desconto, e qualquer consumidor que some os dois (ou escolha o errado)
aplica desconto em dobro ou nenhum.

Saida completa em `work/quote-discount-invariant-sql/sql-test-results.json`
(`quoteAfterRecalc`, `invariantViolated`).

## Uso

```bash
npm run test:quote-discount-invariant:postgres
```

Exit code 1 enquanto a invariante estiver violada - e o comportamento esperado
ate a etapa 109.

## Avisos

- **Nao** corrija `discount-fixture.sql` para gravar apenas um dos campos. Ele
  reproduz producao; corrigi-lo tornaria o teste cego ao defeito.
- O teste nao toca banco de producao, nao le segredos e nao deixa dado.
- O entrypoint do `postgres:17` sobe um servidor de inicializacao e o derruba;
  o runner reaplica a fixture ate o servidor definitivo responder.