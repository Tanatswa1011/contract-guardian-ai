import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, LayoutDashboard, Upload, Settings, CreditCard, LogOut, Menu, X, ChevronsUpDown, Plus, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/upload', label: 'Upload', icon: Upload },
  { to: '/app/billing', label: 'Billing', icon: CreditCard },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

function WorkspaceSwitcher({ onSelect }: { onSelect?: () => void }) {
  const navigate = useNavigate();
  const { workspaces, currentWorkspace, currentWorkspaceId, setCurrentWorkspaceId } = useWorkspace();

  if (!currentWorkspace || workspaces.length === 0) return null;

  const handleSwitch = (workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId);
    onSelect?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-auto w-full justify-between border-border bg-background px-3 py-2 text-left font-normal"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{currentWorkspace.name}</p>
            <p className="truncate text-xs text-muted-foreground">Current workspace</p>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((workspace) => (
          <DropdownMenuItem key={workspace.id} onClick={() => handleSwitch(workspace.id)} className="justify-between">
            <span className="truncate pr-2">{workspace.name}</span>
            {currentWorkspaceId === workspace.id ? <Check className="h-4 w-4 text-muted-foreground" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            onSelect?.();
            navigate('/create-workspace');
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 z-30 hidden w-64 flex-col border-r bg-sidebar lg:flex">
        <div className="border-b px-4 py-4 space-y-3">
          <Link to="/app" className="flex items-center gap-2 text-sm font-semibold tracking-wide">
            <Shield className="h-4 w-4 text-foreground" />
            ContractGuardAI
          </Link>
          <div className="mt-4">
            <WorkspaceSwitcher />
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 border px-3 py-2 text-sm font-medium transition-colors",
                location.pathname === item.to
                  ? "border-foreground bg-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-4">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="fixed inset-x-0 top-0 z-40 border-b bg-background lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/app" className="flex items-center gap-2 text-sm font-semibold tracking-wide">
            <Shield className="h-4 w-4 text-foreground" />
            ContractGuardAI
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        {mobileOpen && (
          <nav className="space-y-1 border-t bg-background p-4">
            <div className="mb-3">
              <WorkspaceSwitcher onSelect={() => setMobileOpen(false)} />
            </div>
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 border px-3 py-2 text-sm font-medium transition-colors",
                  location.pathname === item.to
                    ? "border-foreground bg-accent text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground mt-2" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </nav>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 mt-14 lg:mt-0">
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
