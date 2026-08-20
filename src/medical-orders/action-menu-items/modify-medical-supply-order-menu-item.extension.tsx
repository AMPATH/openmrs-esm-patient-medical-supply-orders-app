import React from 'react';
import { Layer, OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { useLaunchWorkspaceRequiringVisit, useOrderBasket, type Order } from '@openmrs/esm-patient-common-lib';
import { type MedicalSupplyOrderBasketItem } from '../types';
import { buildMedicalSupplyOrderItem } from '../resources';
import { useTranslation } from 'react-i18next';

interface ModifyMedicalSupplyOrderMenuItemProps {
  orderItem: Order;
  className: string;
  responsiveSize: 'xs' | 'sm' | 'md' | 'lg';
}

export default function ModifyMedicalSupplyOrderMenuItem({
  className,
  orderItem,
  responsiveSize,
}: ModifyMedicalSupplyOrderMenuItemProps) {
  const { t } = useTranslation();
  const patientUuid = orderItem.patient.uuid;
  const patient = { id: patientUuid } as fhir.Patient;
  const openMedicalSupplyOrderFormWorkspace = useLaunchWorkspaceRequiringVisit(
    patientUuid,
    'medical-supply-orderable-concept-workspace',
  );
  const launchOrderBasket = useLaunchWorkspaceRequiringVisit(patientUuid, 'order-basket');

  const { orders, setOrders } = useOrderBasket<MedicalSupplyOrderBasketItem>(patient, orderItem.orderType.uuid);
  const alreadyInBasket = orders.some((x) => x.uuid === orderItem.uuid);

  const handleModifyOrder = () => {
    const order = buildMedicalSupplyOrderItem(orderItem, 'REVISE');
    setOrders([...orders, order]);
    openMedicalSupplyOrderFormWorkspace({
      orderTypeUuid: orderItem.orderType.uuid,
      order,
    });
  };

  const handleCancelOrder = () => {
    const order = buildMedicalSupplyOrderItem(orderItem, 'DISCONTINUE');
    setOrders([...orders, order]);
    launchOrderBasket();
  };

  return (
    <Layer>
      <OverflowMenu
        align="left"
        flipped
        aria-label={t('actionsMenu', 'Actions menu')}
        selectorPrimaryFocus={'#modify'}
        size={responsiveSize}
      >
        <OverflowMenuItem
          className={className}
          disabled={alreadyInBasket}
          id="modify"
          itemText={t('modifyOrder', 'Modify order')}
          onClick={handleModifyOrder}
        />
        <OverflowMenuItem
          className={className}
          disabled={alreadyInBasket || orderItem?.action === 'DISCONTINUE'}
          hasDivider
          id="discontinue"
          isDelete
          itemText={t('cancelOrder', 'Cancel order')}
          onClick={handleCancelOrder}
        />
      </OverflowMenu>
    </Layer>
  );
}
