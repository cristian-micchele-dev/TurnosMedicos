# TurnoMed — Especificación del Sistema

> Sistema de gestión de turnos médicos con roles de Administrador, Doctor y Paciente.
> Arquitectura hexagonal (Ports & Adapters) en backend NestJS + frontend React 19.

---

## Índice

1. [Stack Tecnológico](#1-stack-tecnológico)
2. [Arquitectura](#2-arquitectura)
3. [Roles y Permisos](#3-roles-y-permisos)
4. [Base de Datos](#4-base-de-datos)
5. [Migraciones](#5-migraciones)
6. [API Endpoints](#6-api-endpoints)
7. [Reglas de Negocio](#7-reglas-de-negocio)
8. [Autenticación y Sesiones](#8-autenticación-y-sesiones)
9. [Archivos y Uploads](#9-archivos-y-uploads)
10. [Eventos en Tiempo Real (WebSocket)](#10-eventos-en-tiempo-real-websocket)
11. [Frontend — Rutas](#11-frontend--rutas)
12. [Módulos Backend](#12-módulos-backend)
13. [Paginación](#13-paginación)
14. [Bugs Conocidos y Deuda Técnica](#14-bugs-conocidos-y-deuda-técnica)

---

## 1. Stack Tecnológico

### Backend

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | NestJS | ^11.0.0 |
| Lenguaje | TypeScript | ^5.7.2 |
| ORM | TypeORM | ^0.3.25 |
| Base de datos | PostgreSQL | (hosted, SSL) |
| Auth | JWT (jsonwebtoken) + Argon2 | ^9.0.2 / ^0.43.0 |
| WebSockets | Socket.IO | ^4.8.3 |
| Cron jobs | @nestjs/schedule | ^12.0.2 |
| Rate limiting | @nestjs/throttler | ^6.5.0 |
| File uploads | Multer (via @nestjs/platform-express) | — |
| Validación | class-validator + class-transformer | ^0.14.1 / ^0.5.1 |
| Seguridad | Helmet + cookie-parser | ^8.1.0 / ^1.4.7 |
| API docs | @nestjs/swagger | ^11.0.0 |
| Tests | Jest + Supertest | ^29.7.0 / ^7.0.0 |

### Frontend

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | React | ^19.2.8 |
| Build | Vite | ^8.2.2 |
| Lenguaje | TypeScript | ~6.0.2 |
| Routing | React Router DOM | ^7.18.3 |
| Animaciones | Framer Motion | ^13.2.0 |
| Charts | Recharts | ^3.10.1 |
| Íconos | Lucide React | ^1.44.0 |
| Real-time | socket.io-client | ^4.8.3 |
| PDF | jsPDF | ^4.2.1 |
| Onboarding | react-joyride | ^3.2.0 |
| Tests | Vitest + Testing Library | ^5.0.0 / ^16.3.3 |
| Linting | oxlint | ^1.79.0 |

---

## 2. Arquitectura

El backend sigue **Arquitectura Hexagonal (Ports & Adapters)** con estructura Screaming Architecture.

```
backend/src/modules/{nombre}/
  domain/                        ← Entidades de dominio puras, reglas de negocio
  application/                   ← Servicios de casos de uso, DTOs
    dto/
  adapters/
    http/                        ← Controladores NestJS
    persistence/                 ← Entidades TypeORM e implementaciones de repositorios
  {nombre}.repository.port.ts    ← Interface de repositorio (el puerto)
  {nombre}.module.ts
```

El frontend usa **feature folders** bajo `frontend/src/features/` con CSS Modules y variables CSS globales para theming.

---

## 3. Roles y Permisos

Tres roles definidos como enum: `ADMIN`, `DOCTOR`, `PATIENT`.

| Acción | ADMIN | DOCTOR | PATIENT |
|--------|-------|--------|---------|
| Gestionar usuarios (CRUD, rol, activar) | ✅ | — | — |
| Gestionar especialidades (CRUD) | ✅ | — | — |
| Crear perfiles de doctor | ✅ | — | — |
| Ver/editar todos los doctores | ✅ | — | — |
| Ver propio perfil de doctor (`/doctors/me`) | — | ✅ | — |
| Configurar disponibilidad | ✅ | ✅ (propio) | — |
| Gestionar bloqueos de agenda | ✅ | ✅ (propio) | — |
| Ver todos los pacientes | ✅ | ✅ | — |
| Crear perfiles de paciente | ✅ | — | — |
| Editar perfil de paciente | ✅ | — | ✅ (propio) |
| Ver todos los turnos | ✅ | ✅ (propios) | ✅ (propios) |
| Crear turnos | ✅ | ✅ | ✅ (solo propios) |
| Confirmar turnos | ✅ | ✅ | — |
| Cancelar turnos | ✅ | ✅ | ✅ (propio, >24h) |
| Reprogramar turnos | ✅ | ✅ | — |
| Completar turnos | ✅ | ✅ | — |
| Subir informes médicos | — | ✅ (propios) | — |
| Ver/descargar/imprimir informes | ✅ | ✅ | ✅ (propios) |
| Eliminar informes | — | ✅ (propios) | — |
| Crear recetas médicas | — | ✅ (turno completado propio) | — |
| Ver recetas | ✅ | ✅ | ✅ (propias) |
| Dashboard completo | ✅ | — | — |
| Dashboard charts | ✅ | — | — |

---

## 4. Base de Datos

### `users`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | uuid | PK |
| email | varchar(320) | UNIQUE NOT NULL |
| name | varchar(200) | NOT NULL DEFAULT '' |
| password_hash | text | NOT NULL |
| role | enum(ADMIN,DOCTOR,PATIENT) | NOT NULL DEFAULT 'PATIENT' |
| active | boolean | NOT NULL DEFAULT true |
| created_at | timestamptz | NOT NULL DEFAULT now() |

### `auth_sessions`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK users(id) ON DELETE CASCADE |
| family_id | uuid | Familia de tokens (detección de robo) |
| token_hash | text | Hash del refresh token |
| jti | text | UNIQUE — JWT ID |
| expires_at | timestamptz | Expiración |
| revoked_at | timestamptz | Nullable — fecha de revocación |
| replaced_by | uuid | Nullable — referencia al nuevo token |

### `password_reset_tokens`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | uuid | PK |
| user_id | uuid | FK users(id) ON DELETE CASCADE |
| token_hash | text | SHA-256 hash del token |
| expires_at | timestamptz | 1 hora de vida |
| used_at | timestamptz | Nullable — uso único |

### `specialties`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | uuid | PK |
| name | varchar(120) | UNIQUE NOT NULL |
| description | text | Nullable |
| active | boolean | DEFAULT true |
| created_at | timestamptz | DEFAULT now() |

### `doctors`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | uuid | PK |
| user_id | uuid | UNIQUE FK users(id) ON DELETE CASCADE |
| specialty_id | uuid | FK specialties(id) |
| license_number | varchar(50) | UNIQUE NOT NULL |
| phone | varchar(30) | Nullable |
| active | boolean | DEFAULT true |
| created_at | timestamptz | DEFAULT now() |

### `availabilities`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| doctor_id | uuid | FK doctors(id) ON DELETE CASCADE |
| day_of_week | smallint | 0=Dom, 1=Lun, …, 6=Sáb |
| start_time | time | Hora inicio (HH:mm) |
| end_time | time | Hora fin (HH:mm) |
| slot_duration_minutes | smallint | DEFAULT 30, rango 10–120 |

Constraint único: `(doctor_id, day_of_week, start_time)`.

### `schedule_blocks`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | uuid | PK |
| doctor_id | uuid | FK doctors(id) ON DELETE CASCADE |
| start_date | timestamptz | NOT NULL |
| end_date | timestamptz | NOT NULL |
| reason | varchar(255) | Nullable |
| created_at | timestamptz | DEFAULT now() |

### `patients`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | uuid | PK |
| user_id | uuid | UNIQUE FK users(id) ON DELETE CASCADE |
| phone | varchar(30) | Nullable |
| date_of_birth | date | Nullable |
| address | varchar(255) | Nullable |
| insurance_number | varchar(50) | Nullable |
| notes | text | Nullable (notas médicas: alergias, etc.) |
| active | boolean | DEFAULT true |
| created_at | timestamptz | DEFAULT now() |

### `appointments`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | uuid | PK |
| doctor_id | uuid | FK doctors(id) |
| patient_id | uuid | FK patients(id) |
| specialty_id | uuid | FK specialties(id) |
| date_time | timestamptz | NOT NULL |
| duration_minutes | smallint | NOT NULL DEFAULT 30 |
| status | enum(PENDING,CONFIRMED,CANCELLED,COMPLETED) | NOT NULL DEFAULT 'PENDING' |
| code | varchar(20) | UNIQUE NOT NULL — formato TM-00001 |
| notes | text | Nullable (nota en creación) |
| diagnosis | text | Nullable (diagnóstico al completar) |
| cancellation_reason | text | Nullable |
| created_at | timestamptz | DEFAULT now() |

Constraint único: `(doctor_id, date_time)`.

### `medical_reports`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | uuid | PK |
| appointment_id | uuid | FK appointments(id), **NULLABLE** |
| doctor_id | uuid | NOT NULL |
| patient_id | uuid | NOT NULL |
| title | varchar(255) | NOT NULL |
| description | text | Nullable |
| file_name | varchar(255) | Nombre en disco (UUID-based) |
| original_name | varchar(255) | Nombre original del archivo |
| mime_type | varchar(100) | NOT NULL |
| size_bytes | integer | NOT NULL |
| created_at | timestamptz | DEFAULT now() |

> `appointment_id` es nullable — los informes pueden subirse directamente a un paciente sin turno asociado.

### `prescriptions`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | uuid | PK |
| appointment_id | uuid | FK appointments(id), nullable |
| doctor_id | uuid | NOT NULL |
| patient_id | uuid | NOT NULL |
| medications | jsonb | NOT NULL DEFAULT '[]' |
| instructions | text | Nullable |
| created_at | timestamptz | DEFAULT now() |

**Estructura del campo `medications` (jsonb array):**
```json
[
  {
    "name": "Ibuprofeno",
    "dosage": "400mg",
    "frequency": "Cada 8 horas",
    "duration": "5 días"
  }
]
```

---

## 5. Migraciones

| Archivo | Propósito |
|---------|-----------|
| `1710000000000-foundation` | Tablas `users`, `auth_sessions`, `password_reset_tokens`; enum `user_role` |
| `1710000000001-specialties` | Tabla `specialties` |
| `1710000000002-doctors` | Tablas `doctors` y `availabilities` |
| `1710000000003-patients` | Tabla `patients` |
| `1710000000004-appointments` | Tabla `appointments`; enum `appointment_status` |
| `AddUserNameColumn` | Columna `name varchar(200)` en `users` |
| `AddPatientNotesColumn` | Columna `notes text` en `patients` |
| `1710000000005-medical-reports` | Tabla `medical_reports` |
| `1710000000006-appointment-code` | Columna `code varchar(20) UNIQUE` en `appointments`; backfill de códigos TM-XXXXX existentes |
| `1710000000007-appointment-diagnosis` | Columna `diagnosis text` en `appointments` |
| `1710000000008-optional-appointment-report` | `medical_reports.appointment_id` pasa a nullable |
| `1710000000009-prescriptions` | Tabla `prescriptions` |
| `1710000000010-schedule-blocks` | Tabla `schedule_blocks` |

---

## 6. API Endpoints

Prefijo global: `/api/v1`. Rate limit global: **20 req/min** (configurable por endpoint).

### Auth — `/auth`

| Método | Path | Rate limit | Acceso | Descripción |
|--------|------|-----------|--------|-------------|
| POST | `/auth/register` | 3/min | Público | Registrar usuario (siempre como PATIENT) |
| POST | `/auth/login` | 5/min | Público | Login; retorna `accessToken` en body + `refresh_token` y `csrf_token` en cookies httpOnly |
| POST | `/auth/refresh` | Default | Público | Rotar refresh token (requiere header `X-CSRF-Token`) |
| POST | `/auth/logout` | Default | Público | Revocar sesión; limpia cookies |
| GET | `/auth/me` | Default | Autenticado | Retorna perfil del usuario actual |
| POST | `/auth/forgot-password` | 3/min | Público | Solicitar reset de contraseña |
| POST | `/auth/reset-password` | 5/min | Público | Resetear contraseña con token; revoca todas las sesiones |

### Usuarios — `/users`

| Método | Path | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/users` | ADMIN | Crear usuario con rol explícito |
| GET | `/users` | ADMIN | Listar usuarios (paginado) |
| PATCH | `/users/:id/role` | ADMIN | Cambiar rol de usuario |
| PATCH | `/users/:id/toggle-active` | ADMIN | Activar/desactivar usuario |

### Especialidades — `/specialties`

| Método | Path | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/specialties` | Público | Listar especialidades activas (`?all=true` para todas) |
| GET | `/specialties/:id` | Público | Ver especialidad |
| POST | `/specialties` | ADMIN | Crear especialidad |
| PATCH | `/specialties/:id` | ADMIN | Actualizar especialidad |
| DELETE | `/specialties/:id` | ADMIN | Soft-delete (pone `active=false`) |

### Doctores — `/doctors`

| Método | Path | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/doctors` | ADMIN | Crear perfil de doctor |
| GET | `/doctors` | Autenticado | Listar doctores activos (`?specialtyId=`, paginado) |
| GET | `/doctors/me` | DOCTOR | Ver propio perfil |
| GET | `/doctors/:id` | Autenticado | Ver doctor |
| PATCH | `/doctors/:id` | ADMIN, DOCTOR | Actualizar especialidad, matrícula, teléfono, estado |
| POST | `/doctors/:id/availability` | ADMIN, DOCTOR | Reemplazar agenda semanal completa |
| GET | `/doctors/:id/availability` | Autenticado | Ver disponibilidad (`?date=YYYY-MM-DD` retorna slots) |
| POST | `/doctors/:id/blocks` | ADMIN, DOCTOR | Agregar bloqueo de agenda |
| GET | `/doctors/:id/blocks` | Autenticado | Listar bloqueos |
| DELETE | `/doctors/:id/blocks/:blockId` | ADMIN, DOCTOR | Eliminar bloqueo |

### Pacientes — `/patients`

| Método | Path | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/patients` | ADMIN | Crear perfil de paciente |
| GET | `/patients` | ADMIN, DOCTOR | Listar pacientes (paginado) |
| GET | `/patients/me` | PATIENT | Ver propio perfil |
| GET | `/patients/:id` | ADMIN, DOCTOR | Ver paciente |
| PATCH | `/patients/:id` | ADMIN, PATIENT (propio) | Actualizar perfil |

### Turnos — `/appointments`

| Método | Path | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/appointments` | Autenticado | Crear turno (PATIENT: solo para sí mismo) |
| GET | `/appointments` | Autenticado (filtrado por rol) | Listar turnos (paginado); filtros: `doctorId`, `patientId`, `specialtyId`, `status`, `from`, `to` |
| GET | `/appointments/:id` | Autenticado | Ver turno |
| PATCH | `/appointments/:id/confirm` | DOCTOR, ADMIN | Confirmar (PENDING → CONFIRMED) |
| PATCH | `/appointments/:id/cancel` | Autenticado (PATIENT: propio, >24h) | Cancelar (acepta `{ reason }`) |
| PATCH | `/appointments/:id/reschedule` | DOCTOR, ADMIN | Reprogramar (acepta `{ dateTime }`) |
| PATCH | `/appointments/:id/complete` | DOCTOR, ADMIN | Completar (acepta `{ diagnosis?, notes? }`) |

### Informes Médicos

| Método | Path | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/appointments/:id/reports` | DOCTOR (propio, COMPLETED) | Subir informe para un turno |
| GET | `/appointments/:id/reports` | Autenticado (PATIENT: propio) | Listar informes de turno |
| GET | `/reports/:id` | Autenticado (PATIENT: propio) | Ver metadata de informe |
| GET | `/reports/:id/download` | Autenticado (PATIENT: propio) | Descargar archivo |
| POST | `/patients/:id/reports` | DOCTOR | Subir informe directo al paciente (sin turno) |
| GET | `/patients/:id/reports` | Autenticado (PATIENT: propio) | Listar informes del paciente (paginado) |
| DELETE | `/reports/:id` | DOCTOR (propio) | Eliminar informe + archivo |

### Recetas Médicas

| Método | Path | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/appointments/:id/prescriptions` | DOCTOR (propio, COMPLETED) | Crear receta |
| GET | `/appointments/:id/prescriptions` | Autenticado | Listar recetas del turno |
| GET | `/prescriptions/:id` | Autenticado (PATIENT: propio) | Ver receta |
| GET | `/patients/:id/prescriptions` | Autenticado (PATIENT: propio) | Listar recetas del paciente (paginado) |

### Dashboard

| Método | Path | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/dashboard/stats` | Autenticado (filtrado por rol) | Estadísticas: ADMIN ve totales; DOCTOR/PATIENT ven datos propios |
| GET | `/dashboard/charts` | ADMIN | Turnos por mes (últimos 6), por estado, top 5 especialidades |

### Health

| Método | Path | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check público |

---

## 7. Reglas de Negocio

### Creación de turnos

Las siguientes reglas se ejecutan **en orden** antes de persistir:

1. **WithinAvailabilityRule** — el `dateTime` debe estar dentro de un bloque de disponibilidad del doctor en ese día de la semana.
2. **NoDoubleBookingRule** — no puede existir otro turno (no CANCELLED) para el mismo doctor en el mismo `dateTime`.
3. **NoSameDaySpecialtyRule** — un paciente no puede tener dos turnos de la misma especialidad en el mismo día calendario.
4. **ScheduleBlock check** — si el doctor tiene un bloqueo de agenda que cubre el `dateTime` solicitado, la creación es rechazada.
5. **Código auto-generado** — formato secuencial `TM-XXXXX` (TM-00001, TM-00002, …), derivado del último código en la DB.

### Máquina de estados del turno

```
PENDING  ──confirm──►  CONFIRMED  ──complete──►  COMPLETED
   │                       │
   └──cancel──►         CANCELLED  ◄──cancel──┘
```

Cualquier transición no contemplada arroja `InvalidStatusTransitionError`.

### Ventana de cancelación

**CancellationWindowRule**: el turno no puede cancelarse si faltan menos de 24 horas. Aplica solo a PATIENT; ADMIN y DOCTOR pueden cancelar en cualquier momento.

### Reprogramación

- Solo DOCTOR y ADMIN pueden reprogramar.
- Se re-ejecutan `WithinAvailabilityRule` y `NoDoubleBookingRule` con el nuevo `dateTime`.
- El turno debe estar en estado PENDING o CONFIRMED.

### Informes médicos

- Solo el DOCTOR que creó el turno puede subir informes a ese turno.
- El turno debe estar COMPLETED para subir informes vinculados a él.
- Los informes directos a paciente (`POST /patients/:id/reports`) no requieren turno.

### Recetas médicas

- Solo el DOCTOR del turno puede crear recetas.
- El turno debe estar COMPLETED.
- La receta debe incluir al menos 1 medicamento con todos sus campos (nombre, dosis, frecuencia, duración).

### Especialidades — soft delete

- `DELETE /specialties/:id` solo desactiva (`active=false`), nunca borra el registro.

### Auto-registro seguro

- `POST /auth/register` siempre asigna `Role.PATIENT`. Para dar otros roles se requiere `PATCH /users/:id/role` por un ADMIN.

---

## 8. Autenticación y Sesiones

### Tokens

| Token | Tipo | Almacenamiento | Payload |
|-------|------|----------------|---------|
| Access token | JWT de corta vida | `localStorage` (frontend) | `{ sub, role }` |
| Refresh token | JWT de larga vida | Cookie httpOnly `refresh_token` | `{ sub, jti, familyId }` |

### Protección CSRF

- Al login, se establece una cookie legible `csrf_token` con un valor aleatorio.
- El endpoint `/auth/refresh` exige el header `X-CSRF-Token` con el mismo valor.
- Protege contra CSRF en la rotación de tokens.

### Rotación y detección de robo

- Cada refresh genera un nuevo par de tokens y marca el anterior como reemplazado.
- Si un refresh token ya usado vuelve a usarse (token reuse), **toda la familia de sesiones se revoca** — señal de posible robo de token.

### Reset de contraseña

- El token se almacena hasheado con SHA-256.
- Expira en 1 hora y es de uso único.
- Al resetear, se revocan **todas las sesiones activas** del usuario.

---

## 9. Archivos y Uploads

| Parámetro | Valor |
|-----------|-------|
| Tamaño máximo | 10 MB |
| Tipos permitidos | `application/pdf`, `image/jpeg`, `image/png` |
| Almacenamiento | Sistema de archivos local: `{cwd}/uploads/reports/` |
| Nombre en disco | `{uuid}.{extensión_original}` |
| Nombre original | Preservado en columna `original_name` |
| Entrega | Stream vía `StreamableFile` con `Content-Disposition: attachment` |
| Campo multipart | `file` |

> **Limitación**: el almacenamiento es local. No es escalable horizontalmente sin un volumen compartido o migración a S3/object storage.

---

## 10. Eventos en Tiempo Real (WebSocket)

**Transporte**: Socket.IO. CORS: `origin: '*'`.

**Autenticación**: token JWT en `handshake.auth.token`. Token inválido → desconexión inmediata. Al autenticarse, el socket se une al room `user:{userId}`.

### Eventos emitidos por el servidor

Todos usan el event name `notification`. El cliente en `Header.tsx` escucha este evento y muestra un panel de notificaciones.

| `type` | Disparado por | Destinatario |
|--------|--------------|--------------|
| `appointment_created` | Nuevo turno creado | Doctor |
| `appointment_confirmed` | Turno confirmado | Paciente |
| `appointment_cancelled` | Turno cancelado | Doctor + Paciente |
| `appointment_rescheduled` | Turno reprogramado | Doctor + Paciente |
| `appointment_completed` | Turno completado | Paciente |
| `report_uploaded` | Informe subido | Paciente |
| `prescription_created` | Receta creada | Paciente *(ver bug #1)* |
| `appointment_reminder` | Cron cada hora | Paciente |

### Cron de recordatorios

- Ejecuta cada hora: `@Cron('0 * * * *')`.
- Busca turnos PENDING/CONFIRMED con `dateTime` entre `now+23h` y `now+25h`.
- Envía notificación `appointment_reminder` al paciente con la hora del turno.
- No hay tracking de "recordatorio ya enviado" — el paciente puede recibir hasta 2 notificaciones (a ~24h y ~23h del turno).

---

## 11. Frontend — Rutas

| Path | Componente | Acceso |
|------|-----------|--------|
| `/login` | LoginPage | Público |
| `/register` | RegisterPage | Público |
| `/dashboard` | DashboardPage | Todos autenticados |
| `/calendario` | CalendarPage | Todos autenticados |
| `/turnos` | AppointmentsPage | Todos autenticados (filtrado por rol) |
| `/mis-turnos` | AppointmentsPage | Todos autenticados |
| `/usuarios` | UsersPage | ADMIN |
| `/especialidades` | SpecialtiesPage | ADMIN |
| `/doctores` | DoctorsPage | ADMIN |
| `/pacientes` | PatientsPage | ADMIN |
| `/agenda` | AgendaPage | DOCTOR |
| `/disponibilidad` | AvailabilityPage | DOCTOR |
| `/mis-turnos` | AppointmentsPage | DOCTOR, PATIENT |
| `/mi-perfil` | PatientProfilePage | PATIENT |
| `/nuevo-turno` | NewAppointmentPage | PATIENT |
| `*` | NotFoundPage | Público |

Todas las rutas protegidas usan `ProtectedRoute`. Las rutas con restricción de rol usan `ProtectedRoute roles={['ADMIN']}`.

---

## 12. Módulos Backend

| Módulo | Descripción |
|--------|-------------|
| `SharedModule` | Ports compartidos: Clock, Hasher, TokenService |
| `AuthModule` | Login, registro, rotación de tokens, reset de contraseña |
| `UsersModule` | Gestión de usuarios (admin) |
| `SpecialtiesModule` | CRUD de especialidades |
| `DoctorsModule` | Perfiles de doctores, disponibilidad semanal, bloqueos de agenda |
| `PatientsModule` | Perfiles de pacientes |
| `AppointmentsModule` | Ciclo de vida del turno (crear, confirmar, cancelar, reprogramar, completar) |
| `MedicalReportsModule` | Subida y gestión de informes médicos (archivos) |
| `PrescriptionsModule` | Recetas médicas digitales |
| `DashboardModule` | Estadísticas y charts (StatsService, ChartsService) |
| `NotificationsModule` | Gateway WebSocket + cron de recordatorios (ReminderService) |

---

## 13. Paginación

Todos los endpoints de listado retornan:

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "limit": 20,
  "totalPages": 0
}
```

Defaults: `page=1`, `limit=20`. Máximo: `limit=100`.

---

## 14. Bugs Conocidos y Deuda Técnica

### Bug #1 — Notificación de receta no llega al paciente

`PrescriptionService` llama a `notifyUser(appointment.patientId, ...)` en lugar de usar el `userId` del paciente. Los rooms de Socket.IO son `user:{userId}`, por lo que la notificación nunca llega.

**Fix**: obtener el `userId` del paciente desde `PatientsRepository` y usarlo en `notifyUser`.

### Bug #2 — DEV_AUTO_LOGIN activo

`frontend/src/auth/AuthContext.tsx` tiene `DEV_AUTO_LOGIN = true`, que auto-loguea como `admin@turno.med` / `Admin1234` si no hay token. **Debe desactivarse antes de producción**.

### Deuda técnica

| Item | Descripción |
|------|-------------|
| Almacenamiento de archivos | Local (`uploads/reports/`). Migrar a S3 o similar para escalar horizontalmente. |
| Recordatorios duplicados | El cron puede enviar hasta 2 recordatorios por turno (~24h y ~23h antes). Agregar columna `reminder_sent_at` a `appointments` para evitar duplicados. |
| Tests de integración | Los spec files (`*.spec.ts`) tienen algunos errores pre-existentes no relacionados con features recientes. |
| SSL en desarrollo | `ssl: { rejectUnauthorized: false }` en `data-source.ts` — apropiado para DB hosted (Neon/Supabase), no para producción propia. |
