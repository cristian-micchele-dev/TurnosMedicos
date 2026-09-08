import { useEffect, useState, type FormEvent } from 'react';
import { patientsApi, type Patient } from '../../api/patients';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../auth/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import styles from './PatientProfilePage.module.css';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const [year, month, day] = iso.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
}

export function PatientProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await patientsApi.me();
        setPatient(data);
        populateForm(data);
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        if (status === 404) {
          setNoProfile(true);
        } else {
          toast.error('Error al cargar tu perfil');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const populateForm = (p: Patient) => {
    setPhone(p.phone ?? '');
    setDateOfBirth(p.dateOfBirth ? p.dateOfBirth.split('T')[0] : '');
    setAddress(p.address ?? '');
    setInsuranceNumber(p.insuranceNumber ?? '');
    setNotes(p.notes ?? '');
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSubmitting(true);
      const created = await patientsApi.create({
        userId: user.id,
        phone: phone.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        address: address.trim() || undefined,
        insuranceNumber: insuranceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setPatient(created);
      setNoProfile(false);
      toast.success('Perfil creado correctamente');
    } catch {
      toast.error('Error al crear el perfil');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    try {
      setSubmitting(true);
      const updated = await patientsApi.update(patient.id, {
        phone: phone.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        address: address.trim() || undefined,
        insuranceNumber: insuranceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setPatient(updated);
      populateForm(updated);
      setEditing(false);
      toast.success('Perfil actualizado correctamente');
    } catch {
      toast.error('Error al actualizar el perfil');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    if (patient) populateForm(patient);
    setEditing(false);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.centered}>
          <Spinner size="lg" label="Cargando perfil..." />
        </div>
      </div>
    );
  }

  if (noProfile) {
    return (
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Mi Perfil</h1>
            <p className={styles.subtitle}>Completá tu información para poder solicitar turnos</p>
          </div>
        </header>

        <div className={styles.card}>
          <div className={styles.emptyBanner}>
            <span className={styles.emptyIcon}>👤</span>
            <h2 className={styles.emptyTitle}>Completá tu perfil</h2>
            <p className={styles.emptyDescription}>
              Todavía no tenés un perfil de paciente. Completá los datos para continuar.
            </p>
          </div>

          <form onSubmit={handleCreate} className={styles.form} noValidate>
            <div className={styles.fields}>
              <Input
                label="Teléfono"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: +54 11 1234-5678"
              />
              <Input
                label="Fecha de Nacimiento"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
              <Input
                label="Dirección"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej: Av. Corrientes 1234, CABA"
              />
              <Input
                label="Obra Social / Número de afiliado"
                value={insuranceNumber}
                onChange={(e) => setInsuranceNumber(e.target.value)}
                placeholder="Ej: OSDE 12345678"
              />
              <div className={styles.fieldFullWidth}>
                <label className={styles.fieldLabel} htmlFor="notes-create">
                  Notas médicas
                </label>
                <textarea
                  id="notes-create"
                  className={styles.notesTextarea}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Alergias, condiciones preexistentes, observaciones..."
                />
              </div>
            </div>
            <div className={styles.formFooter}>
              <Button type="submit" variant="primary" isLoading={submitting}>
                Guardar perfil
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Mi Perfil</h1>
          <p className={styles.subtitle}>Gestioná tu información personal</p>
        </div>
        {!editing && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Editar perfil
          </Button>
        )}
      </header>

      <div className={styles.card}>
        {editing ? (
          <form onSubmit={handleUpdate} className={styles.form} noValidate>
            <h2 className={styles.sectionTitle}>Editar información</h2>
            <div className={styles.fields}>
              <Input
                label="Teléfono"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: +54 11 1234-5678"
              />
              <Input
                label="Fecha de Nacimiento"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
              <Input
                label="Dirección"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej: Av. Corrientes 1234, CABA"
              />
              <Input
                label="Obra Social / Número de afiliado"
                value={insuranceNumber}
                onChange={(e) => setInsuranceNumber(e.target.value)}
                placeholder="Ej: OSDE 12345678"
              />
              <div className={styles.fieldFullWidth}>
                <label className={styles.fieldLabel} htmlFor="notes-edit">
                  Notas médicas
                </label>
                <textarea
                  id="notes-edit"
                  className={styles.notesTextarea}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Alergias, condiciones preexistentes, observaciones..."
                />
              </div>
            </div>
            <div className={styles.formFooter}>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelEdit}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" isLoading={submitting}>
                Guardar cambios
              </Button>
            </div>
          </form>
        ) : (
          <>
            <h2 className={styles.sectionTitle}>Información personal</h2>
            <div className={styles.profileGrid}>
              <div className={styles.profileItem}>
                <span className={styles.profileLabel}>Nombre</span>
                <span className={styles.profileValue}>{user?.name || (user?.email?.split('@')[0] ?? '—')}</span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.profileLabel}>Email</span>
                <span className={styles.profileValue}>{user?.email ?? '—'}</span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.profileLabel}>Teléfono</span>
                <span className={styles.profileValue}>{patient?.phone ?? '—'}</span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.profileLabel}>Fecha de Nacimiento</span>
                <span className={styles.profileValue}>
                  {formatDate(patient?.dateOfBirth ?? null)}
                </span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.profileLabel}>Dirección</span>
                <span className={styles.profileValue}>{patient?.address ?? '—'}</span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.profileLabel}>Obra Social</span>
                <span className={styles.profileValue}>{patient?.insuranceNumber ?? '—'}</span>
              </div>
              <div className={`${styles.profileItem} ${styles.profileItemFullWidth}`}>
                <span className={styles.profileLabel}>Notas médicas</span>
                <span className={styles.profileValue}>{patient?.notes ?? '—'}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
