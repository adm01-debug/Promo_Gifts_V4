<!-- ARQUIVO HISTORICO. Nao e regra ativa. -->

> **Nota preservada de branch.** Este arquivo existia APENAS em
> `origin/salvo/261115-preservacao` e em nenhum caminho da `main`. Foi copiado aqui,
> sem edicao de conteudo, para que aquela branch possa ser fechada sem perder o registro.
> **Nao e instrucao vigente**: o `AGENTS.md` vence qualquer coisa escrita aqui.

---

# Preservação de trabalho que existia só no container — 2026-11-15

Este commit não altera nada. O tree dele contém só este arquivo. Ele existe para
que os commits abaixo fiquem ALCANÇÁVEIS no remoto: eles estavam apenas no
container efêmero da sessão e desapareceriam quando ele fosse reciclado.

Cada commit abaixo é um PAI deste commit. Para recuperar qualquer um:
    git fetch origin salvo/261115-preservacao
    git log --oneline <sha>        # ler
    git branch <nome-novo> <sha>   # ressuscitar

## 1) Branches que existiam só no container (28)

A maioria é resíduo de squash-merge (o conteúdo está na `main`, só o commit
original difere), mas isso NÃO foi verificado uma por uma.

| commits fora da main | arquivos | branch original | topo |
|---|---|---|---|
| 1 | 1 | `claude/chore-recibo-e66-crm-db-bridge-261115-1200` | `62851c9693` |
| 2 | 24 | `claude/chore-relatorio-resgates-261115-1500` | `5312e64d4f` |
| 2 | 5 | `claude/feat-resgate-aviso-falha-painel-mockup-261115-1510` | `20220f6427` |
| 1 | 8 | `claude/feat-resgate-aviso-falha-tecnicas-261115-1750` | `691ae8cc1f` |
| 1 | 2 | `claude/feat-resgate-conferencia-total-pedido-261115-1430` | `b2b4058426` |
| 4 | 4 | `claude/feat-resgate-controles-editor-logo-261115-1515` | `de501bfcb6` |
| 1 | 4 | `claude/feat-resgate-estados-conclusao-mockup-261115-1640` | `a1618a98c0` |
| 14 | 32 | `claude/feat-trem-db-resgates-261115-1300` | `daf276f8d7` |
| 8 | 15 | `claude/feat-trem-mockup-resgates-261115-1300` | `cf5c15626a` |
| 1 | 2 | `claude/fix-a11y-etapas-mockup-celular-261115-1600` | `eea289c81b` |
| 1 | 1 | `claude/fix-asia-ingestion-bom-261115-1200` | `19099e7df3` |
| 5 | 21 | `claude/fix-assistente-gates-261115-1330` | `805a5e7e2d` |
| 2 | 5 | `claude/fix-assistente-rpc-ausente-261115-1910` | `c1fc13722b` |
| 5 | 2 | `claude/fix-e14-docs-only-261115-1300` | `da41c3f728` |
| 1 | 3 | `claude/fix-grafico-mercado-rpc-ausente-261115-1710` | `ad0e9eba9b` |
| 1 | 1 | `claude/fix-recibo-automerge-261115-1310` | `4db7787a6e` |
| 1 | 5 | `claude/fix-resgate-mockup-geometria-limites-261115-1425` | `8d7ef5803e` |
| 1 | 3 | `claude/fix-resgate-pecas-apagadas-261115-1800` | `7806456f0d` |
| 1 | 3 | `claude/fix-resgate-rollbacks-faltantes-261115-1435` | `5c6ee3c005` |
| 3 | 11 | `claude/fix-testes-mockup-mock-simulation-261115-1620` | `6b33d0510d` |
| 4 | 16 | `claude/fix-trem-front-3652-3651-3646-261115-1200` | `1bd360f5d5` |
| 20 | 34 | `claude/fix-trem-resgates-261115-1240` | `72f698eac8` |
| 1 | 25 | `claude/infra-e2e-fora-dos-prs-261115-1210` | `0137dedead` |
| 1 | 1 | `claude/infra-snapshots-all-authed-261115-1215` | `b008f42e04` |
| 4 | 28 | `claude/infra-trem-edge-bom-recibo-e66-workflows-261115-1230` | `96ebcf3f80` |
| 33 | 42 | `claude/infra-wf-limpeza-supersede-3525-261115-1220` | `c1f0514e3a` |
| 1 | 5 | `claude/test-resgate-a11y-mockup-magicup-261115-1450` | `60d78781d0` |
| 0 | 0 | `claude_05/admiring-newton-5o3ztw` | `3893d57fe0` |

## 2) Commits órfãos com conteúdo único (33)

Commits que não estavam em branch nenhuma. Dos 57 órfãos encontrados por
`git fsck`, 24 foram descartados por terem conteúdo já presente na `main` ou
numa das branches acima (comparação por `git patch-id --stable`). Os 33 abaixo
tinham conteúdo que não foi encontrado em lugar nenhum.

| sha | autor | data | assunto |
|---|---|---|---|
| `eea670c5e1` | Claude | 2026-11-15 | WIP on claude/feat-resgate-estados-conclusao-mockup-261115-1640: a03adc354 feat(orders): resgata conferência do total do pedido contra a soma dos itens (#3667) |
| `80372194ec` | github-actions[bot] | 2026-11-15 | chore(main): release 1.2.0 |
| `824831105e` | Claude | 2026-11-15 | fixup! fix: resgate parcial da #3548 (templates de orçamento, galeria Magic Up, PDF null-safe) e e-mail de relatório só marcado como enviado se o Resend aceitar |
| `c25099f33e` | Claude | 2026-11-15 | fix(mockup): logo no tamanho real e tetos de corpo/lote na edge generate-mockup |
| `138519939e` | Claude | 2026-11-15 | feat(mockup-assistant): registra o contrato Zod da edge no mapa CONTRACTS |
| `2fba618f93` | Claude | 2026-11-15 | WIP on (no branch): 2ab97ecd9e fix(e2e): nao repetir login por teste quando o auth.setup degradou |
| `0966e2df9d` | Claude | 2026-11-15 | On (no branch): wip-bugs |
| `c97bbaff9f` | Claude | 2026-11-15 | docs(coordenacao): veredito lido das 106 branches apagadas sem dossie |
| `63c2f20eba` | Claude | 2026-11-15 | On (no branch): chk |
| `a0d08a562e` | Claude | 2026-11-15 | WIP on (no branch): cccb48500e test(mockup): registra os testes do card no test:ci-core e envolve a captura em act |
| `4de4427d5f` | Claude | 2026-11-15 | WIP on claude/feat-resgate-aviso-falha-painel-mockup-261115-1510: 335bdb602 fix(ci): recibo de migration entra sozinho e para de travar o CI (#3662) |
| `521f2b030f` | Claude | 2026-11-15 | WIP on claude/fix-assistente-gates-261115-1330: 00b1f75d3 feat(assistente): fase 1 do Encaixe do Cliente — candidatos por ramo, cor e giro |
| `8a2c4391f0` | github-actions[bot] | 2026-11-15 | chore(main): release 1.2.0 |
| `8a47637eec` | Claude | 2026-11-15 | fix(mockup): resultado preservado por projeto, salvo/ficha do resultado exibido e alerta separado |
| `35ac8b9d53` | Claude | 2026-11-15 | fix(mockup): ficha com as medidas da área da imagem salva e rastreio por resultado |
| `b2b4437b15` | Claude | 2026-11-15 | WIP on claude/feat-resgate-aviso-falha-painel-mockup-261115-1510: 335bdb602 fix(ci): recibo de migration entra sozinho e para de travar o CI (#3662) |
| `e1ca4b6cd2` | Claude | 2026-11-15 | WIP on (no branch): cccb48500e test(mockup): registra os testes do card no test:ci-core e envolve a captura em act |
| `5ff603b5a6` | Fabrica Hermes | 2026-10-09 | feat(mockup): servico de mockups do cliente (consulta por client_id do CRM) |
| `20f94bfabd` | github-actions[bot] | 2026-11-15 | chore(main): release 1.2.0 |
| `e83f245117` | github-actions[bot] | 2026-11-15 | chore(main): release 1.2.0 |
| `727c1cdd39` | Claude | 2026-11-15 | WIP on claude/fix-a11y-etapas-mockup-celular-261115-1600: 7307f5334 feat(mockup): cabeçalho de trabalho do gerador, Meus mockups do cliente e captura de layout extraída (#3664) |
| `ebc214d5ef` | github-actions[bot] | 2026-11-15 | chore(main): release 1.2.0 |
| `59c80cbca8` | Claude | 2026-11-01 | fix(bi): adiciona badge 'Dados simulados' nos slides 2-5 do PPTX quando isMock (FT-004) |
| `660235c4eb` | Claude | 2026-11-15 | fix(mockup): ficha com as medidas da área da imagem salva e rastreio por resultado |
| `1b195db528` | Claude | 2026-11-15 | WIP on claude/feat-resgate-aviso-falha-tecnicas-261115-1750: f1044db3b feat(mockup): aviso de "não carregou, tentar de novo" no catálogo do painel de mockup (#3670) |
| `4f1b4590ab` | Claude | 2026-11-15 | WIP on claude/feat-resgate-estados-conclusao-mockup-261115-1640: a03adc354 feat(orders): resgata conferência do total do pedido contra a soma dos itens (#3667) |
| `a33cb57109` | Claude | 2026-11-15 | wip: integra cabecalho e captura de layout (trabalho do agente cancelado) |
| `248a5dfaf3` | Claude | 2026-11-15 | WIP on claude/feat-trem-mockup-resgates-261115-1300: 07683f1a4 fix(mockup): evita regressao do ratchet de as-assertions no comentario do Voltar |
| `dcb1952be7` | Claude | 2026-11-15 | wip: integra cabecalho e captura de layout (trabalho do agente cancelado) |
| `b0eb956d8c` | Claude | 2026-11-15 | fix(mockup): teto de corpo e de lote na edge generate-mockup antes de processar |
| `4115370c25` | Claude | 2026-11-15 | fix(db): colunas perdidas por CREATE TABLE IF NOT EXISTS no-op no replay |
| `106d3f9372` | Claude | 2026-11-15 | WIP on claude/feat-resgate-aviso-falha-painel-mockup-261115-1510: 335bdb602 fix(ci): recibo de migration entra sozinho e para de travar o CI (#3662) |
| `fcfbbff5ee` | Claude | 2026-11-15 | WIP on (no branch): cccb48500e test(mockup): registra os testes do card no test:ci-core e envolve a captura em act |

## Atenção: nem tudo aqui é trabalho valioso

Entre os órfãos há stashes de agentes (`WIP on ...`, `On (no branch)`),
tentativas superadas do release-please (`chore(main): release 1.2.0`) e versões
pré-rebase de commits que depois entraram na `main`. Preservar foi barato;
triar por valor exige leitura. Candidatos que parecem trabalho de OUTROS agentes:

- `5ff603b5a6` Fabrica Hermes, 2026-10-09 — serviço de mockups do cliente por `client_id` do CRM
- `59c80cbca8` 2026-11-01 — selo "Dados simulados" nos slides 2-5 do PPTX (FT-004)
- `a33cb57109` e `dcb1952be7` — marcados "trabalho do agente cancelado"
- `0966e2df9d` (`wip-bugs`) e `63c2f20eba` (`chk`) — stashes com nome sugestivo
