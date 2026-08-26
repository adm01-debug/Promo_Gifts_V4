import { describe, expect, it } from 'vitest';
import {
  hasLiveSupabaseCredentials,
  isRealSupabaseKey,
  isRealSupabaseUrl,
} from './live-supabase-env';

describe('live-supabase-env', () => {
  it.each([
    undefined,
    '',
    'http://localhost:54321',
    'http://127.0.0.1:54321',
    'https://x.supabase.co',
  ])('rejeita URL de placeholder: %s', (url) => {
    expect(isRealSupabaseUrl(url)).toBe(false);
  });

  it('aceita URL Supabase remota', () => {
    expect(isRealSupabaseUrl('https://doufsxqlfjyuvxuezpln.supabase.co')).toBe(true);
  });

  it.each([
    undefined,
    '',
    'placeholder-key',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
    'sb_short',
  ])('rejeita chave de placeholder: %s', (key) => {
    expect(isRealSupabaseKey(key)).toBe(false);
  });

  it('aceita formatos atuais e legados de chave Supabase', () => {
    expect(isRealSupabaseKey(`sb_publishable_${'a'.repeat(32)}`)).toBe(true);
    expect(isRealSupabaseKey(`eyJ${'a'.repeat(120)}`)).toBe(true);
  });

  it('só habilita live quando URL e chave são reais', () => {
    expect(
      hasLiveSupabaseCredentials(
        'https://doufsxqlfjyuvxuezpln.supabase.co',
        `sb_publishable_${'a'.repeat(32)}`,
      ),
    ).toBe(true);
    expect(
      hasLiveSupabaseCredentials(
        'http://localhost:54321',
        `sb_publishable_${'a'.repeat(32)}`,
      ),
    ).toBe(false);
  });
});
