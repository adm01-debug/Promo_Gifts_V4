import type { BridgeName } from '@/lib/telemetry/bridgeCallMetrics';

export function bridgeBadge(bridge: BridgeName): string {
  return bridge === 'external-db-bridge'
    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
    : 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40';
}

export function latencyClass(ms: number): string {
  if (ms < 200) return 'text-green-400';
  if (ms < 500) return 'text-yellow-400';
  return 'text-red-400';
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), BYTE_UNITS.length - 1);
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${BYTE_UNITS[i]}`;
}
