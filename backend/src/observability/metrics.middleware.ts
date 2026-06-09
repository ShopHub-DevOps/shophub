import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {
  httpRequestTotal,
  httpRequestDuration,
  httpResponseSize,
  http404Total,
  uniqueVisitors,
} from './metrics';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  private visitors = new Set<string>();

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const clientIp = req.ip || '';
    this.visitors.add(clientIp);
    uniqueVisitors.set(this.visitors.size);

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = (req.route as { path?: string })?.path || req.path;
      const statusCodeStr = String(res.statusCode);

      httpRequestTotal.labels(req.method, route, statusCodeStr).inc();
      httpRequestDuration
        .labels(req.method, route, statusCodeStr)
        .observe(duration);

      const contentLength = parseInt(res.get('content-length') || '0', 10);
      httpResponseSize
        .labels(req.method, route, statusCodeStr)
        .observe(contentLength);

      if (res.statusCode === 404) {
        http404Total.labels(route).inc();
      }
    });

    next();
  }
}
