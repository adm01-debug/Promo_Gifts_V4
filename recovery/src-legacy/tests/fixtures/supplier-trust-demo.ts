/**
 * Demo/test-only historical fixture; never a source of production trust or ratings.
 * Preserved from SocialProof.tsx before removal commit 20b6646dd (FT-002, PR #2963).
 * Historical function SHA-256: 1cf72ab9b9eec05bcfc60097d47f84a717d930681c1b66df282e1278333feb44
 */
import type { SupplierTrustData } from '@/components/common/SocialProof';

export function getMockSupplierTrust(productId: string): SupplierTrustData {
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = ((hash << 5) - hash + productId.charCodeAt(i)) | 0;
  }
  const abs = Math.abs(hash);
  return {
    isVerified: abs % 10 < 7,
    deliveryDays: abs % 5 === 0 ? null : (abs % 12) + 1,
    avgRating: abs % 7 === 0 ? null : 3.2 + (abs % 18) / 10,
  };
}
