/**
 * Os estados do card "Encaixe do Cliente" que NÃO são uma lista de brindes:
 * carregando, erro, vazio por falta de sinal e vazio por nenhum candidato
 * acima do corte.
 *
 * Os dois vazios são deliberadamente DIFERENTES, e essa diferença é o produto:
 *   • "falta de sinal" = o CRM não disse o bastante sobre o cliente (sem ramo
 *     mapeado, sem cor de marca). O vendedor precisa saber disso e ir ao CRM —
 *     mostrar uma lista qualquer aqui seria inventar encaixe.
 *   • "nenhum candidato" = os sinais existiam, o banco procurou e nada passou
 *     do corte de 50 pontos. Aqui quem fala é `buildHonestNote`.
 */

import { AlertTriangle, Info, RefreshCw, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { SinaisDaMarcaDoCliente } from '@/hooks/assistant/useClientBrandSignals';

/** Quantas linhas-fantasma o esqueleto mostra enquanto o banco responde. */
const LINHAS_DO_ESQUELETO = 3;

export function SalesAssistantSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: LINHAS_DO_ESQUELETO }, (_, indice) => (
        <div key={indice} className="flex items-start gap-3 p-2">
          <Skeleton className="h-12 w-12 flex-shrink-0 rounded" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-14 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

interface SalesAssistantErrorProps {
  readonly mensagem: string;
  /**
   * Repete a busca. Vem do `refetch` do react-query, não de um botão morto.
   *
   * É OPCIONAL de propósito: `useClientBrandSignals` não expõe `refetch`, e um
   * botão que não refaz nada seria pior que nenhum botão. Sem a função, o card
   * diz ao vendedor o que fazer (recarregar a página) em vez de fingir ação.
   */
  readonly onTentarNovamente?: () => void;
}

export function SalesAssistantError({ mensagem, onTentarNovamente }: SalesAssistantErrorProps) {
  return (
    <div role="alert" className="space-y-3 py-4 text-center">
      <AlertTriangle className="mx-auto h-5 w-5 text-destructive" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">
        Não consegui montar o encaixe deste cliente.
      </p>
      <p className="text-xs text-muted-foreground">{mensagem}</p>
      {onTentarNovamente ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-[44px]"
          onClick={onTentarNovamente}
        >
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Tentar de novo
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">Recarregue a página para tentar de novo.</p>
      )}
    </div>
  );
}

/**
 * Por que não houve sinal, em português e item a item.
 *
 * Diz o que falta NO CADASTRO, com o texto que veio do CRM quando ele existe —
 * assim o vendedor sabe exatamente o que corrigir, em vez de ler um "sem
 * dados" genérico.
 */
export function motivosDaFaltaDeSinal(sinais: SinaisDaMarcaDoCliente): string[] {
  const motivos: string[] = [];

  if (sinais.ramoTextoCrm === null || sinais.ramoTextoCrm.trim() === '') {
    motivos.push('O cliente está sem ramo de atividade no CRM.');
  } else if (sinais.ramoPaiId === null) {
    motivos.push(
      `O ramo "${sinais.ramoTextoCrm.trim()}" do CRM não corresponde a nenhum ramo do catálogo.`,
    );
  }

  if (sinais.hexesDaLogo.length === 0) {
    motivos.push('O cliente está sem cor de marca no CRM.');
  } else if (sinais.colorGroupIds.length === 0) {
    motivos.push('A cor da marca não bateu com nenhum grupo de cor do catálogo.');
  }

  return motivos;
}

interface SalesAssistantSemSinalProps {
  readonly sinais: SinaisDaMarcaDoCliente;
}

export function SalesAssistantSemSinal({ sinais }: SalesAssistantSemSinalProps) {
  const motivos = motivosDaFaltaDeSinal(sinais);

  return (
    <div className="space-y-3 py-4 text-center">
      <Info className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">
        Ainda não dá para escolher brindes para este cliente.
      </p>
      <ul className="space-y-1 text-xs text-muted-foreground">
        {motivos.map((motivo) => (
          <li key={motivo}>{motivo}</li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Prefiro não mostrar lista nenhuma a mostrar uma lista sem encaixe.
      </p>
    </div>
  );
}

interface SalesAssistantSemCandidatosProps {
  /** Saída de `buildHonestNote`; `null` quando não há nada a confessar. */
  readonly notaHonesta: string | null;
  /** Corte de nota usado na busca, para o vendedor entender o vazio. */
  readonly scoreMinimo: number;
}

export function SalesAssistantSemCandidatos({
  notaHonesta,
  scoreMinimo,
}: SalesAssistantSemCandidatosProps) {
  return (
    <div className="space-y-3 py-4 text-center">
      <Search className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">
        {notaHonesta ?? 'Nenhum brinde passou do corte de encaixe para este cliente.'}
      </p>
      <p className="text-xs text-muted-foreground">
        Procurei no catálogo inteiro e nenhum brinde chegou a {scoreMinimo} pontos de encaixe.
      </p>
    </div>
  );
}

/**
 * A RPC de candidatos existe no repositório mas ainda não foi aplicada neste
 * banco. Estado próprio porque "não ligado ainda" não é "falhou": erro manda o
 * vendedor procurar suporte, isto só diz que o recurso está a caminho.
 */
export function SalesAssistantEmPreparacao() {
  return (
    <div className="space-y-3 py-4 text-center">
      <Search className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">Encaixe do Cliente em preparação</p>
      <p className="text-xs text-muted-foreground">
        A busca de brindes por encaixe ainda não foi liberada neste ambiente. As sugestões aparecem
        aqui assim que ela entrar.
      </p>
    </div>
  );
}
