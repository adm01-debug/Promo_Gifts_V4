# Regras de Negocio — MISSAO DAS PRs

Extraidas da analise das 24 PRs abertas em 2026-10-23.

## RN-01 — Stack: React + TypeScript + Vite + Supabase

O projeto nao usa Webpack, Next.js, Jekyll, Python, Deno, Ruby ou PHP.  
PRs que introduzem workflows para essas stacks incompativeis devem ser FECHADAS.

**PRs afetadas:** #2322, #2323, #2324, #2329, #2335, #2337 (stack errada);  
#2325, #2326, #2330, #2331, #2333, #2334 (funcionalidade ausente no stack).

## RN-02 — Gates CI sao soberanos

Deploy so ocorre quando Gate Final passa. O Gate Final agrega 13+ gates de qualidade  
obrigatorios em `.github/workflows/deploy-gates.yml`.  
PRs que modificam `.github/workflows/` exigem revisao humana (BLOQUEADA).

**PRs afetadas:** #2312 (1 workflow), #2315 (12 workflows) — ambas BLOQUEADAS.

## RN-03 — Migrations so via db-apply-migration.yml

Nenhuma migration deve ser aplicada ao banco `doufsxqlfjyuvxuezpln` por MCP direto.  
O unico caminho autorizado e `.github/workflows/db-apply-migration.yml` com aprovacao  
em `environment: production` (CLAUDE.md REGRA #8/E15).  
Agente nao pode aprovar — apenas Joaquim (PO) pode.

**PRs afetadas:** #2357/#2360 — 3 migrations REVOKE aguardam aprovacao humana.

## RN-04 — Gate E40 (R_SCHEMA_DRIFT) e inerente

Quando migrations existem no repo mas nao foram aplicadas ao banco, Gate E40 falha.  
Isso e comportamento inerente e esperado quando migrations de seguranca aguardam  
aprovacao humana. Nao e regressao de funcionalidade.  
Gate Final volta a `success` apos aprovacao dos 3 runs de db-apply-migration.

## RN-05 — Major bumps exigem analise de breaking changes

Major bumps de dependencias exigem:
- Analise de breaking changes documentada
- Testes de regressao visual (para bibliotecas UI)
- Verificacao de compatibilidade de Node.js

**PRs afetadas:** #2290 (eslint 9->10: quebra Node<20.19), #2293 (recharts 2->3: API breaking).

## RN-06 — Agentes multiplos escrevem no repo

Claude, Codex, Devin, Lovable (gpt-engineer-app[bot]), github-actions e cline  
todos tem acesso de escrita. O agente nao pode escrever em branches de outros agentes.

**PRs afetadas:** #2319 (Jules), #2320 (Copilot) — drafts de outros agentes, fechadas.

## RN-07 — Falha nova no CI apos merge = PARAR escritas + registrar

Quando Gate Final falha apos um merge, o agente deve:
1. Parar novas escritas de codigo (PRs, commits de funcionalidade)
2. Registrar o SHA e a PR responsaveis
3. Dispatchar o workflow autorizado para remediar (se existir)

Excecao explicitamente documentada: dispatches de `db-apply-migration.yml` para  
remediar Gate E40 inerente sao escritas autorizadas, nao violacao da regra de parada.  

**Ocorrencia nesta missao:** SHA `b4cc8163`, PR #2360 — Gate E40 inerente.  
Registrado formalmente. Dispatches subsequentes: remediacao autorizada.

## RN-08 — Producao = Vercel deploy automatico em merge para main

Qualquer merge em main dispara deploy Vercel em producao.  
Verificar `state=READY` no Vercel antes de declarar merge bem-sucedido.

## RN-09 — Dependabot PRs: fechar se nao ha plano de teste de regressao

PRs de Dependabot com major bumps devem ser fechadas se nao ha:
- Plano de migracao documentado
- Suite de testes para a funcionalidade afetada
- Confirmacao de compatibilidade com a versao atual do Node.js

## RN-10 — Arquivos de artefatos de analise obrigatorios

Qualquer missao de analise de PRs deve gerar:
`MISSAO.md`, `baseline/`, `regras-de-negocio.md`, `progresso.json`,  
`prs.json`, `prs.csv`, `dossies/`, `RELATORIO_PRS.md`
