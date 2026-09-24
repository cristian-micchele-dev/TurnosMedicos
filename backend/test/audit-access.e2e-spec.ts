import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuditController } from '../src/modules/audit/adapters/http/audit.controller';
import { AuditService } from '../src/modules/audit/application/audit.service';
import { JwtAuthGuard, RolesGuard } from '../src/modules/auth/adapters/http/auth.guards';
import { TOKEN_SERVICE } from '../src/shared/application/ports';
import { configureApp } from '../src/main';

/**
 * El registro de auditoría dice quién abrió qué historia clínica. Leerlo es, en
 * sí mismo, un acto administrativo.
 *
 * Esto va por HTTP y no como test unitario del controlador a propósito: los
 * `@UseGuards` y `@Roles` son metadata. Llamar a `controller.findAll()` a mano
 * saltea los guards por completo y pasaría aunque el endpoint estuviera abierto
 * de par en par. Lo único que prueba el control de acceso es pedirle al
 * servidor.
 */
const tokens = {
  verifyAccess: (token: string) => {
    const [, sub, role] = token.split(':');
    if (!sub || !role) throw new Error('invalid');
    return { sub, role };
  },
};

const service = { findAll: jest.fn() };

@Module({
  controllers: [AuditController],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    { provide: AuditService, useValue: service },
    { provide: TOKEN_SERVICE, useValue: tokens },
  ],
})
class AuditE2eModule {}

const como = (role: string) => `access:u-${role.toLowerCase()}:${role}`;

describe('GET /audit — quién puede leer el registro', () => {
  let app: any;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AuditE2eModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => app.close());

  beforeEach(() => {
    jest.clearAllMocks();
    service.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  });

  const get = (token?: string) => {
    const req = request(app.getHttpServer()).get('/api/v1/audit');
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  it('el admin lo lee', async () => {
    await get(como('ADMIN')).expect(200);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('un médico no, y el servicio ni se entera', async () => {
    await get(como('DOCTOR')).expect(403);
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('la secretaria tampoco', async () => {
    await get(como('SECRETARY')).expect(403);
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('sin token no se llega ni a la puerta', async () => {
    await get().expect(401);
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('con un token inventado tampoco', async () => {
    await get('cualquier-cosa').expect(401);
    expect(service.findAll).not.toHaveBeenCalled();
  });
});

describe('GET /audit — qué se puede preguntar', () => {
  let app: any;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AuditE2eModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => app.close());

  beforeEach(() => {
    jest.clearAllMocks();
    service.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  });

  const admin = (qs: string) =>
    request(app.getHttpServer()).get(`/api/v1/audit${qs}`).set('Authorization', `Bearer ${como('ADMIN')}`);

  it('las fechas llegan al servicio como fechas, no como texto', async () => {
    await admin('?from=2026-09-01T00:00:00.000Z&to=2026-09-30T23:59:59.000Z').expect(200);
    const filtros = service.findAll.mock.calls[0][0];
    expect(filtros.from).toBeInstanceOf(Date);
    expect(filtros.to).toBeInstanceOf(Date);
  });

  it('una acción que no existe se rechaza en la puerta', async () => {
    await admin('?action=BORRAR_TODO').expect(400);
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('un id que no es UUID se rechaza', async () => {
    await admin('?actorId=pepe').expect(400);
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('un parámetro desconocido se rechaza en vez de ignorarse en silencio', async () => {
    await admin('?loQueSea=1').expect(400);
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('nadie se lleva el registro entero de una: el límite tiene techo', async () => {
    await admin('?limit=100000').expect(400);
    expect(service.findAll).not.toHaveBeenCalled();
  });
});
