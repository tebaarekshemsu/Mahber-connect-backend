import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

function stripHtml(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/<[^>]*>/g, '');
  }
  if (Array.isArray(value)) {
    return value.map(stripHtml);
  }
  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      sanitized[k] = stripHtml(v);
    }
    return sanitized;
  }
  return value;
}

@Injectable()
export class SanitizeMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (req.body && typeof req.body === 'object') {
      req.body = stripHtml(req.body);
    }
    next();
  }
}
