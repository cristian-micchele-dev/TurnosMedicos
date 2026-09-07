import configuration from './configuration';

describe('configuration', () => {
  it('retorna valores por defecto', () => {
    const config = configuration();
    expect(config.port).toBe(3000);
    expect(config.nodeEnv).toBe('test');
    expect(config.jwt.accessTtl).toBe('15m');
    expect(config.jwt.refreshTtl).toBe('7d');
    expect(config.jwt.issuer).toBe('turno-medicos');
    expect(config.corsOrigin).toBe('http://localhost:3000');
    expect(config.swaggerEnabled).toBe(true);
  });

  it('lee variables de entorno cuando existen', () => {
    const prev = process.env.PORT;
    process.env.PORT = '4000';
    const config = configuration();
    expect(config.port).toBe(4000);
    process.env.PORT = prev;
  });
});
