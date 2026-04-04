import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HttpsRedirectMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const env = process.env.NODE_ENV;
    if (env !== 'production') {
      return next();
    }

    const proto = req.headers['x-forwarded-proto'] as string | undefined;
    if (proto && proto !== 'https') {
      const httpsUrl = `https://${req.headers.host}${req.url}`;
      return res.redirect(301, httpsUrl);
    }

    next();
  }
}
