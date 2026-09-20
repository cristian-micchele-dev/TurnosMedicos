import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorsApi, type Doctor } from '../../api/doctors';
import { specialtiesApi, type Specialty } from '../../api/specialties';
import { usersApi, type UserListItem, type PaginatedResponse } from '../../api/users';
import { useToast } from '../../hooks/useToast';
import { useFetch } from '../../hooks/useFetch';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { DoctorForm } from './DoctorForm';
import styles from './DoctorsPage.module.css';

export function DoctorsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: result, loading: loadingDoctors, refetch: refetchDoctors } = useFetch<PaginatedResponse<Doctor>>(
    ['doctors', page],
    () => doctorsApi.findAll(page),
  );
  const doctors = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;

  const { data: specialtiesResult, loading: loadingSpecialties } = useFetch<PaginatedResponse<Specialty>>(
    ['specialties', 'all'],
    () => specialtiesApi.findAll(1, 100),
  );
  const specialties = specialtiesResult?.data ?? [];

  const { data: usersResult, loading: loadingUsers } = useFetch<PaginatedResponse<UserListItem>>(
    ['users', 'all'],
    () => usersApi.findAll(1, 100),
  );
  const users = usersResult?.data ?? [];

  const loading = loadingDoctors || loadingSpecialties || loadingUsers;

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | undefined>(undefined);

  const handleOpenCreate = () => {
    setSelectedDoctor(undefined);
    setModalOpen(true);
  };

  const handleOpenEdit = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedDoctor(undefined);
  };

  const handleSubmit = async (data: {
    userId: string;
    specialtyId: string;
    licenseNumber: string;
    phone?: string;
  }) => {
    if (selectedDoctor) {
      await doctorsApi.update(selectedDoctor.id, {
        phone: data.phone,
        specialtyId: data.specialtyId,
      });
      toast.success('Doctor actualizado correctamente');
    } else {
      await doctorsApi.create(data);
      toast.success('Doctor creado correctamente');
    }
    handleCloseModal();
    await refetchDoctors();
  };

  const handleDelete = async (doctor: Doctor) => {
    const name = doctor.user?.name ?? `Doctor ${doctor.licenseNumber}`;
    const confirmed = window.confirm(
      `¿Confirmar eliminación de "${name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    try {
      await doctorsApi.update(doctor.id, { active: false });
      toast.success('Doctor desactivado correctamente');
      await refetchDoctors();
    } catch {
      toast.error('Error al desactivar el doctor');
    }
  };

  const filteredDoctors = doctors.filter((d) => {
    const term = search.toLowerCase();
    const name = d.user?.name?.toLowerCase() ?? '';
    const email = d.user?.email?.toLowerCase() ?? '';
    const specialty = d.specialty?.name?.toLowerCase() ?? '';
    return name.includes(term) || email.includes(term) || specialty.includes(term);
  });

  const columns = [
    {
      key: 'name',
      header: 'Nombre',
      render: (d: Doctor) => (
        <span className={styles.nameCell}>{d.user?.name ?? '—'}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (d: Doctor) => (
        <span className={styles.emailCell}>{d.user?.email ?? '—'}</span>
      ),
    },
    {
      key: 'specialty',
      header: 'Especialidad',
      render: (d: Doctor) => (
        <span className={styles.specialtyCell}>{d.specialty?.name ?? '—'}</span>
      ),
    },
    {
      key: 'licenseNumber',
      header: 'Matrícula',
      width: '120px',
      render: (d: Doctor) => (
        <span className={styles.licenseCell}>{d.licenseNumber}</span>
      ),
    },
    {
      key: 'active',
      header: 'Estado',
      width: '110px',
      render: (d: Doctor) =>
        d.active ? (
          <Badge variant="success">Activo</Badge>
        ) : (
          <Badge variant="neutral">Inactivo</Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: '200px',
      render: (d: Doctor) => (
        <div className={styles.actions}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/doctores/${d.id}/availability`);
            }}
          >
            Horarios
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(d);
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
              handleDelete(d);
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
          <h1 className={styles.title}>Doctores</h1>
          <p className={styles.subtitle}>Gestioná el plantel médico del sistema</p>
        </div>
        <div className={styles.headerActions}>
          <input
            className={styles.searchBar}
            type="search"
            placeholder="Buscar por nombre o especialidad..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <Button variant="primary" onClick={handleOpenCreate}>
            + Nuevo Doctor
          </Button>
        </div>
      </header>

      <div className={styles.tableContainer}>
        <Table
          columns={columns}
          data={filteredDoctors}
          keyExtractor={(d) => d.id}
          loading={loading}
          emptyMessage="No hay doctores registrados"
        />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={selectedDoctor ? 'Editar Doctor' : 'Nuevo Doctor'}
        size="md"
      >
        <DoctorForm
          doctor={selectedDoctor}
          specialties={specialties ?? []}
          users={users ?? []}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
