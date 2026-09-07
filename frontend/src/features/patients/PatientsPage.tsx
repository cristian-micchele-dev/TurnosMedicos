import { useEffect, useState } from 'react';
import { patientsApi, type Patient } from '../../api/patients';
import { usersApi, type UserListItem } from '../../api/users';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../auth/AuthContext';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { PatientForm } from './PatientForm';
import styles from './PatientsPage.module.css';

export function PatientsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined>(undefined);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const [data, usersData] = await Promise.all([
        patientsApi.findAll(),
        usersApi.findAll(),
      ]);
      setPatients(data);
      setUsers(usersData);
    } catch {
      toast.error('Error al cargar los pacientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

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

  const handleSubmit = async (data: {
    userId?: string;
    phone?: string;
    dateOfBirth?: string;
    address?: string;
    insuranceNumber?: string;
  }) => {
    if (selectedPatient) {
      await patientsApi.update(selectedPatient.id, {
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        address: data.address,
        insuranceNumber: data.insuranceNumber,
      });
      toast.success('Paciente actualizado correctamente');
    } else {
      await patientsApi.create({
        userId: data.userId!,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        address: data.address,
        insuranceNumber: data.insuranceNumber,
      });
      toast.success('Paciente creado correctamente');
    }
    handleCloseModal();
    await fetchPatients();
  };

  const isAdmin = user?.role === 'ADMIN';

  const columns = [
    {
      key: 'name',
      header: 'Nombre',
      render: (p: Patient) => (
        <span className={styles.nameCell}>{p.user?.name ?? '—'}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (p: Patient) => (
        <span className={styles.emailCell}>{p.user?.email ?? '—'}</span>
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
        {isAdmin && (
          <Button variant="primary" onClick={handleOpenCreate}>
            + Nuevo Paciente
          </Button>
        )}
      </header>

      <div className={styles.tableContainer}>
        <Table
          columns={columns}
          data={patients}
          keyExtractor={(p) => p.id}
          loading={loading}
          emptyMessage="No hay pacientes registrados"
          onRowClick={isAdmin ? handleOpenEdit : undefined}
        />
      </div>

      {isAdmin && (
        <Modal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          title={selectedPatient ? 'Editar Paciente' : 'Nuevo Paciente'}
          size="md"
        >
          <PatientForm
            patient={selectedPatient}
            users={users}
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
          />
        </Modal>
      )}
    </div>
  );
}
