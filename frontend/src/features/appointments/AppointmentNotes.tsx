import { useState } from 'react';
import { Link } from 'react-router-dom';
import { commentsApi, MAX_COMMENT_LENGTH, type AppointmentComment } from '../../api/comments';
import { Button } from '../../components/ui/Button';
import { TextWithCodes } from '../../components/ui/TextWithCodes';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../hooks/useToast';
import { apiErrorMessage } from '../../api/client';
import styles from './AppointmentDetailModal.module.css';

/**
 * Lo que queda asentado sobre ESTA reserva.
 *
 * Lo ve todo el que ve el turno, mostrador incluido: de eso se trata. No es un
 * chat —las notas no se editan ni se borran— y por eso el aviso de no escribir
 * información clínica está a la vista y no en un tooltip.
 */
export function AppointmentNotes({ appointmentId }: { appointmentId: string }) {
  const { toast } = useToast();
  const { data: comments, refetch } = useFetch<AppointmentComment[]>(
    ['appointment-comments', appointmentId],
    () => commentsApi.list(appointmentId),
  );
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await commentsApi.add(appointmentId, body);
      setDraft('');
      await refetch();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo enviar el comentario'));
    } finally {
      setSending(false);
    }
  };

  const notes = comments ?? [];

  return (
    <div className={styles.reportsSection}>
      <span className={styles.reportsSectionTitle}>Notas del turno</span>
      <p className={styles.threadWarning}>
        Quedan asentadas en el turno y no se editan. No escribas información clínica acá;
        para conversar usá <Link to="/mensajes" className={styles.threadLink}>Mensajes</Link>.
      </p>

      {notes.length === 0 ? (
        <p className={styles.reportsEmpty}>
          Sin notas. Dejá asentado lo que haga falta recordar de este turno: “confirmado por teléfono”, “el paciente pidió el cambio”.
        </p>
      ) : (
        <ul className={styles.thread}>
          {notes.map((c) => (
            <li key={c.id} className={styles.threadItem}>
              <div className={styles.threadHead}>
                <span className={styles.threadAuthor}>{c.author.name}</span>
                <span className={styles.threadTime}>
                  {new Date(c.createdAt).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className={styles.threadBody}><TextWithCodes text={c.body} /></p>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.threadForm}>
        <textarea
          className={styles.threadInput}
          aria-label="Escribir una nota"
          placeholder="Anotá algo sobre este turno…"
          maxLength={MAX_COMMENT_LENGTH}
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className={styles.threadActions}>
          <span className={styles.threadCount}>{draft.length}/{MAX_COMMENT_LENGTH}</span>
          <Button size="sm" isLoading={sending} onClick={() => { void send(); }}>
            Agregar nota
          </Button>
        </div>
      </div>
    </div>
  );
}
