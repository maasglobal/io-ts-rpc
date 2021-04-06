import fetch, { RequestInfo, RequestInit } from 'node-fetch';

export type Response = {
  headers: Record<string, Array<string>>;
  body: string;
};

export type Fetcher = (href: RequestInfo, options: RequestInit) => Promise<Response>;

export type FetcherConfig = unknown;

export function createFetcher(_config: FetcherConfig): Fetcher {
  return async function (href, options) {
    console.log(`Calling ${href}`);
    const result = await fetch(href, options);
    if (result.ok === false) {
      // eslint-disable-next-line fp/no-throw
      throw new Error(
        `${result.status}: ${result.statusText}, while calling ${href} with ${options.body}`,
      );
    }
    const response: Response = {
      headers: result.headers.raw(),
      body: await result.text(),
    };
    return response;
  };
}
