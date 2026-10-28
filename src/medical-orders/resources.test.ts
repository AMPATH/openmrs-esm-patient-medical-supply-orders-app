import { createEmptyOrder } from './resources';

describe('createEmptyOrder', () => {
  it('sets a defined display from the concept so basket toasts categorize the order as placed', () => {
    const concept = { uuid: 'c-1', display: 'GAUZE' } as any;
    const order = createEmptyOrder(concept, 'orderer-1');
    expect(order.action).toBe('NEW');
    expect(order.display).toBe('GAUZE');
  });
});
