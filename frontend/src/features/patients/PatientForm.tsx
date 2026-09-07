import { useState, type FormEvent } from 'react';
import type { Patient } from '../../api/patients';
import type { UserListItem } from '../../api/users';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import styles from './PatientForm.module.css';

interface PatientFormProps {
  patient?: Patient;
  users: UserListItem[];
  onSubmit: (data: {
    userId?: string;
    phone?: string;
    dateOfBirth?: string;
    address?: string;
    insuranceNumber?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function PatientForm({ patient, users, onSubmit, onCancel }: PatientFormProps) {
  const isEditing = Boolean(patient);

  const [userId, setUserId] = useState('');
  const [phone, setPhone] = useState(patient?.phone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(patient?.dateOfBirth ?? '');
  const [address, setAddress] = useState(patient?.address ?? '');
  const [insuranceNumber, setInsuranceNumber] = useState(patient?.insuranceNumber ?? '');
  const [userIdError, setUserIdError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const userOptions = users
    .filter((u) => u.active)
    .map((u) => ({ value: u.id, label: u.name ? `${u.name} (${u.email})` : u.email }));

  const validate = () => {
    if (!isEditing && !userId) {
      setUserIdError('Seleccioná un usuario');
      return false;
    }
    setUserIdError('');
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      await onSubmit({
        userId: isEditing ? undefined : userId.trim(),
        phone: phone.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        address: address.trim() || undefined,
        insuranceNumber: insuranceNumber.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.fields}>
        {!isEditing && (
          <Select
            label="Usuario"
            options={userOptions}
            value={userId}
            onChange={(val) => {
              setUserId(val);
              if (userIdError) setUserIdError('');
            }}
            placeholder="Seleccionar usuario"
            error={userIdError}
          />
        )}

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
      </div>

      <div className={styles.footer}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" isLoading={submitting}>
          {isEditing ? 'Guardar cambios' : 'Crear paciente'}
        </Button>
      </div>
    </form>
  );
}
