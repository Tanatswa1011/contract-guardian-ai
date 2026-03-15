import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

export default function PublicLayout() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="container flex h-12 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-sm tracking-tight">
            <Shield className="h-4 w-4" />
            <span>ContractGuard</span>
          </Link>
          {!isAuthPage && (
            <nav className="flex items-center gap-4">
              <Link to="/pricing" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                Pricing
              </Link>
              <Link to="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link to="/signup">
                <Button size="sm">Start Free Trial</Button>
              </Link>
            </nav>
          )}
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t py-10">
        <div className="container grid grid-cols-2 md:grid-cols-4 gap-8 text-xs">
          <div>
            <div className="flex items-center gap-2 font-semibold text-sm mb-3">
              <Shield className="h-4 w-4" />
              ContractGuard
            </div>
            <p className="text-muted-foreground leading-relaxed">Contract deadline management for teams that can't afford to miss a renewal.</p>
          </div>
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider mb-3">Product</h4>
            <div className="space-y-2 text-muted-foreground">
              <p>Features</p>
              <Link to="/pricing" className="block hover:text-foreground transition-colors">Pricing</Link>
              <p>Security</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider mb-3">Company</h4>
            <div className="space-y-2 text-muted-foreground">
              <p>About</p>
              <p>Blog</p>
              <p>Careers</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider mb-3">Legal</h4>
            <div className="space-y-2 text-muted-foreground">
              <p>Privacy</p>
              <p>Terms</p>
              <p>DPA</p>
            </div>
          </div>
        </div>
        <div className="container mt-8 pt-6 border-t text-center text-xs text-muted-foreground">
          &copy; 2026 ContractGuard. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
