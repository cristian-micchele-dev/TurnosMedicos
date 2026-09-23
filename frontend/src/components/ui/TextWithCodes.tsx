import { Link } from 'react-router-dom';
import { splitAppointmentCodes } from '../../utils/appointmentCode';
import styles from './TextWithCodes.module.css';

interface TextWithCodesProps {
  text: string;
}

/**
 * Text where every appointment code becomes a link to that appointment.
 *
 * It only takes you there: confirming or cancelling still happens in the
 * appointment itself, with the patient and the hour in front of you. A
 * destructive action launched from a chat bubble is how you cancel the wrong one.
 */
export function TextWithCodes({ text }: TextWithCodesProps) {
  return (
    <>
      {splitAppointmentCodes(text).map((part, i) =>
        part.type === 'code' ? (
          <Link key={i} to={`/turnos?q=${part.value}`} className={styles.code} title="Abrir este turno">
            {part.value}
          </Link>
        ) : (
          part.value
        ),
      )}
    </>
  );
}
