# Política Soft-Delete vs Delete/Archive

> Origem: auditoria 20-dimensões (2026-10-02), item processo — "não existe política de
> soft-delete; tabelas de negócio crescem sem estratégia de retenção/arquivamento".
>
> Status do estoque (2026-10-02): **582 tabelas criadas em migrations sem
> `deleted_at`/`archived_at`** — congelado na baseline
> `.soft-delete-baseline.json`. Esta política é **forward-only**: nenhuma
> migration retroativa é exigida; ela governa tabelas NOVAS a partir de hoje.

## Regra

**Toda tabela de negócio nova DEVE ter coluna `deleted_at timestamptz`** (soft-delete)
**OU** justificativa explícita no próprio statement:

```sql
-- soft-delete-exempt: stage Bronze append-only; dados brutos são reaplicáveis
create table public.raw_supplier_x_items (...);
```

Alternativa aceita: `archived_at timestamptz` quando a semântica for arquivamento
(registro válido mas fora do fluxo ativo) em vez de exclusão lógica.

### Convenção da coluna

```sql
deleted_at timestamptz default null,
-- index parcial obrigatório para não penalizar as queries quentes:
create index idx_<tabela>_ativos on public.<tabela> (id) where deleted_at is null;
```

- `null` = registro ativo. Queries de leitura DEVEm filtrar `deleted_at is null`
  (ou usar uma view `*_ativos` quando houver).
- Exclusão = `update ... set deleted_at = now()`. `delete` físico só em jobs de
  retenção/GDPR (ver abaixo).
- Restauração = `set deleted_at = null`.

## Quando NÃO exigir soft-delete (exempt legítimo)

| Tipo de tabela | Exemplo | Motivo |
|---|---|---|
| Stage Bronze (raw_*, *_raw) | `supplier_products_raw` | append-only, fonte re-aplicável |
| Log/auditoria | `bot_detection_log`, `login_attempts` | append-only por contrato |
| Fila/job | `pgmq`, `queue_*` | ciclo de vida do job, não do negócio |
| Cache/junction efêmera | `_temp`, tabelas de refresh | recriável |
| Config seed | enums de lookup | imutável/versionado |

Caso fora da lista: ainda assim exempt, mas **com o comentário
`-- soft-delete-exempt:`** documentando o motivo no statement.

## Retenção e GDPR/LGPD

- `deleted_at` não é compliance: registros marcados continuam no banco e no
  backup. Pedidos de exclusão LGPD (art. 18) exigem `delete` físico ou
  anonização — tratar via ticket, nunca via flag.
- Tabelas de log (login_attempts, bot_detection_log) seguem retenção do job
  `cleanup-*` correspondente (90d quando existente).

## Enforcement

`npm run check:soft-delete-policy` — ratchet em CI (Gate 2.3.6 do
`quality-gate.yml`): falha quando uma migration nova cria tabela sem
`deleted_at`/`archived_at` e sem marcação `soft-delete-exempt`. A baseline
`.soft-delete-baseline.json` congela o estoque anterior à política.

Regravar baseline só com justificativa no PR:
`npm run check:soft-delete-policy:update`
