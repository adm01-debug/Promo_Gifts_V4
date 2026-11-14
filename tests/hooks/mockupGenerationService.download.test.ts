import { beforeEach, describe, it, expect, vi } from 'vitest';
const m = vi.hoisted(() => ({ download: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), functions: { invoke: vi.fn() } },
}));
vi.mock('@/lib/mockup-storage', () => ({
  uploadLogoToStorage: vi.fn(),
  downloadImageAsPdfFromUrl: m.download,
}));
import { downloadMockupAsPdf } from '@/hooks/mockup/mockupGenerationService';
beforeEach(() => {
  vi.clearAllMocks();
  m.download.mockResolvedValue(undefined);
});
describe('Mockup PDF downloads retain object metadata and historical fallback', () => {
  it.each([
    [{ sku: 'SKU-1' }, { id: 't1', name: 'Laser', code: 'LAS' }, 'mockup-SKU-1-LAS.pdf'],
    [{ sku: 'CÓD/1' }, { name: 'Silk Screen', code: null }, 'mockup-C-D-1-Silk-Screen.pdf'],
    [{}, null, 'mockup-mockup-personalizacao.pdf'],
    [null, undefined, 'mockup-mockup-personalizacao.pdf'],
  ])('builds the existing filename from real data %j', async (product, technique, filename) => {
    await downloadMockupAsPdf('https://example.test/mockup.png', product, technique);
    expect(m.download).toHaveBeenCalledWith('https://example.test/mockup.png', filename);
  });
  it('propagates fetch/download errors instead of reporting false success', async () => {
    const error = new Error('download failed');
    m.download.mockRejectedValue(error);
    await expect(downloadMockupAsPdf('https://example.test/mockup.png', null, null)).rejects.toBe(
      error,
    );
  });
});
