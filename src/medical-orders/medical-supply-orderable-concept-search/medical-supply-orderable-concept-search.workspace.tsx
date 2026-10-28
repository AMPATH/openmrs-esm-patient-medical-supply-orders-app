import {
  ArrowLeftIcon,
  ResponsiveWrapper,
  Workspace2,
  launchWorkspace2,
  showSnackbar,
  useConfig,
  useDebounce,
  useLayoutType,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import {
  type PatientWorkspace2DefinitionProps,
  type OrderBasketItem,
  type OrderBasketWindowProps,
  useOrderBasket,
  useOrderType,
} from '@openmrs/esm-patient-common-lib';
import React, { type ComponentProps, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './medical-supply-orderable-concept-search.scss';
import { Button, Search } from '@carbon/react';
import OrderableConceptSearchResults from './search-results.component';
import { type ConfigObject } from '../../config-schema';
import { OrderForm } from '../medical-supply-order-form/medical-supply-order-form.component';
import { ordersEqual, prepOrderPostData } from '../resources';
import { type MedicalSupplyOrderBasketItem } from '../types';

interface OrderableConceptSearchWorkspaceProps {
  order?: MedicalSupplyOrderBasketItem;
  orderTypeUuid: string;
}

export const careSettingUuid = '6f0c9a92-6f24-11e3-af88-005056821db0';

const OrderableConceptSearchWorkspace: React.FC<
  PatientWorkspace2DefinitionProps<OrderableConceptSearchWorkspaceProps, OrderBasketWindowProps>
> = ({ workspaceProps, groupProps }) => {
  const { order: initialOrder, orderTypeUuid } = workspaceProps;
  const { patient } = groupProps;
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { orders } = useOrderBasket<MedicalSupplyOrderBasketItem>(patient, orderTypeUuid, prepOrderPostData);
  const { orderType } = useOrderType(orderTypeUuid);
  const { orderTypes } = useConfig<ConfigObject>();

  const title = t('addOrderForOrderType', 'Add {{orderTypeDisplay}}', {
    orderTypeDisplay: orderType?.display?.toLocaleLowerCase() ?? '',
  });

  const [currentOrder, setCurrentOrder] = useState<MedicalSupplyOrderBasketItem>(initialOrder);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const orderableConceptSets = useMemo(
    () => orderTypes.find((orderType) => orderType.orderTypeUuid === orderTypeUuid)?.orderableConceptSets ?? [],
    [orderTypeUuid, orderTypes],
  );

  const cancelDrugOrder = useCallback(() => {
    // Swap the window's root workspace back to the order basket directly. Closing this workspace
    // first would empty the window and tear down the workspace group, leaving the basket
    // unopenable until a refresh. The swap preserves the current group props.
    launchWorkspace2('order-basket').catch((err) => {
      console.error(`Failed to return to the order basket: ${err}`);
      showSnackbar({
        title: t('errorLaunchingWorkspace', 'Error launching workspace'),
        subtitle: err?.message,
        kind: 'error',
      });
    });
  }, [t]);

  const openOrderForm = useCallback(
    (order: MedicalSupplyOrderBasketItem) => {
      const existingOrder = orders.find((prevOrder) => ordersEqual(prevOrder, order));
      if (existingOrder) {
        setCurrentOrder(existingOrder);
      } else {
        setCurrentOrder(order);
      }
    },
    [orders],
  );

  return (
    <Workspace2 title={title} hasUnsavedChanges={hasUnsavedChanges}>
      <div className={styles.workspaceWrapper}>
        {!isTablet && (
          <div className={styles.backButton}>
            <Button
              iconDescription="Return to order basket"
              kind="ghost"
              onClick={cancelDrugOrder}
              renderIcon={(props: ComponentProps<typeof ArrowLeftIcon>) => <ArrowLeftIcon size={24} {...props} />}
              size="sm"
            >
              <span>{t('backToOrderBasket', 'Back to order basket')}</span>
            </Button>
          </div>
        )}
        {currentOrder ? (
          <OrderForm
            initialOrder={currentOrder}
            setHasUnsavedChanges={setHasUnsavedChanges}
            orderTypeUuid={orderTypeUuid}
            orderableConceptSets={orderableConceptSets}
            patient={patient}
          />
        ) : (
          <ConceptSearch
            openOrderForm={openOrderForm}
            orderableConceptSets={orderableConceptSets}
            orderTypeUuid={orderTypeUuid}
            patient={patient}
          />
        )}
      </div>
    </Workspace2>
  );
};

interface ConceptSearchProps {
  openOrderForm: (search: OrderBasketItem) => void;
  orderTypeUuid: string;
  orderableConceptSets: Array<string>;
  patient: fhir.Patient;
}

function ConceptSearch({ orderTypeUuid, openOrderForm, orderableConceptSets, patient }: ConceptSearchProps) {
  const { t } = useTranslation();
  const { orderType } = useOrderType(orderTypeUuid);
  const isTablet = useLayoutType() === 'tablet';
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const searchInputRef = useRef(null);

  const cancelDrugOrder = useCallback(() => {
    // Swap the window's root workspace back to the order basket directly. Closing this workspace
    // first would empty the window and tear down the workspace group, leaving the basket
    // unopenable until a refresh. The swap preserves the current group props.
    launchWorkspace2('order-basket').catch((err) => {
      console.error(`Failed to return to the order basket: ${err}`);
      showSnackbar({
        title: t('errorLaunchingWorkspace', 'Error launching workspace'),
        subtitle: err?.message,
        kind: 'error',
      });
    });
  }, [t]);

  const focusAndClearSearchInput = () => {
    setSearchTerm('');
    searchInputRef.current?.focus();
  };

  const handleSearchTermChange = (event: { target: HTMLInputElement }) => setSearchTerm(event.target.value ?? '');

  return (
    <div className={styles.searchPopupContainer}>
      <ResponsiveWrapper>
        <Search
          autoFocus
          size="lg"
          placeholder={t('searchFieldOrder', 'Search for {{orderType}} order', {
            orderType: orderType?.display ?? '',
          })}
          labelText={t('searchFieldOrder', 'Search for {{orderType}} order', {
            orderType: orderType?.display ?? '',
          })}
          onChange={handleSearchTermChange}
          ref={searchInputRef}
          value={searchTerm}
        />
      </ResponsiveWrapper>
      <OrderableConceptSearchResults
        searchTerm={debouncedSearchTerm}
        openOrderForm={openOrderForm}
        focusAndClearSearchInput={focusAndClearSearchInput}
        orderTypeUuid={orderTypeUuid}
        cancelOrder={() => {}}
        orderableConceptSets={orderableConceptSets}
        patient={patient}
      />
      {isTablet && (
        <div className={styles.separatorContainer}>
          <p className={styles.separator}>{t('or', 'or')}</p>
          <Button iconDescription="Return to order basket" kind="ghost" onClick={cancelDrugOrder}>
            {t('returnToOrderBasket', 'Return to order basket')}
          </Button>
        </div>
      )}
    </div>
  );
}

export default OrderableConceptSearchWorkspace;
