# Plano de melhorias e correções — reconciliação Local × GitHub × Supabase

**Projeto:** Promo Gifts V4  
**Repositório:** `adm01-debug/Promo_Gifts_V4`  
**Supabase canônico:** `doufsxqlfjyuvxuezpln`  
**Data-base da evidência:** 2026-09-15  
**Quantidade:** exatamente 50 etapas  
**Objetivo:** provar e manter paridade bidirecional entre o conteúdo local, o GitHub e o banco canônico, sem perder trabalho multiagente nem aplicar mudanças de schema sem autorização explícita do PO.

---

## 1. Estado inicial comprovado

- A worktree observada terminou na branch `claude/audit-gaps-20260915`, um commit à frente de `origin/main`.
- O commit local `7fbbcabe5` ainda não estava publicado e alterava três arquivos.
- A branch local `main` estava dois commits atrás de `origin/main`.
- A árvore da antiga branch da PR #1863 estava semanticamente idêntica a `origin/main`, embora a PR permanecesse aberta.
- O repositório continha 2.985 arquivos SQL em `supabase/migrations/`, 10 drafts ativos e 4 drafts arquivados.
- `npm run check:migration-refs` falhava com 16 referências inexistentes originadas em `graphify-out/cache/stat-index.json`.
- A CLI Supabase retornava `401` tanto para a lista de projetos quanto para o ledger de migrations.
- O workflow “Migrations x Canonical schema” estava verde, mas o log provava que a verificação live foi pulada por ausência de `SUPABASE_DB_PASSWORD`.
- `git fsck --full --no-dangling` não encontrou corrupção estrutural.
- Existiam 123 commits, 167 blobs e 388 trees inalcançáveis; eles devem ser preservados até classificação humana.

Esses números são uma fotografia. Toda execução deste plano deve gerar nova evidência antes de tomar decisões.

### 1.1 Atualização de evidência — 2026-09-16

Esta seção não substitui a fotografia acima; registra o que mudou desde então, verificado diretamente em `origin/main` (não é ainda o estado da worktree local, que segue atrás).

- **PR #1863 mergeada** (`64cc27731`, `fix(security): revoga EXECUTE de authenticated em zapp_catalog_stats + registra migration órfã`). Não foi fechada como redundante nem manteve-se aberta sem diff: recebeu conteúdo real antes do merge. Isso resolve a preocupação central de **E09**, mas por uma terceira via não prevista textualmente no passo original (nem "fechar como redundante" nem apenas "reaproveitar" — foi reaproveitada e mergeada com diff real).
- **PR #1864 mergeada** (`1d2fafccd`, `fix(ci): torna reconciliação Supabase fail-closed`). Verificado no código de `origin/main`:
  - Resolve **E18**: `scripts/check-migration-path-references.mjs` agora define `IGNORE_RELATIVE_DIRS = new Set(['graphify-out/cache'])`, excluindo o índice derivado do Graphify do escopo do verificador sem esconder referência real quebrada.
  - Resolve **E28**: `.github/workflows/db-schema-drift-check.yml` ganhou um job "Gate - secrets obrigatórios presentes?" que executa `exit 1` (não apenas `warning`) quando `SUPABASE_ACCESS_TOKEN` ou `SUPABASE_DB_PASSWORD` estão ausentes, eliminando o falso verde.
  - A própria descrição da PR #1864 registra como pendência operacional que **`SUPABASE_DB_PASSWORD` ainda não está cadastrado como secret** — ou seja, **E26/E27 continuam em aberto** e o drift-check real ainda não produziu evidência live; ele deve estar `BLOQUEADO`, não `PASS`, até isso ser resolvido.
  - Como efeito colateral (fora do escopo numerado do plano), a PR também atualizou a allowlist de advisories de `pptxgenjs`/`image-size` com validade até 2026-10-09 — vale revisar antes dessa data para não virar um "verde" silenciosamente desatualizado.
- **A branch de trabalho atual não contém essas duas correções ainda.** `HEAD` (`claude/audit-gaps-20260915`, `7fbbcabe5`) está 1 à frente e **2 atrás** de `origin/main` (na fotografia original estava só "1 à frente"). A `main` local está **4 commits atrás** de `origin/main` (era 2). Rodar `npm run check:migration-refs` nesta worktree ainda falha com as 16 referências antigas — isso é esperado (a correção existe em `origin/main`, não aqui) e não deve ser confundido com regressão do E18.
- Duas worktrees adicionais em `/tmp` (`promo-gifts-reconciliation-integrity-20260915` → branch `codex/reconciliation-integrity-20260915`; `promo-gifts-schema-reconcile-6cH3PA` → branch `codex/schema-ledger-reconciliation-20260915`) correspondem às origens de #1863/#1864 e aparecem como `prunable` em `git worktree list`. Por cautela do **E03/E04**, não rodar `git worktree prune` nelas sem antes confirmar que todo o conteúdo relevante já está em `origin/main` (parece que sim, mas não foi comparado commit a commit nesta atualização).
- Nenhuma outra premissa da fotografia original (2.985 migrations, `git fsck` limpo, `401` na CLI, drafts ativos/arquivados, objetos inalcançáveis) foi reverificada aqui — continuam valendo até E01/E02/E06/E26 serem executados de fato.

---

## 2. Regras operacionais

| Marcador | Regra |
|---|---|
| `[RO]` | Somente leitura; pode ser executado sem alterar estado remoto. |
| `[GIT]` | Altera branch, commit, PR ou configuração do GitHub; exige worktree limpa e reserva multiagente. |
| `[DB-RO]` | Consulta o Supabase canônico sem persistir dados ou DDL. |
| `[REQUER-PO]` | Altera schema, grants, policies, funções, triggers, jobs, dados ou configuração produtiva. Exige autorização explícita por objeto/operação. |

### Critérios globais de conclusão

- [ ] Nenhuma correção de outro agente foi sobrescrita ou perdida.
- [ ] Todo commit válido possui branch remota, PR ou decisão documentada de descarte.
- [ ] `main` local, `origin/main` e o commit implantado em produção estão identificados por SHA.
- [ ] Toda versão do ledger remoto foi classificada contra os arquivos locais.
- [ ] Toda migration local sem ledger remoto foi classificada individualmente.
- [ ] O schema foi auditado por `pg_catalog`, incluindo objetos invisíveis ao PostgREST.
- [ ] Nenhum gate pode ficar verde quando a verificação live foi pulada.
- [ ] Toda alteração de banco possui migration forward-only, preflight, rollback lógico e recibo pós-aplicação.
- [ ] Segredos permanecem fora do Git e não aparecem em logs ou artefatos.
- [ ] Um relatório final reproduzível contém comandos, SHAs, hashes, resultados e pendências.

---

## Fase A — Controle de mudança e preservação multiagente

### E01 — Congelar a linha de base da reconciliação `[RO]`

- [ ] Registrar data, branch, `HEAD`, `origin/main`, status e worktrees existentes.
- [ ] Registrar agentes/sessões ativos e os arquivos reservados por cada um.
- [ ] Suspender apenas trocas de branch na worktree compartilhada durante a coleta.
- [ ] Não editar, aplicar stash, limpar ou fazer rebase durante a fotografia.

**Concluída quando:** o relatório contém uma linha de base imutável com SHAs e responsáveis.

### E02 — Criar o inventário de refs locais e remotas `[RO]`

- [ ] Listar branches, tags, upstreams, refs `[gone]` e branches sem upstream.
- [ ] Medir ahead/behind contra `origin/main` e contra o upstream correspondente.
- [ ] Separar diferença de hash de diferença real de conteúdo.
- [ ] Associar cada branch a PR, merge, squash ou ausência de publicação.

**Concluída quando:** toda branch possui estado `ativa`, `mergeada`, `redundante`, `divergente`, `resgate` ou `desconhecida`.

### E03 — Preservar commits e objetos inalcançáveis `[GIT]`

- [ ] Exportar a lista dos objetos inalcançáveis antes de qualquer manutenção Git.
- [ ] Inspecionar autor, data, assunto e diff de cada commit potencialmente relevante.
- [ ] Criar refs de resgate somente para objetos que representem trabalho recuperável.
- [ ] Bloquear `git gc`, `prune` e limpeza automática até a classificação terminar.

**Concluída quando:** nenhum objeto relevante depende apenas do reflog ou de retenção temporária do Git.

### E04 — Auditar stashes, checkpoints e cópias temporárias `[RO]`

- [ ] Listar stashes, checkpoints Cline/Claude/Codex e clones sob diretórios temporários.
- [ ] Comparar cada snapshot com `origin/main` por conteúdo e não apenas por ancestralidade.
- [ ] Identificar arquivos únicos, especialmente migrations, testes e documentação.
- [ ] Registrar a decisão proposta sem aplicar ou apagar o material.

**Concluída quando:** não existe fonte local de trabalho desconhecida ou sem responsável.

### E05 — Definir o ledger de decisões multiagente `[GIT]`

- [ ] Criar uma entrada por branch/commit com proprietário, escopo e destino.
- [ ] Registrar conflitos de arquivos antes de novas implementações.
- [ ] Exigir handoff com testes, riscos e SHAs de origem/destino.
- [ ] Proibir decisões “main wins” ou “branch wins” sem análise semântica.

**Concluída quando:** cada mudança concorrente pode ser rastreada até uma decisão humana ou PR.

---

## Fase B — Paridade Local × GitHub

### E06 — Atualizar somente refs remotas `[RO]`

- [ ] Executar fetch de branches e tags sem alterar arquivos da worktree.
- [ ] Registrar refs removidas pelo servidor e novos commits em `origin/main`.
- [ ] Recalcular ahead/behind após o fetch.
- [ ] Confirmar o URL e o repositório GitHub canônico.

**Concluída quando:** todas as comparações usam refs remotas atuais.

### E07 — Publicar ou descartar formalmente o commit local `7fbbcabe5` `[GIT]`

- [ ] Revisar semanticamente as três alterações do commit.
- [ ] Executar typecheck e testes direcionados de Kit Maker e estoque.
- [ ] Publicar em branch própria e abrir PR se aprovado.
- [ ] Se rejeitado, preservar a evidência e documentar a razão antes de qualquer remoção.

**Concluída quando:** o commit não existe apenas localmente e possui destino auditável.

### E08 — Sincronizar a branch local `main` `[GIT]`

- [ ] Confirmar que nenhum agente trabalha diretamente em `main`.
- [ ] Criar salvaguarda dos commits locais antes da atualização.
- [ ] Atualizar exclusivamente por fast-forward.
- [ ] Confirmar `main == origin/main` por SHA e árvore.

**Concluída quando:** `git rev-list --left-right --count main...origin/main` retorna `0 0`.

### E09 — Encerrar corretamente a PR #1863 `[GIT]` ✅ Resolvida (ver §1.1)

- [x] Confirmar novamente que a árvore da branch é idêntica a `origin/main`. — *superado: a branch deixou de ser idêntica antes do merge.*
- [x] Identificar em qual commit de `main` o conteúdo equivalente entrou. — `64cc27731`.
- [ ] Registrar a equivalência na PR. — não se aplica; a PR não era mais equivalente/redundante no momento do merge.
- [x] Fechar como redundante ou reaproveitar somente se surgir diff real. — reaproveitada com diff real (`revoga EXECUTE de authenticated em zapp_catalog_stats`) e mergeada em `origin/main`.

**Concluída quando:** não existe PR aberta sem mudança efetiva ou com histórico enganoso. — **Atendido:** PR #1863 está `MERGED`, com diff real e histórico coerente.

### E10 — Reconciliar branches locais sem branch remota `[GIT]`

- [ ] Classificar branches mergeadas por squash versus branches nunca publicadas.
- [ ] Comparar patches relevantes com `origin/main` usando patch-id e diff semântico.
- [ ] Preservar branches de resgate até revisão humana.
- [ ] Remover refs apenas após aprovação e registro de equivalência.

**Concluída quando:** toda branch local sem remoto possui decisão explícita e reversível.

### E11 — Reconciliar branches remotas sem branch local `[RO]`

- [ ] Listar branches remotas sem cópia local e suas PRs.
- [ ] Classificar como ativa, mergeada, abandonada, automação ou publicação estática.
- [ ] Verificar se alguma contém commit ausente de `main` e sem PR aberta.
- [ ] Não criar cópias locais de branches irrelevantes apenas para igualar contagens.

**Concluída quando:** nenhuma branch remota ativa fica fora do inventário.

### E12 — Revisar `rescue/local-main-20260909-1145` `[RO]`

- [ ] Extrair somente os commits próprios da branch de resgate.
- [ ] Comparar cada patch contra implementações posteriores em `main`.
- [ ] Marcar mudanças superadas, equivalentes, ainda úteis ou perigosas.
- [ ] Preparar cherry-picks mínimos em branch isolada somente para itens ainda úteis.

**Concluída quando:** a branch deixa de ser um pacote opaco e vira uma lista de decisões por patch.

### E13 — Revisar branches históricas de estabilização `[RO]`

- [ ] Auditar `codex/stabilization-100`, `stabilization-completion-100` e `stabilization-next-100`.
- [ ] Correlacionar commits com o PR #1799 e merges posteriores.
- [ ] Evitar interpretar milhares de diferenças de uma base antiga como trabalho perdido.
- [ ] Isolar apenas patches sem equivalência atual.

**Concluída quando:** há prova de quais mudanças históricas foram ou não absorvidas.

### E14 — Revisar a branch remota `codex/magazine-dbdeploy-20260909` `[RO]`

- [ ] Confirmar que não existe PR associada.
- [ ] Analisar os cinco commits de workflow individualmente.
- [ ] Comparar o comportamento atual dos workflows, não somente seus textos.
- [ ] Decidir entre PR mínima, obsolescência documentada ou arquivamento.

**Concluída quando:** nenhuma automação de Magazine fica abandonada em branch remota sem decisão.

### E15 — Validar higiene e integridade do repositório `[RO]`

- [ ] Executar `git fsck --full --no-dangling`.
- [ ] Executar `git diff --check` nos patches candidatos.
- [ ] Confirmar ausência de arquivos de código untracked fora de diretórios gerados.
- [ ] Confirmar que `.env.local` e credenciais permanecem ignorados.

**Concluída quando:** não há corrupção, whitespace inválido ou código invisível ao Git.

---

## Fase C — Integridade da fonte de migrations

### E16 — Gerar inventário canônico das migrations `[RO]`

- [ ] Listar path, versão numérica, slug, tamanho e hash de cada SQL.
- [ ] Detectar versões duplicadas mesmo quando os slugs diferem.
- [ ] Detectar arquivos vazios, ilegíveis e nomes fora do contrato.
- [ ] Separar markers/no-op, migrations executáveis e snapshots recuperados.

**Concluída quando:** as 2.985 migrations têm identidade e classificação determinística.

### E17 — Validar ordenação e unicidade de versões `[RO]`

- [ ] Reproduzir a regra de parsing do Supabase CLI.
- [ ] Identificar timestamps curtos, longos ou não canônicos.
- [ ] Comparar ordenação lexical e numérica.
- [ ] Bloquear renome de migrations já aplicadas sem estratégia de ledger.

**Concluída quando:** nenhuma colisão ou ambiguidade de versão permanece desconhecida.

### E18 — Corrigir o gate de referências de migrations `[GIT]` ✅ Resolvida em `origin/main` (ver §1.1)

- [x] Confirmar que as 16 falhas vêm de cache gerado do Graphify. — todas originadas em `graphify-out/cache/stat-index.json`.
- [x] Excluir artefatos de índice semântico do escopo do verificador, quando apropriado. — `IGNORE_RELATIVE_DIRS = new Set(['graphify-out/cache'])` em `scripts/check-migration-path-references.mjs` (PR #1864, commit `1d2fafccd`).
- [x] Não recriar migrations inexistentes apenas para satisfazer referências históricas. — nenhuma migration foi recriada; a exclusão foi do índice derivado, preservando a varredura das fontes canônicas.
- [ ] Adicionar teste que diferencia documentação válida de cache derivado. — não confirmado nesta atualização; verificar se `tests/scripts/` cobre esse caso antes de considerar 100% fechado.

**Concluída quando:** `npm run check:migration-refs` passa sem esconder referência real quebrada. — **Atendido em `origin/main`.** Ainda falha na worktree local atual porque `HEAD` está 2 commits atrás dessa correção (não é regressão, é defasagem de branch — ver §1.1).

### E19 — Validar o snapshot consolidado `[RO]`

- [ ] Regenerar o snapshot somente em worktree descartável.
- [ ] Comparar `ALL_IN_ONE.sql` gerado com o artefato versionado.
- [ ] Separar drift de conteúdo de diferenças de formatação/ordenação.
- [ ] Não promover o snapshot como substituto do ledger ou do `pg_catalog`.

**Concluída quando:** o snapshot é reproduzível e sua limitação está documentada.

### E20 — Classificar os 10 drafts ativos `[RO]`

- [ ] Mapear cada draft para migration candidata por objeto e não apenas por nome.
- [ ] Identificar drafts já absorvidos por migrations posteriores.
- [ ] Marcar drafts não promovidos, rejeitados ou ainda necessários.
- [ ] Não mover, apagar ou aplicar draft nesta etapa.

**Concluída quando:** todo draft ativo possui status, owner e próxima decisão.

### E21 — Validar os quatro drafts arquivados `[RO]`

- [ ] Confirmar a migration canônica que substituiu cada draft.
- [ ] Comparar objetos e comportamento, não somente o slug.
- [ ] Verificar se documentação ainda aponta para o caminho antigo.
- [ ] Manter o arquivo arquivado como histórico quando necessário.

**Concluída quando:** cada draft arquivado tem sucessor comprovado ou lacuna declarada.

### E22 — Atualizar o contrato do `MIGRATIONS_SYNC_LOG` `[GIT]`

- [ ] Separar evidência histórica de resultado live atual.
- [ ] Registrar comandos, data, projeto, contagens e hashes usados na auditoria.
- [ ] Declarar explicitamente consultas bloqueadas ou puladas.
- [ ] Proibir frases “sincronizado” sem recibo recente do ledger remoto.

**Concluída quando:** o log não permite interpretar evidência antiga como certificação atual.

### E23 — Fortalecer o manifesto de reconciliação `[GIT]`

- [ ] Incluir path, versão, hash e origem de cada snapshot remoto.
- [ ] Validar o manifesto em CI.
- [ ] Falhar se um arquivo reconciliado mudar sem atualização explicada.
- [ ] Isolar exceções históricas em allowlist documentada.

**Concluída quando:** snapshots recuperados não podem sofrer alteração silenciosa.

### E24 — Verificar migrations do Kit Maker e Magazine `[RO]`

- [ ] Mapear as quatro migrations recentes do Kit Maker para RPCs e tabelas consumidoras.
- [ ] Mapear migrations/RPCs do Magazine para os serviços e hooks correspondentes.
- [ ] Verificar grants, assinatura de funções e tratamento de conflito otimista esperado.
- [ ] Identificar migrations preparadas, aplicadas e apenas documentadas.

**Concluída quando:** cada funcionalidade crítica aponta para um objeto SQL e uma versão do ledger.

### E25 — Criar dry-run estrutural das migrations `[GIT]`

- [ ] Executar parser/linters SQL em todas as novas migrations.
- [ ] Validar dependências entre objetos e ordem de criação.
- [ ] Detectar DDL destrutivo, grants amplos e `SECURITY DEFINER` sem `search_path`.
- [ ] Publicar o relatório como artefato bloqueante de PR.

**Concluída quando:** uma migration inválida ou perigosa não chega à fase de aplicação.

---

## Fase D — Restaurar observabilidade real do Supabase

### E26 — Restaurar autenticação local da CLI `[DB-RO]`

- [ ] Revogar tokens expostos/expirados e autenticar com token novo de escopo mínimo.
- [ ] Confirmar `supabase projects list` sem expor o token em terminal ou logs.
- [ ] Confirmar que o projeto esperado aparece e que nenhum projeto errado será usado.
- [ ] Registrar apenas o resultado e o identificador do projeto, nunca o segredo.

**Concluída quando:** a CLI lê metadados do projeto canônico sem `401`.

### E27 — Restaurar a credencial de banco no GitHub Actions `[GIT]`

- [ ] Configurar `SUPABASE_DB_PASSWORD` no ambiente correto do repositório.
- [ ] Confirmar `SUPABASE_ACCESS_TOKEN` válido e com escopo mínimo.
- [ ] Restringir secrets aos workflows e ambientes necessários.
- [ ] Executar workflow manual e verificar que etapas live realmente rodaram.

**Concluída quando:** os logs mostram link e consulta live, sem segredo revelado.

### E28 — Eliminar o falso verde do drift check `[GIT]` ✅ Workflow corrigido em `origin/main`; ainda `BLOQUEADO` na prática (ver §1.1)

- [x] Alterar ausência de secrets de `warning + success` para resultado inconclusivo bloqueante. — job "Gate - secrets obrigatórios presentes?" em `.github/workflows/db-schema-drift-check.yml` roda `exit 1` quando `SUPABASE_ACCESS_TOKEN`/`SUPABASE_DB_PASSWORD` faltam (PR #1864, commit `1d2fafccd`).
- [x] Diferenciar `skipped`, `blocked`, `passed` e `failed` no job summary. — escreve "## Drift check bloqueado" no `$GITHUB_STEP_SUMMARY` antes de falhar.
- [ ] Adicionar teste estático que impeça retorno verde sem execução do `db diff`. — não confirmado nesta atualização.
- [ ] Atualizar required checks para usar o job fail-closed. — não confirmado; verificar configuração de branch protection/ruleset.

**Concluída quando:** “verde” significa obrigatoriamente consulta live bem-sucedida. — **Parcialmente atendido:** o falso-verde estrutural foi eliminado, mas o workflow está `BLOQUEADO` de fato porque `SUPABASE_DB_PASSWORD` continua sem cadastro (pendência que a própria PR #1864 documenta). **E26/E27 permanecem etapas ativas** — sem eles, este gate nunca chega a `PASS`, só a `BLOQUEADO`, o que é o comportamento correto e desejado, não um problema novo.

### E29 — Fixar e validar o alvo canônico em todos os caminhos `[RO]`

- [ ] Confirmar `doufsxqlfjyuvxuezpln` no cliente, config, workflows e scripts.
- [ ] Detectar referências executáveis ao projeto proibido/legado.
- [ ] Verificar o Gate 0 e sua cobertura contra regressões do Lovable.
- [ ] Confirmar que previews usam configuração separada sem alterar o SSOT produtivo.

**Concluída quando:** nenhuma operação consegue apontar silenciosamente para outro projeto.

### E30 — Ler o ledger remoto sem aplicar nada `[DB-RO]`

- [ ] Executar `supabase migration list --linked` e exportar o resultado.
- [ ] Consultar `supabase_migrations.schema_migrations` por fonte autorizada.
- [ ] Normalizar IDs históricos inválidos sem alterar o banco.
- [ ] Assinar o snapshot do ledger com data e hash.

**Concluída quando:** existe uma fotografia reproduzível do ledger canônico atual.

---

## Fase E — Reconciliação bidirecional do ledger

### E31 — Calcular `remoto − local` `[DB-RO]`

- [ ] Comparar por versão normalizada e hash/statement quando disponível.
- [ ] Identificar migrations aplicadas no banco sem arquivo no GitHub.
- [ ] Distinguir DDL out-of-band de nomes históricos divergentes.
- [ ] Não gerar marker automaticamente.

**Concluída quando:** toda versão remota sem representação local está listada e explicada.

### E32 — Calcular `local − remoto` `[DB-RO]`

- [ ] Listar migrations locais sem registro no ledger.
- [ ] Separar migrations históricas deliberadamente não aplicadas das novas pendentes.
- [ ] Detectar versões superadas, markers e scripts perigosos.
- [ ] Associar cada item a PR, autorização e objeto afetado.

**Concluída quando:** nenhuma migration local fica com status “presumidamente aplicada”.

### E33 — Comparar statements das versões compartilhadas `[DB-RO]`

- [ ] Extrair statements remotos quando a plataforma disponibilizar.
- [ ] Normalizar apenas diferenças não semânticas justificadas.
- [ ] Comparar hashes e sinalizar mutação pós-aplicação.
- [ ] Tratar qualquer mismatch como incidente de rastreabilidade.

**Concluída quando:** versões iguais não escondem conteúdos SQL diferentes.

### E34 — Classificar os três IDs históricos inválidos `[DB-RO]`

- [ ] Confirmar que continuam presentes no ledger.
- [ ] Verificar os objetos físicos que cada ID criou ou alterou.
- [ ] Modelar o impacto de manter, reparar ou representar por marker.
- [ ] Preparar proposta individual, sem executar `migration repair`.

**Concluída quando:** cada ID tem decisão recomendada, preflight e risco mensurado.

### E35 — Produzir matriz de decisão por migration `[RO]`

- [ ] Atribuir estado: `aplicada e igual`, `remota sem arquivo`, `local pendente`, `superada`, `marker`, `divergente` ou `bloqueada`.
- [ ] Incluir objeto, owner, PR, data, hash e autorização.
- [ ] Priorizar migrations recentes e de segurança.
- [ ] Fazer revisão humana dos casos ambíguos.

**Concluída quando:** a reconciliação pode ser auditada linha a linha.

---

## Fase F — Auditoria completa do schema por `pg_catalog`

### E36 — Inventariar schemas, tabelas, partições e colunas `[DB-RO]`

- [ ] Consultar schemas relevantes e excluir apenas schemas internos documentados.
- [ ] Capturar tipos, defaults, identidade, nulabilidade e comentários.
- [ ] Identificar tabelas vazias sem classificá-las automaticamente como inúteis.
- [ ] Comparar o inventário com types, serviços e migrations.

**Concluída quando:** toda tabela/coluna possui origem e consumidor ou lacuna registrada.

### E37 — Inventariar constraints e índices `[DB-RO]`

- [ ] Listar PKs, FKs, uniques, checks, exclusões e validação pendente.
- [ ] Listar índices, predicados, expressões, validade e uso.
- [ ] Detectar FKs sem índice e índices duplicados como candidatos, não como remoção automática.
- [ ] Correlacionar constraints com contratos da aplicação.

**Concluída quando:** integridade e desempenho possuem mapa verificável.

### E38 — Inventariar RLS, policies e privilégios `[DB-RO]`

- [ ] Listar RLS habilitada/forçada por tabela.
- [ ] Extrair policies por comando, role, `USING` e `WITH CHECK`.
- [ ] Listar grants de schema, tabela, sequência e função.
- [ ] Detectar `anon`/`authenticated` excessivos e funções sem privilégio mínimo.

**Concluída quando:** todo acesso público/autenticado é intencional e justificável.

### E39 — Inventariar funções, triggers e views `[DB-RO]`

- [ ] Extrair assinaturas, linguagem, volatilidade, segurança e `search_path` das funções.
- [ ] Mapear triggers para função, evento, condição e ordem.
- [ ] Mapear views/materialized views, owner e `security_invoker`/barrier.
- [ ] Comparar definições vivas com migrations e allowlists de segurança.

**Concluída quando:** objetos executáveis e derivados têm definição versionada correspondente.

### E40 — Inventariar enums, extensões, jobs e publicação realtime `[DB-RO]`

- [ ] Listar enums e valores na ordem real.
- [ ] Listar extensões, versões e schemas de instalação.
- [ ] Listar cron/jobs, funções chamadas, periodicidade e falhas recentes.
- [ ] Listar publications/realtime e tabelas expostas.

**Concluída quando:** nenhuma infraestrutura de banco fica invisível à auditoria.

---

## Fase G — Código, Edge Functions e banco vivo

### E41 — Comparar Edge Functions locais e implantadas `[DB-RO]`

- [ ] Inventariar funções locais e deployments remotos por nome/versão.
- [ ] Comparar hashes do código quando a API permitir.
- [ ] Verificar `verify_jwt`, secrets exigidos e rotas consumidoras.
- [ ] Classificar funções locais não implantadas e deployments sem código local.

**Concluída quando:** cada deployment possui fonte versionada e configuração conhecida.

### E42 — Validar Auth, redirects e providers `[DB-RO]`

- [ ] Confirmar providers habilitados e compatíveis com a UI de login.
- [ ] Verificar URLs de site e redirects de produção/preview.
- [ ] Validar JWKS e expiração/rotação sem expor material sensível.
- [ ] Criar teste de contrato que impeça botão de provider desabilitado.

**Concluída quando:** a configuração Auth viva corresponde ao comportamento publicado.

### E43 — Validar Storage, buckets e policies `[DB-RO]`

- [ ] Listar buckets, visibilidade, limites e tipos permitidos.
- [ ] Auditar policies de leitura, escrita, atualização e remoção.
- [ ] Mapear cada bucket aos módulos consumidores.
- [ ] Identificar paths usados no código sem bucket/policy correspondente.

**Concluída quando:** todo upload/download tem bucket, policy e consumidor coerentes.

### E44 — Executar testes transacionais com rollback `[DB-RO]`

- [ ] Testar RPCs críticas em transação revertida ou ambiente isolado.
- [ ] Simular repetição/idempotência, conflito otimista e concorrência.
- [ ] Verificar SQLSTATE, grants, RLS e ausência de efeitos residuais.
- [ ] Priorizar Kit Maker, Magazine, orçamento, aprovação de desconto e estoque.

**Concluída quando:** contratos críticos têm evidência real sem poluir produção.

### E45 — Regenerar e comparar tipos Supabase `[GIT]`

- [ ] Registrar contagem e símbolos críticos antes da geração.
- [ ] Gerar types a partir do projeto canônico em branch isolada.
- [ ] Investigar qualquer remoção de tabela/view/tipo.
- [ ] Confirmar tabelas críticas e campos do tipo `Product` exigidos pelo projeto.

**Concluída quando:** types refletem o schema sem regressão ou cast ocultando drift.

---

## Fase H — Correções, promoção e fechamento

### E46 — Corrigir todos os gates com falso verde `[GIT]`

- [ ] Tornar secrets ausentes uma condição bloqueante em gates obrigatórios.
- [ ] Diferenciar teste dry-run de validação live.
- [ ] Remover `continue-on-error` efetivo de checks de qualidade/segurança.
- [ ] Adicionar testes do próprio workflow contra caminhos de skip.

**Concluída quando:** cada check verde apresenta evidência da verificação executada.

### E47 — Preparar correções de código em PRs pequenas `[GIT]`

- [ ] Agrupar mudanças por domínio e risco, evitando PR monolítica.
- [ ] Rebasear semanticamente sobre `origin/main` atualizado.
- [ ] Preservar invariantes SSOT, tipos críticos e mudanças de outros agentes.
- [ ] Anexar testes, comparação antes/depois e plano de reversão.

**Concluída quando:** todas as correções de código têm PR revisável e gates conclusivos.

### E48 — Preparar migrations forward-only por objeto `[REQUER-PO]`

- [ ] Criar uma migration por objeto ou mudança atomicamente reversível.
- [ ] Incluir precondições que falhem diante de estado inesperado.
- [ ] Definir privilégio mínimo e proteger `search_path`/RLS.
- [ ] Solicitar autorização explícita listando função, view, tabela ou policy afetada.

**Concluída quando:** toda divergência de banco tem proposta isolada, revisada e autorizável.

### E49 — Aplicar e validar mudanças autorizadas `[REQUER-PO]`

- [ ] Confirmar projeto, backup lógico aplicável e janela de execução.
- [ ] Aplicar somente migrations nominalmente autorizadas.
- [ ] Validar ledger, `pg_catalog`, grants, RLS e testes transacionais após cada uma.
- [ ] Interromper a sequência no primeiro resultado inesperado.

**Concluída quando:** cada aplicação possui recibo, hash, resultado e verificação pós-DDL.

### E50 — Emitir certificação final e instituir prevenção contínua `[GIT]`

- [ ] Repetir comparações Local ↔ GitHub ↔ ledger ↔ `pg_catalog` ↔ deployment.
- [ ] Confirmar `main`, produção Vercel e Supabase pelos identificadores exatos.
- [ ] Publicar matriz final com `PASS`, `FAIL`, `GAP`, `BLOQUEADO` e owner.
- [ ] Agendar reconciliação periódica fail-closed e alertas de drift/out-of-band.

**Concluída quando:** a frase “100% sincronizado” é sustentada por evidência recente, reproduzível e bidirecional.

---

## 3. Ordem de execução recomendada

1. **Onda 1 — Preservação:** E01–E05.
2. **Onda 2 — Git:** E06–E15.
3. **Onda 3 — Migrations locais:** E16–E25.
4. **Onda 4 — Acesso live:** E26–E30.
5. **Onda 5 — Ledger bidirecional:** E31–E35.
6. **Onda 6 — `pg_catalog`:** E36–E40.
7. **Onda 7 — Integrações vivas:** E41–E45.
8. **Onda 8 — Correções e certificação:** E46–E50.

## 4. Gates de interrupção

- Se a worktree mudar durante uma comparação, repetir E01 antes de continuar.
- Se surgir commit sem owner, executar E03/E04 antes de atualizar branches.
- Se o projeto Supabase resolvido não for `doufsxqlfjyuvxuezpln`, interromper imediatamente.
- Se a autenticação live falhar, marcar as etapas dependentes como `BLOQUEADO`; nunca convertê-las em sucesso.
- Se `db diff` gerar DDL inesperado, capturar o artefato e interromper; não aplicar automaticamente.
- Se uma migration alterar mais objetos que o declarado, não promover.
- Se os types perderem tabela/campo crítico, não commitar a regeneração.
- Se qualquer teste exigir segredo ausente, reportar `INCONCLUSIVO`, não `PASS`.
- Se houver evidência de alteração out-of-band, preservar logs antes de corrigir.
- Nenhum arquivo, branch, draft, migration ou objeto de banco será apagado sem validação e autorização correspondentes.

## 5. Checklist final 10/10

- [ ] Git local íntegro e sem trabalho válido invisível.
- [ ] GitHub contém todo trabalho aprovado e apenas PRs efetivas abertas.
- [ ] `main` local e remoto sincronizadas.
- [ ] Ledger remoto e diretório de migrations reconciliados nos dois sentidos.
- [ ] Schema live corresponde às migrations ou possui exceções documentadas.
- [ ] Edge Functions, Auth e Storage correspondem ao código/configuração versionados.
- [ ] CI não possui falso verde, skip silencioso ou credencial ausente mascarada.
- [ ] Correções de banco foram forward-only e individualmente autorizadas.
- [ ] Produção foi validada por smoke tests e contratos críticos.
- [ ] Relatório final contém evidência suficiente para reprodução independente.
