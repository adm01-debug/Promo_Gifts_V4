# ❓ FAQ da Fábrica de Correções (VPS Hostinger)

Perguntas frequentes sobre a fábrica que atua no **Promo_Gifts_V4**. Contexto completo no
documento irmão `docs/FABRICA_VPS.md`; regras técnicas em `CLAUDE.md` e `AGENTS.md`.

## 1. Como um cartão vira código na branch `v2/*`?

O cartão nasce no kanban interno e o Hermes cria **uma worktree isolada** e **uma branch
`v2/<slug>-<timestamp>`**. O agente trabalha só nessa worktree, comita no padrão
`tipo(escopo): descrição` e prova o resultado com `npm run typecheck` e
`npx vitest related --run <arquivos>`. A branch parte da `main`; o trabalho nunca sai dela.

## 2. Por que a fábrica nunca faz merge na `main`?

Porque **nenhum agente aprova o próprio trabalho**. Push, merge e deploy são do integrador
humano; a fábrica entrega apenas a branch. É a barreira que impede que uma regressão (ex.:
guarda de SSOT revertida) chegue à produção sem revisão humana.

## 3. O que acontece quando o portão automático reprova?

O `gate.py` — verificador sem IA — compara o diff com `origin/main` e barra na hora:
typecheck ou `vitest related` vermelho; mais de 12 arquivos ou 400 linhas alteradas; caminho
proibido tocado; linha `SSOT` / `GUARD` / `CRÍTICO` / `DO NOT REMOVE` removida; teste
afrouxado (marcadores de skip/only/todo, supressões de tipo, casts amplos); segredo no diff;
ou menção ao projeto Supabase antigo. **Nada é mergeado**: o cartão volta bloqueado e o agente
corrige ou escala o motivo.

## 4. Quais arquivos a fábrica não pode tocar — e por quê?

- `src/integrations/supabase/client.ts` — guardas de SSOT (REGRA #1; o Lovable já as reverteu e derrubou produção).
- `src/integrations/supabase/types.ts` — arquivo **gerado**; editar à mão quebra a tipagem (REGRA #4).
- `supabase/migrations/` e `supabase/config.toml` — **schema é do Joaquim**: a fábrica propõe SQL + rollback, nunca aplica.
- `.github/workflows/` — CI e quality gates não podem virar `continue-on-error`.
- Também proibidos: `.env*`, `package.json` e lockfiles, `.husky/` e baselines/ratchets.

## 5. Como o dono revisa e aprova uma entrega via Pull Request?

O integrador empurra a branch `v2/*` e abre um **Pull Request** contra a `main`. No PR, o dono
lê o diff, confere as provas do cartão e as regras do repositório e só então **aprova e faz o
merge**. Pediu ajuste, o cartão reabre; reprovou, a branch é descartada. Sem essa aprovação
humana, a entrega fica parada na branch — nunca na `main`.
