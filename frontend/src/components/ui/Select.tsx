import { forwardRef } from 'react';
import styles from './Select.module.css';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, options, value, onChange, placeholder, error, disabled, required, id },
    ref,
  ) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const hasError = Boolean(error);

    return (
      <div className={styles.wrapper}>
        {label && (
          <div className={styles.labelRow}>
            <label htmlFor={selectId} className={styles.label}>{label}</label>
            {required && <span className={styles.required} aria-hidden="true">*</span>}
          </div>
        )}

        <div className={styles.selectWrapper}>
          <select
            ref={ref}
            id={selectId}
            required={required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${selectId}-error` : undefined}
            className={[
              styles.select,
              hasError ? styles.selectError : '',
              disabled ? styles.selectDisabled : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <span className={styles.chevron} aria-hidden="true">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>

        {hasError && (
          <p id={`${selectId}-error`} className={styles.errorText} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
