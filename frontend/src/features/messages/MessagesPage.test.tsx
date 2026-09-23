import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MessagesPage } from './MessagesPage';

const { auth, messagesApi, socket } = vi.hoisted(() => ({
  auth: { user: { id: 'u-sec', email: 'recepcion@turno.med', name: 'Marta Recepción', role: 'SECRETARY' as const, mustChangePassword: false } },
  messagesApi: { conversations: vi.fn(), contacts: vi.fn(), thread: vi.fn(), send: vi.fn(), unread: vi.fn() },
  socket: { on: vi.fn(), off: vi.fn() },
}));

vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../api/messages', () => ({ messagesApi, MAX_MESSAGE_LENGTH: 1000 }));
vi.mock('../../hooks/useSocket', () => ({ useSocket: () => socket }));
vi.mock('../../hooks/useToast', () => ({ useToast: () => ({ toast: { error: vi.fn(), info: vi.fn() } }) }));

const laura = { id: 'u-doc', name: 'Laura Gómez', role: 'DOCTOR' };

const conversations = [
  {
    counterpart: laura,
    lastMessage: { id: 'm2', senderId: 'u-doc', recipientId: 'u-sec', body: 'Dale, movelo', read: false, createdAt: '2026-09-23T12:05:00.000Z' },
    unread: 2,
  },
];

const thread = {
  counterpart: laura,
  data: [
    { id: 'm1', senderId: 'u-sec', recipientId: 'u-doc', body: '¿Te lo muevo?', read: true, createdAt: '2026-09-23T12:00:00.000Z' },
    { id: 'm2', senderId: 'u-doc', recipientId: 'u-sec', body: 'Dale, movelo', read: false, createdAt: '2026-09-23T12:05:00.000Z' },
  ],
  total: 2, page: 1, limit: 50, totalPages: 1,
};

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><MessagesPage /></MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  messagesApi.conversations.mockResolvedValue(conversations);
  messagesApi.contacts.mockResolvedValue([laura, { id: 'u-adm', name: 'Root Admin', role: 'ADMIN' }]);
  messagesApi.thread.mockResolvedValue(thread);
  messagesApi.send.mockResolvedValue({ id: 'm3', senderId: 'u-sec', recipientId: 'u-doc', body: 'ok', read: false, createdAt: '2026-09-23T12:10:00.000Z' });
  messagesApi.unread.mockResolvedValue({ unread: 2 });
});

describe('MessagesPage', () => {
  it('lista las conversaciones con su no leídos', async () => {
    renderPage();
    expect(await screen.findByText('Laura Gómez')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('al abrir una conversación muestra el hilo y distingue lo mío de lo suyo', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /laura gómez/i }));
    const list = await screen.findByRole('list', { name: /mensajes/i });
    const mine = within(list).getByText('¿Te lo muevo?');
    const theirs = within(list).getByText('Dale, movelo');
    expect(mine.closest('li')).toHaveAttribute('data-mine', 'true');
    expect(theirs.closest('li')).toHaveAttribute('data-mine', 'false');
  });

  it('enviar limpia el campo y recarga el hilo', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /laura gómez/i }));
    const box = await screen.findByLabelText(/escribir un mensaje/i);
    await userEvent.type(box, 'Perfecto');
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }));
    await waitFor(() => expect(messagesApi.send).toHaveBeenCalledWith('u-doc', 'Perfecto'));
    await waitFor(() => expect(box).toHaveValue(''));
  });

  it('no envía un mensaje vacío', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /laura gómez/i }));
    await screen.findByLabelText(/escribir un mensaje/i);
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }));
    expect(messagesApi.send).not.toHaveBeenCalled();
  });

  it('avisa que no es lugar para información clínica', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /laura gómez/i }));
    expect(await screen.findByText(/no escribas información clínica/i)).toBeInTheDocument();
  });

  it('se puede empezar una conversación con alguien del personal', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /nueva conversación/i }));
    const list = await screen.findByRole('listbox', { name: /personal/i });
    await userEvent.click(within(list).getByText('Root Admin'));
    await waitFor(() => expect(messagesApi.thread).toHaveBeenCalledWith('u-adm'));
  });

  it('sin conversaciones explica cómo empezar', async () => {
    messagesApi.conversations.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/todavía no hablaste con nadie/i)).toBeInTheDocument();
  });

  it('escucha el socket para que un mensaje entrante aparezca solo', async () => {
    renderPage();
    await screen.findByText('Laura Gómez');
    expect(socket.on).toHaveBeenCalledWith('message', expect.any(Function));
  });
});
