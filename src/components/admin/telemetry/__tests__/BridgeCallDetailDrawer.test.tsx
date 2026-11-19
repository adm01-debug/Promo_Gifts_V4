/**
 * Cobertura do drawer de detalhe de chamada de bridge: o eco do request-id
 * devolvido pelo servidor precisa ser confrontado com o id enviado pelo
 * client — divergência vira badge "divergente".
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BridgeCallDetailDrawer } from '../BridgeCallDetailDrawer';
import type { BridgeCallSample } from '@/lib/telemetry/bridgeCallMetrics';

const BASE_SAMPLE: BridgeCallSample = {
  id: 1,
  ts: Date.parse('2026-11-18T12:00:00Z'),
  bridge: 'crm-db-bridge',
  op: 'select',
  target: 'clientes',
  durationMs: 420,
  reqBytes: 120,
  respBytes: 4096,
  ok: true,
  status: 200,
  requestId: '11111111-1111-4111-8111-111111111111',
  serverRequestId: '11111111-1111-4111-8111-111111111111',
};

describe('BridgeCallDetailDrawer', () => {
  it('exibe o badge "divergente" quando o eco do servidor difere do request-id do client', () => {
    render(
      <BridgeCallDetailDrawer
        sample={{ ...BASE_SAMPLE, serverRequestId: '22222222-2222-4222-8222-222222222222' }}
        open
        onOpenChange={() => {}}
      />,
    );

    expect(screen.getByText('divergente')).toBeInTheDocument();
    expect(screen.queryByText(/match/i)).not.toBeInTheDocument();
  });

  it('exibe "match" quando client e servidor reportam o mesmo request-id', () => {
    render(<BridgeCallDetailDrawer sample={BASE_SAMPLE} open onOpenChange={() => {}} />);

    expect(screen.getByText(/match/i)).toBeInTheDocument();
    expect(screen.queryByText('divergente')).not.toBeInTheDocument();
  });
});
