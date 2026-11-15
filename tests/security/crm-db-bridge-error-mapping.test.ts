import { describe, expect, it } from 'vitest';
import {
  isTransientCrmFailure,
  mapPostgrestErrorStatus,
} from '../../supabase/functions/crm-db-bridge/query-policy';

describe('crm-db-bridge — mapeamento de erros', () => {
  it.each([
    [{ code: '42703', message: 'column does not exist' }, 400, 400],
    [{ code: 'PGRST116', message: '0 rows' }, 406, 404],
    [{ code: 'PGRST003', message: 'pool timeout' }, 504, 504],
    [{ code: 'PGRST108', message: 'embedded resource missing from select' }, 400, 400],
    [{ code: 'PGRST201', message: 'ambiguous embedding' }, 300, 400],
    [{ code: 'PGRST203', message: 'ambiguous function' }, 300, 400],
    [{ code: 'PGRST205', message: 'table missing from cache' }, 404, 404],
    [{ code: '23503', message: 'foreign key violation' }, 409, 409],
    [{ code: '23505', message: 'unique violation' }, 409, 409],
    [{ code: '42501', message: 'permission denied' }, 403, 403],
    [{ code: '57014', message: 'canceling statement due to statement timeout' }, 500, 504],
    [{ code: '08006', message: 'connection failure' }, 500, 503],
  ])('mapeia %o/%i para HTTP %i', (error, postgrestStatus, expected) => {
    expect(mapPostgrestErrorStatus(error, postgrestStatus)).toBe(expected);
  });

  it('alimenta o breaker somente com falhas transitórias 5xx', () => {
    expect(isTransientCrmFailure(400, { code: '42703' })).toBe(false);
    expect(isTransientCrmFailure(404, { code: 'PGRST116' })).toBe(false);
    expect(isTransientCrmFailure(409, { code: '23505' })).toBe(false);
    expect(isTransientCrmFailure(503, { code: '08006' })).toBe(true);
    expect(isTransientCrmFailure(504, { code: '57014' })).toBe(true);
    expect(isTransientCrmFailure(500)).toBe(true);
  });
});
