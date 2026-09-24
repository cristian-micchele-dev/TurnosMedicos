import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Image, Printer, Trash2 } from 'lucide-react';
import { reportsApi, type MedicalReport } from '../../api/reports';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { apiErrorMessage } from '../../api/client';
import { formatDate, formatFileSize } from './format';
import styles from './AppointmentDetailModal.module.css';

interface MedicalReportsSectionProps {
  appointmentId: string;
  /** Sólo el médico tratante, y sólo sobre un turno ya atendido. */
  canUpload: boolean;
  /**
   * Id del PERFIL médico de quien mira —no el de su cuenta—, o null si no es
   * médico. Se borra el informe propio, no el del colega.
   */
  myDoctorId: string | null;
}

/**
 * Los informes de un turno: lo que hay, y —si es tu paciente— subir uno más.
 *
 * Vive fuera del modal porque es la mitad de una historia clínica: tiene su
 * propia carga, su propio formulario y sus propios permisos.
 */
export function MedicalReportsSection({ appointmentId, canUpload, myDoctorId }: MedicalReportsSectionProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setLoading(true);
    reportsApi.findByAppointment(appointmentId)
      .then(setReports)
      .catch(() => toast.error('No se pudieron cargar los informes'))
      .finally(() => setLoading(false));
  }, [appointmentId, toast]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    const formData = new FormData();
    formData.append('title', title.trim());
    if (description.trim()) formData.append('description', description.trim());
    formData.append('file', file);

    try {
      setUploading(true);
      const report = await reportsApi.upload(appointmentId, formData);
      setReports((prev) => [...prev, report]);
      setTitle('');
      setDescription('');
      setFile(null);
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

  const handleDelete = async (reportId: string) => {
    try {
      await reportsApi.delete(reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast.success('Informe eliminado');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al eliminar el informe'));
    }
  };

  return (
    <div className={styles.reportsSection}>
      <span className={styles.reportsSectionTitle}>Informes Medicos</span>

      {loading && <p className={styles.reportsEmpty}>Cargando informes...</p>}

      {!loading && reports.length === 0 && (
        <p className={styles.reportsEmpty}>No hay informes para este turno.</p>
      )}

      {!loading && reports.length > 0 && (
        <div className={styles.reportsList}>
          {reports.map((report) => {
            const isImage = report.mimeType.startsWith('image/');
            const isOwner = myDoctorId !== null && myDoctorId === report.doctorId;
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
                      onClick={() => handleDelete(report.id)}
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

      {canUpload && (
        <form className={styles.uploadForm} onSubmit={handleUpload}>
          <div className={styles.uploadField}>
            <label htmlFor="report-title" className={styles.infoLabel}>
              Titulo <span className={styles.required}>*</span>
            </label>
            <input
              id="report-title"
              type="text"
              className={styles.uploadInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>
          <div className={styles.uploadActions}>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={uploading}
              disabled={!file || !title.trim()}
            >
              Subir informe
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
