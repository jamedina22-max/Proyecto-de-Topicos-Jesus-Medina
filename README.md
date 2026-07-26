# SmartFetch

Wrapper avanzado sobre `fetch` nativo para Node.js y navegadores. Ofrece una API limpia similar a axios, con **timeout**, **reintentos automáticos** y soporte completo de TypeScript, sin dependencias de terceros en tiempo de ejecución.

## Características

- Timeout configurable por petición o de forma global
- Reintentos automáticos ante errores **5xx** y fallos de red
- Métodos **GET**, **POST**, **PUT**, **PATCH** y **DELETE**
- Compatible con **async/await** y **promesas**
- Escrito en **TypeScript** con tipos exportados
- Arquitectura modular con **AOP** (aspectos de timeout y reintento)
- Sin dependencias de producción

## Instalación

```bash
npm install smartfetch
```

Para desarrollo local desde este repositorio:

```bash
git clone https://github.com/jamedina22-max/Proyecto-de-Topicos-Jesus-Medina.git
cd Proyecto-de-Topicos-Jesus-Medina
npm install
npm run build
```

## Integración en un proyecto

### TypeScript / Node.js

```typescript
import { createFetchClient } from 'smartfetch';

const client = createFetchClient({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  retries: 3,
  retryDelay: 300,
  headers: {
    Authorization: 'Bearer TOKEN',
    'Content-Type': 'application/json',
  },
});
```

### JavaScript (CommonJS)

```javascript
const { createFetchClient } = require('smartfetch');

const client = createFetchClient({
  baseURL: 'https://api.example.com',
});
```

## Uso

### GET

```typescript
const response = await client.get('/users');
const users = await response.json();
```

Con parámetros de consulta:

```typescript
await client.get('/search', {
  params: { q: 'typescript', page: 1 },
});
```

### POST

```typescript
const response = await client.post('/users', {
  body: { name: 'Ana', email: 'ana@example.com' },
});
```

### PUT, PATCH y DELETE

```typescript
await client.put('/users/1', { body: { name: 'Ana Actualizada' } });
await client.patch('/users/1', { body: { active: false } });
await client.delete('/users/1');
```

### Async/await

```typescript
try {
  const response = await client.get('/health');
  console.log(await response.text());
} catch (error) {
  console.error('La petición falló', error);
}
```

### Promesas

```typescript
client
  .get('/posts/1')
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((error) => console.error(error));
```

### Configuración por petición

```typescript
await client.get('/reports', {
  timeout: 10000,
  retries: 5,
  headers: { Accept: 'application/json' },
});
```

## API principal

| Método | Descripción |
|--------|-------------|
| `createFetchClient(config?)` | Factory para crear el cliente |
| `client.get(path, options?)` | Petición GET |
| `client.post(path, options?)` | Petición POST |
| `client.put(path, options?)` | Petición PUT |
| `client.patch(path, options?)` | Petición PATCH |
| `client.delete(path, options?)` | Petición DELETE |
| `client.request(method, path, options?)` | Petición genérica |

### Opciones de configuración

| Opción | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `baseURL` | `string` | — | URL base para rutas relativas |
| `timeout` | `number` | `0` | Timeout en ms (`0` = sin límite) |
| `retries` | `number` | `1` | Total de intentos |
| `retryDelay` | `number` | `300` | Espera base entre reintentos (ms) |
| `headers` | `Record<string, string>` | — | Cabeceras globales |

## Errores controlados

La librería expone errores tipados:

- `FetchClientError`: error general de petición
- `TimeoutError`: la petición superó el tiempo límite

```typescript
import { FetchClientError, TimeoutError } from 'smartfetch';

try {
  await client.get('/slow-endpoint');
} catch (error) {
  if (error instanceof TimeoutError) {
    console.error('Timeout:', error.timeoutMs);
  } else if (error instanceof FetchClientError) {
    console.error('Fallo HTTP:', error.status, error.message);
  }
}
```

## Patrones de diseño

- **Factory Method**: `createFetchClient()` centraliza la creación del cliente
- **Chain of Responsibility**: `AspectChain` compone aspectos transversales
- **Decorator / AOP**: `TimeoutAspect` y `RetryAspect` envuelven la ejecución de `fetch`
- **Strategy**: lógica de reintento intercambiable mediante aspectos

## Scripts disponibles

```bash
npm run build          # Compila TypeScript a dist/
npm test               # Ejecuta pruebas unitarias e integración
npm run test:coverage  # Reporte de cobertura
npm run lint           # Verificación de tipos
npm run example        # Ejecuta example.ts
```

## Ejemplo completo

Revisa el archivo [`example.ts`](./example.ts) en la raíz del repositorio.

## GitFlow

Se recomienda seguir GitFlow para el control de versiones:

- `main`: código estable en producción
- `develop`: integración de features
- `feature/*`: nuevas funcionalidades
- `release/*`: preparación de versiones
- `hotfix/*`: correcciones urgentes en producción

## Licencia

MIT
