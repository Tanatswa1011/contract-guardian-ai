import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import LogoFull from '@/components/logos/LogoFull';

export default function PublicLayout() {
  const location = useLocation();
  const isAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/">
            <LogoFull />
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
      <footer className="border-t py-6">
        <div className="container text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ContractGuardAI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
