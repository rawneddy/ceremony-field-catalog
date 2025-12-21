/**
 * System health and observability types
 */

export interface MemoryInfo {
  usedMb: number;
  maxMb: number;
  usagePercent: number;
}

export interface SystemHealth {
  status: string;
  uptime: string;
  uptimeMillis: number;
  mongoStatus: string;
  memory: MemoryInfo;
  timestamp: string;
}

export interface LatencyStats {
  count: number;
  meanMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

export interface ContextFieldCount {
  contextId: string;
  displayName: string;
  fieldCount: number;
  active: boolean;
}

export interface SystemStats {
  observationsSubmitted: number;
  batchesProcessed: number;
  searchesExecuted: number;
  contextsCreated: number;
  activeContexts: number;
  totalFields: number;
  searchLatency: LatencyStats;
  mergeLatency: LatencyStats;
  contextFieldCounts: ContextFieldCount[];
}
