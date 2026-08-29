/**
 * Critério único para habilitar testes que chamam um projeto Supabase real.
 *
 * `tests/setup.ts` injeta localhost + `.test.signature` para o cliente poder
 * ser importado em jsdom. Esses valores nunca autorizam requests live.
 */
export function isRealSupabaseUrl(value: string | undefined): boolean {
  const url = value?.trim() ?? '';
  return (
    !!url &&
    !url.includes('localhost') &&
    !url.includes('127.0.0.1') &&
    !url.includes('//x.supabase.co')
  );
}

export function isRealSupabaseKey(value: string | undefined): boolean {
  const key = value?.trim() ?? '';
  if (!key || key.includes('.test.signature')) return false;

  // Publishable/secret keys atuais começam com `sb_`; as chaves JWT legadas
  // são significativamente maiores. Ambos são aceitos, stubs curtos não.
  return (key.startsWith('sb_') && key.length >= 20) || key.length >= 100;
}

export function hasLiveSupabaseCredentials(
  url: string | undefined,
  key: string | undefined,
): boolean {
  return isRealSupabaseUrl(url) && isRealSupabaseKey(key);
}
