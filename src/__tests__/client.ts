import { client } from '../client';

describe('io-ts-rpc', () => {
  it('should provide rpc client', () => {
    expect(typeof client).not.toEqual('undefined');
  });
});
