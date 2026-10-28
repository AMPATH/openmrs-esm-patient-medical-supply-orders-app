import React, { type ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Tile } from '@carbon/react';
import classNames from 'classnames';
import styles from './medical-supply-order-panel.scss';
import {
  AddIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  launchWorkspace2,
  showSnackbar,
  useConfig,
  useLayoutType,
} from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import * as esmFramework from '@openmrs/esm-framework';
import { type OrderBasketExtensionProps, useOrderBasket, useOrderType } from '@openmrs/esm-patient-common-lib';

interface Workspace2StoreActions {
  openChildWorkspace(
    parentWorkspaceName: string,
    childWorkspaceName: string,
    childWorkspaceProps: Record<string, unknown>,
  ): void;
}

/**
 * The workspace2 store is exposed on the framework at runtime (useWorkspace2Store) but is not
 * part of the typed public API, hence the defensive lookup.
 */
function getWorkspace2StoreActions(): Workspace2StoreActions | null {
  const hook = (esmFramework as unknown as Record<string, unknown>).useWorkspace2Store as
    (() => Workspace2StoreActions | null) | undefined;
  return typeof hook === 'function' ? hook() : null;
}
import OrderBasketItemTile from './order-basket-item-tile.component';
import { prepOrderPostData } from './resources';
import { type ConfigObject } from '../config-schema';
import type { MedicalSupplyOrderBasketItem } from './types';

const MedicalSupplyOrderPanel: React.FC<OrderBasketExtensionProps> = ({ patient }) => {
  const { orderTypes } = useConfig<ConfigObject>();
  return (
    <>
      {orderTypes.map(({ orderTypeUuid, orderableConceptSets }) => (
        <MedicalSupplyOrderType
          key={orderTypeUuid}
          orderTypeUuid={orderTypeUuid}
          orderableConceptSets={orderableConceptSets}
          patient={patient}
        />
      ))}
    </>
  );
};

interface MedicalSupplyOrderTypeProps {
  orderTypeUuid: string;
  orderableConceptSets: Array<string>;
  patient: fhir.Patient;
}

const MedicalSupplyOrderType: React.FC<MedicalSupplyOrderTypeProps> = ({ orderTypeUuid, patient }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { orderType, isLoadingOrderType } = useOrderType(orderTypeUuid);
  const workspace2Actions = getWorkspace2StoreActions();

  const { orders, setOrders } = useOrderBasket<MedicalSupplyOrderBasketItem>(patient, orderTypeUuid, prepOrderPostData);
  const [isExpanded, setIsExpanded] = useState(orders.length > 0);
  const {
    incompleteOrderBasketItems,
    newOrderBasketItems,
    renewedOrderBasketItems,
    revisedOrderBasketItems,
    discontinuedOrderBasketItems,
  } = useMemo(() => {
    const incompleteOrderBasketItems: Array<MedicalSupplyOrderBasketItem> = [];
    const newOrderBasketItems: Array<MedicalSupplyOrderBasketItem> = [];
    const renewedOrderBasketItems: Array<MedicalSupplyOrderBasketItem> = [];
    const revisedOrderBasketItems: Array<MedicalSupplyOrderBasketItem> = [];
    const discontinuedOrderBasketItems: Array<MedicalSupplyOrderBasketItem> = [];

    orders.forEach((order) => {
      if (order?.isOrderIncomplete) {
        incompleteOrderBasketItems.push(order);
      } else if (order.action === 'NEW') {
        newOrderBasketItems.push(order);
      } else if (order.action === 'RENEW') {
        renewedOrderBasketItems.push(order);
      } else if (order.action === 'REVISE') {
        revisedOrderBasketItems.push(order);
      } else if (order.action === 'DISCONTINUE') {
        discontinuedOrderBasketItems.push(order);
      }
    });

    return {
      incompleteOrderBasketItems,
      newOrderBasketItems,
      renewedOrderBasketItems,
      revisedOrderBasketItems,
      discontinuedOrderBasketItems,
    };
  }, [orders]);

  // Open the search as a CHILD of the order basket root whenever possible (the reference
  // pattern for basket tiles). A root launch evicts the basket from its window, and while the
  // search is the window's root, launching the basket again (e.g. via the cart button) makes
  // the framework append a duplicate window entry, which blanks the workspace layer until a
  // page refresh. Child launches keep the basket root in place, so the window never breaks.
  const launchSearchWorkspace = (workspaceProps: { order?: MedicalSupplyOrderBasketItem; orderTypeUuid: string }) => {
    if (workspace2Actions?.openChildWorkspace) {
      try {
        workspace2Actions.openChildWorkspace(
          'order-basket',
          'medical-supply-orderable-concept-workspace',
          workspaceProps,
        );
        return;
      } catch (err) {
        console.warn('Child workspace launch failed; falling back to a root launch', err);
      }
    }
    launchWorkspace2('medical-supply-orderable-concept-workspace', workspaceProps).catch((err) => {
      console.error(`Failed to launch medical-supply-orderable-concept-workspace: ${err}`);
      showSnackbar({
        title: t('errorLaunchingWorkspace', 'Error launching workspace'),
        subtitle: err?.message,
        kind: 'error',
      });
    });
  };

  const openConceptSearch = () => {
    launchSearchWorkspace({ orderTypeUuid });
  };

  const openOrderForm = (order: MedicalSupplyOrderBasketItem) => {
    launchSearchWorkspace({ order, orderTypeUuid });
  };

  const removeOrder = useCallback(
    (order: MedicalSupplyOrderBasketItem) => {
      const newOrders = [...orders];
      newOrders.splice(orders.indexOf(order), 1);
      setOrders(newOrders);
    },
    [orders, setOrders],
  );

  useEffect(() => {
    setIsExpanded(orders.length > 0);
  }, [orders]);

  if (isLoadingOrderType) {
    return null;
  }

  return (
    <Tile
      className={classNames(isTablet ? styles.tabletTile : styles.desktopTile, { [styles.collapsedTile]: !isExpanded })}
    >
      <div className={styles.container}>
        <div className={styles.iconAndLabel}>
          {/* <RxIcon isTablet={isTablet} /> */}
          {/* TODO: Add Icon */}
          <h4 className={styles.heading}>{`${orderType?.display} (${orders.length})`}</h4>
        </div>
        <div className={styles.buttonContainer}>
          <Button
            className={styles.addButton}
            kind="ghost"
            renderIcon={(props: ComponentProps<typeof AddIcon>) => <AddIcon size={16} {...props} />}
            iconDescription="Add medication"
            onClick={openConceptSearch}
            size={isTablet ? 'md' : 'sm'}
          >
            {t('add', 'Add')}
          </Button>
          <Button
            className={styles.chevron}
            hasIconOnly
            kind="ghost"
            renderIcon={(props: ComponentProps<typeof ChevronUpIcon>) =>
              isExpanded ? <ChevronUpIcon size={16} {...props} /> : <ChevronDownIcon size={16} {...props} />
            }
            iconDescription="View"
            disabled={orders.length === 0}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {t('add', 'Add')}
          </Button>
        </div>
      </div>
      {isExpanded && (
        <>
          {incompleteOrderBasketItems.length > 0 && (
            <>
              {incompleteOrderBasketItems.map((order, index) => (
                <OrderBasketItemTile
                  key={index}
                  orderBasketItem={order}
                  onItemClick={() => openOrderForm(order)}
                  onRemoveClick={() => removeOrder(order)}
                />
              ))}
            </>
          )}
          {newOrderBasketItems.length > 0 && (
            <>
              {newOrderBasketItems.map((order, index) => (
                <OrderBasketItemTile
                  key={index}
                  orderBasketItem={order}
                  onItemClick={() => openOrderForm(order)}
                  onRemoveClick={() => removeOrder(order)}
                />
              ))}
            </>
          )}

          {renewedOrderBasketItems.length > 0 && (
            <>
              {renewedOrderBasketItems.map((item, index) => (
                <OrderBasketItemTile
                  key={index}
                  orderBasketItem={item}
                  onItemClick={() => openOrderForm(item)}
                  onRemoveClick={() => removeOrder(item)}
                />
              ))}
            </>
          )}

          {revisedOrderBasketItems.length > 0 && (
            <>
              {revisedOrderBasketItems.map((item, index) => (
                <OrderBasketItemTile
                  key={index}
                  orderBasketItem={item}
                  onItemClick={() => openOrderForm(item)}
                  onRemoveClick={() => removeOrder(item)}
                />
              ))}
            </>
          )}

          {discontinuedOrderBasketItems.length > 0 && (
            <>
              {discontinuedOrderBasketItems.map((item, index) => (
                <OrderBasketItemTile
                  key={index}
                  orderBasketItem={item}
                  onItemClick={() => openOrderForm(item)}
                  onRemoveClick={() => removeOrder(item)}
                />
              ))}
            </>
          )}
        </>
      )}
    </Tile>
  );
};

export default MedicalSupplyOrderPanel;
