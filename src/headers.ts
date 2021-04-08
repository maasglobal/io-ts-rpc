import { FetchResult, HeaderCSV, HeaderName, Headers } from './fetch';

export function fromFetchResult(result: FetchResult): Headers {
  const tmp: Array<[HeaderName, HeaderCSV]> = [];
  // forEach returns value, key instead of key, value
  result.headers.forEach((csv, name) => {
    tmp.push([name, csv]);
  });
  return Object.fromEntries(tmp);
}
