import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox, SearchX } from 'lucide-react';
import styles from './Table.module.css';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  /** Value used for sorting; defaults to the raw field or the rendered text. */
  sortValue?: (item: T) => string | number | null | undefined;
  /** Reveal the cell only on row hover / focus (always visible on touch devices). */
  hideUntilHover?: boolean;
}

export interface TableEmpty {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  /** @deprecated use `empty` */
  emptyMessage?: string;
  empty?: TableEmpty;
  /** True when a client-side search/filter is active, so an empty list reads as "no matches". */
  filtered?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
}

type SortState = { key: string; dir: 'asc' | 'desc' } | null;

function defaultSortValue<T>(item: T, key: string): string | number {
  const raw = (item as Record<string, unknown>)[key];
  if (typeof raw === 'number') return raw;
  if (raw == null) return '';
  return String(raw);
}

function compare(a: string | number | null | undefined, b: string | number | null | undefined): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'es', { sensitivity: 'base', numeric: true });
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  loading = false,
  emptyMessage = 'No hay datos disponibles',
  empty,
  filtered = false,
  total,
  page = 1,
  pageSize = 20,
}: TableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return data;
    const value = (item: T) => (col.sortValue ? col.sortValue(item) : defaultSortValue(item, col.key));
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => compare(value(a), value(b)) * dir);
  }, [data, sort, columns]);

  const toggleSort = (key: string) =>
    setSort((prev) => (prev?.key !== key ? { key, dir: 'asc' } : prev.dir === 'asc' ? { key, dir: 'desc' } : null));

  const showEmpty = !loading && data.length === 0;
  const summary = total != null && data.length > 0
    ? `Mostrando ${(page - 1) * pageSize + 1}–${(page - 1) * pageSize + data.length} de ${total}`
    : null;

  return (
    <div className={styles.wrapper}>
      <table className={styles.table} aria-busy={loading || undefined}>
        <thead className={styles.thead}>
          <tr>
            {columns.map((col) => {
              const active = sort?.key === col.key;
              const ariaSort = active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined;
              return (
                <th
                  key={col.key}
                  className={[styles.th, col.align ? styles[`align-${col.align}`] : ''].filter(Boolean).join(' ')}
                  style={col.width ? { width: col.width } : undefined}
                  aria-sort={col.sortable ? (ariaSort ?? 'none') : undefined}
                >
                  {col.sortable ? (
                    <button type="button" className={[styles.sortBtn, active ? styles.sortActive : ''].filter(Boolean).join(' ')} onClick={() => toggleSort(col.key)}>
                      {col.header}
                      {active ? (sort!.dir === 'asc' ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />) : <ArrowUpDown size={12} aria-hidden className={styles.sortIdle} />}
                    </button>
                  ) : col.header}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className={styles.skeletonRow}>
                {columns.map((col) => (
                  <td key={col.key} className={styles.td}>
                    <span className={styles.skeletonBar} />
                  </td>
                ))}
              </tr>
            ))
          ) : showEmpty ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyCell}>
                {filtered ? (
                  <div className={styles.emptyState}>
                    <SearchX size={36} className={styles.emptyIcon} aria-hidden />
                    <p className={styles.emptyTitle}>Sin resultados para tu búsqueda</p>
                    <p className={styles.emptyDescription}>Probá con otro término o limpiá los filtros.</p>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <Inbox size={36} className={styles.emptyIcon} aria-hidden />
                    <p className={styles.emptyTitle}>{empty?.title ?? emptyMessage}</p>
                    {empty?.description && <p className={styles.emptyDescription}>{empty.description}</p>}
                    {empty?.action && (
                      <button type="button" className={styles.emptyAction} onClick={empty.action.onClick}>
                        {empty.action.label}
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ) : (
            sorted.map((item) => (
              <tr
                key={keyExtractor(item)}
                className={[styles.tr, onRowClick ? styles.trClickable : ''].filter(Boolean).join(' ')}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    data-label={col.header}
                    className={[styles.td, col.hideUntilHover ? styles.tdHover : '', col.align ? styles[`align-${col.align}`] : ''].filter(Boolean).join(' ')}
                  >
                    {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {summary && <div className={styles.summary}>{summary}</div>}
    </div>
  );
}
