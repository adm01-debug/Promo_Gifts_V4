/**
 * Primitivas de desenho do PDF de kit: paleta, aplicação de cor no jsPDF e as
 * duas resoluções que o gerador faz antes de escrever qualquer coisa.
 *
 * Mora em arquivo próprio porque `kitPdfGenerator.ts` encostou no limite de 500
 * linhas do `check-file-size-baseline`; sem esta separação, a próxima linha
 * acrescentada ao gerador quebraria o gate.
 */
import type jsPDF from 'jspdf';
import {
  getKitItemLineId,
  type KitItem,
  type KitItemPersonalization,
  type KitPersonalization,
} from '@/lib/kit-builder';

// Tuplas RGB mutáveis (não `as const`): é exatamente o tipo `Color` que
// jspdf-autotable 5.x aceita em `fillColor`/`textColor`, o que dispensa
// qualquer asserção `as` na passagem para a tabela.
export type RgbColor = [number, number, number];

export const PRIMARY: RgbColor = [30, 64, 175]; // blue-700
export const GRAY_800: RgbColor = [31, 41, 55];
export const GRAY_500: RgbColor = [107, 114, 128];
export const WHITE: RgbColor = [255, 255, 255];
export const PERSONALIZATION: RgbColor = [99, 102, 241]; // indigo-500

export function setFill(doc: jsPDF, color: RgbColor): void {
  doc.setFillColor(color[0], color[1], color[2]);
}

export function setText(doc: jsPDF, color: RgbColor): void {
  doc.setTextColor(color[0], color[1], color[2]);
}

export function hexToRgb(hex?: string): RgbColor | null {
  if (!hex) return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * A personalização é chaveada por `KitItem.lineId`; o id do produto só serve de
 * fallback para snapshots gravados antes de o lineId existir. Ler `item.id`
 * primeiro imprimiria a personalização errada sempre que o mesmo produto
 * estivesse no kit duas vezes, em variantes diferentes.
 */
export function resolveItemPersonalization(
  personalization: KitPersonalization,
  item: KitItem,
): KitItemPersonalization | undefined {
  return personalization.items[getKitItemLineId(item)] ?? personalization.items[item.id];
}
