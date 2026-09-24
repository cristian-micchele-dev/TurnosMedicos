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
import { useAuth } from '../../context/AuthContext';
import { Copy, KeyRound } from 'lucide-react';
import styles from './UsersPage.module.css';
import { apiErrorMessage } from '../../api/client';
import { MIN_PASSWORD_LENGTH, PASSWORD_HINT } from '../../utils/password';

const ROLE_LABELS: Record<UserListItem['role'], string> = {
  ADMIN: 'Admin',
  DOCTOR: 'Doctor',
  SECRETARY: 'Secretaría',
};

const ROLE_OPTIONS: { value: UserListItem['role']; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'SECRETARY', label: 'Secretaría' },
];

/**
 * Nadie se administra a sí mismo, y el backend lo rechaza igual.
 *
 * No es sólo evitar un error: es lo que garantiza que siempre quede un
 * administrador. Si nadie puede sacarse el rol ni desactivarse, el último admin
 * es justamente el que no tiene quién se lo haga.
 */
const AUTOGESTION = 'Sobre tu propia cuenta no podés: pedíselo a otro administrador.';

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
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al actualizar el rol'));
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
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al cambiar el estado del usuario'));
    } finally {
      setUpdatingId(null);
    }
  };

  const { user: me } = useAuth();
  const [tempCredential, setTempCredential] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleResetPassword = async (target: UserListItem) => {
    const ok = await confirm({
      title: 'Resetear contraseña',
      message: `Se va a generar una clave temporal para ${target.email}. Sus sesiones activas se cierran y va a tener que elegir una contraseña nueva al entrar.`,
      confirmLabel: 'Generar clave temporal',
      variant: 'danger',
    });
    if (!ok) return;
    setUpdatingId(target.id);
    try {
      const { temporaryPassword } = await usersApi.resetPassword(target.id);
      setCopied(false);
      setTempCredential({ email: target.email, password: temporaryPassword });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo resetear la contraseña'));
    } finally {
      setUpdatingId(null);
    }
  };

  const copyTemp = async () => {
    if (!tempCredential) return;
    try {
      await navigator.clipboard.writeText(tempCredential.password);
      setCopied(true);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo copiar. Seleccioná el texto manualmente.'));
    }
  };

  const handleUserCreated = (newUser: UserListItem) => {
    setUsers((prev) => [newUser, ...prev]);
    setShowCreateModal(false);
    toast.success(`Usuario ${newUser.email} creado`);
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
      sortable: true,
      render: (u: UserListItem) => (
        <span className={styles.emailCell}>{u.email}</span>
      ),
    },
    {
      key: 'name',
      header: 'Nombre',
      sortable: true,
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
            disabled={updatingId === u.id || u.id === me?.id}
            title={u.id === me?.id ? AUTOGESTION : undefined}
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
          disabled={updatingId === u.id || u.id === me?.id}
          onClick={(e) => {
            e.stopPropagation();
            handleToggleActive(u);
          }}
          aria-label={u.active ? 'Desactivar usuario' : 'Activar usuario'}
          title={u.id === me?.id ? AUTOGESTION : u.active ? 'Clic para desactivar' : 'Clic para activar'}
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
      sortable: true,
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
    {
      key: 'actions',
      header: 'Acciones',
      width: '170px',
      align: 'right' as const,
      hideUntilHover: true,
      render: (u: UserListItem) => (
        <Button
          variant="ghost"
          size="sm"
          disabled={updatingId === u.id || u.id === me?.id}
          title={u.id === me?.id ? AUTOGESTION : undefined}
          onClick={(ev) => { ev.stopPropagation(); handleResetPassword(u); }}
        >
          <KeyRound size={14} aria-hidden /> Resetear clave
        </Button>
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
          filtered={search.trim().length > 0 || roleFilter !== ''}
          total={fetchedResult?.total}
          page={page}
          empty={{
            title: 'Todavía no hay usuarios',
            description: 'Solo el personal tiene cuenta: administradores y médicos.',
            action: { label: '+ Nuevo usuario', onClick: () => setShowCreateModal(true) },
          }}
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

      <Modal
        isOpen={tempCredential !== null}
        onClose={() => setTempCredential(null)}
        title="Clave temporal generada"
        size="sm"
      >
        {tempCredential && (
          <div className={styles.tempBox}>
            <p className={styles.tempIntro}>
              Entregásela a <strong>{tempCredential.email}</strong> por un canal seguro. Al entrar va a tener que reemplazarla.
            </p>
            <div className={styles.tempRow}>
              <code className={styles.tempCode}>{tempCredential.password}</code>
              <Button variant="secondary" size="sm" onClick={copyTemp}>
                <Copy size={14} aria-hidden /> {copied ? 'Copiada' : 'Copiar'}
              </Button>
            </div>
            <p className={styles.tempWarning}>Se muestra una sola vez. Si la perdés, generá otra.</p>
            <div className={styles.tempFooter}>
              <Button variant="primary" onClick={() => setTempCredential(null)}>Listo</Button>
            </div>
          </div>
        )}
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
  const [role, setRole] = useState<UserListItem['role']>('DOCTOR');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = 'El email es requerido.';
    if (password.length < MIN_PASSWORD_LENGTH) next.password = `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
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
        placeholder={PASSWORD_HINT}
        autoComplete="new-password"
        required
        error={errors.password}
      />

      <Select
        label="Rol"
        required
        id="new-user-role"
        value={role}
        onChange={(value) => setRole(value as UserListItem['role'])}
        options={[
          { value: 'DOCTOR', label: 'Doctor' },
          { value: 'SECRETARY', label: 'Secretaría' },
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
