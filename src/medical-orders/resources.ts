import {
  type OrderBasketItem,
  priorityOptions,
  type OrderUrgency,
  type OrderPost,
  type OrderableConcept,
  type Order,
  type OrderAction,
} from '@openmrs/esm-patient-common-lib';
import { type MedicalSupplyOrderBasketItem } from './types';
import {
  openmrsFetch,
  type OpenmrsResource,
  restBaseUrl,
  type FetchResponse,
  useConfig,
  toOmrsIsoString,
} from '@openmrs/esm-framework';
import useSWRImmutable from 'swr/immutable';
import { useEffect, useMemo } from 'react';
import { type ConfigObject } from '../config-schema';

export function createEmptyOrder(concept: OrderableConcept, orderer: string): MedicalSupplyOrderBasketItem {
  return {
    action: 'NEW',
    urgency: priorityOptions[0].value as OrderUrgency,
    display: concept.label,
    concept,
    orderer,
    visit: null,
  };
}

export function ordersEqual(order1: OrderBasketItem, order2: OrderBasketItem) {
  return order1.action === order2.action && order1.concept.uuid === order2.concept.uuid;
}

const careSettingUuid = '6f0c9a92-6f24-11e3-af88-005056821db0';

interface MedicalSupplyOrderPostData extends OrderPost {
  quantity?: number;
  quantityUnits?: string;
}

export function prepOrderPostData(
  order: MedicalSupplyOrderBasketItem,
  patientUuid: string,
  encounterUuid: string | null,
): MedicalSupplyOrderPostData {
  if (order.action === 'NEW' || order.action === 'RENEW') {
    return {
      action: 'NEW',
      type: 'medicalsupplyorder',
      patient: patientUuid,
      careSetting: careSettingUuid,
      orderer: order.orderer,
      encounter: encounterUuid,
      concept: order.concept.uuid,
      instructions: order.instructions,
      // orderReason: order.orderReason,
      accessionNumber: order.accessionNumber,
      urgency: order.urgency,
      orderType: order.orderType,
      scheduledDate: order.scheduledDate ? toOmrsIsoString(order.scheduledDate) : null,
      quantity: order.quantity,
      quantityUnits: order.quantityUnits.uuid,
    };
  } else if (order.action === 'REVISE') {
    return {
      action: 'REVISE',
      type: 'medicalsupplyorder',
      patient: patientUuid,
      careSetting: order.careSetting,
      orderer: order.orderer,
      encounter: encounterUuid,
      concept: order?.concept?.uuid,
      instructions: order.instructions,
      previousOrder: order.previousOrder,
      accessionNumber: order.accessionNumber,
      urgency: order.urgency,
      orderType: order.orderType,
      scheduledDate: order.scheduledDate ? toOmrsIsoString(order.scheduledDate) : null,
      quantity: order.quantity,
      quantityUnits: order.quantityUnits.uuid,
    };
  } else if (order.action === 'DISCONTINUE') {
    return {
      action: 'DISCONTINUE',
      type: 'medicalsupplyorder',
      patient: patientUuid,
      careSetting: order.careSetting,
      orderer: order.orderer,
      encounter: encounterUuid,
      concept: order?.concept?.uuid,
      previousOrder: order.previousOrder,
      accessionNumber: order.accessionNumber,
      urgency: order.urgency,
      orderType: order.orderType,
      scheduledDate: order.scheduledDate ? toOmrsIsoString(order.scheduledDate) : null,
    };
  } else {
    throw new Error(`Unknown order action: ${order.action}.`);
  }
}

export interface Concept extends OpenmrsResource {
  setMembers: Array<Concept>;
  answers: Array<Concept>;
}

export function useQuantityUnits() {
  const config = useConfig<ConfigObject>();
  const { quantityUnits } = config;
  const { data, isLoading, isValidating, error } = useSWRImmutable<FetchResponse<Concept>>(
    quantityUnits.conceptUuid ? `${restBaseUrl}/concept/${quantityUnits.conceptUuid}` : null,
    openmrsFetch,
  );

  useEffect(() => {
    if (error) {
      reportError(error);
    }
  }, [error]);

  const results = useMemo(
    () => ({
      concepts: quantityUnits.map == 'setMembers' ? data?.data.setMembers : data?.data.answers,
      isLoadingQuantityUnits: isLoading,
      errorFetchingQuantityUnits: error,
    }),
    [data, isLoading, error, quantityUnits],
  );
  return results;
}

export function buildMedicalSupplyOrderItem(order: Order, action: OrderAction): MedicalSupplyOrderBasketItem {
  return {
    action: action,
    uuid: order.uuid,
    display: order.display,
    previousOrder: action !== 'NEW' ? order.uuid : null,
    orderer: order.orderer.uuid,
    careSetting: order.careSetting.uuid,
    instructions: order.instructions || '',
    urgency: order.urgency,
    accessionNumber: order.accessionNumber || '',
    concept: order.concept,
    orderNumber: order.orderNumber,
    orderType: order.orderType.uuid,
    quantity: order.quantity,
    quantityUnits: order.quantityUnits,
    scheduledDate: order.scheduledDate ? new Date(order.scheduledDate) : null,
    visit: null,
  };
}
