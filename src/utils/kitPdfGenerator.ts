/**
 * Kit PDF Generator
 * Generates a professional PDF for an assembled kit with composition,
 * price breakdown, and personalization details.
 */

import jsPDF from 'jspdf';
import autoTable, { type CellHookData } from 'jspdf-autotable';
import { toast } from 'sonner';
import {
  calculateTotalKitPrice,
  formatCurrency,
  formatDimensions,
  formatVolume,
  generatePriceBreakdown,
  getKitItemLineId,
  type KitIdentity,
  type KitItem,
  type KitItemPersonalization,
  type KitPersonalization,
  type KitState,
} from '@/lib/kit-builder';
import {
  formatKitLinePrice,
  hasKnownKitPrices,
  KIT_UNKNOWN_PRICE_MESSAGE,
} from '@/lib/kit-builder/pricing-availability';

interface KitPdfOptions {
  kitState: KitState;
  kitQuantity: number;
  /** Defaults to `kitState.name` when omitted. */
  kitName?: string;
  orgName?: string;
}

// Brand colors. Mutable RGB tuples (não `as const`): é exatamente o tipo
// `Color` que jspdf-autotable 5.x aceita em `fillColor`/`textColor`, o que
// dispensa qualquer asserção `as` na passagem para a tabela.
type RgbColor = [number, number, number];

const PRIMARY: RgbColor = [30, 64, 175]; // blue-700
const GRAY_800: RgbColor = [31, 41, 55];
const GRAY_500: RgbColor = [107, 114, 128];
const WHITE: RgbColor = [255, 255, 255];
const PERSONALIZATION: RgbColor = [99, 102, 241]; // indigo-500

function setFill(doc: jsPDF, color: RgbColor): void {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setText(doc: jsPDF, color: RgbColor): void {
  doc.setTextColor(color[0], color[1], color[2]);
}

function hexToRgb(hex?: string): RgbColor | null {
  if (!hex) return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Personalization is keyed by `KitItem.lineId`; the product id is only a
 * fallback for snapshots persisted before line ids existed. Reading `item.id`
 * first would print the wrong personalization whenever the same product is in
 * the kit twice with different variants.
 */
function resolveItemPersonalization(
  personalization: KitPersonalization,
  item: KitItem,
): KitItemPersonalization | undefined {
  return personalization.items[getKitItemLineId(item)] ?? personalization.items[item.id];
}

function drawHeader(doc: jsPDF, kitName: string, orgName?: string, identity?: KitIdentity): number {
  const accent = hexToRgb(identity?.color) ?? PRIMARY;

  // Identity color stripe (top 2mm) — reflects kit identity color
  setFill(doc, accent);
  doc.rect(0, 0, 210, 2, 'F');

  // Main header bar
  setFill(doc, PRIMARY);
  doc.rect(0, 2, 210, 34, 'F');

  const textStartX = 14;

  setText(doc, WHITE);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(kitName, textStartX, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Gerado em ${dateStr}${orgName ? ` • ${orgName}` : ''}`, textStartX, 28);

  // Identity tag pill (right side, above the badge)
  if (identity?.tag) {
    setFill(doc, accent);
    const tagText = identity.tag.toUpperCase();
    doc.setFontSize(7);
    const tagW = doc.getTextWidth(tagText) + 6;
    doc.roundedRect(196 - tagW, 10, tagW, 6, 1.5, 1.5, 'F');
    setText(doc, WHITE);
    doc.text(tagText, 196 - tagW / 2, 14.2, { align: 'center' });
  }

  // Right-aligned badge
  setText(doc, WHITE);
  doc.setFontSize(8);
  doc.text('FICHA DO KIT', 196, 22, { align: 'right' });

  return 44;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  setText(doc, GRAY_800);
  doc.text(title, 14, y);

  // Underline
  doc.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.setLineWidth(0.6);
  doc.line(14, y + 2, 60, y + 2);

  return y + 10;
}

function drawKpiCards(doc: jsPDF, kitState: KitState, kitQuantity: number, y: number): number {
  const { items, personalization, totalWeight, box } = kitState;
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const personalizedCount =
    (personalization.box.enabled ? 1 : 0) +
    items.filter((item) => resolveItemPersonalization(personalization, item)?.enabled).length;

  const cards = [
    { label: 'Embalagem', value: '1', sub: box?.name ?? '-' },
    { label: 'Itens', value: String(totalItems), sub: `${items.length} diferentes` },
    {
      label: 'Personalizações',
      value: String(personalizedCount),
      sub: personalizedCount === 1 ? 'item' : 'itens',
    },
    {
      label: 'Peso estimado',
      value: totalWeight >= 1000 ? `${(totalWeight / 1000).toFixed(1)}kg` : `${totalWeight}g`,
      sub: `x${kitQuantity} kits`,
    },
  ];

  const cardW = 43;
  const gap = 4;
  const startX = 14;

  cards.forEach((card, i) => {
    const x = startX + i * (cardW + gap);
    // Card bg
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(x, y, cardW, 26, 2, 2, 'F');

    // Value
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    setText(doc, GRAY_800);
    doc.text(card.value, x + cardW / 2, y + 12, { align: 'center' });

    // Label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    setText(doc, GRAY_500);
    doc.text(card.label, x + cardW / 2, y + 18, { align: 'center' });

    // Sub
    doc.setFontSize(6);
    doc.text(card.sub, x + cardW / 2, y + 23, { align: 'center' });
  });

  return y + 34;
}

function drawCompositionTable(doc: jsPDF, kitState: KitState, y: number): number {
  const { box, items, personalization } = kitState;

  const rows: string[][] = [];

  // `formatKitLinePrice` prints the unavailable-price marker instead of a fake
  // R$ 0,00 whenever `priceKnown === false`.
  if (box) {
    rows.push([
      `Caixa: ${box.name}`,
      box.sku || '-',
      box.material ?? '-',
      '1',
      formatKitLinePrice(box),
      personalization.box.enabled ? (personalization.box.techniqueName ?? 'Sim') : '-',
    ]);
  }

  items.forEach((item) => {
    const itemP = resolveItemPersonalization(personalization, item);
    rows.push([
      `${item.name}${item.isOptional ? ' (Opcional)' : ''}`,
      item.sku || '-',
      item.material ?? '-',
      String(item.quantity),
      formatKitLinePrice(item),
      itemP?.enabled ? (itemP.techniqueName ?? 'Sim') : '-',
    ]);
  });

  autoTable(doc, {
    startY: y,
    head: [['Item', 'SKU', 'Material', 'Qtd', 'Preço Unit.', 'Personalização']],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: PRIMARY,
      textColor: WHITE,
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: GRAY_800,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 55 },
      3: { halign: 'center', cellWidth: 14 },
      4: { halign: 'right', cellWidth: 24 },
      5: { cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
  });

  return doc.lastAutoTable.finalY + 8;
}

function drawPersonalizationDetails(doc: jsPDF, kitState: KitState, y: number): number {
  const { personalization, box, items } = kitState;

  const entries: {
    colors: string;
    dimensions: string;
    name: string;
    price: string;
    technique: string;
  }[] = [];

  if (personalization.box.enabled && box) {
    entries.push({
      name: `Caixa: ${box.name}`,
      technique: personalization.box.techniqueName ?? '-',
      colors: personalization.box.colors ? `${personalization.box.colors} cor(es)` : '-',
      dimensions:
        personalization.box.width && personalization.box.height
          ? `${personalization.box.width}x${personalization.box.height}cm`
          : '-',
      price: personalization.box.estimatedPrice
        ? formatCurrency(personalization.box.estimatedPrice)
        : '-',
    });
  }

  items.forEach((item) => {
    const p = resolveItemPersonalization(personalization, item);
    if (p?.enabled) {
      entries.push({
        name: item.name,
        technique: p.techniqueName ?? '-',
        colors: p.colors ? `${p.colors} cor(es)` : '-',
        dimensions: p.width && p.height ? `${p.width}x${p.height}cm` : '-',
        price: p.estimatedPrice ? `${formatCurrency(p.estimatedPrice)}/un` : '-',
      });
    }
  });

  if (entries.length === 0) return y;

  y = drawSectionTitle(doc, 'Detalhes de Personalização', y);

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Técnica', 'Cores', 'Área', 'Custo/un']],
    body: entries.map((e) => [e.name, e.technique, e.colors, e.dimensions, e.price]),
    theme: 'grid',
    headStyles: {
      fillColor: PERSONALIZATION,
      textColor: WHITE,
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: GRAY_800,
    },
    margin: { left: 14, right: 14 },
  });

  return doc.lastAutoTable.finalY + 8;
}

function drawPriceBreakdown(
  doc: jsPDF,
  kitState: KitState,
  kitQuantity: number,
  y: number,
): number {
  const { box, items, personalization } = kitState;

  y = drawSectionTitle(doc, 'Detalhamento de Preços', y);

  // A single unavailable catalog price makes every total below it fiction —
  // the screen hides the numbers (KitPricingCard) and so does the PDF.
  if (!hasKnownKitPrices(kitState)) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    setText(doc, GRAY_500);
    const lines: string[] = doc.splitTextToSize(KIT_UNKNOWN_PRICE_MESSAGE, 182);
    doc.text(lines, 14, y);
    return y + lines.length * 4 + 6;
  }

  const breakdown = generatePriceBreakdown(box, items, personalization, kitQuantity);
  const pricing = calculateTotalKitPrice(box, items, personalization, kitQuantity);

  const rows = breakdown.map((item) => {
    // `label` already carries the "↳ Gravação:" marker on personalization rows.
    const label = item.isPersonalization ? `   ${item.label}` : item.label;
    const setupFloor = item.setupFloor ?? 0;
    return [
      setupFloor > 0
        ? `${label}\n   Piso/setup considerado: ${formatCurrency(setupFloor)} (não aditivo)`
        : label,
      item.quantity ? String(item.quantity) : '-',
      formatCurrency(item.unitPrice),
      formatCurrency(item.totalPrice),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Descrição', 'Qtd', 'Preço Unit.', 'Subtotal']],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: GRAY_800,
      textColor: WHITE,
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: GRAY_800,
    },
    columnStyles: {
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 26 },
      3: { halign: 'right', cellWidth: 26 },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data: CellHookData) => {
      // Destaca as linhas indentadas de personalização
      if (data.section === 'body' && String(data.cell.raw).startsWith('   ↳')) {
        data.cell.styles.textColor = PERSONALIZATION;
        data.cell.styles.fontStyle = 'italic';
      }
    },
  });

  const finalTableY = doc.lastAutoTable.finalY;

  // Total box
  const totalBoxY = finalTableY + 4;
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(110, totalBoxY, 86, 24, 2, 2, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setText(doc, GRAY_500);
  doc.text(`Subtotal (${kitQuantity} kit${kitQuantity > 1 ? 's' : ''})`, 114, totalBoxY + 7);
  doc.text(formatCurrency(pricing.subtotal), 192, totalBoxY + 7, { align: 'right' });

  if (pricing.personalizationPrice > 0) {
    doc.text('Personalização', 114, totalBoxY + 13);
    setText(doc, PERSONALIZATION);
    doc.text(formatCurrency(pricing.personalizationPrice), 192, totalBoxY + 13, { align: 'right' });
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  setText(doc, PRIMARY);
  doc.text('TOTAL', 114, totalBoxY + 21);
  doc.text(formatCurrency(pricing.total), 192, totalBoxY + 21, { align: 'right' });

  // Unit price
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  setText(doc, GRAY_500);
  doc.text(`(${formatCurrency(pricing.unitPrice)}/kit)`, 140, totalBoxY + 21);

  return totalBoxY + 30;
}

function drawFooter(doc: jsPDF) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    setText(doc, GRAY_500);
    doc.text(
      'Valores estimados, sujeitos a confirmação. Preços de personalização podem variar conforme arte final.',
      14,
      pageHeight - 10,
    );
    doc.text(`Página ${page} de ${pageCount}`, 196, pageHeight - 10, { align: 'right' });
  }
}

export function generateKitPDF(options: KitPdfOptions): Blob {
  const { kitState, kitQuantity } = options;
  const kitName = options.kitName?.trim() || kitState.name.trim() || 'Kit Personalizado';
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = drawHeader(doc, kitName, options.orgName, kitState.identity);

  // KPI cards
  y = drawKpiCards(doc, kitState, kitQuantity, y);

  // Composition section
  y = drawSectionTitle(doc, 'Composição do Kit', y);
  y = drawCompositionTable(doc, kitState, y);

  // Box info line
  if (kitState.box) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    setText(doc, GRAY_500);
    doc.text(
      `Caixa: ${formatDimensions(kitState.box.internalWidth, kitState.box.internalHeight, kitState.box.internalDepth)} | Volume: ${formatVolume(kitState.box.internalVolume)} | Ocupação: ${kitState.volumeUsagePercent.toFixed(0)}%`,
      14,
      y,
    );
    y += 8;
  }

  // Personalization details
  y = drawPersonalizationDetails(doc, kitState, y);

  // Check if we need a new page for price breakdown
  if (y > 210) {
    doc.addPage();
    y = 20;
  }

  drawPriceBreakdown(doc, kitState, kitQuantity, y);
  drawFooter(doc);

  return doc.output('blob');
}

export function downloadKitPDF(options: KitPdfOptions): void {
  const blob = generateKitPDF(options);
  const fileName = options.kitName?.trim() || options.kitState.name.trim() || 'personalizado';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kit-${fileName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Entry point used by the Kit Builder button: downloads the file and reports
 * the outcome. The failure toast never carries the raw error text.
 */
export function exportKitPdf(options: KitPdfOptions): void {
  try {
    downloadKitPDF(options);
    toast.success('PDF do kit gerado');
  } catch {
    toast.error('Não foi possível gerar o PDF do kit', {
      description: 'Tente novamente ou revise os dados do kit.',
    });
  }
}
