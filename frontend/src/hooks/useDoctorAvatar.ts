import { useEffect, useMemo } from 'react';
import { doctorsApi } from '../api/doctors';
import { useFetch } from './useFetch';

// Avatars sit behind the JWT, so an <img src> cannot point at the API directly:
// the bytes are fetched with the token and exposed as an object URL. The query
// key carries the file name, so a new upload is a new key — no manual invalidation.
export function useDoctorAvatar(doctor: { id: string; avatarFile: string | null } | null | undefined): string | null {
  const id = doctor?.id;
  const file = doctor?.avatarFile ?? null;
  const { data } = useFetch<Blob | null>(
    ['doctor-avatar', id, file],
    () => (id && file ? doctorsApi.avatarBlob(id) : Promise.resolve(null)),
  );

  const url = useMemo(() => (data ? URL.createObjectURL(data) : null), [data]);

  // The object URL is a browser resource: release it when the blob changes or the consumer unmounts.
  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return url;
}
