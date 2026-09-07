# Turno Medicos

Sistema de gestión de turnos médicos — monorepo con backend API REST y frontend SPA.

## Estructura

```
backend/    → NestJS + TypeScript + PostgreSQL + TypeORM (hexagonal architecture)
frontend/   → React + TypeScript + Vite + React Router + CSS Modules
```

## Puesta en marcha

```bash
# 1. Backend
cd backend
cp .env.example .env   # completar secretos / Supabase URL
npm install
npm run migration:run
npm run start:dev      # http://localhost:3000

# 2. Frontend (otra terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173 (proxy → backend)
```

O con Docker:
```bash
docker compose up --build
```

## Backend

**Stack:** NestJS 10, TypeORM, PostgreSQL 16, JWT + httpOnly cookies, Argon2, Swagger

**Módulos:** Auth (JWT rotation + CSRF), Users (roles), Specialties, Doctors + Availability, Patients, Appointments (business rules)

**Tests:** 158 unit tests, 80%+ coverage en todas las métricas

**Endpoints:** Ver `backend/README.md` o Swagger en `/api/v1/docs`

## Frontend

**Stack:** React 19, Vite, TypeScript, React Router, CSS Modules

**Features:** Login/Register, Dashboard por rol, CRUD completo de todos los módulos, Wizard de nuevo turno (4 pasos), Toast notifications, Error boundary

**Roles:**
- **Admin:** gestión de especialidades, doctores, pacientes, turnos
- **Doctor:** mis turnos, mi disponibilidad
- **Paciente:** mis turnos, nuevo turno, mi perfil
