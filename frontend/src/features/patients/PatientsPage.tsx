import { useState } from 'react';
import { patientsApi, type Patient, type PatientInput } from '../../api/patients';
import type { PaginatedResponse } from '../../api/users';
import { useToast } from '../../hooks/useToast';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { PatientForm } from './PatientForm';
import styles from './PatientsPage.module.css';

export function PatientsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: result, loading, refetch: refetchPatients } = useFetch<PaginatedResponse<Patient>>(
    ['patients', page],
    () => patientsApi.findAll(page),
  );
  const patients = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined>(undefined);

  const handleOpenCreate = () => {
    setSelectedPatient(undefined);
    setModalOpen(true);
  };

  const handleOpenEdit = (patient: Patient) => {
    setSelectedPatient(patient);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedPatient(undefined);
  };

  const handleSubmit = async (data: PatientInput) => {
    if (selectedPatient) {
      await patientsApi.update(selectedPatient.id, data);
      toast.success(`Paciente ${data.name} actualizado`);
    } else {
      await patientsApi.create(data);
      toast.success(`Paciente ${data.name} creado`);
    }
    handleCloseModal();
    await refetchPatients();
  };

  const isAdmin = user?.role === 'ADMIN';

  const filteredPatients = patients.filter((p) => {
    const term = search.toLowerCase();
    const name = p.name.toLowerCase();
    const email = p.email?.toLowerCase() ?? '';
    return name.includes(term) || email.includes(term);
  });

  const columns = [
    {
      key: 'name',
      header: 'Nombre',
      sortable: true,
      render: (p: Patient) => (
        <span className={styles.nameCell}>{p.name}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (p: Patient) => (
        <span className={styles.emailCell}>{p.email ?? '—'}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Teléfono',
      render: (p: Patient) => (
        <span className={styles.secondaryCell}>{p.phone ?? '—'}</span>
      ),
    },
    {
      key: 'insuranceNumber',
      header: 'Obra Social',
      render: (p: Patient) => (
        <span className={styles.secondaryCell}>{p.insuranceNumber ?? '—'}</span>
      ),
    },
    {
      key: 'notes',
      header: 'Notas',
      render: (p: Patient) => (
        <span className={styles.notesCell}>{p.notes ?? '—'}</span>
      ),
    },
    {
      key: 'active',
      header: 'Estado',
      width: '120px',
      render: (p: Patient) =>
        p.active ? (
          <Badge variant="success">Activo</Badge>
        ) : (
          <Badge variant="neutral">Inactivo</Badge>
        ),
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: 'Acciones',
            hideUntilHover: true,
            align: 'right' as const,
            width: '120px',
            render: (p: Patient) => (
              <div className={styles.actions}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(p);
                  }}
                >
                  Editar
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Pacientes</h1>
          <p className={styles.subtitle}>
            {isAdmin
              ? 'Gestioná los pacientes registrados en el sistema'
              : 'Listado de pacientes'}
          </p>
        </div>
        <div className={styles.headerActions}>
          <input
            className={styles.searchBar}
            type="search"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {isAdmin && (
            <Button variant="primary" onClick={handleOpenCreate}>
              + Nuevo Paciente
            </Button>
          )}
        </div>
      </header>

      <div className={styles.tableContainer}>
        <Table
          columns={columns}
          data={filteredPatients}
          keyExtractor={(p) => p.id}
          loading={loading}
          filtered={search.trim().length > 0}
          total={result?.total}
          page={page}
          empty={{
            title: 'Todavía no hay pacientes',
            description: 'El paciente es un registro del hospital: cargalo con nombre y datos de contacto.',
            ...(isAdmin ? { action: { label: '+ Nuevo paciente', onClick: handleOpenCreate } } : {}),
          }}
          onRowClick={isAdmin ? handleOpenEdit : undefined}
        />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {isAdmin && (
        <Modal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          title={selectedPatient ? 'Editar Paciente' : 'Nuevo Paciente'}
          size="md"
        >
          <PatientForm
            patient={selectedPatient}            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
          />
        </Modal>
      )}
    </div>
  );
}
