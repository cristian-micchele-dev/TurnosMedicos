import { HealthController } from './health.controller';
import { ServiceUnavailableException } from '@nestjs/common';

describe('HealthController', () => {
  it('live retorna ok', () => {
    const controller = new HealthController({} as any);
    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('ready retorna ok cuando la DB responde', async () => {
    const db = { query: jest.fn().mockResolvedValue(undefined) } as any;
    const controller = new HealthController(db);
    await expect(controller.ready()).resolves.toEqual({ status: 'ok', database: 'up' });
  });

  it('ready lanza ServiceUnavailableException cuando la DB falla', async () => {
    const db = { query: jest.fn().mockRejectedValue(new Error('connection refused')) } as any;
    const controller = new HealthController(db);
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
