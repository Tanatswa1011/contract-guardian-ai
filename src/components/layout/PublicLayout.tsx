import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

export default function PublicLayout() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-xl">
            <Shield className="h-6 w-6 text-foreground" />
            <span>ContractGuard<span className="text-foreground">AI</span></span>
          </Link>
          {!isAuthPage && (
            <nav className="flex items-center gap-6">
              <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
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
      <footer className="border-t border-border py-12 bg-muted/50">
        <div className="container grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2 font-bold mb-4">
              <Shield className="h-5 w-5 text-primary" />
              ContractGuardAI
            </div>
            <p className="text-muted-foreground">Stop losing money on missed contract deadlines.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Product</h4>
            <div className="space-y-2 text-muted-foreground">
              <p>Features</p>
              <Link to="/pricing" className="block hover:text-foreground">Pricing</Link>
              <p>Security</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Company</h4>
            <div className="space-y-2 text-muted-foreground">
              <p>About</p>
              <p>Blog</p>
              <p>Careers</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Legal</h4>
            <div className="space-y-2 text-muted-foreground">
              <p>Privacy</p>
              <p>Terms</p>
              <p>DPA</p>
            </div>
          </div>
        </div>
        <div className="container mt-8 pt-8 border-t text-center text-xs text-muted-foreground">
          © 2026 ContractGuardAI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
