/**
 * Montagem do compartilhamento do Magic Up no WhatsApp (SSOT).
 *
 * REGRA: o link `wa.me/?text=` leva apenas a descrição + o nome do criativo.
 * A imagem NUNCA entra no texto do link:
 *  - data URL (base64) estoura o tamanho da URL e quebra o deep link;
 *  - URL http do bucket é efêmera e vira link inválido para o cliente.
 * Sem imagem gerada, o compartilhamento é recusado com o motivo (o chamador avisa).
 */

export interface MagicUpShareSource {
  selectedProduct?: { name?: string | null } | null;
  selectedColor?: { name?: string | null } | null;
  selectedTechnique?: { name?: string | null } | null;
  selectedScene?: { title?: string | null } | null;
  selectedClient?: { name?: string | null } | null;
  copyPack?: { whatsapp?: string | null } | null;
}

export type MagicUpShareResult =
  | { ok: true; url: string; text: string }
  | { ok: false; reason: string };

export const MAGIC_UP_SHARE_NO_IMAGE_REASON =
  'Gere uma imagem antes de compartilhar no WhatsApp';

/** Nome do criativo: produto + cenário — o que identifica a peça compartilhada. */
function buildMagicUpCreativeName(source: MagicUpShareSource): string {
  const product = source.selectedProduct?.name?.trim();
  const scene = source.selectedScene?.title?.trim();
  if (product && scene) return `${product} · ${scene}`;
  return product || scene || 'Criativo Magic Up';
}

/** Texto do compartilhamento: descrição (copy do canal ou fallback) + nome do criativo. */
function buildMagicUpShareText(source: MagicUpShareSource): string {
  const name = buildMagicUpCreativeName(source);
  const greeting = source.selectedClient?.name ? `Olá ${source.selectedClient.name}! ` : '';
  const color = source.selectedColor?.name ? ` (${source.selectedColor.name})` : '';
  const technique = source.selectedTechnique?.name || 'personalização';
  const fallback = `${greeting}✨ Confira a imagem publicitária${color} com ${technique}:`;
  const description = source.copyPack?.whatsapp?.trim() || fallback;
  return `${description}\n${name}`;
}

/** Prepara o link de compartilhamento; recusa (com motivo) quando não há imagem gerada. */
export function prepareMagicUpShare(
  source: MagicUpShareSource,
  imageUrl: string | null,
): MagicUpShareResult {
  if (!imageUrl?.trim()) return { ok: false, reason: MAGIC_UP_SHARE_NO_IMAGE_REASON };
  const text = buildMagicUpShareText(source);
  return { ok: true, text, url: `https://wa.me/?text=${encodeURIComponent(text)}` };
}
