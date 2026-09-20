import { useState } from 'react';
import { specialtiesApi, type Specialty } from '../../api/specialties';
import type { PaginatedResponse } from '../../api/users';
import { useToast } from '../../hooks/useToast';
import { useFetch } from '../../hooks/useFetch';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { SpecialtyForm } from './SpecialtyForm';
import styles from './SpecialtiesPage.module.css';

export function SpecialtiesPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data: result, loading, refetch } = useFetch<PaginatedResponse<Specialty>>(
    ['specialties', page],
    () => specialtiesApi.findAll(page),
  );
  const specialties = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;

  const filteredSpecialties = specialties.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | undefined>(undefined);

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
    await refetch();
  };

  const handleDelete = async (specialty: Specialty) => {
    const confirmed = window.confirm(
      `¿Confirmar eliminación de "${specialty.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    try {
      await specialtiesApi.remove(specialty.id);
      toast.success('Especialidad eliminada');
      await refetch();
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
        <div className={styles.headerActions}>
          <input
            className={styles.searchBar}
            type="search"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <Button variant="primary" onClick={handleOpenCreate}>
            + Nueva Especialidad
          </Button>
        </div>
      </header>

      <div className={styles.tableContainer}>
        <Table
          columns={columns}
          data={filteredSpecialties}
          keyExtractor={(s) => s.id}
          loading={loading}
          emptyMessage="No hay especialidades registradas"
        />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
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
