import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';

const jsonResponse = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('HttpClient', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const calledPaths = () => fetchMock.mock.calls.map(([url]) => String(url).replace(/^.*\/api\/v1/, ''));

  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('un 401 en /auth/login se propaga como error y NO dispara refresh ni redirección', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { title: 'UNAUTHORIZED', detail: 'Credenciales inválidas' }));

    await expect(api.post('/auth/login', { email: 'a@b.c', password: 'x' })).rejects.toMatchObject({
      status: 401,
      detail: 'Credenciales inválidas',
    });
    expect(calledPaths()).toEqual(['/auth/login']);
  });

  it('un 401 sin sesión previa (sin access_token) no intenta refresh', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401));

    await expect(api.get('/appointments')).rejects.toMatchObject({ status: 401 });
    expect(calledPaths()).toEqual(['/appointments']);
  });

  it('un 401 con sesión activa refresca el token y reintenta con el nuevo Bearer', async () => {
    localStorage.setItem('access_token', 'old');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'new' }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [] }));

    await expect(api.get('/appointments')).resolves.toEqual({ data: [] });
    expect(calledPaths()).toEqual(['/appointments', '/auth/refresh', '/appointments']);

    const retryHeaders = fetchMock.mock.calls[2][1]?.headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe('Bearer new');
    expect(localStorage.getItem('access_token')).toBe('new');
  });

  it('si el refresh falla limpia la sesión local y propaga el error', async () => {
    localStorage.setItem('access_token', 'old');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(401));

    await expect(api.get('/appointments')).rejects.toBeTruthy();
    expect(localStorage.getItem('access_token')).toBeNull();
  });
});
