# Observability & System Health

This document describes the observability features of the Ceremony Field Catalog, including health monitoring, metrics collection, structured logging, and the System Health UI.

## Overview

The observability system provides:
- **Health Checks**: Real-time system and MongoDB connection status
- **Metrics**: Custom application metrics via Micrometer/Prometheus
- **Structured Logging**: JSON-formatted logs for production environments
- **System Health UI**: Visual dashboard for monitoring system status

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OBSERVABILITY STACK                                │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         Spring Boot Actuator                           │ │
│  │  /actuator/health    /actuator/metrics    /actuator/prometheus         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                     │                                        │
│  ┌──────────────────────────────────┼──────────────────────────────────────┐│
│  │              Micrometer Registry (Prometheus)                           ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       ││
│  │  │  Counters   │ │   Timers    │ │   Gauges    │ │ Histograms  │       ││
│  │  │ observations│ │search_latency│ │active_ctx  │ │ percentiles │       ││
│  │  │ searches    │ │merge_latency │ │total_fields│ │ p50/p95/p99 │       ││
│  │  │ contexts    │ │mongo_latency │ │            │ │             │       ││
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                     │                                        │
│  ┌──────────────────────────────────┼──────────────────────────────────────┐│
│  │                      ObservabilityService                               ││
│  │  • Records custom metrics         • Provides metric accessors           ││
│  │  • Instruments key operations     • Updates gauges                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                     │                                        │
│  ┌──────────────────────────────────┼──────────────────────────────────────┐│
│  │                       SystemController                                  ││
│  │  GET /api/system/health          GET /api/system/stats                  ││
│  │  (UI-friendly aggregated endpoints)                                     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Actuator Endpoints

The following actuator endpoints are exposed:

| Endpoint | Description |
|----------|-------------|
| `GET /actuator/health` | System health with MongoDB status |
| `GET /actuator/metrics` | All available metrics |
| `GET /actuator/metrics/{name}` | Specific metric details |
| `GET /actuator/prometheus` | Prometheus-format metrics export |

### Health Endpoint Response

```json
{
  "status": "UP",
  "components": {
    "mongo": {
      "status": "UP",
      "details": {
        "maxWireVersion": 17
      }
    },
    "ping": {
      "status": "UP"
    }
  }
}
```

---

## Custom Metrics

### Counters

| Metric Name | Description | Tags |
|-------------|-------------|------|
| `catalog.observations.submitted` | Total observations submitted | type=observation |
| `catalog.observations.batches` | Total batches processed | type=batch |
| `catalog.searches.executed` | Total search queries | type=search |
| `catalog.contexts.created` | Total contexts created | type=context |

### Timers (with percentiles)

| Metric Name | Description | Percentiles |
|-------------|-------------|-------------|
| `catalog.searches.latency` | Search query execution time | p50, p95, p99 |
| `catalog.observations.merge.latency` | Observation merge time | p50, p95, p99 |
| `catalog.mongo.query.latency` | MongoDB query time | p50, p95, p99 |

### Gauges

| Metric Name | Description |
|-------------|-------------|
| `catalog.contexts.active` | Current number of active contexts |
| `catalog.fields.total` | Total catalog fields across all contexts |

---

## System API Endpoints

These endpoints provide UI-friendly aggregated data:

### GET /api/system/health

Returns system health status with memory and uptime information.

**Response:**
```json
{
  "status": "UP",
  "uptime": "2d 5h 30m",
  "uptimeMillis": 191400000,
  "mongoStatus": "UP",
  "memory": {
    "usedMb": 256,
    "maxMb": 512,
    "usagePercent": 50.0
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### GET /api/system/stats

Returns operational statistics and performance metrics.

**Response:**
```json
{
  "observationsSubmitted": 12450,
  "batchesProcessed": 245,
  "searchesExecuted": 892,
  "contextsCreated": 5,
  "activeContexts": 3,
  "totalFields": 45231,
  "searchLatency": {
    "count": 892,
    "meanMs": 45.5,
    "maxMs": 250.0,
    "p50Ms": 35.0,
    "p95Ms": 120.0,
    "p99Ms": 200.0
  },
  "mergeLatency": {
    "count": 245,
    "meanMs": 12.3,
    "maxMs": 100.0,
    "p50Ms": 8.0,
    "p95Ms": 45.0,
    "p99Ms": 80.0
  },
  "contextFieldCounts": [
    {
      "contextId": "deposits",
      "displayName": "Deposits",
      "fieldCount": 45231,
      "active": true
    }
  ]
}
```

---

## Structured Logging

Logging is configured via `logback-spring.xml` with profile-based behavior:

### Development Profile (default)
- Human-readable console output
- Debug-level logging for `com.ceremony.catalog`
- Pattern: `%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger{36} : %msg%n`

### Production Profile
- JSON-structured output via Logstash encoder
- INFO-level logging
- Includes custom fields: `application`, `environment`
- Supports MDC fields: `traceId`, `spanId`, `requestId`

**Example JSON log entry:**
```json
{
  "@timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "logger_name": "com.ceremony.catalog.api.CatalogController",
  "message": "Processing search request",
  "application": "ceremony-field-catalog",
  "environment": "prod"
}
```

### Test Profile
- Minimal console output (WARN level)
- Reduces noise during test execution

---

## System Health UI

The System Health page is accessible at `/system` and provides:

### Health Status Cards
- **System Status**: Overall application health (UP/DOWN)
- **MongoDB Status**: Database connection status
- **Memory Usage**: JVM heap utilization with percentage

### Activity Statistics
- Total observations submitted
- Number of batches processed
- Search queries executed
- Active context count
- Total field count

### Performance Metrics
- Search latency (mean, p50, p95, max)
- Merge latency (mean, p50, p95, max)

### Context Breakdown Table
- Per-context field counts
- Active/inactive status
- Display names

### Auto-Refresh
- Data refreshes automatically every 30 seconds
- Manual refresh button available

---

## Configuration

### application.yml

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
      base-path: /actuator
  endpoint:
    health:
      show-details: always
      show-components: always
    metrics:
      enabled: true
    prometheus:
      enabled: true
  health:
    mongo:
      enabled: true
  metrics:
    tags:
      application: ${spring.application.name}
    distribution:
      percentiles-histogram:
        http.server.requests: true
      percentiles:
        http.server.requests: 0.5, 0.95, 0.99
  prometheus:
    metrics:
      export:
        enabled: true
```

---

## Prometheus Integration

The `/actuator/prometheus` endpoint exports all metrics in Prometheus format:

```
# HELP catalog_observations_submitted_total Total number of field observations submitted
# TYPE catalog_observations_submitted_total counter
catalog_observations_submitted_total{type="observation"} 12450.0

# HELP catalog_searches_latency_seconds Search query execution time
# TYPE catalog_searches_latency_seconds summary
catalog_searches_latency_seconds{quantile="0.5"} 0.035
catalog_searches_latency_seconds{quantile="0.95"} 0.12
catalog_searches_latency_seconds{quantile="0.99"} 0.2
catalog_searches_latency_seconds_count 892
catalog_searches_latency_seconds_sum 40.566
```

### Grafana Dashboard

To create a Grafana dashboard, use these example queries:

```promql
# Observations per minute
rate(catalog_observations_submitted_total[5m]) * 60

# Search latency p95
histogram_quantile(0.95, rate(catalog_searches_latency_seconds_bucket[5m]))

# Active contexts
catalog_contexts_active
```

---

## Alerting Recommendations

### Suggested Alert Rules

| Alert | Condition | Severity |
|-------|-----------|----------|
| MongoDB Down | `catalog_health_mongo != 1` for 1m | Critical |
| High Memory | `catalog_memory_usage_percent > 90` for 5m | Warning |
| Slow Searches | `catalog_searches_latency_seconds{quantile="0.95"} > 1` | Warning |
| High Error Rate | `rate(http_server_requests_seconds_count{status=~"5.."}[5m]) > 0.1` | Critical |

---

## Files

| File | Purpose |
|------|---------|
| `ObservabilityService.java` | Custom metrics registration and recording |
| `SystemController.java` | UI-friendly health/stats endpoints |
| `SystemHealthDTO.java` | Health response data transfer object |
| `SystemStatsDTO.java` | Stats response data transfer object |
| `logback-spring.xml` | Profile-based logging configuration |
| `SystemHealthPage.tsx` | React UI component |
| `useSystemHealth.ts` | React Query hooks for data fetching |
| `systemApi.ts` | API client for system endpoints |
