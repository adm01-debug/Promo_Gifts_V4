# Coleta somente leitura do trace de personalização

O coletor baixa exclusivamente o artifact 13761206861 da execução 42807840825
de adm01-debug/Promo_Gifts_V4, commit 810d2c2e542959953b3890148b28f8ad83557c79.
Ele não executa E2E, deploy, alterações de banco, comentários ou mudanças no GitHub.

O artifact precisa ter o nome personalization-e2e-artifacts, 66.441.354 bytes,
repositório e head_repository_id 1241858325, não estar expirado e ter SHA-256
355979b251c12001ad77d3103f0cc3b8f0973977e8124d6a60e41cc2bb6769b6.
Esses valores são fixos no código; não há input para selecionar outro artifact
ou desativar a identidade. Metadados e digest são verificados antes de ler o ZIP.

## Autorização e transporte

O workflow roda em PR interno ou workflow_dispatch. PR de fork não recebe essa
coleta de um artifact autenticado. Isso limita o diagnóstico opcional; não altera
nem substitui os testes E2E. Permissões explícitas: contents:read e actions:read.
GITHUB_TOKEN aparece somente no step de coleta.

São permitidos apenas GET do metadata e ZIP fixos na API do GitHub, mais um GET
do destino HTTPS de download confiável devolvido pela API. Redirect automático
está desativado. O Authorization nunca é encaminhado ao host de assets; o segundo
GET não recebe cookies ou credenciais. Redirecionamentos seguintes, userinfo,
portas diferentes de 443 e hosts desconhecidos são recusados. Proxy e CA do
ambiente permanecem em vigor. URLs assinadas nunca entram no relatório ou logs.

## Limites de leitura

- Download comprimido e tamanho declarado do ZIP externo: 80 MiB cada.
- ZIP externo: até 128 entradas; somente os quatro ZIPs autorizados em
  playwright-report/data, com nomes hash fixados em TRACE_MEMBERS. Não procura
  basename trace.zip nem descobre ZIPs arbitrários.
- Cada ZIP interno: até 32 MiB e 4.096 entradas.
- Soma declarada das quatro camadas internas: 128 MiB.
- Texto selecionado: 16 MiB por arquivo, 64 MiB somados, 2 MiB por linha.
- Até 200.000 linhas/eventos selecionados; deadline global de 90 s e socket até 20 s.
- Saída por trace: até 40 requests lentos, 100 pendentes/com erro e 100 ações
  falhas ou não concluídas, 100 classes de erro runtime, além das contagens totais.

Os bytes externos e internos não são somados duas vezes na mesma cota. O diretório
central é conferido antes de ZipFile criar seus objetos. Traversal, nomes
absolutos/backslash, nomes duplicados, links, criptografia e métodos de compressão
desconhecidos são recusados. Tamanhos declarados e efetivamente lidos são limitados.
ZIP64 padrão é reconhecido mesmo quando o EOCD32 não usa sentinelas; offsets e
contagens precisam descrever o mesmo diretório que será lido por ZipFile. O timer
global usa SIGALRM no runner Linux e interrompe inclusive leituras lentas; não é
reiniciado por download, redirect ou ZIP interno.

A leitura usa BytesIO e streams; não extrai arquivos para disco. Somente .trace e
.network são interpretados. Não se usa extractall, testzip ou o CLI trace do
Playwright, que podem extrair tudo ou imprimir conteúdo privado. O CRC é verificado
nos membros efetivamente lidos; recursos ignorados não são descomprimidos e seu
CRC não é declarado validado.

## Formato e privacidade

O formato inspecionado é o trace v10 distribuído no Playwright 1.64.1. Cada arquivo
é JSONL. .network contém resource-snapshot com snapshot HAR; .trace tem eventos
before/after, correlacionados somente dentro do mesmo prefixo e ZIP. Versões
desconhecidas, JSON inválido/truncado, chaves JSON duplicadas e limites excedidos
falham com códigos públicos fixos, sem imprimir mensagens de exceção.
Cada ZIP precisa conter ao menos um par de arquivos de contexto e rede. Um after
duplicado não pode sobrescrever uma falha; ele é recusado. After órfão preserva
somente sua classe de erro, com API desconhecida e sem identificador bruto.

Saem apenas método HTTP, host permitido ou alias, template seguro de caminho,
status, duração, classe de erro permitida, flags de interceptação e contagens.
Ordinais de contexto e startMs numérico permitem comparar request e ação no mesmo
relógio do trace. Não são horários de calendário, nem devem ser correlacionados
diretamente entre contextos diferentes.
Query, fragmentos, userinfo, headers, cookies, corpos, console, parâmetros, results,
expectedText, mensagens de erro e stacks são descartados. Caminhos de storage,
objetos privados, IDs e rotas desconhecidas recebem templates; remover só a query
não seria suficiente. Hosts externos desconhecidos também não são publicados.

Ações têm apiName de lista fechada e, quando reconhecido, somente os rótulos
product-name, product-card e product-card-name. Nunca publicam seletor ou título
livre. O JSON contém somente ordinais locais; nomes de ZIP/teste não são expostos.
Eventos pageError e error preservam somente classes de uma lista fechada e o
ordinal do contexto. Mensagem, stack e localização da exceção não são publicados.

## Como interpretar

COLLECTED significa que a evidência foi coletada, com e2eHealthVerified:false.
Não significa teste aprovado, produto carregado ou produção saudável. FAILED
registra somente uma classe pública de falha; não revela conteúdo do artifact.

Status 200 e duração positiva podem coexistir com timings.receive=-1: o corpo
pode estar incompleto no fim do trace ou o timing não estar disponível. O relatório
marca body-or-timing-unverified e não conclui espera infinita. Status -1 é ausência
de status HTTP verificado. WebSockets 101 são separados como conexões longas.
_wasFulfilled indica resposta interceptada pelo Playwright, e não resposta
comprovada do servidor. Tempos de rede não provam conclusão de queries React.

Nenhum dado bruto é enviado ao upload-artifact. O workflow publica exclusivamente
report.json e summary.md sanitizados, com retenção de 14 dias. O resultado hospedado
precisa ser revisado para atribuir a causa dos fluxos 90/91; este coletor não a
predetermina.

Para verificar o coletor localmente sem rede:

    python3 -m unittest discover -s tests/scripts -p test_personalization_artifact_diagnostics.py -v

A coleta autenticada usa somente GITHUB_TOKEN do ambiente e os dois argumentos
de destino --output e --summary. Não passar tokens como argumento.

