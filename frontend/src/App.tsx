import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { Layout } from './components/Layout/Layout';
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { SpecialtiesPage } from './features/specialties/SpecialtiesPage';
import { DoctorsPage } from './features/doctors/DoctorsPage';
import { AvailabilityPage } from './features/doctors/AvailabilityPage';
import { PatientsPage } from './features/patients/PatientsPage';
import { PatientProfilePage } from './features/patients/PatientProfilePage';
import { AppointmentsPage } from './features/appointments/AppointmentsPage';
import { NewAppointmentPage } from './features/appointments/NewAppointmentPage';
import { UsersPage } from './features/users/UsersPage';

export function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
