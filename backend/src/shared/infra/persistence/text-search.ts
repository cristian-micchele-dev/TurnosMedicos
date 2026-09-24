/**
 * Buscar texto en Postgres sin extensiones.
 *
 * `unaccent` es una extensión: en un Postgres administrado puede no estar y no
 * siempre se puede instalar. `translate()` está en cualquier instalación, así que
 * el plegado de acentos viaja con la consulta en vez de depender del servidor.
 */

const ACCENTED = 'áéíóúàèìòùäëïöüâêîôûÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛñÑçÇ';
const PLAIN = 'aeiouaeiouaeiouaeiouAEIOUAEIOUAEIOUAEIOUnNcC';

/** La columna, en minúsculas y sin acentos, para comparar contra un término ya plegado. */
export const fold = (column: string) => `lower(translate(${column}, '${ACCENTED}', '${PLAIN}'))`;

/** Lo mismo que `fold`, pero del lado de JavaScript: los dos tienen que coincidir. */
export const foldTerm = (term: string) => {
  let out = term.toLowerCase();
  for (let i = 0; i < ACCENTED.length; i++) out = out.split(ACCENTED[i].toLowerCase()).join(PLAIN[i].toLowerCase());
  return out;
};

/** Un `%` tecleado por el usuario es un porcentaje, no un comodín. */
export const escapeLike = (term: string) => term.replace(/[\\%_]/g, (m) => `\\${m}`);

/** Palabras del término de búsqueda: cada una tendrá que aparecer en algún campo. */
export const searchWords = (term: string) => term.trim().split(/\s+/).filter(Boolean);

/** Patrón LIKE listo para parametrizar: plegado, escapado y con comodines a los costados. */
export const likePattern = (word: string) => `%${escapeLike(foldTerm(word))}%`;

/**
 * Índice de trigramas para un `LIKE '%algo%'` sobre una columna plegada.
 *
 * Un btree no sirve acá: el comodín va adelante. GIN + pg_trgm sí, pero un índice
 * por expresión sólo entra si la expresión coincide CARÁCTER POR CARÁCTER con la
 * del WHERE. Por eso se arma con el mismo `fold` que usan los repositorios: si
 * alguien cambia el plegado, cambian los dos juntos o no cambia ninguno. Un
 * índice que no coincide no falla — simplemente no se usa, y nadie se entera.
 */
export const trigramIndex = (name: string, table: string, column: string) =>
  `CREATE INDEX "${name}" ON "${table}" USING gin (${fold(column)} gin_trgm_ops)`;
