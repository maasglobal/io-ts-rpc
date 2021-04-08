import * as t from 'io-ts';

import { Json } from './endpoint';
import { Headers } from './fetch';
import { URIVariables } from './uri-template';

/* eslint-disable @typescript-eslint/naming-convention */
export type HyperSchema<UT, UV, HS, SS, TH, TS> = {
  default_links_implementation_TargetHints: TH;
  default_links_implementation_Href: UT;
  _links_implementation_HrefSchema: t.Type<UV, URIVariables>;
  _links_implementation_TargetHints: t.Type<TH, Headers>;
  _links_implementation_HeaderSchema: t.Type<HS, Headers>;
  _links_implementation_SubmissionSchema: t.Type<SS, Json>;
  _links_implementation_TargetSchema: t.Type<TS, Json>;
};
/* eslint-enable @typescript-eslint/naming-convention */
