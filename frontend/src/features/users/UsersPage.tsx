import { useState, useEffect, type FormEvent } from 'react';
import { usersApi, type UserListItem, type PaginatedResponse } from '../../api/users';
import { useToast } from '../../hooks/useToast';
import { useFetch } from '../../hooks/useFetch';
import { useConfirm } from '../../hooks/useConfirm';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import styles from './UsersPage.module.css';

const ROLE_LABELS: Record<UserListItem['role'], string> = {
  ADMIN: 'Admin',
  DOCTOR: 'Doctor',
};

const ROLE_OPTIONS: { value: UserListItem['role']; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'DOCTOR', label: 'Doctor' },
];

export function UsersPage() {
  const { toast } = useToast();
  const { confirm, dialogProps, ConfirmDialog } = useConfirm();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserListItem['role'] | ''>('');

  const { data: fetchedResult, loading } = useFetch<PaginatedResponse<UserListItem>>(
    ['users', page],
    () => usersApi.findAll(page),
  );
  const [users, setUsers] = useState<UserListItem[]>([]);
  const totalPages = fetchedResult?.totalPages ?? 1;
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Sync fetched data into local state (needed for optimistic updates on role/toggle)
  useEffect(() => {
    if (fetchedResult) setUsers(fetchedResult.data);
  }, [fetchedResult]);

  const handleRoleChange = async (user: UserListItem, newRole: string) => {
    if (newRole === user.role) return;

    const newRoleLabel = ROLE_LABELS[newRole as UserListItem['role']] ?? newRole;
    const ok = await confirm({
      title: 'Cambiar rol',
      message: `¿Cambiar el rol de ${user.email} a ${newRoleLabel}?`,
      confirmLabel: 'Cambiar',
      variant: 'primary',
    });
    if (!ok) return;

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
    const isDeactivating = user.active;
    const ok = await confirm({
      title: isDeactivating ? 'Desactivar usuario' : 'Activar usuario',
      message: isDeactivating
        ? `¿Estás seguro de que querés desactivar a ${user.email}?`
        : `¿Querés activar nuevamente a ${user.email}?`,
      confirmLabel: isDeactivating ? 'Desactivar' : 'Activar',
      variant: isDeactivating ? 'danger' : 'primary',
    });
    if (!ok) return;

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

  const handleUserCreated = (newUser: UserListItem) => {
    setUsers((prev) => [newUser, ...prev]);
    setShowCreateModal(false);
    toast.success('Usuario creado correctamente');
  };

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    const matchesSearch =
      u.email.toLowerCase().includes(term) ||
      (u.name?.toLowerCase() ?? '').includes(term);
    const matchesRole = roleFilter === '' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const columns = [
    {
      key: 'email',
      header: 'Email',
      render: (u: UserListItem) => (
        <span className={styles.emailCell}>{u.email}</span>
      ),
    },
    {
      key: 'name',
      header: 'Nombre',
      render: (u: UserListItem) => (
        <span className={styles.emailCell}>{u.name || '—'}</span>
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
        <div className={styles.headerActions}>
          <input
            type="search"
            className={styles.searchBar}
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select
            className={styles.filterSelect}
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value as UserListItem['role'] | ''); setPage(1); }}
            aria-label="Filtrar por rol"
          >
            <option value="">Todos los roles</option>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            + Nuevo Usuario
          </Button>
        </div>
      </header>

      <div className={styles.tableContainer}>
        <Table
          columns={columns}
          data={filteredUsers}
          keyExtractor={(u) => u.id}
          loading={loading}
          emptyMessage="No hay usuarios registrados"
        />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear usuario"
        size="sm"
      >
        <CreateUserForm
          onSuccess={handleUserCreated}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

interface CreateUserFormProps {
  onSuccess: (user: UserListItem) => void;
  onCancel: () => void;
}

function CreateUserForm({ onSuccess, onCancel }: CreateUserFormProps) {
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'DOCTOR'>('DOCTOR');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = 'El email es requerido.';
    if (password.length < 8) next.password = 'Mínimo 8 caracteres.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const created = await usersApi.create({
        name: name.trim() || undefined,
        email,
        password,
        role,
      });
      onSuccess(created);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear el usuario';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.createForm}>
      <Input
        label="Nombre (opcional)"
        id="new-user-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre completo"
        autoComplete="off"
      />

      <Input
        label="Email"
        id="new-user-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="usuario@email.com"
        autoComplete="off"
        required
        error={errors.email}
      />

      <Input
        label="Contraseña"
        id="new-user-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mínimo 8 caracteres"
        autoComplete="new-password"
        required
        error={errors.password}
      />

      <Select
        label="Rol"
        id="new-user-role"
        value={role}
        onChange={(value) => setRole(value as 'ADMIN' | 'DOCTOR')}
        options={[
          { value: 'DOCTOR', label: 'Doctor' },
          { value: 'ADMIN', label: 'Admin' },
        ]}
      />

      <div className={styles.formActions}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" isLoading={submitting}>
          Crear Usuario
        </Button>
      </div>
    </form>
  );
}
