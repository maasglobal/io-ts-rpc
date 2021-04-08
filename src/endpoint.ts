import * as t from 'io-ts';

import { Headers } from './fetch';
import { HyperSchema } from './hyper-schema';
import { URIVariables } from './uri-template';

export type Json = unknown;

export type Endpoint<UT, UV, HS, SS, TH, TS> = {
  hrefTemplate: UT;
  HrefTemplateVariables: t.Type<UV, URIVariables>;
  RequestHeaders: t.Type<HS, Headers>;
  Request: t.Type<SS, Json>;
  ResponseHeaders: t.Type<TH, Headers>;
  targetHints: TH;
  Response: t.Type<TS, Json>;
};
export const endpoint = <UT, UV, HS, SS, TH, TS>(
  hrefTemplate: UT,
  HrefTemplateVariables: t.Type<UV, URIVariables>,
  RequestHeaders: t.Type<HS, Headers>,
  Request: t.Type<SS, Json>,
  ResponseHeaders: t.Type<TH, Headers>,
  targetHints: TH,
  Response: t.Type<TS, Json>,
): Endpoint<UT, UV, HS, SS, TH, TS> => ({
  hrefTemplate,
  HrefTemplateVariables,
  RequestHeaders,
  Request,
  ResponseHeaders,
  targetHints,
  Response,
});

export function fromHyperSchema<UT, UV, HS, SS, TH, TS>(
  hyper: HyperSchema<UT, UV, HS, SS, TH, TS>,
): Endpoint<UT, UV, HS, SS, TH, TS> {
  /* eslint-disable @typescript-eslint/naming-convention */
  const {
    default_links_implementation_TargetHints,
    default_links_implementation_Href,
    _links_implementation_HrefSchema,
    _links_implementation_TargetHints,
    _links_implementation_HeaderSchema,
    _links_implementation_SubmissionSchema,
    _links_implementation_TargetSchema,
  } = hyper;
  /* eslint-enable @typescript-eslint/naming-convention */

  return endpoint(
    default_links_implementation_Href,
    _links_implementation_HrefSchema,
    _links_implementation_HeaderSchema,
    _links_implementation_SubmissionSchema,
    _links_implementation_TargetHints,
    default_links_implementation_TargetHints,
    _links_implementation_TargetSchema,
  );
}
