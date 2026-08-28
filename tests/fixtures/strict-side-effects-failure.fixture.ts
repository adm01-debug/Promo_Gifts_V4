import { it } from 'vitest';

// Esta fixture nunca entra na descoberta normal (`*.fixture.ts`). Ela é rodada
// por um subprocesso controlado para provar que o guard realmente reprova
// efeitos colaterais não mockados.
it('emite efeitos colaterais que o guard estrito precisa bloquear', async () => {
  console.error('[fixture] unexpected console error');
  await expect(fetch('https://example.invalid/should-not-be-called')).rejects.toThrow(
    'unexpected network request blocked',
  );
});
