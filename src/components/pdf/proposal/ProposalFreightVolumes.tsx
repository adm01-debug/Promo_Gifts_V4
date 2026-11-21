/**
 * ProposalFreightVolumes — bloco "Volumes estimados para transporte" do PDF.
 *
 * Só aparece na última página, entre os totais e as condições comerciais,
 * quando o vendedor marcou "mostrar ao cliente" (`showFreightPlanToClient`)
 * e o orçamento tem plano `ok` calculado. Usa <table> (html2canvas não
 * suporta grid) e cores inline, no mesmo padrão do restante da proposta.
 */
import type { FreightPlan } from '@/lib/freight';

const GREEN = '#00c853';

function fmtKg(grams: number): string {
  return `${(grams / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
}

function fmtM3(m3: number): string {
  return `${m3.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³`;
}

export function ProposalFreightVolumes({ plan }: { plan: FreightPlan }) {
  const codes = Object.entries(plan.totals.boxesByCode);
  const rows = plan.volumes;
  const boxTotalFor = (code: string): number =>
    rows
      .filter((v) => v.box.code === code)
      .reduce((s, v) => s + v.items.reduce((a, i) => a + i.quantity, 0), 0);
  // Sem caixas consolidadas… tem volumes por caixa: soma as quantidades das peças.
  const boxRows =
    codes.length > 0
      ? codes.map(([code, qty]) => ({ code, qty: Math.max(qty, boxTotalFor(code)) }))
      : rows.map((v) => ({ code: v.box.code, qty: v.items.reduce((a, i) => a + i.quantity, 0) }));

  return (
    <div style={{ marginTop: '14px' }}>
      <div
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 700,
          fontSize: '12px',
          color: GREEN,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '4px',
          paddingLeft: '2px',
        }}
      >
        Volumes estimados para transporte
      </div>
      <div
        style={{
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '12px 16px',
          backgroundColor: '#fafafa',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#888',
                  textTransform: 'uppercase',
                  padding: '0 8px 4px 0',
                }}
              >
                Caixa
              </th>
              <th
                style={{
                  textAlign: 'right',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#888',
                  textTransform: 'uppercase',
                  padding: '0 0 4px 8px',
                }}
              >
                Quantidade
              </th>
            </tr>
          </thead>
          <tbody>
            {boxRows.map((row) => (
              <tr key={row.code} style={{ borderBottom: '1px solid #eee' }}>
                <td
                  style={{
                    fontSize: '10px',
                    color: '#333',
                    fontWeight: 600,
                    padding: '4px 8px 4px 0',
                  }}
                >
                  Caixa {row.code}
                </td>
                <td
                  style={{
                    fontSize: '10px',
                    color: '#333',
                    fontWeight: 600,
                    textAlign: 'right',
                    padding: '4px 0 4px 8px',
                  }}
                >
                  {row.qty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div
          style={{
            fontSize: '10px',
            color: '#333',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: '2px solid #e8f5e9',
            paddingTop: '6px',
          }}
        >
          <span>Peso total:&nbsp;{fmtKg(plan.totals.grossWeightG)}</span>
          <span>Volume total:&nbsp;{fmtM3(plan.totals.volumeM3)}</span>
        </div>
        <p
          style={{
            fontSize: '8.5px',
            color: '#999',
            fontStyle: 'italic',
            margin: '6px 0 0 0',
            lineHeight: '1.4',
          }}
        >
          Estimativa baseada nas caixas padrão da empresa.
        </p>
      </div>
    </div>
  );
}
