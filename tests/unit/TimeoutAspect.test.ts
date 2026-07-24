import { TimeoutAspect } from '../../src/aspects/TimeoutAspect';
import { TimeoutError } from '../../src/errors/FetchClientError';
import { RequestContext } from '../../src/types';

describe('TimeoutAspect', () => {
  const baseContext = (timeout = 50): RequestContext => ({
    url: 'https://api.test/slow',
    method: 'GET',
    headers: {},
    timeout,
    retries: 1,
    retryDelay: 0,
    attempt: 1,
  });

  it('lanza TimeoutError si next tarda más que el límite', async () => {
    const aspect = new TimeoutAspect();
    const context = baseContext(50);
    const next = jest.fn(async () => {
      return new Promise<Response>((_resolve, reject) => {
        context.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    await expect(aspect.execute(context, next)).rejects.toBeInstanceOf(
      TimeoutError
    );
  });

  it('delegates immediately when timeout is disabled', async () => {
    const aspect = new TimeoutAspect();
    const response = new Response('ok', { status: 200 });
    const next = jest.fn().mockResolvedValue(response);

    const result = await aspect.execute(baseContext(0), next);

    expect(result).toBe(response);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
