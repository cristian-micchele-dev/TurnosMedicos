import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, MessageSquare } from 'lucide-react';
import type { Appointment, AppointmentStatus } from '../../api/appointments';
import { appointmentsApi } from '../../api/appointments';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useMyDoctor } from '../../hooks/useMyDoctor';
import { useToast } from '../../hooks/useToast';
import { AppointmentNotes } from './AppointmentNotes';
import { MedicalReportsSection } from './MedicalReportsSection';
import { PrescriptionsSection } from './PrescriptionsSection';
import { formatDate, formatDateTime } from './format';
import styles from './AppointmentDetailModal.module.css';
import { apiErrorMessage } from '../../api/client';

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; variant: 'warning' | 'primary' | 'danger' | 'success' }
> = {
  PENDING: { label: 'Pendiente', variant: 'warning' },
  CONFIRMED: { label: 'Confirmado', variant: 'primary' },
  CANCELLED: { label: 'Cancelado', variant: 'danger' },
  COMPLETED: { label: 'Completado', variant: 'success' },
};

interface AppointmentDetailModalProps {
  appointment: Appointment;
  onClose: () => void;
  onAction: (
    action: 'confirm' | 'cancel' | 'complete',
    appointment: Appointment,
    reason?: string,
    completeData?: { diagnosis?: string; notes?: string },
  ) => Promise<void>;
  role: string;
}

export function AppointmentDetailModal({
  appointment,
  onClose,
  onAction,
  role,
}: AppointmentDetailModalProps) {
  // Ownership is a doctor-PROFILE id, not the account id in the JWT: the two are different rows.
  const { doctor: myDoctor } = useMyDoctor();
  const isTreatingDoctor = role === 'DOCTOR' && myDoctor?.id === appointment.doctorId;
  // The front desk schedules care; the chart — diagnosis, reports, prescriptions — is not theirs.
  const canSeeRecords = role !== 'SECRETARY';

  // Un turno del que hay que hablar: quién atiende, y de qué turno se trata.
  const doctorAccountId = appointment.doctor?.user?.id ?? null;
  const asunto = `${appointment.code} (${appointment.patient?.name ?? 'paciente'}, ${formatDate(appointment.dateTime)} ${new Date(appointment.dateTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })})`;

  /**
   * Lleva al chat con el pedido escrito, pero NO lo manda: el mensaje se lee y
   * se edita antes de salir. Un pedido que se envía solo es un pedido que nadie
   * revisó.
   */
  const pedir = (texto: string, para: { role?: string; to?: string }) => {
    const params = new URLSearchParams({ draft: texto });
    if (para.to) params.set('to', para.to);
    if (para.role) params.set('role', para.role);
    navigate(`/mensajes?${params}`);
  };

  const PEDIDOS = [
    { label: 'Reprogramar', texto: `Hola, ¿podés reprogramar el ${asunto}?` },
    { label: 'Cancelar', texto: `Hola, ¿podés cancelar el ${asunto}?` },
    { label: 'Otra cosa', texto: `Sobre el ${asunto}: ` },
  ];

  const navigate = useNavigate();
  const [askOpen, setAskOpen] = useState(false);
  const { toast } = useToast();

  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [completing, setCompleting] = useState(false);
  const [completeDiagnosis, setCompleteDiagnosis] = useState('');
  const [completeNotes, setCompleteNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [newDateTime, setNewDateTime] = useState('');

  const canUploadReport = isTreatingDoctor && appointment.status === 'COMPLETED';
  const canCreatePrescription = isTreatingDoctor && appointment.status === 'COMPLETED';

  const statusCfg = STATUS_CONFIG[appointment.status];

  const handleAction = async (
    action: 'confirm' | 'cancel' | 'complete',
    reason?: string,
    completeData?: { diagnosis?: string; notes?: string },
  ) => {
    try {
      setSubmitting(true);
      await onAction(action, appointment, reason, completeData);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDateTime) return;
    try {
      setSubmitting(true);
      await appointmentsApi.reschedule(appointment.id, new Date(newDateTime).toISOString());
      toast.success('Turno reprogramado correctamente');
      setRescheduling(false);
      setNewDateTime('');
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al reprogramar el turno'));
    } finally {
      setSubmitting(false);
    }
  };

  const canConfirm =
    appointment.status === 'PENDING' && (role === 'ADMIN' || role === 'DOCTOR' || role === 'SECRETARY');
  const canComplete =
    appointment.status === 'CONFIRMED' && (role === 'ADMIN' || role === 'DOCTOR');
  const canCancel =
    appointment.status !== 'CANCELLED' &&
    appointment.status !== 'COMPLETED' &&
    (role === 'ADMIN' || role === 'SECRETARY');
  const canReschedule =
    (appointment.status === 'PENDING' || appointment.status === 'CONFIRMED') &&
    (role === 'ADMIN' || role === 'DOCTOR' || role === 'SECRETARY');

  return (
    <Modal isOpen onClose={onClose} title="Detalle del Turno" size="md">
      <div className={styles.content}>
        {/* Code + Status */}
        <div className={styles.statusRow}>
          <span className={styles.appointmentCode}>{appointment.code}</span>
          <Badge variant={statusCfg.variant} size="md">
            {statusCfg.label}
          </Badge>
        </div>

        {/* Info grid */}
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Paciente</span>
            <span className={styles.infoValue}>{appointment.patient?.name ?? '—'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Doctor</span>
            <span className={styles.infoValue}>{appointment.doctor?.user?.name ?? '—'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Especialidad</span>
            <span className={styles.infoValue}>
              {appointment.doctor?.specialty?.name ?? '—'}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Fecha y Hora</span>
            <span className={styles.infoValue}>{formatDateTime(appointment.dateTime)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Duración</span>
            <span className={styles.infoValue}>{appointment.durationMinutes} minutos</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>N° de matrícula</span>
            <span className={styles.infoValue}>
              {appointment.doctor?.licenseNumber ?? '—'}
            </span>
          </div>
        </div>

        {/* Cancellation reason */}
        {appointment.cancellationReason && (
          <div className={styles.cancellationBox}>
            <span className={styles.cancellationLabel}>Motivo de cancelación</span>
            <p className={styles.cancellationText}>{appointment.cancellationReason}</p>
          </div>
        )}

        {/* Pedirle algo a la otra punta, sin salir a buscar la conversación */}
        <div className={styles.askRow}>
          {role === 'DOCTOR' ? (
            <div className={styles.askWrap}>
              <Button variant="secondary" size="sm" onClick={() => setAskOpen((o) => !o)} aria-expanded={askOpen}>
                <MessageSquare size={14} /> Pedir a secretaría
              </Button>
              {askOpen && (
                <div className={styles.askMenu} role="menu">
                  {PEDIDOS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      role="menuitem"
                      className={styles.askItem}
                      onClick={() => { setAskOpen(false); pedir(p.texto, { role: 'SECRETARY' }); }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            doctorAccountId && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => pedir(`Sobre el ${asunto}: `, { to: doctorAccountId })}
              >
                <MessageSquare size={14} /> Consultar al médico
              </Button>
            )
          )}
        </div>

        <AppointmentNotes appointmentId={appointment.id} />

        {canSeeRecords && (
          <>
        {/* Clinical notes / diagnosis (read-only display) */}
        {(appointment.diagnosis || appointment.notes) && (
          <div className={styles.clinicalBox}>
            {appointment.diagnosis && (
              <div>
                <span className={styles.clinicalLabel}>Diagnóstico</span>
                <p className={styles.clinicalText}>{appointment.diagnosis}</p>
              </div>
            )}
            {appointment.notes && (
              <div>
                <span className={styles.clinicalLabel}>Notas clínicas</span>
                <p className={styles.clinicalText}>{appointment.notes}</p>
              </div>
            )}
          </div>
        )}

        <MedicalReportsSection
          appointmentId={appointment.id}
          canUpload={canUploadReport}
          myDoctorId={role === 'DOCTOR' ? myDoctor?.id ?? null : null}
        />

        <PrescriptionsSection
          appointmentId={appointment.id}
          canCreate={canCreatePrescription}
          doctorName={appointment.doctor?.user?.name ?? '—'}
          doctorLicense={appointment.doctor?.licenseNumber ?? '—'}
          patientName={appointment.patient?.name ?? '—'}
        />
          </>
        )}

        {/* Reschedule flow */}
        {rescheduling && (
          <form className={styles.rescheduleBox} onSubmit={handleReschedule}>
            <label htmlFor="reschedule-datetime" className={styles.infoLabel}>
              Nueva fecha y hora
            </label>
            <input
              id="reschedule-datetime"
              type="datetime-local"
              className={styles.rescheduleInput}
              value={newDateTime}
              onChange={(e) => setNewDateTime(e.target.value)}
              required
            />
            <div className={styles.cancelActions}>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => {
                  setRescheduling(false);
                  setNewDateTime('');
                }}
                disabled={submitting}
              >
                Volver
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={submitting}
                disabled={!newDateTime}
              >
                Confirmar reprogramación
              </Button>
            </div>
          </form>
        )}

        {/* Cancel flow */}
        {cancelling && (
          <div className={styles.cancelBox}>
            <label htmlFor="cancel-reason" className={styles.infoLabel}>
              Motivo de cancelación <span className={styles.optional}>(opcional)</span>
            </label>
            <textarea
              id="cancel-reason"
              className={styles.textarea}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Describí el motivo de la cancelación..."
              rows={3}
            />
            <div className={styles.cancelActions}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setCancelling(false);
                  setCancelReason('');
                }}
                disabled={submitting}
              >
                Volver
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={submitting}
                onClick={() => handleAction('cancel', cancelReason.trim() || undefined)}
              >
                Confirmar cancelación
              </Button>
            </div>
          </div>
        )}

        {/* Complete flow */}
        {completing && (
          <div className={styles.completeBox}>
            <div className={styles.completeField}>
              <label htmlFor="complete-diagnosis" className={styles.infoLabel}>
                Diagnóstico <span className={styles.optional}>(opcional)</span>
              </label>
              <textarea
                id="complete-diagnosis"
                className={styles.textareaPrimary}
                value={completeDiagnosis}
                onChange={(e) => setCompleteDiagnosis(e.target.value)}
                placeholder="Diagnóstico del paciente..."
                rows={3}
                maxLength={2000}
              />
            </div>
            <div className={styles.completeField}>
              <label htmlFor="complete-notes" className={styles.infoLabel}>
                Notas clínicas <span className={styles.optional}>(opcional)</span>
              </label>
              <textarea
                id="complete-notes"
                className={styles.textareaPrimary}
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="Notas adicionales sobre la consulta..."
                rows={2}
                maxLength={500}
              />
            </div>
            <div className={styles.completeActions}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setCompleting(false);
                  setCompleteDiagnosis('');
                  setCompleteNotes('');
                }}
                disabled={submitting}
              >
                Volver
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={submitting}
                onClick={() =>
                  handleAction('complete', undefined, {
                    diagnosis: completeDiagnosis.trim() || undefined,
                    notes: completeNotes.trim() || undefined,
                  })
                }
              >
                Confirmar completado
              </Button>
            </div>
          </div>
        )}

        {/* Main actions */}
        {!cancelling && !completing && !rescheduling && (
          <div className={styles.footer}>
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cerrar
            </Button>
            <div className={styles.footerRight}>
              <button
                type="button"
                className={styles.downloadBtn}
                onClick={async () => {
                  const { generateAppointmentPdf } = await import('../../utils/generateAppointmentPdf');
                  generateAppointmentPdf(appointment);
                }}
              >
                <Download size={15} />
                Descargar comprobante
              </button>
              {canReschedule && (
                <Button
                  variant="secondary"
                  onClick={() => setRescheduling(true)}
                  disabled={submitting}
                >
                  Reprogramar
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="danger"
                  onClick={() => setCancelling(true)}
                  disabled={submitting}
                >
                  Cancelar turno
                </Button>
              )}
              {canConfirm && (
                <Button
                  variant="primary"
                  isLoading={submitting}
                  onClick={() => handleAction('confirm')}
                >
                  Confirmar turno
                </Button>
              )}
              {canComplete && (
                <Button
                  variant="primary"
                  disabled={submitting}
                  onClick={() => setCompleting(true)}
                >
                  Marcar como completado
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
