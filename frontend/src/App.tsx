import { lazy, Suspense, type ReactNode } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { Layout } from './components/Layout/Layout';
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute';
import { Spinner } from './components/ui/Spinner';

function AnimatedPage({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

const LoginPage = lazy(() => import('./features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const SpecialtiesPage = lazy(() => import('./features/specialties/SpecialtiesPage').then((m) => ({ default: m.SpecialtiesPage })));
const DoctorsPage = lazy(() => import('./features/doctors/DoctorsPage').then((m) => ({ default: m.DoctorsPage })));
const AvailabilityPage = lazy(() => import('./features/doctors/AvailabilityPage').then((m) => ({ default: m.AvailabilityPage })));
const PatientsPage = lazy(() => import('./features/patients/PatientsPage').then((m) => ({ default: m.PatientsPage })));
const AppointmentsPage = lazy(() => import('./features/appointments/AppointmentsPage').then((m) => ({ default: m.AppointmentsPage })));
const NewAppointmentPage = lazy(() => import('./features/appointments/NewAppointmentPage').then((m) => ({ default: m.NewAppointmentPage })));
const UsersPage = lazy(() => import('./features/users/UsersPage').then((m) => ({ default: m.UsersPage })));
const CalendarPage  = lazy(() => import('./features/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const AgendaPage    = lazy(() => import('./features/agenda/AgendaPage').then((m) => ({ default: m.AgendaPage })));
const ChangePasswordPage = lazy(() => import('./features/auth/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })));
const NotFoundPage = lazy(() => import('./features/not-found/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

export function App() {
  const location = useLocation();

  return (
    <ErrorBoundary>
    <Suspense fallback={<Spinner />}>
    <AnimatePresence mode="wait">
    <Routes location={location} key={location.pathname}>
      {/* Public routes */}
      <Route path="/login" element={<AnimatedPage><LoginPage /></AnimatedPage>} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/cambiar-contrasena" element={<ChangePasswordPage />} />

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
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/disponibilidad" element={<AvailabilityPage />} />
          </Route>

          {/* Shared: appointments (ADMIN sees all, DOCTOR only own — filtered by backend) */}
          <Route path="/nuevo-turno" element={<NewAppointmentPage />} />
          <Route path="/turnos" element={<AppointmentsPage />} />
          <Route path="/mis-turnos" element={<AppointmentsPage />} />
          <Route path="/calendario" element={<CalendarPage />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<AnimatedPage><NotFoundPage /></AnimatedPage>} />
    </Routes>
    </AnimatePresence>
    </Suspense>
    </ErrorBoundary>
  );
}
