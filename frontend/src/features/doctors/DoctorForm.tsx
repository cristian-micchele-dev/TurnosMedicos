import { useState, type FormEvent } from 'react';
import type { Doctor } from '../../api/doctors';
import type { Specialty } from '../../api/specialties';
import type { UserListItem } from '../../api/users';
import { usersApi } from '../../api/users';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import styles from './DoctorForm.module.css';
import { MIN_PASSWORD_LENGTH, PASSWORD_HINT } from '../../utils/password';

interface DoctorFormProps {
  doctor?: Doctor;
  specialties: Specialty[];
  users: UserListItem[];
  // Every doctor profile, so accounts that already own one are not offered twice.
  doctors: Doctor[];
  onSubmit: (data: {
    userId: string;
    specialtyId: string;
    licenseNumber: string;
    phone?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

interface FormErrors {
  userId?: string;
  name?: string;
  email?: string;
  password?: string;
  specialtyId?: string;
  licenseNumber?: string;
}

export function DoctorForm({ doctor, specialties, users, doctors, onSubmit, onCancel }: DoctorFormProps) {
  const isEditing = Boolean(doctor);

  const [mode, setMode] = useState<'existing' | 'new'>('new');
  const [userId, setUserId] = useState(doctor?.userId ?? '');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [specialtyId, setSpecialtyId] = useState(doctor?.specialtyId ?? '');
  const [licenseNumber, setLicenseNumber] = useState(doctor?.licenseNumber ?? '');
  const [phone, setPhone] = useState(doctor?.phone ?? '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Only DOCTOR accounts without a profile can become a doctor: the API rejects
  // ADMINs' and duplicates anyway, so listing them would only invite a 409.
  const takenUserIds = new Set(doctors.map((d) => d.userId));
  const userOptions = users
    .filter((u) => u.active && u.role === 'DOCTOR' && !takenUserIds.has(u.id))
    .map((u) => ({ value: u.id, label: u.name ? `${u.name} (${u.email})` : u.email }));

  const specialtyOptions = specialties
    .filter((s) => s.active)
    .map((s) => ({ value: s.id, label: s.name }));

  const validate = (): boolean => {
    const next: FormErrors = {};

    if (!isEditing) {
      if (mode === 'existing' && !userId) {
        next.userId = 'Seleccioná un usuario';
      }
      if (mode === 'new') {
        if (!newEmail.trim()) next.email = 'El email es requerido';
        if (newPassword.length < MIN_PASSWORD_LENGTH) next.password = `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`;
      }
      if (!licenseNumber.trim()) {
        next.licenseNumber = 'La matrícula es obligatoria';
      }
    }
    if (!specialtyId) {
      next.specialtyId = 'Seleccioná una especialidad';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);

      let finalUserId = userId;

      if (!isEditing && mode === 'new') {
        const created = await usersApi.create({
          name: newName.trim() || undefined,
          email: newEmail.trim(),
          password: newPassword,
          role: 'DOCTOR',
        });
        finalUserId = created.id;
      }

      await onSubmit({
        userId: finalUserId,
        specialtyId,
        licenseNumber: licenseNumber.trim(),
        phone: phone.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.fields}>
        {!isEditing && (
          <>
            <div className={styles.modeToggle}>
              <button
                type="button"
                className={`${styles.modeBtn} ${mode === 'new' ? styles.modeBtnActive : ''}`}
                onClick={() => setMode('new')}
              >
                Nuevo usuario
              </button>
              <button
                type="button"
                className={`${styles.modeBtn} ${mode === 'existing' ? styles.modeBtnActive : ''}`}
                onClick={() => setMode('existing')}
              >
                Usuario existente
              </button>
            </div>

            {mode === 'new' ? (
              <>
                <Input
                  label="Nombre"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nombre completo del doctor"
                />
                <Input
                  label="Email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  error={errors.email}
                  placeholder="doctor@email.com"
                  required
                />
                <Input
                  label="Contraseña"
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  error={errors.password}
                  placeholder={PASSWORD_HINT}
                  required
                />
              </>
            ) : userOptions.length === 0 ? (
              <p className={styles.emptyHint} role="status">
                No hay cuentas de médico sin perfil. Usá <strong>Nuevo usuario</strong> para crear una.
              </p>
            ) : (
              <Select
                label="Usuario"
                required
                options={userOptions}
                value={userId}
                onChange={(val) => {
                  setUserId(val);
                  if (errors.userId) setErrors((prev) => ({ ...prev, userId: undefined }));
                }}
                placeholder="Seleccionar usuario"
                error={errors.userId}
              />
            )}

            <Input
              label="Matrícula"
              value={licenseNumber}
              onChange={(e) => {
                setLicenseNumber(e.target.value);
                if (errors.licenseNumber)
                  setErrors((prev) => ({ ...prev, licenseNumber: undefined }));
              }}
              error={errors.licenseNumber}
              placeholder="Ej: MN 123456"
              required
            />
          </>
        )}

        <Select
          label="Especialidad"
          required
          options={specialtyOptions}
          value={specialtyId}
          onChange={(val) => {
            setSpecialtyId(val);
            if (errors.specialtyId) setErrors((prev) => ({ ...prev, specialtyId: undefined }));
          }}
          placeholder="Seleccionar especialidad"
          error={errors.specialtyId}
        />

        <Input
          label="Teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ej: +54 9 11 1234-5678"
          type="tel"
          id="doctor-phone"
        />
      </div>

      {isEditing && (
        <p className={styles.editNote}>
          Solo se puede modificar la especialidad y el teléfono de un doctor existente.
        </p>
      )}

      <div className={styles.footer}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" isLoading={submitting}>
          {isEditing ? 'Guardar cambios' : 'Crear doctor'}
        </Button>
      </div>
    </form>
  );
}
