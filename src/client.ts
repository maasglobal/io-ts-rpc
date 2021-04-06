import * as Apply_ from 'fp-ts/lib/Apply';
import * as Array_ from 'fp-ts/lib/Array';
import * as Console_ from 'fp-ts/lib/Console';
import { Either, either as Either__ } from 'fp-ts/lib/Either';
import * as Either_ from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as IO_ from 'fp-ts/lib/IO';
import { ReaderTaskEither } from 'fp-ts/lib/ReaderTaskEither';
import { Task } from 'fp-ts/lib/Task';
import * as Task_ from 'fp-ts/lib/Task';
import { TaskEither } from 'fp-ts/lib/TaskEither';
import * as TaskEither_ from 'fp-ts/lib/TaskEither';
import * as t from 'io-ts';
import { validator } from 'io-ts-validator';
import * as URITemplate_ from 'url-template';

export type Body = string;
export type FetchLocation = string;
export type FetchOptions = {
  method: string;
  headers: Record<HeaderName, string>;
  body: Body;
};
export type FetchResult = {
  ok: boolean;
  status: number;
  statusText: string;
  text: () => string;
  headers: globalThis.Headers;
};

export type Fetch = (u: FetchLocation, o: FetchOptions) => Promise<FetchResult>;

type HeaderName = string;
type HeaderCSV = unknown;

type Warnings = Array<Err>;
type These<E, A> = {
  body: A;
  warnings: E;
};
type URI = string;
type URITemplate = string;
type URIVariables = Record<string, string>;
type Headers = Record<HeaderName, HeaderCSV>;

function fromFetchResult(result: FetchResult): Headers {
  const tmp: Array<[HeaderName, HeaderCSV]> = [];
  result.headers.forEach((name, csv) => {
    tmp.push([name, csv]);
  });
  return Object.fromEntries(tmp);
}

type Json = unknown;

type Response = {
  headers: Headers;
  body: Body;
};

type Err = {
  reason: string;
  debug?: Record<string, unknown>;
};
const err = (reason: string, debug?: Record<string, unknown>): Err => ({
  reason,
  debug,
});

function expandURITemplate(
  template: URITemplate,
): (vars: URIVariables) => Either<Err, URI> {
  return (vars) =>
    pipe(
      Either_.tryCatch(
        () => URITemplate_.parse(template),
        () => err('io-ts-rpc client failed to parse url template'),
      ),
      Either_.chain((expander) =>
        Either_.tryCatch(
          () => expander.expand(vars),
          () => err('io-ts-rpc client failed to expand url template'),
        ),
      ),
    );
}

type Method = 'POST' | 'GET';
type RPCMethod = NonNullable<RequestInit['method']>;

/* eslint-disable @typescript-eslint/naming-convention */
export type Endpoint<UT, UV, HS, SS, TH, TS> = {
  default_links_implementation_TargetHints: TH;
  default_links_implementation_Href: UT;
  _links_implementation_HrefSchema: t.Type<UV, URIVariables>;
  _links_implementation_TargetHints: t.Type<TH, Headers>;
  _links_implementation_HeaderSchema: t.Type<HS, Headers>;
  _links_implementation_SubmissionSchema: t.Type<SS, Json>;
  _links_implementation_TargetSchema: t.Type<TS, Json>;
};
/* eslint-enable @typescript-eslint/naming-convention */

export function client<
  M extends Method,
  UT extends URITemplate,
  UV,
  HS,
  SS,
  TH extends Record<string, string>,
  TS
>(
  target: UV,
  method: M,
  headers: HS,
  endpoint: Endpoint<UT, UV, HS, SS, TH, TS>,
  fetch: Fetch,
): ReaderTaskEither<SS, Err, TS> {
  const targetHints = endpoint.default_links_implementation_TargetHints;
  const hrefTemplate = endpoint.default_links_implementation_Href;
  const HrefTemplateVariables = endpoint._links_implementation_HrefSchema;
  const ResponseHeaders = endpoint._links_implementation_TargetHints;
  const RequestHeaders = endpoint._links_implementation_HeaderSchema;
  const Request = endpoint._links_implementation_SubmissionSchema;
  const Response = endpoint._links_implementation_TargetSchema;

  function encodeUrl(template: UT, vars: UV): Either<Err, URI> {
    return pipe(
      validator(HrefTemplateVariables).encodeEither(vars),
      Either_.mapLeft((errors: Array<string>) =>
        err('io-ts-rpc client failed to encode request url variables', {
          input: JSON.parse(JSON.stringify(vars)),
          errors: errors,
        }),
      ),
      Either_.chain(expandURITemplate(template)),
      Either_.chain((expanded) =>
        Either_.tryCatch(
          () => new URL(expanded).href,
          (): Err => err('io-ts-rpc client failed to expand request url template'),
        ),
      ),
    );
  }

  function encodeMethod(method: M): Either<Err, RPCMethod> {
    const allowed = targetHints?.allow?.split(',') ?? [];
    if (allowed.includes(method)) {
      return Either_.right(method);
    }
    return Either_.left(err('Method not allowed'));
  }

  function encodeHeaders(request: HS): Either<Err, Headers> {
    return pipe(
      validator(RequestHeaders).encodeEither(request),
      Either_.mapLeft((errors: Array<string>) =>
        err('io-ts-rpc client failed to encode request headers', {
          input: JSON.parse(JSON.stringify(request)),
          errors: errors,
        }),
      ),
    );
  }

  function encodeRequest(request: SS): Either<Err, Body> {
    return pipe(
      validator(Request, 'json').encodeEither(request),
      Either_.mapLeft((errors: Array<string>) =>
        err('io-ts-rpc client failed to stringify request body', {
          input: JSON.parse(JSON.stringify(request)),
          errors: errors,
        }),
      ),
    );
  }

  function parseBody(body: Body): Either<Err, TS> {
    return pipe(
      validator(Response, 'json').decodeEither(body),
      Either_.mapLeft((errors: Array<string>) =>
        err('io-ts-rpc client failed to parse response body', {
          input: JSON.parse(JSON.stringify(body)),
          errors: errors,
        }),
      ),
    );
  }

  function parseHeaders(headers: Headers): Either<Err, Warnings> {
    return pipe(
      headers,
      validator(ResponseHeaders).decodeEither,
      Either_.fold(
        (errors: Array<string>) =>
          Either_.right([
            err('io-ts-rpc client failed to parse response headers', {
              input: JSON.parse(JSON.stringify(headers)),
              errors: errors,
            }),
          ]),
        (_targetHints) => Either_.right([]),
      ),
    );
  }

  function parseResponse({ body, headers }: Response): Either<Err, These<Warnings, TS>> {
    return pipe(
      {
        body: parseBody(body),
        warnings: parseHeaders({
          ...headers,
          allow: 'POST', // allow: 'POST' is implicit when code is 200
        }),
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
        (encoded: {
          url: URI;
          method: RPCMethod;
          headers: Headers;
          request: Body;
        }): TaskEither<Err, Response> =>
          pipe(
            TaskEither_.tryCatch(
              async (): Promise<Response> => {
                const result = await fetch(encoded.url, {
                  method: encoded.method,
                  headers: encoded.headers as Record<string, string>,
                  body: encoded.request,
                });

                if (result.ok === false) {
                  // eslint-disable-next-line fp/no-throw
                  throw new Error(
                    `${result.status}: ${result.statusText}, while calling ${encoded.url} with ${encoded.request}`,
                  );
                }
                const response: Response = {
                  headers: fromFetchResult(result),
                  body: await result.text(),
                };
                return response;
              },
              (error): Err =>
                err('io-ts-rpc client failed to fetch response', {
                  title: String(error),
                  details: error,
                  request: request,
                }),
            ),
          ),
      ),
      TaskEither_.chainEitherK(parseResponse),
      TaskEither_.chain(
        (these): TaskEither<Err, TS> =>
          pipe(logWarnings(these), Task_.map(Either_.right)),
      ),
    );
}
