import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, LayoutDashboard, Upload, Settings, CreditCard, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/upload', label: 'Upload', icon: Upload },
  { to: '/app/settings/notifications', label: 'Notifications', icon: Settings },
  { to: '/app/billing', label: 'Billing', icon: CreditCard },
];

const getPageMeta = (pathname: string) => {
  if (pathname === '/app') {
    return {
      title: 'Portfolio Overview',
      description: 'Monitor contract activity, upcoming deadlines, and operational risk.',
    };
  }

  if (pathname === '/app/upload') {
    return {
      title: 'Intake Queue',
      description: 'Add new agreements and prepare them for structured review.',
    };
  }

  if (pathname === '/app/settings/notifications') {
    return {
      title: 'Notification Settings',
      description: 'Control reminder channels and escalation timing.',
    };
  }

  if (pathname === '/app/billing') {
    return {
      title: 'Billing',
      description: 'Review plan details, invoices, and subscription controls.',
    };
  }

  if (pathname.startsWith('/app/contracts/')) {
    return {
      title: 'Contract Record',
      description: 'Review extracted metadata, files, deadlines, and history.',
    };
  }

  return {
    title: 'Workspace',
    description: 'Manage the full contract lifecycle from a single control surface.',
  };
};

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut } = useAuth();
  const pageMeta = getPageMeta(location.pathname);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 z-30 hidden w-72 flex-col border-r bg-sidebar lg:flex">
        <div className="border-b px-6 py-5">
          <Link to="/app" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-sidebar-border bg-background">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">ContractGuardAI</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Contract operations
              </p>
            </div>
          </Link>
        </div>
        <div className="flex-1 px-4 py-5">
          <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
          <nav className="space-y-1">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 border px-3 py-2.5 text-sm font-medium transition-colors',
                  location.pathname === item.to
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-transparent text-muted-foreground hover:border-sidebar-border hover:bg-background hover:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t p-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:ml-72">
        <div className="fixed inset-x-0 top-0 z-40 border-b bg-background lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link to="/app" className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center border bg-muted">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">ContractGuardAI</p>
              </div>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
          {mobileOpen && (
            <div className="border-t bg-sidebar px-4 py-4">
              <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
              <nav className="space-y-1">
                {navItems.map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 border px-3 py-2.5 text-sm font-medium transition-colors',
                      location.pathname === item.to
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-transparent text-muted-foreground hover:border-sidebar-border hover:bg-background hover:text-foreground',
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 w-full justify-start gap-2"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </nav>
            </div>
          )}
        </div>

        <header className="sticky top-0 z-20 hidden border-b bg-background lg:block">
          <div className="flex items-center justify-between px-8 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
              <h1 className="mt-1 text-sm font-semibold">{pageMeta.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{pageMeta.description}</p>
            </div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Secure operations</p>
          </div>
        </header>

        <main className="flex-1 pt-14 lg:pt-0">
          <div className="mx-auto w-full max-w-7xl p-5 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
