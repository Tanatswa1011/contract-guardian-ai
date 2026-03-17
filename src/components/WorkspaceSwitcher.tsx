import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Building2, Plus } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';

export default function WorkspaceSwitcher() {
  const { currentWorkspaceId, memberships, setCurrentWorkspaceId } = useWorkspace();

  const currentWorkspace = memberships.find((m) => m.workspace_id === currentWorkspaceId);

  if (memberships.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-between gap-2 px-3 py-2 h-auto font-normal',
            'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border bg-muted">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="truncate text-sm font-medium">
              {currentWorkspace?.workspace_name || 'Select workspace'}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] min-w-56">
        {memberships.map((m) => (
          <DropdownMenuItem
            key={m.workspace_id}
            onClick={() => setCurrentWorkspaceId(m.workspace_id)}
            className={cn(m.workspace_id === currentWorkspaceId && 'bg-accent')}
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{m.workspace_name}</span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/create-workspace" className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" />
            Create new workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
