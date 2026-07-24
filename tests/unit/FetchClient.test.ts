import { FetchClient } from '../../src/client/FetchClient';
import { TimeoutError } from '../../src/errors/FetchClientError';

describe('FetchClient - pruebas unitarias', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('realiza una petición GET y devuelve la respuesta', async () => {
    const mockFetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    const client = new FetchClient({ baseURL: 'https://api.test' }, mockFetch);

    const response = await client.get('/users');

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test/users',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('soporta POST, PUT, PATCH y DELETE', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = new FetchClient({}, mockFetch);

    await client.post('/a', { body: { name: 'Ana' } });
    await client.put('/b', { body: { name: 'Ben' } });
    await client.patch('/c', { body: { active: true } });
    await client.delete('/d');

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      '/a',
      expect.objectContaining({ method: 'POST' })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      '/b',
      expect.objectContaining({ method: 'PUT' })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      '/c',
      expect.objectContaining({ method: 'PATCH' })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      4,
      '/d',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('permite consumir respuestas con promesas encadenadas', async () => {
    const mockFetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), { status: 200 })
    );
    const client = new FetchClient({}, mockFetch);

    const data = await client
      .get('/item/1')
      .then((response) => response.json());

    expect(data).toEqual({ id: 1 });
  });

  it('cancela la petición y lanza TimeoutError al superar el timeout', async () => {
    const mockFetch = jest.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const client = new FetchClient({ timeout: 50, retries: 1 }, mockFetch);

    await expect(client.get('/slow')).rejects.toBeInstanceOf(TimeoutError);
  });

  it('reintenta automáticamente ante errores 5xx', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(new Response('fail', { status: 503 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const client = new FetchClient({ retries: 2, retryDelay: 10 }, mockFetch);
    const response = await client.get('/resource');

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('reintenta automáticamente ante errores de red', async () => {
    const mockFetch = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Network error'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const client = new FetchClient({ retries: 2, retryDelay: 10 }, mockFetch);
    const response = await client.get('/resource');

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('realiza un solo intento por defecto', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValue(new Response('fail', { status: 500 }));
    const client = new FetchClient({}, mockFetch);

    const response = await client.get('/resource');

    expect(response.status).toBe(500);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('serializa objetos JSON en el cuerpo de la petición', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValue(new Response(null, { status: 201 }));
    const client = new FetchClient({}, mockFetch);

    await client.post('/users', { body: { email: 'a@test.com' } });

    expect(mockFetch).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({
        body: JSON.stringify({ email: 'a@test.com' }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });
});
