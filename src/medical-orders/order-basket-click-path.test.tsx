/**
 * Regression harness for the order basket click path: panel -> launch -> workspace render.
 * Guards against render-phase crashes of the kind that silently unmount the order basket.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useConfig } from '@openmrs/esm-framework';
import OrderableConceptSearchWorkspace from './medical-supply-orderable-concept-search/medical-supply-orderable-concept-search.workspace';
import MedicalSupplyOrderPanel from './medical-supply-order-type.component';

const patient = { uuid: 'pat-1', id: 'pat-1', display: 'Test Patient' } as unknown as fhir.Patient;

const config = {
  orderTypes: [{ orderTypeUuid: 'ot-1', orderableConceptSets: ['set-1'] }],
  showReferenceNumberField: true,
  quantityUnits: { conceptUuid: 'qu-1', map: 'setMembers' as const },
};

jest.mock('@openmrs/esm-framework', () => {
  const actual = jest.requireActual('@openmrs/esm-framework');
  return {
    ...actual,
    useConfig: jest.fn(() => config),
    useLayoutType: jest.fn(() => 'desktop'),
    launchWorkspace2: jest.fn(() => Promise.resolve(true)),
  };
});

jest.mock('@openmrs/esm-patient-common-lib', () => {
  const actual = jest.requireActual('@openmrs/esm-patient-common-lib');
  return {
    ...actual,
    useOrderType: jest.fn(() => ({
      orderType: { uuid: 'ot-1', display: 'Medical Supply' },
      isLoadingOrderType: false,
    })),
  };
});

jest.mock('swr', () => {
  const original = jest.requireActual('swr');
  return {
    ...original,
    default: (key, fn, ...rest) =>
      jest.requireActual('swr').default(key, key ? async () => ({ data: { results: [] } }) : null, ...rest),
    __esModule: true,
  };
});

// jsdom polyfill for Carbon components
(globalThis as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const groupProps = {
  patient,
  patientUuid: 'pat-1',
  visitContext: { uuid: 'visit-1' },
  mutateVisitContext: jest.fn(),
};

const workspacePropsBase = {
  launchChildWorkspace: jest.fn(() => Promise.resolve()),
  windowProps: null,
  workspaceName: 'medical-supply-orderable-concept-workspace',
  windowName: 'patient-chart-order-basket',
  isRootWorkspace: true,
  showActionMenu: false,
};

describe('medical supply order basket click path', () => {
  it('renders the panel and opens the workspace on Add click', async () => {
    const { launchWorkspace2 } = require('@openmrs/esm-framework');

    render(<MedicalSupplyOrderPanel patient={patient} />);
    expect(screen.getByText(/Medical Supply/i)).toBeInTheDocument();

    const addButtons = screen.getAllByRole('button', { name: /add/i });
    fireEvent.click(addButtons[0]);
    await waitFor(() =>
      expect(launchWorkspace2).toHaveBeenCalledWith('medical-supply-orderable-concept-workspace', {
        orderTypeUuid: 'ot-1',
      }),
    );
  });

  it('renders the concept search workspace without crashing', () => {
    render(
      <OrderableConceptSearchWorkspace
        {...(workspacePropsBase as any)}
        workspaceProps={{ orderTypeUuid: 'ot-1' }}
        groupProps={groupProps as any}
        closeWorkspace={jest.fn(() => Promise.resolve(true))}
      />,
    );

    expect(document.querySelector('.workspaceWrapper')).toBeInTheDocument();
  });

  it('renders the workspace with an initial order (order form mode)', () => {
    const initialOrder = {
      concept: { uuid: 'c-1', display: 'Gloves' },
      quantity: 1,
      action: 'NEW',
    } as any;

    render(
      <OrderableConceptSearchWorkspace
        {...(workspacePropsBase as any)}
        workspaceProps={{ order: initialOrder, orderTypeUuid: 'ot-1' }}
        groupProps={groupProps as any}
        closeWorkspace={jest.fn(() => Promise.resolve(true))}
      />,
    );

    expect(screen.getByText(/gloves/i)).toBeInTheDocument();
  });
});
