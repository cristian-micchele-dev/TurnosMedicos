import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { Layout } from './components/Layout/Layout';
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute';
import { Spinner } from './components/ui/Spinner';

const LoginPage = lazy(() => import('./features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const SpecialtiesPage = lazy(() => import('./features/specialties/SpecialtiesPage').then((m) => ({ default: m.SpecialtiesPage })));
const DoctorsPage = lazy(() => import('./features/doctors/DoctorsPage').then((m) => ({ default: m.DoctorsPage })));
const AvailabilityPage = lazy(() => import('./features/doctors/AvailabilityPage').then((m) => ({ default: m.AvailabilityPage })));
const PatientsPage = lazy(() => import('./features/patients/PatientsPage').then((m) => ({ default: m.PatientsPage })));
const PatientProfilePage = lazy(() => import('./features/patients/PatientProfilePage').then((m) => ({ default: m.PatientProfilePage })));
const AppointmentsPage = lazy(() => import('./features/appointments/AppointmentsPage').then((m) => ({ default: m.AppointmentsPage })));
const NewAppointmentPage = lazy(() => import('./features/appointments/NewAppointmentPage').then((m) => ({ default: m.NewAppointmentPage })));
const UsersPage = lazy(() => import('./features/users/UsersPage').then((m) => ({ default: m.UsersPage })));

export function App() {
  return (
    <ErrorBoundary>
    <Suspense fallback={<Spinner />}>
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Admin */}
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/usuarios" element={<UsersPage />} />
            <Route path="/especialidades" element={<SpecialtiesPage />} />
            <Route path="/doctores" element={<DoctorsPage />} />
            <Route path="/doctores/:id/availability" element={<AvailabilityPage />} />
            <Route path="/pacientes" element={<PatientsPage />} />
          </Route>

          {/* Doctor */}
          <Route element={<ProtectedRoute roles={['DOCTOR']} />}>
            <Route path="/disponibilidad" element={<AvailabilityPage />} />
          </Route>

          {/* Patient */}
          <Route element={<ProtectedRoute roles={['PATIENT']} />}>
            <Route path="/mi-perfil" element={<PatientProfilePage />} />
            <Route path="/nuevo-turno" element={<NewAppointmentPage />} />
          </Route>

          {/* Shared: appointments (all roles, filtered by backend) */}
          <Route path="/turnos" element={<AppointmentsPage />} />
          <Route path="/mis-turnos" element={<AppointmentsPage />} />
          <Route path="/appointments/new" element={<NewAppointmentPage />} />
        </Route>
      </Route>

      {/* Redirect root to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </Suspense>
    </ErrorBoundary>
  );
}
