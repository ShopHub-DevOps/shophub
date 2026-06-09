import promClient from 'prom-client';
import { Counter, Histogram, Gauge } from 'prom-client';

export const register = new promClient.Registry();

export const httpRequestTotal = new Counter({
  name: 'shophub_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'shophub_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5],
  registers: [register],
});

export const httpResponseSize = new Histogram({
  name: 'shophub_http_response_bytes',
  help: 'HTTP response size in bytes',
  labelNames: ['method', 'route', 'status'],
  buckets: [100, 500, 1000, 5000, 10000, 50000],
  registers: [register],
});

export const http404Total = new Counter({
  name: 'shophub_http_404_total',
  help: '404 errors by route',
  labelNames: ['route'],
  registers: [register],
});

export const uniqueVisitors = new Gauge({
  name: 'shophub_unique_visitors',
  help: 'Approximate unique visitors',
  registers: [register],
});
