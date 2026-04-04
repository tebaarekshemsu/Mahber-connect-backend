import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const SLOW_REQUEST_THRESHOLD_MS = 500;

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        if (duration > SLOW_REQUEST_THRESHOLD_MS) {
          this.logger.warn(
            `Slow request: ${method} ${url} took ${duration}ms`,
          );
        } else {
          this.logger.log(`${method} ${url} - ${duration}ms`);
        }
      }),
    );
  }
}
