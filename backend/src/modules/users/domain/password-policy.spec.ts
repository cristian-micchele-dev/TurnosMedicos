import { assertStrongPassword, generateTemporaryPassword } from './password-policy';

const expectRejected = (password: string, context?: { email?: string; name?: string }) =>
  expect(() => assertStrongPassword(password, context)).toThrow(
    expect.objectContaining({ code: 'WEAK_PASSWORD', status: 400 }),
  );

describe('password policy', () => {
  it('acepta una frase larga aunque no tenga símbolos ni mayúsculas', () => {
    // NIST 800-63B: la longitud manda; las reglas de composición empujan a "P@ssw0rd!".
    expect(() => assertStrongPassword('caballo correcto brida')).not.toThrow();
  });

  it('rechaza lo corto: menos de 10 caracteres', () => {
    expectRejected('Corta12!');
    expect(() => assertStrongPassword('1234567890a')).toThrow();
  });

  it('rechaza las contraseñas que están en cualquier diccionario de ataque', () => {
    expectRejected('contrasena');
    expectRejected('Password123');
    expectRejected('qwertyuiop');
    expectRejected('12345678910');
  });

  it('rechaza el nombre del propio producto y del hospital', () => {
    expectRejected('pulso2026pulso');
  });

  it('rechaza una contraseña derivada del email o del nombre de la persona', () => {
    expectRejected('laura.gomez2026', { email: 'laura.gomez@turno.med' });
    expectRejected('gomezgomez11', { name: 'Laura Gómez' });
  });

  it('rechaza un solo carácter repetido o una secuencia del teclado', () => {
    expectRejected('aaaaaaaaaaaa');
    expectRejected('abcdefghijkl');
  });

  it('la contraseña temporal que generamos cumple la propia política', () => {
    for (let i = 0; i < 40; i++) {
      const temp = generateTemporaryPassword();
      expect(() => assertStrongPassword(temp)).not.toThrow();
    }
  });
});
