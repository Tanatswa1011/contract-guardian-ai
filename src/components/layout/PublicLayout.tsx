import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

export default function PublicLayout() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center border bg-muted">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-sm font-semibold tracking-tight">ContractGuardAI</span>
              <span className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Deadline oversight
              </span>
            </div>
          </Link>
          {!isAuthPage && (
            <nav className="flex items-center gap-3 sm:gap-6">
              <Link
                to="/pricing"
                className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
              >
                Pricing
              </Link>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
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
      <footer className="border-t bg-muted/20 py-12">
        <div className="container grid grid-cols-2 gap-8 text-sm md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2 font-semibold">
              <Shield className="h-4 w-4" />
              ContractGuardAI
            </div>
            <p className="leading-relaxed text-muted-foreground">
              Contract oversight for teams that need clear deadlines, auditability, and dependable reminders.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Product</h4>
            <div className="space-y-2 text-muted-foreground">
              <p>Features</p>
              <Link to="/pricing" className="block hover:text-foreground">
                Pricing
              </Link>
              <p>Security</p>
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Company</h4>
            <div className="space-y-2 text-muted-foreground">
              <p>About</p>
              <p>Blog</p>
              <p>Careers</p>
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Legal</h4>
            <div className="space-y-2 text-muted-foreground">
              <p>Privacy</p>
              <p>Terms</p>
              <p>DPA</p>
            </div>
          </div>
        </div>
        <div className="container mt-8 border-t pt-8 text-center text-xs text-muted-foreground">
          © 2026 ContractGuardAI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
