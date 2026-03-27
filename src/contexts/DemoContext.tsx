import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createDemoContracts, createDemoNotifications, DemoContract, DemoNotification } from '@/data/demo';

interface DemoContextType {
  contracts: DemoContract[];
  notifications: DemoNotification[];
  selectedContractId: string | null;
  setSelectedContractId: (id: string | null) => void;
  activeView: 'dashboard' | 'contract' | 'emails' | 'notifications';
  setActiveView: (view: 'dashboard' | 'contract' | 'emails' | 'notifications') => void;
  resetDemo: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

function initContracts() { return createDemoContracts(); }
function initNotifications(c: DemoContract[]) { return createDemoNotifications(c); }

export function DemoProvider({ children }: { children: ReactNode }) {
  const [contracts, setContracts] = useState<DemoContract[]>(initContracts);
  const [notifications, setNotifications] = useState<DemoNotification[]>(() => initNotifications(contracts));
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'contract' | 'emails' | 'notifications'>('dashboard');

  const resetDemo = useCallback(() => {
    const c = initContracts();
    setContracts(c);
    setNotifications(initNotifications(c));
    setSelectedContractId(null);
    setActiveView('dashboard');
  }, []);

  const handleSelectContract = useCallback((id: string | null) => {
    setSelectedContractId(id);
    if (id) setActiveView('contract');
  }, []);

  return (
    <DemoContext.Provider value={{ contracts, notifications, selectedContractId, setSelectedContractId: handleSelectContract, activeView, setActiveView, resetDemo }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
}
