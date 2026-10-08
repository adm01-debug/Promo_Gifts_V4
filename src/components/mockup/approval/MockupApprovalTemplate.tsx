/**
 * MockupApprovalTemplate — HTML template for the approval document.
 * One product per page. Rendered as a web page, exportable to PDF.
 */

import { forwardRef, type CSSProperties } from 'react';
import type { MockupApprovalData } from '@/types/mockup-approval';
import { LogoWithTransparentBg } from '@/components/pdf/proposal/LogoWithTransparentBg';
import { maskCnpj } from '@/utils/masks';

/**
 * Tokens do documento timbrado.
 *
 * Decisão Q19: o papel impresso preserva a identidade da marca (verde
 * institucional) e o app segue o Blue Premium — por isso este documento NÃO
 * usa os tokens de UI. Toda cor literal do timbrado vive AQUI.
 */
export const DOC_TOKENS = {
  /** Verde institucional: títulos de seção, faixas e filete do cabeçalho */
  green: '#00c853',
  /** Fallback quando o produto não traz colorHex */
  greenFallback: '#2e7d32',
  black: '#000000',
  white: '#ffffff',
  /** Texto */
  inkStrong: '#111',
  inkHeading: '#1a1a1a',
  inkBody: '#333',
  inkLabel: '#222',
  inkMuted: '#666',
  inkSoft: '#777',
  inkCaption: '#999',
  /** Superfícies e bordas */
  surface: '#fafafa',
  surfaceAlt: '#f8f9fa',
  surfaceChip: '#f5f5f5',
  border: '#e8e8e8',
  borderSoft: '#f0f0f0',
  borderChip: '#e0e0e0',
  borderSwatch: '#ddd',
  divider: '#eee',
  /** Sombra do quadro do mockup */
  shadowFrame: 'rgba(0,0,0,0.08)',
} as const;

/** Rótulo de seção do timbrado (o mesmo bloco de estilo aparece 4× no documento). */
function sectionLabelStyle(fontSize: string, marginBottom: string): CSSProperties {
  return {
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 700,
    fontSize,
    color: DOC_TOKENS.green,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom,
  };
}

/** Célula de cabeçalho da tabela de cores Pantone (colunas idênticas). */
const PANTONE_TH_STYLE: CSSProperties = {
  textAlign: 'left',
  padding: '4px 8px',
  backgroundColor: DOC_TOKENS.black,
  color: DOC_TOKENS.white,
  fontSize: '9px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

export const MockupApprovalTemplate = forwardRef<HTMLDivElement, { data: MockupApprovalData }>(
  ({ data }, ref) => {
    const printDate = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div
        ref={ref}
        style={{
          width: '794px',
          minHeight: '1123px',
          backgroundColor: DOC_TOKENS.white,
          fontFamily: "'Roboto', 'Segoe UI', Helvetica, Arial, sans-serif",
          color: DOC_TOKENS.inkBody,
          position: 'relative',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ═══ HEADER ═══ */}
        <ApprovalHeader documentNumber={data.documentNumber} date={data.date} />

        {/* ═══ CONTENT ═══ */}
        <div style={{ padding: '0 50px', flex: 1 }}>
          {/* Client bar */}
          <ClientSection client={data.client} />

          {/* Main layout: Big mockup LEFT + All info RIGHT */}
          <div style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
            {/* Left: Large mockup image */}
            <div style={{ flex: '0 0 483px' }}>
              <div
                style={{
                  width: '483px',
                  height: '630px',
                  border: `1px solid ${DOC_TOKENS.border}`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: DOC_TOKENS.surface,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 2px 12px ${DOC_TOKENS.shadowFrame}`,
                }}
              >
                <img
                  src={data.mockupImageUrl}
                  alt="Mockup"
                  crossOrigin="anonymous"
                  style={{ maxWidth: '160%', maxHeight: '160%', objectFit: 'contain' }}
                  loading="lazy"
                />
              </div>
              <div
                style={{
                  marginTop: '4px',
                  textAlign: 'center',
                  fontSize: '10px',
                  color: DOC_TOKENS.inkSoft,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 600,
                }}
              >
                {data.layoutMode === 'ai' ? 'Gerado com IA' : 'Composição Estática'}
              </div>
            </div>

            {/* Right: Product info + Personalization stacked */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Product info — compact, name + SKU + color only */}
              <div
                style={{
                  border: `1px solid ${DOC_TOKENS.border}`,
                  borderRadius: '6px',
                  padding: '14px',
                  backgroundColor: DOC_TOKENS.surface,
                }}
              >
                <div style={sectionLabelStyle('11px', '8px')}>Produto</div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '13px',
                    color: DOC_TOKENS.inkStrong,
                    marginBottom: '6px',
                  }}
                >
                  {data.product.name}
                </div>
                {data.product.sku && (
                  <span
                    style={{
                      display: 'inline-block',
                      background: (() => {
                        const hex = data.product.colorHex || DOC_TOKENS.greenFallback;
                        const c = hex.replace('#', '');
                        const lum =
                          (0.299 * parseInt(c.substring(0, 2), 16) +
                            0.587 * parseInt(c.substring(2, 4), 16) +
                            0.114 * parseInt(c.substring(4, 6), 16)) /
                          255;
                        return lum > 0.85 ? DOC_TOKENS.inkBody : hex;
                      })(),
                      color: (() => {
                        const hex = data.product.colorHex || DOC_TOKENS.greenFallback;
                        const c = hex.replace('#', '');
                        const lum =
                          (0.299 * parseInt(c.substring(0, 2), 16) +
                            0.587 * parseInt(c.substring(2, 4), 16) +
                            0.114 * parseInt(c.substring(4, 6), 16)) /
                          255;
                        return lum > 0.85 ? DOC_TOKENS.white : getContrastColor(hex);
                      })(),
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: 700,
                      fontFamily: "'Roboto Mono', monospace",
                    }}
                  >
                    {data.product.sku}
                  </span>
                )}
                <div
                  style={{
                    display: 'flex',
                    gap: '16px',
                    marginTop: '8px',
                    fontSize: '11px',
                    color: DOC_TOKENS.inkMuted,
                  }}
                >
                  {data.product.color && (
                    <span>
                      Cor:{' '}
                      <strong style={{ color: DOC_TOKENS.inkBody }}>{data.product.color}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Personalization */}
              <div
                style={{
                  border: `1px solid ${DOC_TOKENS.border}`,
                  borderRadius: '6px',
                  padding: '14px',
                  backgroundColor: DOC_TOKENS.surface,
                }}
              >
                <div style={sectionLabelStyle('11px', '8px')}>Personalização</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <InfoCell label="Técnica" value={data.personalization.techniqueName} />
                  <InfoCell label="Local" value={data.personalization.locationName} />
                  <InfoCell
                    label="Dimensões"
                    value={`${data.personalization.widthCm} × ${data.personalization.heightCm} cm`}
                  />
                  <InfoCell
                    label="Área"
                    value={
                      data.personalization.areaCm2
                        ? `${data.personalization.areaCm2.toFixed(1)} cm²`
                        : `${(data.personalization.widthCm * data.personalization.heightCm).toFixed(1)} cm²`
                    }
                  />
                  {data.personalization.colorsCount !== undefined && (
                    <InfoCell
                      label="Cores"
                      value={`${data.personalization.colorsCount} cor${data.personalization.colorsCount > 1 ? 'es' : ''}`}
                    />
                  )}
                </div>
              </div>
              {/* Pantone colors */}
              {data.pantoneColors.length > 0 && <PantoneSection colors={data.pantoneColors} />}
            </div>
          </div>

          {/* Product Specs — horizontal strip with icons */}
          <ProductSpecsStrip product={data.product} />

          {/* Notes */}
          {data.notes && (
            <div
              style={{
                marginTop: '14px',
                fontSize: '11px',
                color: DOC_TOKENS.inkMuted,
                lineHeight: '1.5',
                borderTop: `1px solid ${DOC_TOKENS.divider}`,
                paddingTop: '8px',
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '10px',
                  color: DOC_TOKENS.inkBody,
                  marginBottom: '3px',
                  textTransform: 'uppercase',
                }}
              >
                Observações
              </div>
              <div>{data.notes}</div>
            </div>
          )}
        </div>

        {/* ═══ FOOTER with seller signature ═══ */}
        <ApprovalFooter printDate={printDate} seller={data.seller} />
      </div>
    );
  },
);

MockupApprovalTemplate.displayName = 'MockupApprovalTemplate';

/* ─── Header ─── */
function ApprovalHeader({ documentNumber, date }: { documentNumber: string; date: string }) {
  const H = 128;
  const W = 794;
  const barH = 7;
  const darkStart = 380;
  const greenStart = 350;
  const darkEnd = 430;
  const greenEnd = 400;

  return (
    <div style={{ position: 'relative', width: `${W}px`, height: `${H}px`, flexShrink: 0 }}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <rect x="0" y="0" width={W} height={H} fill={DOC_TOKENS.white} />
        <polygon
          points={`${darkStart},0 ${W},0 ${W},${H} ${darkEnd},${H}`}
          fill={DOC_TOKENS.black}
        />
        <polygon
          points={`${greenStart},0 ${darkStart},0 ${darkEnd},${H} ${greenEnd},${H}`}
          fill={DOC_TOKENS.green}
        />
        <rect x="0" y={H - barH} width={W} height={barH} fill={DOC_TOKENS.green} />
      </svg>
      <div
        style={{
          position: 'absolute',
          zIndex: 10,
          top: '0',
          left: '50px',
          bottom: `${barH}px`,
          width: '234px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '10px 14px',
        }}
      >
        <LogoWithTransparentBg
          src="/images/promo-brindes-logo-v2.png"
          alt="Promo Brindes"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          zIndex: 10,
          textAlign: 'right',
          color: DOC_TOKENS.white,
          top: '0',
          bottom: '0',
          right: '32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        <p
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 900,
            fontSize: '20px',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            margin: '0 0 6px 0',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          Aprovação de Layout
        </p>
        <p
          style={{
            fontSize: '13px',
            opacity: 0.95,
            fontWeight: 400,
            lineHeight: '1.7',
            margin: 0,
            fontVariantNumeric: 'tabular-nums',
            fontFamily: "'Montserrat', sans-serif",
            whiteSpace: 'nowrap',
            letterSpacing: '0px',
          }}
        >
          Ref.&nbsp;{documentNumber}
        </p>
        <p
          style={{
            fontSize: '13px',
            opacity: 0.85,
            margin: '0 0 6px 0',
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 400,
          }}
        >
          {date}
        </p>
        <p
          style={{
            fontSize: '12px',
            opacity: 0.7,
            margin: 0,
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 400,
            whiteSpace: 'nowrap',
          }}
        >
          (11) 4637-5517 &nbsp;|&nbsp; www.promobrindes.com.br
        </p>
      </div>
    </div>
  );
}

/* ─── Client Section ─── */
function ClientSection({ client }: { client: MockupApprovalData['client'] }) {
  return (
    <div
      style={{
        backgroundColor: DOC_TOKENS.surfaceAlt,
        padding: '10px 18px',
        marginTop: '12px',
        marginBottom: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderRadius: '6px',
      }}
    >
      <div>
        <p
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 700,
            fontSize: '13px',
            color: DOC_TOKENS.green,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: '0 0 4px 0',
          }}
        >
          Empresa
        </p>
        <p style={{ fontWeight: 700, fontSize: '15px', color: DOC_TOKENS.inkHeading, margin: 0 }}>
          {client.name}
        </p>
        {client.cnpj && (
          <p
            style={{
              fontSize: '11px',
              color: DOC_TOKENS.inkMuted,
              margin: '3px 0 0 0',
              fontWeight: 700,
            }}
          >
            CNPJ: {maskCnpj(client.cnpj)}
          </p>
        )}
        {client.phone && (
          <p style={{ fontSize: '11px', color: DOC_TOKENS.inkMuted, margin: '2px 0 0 0' }}>
            ☎ {client.phone}
          </p>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <p
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 700,
            fontSize: '13px',
            color: DOC_TOKENS.green,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: '0 0 4px 0',
            textAlign: 'right',
          }}
        >
          Solicitante
        </p>
        <p style={{ fontWeight: 700, fontSize: '15px', color: DOC_TOKENS.inkHeading, margin: 0 }}>
          {client.contactName || '—'}
        </p>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: '4px 6px',
        backgroundColor: DOC_TOKENS.white,
        borderRadius: '4px',
        border: `1px solid ${DOC_TOKENS.borderSoft}`,
      }}
    >
      <div
        style={{
          fontSize: '9px',
          color: DOC_TOKENS.inkCaption,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: DOC_TOKENS.inkLabel,
          marginTop: '2px',
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ─── Pantone Section — compact single-row style ─── */
function PantoneSection({ colors }: { colors: MockupApprovalData['pantoneColors'] }) {
  return (
    <div style={{ marginTop: '16px' }}>
      <div style={sectionLabelStyle('10px', '6px')}>Cores Pantone</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr>
            <th style={PANTONE_TH_STYLE}>Swatch</th>
            <th style={PANTONE_TH_STYLE}>Código Pantone</th>
            <th style={PANTONE_TH_STYLE}>Hex</th>
          </tr>
        </thead>
        <tbody>
          {colors.map((color, idx) => (
            <tr key={idx} style={{ borderBottom: `1px solid ${DOC_TOKENS.borderSoft}` }}>
              <td style={{ padding: '3px 8px' }}>
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '3px',
                    backgroundColor: color.hex,
                    border: `1px solid ${DOC_TOKENS.borderSwatch}`,
                  }}
                />
              </td>
              <td style={{ padding: '3px 8px', fontWeight: 600, fontSize: '11px' }}>
                {color.name}
              </td>
              <td
                style={{
                  padding: '3px 8px',
                  fontFamily: "'Roboto Mono', monospace",
                  fontSize: '10px',
                  color: DOC_TOKENS.inkMuted,
                }}
              >
                {color.hex.toUpperCase()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Footer with compact seller signature ─── */
function ApprovalFooter({
  printDate,
  seller,
}: {
  printDate: string;
  seller: MockupApprovalData['seller'];
}) {
  return (
    <div style={{ width: '794px', flexShrink: 0, marginTop: 'auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          padding: '4px 36px',
          fontSize: '11px',
          color: DOC_TOKENS.black,
          fontFamily: "'Montserrat', sans-serif",
          gap: '40px',
        }}
      >
        <span />
        {seller.email && <span style={{ textAlign: 'left' }}>{seller.email}</span>}
        {seller.name && (
          <span>
            Documento gerado eletronicamente por {seller.name} em {printDate}
          </span>
        )}
      </div>
      <div style={{ width: '794px', height: '40px', backgroundColor: DOC_TOKENS.green }} />
    </div>
  );
}

/* ─── Product Specs Strip — horizontal with SVG icons ─── */
function ProductSpecsStrip({ product }: { product: MockupApprovalData['product'] }) {
  const specs: { icon: string; label: string; value: string }[] = [];
  if (product.material) specs.push({ icon: '◆', label: 'Material', value: product.material });
  if (product.diameterCm)
    specs.push({ icon: '⊙', label: 'Diâmetro', value: `${product.diameterCm} cm` });
  if (product.heightCm) specs.push({ icon: '↕', label: 'Altura', value: `${product.heightCm} cm` });
  if (product.widthCm) specs.push({ icon: '↔', label: 'Largura', value: `${product.widthCm} cm` });
  if (product.depthCm) specs.push({ icon: '⇔', label: 'Profund.', value: `${product.depthCm} cm` });
  if (product.capacityMl)
    specs.push({
      icon: '◉',
      label: 'Capacidade',
      value:
        product.capacityMl >= 1000
          ? `${(product.capacityMl / 1000).toFixed(1)} L`
          : `${product.capacityMl} ml`,
    });
  if (product.weightG)
    specs.push({
      icon: '⚖',
      label: 'Peso',
      value:
        product.weightG >= 1000
          ? `${(product.weightG / 1000).toFixed(1)} kg`
          : `${product.weightG} g`,
    });
  if (specs.length === 0) return null;

  return (
    <div style={{ marginTop: '16px', padding: '12px 0' }}>
      <div style={sectionLabelStyle('10px', '10px')}>Especificações do Produto</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px' }}>
        {specs.map((s, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: DOC_TOKENS.surfaceChip,
              border: `1px solid ${DOC_TOKENS.borderChip}`,
              borderRadius: '6px',
              padding: '6px 10px',
              minWidth: '90px',
            }}
          >
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '5px',
                backgroundColor: DOC_TOKENS.inkHeading,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                color: DOC_TOKENS.green,
                flexShrink: 0,
              }}
            >
              {s.icon}
            </div>
            <div>
              <div
                style={{
                  fontSize: '8px',
                  color: DOC_TOKENS.inkCaption,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 600,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: DOC_TOKENS.inkLabel,
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Util ─── */
function getContrastColor(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? DOC_TOKENS.inkHeading : DOC_TOKENS.white;
}
