import http from 'http';
import { FetchClient } from '../../src/client/FetchClient';
import { TimeoutError } from '../../src/errors/FetchClientError';

/**
 * Servidor HTTP mínimo para pruebas de integración sin dependencias externas.
 */
function createTestServer(
  handler: http.RequestListener
): Promise<{ server: http.Server; port: number; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('No se pudo obtener el puerto del servidor de prueba'));
        return;
      }

      resolve({
        server,
        port: address.port,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close((error) => (error ? closeReject(error) : closeResolve()));
          }),
      });
    });
  });
}

describe('FetchClient - pruebas de integración', () => {
  it('realiza GET y POST contra un servidor HTTP real', async () => {
    const { port, close } = await createTestServer((req, res) => {
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      if (req.method === 'POST' && req.url === '/users') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ received: JSON.parse(body) }));
        });
        return;
      }

      res.writeHead(404);
      res.end();
    });

    const client = new FetchClient({
      baseURL: `http://127.0.0.1:${port}`,
      timeout: 2000,
      retries: 1,
    });

    const health = await client.get('/health');
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: 'ok' });

    const created = await client.post('/users', {
      body: { name: 'Carlos' },
    });
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({
      received: { name: 'Carlos' },
    });

    await close();
  });

  it('reintenta peticiones 5xx contra un servidor real', async () => {
    let attempts = 0;

    const { port, close } = await createTestServer((_req, res) => {
      attempts += 1;
      if (attempts < 3) {
        res.writeHead(503);
        res.end('temporary');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('recovered');
    });

    const client = new FetchClient({
      baseURL: `http://127.0.0.1:${port}`,
      retries: 3,
      retryDelay: 20,
    });

    const response = await client.get('/retry-me');
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('recovered');
    expect(attempts).toBe(3);

    await close();
  });

  it('cancela peticiones lentas por timeout', async () => {
    const { port, close } = await createTestServer((_req, res) => {
      setTimeout(() => {
        res.writeHead(200);
        res.end('late');
      }, 300);
    });

    const client = new FetchClient({
      baseURL: `http://127.0.0.1:${port}`,
      timeout: 80,
      retries: 1,
    });

    await expect(client.get('/slow')).rejects.toBeInstanceOf(TimeoutError);

    await close();
  });
});
