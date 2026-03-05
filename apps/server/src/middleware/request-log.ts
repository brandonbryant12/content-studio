import type { MiddlewareHandler } from 'hono';

const formatElapsed = (startedAt: number): string => {
  const elapsedMs = Date.now() - startedAt;
  return elapsedMs < 1000
    ? `${elapsedMs}ms`
    : `${Math.round(elapsedMs / 1000)}s`;
};

export const requestLog = (
  log: (message: string) => void = console.log,
): MiddlewareHandler => {
  return async (c, next) => {
    const method = c.req.method;
    const path = c.req.path;

    log(`<-- ${method} ${path}`);
    const startedAt = Date.now();

    await next();

    log(`--> ${method} ${path} ${c.res.status} ${formatElapsed(startedAt)}`);
  };
};
