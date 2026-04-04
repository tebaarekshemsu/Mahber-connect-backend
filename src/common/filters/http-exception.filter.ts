import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { getTranslation } from '../i18n/translations';

export interface ErrorResponse {
  statusCode: number;
  message: string;
  errors?: string[];
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const lang = this.extractLanguage(request);
    const path = request.url;
    const timestamp = new Date().toISOString();

    let statusCode: number;
    let message: string;
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = this.translateMessage(exceptionResponse, statusCode, lang);
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        // class-validator produces { message: string[] | string, error: string }
        if (Array.isArray(resp['message'])) {
          errors = resp['message'] as string[];
          message = this.translateMessage(
            (resp['error'] as string) ?? 'Validation failed',
            statusCode,
            lang,
          );
        } else {
          message = this.translateMessage(
            (resp['message'] as string) ?? exception.message,
            statusCode,
            lang,
          );
        }
      } else {
        message = this.translateMessage(exception.message, statusCode, lang);
      }

      this.logger.warn(
        `HTTP ${statusCode} ${request.method} ${path}: ${message}`,
        { errors },
      );
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = getTranslation('internalServerError', lang);

      const errorMessage =
        exception instanceof Error ? exception.message : String(exception);
      const stack = exception instanceof Error ? exception.stack : undefined;

      this.logger.error(
        `Unhandled exception on ${request.method} ${path}: ${errorMessage}`,
        stack,
      );
    }

    const body: ErrorResponse = {
      statusCode,
      message,
      ...(errors ? { errors } : {}),
      timestamp,
      path,
    };

    response.status(statusCode).json(body);
  }

  private extractLanguage(request: Request): string {
    const acceptLanguage = request.headers['accept-language'] ?? '';
    if (acceptLanguage.toLowerCase().startsWith('am')) return 'am';
    return 'en';
  }

  private translateMessage(
    message: string,
    statusCode: number,
    lang: string,
  ): string {
    // Map common status codes to translation keys
    const statusKeyMap: Record<number, string> = {
      400: 'badRequest',
      401: 'unauthorized',
      403: 'forbidden',
      404: 'notFound',
      409: 'conflict',
      500: 'internalServerError',
      503: 'serviceUnavailable',
    };

    const key = statusKeyMap[statusCode];
    if (key && lang === 'am') {
      return getTranslation(key, lang);
    }

    return message;
  }
}
