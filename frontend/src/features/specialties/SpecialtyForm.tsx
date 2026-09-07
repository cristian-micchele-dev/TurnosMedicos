import { useState, type FormEvent } from 'react';
import type { Specialty } from '../../api/specialties';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import styles from './SpecialtyForm.module.css';

interface SpecialtyFormProps {
  specialty?: Specialty;
  onSubmit: (data: { name: string; description?: string }) => Promise<void>;
  onCancel: () => void;
}

export function SpecialtyForm({ specialty, onSubmit, onCancel }: SpecialtyFormProps) {
  const [name, setName] = useState(specialty?.name ?? '');
  const [description, setDescription] = useState(specialty?.description ?? '');
  const [nameError, setNameError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(specialty);

  const validate = () => {
    if (!name.trim()) {
      setNameError('El nombre es obligatorio');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.fields}>
        <Input
          label="Nombre"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError('');
          }}
          error={nameError}
          placeholder="Ej: Cardiología"
          required
          autoFocus
        />

        <div className={styles.fieldGroup}>
          <label htmlFor="specialty-description" className={styles.label}>
            Descripción <span className={styles.optional}>(opcional)</span>
          </label>
          <textarea
            id="specialty-description"
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción breve de la especialidad"
            rows={3}
          />
        </div>
      </div>

      <div className={styles.footer}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" isLoading={submitting}>
          {isEditing ? 'Guardar cambios' : 'Crear especialidad'}
        </Button>
      </div>
    </form>
  );
}
