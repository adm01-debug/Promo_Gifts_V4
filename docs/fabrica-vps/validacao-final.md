# Validação final da fábrica

- A configuração dos agentes é imutável para eles: nenhum agente edita o próprio manifesto, persona ou permissões.
- Mudança de configuração só sai de decisão humana e é aplicada pelo host, nunca pelo worker.
- Assim a validação final de segurança não pode ser revertida por um agente durante o trabalho.
