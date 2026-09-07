import { useEffect, useState } from 'react';
import { specialtiesApi, type Specialty } from '../../api/specialties';
import { useToast } from '../../hooks/useToast';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SpecialtyForm } from './SpecialtyForm';
import styles from './SpecialtiesPage.module.css';

export function SpecialtiesPage() {
  const { toast } = useToast();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | undefined>(undefined);

  const fetchSpecialties = async () => {
    try {
      setLoading(true);
      const data = await specialtiesApi.findAll();
      setSpecialties(data);
    } catch {
      toast.error('Error al cargar las especialidades');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecialties();
  }, []);

  const handleOpenCreate = () => {
    setSelectedSpecialty(undefined);
    setModalOpen(true);
  };

  const handleOpenEdit = (specialty: Specialty) => {
    setSelectedSpecialty(specialty);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedSpecialty(undefined);
  };

  const handleSubmit = async (data: { name: string; description?: string }) => {
    if (selectedSpecialty) {
      await specialtiesApi.update(selectedSpecialty.id, data);
      toast.success('Especialidad actualizada correctamente');
    } else {
      await specialtiesApi.create(data);
      toast.success('Especialidad creada correctamente');
    }
    handleCloseModal();
    await fetchSpecialties();
  };

  const handleDelete = async (specialty: Specialty) => {
    const confirmed = window.confirm(
      `¿Confirmar eliminación de "${specialty.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    try {
      await specialtiesApi.remove(specialty.id);
      toast.success('Especialidad eliminada');
      await fetchSpecialties();
    } catch {
      toast.error('Error al eliminar la especialidad');
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Nombre',
      render: (s: Specialty) => <span className={styles.nameCell}>{s.name}</span>,
    },
    {
      key: 'description',
      header: 'Descripción',
      render: (s: Specialty) => (
        <span className={styles.descriptionCell}>{s.description ?? '—'}</span>
      ),
    },
    {
      key: 'active',
      header: 'Estado',
      width: '120px',
      render: (s: Specialty) =>
        s.active ? (
          <Badge variant="success">Activa</Badge>
        ) : (
          <Badge variant="neutral">Inactiva</Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: '140px',
      render: (s: Specialty) => (
        <div className={styles.actions}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(s);
            }}
          >
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={styles.deleteBtn}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(s);
            }}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Especialidades</h1>
          <p className={styles.subtitle}>Gestioná las especialidades médicas del sistema</p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}>
          + Nueva Especialidad
        </Button>
      </header>

      <div className={styles.tableContainer}>
        <Table
          columns={columns}
          data={specialties}
          keyExtractor={(s) => s.id}
          loading={loading}
          emptyMessage="No hay especialidades registradas"
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={selectedSpecialty ? 'Editar Especialidad' : 'Nueva Especialidad'}
        size="sm"
      >
        <SpecialtyForm
          specialty={selectedSpecialty}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
