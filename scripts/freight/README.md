# scripts/freight — seed das caixas de transporte

Gera o SQL que cadastra as caixas de transporte padrão da empresa em `public.shipping_boxes`
(etapa 29 do plano de frete). São as caixas que o motor em `src/lib/freight` usa para decidir em
quantos volumes a carga vai.

| Arquivo                   | O que é                                                                |
| ------------------------- | ---------------------------------------------------------------------- |
| `caixas.csv`              | As caixas reais (P, M, G, GG). É a fonte: para mudar o seed, mude aqui |
| `seed-shipping-boxes.mjs` | Lê o CSV, valida e escreve o SQL da migration e do rollback            |

## O script nunca grava no banco

Ele só escreve arquivos `.sql`. Não lê chave, não abre conexão e não é chamado por nenhum workflow
(está em `scripts/automation.config.json` como execução manual).

O SQL gerado é uma migration de dados e segue o caminho de qualquer migration deste repo
(`AGENTS.md`, seção "Banco, migrations e edge functions"; `docs/agentes/banco-migrations.md`):

1. o arquivo entra em `supabase/migrations/` e o rollback em `supabase/rollbacks/`, por PR;
2. a PR leva a linha `pendente` em `supabase/MIGRATIONS_SYNC_LOG.md`, fica aberta e chama o dono;
3. a produção recebe a migration **só** pelo workflow `db-apply-migration.yml`.

Nunca cole o SQL no painel do Supabase, no MCP `execute_sql` nem em `supabase db push`.

## Como rodar

```sh
node scripts/freight/seed-shipping-boxes.mjs \
  --out supabase/migrations/<AAAAMMDDHHMMSS>_seed_shipping_boxes.sql \
  --rollback-out supabase/rollbacks/<AAAAMMDDHHMMSS>_rollback.sql
```

| Opção            | Para quê                                                                 |
| ---------------- | ------------------------------------------------------------------------ |
| `--out`          | Obrigatória. Onde escrever o SQL da migration                            |
| `--csv`          | Outro CSV no lugar de `scripts/freight/caixas.csv`                       |
| `--version`      | Versão da migration (14 dígitos, UTC). Se faltar, sai do nome de `--out` |
| `--rollback-out` | Onde escrever o rollback. O nome tem de ser `<versão>_rollback.sql`      |
| `--help`         | Mostra o uso                                                             |

A versão precisa ser maior que `20261119213000`, a migration que cria a tabela.

Código de saída: `0` gerou, `1` CSV ou versão recusados (nada é escrito), `2` uso errado.

## O CSV

Uma caixa por linha. O cabeçalho são as colunas que a aplicação grava; as três `inner_*_cm` ficam
de fora porque o banco as calcula (externa − 2 × parede). Texto com vírgula vai entre aspas duplas.

| Coluna                                                 | Regra                                                 |
| ------------------------------------------------------ | ----------------------------------------------------- |
| `code`                                                 | 1 a 6 caracteres, `A`–`Z` e números; sem repetição    |
| `name`                                                 | Obrigatório, até 80 caracteres                        |
| `outer_height_cm`, `outer_width_cm`, `outer_length_cm` | Medida EXTERNA em cm, maior que zero, até 2 casas     |
| `wall_thickness_mm`                                    | Inteiro de 1 a 20; a medida interna tem de sobrar > 0 |
| `empty_weight_g`                                       | Inteiro em gramas, zero ou mais                       |
| `max_weight_g`                                         | Inteiro em gramas, maior que `empty_weight_g`         |
| `fill_factor`                                          | De 0.50 a 1.00, até 2 casas                           |
| `is_active`                                            | `true` ou `false`                                     |
| `sort_order`                                           | Inteiro                                               |

Decimal com ponto (`26.5`), não com vírgula. Linha recusada aparece com o número da linha do arquivo:

```
ERRO em scripts/freight/caixas.csv:
linha 3: fill_factor — "0.30" inválido: de 0.50 a 1.00, com ponto decimal e até 2 casas.
```

As regras de `code` e `name` não são CHECK da tabela: repetem o formulário do admin
(`src/components/admin/shipping-boxes/shippingBoxFormSchema.ts`), para a caixa semeada continuar
editável por lá.

## O que o SQL gerado faz

**Migration** — um `INSERT` com `ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING`. O
predicado repete o do índice único parcial de `code`; sem ele o Postgres recusa o `INSERT`.

- código que já tem caixa viva: nada é inserido nem sobrescrito (edição do admin fica como está);
- código sem caixa viva (nunca cadastrado, ou excluído): a caixa é criada;
- aplicar duas vezes insere zero linhas na segunda.

**Rollback** — copia a tabela para `_backup_shipping_boxes_YYYYMMDD` (RLS ligada, sem acesso de
`anon`/`authenticated`) e apaga só a caixa viva que continua idêntica ao seed em todas as colunas
gravadas. Caixa editada ou excluída pelo admin e caixa de outro código ficam. Roda antes do
rollback `20261119213000`, que derruba a tabela.

## Teste

```sh
TZ=America/Sao_Paulo npx vitest run tests/scripts/seed-shipping-boxes.test.mjs
```
