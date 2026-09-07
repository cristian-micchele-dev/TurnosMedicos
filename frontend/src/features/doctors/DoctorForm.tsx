import { useState, type FormEvent } from 'react';
import type { Doctor } from '../../api/doctors';
import type { Specialty } from '../../api/specialties';
import type { UserListItem } from '../../api/users';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import styles from './DoctorForm.module.css';

interface DoctorFormProps {
  doctor?: Doctor;
  specialties: Specialty[];
  users: UserListItem[];
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
  specialtyId?: string;
  licenseNumber?: string;
}

export function DoctorForm({ doctor, specialties, users, onSubmit, onCancel }: DoctorFormProps) {
  const isEditing = Boolean(doctor);

  const [userId, setUserId] = useState(doctor?.userId ?? '');
  const [specialtyId, setSpecialtyId] = useState(doctor?.specialtyId ?? '');
  const [licenseNumber, setLicenseNumber] = useState(doctor?.licenseNumber ?? '');
  const [phone, setPhone] = useState(doctor?.phone ?? '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const userOptions = users
    .filter((u) => u.active)
    .map((u) => ({ value: u.id, label: u.name ? `${u.name} (${u.email})` : u.email }));

  const specialtyOptions = specialties
    .filter((s) => s.active)
    .map((s) => ({ value: s.id, label: s.name }));

  const validate = (): boolean => {
    const next: FormErrors = {};

    if (!isEditing && !userId) {
      next.userId = 'Seleccioná un usuario';
    }
    if (!specialtyId) {
      next.specialtyId = 'Seleccioná una especialidad';
    }
    if (!isEditing && !licenseNumber.trim()) {
      next.licenseNumber = 'La matrícula es obligatoria';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      await onSubmit({
        userId: userId.trim(),
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
            <Select
              label="Usuario"
              options={userOptions}
              value={userId}
              onChange={(val) => {
                setUserId(val);
                if (errors.userId) setErrors((prev) => ({ ...prev, userId: undefined }));
              }}
              placeholder="Seleccionar usuario"
              error={errors.userId}
            />

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
