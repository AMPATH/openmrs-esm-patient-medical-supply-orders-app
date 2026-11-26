import type { OpenmrsResource } from '@openmrs/esm-framework';
import type { OrderBasketItem } from '@openmrs/esm-patient-common-lib';

export interface MedicalSupplyOrderBasketItem extends OrderBasketItem {
  careSetting?: string;
  orderer?: string;
  quantity?: number;
  quantityUnits?: OpenmrsResource;
  /** REST order type to post as, e.g. medicalsupplyorder or commodityorder; from the order type's config. */
  restType?: string;
}
