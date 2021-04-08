export type Warnings = Array<RpcError>;
export type These<E, A> = {
  body: A;
  warnings: E;
};

export type RpcError = {
  reason: string;
  debug?: Record<string, unknown>;
};
export const rpcError = (reason: string, debug?: Record<string, unknown>): RpcError => ({
  reason,
  debug,
});
