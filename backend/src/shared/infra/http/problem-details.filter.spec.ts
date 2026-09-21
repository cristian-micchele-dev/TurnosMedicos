import { ProblemDetailsFilter } from './problem-details.filter';
import { DomainError } from '../../domain/errors';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('ProblemDetailsFilter', () => {
  const filter = new ProblemDetailsFilter();
  const mockHost = (requestOverrides = {}) => {
    const json = jest.fn();
    const type = jest.fn().mockReturnValue({ json });
    const status = jest.fn().mockReturnValue({ type });
    return {
      host: { switchToHttp: () => ({ getRequest: () => ({ url: '/api/v1/test', headers: {}, ...requestOverrides }), getResponse: () => ({ status }) }) } as any,
      status, type, json,
    };
  };

  it('maneja DomainError con status y code correctos', () => {
    const { host, status, json } = mockHost();
    filter.catch(new DomainError('TEST_ERROR', 'Test message', 422), host);
    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TEST_ERROR', detail: 'Test message', status: 422 }));
  });

  it('maneja HttpException de NestJS', () => {
    const { host, status } = mockHost();
    filter.catch(new HttpException('Service Unavailable', HttpStatus.SERVICE_UNAVAILABLE), host);
    expect(status).toHaveBeenCalledWith(503);
  });

  it('maneja error genérico como 500', () => {
    const { host, status, json } = mockHost();
    filter.catch(new Error('unexpected'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Ocurrió un error interno' }));
  });

  it('usa x-request-id del header si existe', () => {
    const { host, json } = mockHost({ headers: { 'x-request-id': 'req-123' } });
    filter.catch(new Error('test'), host);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'req-123' }));
  });

  it('genera requestId si no viene en headers', () => {
    const { host, json } = mockHost();
    filter.catch(new Error('test'), host);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ requestId: expect.any(String) }));
  });
  it('mapea 429 del throttler a TOO_MANY_REQUESTS con un detalle útil', () => {
    const { host, status, json } = mockHost();
    filter.catch(new HttpException('ThrottlerException: Too Many Requests', HttpStatus.TOO_MANY_REQUESTS), host);
    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOO_MANY_REQUESTS', detail: 'Demasiados intentos. Esperá un minuto y volvé a probar.' }));
  });

  it('mapea 404 de ruta inexistente a NOT_FOUND', () => {
    const { host, json } = mockHost();
    filter.catch(new HttpException({ message: 'Cannot GET /nope' }, HttpStatus.NOT_FOUND), host);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'NOT_FOUND', status: 404 }));
  });
});
