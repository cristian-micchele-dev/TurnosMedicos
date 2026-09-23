import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Image, Trash2, Printer, Plus, X } from 'lucide-react';
import type { Appointment, AppointmentStatus } from '../../api/appointments';
import { appointmentsApi } from '../../api/appointments';
import { reportsApi, type MedicalReport } from '../../api/reports';
import { prescriptionsApi, type Prescription, type Medication } from '../../api/prescriptions';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useMyDoctor } from '../../hooks/useMyDoctor';
import { useFetch } from '../../hooks/useFetch';
import { commentsApi, MAX_COMMENT_LENGTH, type AppointmentComment } from '../../api/comments';
import { useToast } from '../../hooks/useToast';
import { generateAppointmentPdf } from '../../utils/generateAppointmentPdf';
import { generatePrescriptionPdf } from '../../utils/generatePrescriptionPdf';
import styles from './AppointmentDetailModal.module.css';
import { apiErrorMessage } from '../../api/client';

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
    completeData?: { diagnosis?: string; notes?: string },
  ) => Promise<void>;
  role: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

  // Coordination about THIS appointment. Visible to everyone who can see the
  // appointment — the front desk included, which is the whole point.
  const { data: comments, refetch: refetchComments } = useFetch<AppointmentComment[]>(
    ['appointment-comments', appointment.id],
    () => commentsApi.list(appointment.id),
  );
  const [commentDraft, setCommentDraft] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const sendComment = async () => {
    const body = commentDraft.trim();
    if (!body || sendingComment) return;
    setSendingComment(true);
    try {
      await commentsApi.add(appointment.id, body);
      setCommentDraft('');
      await refetchComments();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo enviar el comentario'));
    } finally {
      setSendingComment(false);
    }
  };
  const { toast } = useToast();

  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [completing, setCompleting] = useState(false);
  const [completeDiagnosis, setCompleteDiagnosis] = useState('');
  const [completeNotes, setCompleteNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [newDateTime, setNewDateTime] = useState('');

  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [rxMedications, setRxMedications] = useState<Medication[]>([
    { name: '', dosage: '', frequency: '', duration: '' },
  ]);
  const [rxInstructions, setRxInstructions] = useState('');
  const [rxSubmitting, setRxSubmitting] = useState(false);

  useEffect(() => {
    if (!canSeeRecords) return;
    setReportsLoading(true);
    reportsApi.findByAppointment(appointment.id)
      .then(setReports)
      .catch(() => toast.error('No se pudieron cargar los informes'))
      .finally(() => setReportsLoading(false));
  }, [appointment.id, toast, canSeeRecords]);

  useEffect(() => {
    if (!canSeeRecords) return;
    setPrescriptionsLoading(true);
    prescriptionsApi.findByAppointment(appointment.id)
      .then(setPrescriptions)
      .catch(() => toast.error('No se pudieron cargar las recetas'))
      .finally(() => setPrescriptionsLoading(false));
  }, [appointment.id, toast, canSeeRecords]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle.trim()) return;

    const formData = new FormData();
    formData.append('title', uploadTitle.trim());
    if (uploadDescription.trim()) formData.append('description', uploadDescription.trim());
    formData.append('file', uploadFile);

    try {
      setUploading(true);
      const report = await reportsApi.upload(appointment.id, formData);
      setReports((prev) => [...prev, report]);
      setUploadTitle('');
      setUploadDescription('');
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Informe subido correctamente');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al subir el informe'));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (report: MedicalReport) => {
    try {
      await reportsApi.download(report);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al descargar el informe'));
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      await reportsApi.delete(reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast.success('Informe eliminado');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al eliminar el informe'));
    }
  };

  const handleRxMedChange = (index: number, field: keyof Medication, value: string) => {
    setRxMedications((prev) => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const handleRxAddMed = () => {
    setRxMedications((prev) => [...prev, { name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const handleRxRemoveMed = (index: number) => {
    setRxMedications((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validMeds = rxMedications.filter(
      (m) => m.name.trim() && m.dosage.trim() && m.frequency.trim() && m.duration.trim(),
    );
    if (validMeds.length === 0) return;

    try {
      setRxSubmitting(true);
      const created = await prescriptionsApi.create(appointment.id, {
        medications: validMeds,
        instructions: rxInstructions.trim() || undefined,
      });
      setPrescriptions((prev) => [created, ...prev]);
      setShowPrescriptionForm(false);
      setRxMedications([{ name: '', dosage: '', frequency: '', duration: '' }]);
      setRxInstructions('');
      toast.success('Receta creada correctamente');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al crear la receta'));
    } finally {
      setRxSubmitting(false);
    }
  };

  const handleDownloadPrescription = (prescription: Prescription) => {
    generatePrescriptionPdf({
      prescription,
      doctorName: appointment.doctor?.user?.name ?? '—',
      doctorLicense: appointment.doctor?.licenseNumber ?? '—',
      patientName: appointment.patient?.name ?? '—',
    });
  };

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

        {/* Coordinación interna */}
        <div className={styles.reportsSection}>
          <span className={styles.reportsSectionTitle}>Coordinación</span>
          <p className={styles.threadWarning}>
            Interno del equipo — no escribas información clínica acá.
          </p>

          {(comments ?? []).length === 0 ? (
            <p className={styles.reportsEmpty}>
              Sin comentarios. Usalo para coordinar este turno: “¿lo muevo?”, “llega tarde”, “confirmado por teléfono”.
            </p>
          ) : (
            <ul className={styles.thread}>
              {(comments ?? []).map((c) => (
                <li key={c.id} className={styles.threadItem}>
                  <div className={styles.threadHead}>
                    <span className={styles.threadAuthor}>{c.author.name}</span>
                    <span className={styles.threadTime}>
                      {new Date(c.createdAt).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={styles.threadBody}>{c.body}</p>
                </li>
              ))}
            </ul>
          )}

          <div className={styles.threadForm}>
            <textarea
              className={styles.threadInput}
              aria-label="Escribir un comentario"
              placeholder="Escribí un comentario para el equipo…"
              maxLength={MAX_COMMENT_LENGTH}
              rows={2}
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
            />
            <div className={styles.threadActions}>
              <span className={styles.threadCount}>{commentDraft.length}/{MAX_COMMENT_LENGTH}</span>
              <Button size="sm" isLoading={sendingComment} onClick={() => { void sendComment(); }}>
                Enviar
              </Button>
            </div>
          </div>
        </div>

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

        {/* Informes medicos */}
        <div className={styles.reportsSection}>
          <span className={styles.reportsSectionTitle}>Informes Medicos</span>

          {reportsLoading && (
            <p className={styles.reportsEmpty}>Cargando informes...</p>
          )}

          {!reportsLoading && reports.length === 0 && (
            <p className={styles.reportsEmpty}>No hay informes para este turno.</p>
          )}

          {!reportsLoading && reports.length > 0 && (
            <div className={styles.reportsList}>
              {reports.map((report) => {
                const isImage = report.mimeType.startsWith('image/');
                const isOwner = role === 'DOCTOR' && myDoctor?.id === report.doctorId;
                return (
                  <div key={report.id} className={styles.reportItem}>
                    <div className={`${styles.reportIcon} ${isImage ? styles.reportIconImage : styles.reportIconPdf}`}>
                      {isImage ? <Image size={18} /> : <FileText size={18} />}
                    </div>
                    <div className={styles.reportInfo}>
                      <span className={styles.reportTitle}>{report.title}</span>
                      <span className={styles.reportFilename}>{report.originalName}</span>
                      <span className={styles.reportMeta}>
                        {formatFileSize(report.sizeBytes)} &middot; {formatDate(report.createdAt)}
                      </span>
                    </div>
                    <div className={styles.reportActions}>
                      <button
                        className={styles.reportActionBtn}
                        onClick={() => handleDownload(report)}
                        title="Descargar"
                        type="button"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        className={styles.reportActionBtn}
                        onClick={() => reportsApi.print(report)}
                        title="Imprimir"
                        type="button"
                      >
                        <Printer size={16} />
                      </button>
                      {isOwner && (
                        <button
                          className={`${styles.reportActionBtn} ${styles.reportActionBtnDanger}`}
                          onClick={() => handleDeleteReport(report.id)}
                          title="Eliminar"
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {canUploadReport && (
            <form className={styles.uploadForm} onSubmit={handleUpload}>
              <div className={styles.uploadField}>
                <label htmlFor="report-title" className={styles.infoLabel}>
                  Titulo <span className={styles.required}>*</span>
                </label>
                <input
                  id="report-title"
                  type="text"
                  className={styles.uploadInput}
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Nombre del informe"
                  required
                />
              </div>
              <div className={styles.uploadField}>
                <label htmlFor="report-description" className={styles.infoLabel}>
                  Descripcion <span className={styles.optional}>(opcional)</span>
                </label>
                <textarea
                  id="report-description"
                  className={styles.textarea}
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Descripcion del informe..."
                  rows={2}
                />
              </div>
              <div className={styles.uploadField}>
                <label htmlFor="report-file" className={styles.infoLabel}>
                  Archivo <span className={styles.required}>*</span>
                </label>
                <input
                  ref={fileInputRef}
                  id="report-file"
                  type="file"
                  className={styles.fileInput}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  required
                />
              </div>
              <div className={styles.uploadActions}>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={uploading}
                  disabled={!uploadFile || !uploadTitle.trim()}
                >
                  Subir informe
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Recetas */}
        <div className={styles.reportsSection}>
          <div className={styles.prescriptionsSectionHeader}>
            <span className={styles.reportsSectionTitle}>Recetas</span>
            {canCreatePrescription && !showPrescriptionForm && (
              <button
                type="button"
                className={styles.prescriptionNewBtn}
                onClick={() => setShowPrescriptionForm(true)}
              >
                <Plus size={14} />
                Nueva Receta
              </button>
            )}
          </div>

          {prescriptionsLoading && (
            <p className={styles.reportsEmpty}>Cargando recetas...</p>
          )}

          {!prescriptionsLoading && prescriptions.length === 0 && !showPrescriptionForm && (
            <p className={styles.reportsEmpty}>No hay recetas para este turno.</p>
          )}

          {!prescriptionsLoading && prescriptions.length > 0 && (
            <div className={styles.reportsList}>
              {prescriptions.map((rx) => (
                <div key={rx.id} className={styles.reportItem}>
                  <div className={`${styles.reportIcon} ${styles.reportIconPdf}`}>
                    <FileText size={18} />
                  </div>
                  <div className={styles.reportInfo}>
                    <span className={styles.reportTitle}>
                      {rx.medications.length} medicamento{rx.medications.length !== 1 ? 's' : ''}
                    </span>
                    <span className={styles.reportFilename}>
                      {rx.medications.map((m) => m.name).join(', ')}
                    </span>
                    <span className={styles.reportMeta}>{formatDate(rx.createdAt)}</span>
                  </div>
                  <div className={styles.reportActions}>
                    <button
                      className={styles.reportActionBtn}
                      onClick={() => handleDownloadPrescription(rx)}
                      title="Descargar PDF"
                      type="button"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showPrescriptionForm && (
            <form className={styles.uploadForm} onSubmit={handleRxSubmit}>
              <div className={styles.prescriptionMedsList}>
                {rxMedications.map((med, idx) => (
                  <div key={idx} className={styles.prescriptionMedRow}>
                    <div className={styles.prescriptionMedFields}>
                      <input
                        type="text"
                        className={styles.uploadInput}
                        placeholder="Medicamento *"
                        value={med.name}
                        onChange={(e) => handleRxMedChange(idx, 'name', e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        className={styles.uploadInput}
                        placeholder="Dosis *"
                        value={med.dosage}
                        onChange={(e) => handleRxMedChange(idx, 'dosage', e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        className={styles.uploadInput}
                        placeholder="Frecuencia *"
                        value={med.frequency}
                        onChange={(e) => handleRxMedChange(idx, 'frequency', e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        className={styles.uploadInput}
                        placeholder="Duración *"
                        value={med.duration}
                        onChange={(e) => handleRxMedChange(idx, 'duration', e.target.value)}
                        required
                      />
                    </div>
                    {rxMedications.length > 1 && (
                      <button
                        type="button"
                        className={styles.prescriptionRemoveBtn}
                        onClick={() => handleRxRemoveMed(idx)}
                        title="Eliminar medicamento"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className={styles.prescriptionAddMedBtn}
                onClick={handleRxAddMed}
              >
                <Plus size={14} />
                Agregar medicamento
              </button>

              <div className={styles.uploadField}>
                <label className={styles.infoLabel}>
                  Instrucciones <span className={styles.optional}>(opcional)</span>
                </label>
                <textarea
                  className={styles.textareaPrimary}
                  value={rxInstructions}
                  onChange={(e) => setRxInstructions(e.target.value)}
                  placeholder="Instrucciones adicionales para el paciente..."
                  rows={2}
                  maxLength={1000}
                />
              </div>

              <div className={styles.cancelActions}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowPrescriptionForm(false);
                    setRxMedications([{ name: '', dosage: '', frequency: '', duration: '' }]);
                    setRxInstructions('');
                  }}
                  disabled={rxSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={rxSubmitting}
                >
                  Guardar receta
                </Button>
              </div>
            </form>
          )}
        </div>
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
                onClick={() => generateAppointmentPdf(appointment)}
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
