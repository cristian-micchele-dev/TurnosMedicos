import { useState, type FormEvent } from 'react';
import type { Patient } from '../../api/patients';
import type { UserListItem } from '../../api/users';
import { usersApi } from '../../api/users';
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
    notes?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function PatientForm({ patient, users, onSubmit, onCancel }: PatientFormProps) {
  const isEditing = Boolean(patient);

  const [mode, setMode] = useState<'existing' | 'new'>('new');
  const [userId, setUserId] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [phone, setPhone] = useState(patient?.phone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(patient?.dateOfBirth ?? '');
  const [address, setAddress] = useState(patient?.address ?? '');
  const [insuranceNumber, setInsuranceNumber] = useState(patient?.insuranceNumber ?? '');
  const [notes, setNotes] = useState(patient?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const userOptions = users
    .filter((u) => u.active)
    .map((u) => ({ value: u.id, label: u.name ? `${u.name} (${u.email})` : u.email }));

  const validate = () => {
    const next: Record<string, string> = {};
    if (!isEditing) {
      if (mode === 'existing' && !userId) {
        next.userId = 'Seleccioná un usuario';
      }
      if (mode === 'new') {
        if (!newEmail.trim()) next.email = 'El email es requerido';
        if (newPassword.length < 8) next.password = 'Mínimo 8 caracteres';
      }
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
          role: 'PATIENT',
        });
        finalUserId = created.id;
      }

      await onSubmit({
        userId: isEditing ? undefined : finalUserId,
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
                  placeholder="Nombre completo del paciente"
                />
                <Input
                  label="Email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  error={errors.email}
                  placeholder="paciente@email.com"
                  required
                />
                <Input
                  label="Contraseña"
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  error={errors.password}
                  placeholder="Mínimo 8 caracteres"
                  required
                />
              </>
            ) : (
              <Select
                label="Usuario"
                options={userOptions}
                value={userId}
                onChange={(val) => {
                  setUserId(val);
                  if (errors.userId) setErrors((prev) => ({ ...prev, userId: '' }));
                }}
                placeholder="Seleccionar usuario"
                error={errors.userId}
              />
            )}
          </>
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
