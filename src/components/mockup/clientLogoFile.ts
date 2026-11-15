/**
 * clientLogoFile — baixa a logo do cliente no CRM como File para o upload do mockup.
 *
 * Fica fora do MockupConfigPanel (no teto do gate de tamanho de arquivo) e isola a
 * validação do Content-Type: sem um tipo de imagem reconhecido a logo é RECUSADA, em vez
 * de virar 'image/png' e furar a validação de file.type do upload manual.
 */
export async function fetchClientLogoFile(logoUrl: string): Promise<File> {
  const response = await fetch(logoUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error(`tipo "${blob.type || 'ausente'}"`);
  return new File([blob], 'logo-cliente', { type: blob.type });
}
