import { buildMedicalSupplyOrderItem, createEmptyOrder, prepOrderPostData } from './resources';

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

describe('REST type per order type', () => {
  const concept = { uuid: 'c-1', display: 'RUTF' } as any;
  const withQuantity = (item) => ({ ...item, quantity: 2, quantityUnits: { uuid: 'sachets', display: 'Sachets' } });

  it('posts medicalsupplyorder by default', () => {
    const payload = prepOrderPostData(withQuantity(createEmptyOrder(concept, 'orderer-1', 'ot-1')), 'pat-1', 'enc-1');
    expect(payload.type).toBe('medicalsupplyorder');
  });

  it('posts the configured REST type for new orders', () => {
    const order = withQuantity(createEmptyOrder(concept, 'orderer-1', 'nutrition-type', 'commodityorder'));
    const payload = prepOrderPostData(order, 'pat-1', 'enc-1');
    expect(payload.type).toBe('commodityorder');
    expect(payload.orderType).toBe('nutrition-type');
  });

  it("keeps the existing order's REST type when revising or discontinuing", () => {
    const existing = {
      uuid: 'order-1',
      display: 'RUTF',
      type: 'commodityorder',
      orderer: { uuid: 'orderer-1' },
      careSetting: { uuid: 'care-1' },
      urgency: 'ROUTINE',
      concept,
      orderNumber: 'ORD-1',
      orderType: { uuid: 'nutrition-type' },
      quantity: 2,
      quantityUnits: { uuid: 'sachets', display: 'Sachets' },
    } as any;
    expect(prepOrderPostData(buildMedicalSupplyOrderItem(existing, 'REVISE'), 'pat-1', 'enc-1').type).toBe(
      'commodityorder',
    );
    expect(prepOrderPostData(buildMedicalSupplyOrderItem(existing, 'DISCONTINUE'), 'pat-1', 'enc-1').type).toBe(
      'commodityorder',
    );
  });
});
