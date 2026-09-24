import { escapeLike, fold, foldTerm, searchWords, trigramIndex } from './text-search';

describe('text-search', () => {
  it('fold arma SQL que baja acentos y mayúsculas en la columna', () => {
    expect(fold('p.name')).toContain('lower(translate(p.name');
  });

  it('foldTerm hace con el término lo mismo que fold con la columna', () => {
    expect(foldTerm('Ñoño PÉREZ')).toBe('nono perez');
    expect(foldTerm('Güemes')).toBe('guemes');
  });

  it('escapeLike deja los metacaracteres de LIKE como texto literal', () => {
    expect(escapeLike('100%')).toBe('100\\%');
    expect(escapeLike('a_b')).toBe('a\\_b');
    expect(escapeLike('c\\d')).toBe('c\\\\d');
  });

  it('searchWords parte en palabras, sin vacíos', () => {
    expect(searchWords('  sofia   perez ')).toEqual(['sofia', 'perez']);
    expect(searchWords('   ')).toEqual([]);
  });
});

describe('text-search — el índice y la consulta tienen que decir lo mismo', () => {
  it('el índice se escribe con la misma expresión que el WHERE, sin alias de tabla', () => {
    expect(trigramIndex('idx_x', 'patients', 'name'))
      .toBe(`CREATE INDEX "idx_x" ON "patients" USING gin (${fold('name')} gin_trgm_ops)`);
  });
});
