import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doctorsApi, type Doctor, type AvailabilitySlot } from '../../api/doctors';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import styles from './AvailabilityPage.module.css';

const DAY_NAMES: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

const DAY_OPTIONS = [
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' },
  { value: '0', label: 'Domingo' },
];

const DURATION_OPTIONS = [
  { value: '15', label: '15 minutos' },
  { value: '20', label: '20 minutos' },
  { value: '30', label: '30 minutos' },
  { value: '45', label: '45 minutos' },
  { value: '60', label: '1 hora' },
];

interface SlotRow extends AvailabilitySlot {
  _id: string; // local key for React
}

interface SlotFormState {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDuration: string;
}

interface SlotErrors {
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
}

const EMPTY_FORM: SlotFormState = {
  dayOfWeek: '',
  startTime: '',
  endTime: '',
  slotDuration: '30',
};

let localIdCounter = 0;
const nextId = () => `slot-${++localIdCounter}`;

export function AvailabilityPage() {
  const { id: doctorId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SlotFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<SlotErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!doctorId) return;
    const load = async () => {
      try {
        setLoading(true);
        const [doctorData, availability] = await Promise.all([
          doctorsApi.findOne(doctorId),
          doctorsApi.getAvailability(doctorId),
        ]);
        setDoctor(doctorData);
        setSlots(
          availability.map((a) => ({
            _id: nextId(),
            dayOfWeek: a.dayOfWeek,
            startTime: a.startTime,
            endTime: a.endTime,
            slotDuration: a.slotDuration,
          })),
        );
      } catch {
        toast.error('Error al cargar la disponibilidad');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [doctorId]);

  const validateForm = (): boolean => {
    const errs: SlotErrors = {};
    if (!form.dayOfWeek) errs.dayOfWeek = 'Seleccioná un día';
    if (!form.startTime) errs.startTime = 'Ingresá la hora de inicio';
    if (!form.endTime) errs.endTime = 'Ingresá la hora de fin';
    else if (form.startTime && form.endTime >= form.startTime === false) {
      errs.endTime = 'La hora de fin debe ser posterior al inicio';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddSlot = () => {
    if (!validateForm()) return;

    const newSlot: SlotRow = {
      _id: editingId ?? nextId(),
      dayOfWeek: Number(form.dayOfWeek),
      startTime: form.startTime,
      endTime: form.endTime,
      slotDuration: Number(form.slotDuration),
    };

    if (editingId) {
      setSlots((prev) => prev.map((s) => (s._id === editingId ? newSlot : s)));
      setEditingId(null);
    } else {
      setSlots((prev) => [...prev, newSlot]);
    }

    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowForm(false);
  };

  const handleEditSlot = (slot: SlotRow) => {
    setForm({
      dayOfWeek: String(slot.dayOfWeek),
      startTime: slot.startTime,
      endTime: slot.endTime,
      slotDuration: String(slot.slotDuration),
    });
    setEditingId(slot._id);
    setShowForm(true);
  };

  const handleRemoveSlot = (id: string) => {
    setSlots((prev) => prev.filter((s) => s._id !== id));
  };

  const handleCancelForm = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!doctorId) return;
    try {
      setSaving(true);
      const payload: AvailabilitySlot[] = slots.map(({ dayOfWeek, startTime, endTime, slotDuration }) => ({
        dayOfWeek,
        startTime,
        endTime,
        slotDuration,
      }));
      await doctorsApi.setAvailability(doctorId, payload);
      toast.success('Disponibilidad guardada correctamente');
    } catch {
      toast.error('Error al guardar la disponibilidad');
    } finally {
      setSaving(false);
    }
  };

  const sortedSlots = [...slots].sort((a, b) => {
    const dayDiff = a.dayOfWeek - b.dayOfWeek;
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <span className={styles.spinner} />
          <p>Cargando disponibilidad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => navigate('/doctors')}>
            ← Volver
          </button>
          <div>
            <h1 className={styles.title}>Disponibilidad Semanal</h1>
            {doctor && (
              <p className={styles.subtitle}>
                {doctor.user?.name ?? `Matrícula: ${doctor.licenseNumber}`}
                {doctor.specialty && (
                  <span className={styles.specialtyTag}>{doctor.specialty.name}</span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className={styles.headerActions}>
          {!showForm && (
            <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
              + Agregar Horario
            </Button>
          )}
          <Button variant="primary" onClick={handleSave} isLoading={saving} disabled={saving}>
            Guardar cambios
          </Button>
        </div>
      </header>

      {showForm && (
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>
            {editingId ? 'Editar horario' : 'Nuevo horario'}
          </h2>
          <div className={styles.formGrid}>
            <Select
              label="Día"
              options={DAY_OPTIONS}
              value={form.dayOfWeek}
              onChange={(val) => {
                setForm((prev) => ({ ...prev, dayOfWeek: val }));
                if (formErrors.dayOfWeek) setFormErrors((prev) => ({ ...prev, dayOfWeek: undefined }));
              }}
              placeholder="Seleccionar día"
              error={formErrors.dayOfWeek}
            />

            <Input
              label="Hora de inicio"
              type="time"
              value={form.startTime}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, startTime: e.target.value }));
                if (formErrors.startTime) setFormErrors((prev) => ({ ...prev, startTime: undefined }));
              }}
              error={formErrors.startTime}
            />

            <Input
              label="Hora de fin"
              type="time"
              value={form.endTime}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, endTime: e.target.value }));
                if (formErrors.endTime) setFormErrors((prev) => ({ ...prev, endTime: undefined }));
              }}
              error={formErrors.endTime}
            />

            <Select
              label="Duración del turno"
              options={DURATION_OPTIONS}
              value={form.slotDuration}
              onChange={(val) => setForm((prev) => ({ ...prev, slotDuration: val }))}
            />
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" size="sm" onClick={handleCancelForm}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddSlot}>
              {editingId ? 'Actualizar' : 'Agregar'}
            </Button>
          </div>
        </div>
      )}

      {sortedSlots.length === 0 ? (
        <div className={styles.emptyWrapper}>
          <EmptyState
            icon="📅"
            title="Sin horarios configurados"
            description="Agregá los horarios de atención para que los pacientes puedan reservar turnos."
            action={{ label: '+ Agregar Horario', onClick: () => setShowForm(true) }}
          />
        </div>
      ) : (
        <div className={styles.scheduleContainer}>
          <div className={styles.scheduleHeader}>
            <span>Día</span>
            <span>Inicio</span>
            <span>Fin</span>
            <span>Duración por turno</span>
            <span>Acciones</span>
          </div>

          {sortedSlots.map((slot) => (
            <div key={slot._id} className={styles.scheduleRow}>
              <span className={styles.dayName}>{DAY_NAMES[slot.dayOfWeek]}</span>
              <span className={styles.timeValue}>{slot.startTime}</span>
              <span className={styles.timeValue}>{slot.endTime}</span>
              <span className={styles.durationValue}>{slot.slotDuration} min</span>
              <div className={styles.rowActions}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditSlot(slot)}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={styles.removeBtn}
                  onClick={() => handleRemoveSlot(slot._id)}
                >
                  Quitar
                </Button>
              </div>
            </div>
          ))}

          <div className={styles.scheduleFooter}>
            <span className={styles.slotCount}>
              {sortedSlots.length} {sortedSlots.length === 1 ? 'horario' : 'horarios'} configurado{sortedSlots.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
