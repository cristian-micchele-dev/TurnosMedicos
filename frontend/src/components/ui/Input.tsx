import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftElement, className = '', id, required, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const hasError = Boolean(error);

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
              className,
            ]
              .filter(Boolean)
              .join(' ')}
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
