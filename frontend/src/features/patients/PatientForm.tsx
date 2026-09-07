import { useState, type FormEvent } from 'react';
import type { Patient } from '../../api/patients';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import styles from './PatientForm.module.css';

interface PatientFormProps {
  patient?: Patient;
  onSubmit: (data: {
    userId?: string;
    phone?: string;
    dateOfBirth?: string;
    address?: string;
    insuranceNumber?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function PatientForm({ patient, onSubmit, onCancel }: PatientFormProps) {
  const isEditing = Boolean(patient);

  const [userId, setUserId] = useState('');
  const [phone, setPhone] = useState(patient?.phone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(patient?.dateOfBirth ?? '');
  const [address, setAddress] = useState(patient?.address ?? '');
  const [insuranceNumber, setInsuranceNumber] = useState(patient?.insuranceNumber ?? '');
  const [userIdError, setUserIdError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    if (!isEditing && !userId.trim()) {
      setUserIdError('El ID de usuario es obligatorio para crear un paciente');
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
          <Input
            label="ID de Usuario"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              if (userIdError) setUserIdError('');
            }}
            error={userIdError}
            placeholder="UUID del usuario a vincular"
            required
            autoFocus
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
