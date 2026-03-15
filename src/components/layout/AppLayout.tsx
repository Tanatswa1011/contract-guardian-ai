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

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col border-r border-sidebar-border bg-sidebar fixed inset-y-0 z-30">
        <div className="px-5 h-12 flex items-center border-b border-sidebar-border">
          <Link to="/app" className="flex items-center gap-2 font-semibold text-sm text-sidebar-foreground tracking-tight">
            <Shield className="h-4 w-4" />
            ContractGuard
          </Link>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium transition-colors",
                location.pathname === item.to
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-sidebar-border">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors w-full"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 border-b bg-background">
        <div className="flex items-center justify-between px-4 h-12">
          <Link to="/app" className="flex items-center gap-2 font-semibold text-sm tracking-tight">
            <Shield className="h-4 w-4" />
            ContractGuard
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
        {mobileOpen && (
          <nav className="border-t px-3 py-3 space-y-0.5 bg-background">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium transition-colors",
                  location.pathname === item.to
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full mt-2"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </nav>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 lg:ml-60 mt-12 lg:mt-0">
        <div className="p-5 md:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
