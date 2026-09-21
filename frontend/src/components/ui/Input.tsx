import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftElement, className = '', id, required, type, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const hasError = Boolean(error);
    const isPassword = type === 'password';
    const [revealed, setRevealed] = useState(false);

    return (
      <div className={styles.wrapper}>
        {label && (
          <div className={styles.labelRow}>
            <label htmlFor={inputId} className={styles.label}>{label}</label>
            {required && <span className={styles.required} aria-hidden="true">*</span>}
          </div>
        )}

        <div className={styles.inputWrapper}>
          {leftElement && (
            <span className={styles.leftElement}>{leftElement}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={[
              styles.input,
              hasError ? styles.inputError : '',
              leftElement ? styles.inputWithLeft : '',
              isPassword ? styles.inputWithRight : '',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            type={isPassword && revealed ? 'text' : type}
            required={required}
            aria-invalid={hasError}
            aria-describedby={
              hasError
                ? `${inputId}-error`
                : helperText
                ? `${inputId}-helper`
                : undefined
            }
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              className={styles.reveal}
              onClick={() => setRevealed((v) => !v)}
              aria-label={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={revealed}
              tabIndex={-1}
            >
              {revealed ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            </button>
          )}
        </div>

        {hasError && (
          <p id={`${inputId}-error`} className={styles.errorText} role="alert">
            {error}
          </p>
        )}

        {!hasError && helperText && (
          <p id={`${inputId}-helper`} className={styles.helperText}>
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
