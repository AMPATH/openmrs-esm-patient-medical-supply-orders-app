import { createEmptyOrder, prepOrderPostData } from './resources';

describe('createEmptyOrder', () => {
  it('sets a defined display from the concept so basket toasts categorize the order as placed', () => {
    const concept = { uuid: 'c-1', display: 'GAUZE' } as any;
    const order = createEmptyOrder(concept, 'orderer-1', 'ot-1');
    expect(order.action).toBe('NEW');
    expect(order.display).toBe('GAUZE');
  });

  it('sets the order type so the backend never has to infer it from the concept class', () => {
    const concept = { uuid: 'c-1', display: 'GAUZE' } as any;
    const order = createEmptyOrder(concept, 'orderer-1', 'ot-1');
    expect(order.orderType).toBe('ot-1');
  });
});

describe('prepOrderPostData', () => {
  it('posts the order type on a new order', () => {
    const concept = { uuid: 'c-1', display: 'GAUZE' } as any;
    const order = {
      ...createEmptyOrder(concept, 'orderer-1', 'ot-1'),
      quantity: 2,
      quantityUnits: { uuid: 'unit-1', display: 'Pieces' },
    };
    const payload = prepOrderPostData(order, 'pat-1', 'enc-1');
    expect(payload.orderType).toBe('ot-1');
    expect(payload.type).toBe('medicalsupplyorder');
  });
});
