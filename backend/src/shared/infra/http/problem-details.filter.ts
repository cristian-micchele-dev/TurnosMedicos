import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { DomainError } from '../../domain/errors';

// Nest exceptions that are not DomainErrors, keyed by status. Anything else is INTERNAL_ERROR.
const HTTP_CODES: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'TOO_MANY_REQUESTS',
  503: 'SERVICE_UNAVAILABLE',
};

// Statuses whose Nest message is not meant for the user (e.g. "ThrottlerException: Too Many Requests").
const HTTP_DETAILS: Record<number, string> = {
  429: 'Demasiados intentos. Esperá un minuto y volvé a probar.',
};

function httpDetail(error: HttpException): string {
  const fixed = HTTP_DETAILS[error.getStatus()];
  if (fixed) return fixed;
  const body = error.getResponse();
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message = (body as Record<string, unknown>).message;
    return Array.isArray(message) ? message.join('; ') : String(message);
  }
  return 'Solicitud inválida';
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    let status = 500;
    let code = 'INTERNAL_ERROR';
    let detail = 'Ocurrió un error interno';
    if (error instanceof DomainError) {
      ({ status, code, message: detail } = error);
    } else if (error instanceof HttpException) {
      status = error.getStatus();
      code = HTTP_CODES[status] ?? 'INTERNAL_ERROR';
      detail = status === 500 ? detail : httpDetail(error);
    }

    response.status(status).type('application/problem+json').json({
      type: `https://turno-medicos.dev/problems/${code.toLowerCase()}`,
      title: code,
      status,
      code,
      detail,
      instance: request.url,
      requestId: request.headers['x-request-id'] ?? randomUUID(),
    });
  }
}
