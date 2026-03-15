import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-6">
      <div className="w-full max-w-md border bg-background px-8 py-10 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Not found</p>
        <h1 className="mb-4 mt-3 text-4xl font-semibold tracking-tight">404</h1>
        <p className="mb-6 text-sm text-muted-foreground">The page you requested could not be found.</p>
        <a href="/" className="text-sm font-medium text-foreground underline underline-offset-4 hover:opacity-70">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
