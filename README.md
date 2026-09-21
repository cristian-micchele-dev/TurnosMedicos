# TurnoMed — Gestión de turnos hospitalarios

[![CI](https://github.com/cristian-micchele-dev/TurnosMedicos/actions/workflows/ci.yml/badge.svg)](https://github.com/cristian-micchele-dev/TurnosMedicos/actions/workflows/ci.yml)

Sistema interno (HIS) para que el personal de un hospital gestione médicos, pacientes, disponibilidad y turnos.
Monorepo con API REST en **NestJS** (arquitectura hexagonal) y SPA en **React**.

> Proyecto de portfolio. El foco está en decisiones de dominio explícitas, arquitectura limpia y reglas de negocio testeadas — no en la cantidad de features.

---

## Decisiones de dominio

Estas decisiones definen el producto y explican por qué el código es como es.

| Decisión | Consecuencia |
|---|---|
| **Sistema cerrado.** Nadie se auto-registra. Un ADMIN da de alta cada cuenta. | No existe `POST /auth/register` ni pantalla de registro. Superficie de ataque mínima. |
| **El paciente es un registro, no un usuario.** Solo ADMIN y DOCTOR tienen sesión. | `Patient` tiene identidad propia (`name`, `email`) sin FK a `users`. `Role` = `ADMIN \| DOCTOR`. Sin portal de pacientes ni notificaciones a pacientes. |
| **La disponibilidad se expresa en hora del hospital** (`America/Argentina/Buenos_Aires`). | El backend proyecta cada instante UTC al reloj del hospital antes de validar. El frontend envía instantes UTC inequívocos. Los filtros por fecha (`from`/`to`) significan "ese día completo en el hospital". |
| **Un médico puede tener varios bloques por día** (ej. 08:00-12:00 y 16:30-20:00). | `availabilities` es única por `(doctor, día, hora de inicio)`. |
| **Los turnos se crean desde el panel.** | ADMIN: elige paciente → especialidad → médico → horario. DOCTOR: elige paciente → horario en su propia agenda. |

---

## Arquitectura

### Backend — Hexagonal (Ports & Adapters)

```
src/modules/<feature>/
├── domain/                 # Entidades y reglas de negocio. Sin NestJS, sin TypeORM.
│   ├── <entity>.ts         #   Ej: Appointment.confirm() valida la transición de estado
│   └── rules/              #   Ej: WithinAvailabilityRule, NoDoubleBookingRule
├── application/            # Casos de uso (services) + DTOs validados con class-validator
├── adapters/
│   ├── http/               # Controllers, guards (JWT + roles)
│   └── persistence/        # Entidades TypeORM + implementación de repositorios
└── <feature>.repository.port.ts   # Interfaz del repositorio (el dominio depende de esto, no de TypeORM)
```

Dos módulos son planos a propósito: `dashboard/` (solo agrega lecturas de otros módulos, no tiene dominio propio) y `notifications/` (un gateway de Socket.IO). Lo transversal a la HTTP — health check, filtro de errores — vive en `shared/infra/http/`.

Puntos que vale la pena mirar:

- **Reglas de negocio como clases puras** — `appointments/domain/rules/*.rule.ts`. Se testean sin base de datos ni framework.
- **Ownership por rol** — `AppointmentService.assertCanAccess`: un DOCTOR solo opera sobre su propia agenda; ADMIN pasa todo. `MedicalRecordAccessPolicy`: un médico solo lee historias de pacientes que atendió.
- **Listados enriquecidos sin N+1** — `AppointmentService.enrich` carga médicos y pacientes en 2 queries por página con `findByIds`.
- **Tiempo del hospital centralizado** — `shared/infra/time/format.ts` (`toClinicClock`, `clinicDayRange`). Un solo lugar sabe de zonas horarias.
- **Migraciones explícitas** (`synchronize: false`), reversibles, incluyendo cambios de enum en Postgres.
- **Errores como Problem Details (RFC 7807)** con `code` estable para el frontend.

### Frontend — Feature-based

```
src/
├── api/            # Cliente HTTP (refresh automático, CSRF) + un módulo por recurso
├── context/        # AuthContext y ThemeContext (providers globales)
├── features/       # Una carpeta por pantalla, con su CSS Module al lado
├── components/     # ui/ (primitivas: Button, Input, Table, Modal, Toast…), Layout, ProtectedRoute
├── hooks/          # useFetch (TanStack Query con invalidación por recurso), useToast…
├── lib/            # queryClient
└── utils/          # date (reloj local, nunca toISOString().split('T'))
```

- **Caché de datos con TanStack Query.** `useFetch(['recurso', ...params], fetcher)`: navegar entre páginas no vuelve a pedir datos; una mutación invalida por prefijo de recurso, así el dropdown de especialidades en Doctores se actualiza cuando creás una en Especialidades.
- **Lazy loading por ruta**, tema claro/oscuro con tokens CSS, `prefers-reduced-motion` y `focus-visible` globales.

---

## Stack

| | Backend | Frontend |
|---|---|---|
| Runtime | Node 24, NestJS 12, TypeScript | React 19, Vite, TypeScript |
| Datos | PostgreSQL 16, TypeORM | TanStack Query |
| Auth | JWT access + refresh rotativo en cookie httpOnly, CSRF, Argon2 | — |
| Seguridad | `helmet`, rate limiting, `ValidationPipe` con whitelist estricta, RBAC | — |
| Tests | Jest (unit · e2e · integration) | Vitest + Testing Library |
| Calidad | ESLint, `tsc --noEmit`, coverage ≥ 68 % | oxlint, `tsc --noEmit` |

---

## Puesta en marcha

Requisitos: Node 24 y una PostgreSQL 16 (local o Docker).

```bash
# 1. Base de datos
docker compose up -d postgres          # Postgres en localhost:5432 (turno / turno / turno_medicos)

# 2. Backend
cd backend
cp .env.example .env                   # completar DATABASE_URL y los secretos JWT (≥ 32 chars)
npm ci
npm run migration:run
npm run start:dev                      # http://localhost:3000  ·  Swagger en /api/v1/docs

# 3. Frontend (otra terminal)
cd frontend
npm ci
npm run dev                            # http://localhost:5173 (proxy → :3000)
```

### Primer usuario

Como no hay registro público, el primer ADMIN se crea con el seed (idempotente — si el email ya existe no toca nada):

```bash
cd backend
ADMIN_EMAIL=admin@hospital.com ADMIN_PASSWORD='una-clave-larga' ADMIN_NAME='Administración' npm run seed:admin
```

Desde ahí, todo (médicos, pacientes, otros admins) se gestiona por el panel.

### Variables de entorno (backend)

Validadas al arrancar con `class-validator` (`src/config/env.schema.ts`). Si falta una, el proceso no levanta.

| Variable | Obligatoria | Notas |
|---|---|---|
| `DATABASE_URL` | sí | `postgres://user:pass@host:5432/db` |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | sí | mínimo 32 caracteres |
| `NODE_ENV` | no | `development` · `test` · `production` |
| `PORT` | no | default `3000` |
| `CORS_ORIGIN` | no | origen del frontend |
| `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `JWT_ISSUER` | no | |
| `REFRESH_COOKIE_NAME`, `CSRF_COOKIE_NAME` | no | |
| `SWAGGER_ENABLED` | no | nunca se expone en `production` |
| `DATABASE_SSL` | no | `false` para desactivar SSL en migraciones (CI / Postgres local) |

---

## Tests y calidad

```bash
# Backend
cd backend
npm test                     # unit (con coverage gate 68 %)
npm run test:e2e             # HTTP end-to-end con repositorios en memoria
npm run test:integration     # contra PostgreSQL real (se saltea si no hay DATABASE_URL)
npm run lint && npx tsc --noEmit

# Frontend
cd frontend
npm test
npm run lint && npx tsc --noEmit -p tsconfig.app.json
```

El pipeline de CI (`.github/workflows/ci.yml`) corre todo lo anterior en cada push y PR, levanta un Postgres efímero, aplica **y revierte** la última migración, y hace el build de producción de ambos lados.

Convención: cada cambio de comportamiento arranca con un test en rojo.

---

## Roles y permisos

| Acción | ADMIN | DOCTOR |
|---|---|---|
| Gestionar usuarios, especialidades, médicos, pacientes | ✅ | — |
| Ver todos los turnos | ✅ | solo los propios |
| Crear turno | para cualquier médico | solo en su agenda |
| Confirmar / completar turno | ✅ | solo los propios |
| Cancelar turno | ✅ | — |
| Configurar disponibilidad | de cualquier médico | la propia |
| Subir informes / recetas | — | de pacientes que atendió |

---

## Estructura del repositorio

```
backend/     API NestJS · src/modules/{auth,users,specialties,doctors,patients,appointments,medical-reports,prescriptions,dashboard,notifications}
frontend/    SPA React
design.md    Sistema de diseño (tokens, tipografía, componentes)
SPEC.md      Especificación funcional original
docker-compose.yml   Postgres + API
```

---

## Deuda técnica conocida

Anotada a propósito — son decisiones de alcance, no olvidos.

- **WebSocket de notificaciones en memoria.** Funciona con una instancia. Para escalar horizontalmente hace falta el adapter de Redis para Socket.IO.
- **Sin cola de trabajo asíncrono.** Emails y notificaciones se despachan en el request. El `Mailer` actual es un no-op.
- **Sin audit log** de acciones sensibles (cambio de rol, cancelaciones).
- **Sin política de fortaleza de contraseña** más allá del largo mínimo.
- **Tests de componentes React** cubren hooks y rutas protegidas, no todas las pantallas.
