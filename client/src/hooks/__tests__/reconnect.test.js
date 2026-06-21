import { nextBackoff } from '../useWebSocket';

describe('nextBackoff', () => {
  test('doubles the current backoff', () => {
    expect(nextBackoff(1000, 16000)).toBe(2000);
  });
});
