import { useState, type FormEvent } from 'react';
import type { Patient, PatientInput } from '../../api/patients';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import styles from './PatientForm.module.css';

interface PatientFormProps {
  patient?: Patient;
  /** Pre-fills the name when the form opens from a failed search. */
  initialName?: string;
  onSubmit: (data: PatientInput) => Promise<void>;
  onCancel: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PatientForm({ patient, initialName = '', onSubmit, onCancel }: PatientFormProps) {
  const isEditing = Boolean(patient);

  const [name, setName] = useState(patient?.name ?? initialName);
  const [email, setEmail] = useState(patient?.email ?? '');
  const [phone, setPhone] = useState(patient?.phone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(patient?.dateOfBirth ?? '');
  const [address, setAddress] = useState(patient?.address ?? '');
  const [insuranceNumber, setInsuranceNumber] = useState(patient?.insuranceNumber ?? '');
  const [notes, setNotes] = useState(patient?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Ingresá el nombre completo';
    if (email.trim() && !EMAIL_RE.test(email.trim())) next.email = 'Email inválido';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);
      await onSubmit({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        address: address.trim() || undefined,
        insuranceNumber: insuranceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.fields}>
        <Input
          label="Nombre completo"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
          }}
          error={errors.name}
          placeholder="Ej: Ana Pérez"
          required
        />

        <Input
          label="Email (opcional)"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
          }}
          error={errors.email}
          placeholder="paciente@email.com"
        />

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

        <div>
          <label className={styles.fieldLabel} htmlFor="notes">
            Notas médicas
          </label>
          <textarea
            id="notes"
            className={styles.notesTextarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Alergias, condiciones preexistentes, observaciones..."
          />
        </div>
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
