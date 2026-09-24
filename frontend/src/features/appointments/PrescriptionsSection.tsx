import { useEffect, useState } from 'react';
import { Download, FileText, Plus, X } from 'lucide-react';
import { prescriptionsApi, type Medication, type Prescription } from '../../api/prescriptions';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { apiErrorMessage } from '../../api/client';
import { formatDate } from './format';
import styles from './AppointmentDetailModal.module.css';

const MEDICAMENTO_VACIO: Medication = { name: '', dosage: '', frequency: '', duration: '' };

interface PrescriptionsSectionProps {
  appointmentId: string;
  /** Sólo el médico tratante, y sólo sobre un turno ya atendido. */
  canCreate: boolean;
  /** Quién firma la receta y para quién es: va impreso en el PDF. */
  doctorName: string;
  doctorLicense: string;
  patientName: string;
}

/**
 * Las recetas de un turno: las emitidas, y —si es tu paciente— una nueva.
 *
 * El generador de PDF se importa recién al tocar "descargar": arrastra jsPDF y
 * html2canvas, que son cientos de kilobytes que nadie necesita para MIRAR un
 * turno.
 */
export function PrescriptionsSection({
  appointmentId,
  canCreate,
  doctorName,
  doctorLicense,
  patientName,
}: PrescriptionsSectionProps) {
  const { toast } = useToast();

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([{ ...MEDICAMENTO_VACIO }]);
  const [instructions, setInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    prescriptionsApi.findByAppointment(appointmentId)
      .then(setPrescriptions)
      .catch(() => toast.error('No se pudieron cargar las recetas'))
      .finally(() => setLoading(false));
  }, [appointmentId, toast]);

  const resetForm = () => {
    setShowForm(false);
    setMedications([{ ...MEDICAMENTO_VACIO }]);
    setInstructions('');
  };

  const handleMedChange = (index: number, field: keyof Medication, value: string) => {
    setMedications((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validMeds = medications.filter(
      (m) => m.name.trim() && m.dosage.trim() && m.frequency.trim() && m.duration.trim(),
    );
    if (validMeds.length === 0) return;

    try {
      setSubmitting(true);
      const created = await prescriptionsApi.create(appointmentId, {
        medications: validMeds,
        instructions: instructions.trim() || undefined,
      });
      setPrescriptions((prev) => [created, ...prev]);
      resetForm();
      toast.success('Receta creada correctamente');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al crear la receta'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (prescription: Prescription) => {
    const { generatePrescriptionPdf } = await import('../../utils/generatePrescriptionPdf');
    generatePrescriptionPdf({ prescription, doctorName, doctorLicense, patientName });
  };

  return (
    <div className={styles.reportsSection}>
      <div className={styles.prescriptionsSectionHeader}>
        <span className={styles.reportsSectionTitle}>Recetas</span>
        {canCreate && !showForm && (
          <button type="button" className={styles.prescriptionNewBtn} onClick={() => setShowForm(true)}>
            <Plus size={14} />
            Nueva Receta
          </button>
        )}
      </div>

      {loading && <p className={styles.reportsEmpty}>Cargando recetas...</p>}

      {!loading && prescriptions.length === 0 && !showForm && (
        <p className={styles.reportsEmpty}>No hay recetas para este turno.</p>
      )}

      {!loading && prescriptions.length > 0 && (
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
                  onClick={() => handleDownload(rx)}
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

      {showForm && (
        <form className={styles.uploadForm} onSubmit={handleSubmit}>
          <div className={styles.prescriptionMedsList}>
            {medications.map((med, idx) => (
              <div key={idx} className={styles.prescriptionMedRow}>
                <div className={styles.prescriptionMedFields}>
                  <input
                    type="text"
                    className={styles.uploadInput}
                    placeholder="Medicamento *"
                    value={med.name}
                    onChange={(e) => handleMedChange(idx, 'name', e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className={styles.uploadInput}
                    placeholder="Dosis *"
                    value={med.dosage}
                    onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className={styles.uploadInput}
                    placeholder="Frecuencia *"
                    value={med.frequency}
                    onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className={styles.uploadInput}
                    placeholder="Duración *"
                    value={med.duration}
                    onChange={(e) => handleMedChange(idx, 'duration', e.target.value)}
                    required
                  />
                </div>
                {medications.length > 1 && (
                  <button
                    type="button"
                    className={styles.prescriptionRemoveBtn}
                    onClick={() => setMedications((prev) => prev.filter((_, i) => i !== idx))}
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
            onClick={() => setMedications((prev) => [...prev, { ...MEDICAMENTO_VACIO }])}
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
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Instrucciones adicionales para el paciente..."
              rows={2}
              maxLength={1000}
            />
          </div>

          <div className={styles.cancelActions}>
            <Button type="button" variant="secondary" size="sm" onClick={resetForm} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              Guardar receta
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
