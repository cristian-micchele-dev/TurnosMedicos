import { useEffect, useRef, useState } from 'react';
import { MessageSquarePlus, Send } from 'lucide-react';
import { messagesApi, MAX_MESSAGE_LENGTH, type Contact, type Conversation, type Thread } from '../../api/messages';
import { apiErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { useSocket } from '../../hooks/useSocket';
import { useToast } from '../../hooks/useToast';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { TextWithCodes } from '../../components/ui/TextWithCodes';
import styles from './MessagesPage.module.css';

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', DOCTOR: 'Doctor', SECRETARY: 'Secretaría' };

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const today = new Date().toDateString() === date.toDateString();
  return today
    ? date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

export function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const socket = useSocket();

  const [openWith, setOpenWith] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations, refetch: refetchConversations } = useFetch<Conversation[]>(
    ['messages', 'conversations'],
    () => messagesApi.conversations(),
    { refetchInterval: 30_000, refetchOnWindowFocus: true, staleTime: 5_000 },
  );

  const { data: contacts } = useFetch<Contact[]>(['messages', 'contacts'], () => messagesApi.contacts());

  const { data: thread, refetch: refetchThread } = useFetch<Thread | null>(
    ['messages', 'thread', openWith ?? ''],
    () => (openWith ? messagesApi.thread(openWith) : Promise.resolve(null)),
    { refetchOnWindowFocus: true, staleTime: 5_000 },
  );

  // An incoming message must land without the reader doing anything.
  useEffect(() => {
    if (!socket) return;
    const onMessage = () => {
      void refetchConversations();
      void refetchThread();
    };
    socket.on('message', onMessage);
    return () => { socket.off('message', onMessage); };
  }, [socket, refetchConversations, refetchThread]);

  // A conversation is read from the bottom, like every conversation.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [thread]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !openWith || sending) return;
    setSending(true);
    try {
      await messagesApi.send(openWith, body);
      setDraft('');
      await refetchThread();
      await refetchConversations();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo enviar el mensaje'));
    } finally {
      setSending(false);
    }
  };

  const openConversation = (id: string) => {
    setOpenWith(id);
    setPicking(false);
  };

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <header className={styles.sidebarHeader}>
          <h1 className={styles.title}>Mensajes</h1>
          <Button variant="ghost" size="sm" onClick={() => setPicking((p) => !p)}>
            <MessageSquarePlus size={16} /> Nueva conversación
          </Button>
        </header>

        {picking && (
          <ul className={styles.contacts} role="listbox" aria-label="Personal">
            {(contacts ?? []).map((c) => (
              <li key={c.id}>
                <button type="button" className={styles.contact} onClick={() => openConversation(c.id)}>
                  <Avatar name={c.name} size="sm" />
                  <span className={styles.contactName}>{c.name}</span>
                  <span className={styles.contactRole}>{ROLE_LABEL[c.role] ?? c.role}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {(conversations ?? []).length === 0 && !picking ? (
          <p className={styles.empty}>
            Todavía no hablaste con nadie. Tocá «Nueva conversación» para escribirle a alguien del equipo.
          </p>
        ) : (
          <ul className={styles.conversations}>
            {(conversations ?? []).map((c) => (
              <li key={c.counterpart.id}>
                <button
                  type="button"
                  className={[styles.conversation, openWith === c.counterpart.id ? styles.conversationOpen : ''].filter(Boolean).join(' ')}
                  onClick={() => openConversation(c.counterpart.id)}
                >
                  <Avatar name={c.counterpart.name} size="sm" />
                  <span className={styles.conversationText}>
                    <span className={styles.conversationName}>{c.counterpart.name}</span>
                    <span className={styles.conversationLast}>{c.lastMessage.body}</span>
                  </span>
                  <span className={styles.conversationMeta}>
                    <span className={styles.conversationTime}>{formatWhen(c.lastMessage.createdAt)}</span>
                    {c.unread > 0 && <span className={styles.unread}>{c.unread}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className={styles.panel}>
        {!openWith || !thread ? (
          <div className={styles.placeholder}>
            <p>Elegí una conversación para leerla.</p>
          </div>
        ) : (
          <>
            <header className={styles.panelHeader}>
              <Avatar name={thread.counterpart.name} size="sm" />
              <div>
                <span className={styles.panelName}>{thread.counterpart.name}</span>
                <span className={styles.panelRole}>{ROLE_LABEL[thread.counterpart.role] ?? thread.counterpart.role}</span>
              </div>
            </header>

            <p className={styles.warning}>
              Coordinación interna del equipo — no escribas información clínica acá.
            </p>

            <ul className={styles.messages} aria-label="Mensajes">
              {thread.data.map((m) => {
                const mine = m.senderId === user?.id;
                return (
                  <li key={m.id} data-mine={String(mine)} className={[styles.bubbleRow, mine ? styles.bubbleRowMine : ''].filter(Boolean).join(' ')}>
                    <div className={[styles.bubble, mine ? styles.bubbleMine : ''].filter(Boolean).join(' ')}>
                      <p className={styles.bubbleBody}><TextWithCodes text={m.body} /></p>
                      <span className={styles.bubbleTime}>{formatWhen(m.createdAt)}</span>
                    </div>
                  </li>
                );
              })}
              <div ref={bottomRef} />
            </ul>

            <div className={styles.composer}>
              <textarea
                className={styles.input}
                aria-label="Escribir un mensaje"
                placeholder={`Escribile a ${thread.counterpart.name}…`}
                maxLength={MAX_MESSAGE_LENGTH}
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  // Enter envía, Shift+Enter hace un salto de línea.
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <Button size="sm" isLoading={sending} onClick={() => { void send(); }}>
                <Send size={15} /> Enviar
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
