/**
 * Ejemplo de uso de resilient-fetch.
 *
 * Ejecutar con:
 *   npm run build
 *   npx ts-node example.ts
 */
import { createFetchClient, FetchClientError, TimeoutError } from './src';

async function main(): Promise<void> {
  const client = createFetchClient({
    baseURL: 'https://jsonplaceholder.typicode.com',
    timeout: 8000,
    retries: 2,
    retryDelay: 500,
    headers: {
      Accept: 'application/json',
    },
  });

  console.log('=== GET con async/await ===');
  try {
    const response = await client.get('/posts/1');
    const post = await response.json();
    console.log('Post obtenido:', post.title);
  } catch (error) {
    handleError(error);
  }

  console.log('\n=== POST con promesas ===');
  await client
    .post('/posts', {
      body: {
        title: 'Nuevo post',
        body: 'Contenido de ejemplo',
        userId: 1,
      },
    })
    .then(async (response) => {
      console.log('Estado HTTP:', response.status);
      console.log('Respuesta:', await response.json());
    })
    .catch(handleError);

  console.log('\n=== PUT, PATCH y DELETE ===');
  await client.put('/posts/1', { body: { title: 'Título actualizado' } });
  await client.patch('/posts/1', { body: { title: 'Título parcial' } });
  await client.delete('/posts/1');

  console.log('Operaciones completadas.');
}

/**
 * Maneja errores controlados de la librería.
 * @param error - Error capturado durante una petición.
 */
function handleError(error: unknown): void {
  if (error instanceof TimeoutError) {
    console.error(`Timeout tras ${error.timeoutMs}ms en ${error.url}`);
    return;
  }

  if (error instanceof FetchClientError) {
    console.error(`Error HTTP (${error.status ?? 'red'}): ${error.message}`);
    return;
  }

  console.error('Error inesperado:', error);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
