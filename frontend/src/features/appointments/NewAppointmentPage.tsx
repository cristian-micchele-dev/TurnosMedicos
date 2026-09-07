import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { specialtiesApi, type Specialty } from '../../api/specialties';
import { doctorsApi, type Doctor, type Availability } from '../../api/doctors';
import { appointmentsApi } from '../../api/appointments';
import { patientsApi } from '../../api/patients';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import styles from './NewAppointmentPage.module.css';

type Step = 1 | 2 | 3 | 4;

function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function formatDisplayDate(iso: string): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

/** Build time slots from availability blocks for a given date */
function buildSlots(availability: Availability[], date: string): string[] {
  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  const slots: string[] = [];

  for (const block of availability) {
    if (block.dayOfWeek !== dayOfWeek) continue;

    const [startH, startM] = block.startTime.split(':').map(Number);
    const [endH, endM] = block.endTime.split(':').map(Number);

    let current = startH * 60 + startM;
    const end = endH * 60 + endM;

    while (current + block.slotDuration <= end) {
      const h = String(Math.floor(current / 60)).padStart(2, '0');
      const m = String(current % 60).padStart(2, '0');
      slots.push(`${h}:${m}`);
      current += block.slotDuration;
    }
  }

  return slots;
}

const STEP_LABELS: Record<Step, string> = {
  1: 'Especialidad',
  2: 'Doctor',
  3: 'Horario',
  4: 'Confirmar',
};

export function NewAppointmentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(true);
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null);

  // Step 2
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  // Step 3
  const [selectedDate, setSelectedDate] = useState(getTomorrowDate());
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [allSlots, setAllSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Patient id
  const [patientId, setPatientId] = useState<string | null>(null);

  useEffect(() => {
    specialtiesApi.findAll().then((data) => {
      setSpecialties(data.filter((s) => s.active));
      setSpecialtiesLoading(false);
    });

    if (user?.role === 'PATIENT') {
      patientsApi.me().then((p) => setPatientId(p.id)).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (step !== 2) return;
    setDoctorsLoading(true);
    doctorsApi.findAll().then((data) => {
      setAllDoctors(data.filter((d) => d.active));
      setDoctorsLoading(false);
    });
  }, [step]);

  const filteredDoctors = selectedSpecialty
    ? allDoctors.filter((d) => d.specialtyId === selectedSpecialty.id)
    : allDoctors;

  const loadSlots = async (doctorId: string, date: string) => {
    setAvailabilityLoading(true);
    setAllSlots([]);
    setBookedSlots(new Set());
    setSelectedTime(null);

    try {
      const [avail, existingAppts] = await Promise.all([
        doctorsApi.getAvailability(doctorId, date),
        appointmentsApi.findAll({ doctorId, from: date, to: date }),
      ]);

      const slots = buildSlots(avail, date);
      setAllSlots(slots);

      const booked = new Set(
        existingAppts
          .filter((a) => a.status !== 'CANCELLED')
          .map((a) => {
            const d = new Date(a.dateTime);
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          }),
      );
      setBookedSlots(booked);
    } catch {
      toast.error('Error al cargar los horarios disponibles');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  useEffect(() => {
    if (step === 3 && selectedDoctor && selectedDate) {
      loadSlots(selectedDoctor.id, selectedDate);
    }
  }, [step, selectedDoctor, selectedDate]);

  const handleConfirm = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) return;

    const dateTime = `${selectedDate}T${selectedTime}:00`;

    let resolvedPatientId = patientId;

    if (user?.role === 'ADMIN' && !resolvedPatientId) {
      toast.error('No se encontró el paciente para asociar el turno');
      return;
    }

    if (!resolvedPatientId) {
      try {
        const patient = await patientsApi.me();
        resolvedPatientId = patient.id;
      } catch {
        toast.error('Necesitás completar tu perfil antes de sacar un turno');
        return;
      }
    }

    try {
      setSubmitting(true);
      await appointmentsApi.create({
        doctorId: selectedDoctor.id,
        patientId: resolvedPatientId,
        dateTime,
      });
      toast.success('Turno solicitado correctamente');
      navigate('/appointments');
    } catch {
      toast.error('Error al solicitar el turno');
    } finally {
      setSubmitting(false);
    }
  };

  const goToStep = (s: Step) => {
    if (s < step) setStep(s);
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Nuevo Turno</h1>
          <p className={styles.subtitle}>Seleccioná especialidad, doctor y horario</p>
        </div>
      </header>

      {/* Stepper */}
      <div className={styles.stepper}>
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <div key={s} className={styles.stepItem}>
            <button
              className={[
                styles.stepCircle,
                step === s ? styles.stepActive : '',
                step > s ? styles.stepDone : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => goToStep(s)}
              disabled={s >= step}
              type="button"
              aria-current={step === s ? 'step' : undefined}
            >
              {step > s ? '✓' : s}
            </button>
            <span
              className={[
                styles.stepLabel,
                step === s ? styles.stepLabelActive : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {STEP_LABELS[s]}
            </span>
            {s < 4 && <div className={[styles.stepLine, step > s ? styles.stepLineDone : ''].filter(Boolean).join(' ')} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className={styles.card}>
        {/* STEP 1 — Especialidad */}
        {step === 1 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Elegí la especialidad</h2>
            {specialtiesLoading ? (
              <div className={styles.centered}><Spinner /></div>
            ) : specialties.length === 0 ? (
              <p className={styles.emptyMsg}>No hay especialidades disponibles.</p>
            ) : (
              <div className={styles.cardGrid}>
                {specialties.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={[
                      styles.optionCard,
                      selectedSpecialty?.id === s.id ? styles.optionCardSelected : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setSelectedSpecialty(s)}
                  >
                    <span className={styles.optionIcon}>🏥</span>
                    <span className={styles.optionName}>{s.name}</span>
                    {s.description && (
                      <span className={styles.optionDesc}>{s.description}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className={styles.stepFooter}>
              <Button
                variant="primary"
                disabled={!selectedSpecialty}
                onClick={() => setStep(2)}
              >
                Siguiente →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2 — Doctor */}
        {step === 2 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>
              Elegí un doctor
              {selectedSpecialty && (
                <span className={styles.stepSubtitle}> · {selectedSpecialty.name}</span>
              )}
            </h2>
            {doctorsLoading ? (
              <div className={styles.centered}><Spinner /></div>
            ) : filteredDoctors.length === 0 ? (
              <p className={styles.emptyMsg}>No hay doctores disponibles para esta especialidad.</p>
            ) : (
              <div className={styles.cardGrid}>
                {filteredDoctors.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={[
                      styles.optionCard,
                      selectedDoctor?.id === d.id ? styles.optionCardSelected : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setSelectedDoctor(d)}
                  >
                    <span className={styles.optionIcon}>👨‍⚕️</span>
                    <span className={styles.optionName}>{d.user?.name ?? '—'}</span>
                    <span className={styles.optionDesc}>
                      Mat. {d.licenseNumber}
                    </span>
                    {d.phone && (
                      <span className={styles.optionDesc}>{d.phone}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className={styles.stepFooter}>
              <Button variant="secondary" onClick={() => setStep(1)}>
                ← Volver
              </Button>
              <Button
                variant="primary"
                disabled={!selectedDoctor}
                onClick={() => setStep(3)}
              >
                Siguiente →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3 — Horario */}
        {step === 3 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Seleccioná fecha y horario</h2>

            <div className={styles.datePicker}>
              <label htmlFor="appt-date" className={styles.fieldLabel}>
                Fecha del turno
              </label>
              <input
                id="appt-date"
                type="date"
                className={styles.dateInput}
                value={selectedDate}
                min={getTomorrowDate()}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            {availabilityLoading ? (
              <div className={styles.centered}><Spinner /></div>
            ) : allSlots.length === 0 ? (
              <div className={styles.noSlots}>
                <span className={styles.noSlotsIcon}>📅</span>
                <p>El doctor no tiene disponibilidad para esta fecha.</p>
                <p className={styles.noSlotsHint}>Probá con otro día de la semana.</p>
              </div>
            ) : (
              <>
                <p className={styles.slotsLabel}>Horarios disponibles para el {formatDisplayDate(selectedDate)}</p>
                <div className={styles.slotsGrid}>
                  {allSlots.map((time) => {
                    const isBooked = bookedSlots.has(time);
                    return (
                      <button
                        key={time}
                        type="button"
                        disabled={isBooked}
                        className={[
                          styles.slot,
                          isBooked ? styles.slotBooked : '',
                          selectedTime === time ? styles.slotSelected : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => !isBooked && setSelectedTime(time)}
                      >
                        {time}
                        {isBooked && <span className={styles.slotTag}>Ocupado</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className={styles.stepFooter}>
              <Button variant="secondary" onClick={() => setStep(2)}>
                ← Volver
              </Button>
              <Button
                variant="primary"
                disabled={!selectedTime}
                onClick={() => setStep(4)}
              >
                Siguiente →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4 — Confirmar */}
        {step === 4 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Confirmá tu turno</h2>
            <p className={styles.stepHint}>
              Revisá los datos antes de confirmar. Una vez solicitado, el turno quedará pendiente de confirmación.
            </p>

            <div className={styles.summaryCard}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Especialidad</span>
                <span className={styles.summaryValue}>{selectedSpecialty?.name}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Doctor</span>
                <span className={styles.summaryValue}>{selectedDoctor?.user?.name}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Matrícula</span>
                <span className={styles.summaryValue}>{selectedDoctor?.licenseNumber}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Fecha</span>
                <span className={styles.summaryValue}>{formatDisplayDate(selectedDate)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Hora</span>
                <span className={styles.summaryValue}>{selectedTime}</span>
              </div>
            </div>

            <div className={styles.stepFooter}>
              <Button variant="secondary" onClick={() => setStep(3)} disabled={submitting}>
                ← Volver
              </Button>
              <Button variant="primary" isLoading={submitting} onClick={handleConfirm}>
                Confirmar Turno
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
