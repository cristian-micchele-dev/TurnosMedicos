import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { DomainError } from '../../domain/errors';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status = error instanceof DomainError ? error.status : error instanceof HttpException ? error.getStatus() : 500;
    const code = error instanceof DomainError ? error.code : status === 400 ? 'VALIDATION_ERROR' : status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status === 409 ? 'CONFLICT' : status === 503 ? 'SERVICE_UNAVAILABLE' : 'INTERNAL_ERROR';
    const detail = status === 500 ? 'Ocurrió un error interno' : error instanceof DomainError ? error.message : error instanceof HttpException ? 'Servicio no disponible' : 'Solicitud inválida';
    response.status(status).type('application/problem+json').json({ type: `https://turno-medicos.dev/problems/${code.toLowerCase()}`, title: code, status, code, detail, instance: request.url, requestId: request.headers['x-request-id'] ?? randomUUID() });
  }
}
