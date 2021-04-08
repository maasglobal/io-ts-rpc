export type Method = 'POST' | 'GET';
export type HeaderName = string;
export type HeaderCSV = string;
export type Headers = Record<HeaderName, HeaderCSV>;
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
  text: () => Promise<string>;
  headers: {
    forEach: (cb: (csv: HeaderCSV, n: HeaderName) => void) => void;
  };
};

export type Fetch = (u: FetchLocation, o: FetchOptions) => Promise<FetchResult>;
