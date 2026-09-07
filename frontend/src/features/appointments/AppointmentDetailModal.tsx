import { useState } from 'react';
import type { Appointment, AppointmentStatus } from '../../api/appointments';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import styles from './AppointmentDetailModal.module.css';

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

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
  ) => Promise<void>;
  role: string;
}

export function AppointmentDetailModal({
  appointment,
  onClose,
  onAction,
  role,
}: AppointmentDetailModalProps) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const statusCfg = STATUS_CONFIG[appointment.status];

  const handleAction = async (action: 'confirm' | 'cancel' | 'complete', reason?: string) => {
    try {
      setSubmitting(true);
      await onAction(action, appointment, reason);
    } finally {
      setSubmitting(false);
    }
  };

  const canConfirm =
    appointment.status === 'PENDING' && (role === 'ADMIN' || role === 'DOCTOR');
  const canComplete =
    appointment.status === 'CONFIRMED' && (role === 'ADMIN' || role === 'DOCTOR');
  const canCancel =
    appointment.status !== 'CANCELLED' &&
    appointment.status !== 'COMPLETED' &&
    (role === 'ADMIN' || role === 'PATIENT');

  return (
    <Modal isOpen onClose={onClose} title="Detalle del Turno" size="md">
      <div className={styles.content}>
        {/* Status */}
        <div className={styles.statusRow}>
          <Badge variant={statusCfg.variant} size="md">
            {statusCfg.label}
          </Badge>
        </div>

        {/* Info grid */}
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Paciente</span>
            <span className={styles.infoValue}>{appointment.patient?.user?.name ?? '—'}</span>
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

        {/* Main actions */}
        {!cancelling && (
          <div className={styles.footer}>
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cerrar
            </Button>
            <div className={styles.footerRight}>
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
                  isLoading={submitting}
                  onClick={() => handleAction('complete')}
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
