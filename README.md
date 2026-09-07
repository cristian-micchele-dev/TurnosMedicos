# Turno Medicos API

API REST para gestión de turnos médicos. NestJS + TypeScript + PostgreSQL + TypeORM con arquitectura hexagonal (ports & adapters).

## Stack

- **Runtime:** Node.js 22
- **Framework:** NestJS 10
- **Base de datos:** PostgreSQL 16 (TypeORM, migraciones manuales)
- **Auth:** JWT access + refresh con rotación, httpOnly cookies, CSRF double-submit
- **Hashing:** Argon2
- **Contenedores:** Docker + docker-compose
- **CI:** GitHub Actions (lint, test, integration, e2e, migrations)
- **Deploy:** Render (render.yaml)

## Módulos

| Módulo | Descripción |
|--------|-------------|
| **Auth** | Register, login, refresh (rotación + detección de reuso), logout, forgot/reset password |
| **Users** | Entidad base con roles ADMIN, DOCTOR, PATIENT |
| **Specialties** | CRUD de especialidades médicas (soft delete) |
| **Doctors** | Perfil médico + disponibilidad horaria con generación de slots |
| **Patients** | Perfil de paciente con datos de contacto y obra social |
| **Appointments** | Turnos con reglas de negocio: sin double booking, dentro de disponibilidad, sin misma especialidad el mismo día, ventana de cancelación 24h |

## Puesta en marcha

```bash
# 1. Clonar y configurar
cp .env.example .env  # completar secretos

# 2. Levantar PostgreSQL
docker compose up -d postgres

# 3. Instalar y correr migraciones
npm install
npm run migration:run

# 4. Iniciar en desarrollo
npm run start:dev
```

O todo junto con Docker:
```bash
docker compose up --build
```

## Endpoints

Base: `/api/v1`

- **Health:** `GET /health/live`, `GET /health/ready`
- **Auth:** `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/forgot`, `POST /auth/reset`
- **Specialties:** `GET /specialties`, `POST /specialties`, `PATCH /specialties/:id`, `DELETE /specialties/:id`
- **Doctors:** `GET /doctors`, `GET /doctors/me`, `POST /doctors`, `PATCH /doctors/:id`, `PUT /doctors/:id/availability`, `GET /doctors/:id/availability`
- **Patients:** `GET /patients`, `GET /patients/me`, `POST /patients`, `PATCH /patients/:id`
- **Appointments:** `GET /appointments`, `POST /appointments`, `GET /appointments/:id`, `PATCH /appointments/:id/confirm`, `PATCH /appointments/:id/cancel`, `PATCH /appointments/:id/complete`

Swagger: `/api/v1/docs` (solo en desarrollo/test)

## Scripts

```bash
npm run start:dev        # Desarrollo con watch
npm run build            # Compilar TypeScript
npm test                 # Tests unitarios
npm run test:cov         # Coverage (threshold 80%)
npm run test:e2e         # End-to-end
npm run test:integration # Integración (requiere DATABASE_URL)
npm run lint             # ESLint
npm run migration:run    # Ejecutar migraciones
npm run migration:revert # Revertir última migración
```

## Seguridad

- Access token en JSON, refresh token en cookie `HttpOnly` + `Secure` + `SameSite=Lax`
- Refresh requiere header `X-CSRF-Token` (double-submit pattern)
- Passwords hasheados con Argon2
- Recovery no revela si un correo existe
- Roles enforceados con guards: `@Roles(Role.ADMIN)`

## Testing

158 tests unitarios, 27 suites. Coverage:

| Métrica | Resultado |
|---------|-----------|
| Statements | 95.77% |
| Branches | 82.2% |
| Functions | 97.85% |
| Lines | 99.26% |

## Arquitectura

```
src/modules/{module}/
  domain/           # Entidades, value objects, errores, reglas de negocio
  application/      # Servicios, DTOs
  adapters/
    http/           # Controllers, guards
    persistence/    # TypeORM entities, repositories
  {module}.repository.port.ts  # Interface del puerto
```
