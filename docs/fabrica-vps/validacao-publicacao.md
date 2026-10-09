# Validação da publicação pelo host

- A publicação das branches agora sai do servidor (host), não do agente.
- O agente não tem mais a chave de escrita no repositório remoto.
- Push, merge, PR e deploy ficam com o integrador; o agente só commita na worktree.
