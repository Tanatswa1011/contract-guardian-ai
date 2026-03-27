import { LayoutDashboard, Mail, Bell, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DemoProvider, useDemo } from '@/contexts/DemoContext';
import DemoBanner from '@/components/demo/DemoBanner';
import DemoDashboard from '@/components/demo/DemoDashboard';
import DemoContractDetail from '@/components/demo/DemoContractDetail';
import DemoEmailPreview from '@/components/demo/DemoEmailPreview';
import DemoNotificationFeed from '@/components/demo/DemoNotificationFeed';
import LogoFull from '@/components/logos/LogoFull';

function DemoContent() {
  const { activeView, setActiveView, setSelectedContractId } = useDemo();

  const nav = [
    { key: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { key: 'emails' as const, label: 'Email Templates', icon: Mail },
    { key: 'notifications' as const, label: 'Notifications', icon: Bell },
  ];

  const handleNav = (key: typeof activeView) => {
    if (key !== 'contract') {
      setSelectedContractId(null);
    }
    setActiveView(key);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DemoBanner />
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden md:flex w-56 flex-col border-r border-border bg-sidebar">
          <div className="p-4 border-b border-border">
            <LogoFull />
          </div>
          <div className="p-3 space-y-0.5 flex-1">
            {nav.map(item => (
              <button
                key={item.key}
                onClick={() => handleNav(item.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-sm transition-colors ${
                  activeView === item.key ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground">
              <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold">D</div>
              <div>
                <div className="text-sm font-medium text-foreground">Demo User</div>
                <div className="text-[11px]">demo@contractguard.ai</div>
              </div>
            </div>
            <Link to="/">
              <Button variant="ghost" size="sm" className="w-full justify-start mt-2 text-muted-foreground">
                <LogOut className="h-3.5 w-3.5 mr-2" /> Exit Demo
              </Button>
            </Link>
          </div>
        </aside>

        {/* Mobile nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex">
          {nav.map(item => (
            <button
              key={item.key}
              onClick={() => handleNav(item.key)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] ${
                activeView === item.key ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Main */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="max-w-5xl mx-auto p-6 md:p-8">
            {activeView === 'dashboard' && <DemoDashboard />}
            {activeView === 'contract' && <DemoContractDetail />}
            {activeView === 'emails' && <DemoEmailPreview />}
            {activeView === 'notifications' && <DemoNotificationFeed />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <DemoProvider>
      <DemoContent />
    </DemoProvider>
  );
}
