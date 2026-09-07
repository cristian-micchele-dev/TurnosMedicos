import { NoopMailer } from './noop.mailer';

describe('NoopMailer', () => {
  it('no lanza error al enviar', async () => {
    const mailer = new NoopMailer();
    await expect(mailer.sendPasswordReset('test@test.com', 'token123')).resolves.toBeUndefined();
  });
});
