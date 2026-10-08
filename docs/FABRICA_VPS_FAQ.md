# FAQ da fábrica de correções (VPS Hostinger)

Perguntas frequentes sobre a fábrica que corrige o **Promo_Gifts_V4** a partir de cartões do
kanban. As regras técnicas completas estão no `CLAUDE.md` e no `AGENTS.md` do repositório.

## 1. Como um cartão vira código na branch `v2/*`?

O cartão entra no kanban e o Hermes cria **uma worktree isolada** e **uma branch
`v2/<slug>-<timestamp>`** partindo da `main`. O agente trabalha só nessa worktree, toca apenas
os arquivos que o cartão pede, comita no padrão `tipo(escopo): descrição` e prova o resultado
com `npm run typecheck` e `npx vitest related --run <arquivos>`. O código nasce na branch; a
`main` não é tocada.

## 2. Por que a fábrica nunca faz merge na `main`?

Porque nenhum agente aprova o próprio trabalho. Push, merge e deploy são do integrador humano:
a fábrica entrega a branch pronta, não o resultado em produção. Essa barreira é o que impede
que uma regressão — por exemplo uma guarda de SSOT revertida — chegue à `main` sem revisão.

## 3. O que acontece quando o portão automático reprova?

O portão (verificador sem IA) compara o diff com `origin/main` e barra na hora quando encontra:
`npm run typecheck` ou `vitest related` vermelho; mais de 12 arquivos ou 400 linhas alteradas;
caminho proibido tocado; comentário `SSOT`/`GUARD`/`CRÍTICO`/`DO NOT REMOVE` removido; teste
afrouxado (marcadores de skip/only/todo ou supressões de tipo novas); segredo no diff; ou
menção ao projeto Supabase antigo. O merge não acontece: o cartão volta bloqueado e o agente
corrige a causa ou escala o motivo.

## 4. Quais arquivos a fábrica não pode tocar — e por quê?

- `src/integrations/supabase/client.ts` — guardas de SSOT (REGRA #1; o bot já as reverteu e derrubou produção).
- `src/integrations/supabase/types.ts` — arquivo **gerado**; editar à mão quebra a tipagem (REGRA #4).
- `supabase/migrations/` e `supabase/config.toml` — schema é do Joaquim: a fábrica propõe SQL + rollback, nunca aplica.
- `.github/workflows/` — CI e quality gates não podem virar `continue-on-error`.
- Também proibidos: `.env*`, `package.json`/lockfiles, `.husky/` e baselines/ratchets.

## 5. Como o dono revisa e aprova uma entrega via Pull Request?

O integrador empurra a branch `v2/*` e abre um **Pull Request** contra a `main`. No PR o dono lê
o diff, confere as provas do cartão e as regras do repositório e, só então, **aprova e faz o
merge**. Pediu ajuste, o cartão reabre; reprovou, a branch é descartada. Sem essa aprovação
humana, a entrega fica parada na branch — nunca na `main`.
