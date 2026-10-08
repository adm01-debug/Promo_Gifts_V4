# FAQ da Fábrica de Correções (VPS Hostinger)

Documento curto para quem revisa Pull Requests do Promo_Gifts_V4. A fábrica roda na VPS
Hostinger e entrega correções por cartão do kanban, sempre em branches `v2/*`.

## 1. Como um cartão vira código na branch `v2/*`?

Cada cartão do kanban ganha uma worktree isolada e uma branch própria
(`v2/<slug>-<timestamp>`, criada pelo Hermes). O worker atua só dentro dessa worktree,
commita no padrão `tipo(escopo): descrição` e nunca sai dela. A entrega é a branch + o
commit no topo da worktree, não um push direto na `main`.

## 2. Por que a fábrica nunca faz merge na `main`?

Porque a `main` é protegida: exige Pull Request + 1 approval e checks verdes
(ver `docs/BRANCH_PROTECTION.md`). Push, merge e deploy são do integrador/dono, nunca do
worker. A fábrica produz a branch; a decisão de entrar na `main` é humana.

## 3. O que acontece quando o portão automático reprova?

O portão (`gate.py`) compara o diff contra `origin/main`. Se reprovar — mais de 12
arquivos ou 400 linhas, `typecheck`/testes relacionados vermelhos, arquivo proibido
tocado, segredo no diff, guarda removida — o cartão não fecha: volta com o motivo, e o
worker corrige ou bloqueia. O integrador roda o mesmo portão do lado confiável.

## 4. Quais arquivos a fábrica não pode tocar e por quê?

- `src/integrations/supabase/client.ts` — guardas que fixam o projeto Supabase canônico;
  já houve incidente de 401 em produção.
- `src/integrations/supabase/types.ts` — arquivo gerado; editar à mão gera erro de tipo.
- `supabase/migrations/` e `supabase/config.toml` — schema é decisão do Joaquim.
- `.github/workflows/` — mexer no CI enfraquece os quality gates.

## 5. Como o dono revisa e aprova uma entrega via Pull Request?

O integrador abre o PR da branch `v2/*` para a `main`. O dono lê o diff e o relato do
cartão (o que mudou, comandos rodados, resultado real), confere os checks verdes e aprova
com 1 approval. Só o merge do dono leva a mudança para a `main`.
