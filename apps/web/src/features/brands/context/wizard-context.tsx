// features/brands/context/wizard-context.tsx
// Context provider for wizard state management

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import {
  useWizardState,
  type UseWizardStateReturn,
} from '../hooks/use-wizard-state';

/**
 * Wizard context value type
 */
type WizardContextValue = UseWizardStateReturn | null;

const WizardContext = createContext<WizardContextValue>(null);

export interface WizardProviderProps {
  /** Brand data for determining step completion */
  brand: Parameters<typeof useWizardState>[0]['brand'];
  /** Child components */
  children: ReactNode;
}

/**
 * Provider component for wizard state.
 * Wraps wizard components to provide shared state access.
 */
export function WizardProvider({
  brand,
  children,
}: WizardProviderProps) {
  const wizardState = useWizardState({ brand });

  return (
    <WizardContext.Provider value={wizardState}>
      {children}
    </WizardContext.Provider>
  );
}

/**
 * Hook to access wizard state from context.
 * Must be used within a WizardProvider.
 */
export function useWizardContext(): UseWizardStateReturn {
  const context = useContext(WizardContext);
  
  if (!context) {
    throw new Error('useWizardContext must be used within a WizardProvider');
  }
  
  return context;
}

/**
 * Optional hook that returns null if not in provider.
 * Useful for components that can work both inside and outside wizard.
 */
export function useOptionalWizardContext(): UseWizardStateReturn | null {
  return useContext(WizardContext);
}
