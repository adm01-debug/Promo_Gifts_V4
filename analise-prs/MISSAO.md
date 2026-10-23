# MISSÃO DAS PRs — adm01-debug/Promo_Gifts_V4
# Salvo em: 2026-10-23
# ESTE ARQUIVO PREVALECE sobre qualquer resumo de contexto.
# Reler ANTES de cada escrita no GitHub.

## Objetivo
Haja como dev sênior com autonomia total de decisão no repositório https://github.com/adm01-debug/Promo_Gifts_V4. Analise exaustivamente, uma por uma, TODAS as PRs abertas, respondendo com evidência: (1) ainda é válida? (2) traz regressão? (3) já está implementada no main? (4) a regra de negócio está correta? (5) está completa? Depois, LEVE CADA PR AO DESFECHO: mergeie as prontas; complete ou corrija as inacabadas e mergeie; feche as obsoletas. Ao final, nenhuma PR fica parada sem motivo registrado.

## AUTONOMIA
- Você decide sozinho tudo o que antes seria "decisão humana": conflitos, ambiguidade de regra de negócio, qual PR de um cluster sobrevive, o que resgatar, o que fechar.
- Ambiguidade de regra de negócio: decida pela hierarquia de fontes: comportamento do main em produção > migrations/constraints/policies > testes > tipos/enums > UI > docs > descrição da PR. Se as fontes empatarem de verdade, fique com a opção conservadora (não mudar o comportamento vigente), registre a decisão no dossiê e siga.
- Nunca pare para perguntar. Só envolva o usuário nos BLOQUEIOS listados abaixo, acumulados no relatório final. O resto da fila continua andando.

## ESCRITA PERMITIDA NO GITHUB (só via MCP "GITHUB - MCP - FOREVER")
a) Merge de PR aprovada, pelo método padrão do repo.
b) PR SUCESSORA para completar ou corrigir PR inacabada:
   - crie a branch claude/fix-pr<N>-<slug>-<AAMMDD-HHMM> a partir do main atual;
   - traga os commits da PR original (cherry-pick ou merge do head) e aplique só o que falta, com diff mínimo;
   - abra uma PR nova com o título "Completa #N: <o que muda>". No corpo: link da original, o que faltava, o que você corrigiu, o que foi verificado de verdade (comando + resultado).
   - a sucessora passa pelos mesmos critérios de merge de qualquer PR.
c) Comentar e fechar a PR original quando ela foi substituída por sucessora JÁ mergeada, é duplicada, já está implementada no main ou é obsoleta. O comentário cita a evidência: SHA, PR ou arquivo:linha.
d) Apagar SOMENTE branches que você criou, depois do merge.

## PROIBIDO
- Escrever na branch de outra PR: push, rebase, "update branch", commit de sugestão. Branch alheia é somente leitura, sempre.
- Push direto no main; force-push (exceto --force-with-lease na sua própria branch); editar título/descrição de PR alheia; labels; deletar branch alheia; mudar configurações, branch protection ou segredos; burlar checks obrigatórios; tocar em .github/workflows.
- SINGU é READ-ONLY e fora do escopo. PR que escreve nele não é mergeada nem completada: é BLOQUEIO.
- Experimentos só em git worktree local.

## EVIDÊNCIA
Toda afirmação traz arquivo:linha, SHA, número de PR ou saída de comando. Sem evidência = NÃO VERIFICADO, e item NÃO VERIFICADO nunca é mergeado.

## MÉTODO
0) Preparação e retomada
   - Se analise-prs/progresso.json existir: retome dele, pulando PRs concluídas cujo head SHA não mudou. PR com head diferente do registrado é reanalisada.
   - Fixe o SHA do main. Busque refs/pull/*.
   - Gere a linha de base do main em analise-prs/baseline/: typecheck, testes que falham listados POR NOME, lint, build. O CI do main está vermelho; regressão = diferença contra essa linha de base.
   - Monte analise-prs/regras-de-negocio.md a partir de docs, testes, enums, migrations, policies e UI, com fonte em cada regra.
   - Salve progresso.json após cada PR e após cada escrita no GitHub.
1) Inventário de todas as PRs: autor/bot, draft, base, descrição, comentários, commits, arquivos, mergeable, checks, head SHA.
2) Clusters: duplicadas, cadeias (PR sobre PR), bots. Defina a sobrevivente de cada cluster.
3) Por PR:
   - intenção;
   - leitura de 100% do diff;
   - merge de teste local e leitura do diff REAL resultante;
   - VALIDADE;
   - JÁ IMPLEMENTADA: git cherry, patch-id, busca de símbolos/rotas/tabelas/textos, implementação equivalente, commits posteriores, cluster;
   - REGRESSÃO: código recente revertido ou apagado, chamadores, defaults/permissões, contratos com backend, segredos, erros novos vs. linha de base, testes removidos/skip/enfraquecidos, dependências;
   - REGRA DE NEGÓCIO: coincide, estende ou contradiz a vigente? Cheque bordas, permissões, tenant e concorrência;
   - COMPLETUDE: o que falta para cumprir a intenção (TODO, tela sem estado de erro, chamada sem backend, migration sem uso, teste ausente);
   - custo.
   VEREDITO (um por PR):
   - MERGEAR
   - COMPLETAR → sucessora com o que falta
   - CORRIGIR → sucessora consertando regressão, conflito ou regra errada
   - RESGATAR PARCIAL → sucessora só com a parte boa
   - FECHAR → comentário com evidência
   - BLOQUEADA → apenas pelos motivos da lista de BLOQUEIOS
4) Plano de execução, ordenado para minimizar conflitos (cadeias de base para topo; clusters primeiro pela sobrevivente).

## CRITÉRIO DE MERGE (todos obrigatórios, para PR original ou sucessora)
Válida; não implementada; sem conflito; zero erro novo vs. linha de base; zero código recente revertido; regra de negócio válida; completa; confiança alta.
Merge no main = produção (app, edge functions, migrations). Portanto:
- Migration: só se for aditiva e não destrutiva (sem DROP, RENAME, ALTER TYPE, DELETE/UPDATE em massa) e idempotente, testada aplicando TODA a cadeia de migrations do repo num Postgres temporário.
- Edge function: só com testes passando e sem afrouxar autenticação.
- RLS/permissões: só se testes no Postgres temporário provarem que nenhum acesso foi ampliado.

## BLOQUEIOS (únicos motivos para não levar uma PR ao desfecho)
Migration destrutiva; ampliação de acesso/RLS; mudança em segredos, workflows, infra ou configuração do repo; escrita no SINGU; regra de negócio que contradiz a vigente E altera preço, fiscal (CFOP/NF-e/ICMS) ou dinheiro do cliente; exclusão de dado em produção.
Para cada bloqueio: o que a PR faz, o risco, sua recomendação e o que você faria se aprovado.

## EXECUÇÃO (só depois de analisar TODAS)
Uma PR por vez, na ordem do plano. Antes de cada escrita:
- confirme que a PR continua aberta e que o head SHA é o analisado (mudou = reanalisar);
- refaça o merge de teste contra o main atual.
Depois de cada merge:
- espere o CI do main e compare com a linha de base;
- confirme que o deploy do front subiu;
- se havia migration ou edge function, confirme em produção pelo MCP Supabase (só leitura): aplicada/publicada e logs sem erro novo.
Só então feche as originais substituídas.
Qualquer falha nova = PARE todas as escritas no GitHub, registre SHA + PR no relatório e encerre com o estado atual.

## ENTREGAR em analise-prs/
baseline/, regras-de-negocio.md, progresso.json, prs.json, prs.csv, dossies/PR-<N>.md, RELATORIO_PRS.md

## META CUMPRIDA só quando mostrar no chat:
- total de PRs abertas no início = total analisado;
- contagem por veredito;
- cada PR mergeada com SHA, CI e produção sem falha nova;
- sucessoras abertas e mergeadas; originais fechadas com link do comentário;
- PRs ainda abertas = somente as BLOQUEADAS, cada uma com o motivo;
- confirmação de que nenhuma escrita fora da lista permitida ocorreu (liste todas as escritas feitas);
- worktrees removidos;
- caminhos dos arquivos.
Limite: 80 turnos. Se atingir, salve progresso.json, gere RELATORIO_PRS.md parcial e diga exatamente em que PR e etapa parou.
