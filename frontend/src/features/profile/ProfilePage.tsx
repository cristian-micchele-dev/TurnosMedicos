import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Camera, CalendarClock, KeyRound, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMyDoctor } from '../../hooks/useMyDoctor';
import { useDoctorAvatar } from '../../hooks/useDoctorAvatar';
import { useToast } from '../../hooks/useToast';
import { doctorsApi } from '../../api/doctors';
import { apiErrorMessage } from '../../api/client';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import styles from './ProfilePage.module.css';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const roleLabels: Record<string, string> = { ADMIN: 'Administrador', DOCTOR: 'Médico' };

function memberSince(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

export function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { doctor, loading, refetch } = useMyDoctor();
  const avatarUrl = useDoctorAvatar(doctor);

  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const [editingPhone, setEditingPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  if (!user) return null;
  const displayName = user.name || user.email;

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !doctor) return;
    // Same rule as the API, checked here so a wrong file never leaves the browser.
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      toast.error('La foto debe ser JPG, PNG o WebP de hasta 2 MB');
      return;
    }
    setUploading(true);
    try {
      await doctorsApi.uploadAvatar(doctor.id, file);
      toast.success('Foto actualizada');
      await refetch();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo subir la foto'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!doctor) return;
    setRemoving(true);
    try {
      await doctorsApi.removeAvatar(doctor.id);
      toast.success('Foto eliminada');
      await refetch();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo quitar la foto'));
    } finally {
      setRemoving(false);
    }
  };

  const startEditPhone = () => {
    setPhone(doctor?.phone ?? '');
    setEditingPhone(true);
  };

  const savePhone = async (e: FormEvent) => {
    e.preventDefault();
    if (!doctor) return;
    setSavingPhone(true);
    try {
      await doctorsApi.update(doctor.id, { phone: phone.trim() });
      toast.success('Teléfono actualizado');
      setEditingPhone(false);
      await refetch();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo guardar el teléfono'));
    } finally {
      setSavingPhone(false);
    }
  };

  const isDoctor = user.role === 'DOCTOR';

  return (
    <div className={styles.page}>
      <article className={styles.card} aria-busy={loading}>
        <div className={styles.identity}>
          <div className={styles.photo}>
            <Avatar name={displayName} src={avatarUrl} size="xl" />
            {isDoctor && doctor && (
              <div className={styles.photoActions}>
                <input
                  ref={fileInput}
                  id="avatar-file"
                  className={styles.fileInput}
                  type="file"
                  accept={IMAGE_TYPES.join(',')}
                  aria-label="Subir foto"
                  onChange={handleFile}
                  disabled={uploading}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  isLoading={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  <Camera size={14} /> {doctor.avatarFile ? 'Cambiar foto' : 'Subir foto'}
                </Button>
                {doctor.avatarFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={styles.removeBtn}
                    isLoading={removing}
                    onClick={handleRemove}
                  >
                    <Trash2 size={14} /> Quitar foto
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className={styles.heading}>
            <h1 className={styles.name}>{displayName}</h1>
            <div className={styles.tags}>
              <Badge variant={isDoctor ? 'success' : 'primary'}>{roleLabels[user.role] ?? user.role}</Badge>
              {doctor?.specialty && <span className={styles.specialty}>{doctor.specialty.name}</span>}
              {doctor && !doctor.active && <Badge variant="neutral">Inactivo</Badge>}
            </div>
          </div>
        </div>

        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>

          {isDoctor && doctor && (
            <>
              <div className={styles.fact}>
                <dt>Matrícula</dt>
                <dd className={styles.mono}>{doctor.licenseNumber}</dd>
              </div>
              <div className={styles.fact}>
                <dt>Teléfono</dt>
                <dd>
                  {editingPhone ? (
                    <form className={styles.inlineForm} onSubmit={savePhone}>
                      <Input
                        label="Teléfono"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="11 5566 7788"
                        autoFocus
                      />
                      <div className={styles.inlineActions}>
                        <Button type="submit" size="sm" isLoading={savingPhone}>Guardar</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setEditingPhone(false)}>Cancelar</Button>
                      </div>
                    </form>
                  ) : (
                    <span className={styles.editable}>
                      {doctor.phone || <span className={styles.muted}>Sin cargar</span>}
                      <button type="button" className={styles.editLink} onClick={startEditPhone} aria-label="Editar teléfono">
                        Editar
                      </button>
                    </span>
                  )}
                </dd>
              </div>
              <div className={styles.fact}>
                <dt>En el plantel desde</dt>
                <dd>{memberSince(doctor.createdAt)}</dd>
              </div>
            </>
          )}
        </dl>

        <footer className={styles.footer}>
          {isDoctor && (
            <Link to="/disponibilidad" className={styles.footerLink}>
              <CalendarClock size={16} /> Mi disponibilidad
            </Link>
          )}
          <Link to="/cambiar-contrasena" className={styles.footerLink}>
            <KeyRound size={16} /> Cambiar contraseña
          </Link>
        </footer>
      </article>
    </div>
  );
}
