/**
 * Guarda dos pontos de montagem de componentes que já existiam prontos na main
 * e que nenhuma tela renderizava.
 *
 * Varredura dos exports de `src/`: 808 sem nenhuma menção fora do próprio
 * arquivo. Filtrando barris e tipos, sobram dezenas de componentes completos —
 * com hook, com RPC em produção e, em vários casos, com flag de feature
 * dizendo `enabled: true` — que nunca foram montados.
 *
 * O teste é de contrato textual, e não de render, de propósito: renderizar
 * `/estoque` ou `/bi` inteiras exigiria dezenas de mocks e quebraria por
 * motivos que nada têm a ver com o ponto de montagem, que é o que se quer
 * guardar. Um `<Componente` some de um arquivo numa refatoração sem nenhum
 * teste acusar — foi exatamente assim que estes dois se perderam.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (p: string) => readFileSync(p, 'utf8');

describe('componentes prontos continuam montados', () => {
  it('a página de BI monta o botão de dossiê em PDF ao lado do resumo executivo', () => {
    const pagina = ler('src/pages/bi/BusinessIntelligencePage.tsx');
    expect(pagina).toContain("from '@/components/bi/ExportDossierButton'");
    expect(pagina).toContain('<ExportDossierButton clientId={clientId} />');
    // Os dois convivem: o resumo é 1 página, o dossiê é o relatório completo.
    expect(pagina).toContain('<ExecutiveSummaryButton');
  });

  it('/estoque monta o painel preditivo de ruptura', () => {
    const pagina = ler('src/pages/admin/StockDashboardPage.tsx');
    expect(pagina).toContain("from '@/components/inventory/risk/RupturePanelEma'");
    expect(pagina).toContain('<RupturePanelEma />');
  });

  it('a flag que promete o painel de ruptura continua ligada', () => {
    // Se alguém desligar a flag, o painel vira <OptInEmpty /> e a montagem
    // acima passa a não mostrar nada. O teste acusa a divergência entre o que
    // a flag promete e o que a tela entrega.
    const flags = ler('src/lib/feature-flags.ts');
    const trecho = flags.slice(flags.indexOf('useEmaRupture:'));
    expect(trecho.slice(0, 200)).toContain('enabled: true');
  });

  it('o invalidateQueries de ruptura e o painel moram na mesma página', () => {
    // O invalidate já existia antes da montagem: era a prova de que o painel
    // deveria estar aqui. Se um sair sem o outro, o cache fica órfão de novo.
    const pagina = ler('src/pages/admin/StockDashboardPage.tsx');
    expect(pagina).toContain("queryKey: ['rupture-alerts']");
    expect(pagina).toContain('<RupturePanelEma />');
  });
});
