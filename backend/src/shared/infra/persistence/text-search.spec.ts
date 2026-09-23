import { escapeLike, fold, foldTerm, searchWords } from './text-search';

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
