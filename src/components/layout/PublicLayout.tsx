import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

export default function PublicLayout() {
  const location = useLocation();
  const isAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-base font-semibold tracking-wide">
            <Shield className="h-5 w-5 text-foreground" />
            <span>ContractGuardAI</span>
          </Link>
          {!isAuthPage && (
            <nav className="flex items-center gap-4">
              <Link to="/pricing" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block">
                Pricing
              </Link>
              <Link to="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link to="/signup">
                <Button size="sm">Start Free</Button>
              </Link>
            </nav>
          )}
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t bg-muted/50 py-10">
        <div className="container grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2 font-semibold mb-3">
              <Shield className="h-4 w-4 text-foreground" />
              ContractGuardAI
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">Stop losing money on missed contract deadlines.</p>
          </div>
          <div>
            <h4 className="font-medium mb-3 text-xs uppercase tracking-wider text-muted-foreground">Product</h4>
            <div className="space-y-2 text-sm">
              <Link to="/pricing" className="block text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              <p className="text-muted-foreground">Features</p>
              <p className="text-muted-foreground">Security</p>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3 text-xs uppercase tracking-wider text-muted-foreground">Company</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>About</p>
              <p>Blog</p>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3 text-xs uppercase tracking-wider text-muted-foreground">Legal</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Privacy</p>
              <p>Terms</p>
            </div>
          </div>
        </div>
        <div className="container mt-8 pt-6 border-t text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ContractGuardAI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
