# Quote comments — isolated SQL verification

This suite tests the reviewed migration against PostgreSQL 17 in a disposable
Docker container. It uses synthetic users, organizations and quotes; the quote
visibility predicate matches the live `quotes_select_scope` inspected during
preparation. The fixture is not a dump of the production database.

```bash
python3 tests/sql/quote-comments/run-tests.py --output-dir work/quote-comments-sql
```

Docker must be available at its local Unix socket. The official `postgres:17`
image is pulled only if missing. The test container has no network, published
ports, production credentials or external database connection. Each run uses a
unique name and ownership label; cleanup removes only that container and its
volumes, including on failure.

The migration and rollback are read directly from their repository paths. The
suite checks authenticated, anonymous, organization and author access; thread
integrity; immutable/server fields; content limits; real concurrent transactions;
quote cascade deletion; and rollback. JSON and logs are written to the selected
output directory. Production application remains pending owner review and must
use `db-apply-migration.yml` only.

## Decisão pendente de revisão: exclusão física por autor

A proposta mantém o `DELETE` físico previsto no `deleteComment` original. A nova
RLS restringe essa operação ao autor do comentário enquanto ele tiver acesso ao
orçamento. A chave de thread usa `ON DELETE RESTRICT`, protegendo comentários com
respostas contra a exclusão do pai. A exclusão do orçamento propaga a remoção dos
comentários por `ON DELETE CASCADE`, como documentado e testado nesta proposta.

A [política de soft-delete](../../../docs/db/POLITICA_SOFT_DELETE.md) permite
exceções fora da lista mediante justificativa explícita no statement. O marcador
`soft-delete-exempt` documenta esta decisão específica de preservar o contrato de
exclusão, que ainda precisa da revisão do dono. Ele não classifica os comentários
como log, auditoria, cache, conteúdo recriável ou append-only, nem estabelece uma
política de retenção sem evidência.

**PREPARADA — PENDENTE DE REVISÃO.** Nenhuma aplicação em produção é registrada
por este documento. A revisão deve avaliar a manutenção da exclusão física e do
cascade do orçamento antes de qualquer execução pelo workflow E15. Um eventual
recibo de aplicação só poderá ser preenchido com os dados reais dessa execução.

SHA-256 atual do arquivo da migration preparado para revisão:

```text
ffafbad5c04e75167e425c7684e42a97403591210834b8aabaea944f10eb73cd
```

O mesmo hash consta na entrada pendente de
[`MIGRATIONS_SYNC_LOG.md`](../../../supabase/MIGRATIONS_SYNC_LOG.md). O rollback
permanece inalterado e exige revisão explícita do risco de remoção dos dados.
