import { SiweNonceStore } from './siwe-nonce.store';

describe('SiweNonceStore', () => {
  let store: SiweNonceStore;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    store = new SiweNonceStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('issues a non-empty nonce that can be consumed exactly once', () => {
    const nonce = store.issue();
    expect(nonce).toMatch(/^[A-Za-z0-9]+$/);
    expect(store.consume(nonce)).toBe(true);
    expect(store.consume(nonce)).toBe(false);
  });

  it('rejects an unknown nonce', () => {
    expect(store.consume('never-issued')).toBe(false);
  });

  it('rejects a nonce older than the TTL', () => {
    const nonce = store.issue();
    jest.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(store.consume(nonce)).toBe(false);
  });
});
