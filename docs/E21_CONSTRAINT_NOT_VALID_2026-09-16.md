# E21 — A 1 constraint `NOT VALID` (2026-09-16)

`[REQUER-PO]`. **Nenhuma migration foi preparada nesta etapa** — a
recomendação é justamente NÃO seguir a instrução literal do plano ("se 0
violações, preparar `VALIDATE CONSTRAINT`"). Ver §3 para o motivo. Decisão
explícita de humano/DBA necessária antes de qualquer ação aqui.

Etapa do `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (linhas ~478-484).

---

## 1. Identificação `[RO]`

```sql
SELECT conname, conrelid::regclass AS table_name, pg_get_constraintdef(oid) AS def,
       connamespace::regnamespace AS schema
FROM pg_constraint
WHERE NOT convalidated;
```

Resultado: **1 linha** — constraint em `realtime.messages`, schema
`realtime` (extensão Supabase Realtime, não `public`).

**Correção ao texto do plano:** não é uma tabela da aplicação (`public`),
é uma tabela interna gerenciada pela extensão/serviço `realtime` do próprio
Supabase.

---

## 2. Contagem de violações `[RO]`

Reconstruindo a condição da constraint (via `pg_get_constraintdef`) como um
`SELECT count(*)` somente-leitura contra `realtime.messages`:

**0 linhas violariam a constraint hoje.** Em isolamento, isso satisfaria a
condição "se 0 violações, preparar `VALIDATE CONSTRAINT`" do plano.

---

## 3. Por que NÃO preparo a migration mesmo com 0 violações

Duas descobertas mudam a decisão:

### 3.1 — Ownership: não é uma tabela nossa

```sql
SELECT c.relname, c.relowner::regrole::text AS owner
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='realtime' AND c.relname='messages';
```

`realtime.messages` é owned por `supabase_realtime_admin`, não por
`postgres` (o role que nossas migrations usam para aplicar DDL).

### 3.2 — `postgres` não tem privilégio para alterar esta tabela

```sql
SELECT roleid::regrole::text, member::regrole::text
FROM pg_auth_members
WHERE member::regrole::text = 'postgres' OR roleid::regrole::text = 'supabase_realtime_admin';
```

`postgres` **não é membro** de `supabase_realtime_admin` e não é
`rolsuper`. `ALTER TABLE ... VALIDATE CONSTRAINT` exige ser owner da tabela
(ou superusuário). Sem essa associação, um `ALTER TABLE realtime.messages
VALIDATE CONSTRAINT ...` executado pelo nosso pipeline de migrations (role
`postgres`) falharia em tempo de aplicação com erro de permissão
("must be owner of table messages") — não é uma questão de risco, é uma
questão de a operação nem ser executável pelo nosso próprio pipeline.

### 3.3 — Ainda que fosse possível, seria a ferramenta errada

Mesmo num cenário hipotético em que `postgres` tivesse o privilégio: alterar
uma tabela interna de uma extensão gerenciada pelo Supabase (`realtime`) via
o pipeline de migrations da aplicação (`supabase/migrations/`) é um
anti-padrão. Migrations do schema `realtime` são de responsabilidade do
próprio serviço/extensão Supabase Realtime, não da aplicação — mudar isso
por fora do ciclo de vida gerenciado pela extensão pode ser revertido ou
entrar em conflito na próxima atualização da extensão pelo Supabase.

---

## 4. Recomendação

**Não preparar `ALTER TABLE realtime.messages VALIDATE CONSTRAINT ...`** nesta
etapa nem em nenhuma migration da aplicação. Encaminhar como um item
separado para o PO/DBA avaliar diretamente:

- Confirmar com o suporte/documentação do Supabase se essa constraint
  `NOT VALID` em `realtime.messages` é esperada (parte do design da
  extensão) ou um artefato de uma migração interna do Supabase que ficou
  incompleta.
- Se for necessário validar, fazer via canal apropriado do Supabase
  (dashboard/suporte), não via `supabase/migrations/` da aplicação.
- Como os dados já não violam a constraint (0 linhas), não há urgência
  funcional — a constraint já rejeita novos dados inválidos mesmo sem
  `VALIDATE`; `VALIDATE` só evitaria o custo de um full-scan numa futura
  necessidade de confirmar consistência, e adicionaria a garantia de
  `convalidated=true` para o planner. Não há risco de dado inconsistente
  hoje por deixar como está.

Este é o único dos 4 achados desta rodada onde a recomendação diverge da
instrução literal do plano — sinalizado explicitamente como "decisão humana
necessária" no handback.

---

## 5. Resumo para aprovação

| Item | Tipo | Risco | Reversível |
|---|---|---|---|
| `ALTER TABLE realtime.messages VALIDATE CONSTRAINT ...` | **Não preparado** | N/A — recomendação é não fazer via nosso pipeline | N/A |
| Ação recomendada: levar a questão ao PO/DBA e, se aplicável, ao suporte Supabase | Decisão, sem DDL | Nenhum | N/A |

Não há migration para aprovar nesta etapa. Peço decisão do PO sobre como
proceder com `realtime.messages` (ou confirmação de que "deixar como está"
é aceitável, dado 0 violações e a constraint já rejeitando dados novos).
