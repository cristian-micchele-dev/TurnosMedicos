import { useAuth } from '../context/AuthContext';
import { doctorsApi, type Doctor } from '../api/doctors';
import { useFetch } from './useFetch';

// The doctor profile behind the logged-in user. Resolves to null for an ADMIN,
// who has an account but no profile, without hitting the API.
export function useMyDoctor() {
  const { user } = useAuth();
  const isDoctor = user?.role === 'DOCTOR';
  const { data, loading, error, refetch } = useFetch<Doctor | null>(
    ['doctors', 'me', isDoctor],
    () => (isDoctor ? doctorsApi.me() : Promise.resolve(null)),
  );
  return { doctor: data ?? null, loading: isDoctor && loading, error, refetch };
}
