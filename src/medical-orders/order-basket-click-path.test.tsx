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

// A user session without a provider account — the field the results list dereferences.
const sessionState = { currentProvider: null, sessionId: 'sess-1' };

// Shape-identical excerpt of the MEDICAL SUPPLIES SET concept response.
const medicalSuppliesSet = {
  display: 'MEDICAL SUPPLIES SET',
  uuid: 'c6f16618-d618-49dc-9a5a-b5aef140d02c',
  setMembers: [
    {
      display: 'DIALYZER SUPPLY ITEM',
      uuid: '64211947-1114-4008-ac2a-c7c5afd4d6ee',
      names: [{ display: 'Dialyzer' }, { display: 'DIALYZER SUPPLY ITEM' }],
      setMembers: [],
    },
    {
      display: 'BLOODLINE SET',
      uuid: 'be0508b7-ac1e-4807-acbb-f5b8e7f110f6',
      names: [{ display: 'BLOODLINE SET' }, { display: 'Bloodline set' }],
      setMembers: [],
    },
    {
      display: 'STERILE GLOVES',
      uuid: 'c06ce136-0ba7-4cee-9a95-edfe35e1a6d5',
      names: [{ display: 'STERILE GLOVES' }, { display: 'Sterile gloves' }],
      setMembers: [],
    },
  ],
};

jest.mock('@openmrs/esm-framework', () => {
  const actual = jest.requireActual('@openmrs/esm-framework');
  return {
    ...actual,
    useConfig: jest.fn(() => config),
    useLayoutType: jest.fn(() => 'desktop'),
    launchWorkspace2: jest.fn(() => Promise.resolve(true)),
    useSession: jest.fn(() => sessionState),
    openmrsFetch: jest.fn(() => Promise.resolve({ data: medicalSuppliesSet })),
    restBaseUrl: '/ws/rest/v1',
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

  it('renders search results for the medical supplies set even when the user has no provider account', async () => {
    render(
      <OrderableConceptSearchWorkspace
        {...(workspacePropsBase as any)}
        workspaceProps={{ orderTypeUuid: 'ot-1' }}
        groupProps={groupProps as any}
        closeWorkspace={jest.fn(() => Promise.resolve(true))}
      />,
    );

    // The concept set fetch resolves; all set members should render as result tiles.
    await waitFor(() => expect(screen.getByText('DIALYZER SUPPLY ITEM')).toBeInTheDocument());
    expect(screen.getByText('BLOODLINE SET')).toBeInTheDocument();
    expect(screen.getByText('STERILE GLOVES')).toBeInTheDocument();
  });

  it('renders search results when filtering by a search term', async () => {
    render(
      <OrderableConceptSearchWorkspace
        {...(workspacePropsBase as any)}
        workspaceProps={{ orderTypeUuid: 'ot-1' }}
        groupProps={groupProps as any}
        closeWorkspace={jest.fn(() => Promise.resolve(true))}
      />,
    );

    await waitFor(() => expect(screen.getByText('DIALYZER SUPPLY ITEM')).toBeInTheDocument());

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'gloves' } });

    await waitFor(() => expect(screen.queryByText('BLOODLINE SET')).not.toBeInTheDocument());
    expect(screen.getByText('STERILE GLOVES')).toBeInTheDocument();
  });
});
