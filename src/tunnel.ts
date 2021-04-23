import * as Apply_ from 'fp-ts/lib/Apply';
import * as Array_ from 'fp-ts/lib/Array';
import * as Console_ from 'fp-ts/lib/Console';
import { Either, either as Either__ } from 'fp-ts/lib/Either';
import * as Either_ from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as IO_ from 'fp-ts/lib/IO';
import { Task } from 'fp-ts/lib/Task';
import * as Task_ from 'fp-ts/lib/Task';
import { TaskEither } from 'fp-ts/lib/TaskEither';
import * as TaskEither_ from 'fp-ts/lib/TaskEither';
import { validator } from 'io-ts-validator';

import { Endpoint } from './endpoint';
import { RpcError, rpcError, These, Warnings } from './err';
import { Body, Fetch, Headers, Method } from './fetch';
import * as Headers_ from './headers';
import { URI, URITemplate } from './uri-template';
import * as URITemplate_ from './uri-template';

type FlatResponse = {
  headers: Headers;
  body: Body;
};

export type Tunnel<I, O> = (i: I) => TaskEither<RpcError, O>;

export function tunnel<
  M extends Method,
  UT extends URITemplate,
  UV,
  HS,
  SS,
  TH extends Record<string, string>,
  TS
>(
  method: M,
  target: UV,
  headers: HS,
  {
    targetHints,
    hrefTemplate,
    HrefTemplateVariables,
    ResponseHeaders,
    RequestHeaders,
    Request,
    Response,
  }: Endpoint<UT, UV, HS, SS, TH, TS>,
  fetch: Fetch,
): Tunnel<SS, TS> {
  function encodeUrl(template: UT, vars: UV): Either<RpcError, URI> {
    return pipe(
      validator(HrefTemplateVariables).encodeEither(vars),
      Either_.mapLeft((errors: Array<string>) =>
        rpcError('io-ts-rpc client failed to encode request url variables', {
          input: JSON.parse(JSON.stringify(vars)),
          errors: errors,
        }),
      ),
      Either_.chain((vars) => URITemplate_.expand(vars)(template)),
      Either_.chain((expanded) =>
        Either_.tryCatch(
          () => {
            if (expanded.includes('://') === false) {
              // relative URL
              return expanded;
            }
            return new URL(expanded).href;
          },
          (errors): RpcError =>
            rpcError('io-ts-rpc client failed to parse expanded request url', {
              expanded,
              errors,
            }),
        ),
      ),
    );
  }

  function encodeMethod(method: M): Either<RpcError, Method> {
    const allowed = targetHints['allow']?.split(',') ?? [];
    if (allowed.includes(method)) {
      return Either_.right(method);
    }
    return Either_.left(rpcError('Method not allowed', { method }));
  }

  function encodeHeaders(request: HS): Either<RpcError, Headers> {
    return pipe(
      validator(RequestHeaders).encodeEither(request),
      Either_.mapLeft((errors: Array<string>) =>
        rpcError('io-ts-rpc client failed to encode request headers', {
          input: JSON.parse(JSON.stringify(request)),
          errors: errors,
        }),
      ),
    );
  }

  function encodeRequest(request: SS): Either<RpcError, Body> {
    return pipe(
      validator(Request, 'json').encodeEither(request),
      Either_.mapLeft((errors: Array<string>) =>
        rpcError('io-ts-rpc client failed to stringify request body', {
          input: JSON.parse(JSON.stringify(request)),
          errors: errors,
        }),
      ),
    );
  }

  function parseBody(body: Body): Either<RpcError, TS> {
    return pipe(
      validator(Response, 'json').decodeEither(body),
      Either_.mapLeft((errors: Array<string>) =>
        rpcError('io-ts-rpc client failed to parse response body', {
          input: JSON.parse(JSON.stringify(body)),
          errors: errors,
        }),
      ),
    );
  }

  function parseHeaders(headers: Headers): Either<RpcError, Warnings> {
    return pipe(
      headers,
      validator(ResponseHeaders).decodeEither,
      Either_.fold(
        (errors: Array<string>) =>
          Either_.right([
            rpcError('io-ts-rpc client failed to parse response headers', {
              input: JSON.parse(JSON.stringify(headers)),
              errors: errors,
            }),
          ]),
        (_targetHints) => Either_.right([]),
      ),
    );
  }

  function parseResponse({
    body,
    headers,
  }: FlatResponse): Either<RpcError, These<Warnings, TS>> {
    return pipe(
      {
        body: parseBody(body),
        warnings: parseHeaders(headers),
      },
      Apply_.sequenceS(Either__),
    );
  }

  function logWarnings<T>(theseWarnings: These<Warnings, T>): Task<T> {
    return pipe(
      Task_.of(theseWarnings),
      Task_.chainFirst(({ warnings }) =>
        pipe(warnings, Array_.map(Console_.warn), IO_.sequenceArray, Task_.fromIO),
      ),
      Task_.map(({ body }) => body),
    );
  }

  return (request) =>
    pipe(
      {
        url: encodeUrl(hrefTemplate, target),
        method: encodeMethod(method),
        headers: encodeHeaders(headers),
        request: encodeRequest(request),
      },
      Apply_.sequenceS(Either__),
      Task_.of,
      TaskEither_.chain(
        (encoded: { url: URI; method: Method; headers: Headers; request: Body }) =>
          TaskEither_.tryCatch(
            async (): Promise<FlatResponse> => {
              const result = await fetch(encoded.url, {
                method: encoded.method,
                headers: encoded.headers,
                body: encoded.request,
              });
              const implicit: Headers = result.ok ? { allow: encoded.method } : {};
              const explicit: Headers = Headers_.fromFetchResult(result);
              return {
                headers: {
                  ...implicit,
                  ...explicit,
                },
                body: await result.text(),
              };
            },
            (error): RpcError =>
              rpcError('io-ts-rpc client failed to fetch response', {
                title: String(error),
                details: error,
                request: request,
              }),
          ),
      ),
      TaskEither_.chainEitherK(parseResponse),
      TaskEither_.chain(
        (these): TaskEither<RpcError, TS> =>
          pipe(logWarnings(these), Task_.map(Either_.right)),
      ),
    );
}
