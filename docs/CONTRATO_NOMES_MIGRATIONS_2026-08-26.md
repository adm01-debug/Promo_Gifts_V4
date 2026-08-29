# Contrato local de nomes e versões para migrations novas

> **Data:** 2026-08-26  
> **Projeto canônico:** `doufsxqlfjyuvxuezpln`  
> **Escopo:** etapa 087 — impedir nomes e versões inválidos em migrations **novas**  
> **Semântica de execução:** somente leitura local; não aplica SQL, não chama MCP/Supabase e não altera o banco.

## Por que há uma baseline

`supabase/migrations/` é um arquivo histórico heterogêneo, não uma fila segura
para replay. A fotografia
[`MANIFESTO_MIGRATIONS_FORWARD_ONLY_2026-08-26.json`](./MANIFESTO_MIGRATIONS_FORWARD_ONLY_2026-08-26.json)
registra 1.673 arquivos, incluindo nomes legados sem timestamp e colisões de
versão já existentes. Reinterpretar ou renomear esse legado para fazê-lo passar
em um novo gate seria perigoso e proibido pelo plano forward-only.

O guard usa exatamente os `entries[].path` desse manifesto (`schema_version: 2`)
como baseline explícita. Um arquivo é considerado **novo** somente quando está
em `supabase/migrations/*.sql` e não aparece nessa lista. A baseline não é uma
lista de exceções genérica: ela é a fotografia fechada do legado em 2026-08-26.

## Regra aplicada a arquivos novos

Todo arquivo novo precisa obedecer a:

```text
YYYYMMDDHHMMSS_slug.sql
```

- `YYYYMMDDHHMMSS` é uma data/hora UTC real de 14 dígitos;
- `slug` não pode ser vazio e usa apenas letras minúsculas ASCII, números,
  `_` e `-`;
- a versão de 14 dígitos não pode aparecer em nenhum outro arquivo atual,
  inclusive em arquivo legado cujo slug não siga o padrão novo;
- duas migrations adicionadas no mesmo PR com a mesma versão também falham;
- arquivo da baseline ausente falha: rename/delete de história precisa de
  revisão humana explícita.

Assim, colisões históricas permanecem visíveis, mas não são mascaradas: uma
colisão só é tolerada se **todos** os arquivos do grupo já estavam na baseline.
Se um único participante for novo, o guard falha.

## Execução local

```bash
node scripts/check-migration-filename-contract.mjs
node scripts/check-migration-filename-contract.mjs --json
corepack npm exec vitest run tests/scripts/check-migration-filename-contract.test.mjs
corepack npm run qa:full
```

Para testar uma cópia do repositório ou uma baseline explicitamente escolhida:

```bash
node scripts/check-migration-filename-contract.mjs \
  --root /caminho/do/repo \
  --baseline docs/MANIFESTO_MIGRATIONS_FORWARD_ONLY_2026-08-26.json
```

Nesta entrega o script foi integrado ao `package.json` (`check:migration-filename-contract`,
`qa:full`, `test:ci-core`) e ao `Quality Gate` como `Gate 2.4.2`, mantendo a
mesma semântica read-only. A alteração do workflow protegido foi revisada no
branch de estabilização e validada localmente antes de qualquer commit. A etapa
continua sem alterar nenhuma migration existente para produzir sinal verde.

## Limites e decisões ainda necessárias

Este guard não prova que a versão está livre no ledger vivo
`supabase_migrations.schema_migrations`, nem autoriza DDL, deploy, `db push`,
MCP `apply_migration` ou alteração de schema. A checagem contra o ledger,
aprovação DBA e eventual aplicação continuam condicionadas às etapas 81–86 e
90 do plano e à autorização explícita correspondente.

Para não transformar esta etapa em uma reescrita do legado, a baseline é usada
somente como conjunto de **paths**: o guard não revalida hash ou conteúdo SQL
dos arquivos históricos. Qualquer análise de integridade semântica continua no
manifesto e em revisão humana/DBA.

Ele também não substitui `scripts/check-migration-path-references.mjs`: nomes e
versões válidos não provam que referências SQL são válidas. Nesta entrega, os
dois checks permanecem bloqueantes e independentes.
