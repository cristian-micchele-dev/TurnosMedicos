import { Argon2Hasher, JwtTokenService } from './services';

describe('Argon2Hasher', () => {
  const hasher = new Argon2Hasher();

  it('hashea y verifica correctamente', async () => {
    const hash = await hasher.hash('password123');
    expect(hash).not.toBe('password123');
    expect(await hasher.verify(hash, 'password123')).toBe(true);
    expect(await hasher.verify(hash, 'wrong')).toBe(false);
  });
});

describe('JwtTokenService', () => {
  const config: any = {
    getOrThrow: jest.fn((key: string) => {
      const map: Record<string, string> = {
        'jwt.accessSecret': 'test-access-secret-0123456789012345678901234',
        'jwt.refreshSecret': 'test-refresh-secret-012345678901234567890123',
        'jwt.accessTtl': '15m',
        'jwt.refreshTtl': '7d',
        'jwt.issuer': 'test-issuer',
      };
      return map[key];
    }),
  };
  const service = new JwtTokenService(config);

  it('firma y verifica access token', () => {
    const token = service.signAccess({ sub: 'u1', role: 'PATIENT' });
    expect(typeof token).toBe('string');
    const payload = service.verifyAccess(token);
    expect(payload.sub).toBe('u1');
    expect(payload.role).toBe('PATIENT');
    expect(payload.iss).toBe('test-issuer');
  });

  it('firma y verifica refresh token', () => {
    const token = service.signRefresh({ sub: 'u1', jti: 'j1' });
    const payload = service.verifyRefresh(token);
    expect(payload.sub).toBe('u1');
    expect(payload.jti).toBe('j1');
  });

  it('rechaza token con secret incorrecto', () => {
    const token = service.signAccess({ sub: 'u1' });
    expect(() => service.verifyRefresh(token)).toThrow();
  });

  it('calcula refreshTtlMs correctamente', () => {
    expect(service.refreshTtlMs()).toBe(7 * 86400000);
  });

  it('parsea TTL en diferentes unidades', () => {
    const configs: [string, number][] = [['30s', 30000], ['15m', 900000], ['2h', 7200000], ['1d', 86400000]];
    for (const [ttl, expected] of configs) {
      const cfg: any = { getOrThrow: (k: string) => k === 'jwt.refreshTtl' ? ttl : config.getOrThrow(k) };
      expect(new JwtTokenService(cfg).refreshTtlMs()).toBe(expected);
    }
  });

  it('lanza error con TTL inválido', () => {
    const cfg: any = { getOrThrow: (k: string) => k === 'jwt.refreshTtl' ? 'invalid' : config.getOrThrow(k) };
    expect(() => new JwtTokenService(cfg).refreshTtlMs()).toThrow();
  });
});
