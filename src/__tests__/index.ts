import { tunnel } from '../index';

describe('io-ts-rpc', () => {
  it('should provide rpc tunnel', () => {
    expect(typeof tunnel).not.toEqual('undefined');
  });
});
