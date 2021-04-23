export type RpcError = {
  reason: string;
  debug?: Record<string, unknown>;
};
export const rpcError = (reason: string, debug?: Record<string, unknown>): RpcError => ({
  reason,
  debug,
});

export type Errors = Array<RpcError>;
export function singleError(...args: Parameters<typeof rpcError>): Errors {
  return [rpcError(...args)];
}
