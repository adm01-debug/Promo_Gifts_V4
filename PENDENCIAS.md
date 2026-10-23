# PENDENCIAS.md — Workflows com bloqueio externo

> Gerado em: 2026-10-23  
> Sessão: https://claude.ai/code/session_019gUZ8wvjsJMC3gYzy6k7jB  
> Branch de trabalho: `claude/magical-cannon-u5t1vy` → PR #2378

Itens abaixo **não foram corrigidos nesta sessão** por dependerem de secret, permissão
ou dado externo que não está disponível via MCP. Cada item documenta o workflow, o erro
exato e o que o PO precisa fazer para desbloquear.

---

## P-01 — Release Please

**Workflow:** `.github/workflows/release-please.yml`  
**Erro:**
```
Error: Resource not accessible by integration
HttpError: Resource not accessible by integration
```
**Causa:** O `GITHUB_TOKEN` padrão não tem `contents: write` nos repos com branch protection
configurado. O Release Please precisa criar branches, commits e abrir PRs de release — todas
operações de escrita que requerem um PAT (Personal Access Token) com escopo `repo`.

**O que você precisa fazer:**
1. Criar um PAT com escopo `repo` (ou `contents: write + pull_requests: write`)
2. Ir em **Settings → Secrets and variables → Actions → New repository secret**
3. Criar o secret chamado `RELEASE_PLEASE_TOKEN` (ou o nome usado no workflow)
4. O workflow já deve referenciar esse secret — confirmar em `.github/workflows/release-please.yml`

**Impacto:** Bloqueia criação automática de release notes/tags. Não bloqueia deploy.

---

## P-02 — E2E — Personalization Flow

**Workflow:** `.github/workflows/e2e-personalization.yml` (ou similar)  
**Erro:** Falha de autenticação ou dados de teste ausentes. O teste tenta logar com
`E2E_USER_EMAIL`/`E2E_USER_PASSWORD` (secrets) e acessar fluxo de personalização.

**Causa provável (3 hipóteses, em ordem de probabilidade):**
1. Secrets `E2E_USER_EMAIL` e `E2E_USER_PASSWORD` não cadastrados no repositório
2. Usuário de teste não existe no Supabase `doufsxqlfjyuvxuezpln` ou senha expirou
3. Dados de produto/personalização foram removidos do banco e o seed E2E não rodou

**O que você precisa fazer:**
1. Verificar se os secrets existem: **Settings → Secrets → Actions** — procurar `E2E_USER_*`
2. Se não existirem: criar um usuário de teste no Supabase auth e cadastrar os secrets
3. Se existirem: logar no Supabase Dashboard e confirmar que o usuário está ativo
4. Opcionalmente: rodar o seed de dados E2E (`npm run seed:e2e` ou similar) para garantir
   que os produtos/personalizações necessários existam

**Impacto:** Bloqueia validação do fluxo de personalização de produtos no CI.

---

## P-03 — E2E Quote Item Editor Sheet — Snapshots visuais desatualizados

**Workflow:** `.github/workflows/e2e-quote-item-editor-sheet.yml`  
**Erro:** Snapshots visuais do header/body do Sheet estão desatualizados (diff de pixels
acima do threshold). Afeta tests em `e2e/quotes/quote-item-editor-sheet-header.spec.ts`
(aproximadamente linhas 102 e 120 — snapshots em 320/375/768px).

**Causa:** O componente `QuoteItemEditorSheet` (ou seu layout/estilos) mudou desde que
os baselines foram gerados. Mudança cosmética, não de contrato.

**O que você precisa fazer:**
Disparar o workflow de atualização de baselines manualmente:
1. Ir em **Actions → E2E · Update Quote Item Editor Sheet snapshots** (ou nome equivalente)
2. Clicar em **Run workflow** → branch `main`
3. O workflow roda `playwright test --update-snapshots` e faz commit dos PNGs

**Nota:** Este workflow tem `path-filter` — só dispara em push quando os arquivos do Sheet
são alterados. Para forçar, use `workflow_dispatch` manual.

---

## P-04 — E2E Quote Item Editor Sheet — ESC não abre dialog de confirmação

**Workflow:** `.github/workflows/e2e-quote-item-editor-sheet.yml`  
**Erro:** Teste em `quote-item-editor-sheet-header.spec.ts` (~linha 300):
```
expect(confirmDialog).toBeVisible() // timeout — dialog não aparece
```
O fluxo: foca o input de quantidade → pressiona ESC → espera `quote-editor-unsaved-dialog`.

**Causa raiz:** `QuoteItemEditorSheet.tsx` tem um `<TooltipProvider delayDuration={200}>`
**local** (sem `disableHoverableContent`) envolvendo o botão Salvar. Quando o Sheet está
aberto com tooltip potencialmente visível, o Radix `DismissableLayer` descarta a camada
do tooltip antes da camada do Sheet — o evento ESC é consumido pelo tooltip e o Sheet
nunca recebe o `onOpenChange(false)`.

**Fix aplicável:**
```tsx
// src/components/quotes/QuoteItemEditorSheet.tsx
// Linha ~XX: TooltipProvider local
<TooltipProvider delayDuration={200} disableHoverableContent>
```
Adicionar `disableHoverableContent` ao `TooltipProvider` local do Sheet.

**Por que não foi aplicado nesta sessão:**
O workflow `e2e-quote-item-editor-sheet.yml` tem `paths:` que não incluem os arquivos
alterados nesta sessão — o workflow não é disparado pelo PR #2378, então não daria como
verificar se o fix funciona. Requer sessão dedicada que altere `QuoteItemEditorSheet.tsx`
e force o workflow a rodar.

**O que você precisa fazer:**
Autorizar uma nova sessão que:
1. Adicione `disableHoverableContent` ao `TooltipProvider` local em `QuoteItemEditorSheet.tsx`
2. Dispare o workflow para confirmar que o ESC abre o dialog

---

## P-05 — db-schema-drift-check / Gate E40 — Secrets de banco ausentes

**Workflow:** `.github/workflows/db-schema-drift-check.yml` (e Gate E40 em `deploy-gates.yml`)  
**Erro:**
```
Error: SUPABASE_ACCESS_TOKEN is not set
-- ou --
Error: SUPABASE_DB_PASSWORD is not set
```
**Causa:** O drift check precisa conectar ao banco de produção `doufsxqlfjyuvxuezpln`
para comparar o schema vivo com o ledger de migrations. Sem as credenciais, o check
não consegue rodar.

**O que você precisa fazer:**
1. **Settings → Secrets → Actions** — verificar se existem:
   - `SUPABASE_ACCESS_TOKEN` (token da Supabase CLI, gerado em app.supabase.com → Account → Access Tokens)
   - `SUPABASE_DB_PASSWORD` (senha do banco, em Supabase Dashboard → Settings → Database)
2. Se não existirem: gerar e cadastrar ambos
3. Após cadastrar: re-rodar o workflow manualmente para confirmar

**Impacto:** Gate E40 é **bloqueante** para deploy. Sem esse secret, o Gate Final falha
e nenhum PR pode ser mergeado.

---

## P-06 — Running Copilot Code Review (branch de outro agente)

**Workflow:** Disparo em branch `claude/fix-realtime-messages-owner-261023-1600`  
**Situação:** Workflow de revisão automática rodando em branch de outro agente (não desta sessão).

**Por que não foi tratado:**
Conforme REGRA #10 do CLAUDE.md, não interagir com branches de outros agentes.
Este item é apenas um registro de observação — não requer ação do PO a menos que
o PR daquele agente precise ser revisado ou mergeado.

**Ação recomendada:** Verificar o PR aberto para aquela branch e decidir se deve
ser mergeado, fechado ou reaberto.

---

*Próxima atualização: após resolução dos itens acima, nova sessão deve atualizar este arquivo.*
