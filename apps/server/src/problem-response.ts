import type { Context } from 'hono';

const PROBLEM_TYPE_BASE_URL = 'https://content-studio.dev/problems';
const REQUEST_ID_HEADER = 'X-Request-Id';

export interface ProblemResponseOptions {
  status: number;
  title: string;
  detail: string;
  code: string;
  type?: string;
  headers?: HeadersInit;
}

const getRequestId = (context: Context): string | null => {
  const requestId = context.get('requestId');
  return typeof requestId === 'string' && requestId.length > 0
    ? requestId
    : null;
};

const createProblemTypeUrl = (code: string): string =>
  `${PROBLEM_TYPE_BASE_URL}/${code.toLowerCase().replaceAll('_', '-')}`;

export const withRequestIdHeader = (
  context: Context,
  response: Response,
): Response => {
  const requestId = getRequestId(context);
  if (!requestId || response.headers.has(REQUEST_ID_HEADER)) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set(REQUEST_ID_HEADER, requestId);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const createProblemResponse = (
  context: Context,
  options: ProblemResponseOptions,
): Response => {
  const requestId = getRequestId(context);
  const headers = new Headers(options.headers);

  headers.set('Content-Type', 'application/problem+json; charset=utf-8');
  if (requestId && !headers.has(REQUEST_ID_HEADER)) {
    headers.set(REQUEST_ID_HEADER, requestId);
  }

  return new Response(
    JSON.stringify({
      type: options.type ?? createProblemTypeUrl(options.code),
      title: options.title,
      status: options.status,
      detail: options.detail,
      code: options.code,
      requestId,
    }),
    {
      status: options.status,
      headers,
    },
  );
};
