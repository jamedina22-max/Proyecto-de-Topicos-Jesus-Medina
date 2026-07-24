import { RetryAspect } from '../../src/aspects/RetryAspect';
import { RequestContext } from '../../src/types';

describe('RetryAspect', () => {
  const baseContext = (): RequestContext => ({
    url: 'https://api.test/resource',
    method: 'GET',
    headers: {},
    timeout: 0,
    retries: 3,
    retryDelay: 10,
    attempt: 1,
  });

  it('reintenta cuando la respuesta es 5xx', async () => {
    const aspect = new RetryAspect();
    let calls = 0;

    const next = jest.fn().mockImplementation(async () => {
      calls += 1;
      return new Response('error', {
        status: calls < 3 ? 500 : 200,
      });
    });

    const response = await aspect.execute(baseContext(), next);

    expect(response.status).toBe(200);
    expect(next).toHaveBeenCalledTimes(3);
  });

  it('no reintenta ante códigos 4xx', async () => {
    const aspect = new RetryAspect();
    const next = jest
      .fn()
      .mockResolvedValue(new Response('bad request', { status: 400 }));

    const response = await aspect.execute(baseContext(), next);

    expect(response.status).toBe(400);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
