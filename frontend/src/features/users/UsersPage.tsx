import { useEffect, useState } from 'react';
import { usersApi, type UserListItem } from '../../api/users';
import { useToast } from '../../hooks/useToast';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import styles from './UsersPage.module.css';

const ROLE_LABELS: Record<UserListItem['role'], string> = {
  ADMIN: 'Admin',
  DOCTOR: 'Doctor',
  PATIENT: 'Paciente',
};

const ROLE_OPTIONS: { value: UserListItem['role']; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'PATIENT', label: 'Paciente' },
];

export function UsersPage() {
  const { toast } = useToast();

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await usersApi.findAll();
      setUsers(data);
    } catch {
      toast.error('Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleChange = async (user: UserListItem, newRole: string) => {
    if (newRole === user.role) return;
    setUpdatingId(user.id);
    try {
      const updated = await usersApi.updateRole(user.id, newRole);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast.success(`Rol actualizado a ${ROLE_LABELS[updated.role]}`);
    } catch {
      toast.error('Error al actualizar el rol');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (user: UserListItem) => {
    setUpdatingId(user.id);
    try {
      const updated = await usersApi.toggleActive(user.id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      const label = updated.active ? 'activado' : 'desactivado';
      toast.success(`Usuario ${label} correctamente`);
    } catch {
      toast.error('Error al cambiar el estado del usuario');
    } finally {
      setUpdatingId(null);
    }
  };

  const columns = [
    {
      key: 'email',
      header: 'Email',
      render: (u: UserListItem) => (
        <span className={styles.emailCell}>{u.email}</span>
      ),
    },
    {
      key: 'role',
      header: 'Rol',
      width: '200px',
      render: (u: UserListItem) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Badge
            variant={
              u.role === 'ADMIN'
                ? 'danger'
                : u.role === 'DOCTOR'
                  ? 'primary'
                  : 'neutral'
            }
            size="sm"
          >
            {ROLE_LABELS[u.role]}
          </Badge>
          <select
            className={styles.roleSelect}
            value={u.role}
            disabled={updatingId === u.id}
            onChange={(e) => {
              e.stopPropagation();
              handleRoleChange(u, e.target.value);
            }}
            aria-label={`Cambiar rol de ${u.email}`}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Estado',
      width: '110px',
      render: (u: UserListItem) => (
        <button
          className={styles.activeToggle}
          disabled={updatingId === u.id}
          onClick={(e) => {
            e.stopPropagation();
            handleToggleActive(u);
          }}
          aria-label={u.active ? 'Desactivar usuario' : 'Activar usuario'}
          title={u.active ? 'Clic para desactivar' : 'Clic para activar'}
        >
          {u.active ? (
            <Badge variant="success">Activo</Badge>
          ) : (
            <Badge variant="neutral">Inactivo</Badge>
          )}
        </button>
      ),
    },
    {
      key: 'createdAt',
      header: 'Fecha de registro',
      width: '160px',
      render: (u: UserListItem) => (
        <span className={styles.dateCell}>
          {new Date(u.createdAt).toLocaleDateString('es-AR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Usuarios</h1>
          <p className={styles.subtitle}>Gestioná roles y acceso de los usuarios del sistema</p>
        </div>
      </header>

      <div className={styles.tableContainer}>
        <Table
          columns={columns}
          data={users}
          keyExtractor={(u) => u.id}
          loading={loading}
          emptyMessage="No hay usuarios registrados"
        />
      </div>
    </div>
  );
}
