import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray';

export type RpcError = {
  reason: string;
  debug?: Record<string, unknown>;
};
export const rpcError = (reason: string, debug?: Record<string, unknown>): RpcError => ({
  reason,
  ...(typeof debug === 'undefined' ? {} : { debug }),
});

export type Errors = NonEmptyArray<RpcError>;
export function singleError(...args: Parameters<typeof rpcError>): Errors {
  return [rpcError(...args)];
}
