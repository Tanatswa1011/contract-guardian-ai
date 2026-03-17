import { useNavigate } from 'react-router-dom';
import { ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface WorkspaceSwitcherProps {
  className?: string;
  onSelect?: () => void;
}

export default function WorkspaceSwitcher({ className, onSelect }: WorkspaceSwitcherProps) {
  const navigate = useNavigate();
  const {
    memberships,
    currentWorkspace,
    currentWorkspaceId,
    setCurrentWorkspaceId,
  } = useWorkspace();

  if (!currentWorkspace || memberships.length === 0) {
    return null;
  }

  const handleWorkspaceChange = (workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId);
    onSelect?.();
  };

  const handleCreateWorkspace = () => {
    navigate('/create-workspace');
    onSelect?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'h-auto w-full justify-between border px-3 py-3 text-left hover:bg-accent/70',
            className,
          )}
        >
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Workspace
            </p>
            <p className="truncate text-sm font-medium text-foreground">
              {currentWorkspace.name}
            </p>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={currentWorkspaceId ?? undefined} onValueChange={handleWorkspaceChange}>
          {memberships.map((membership) => (
            <DropdownMenuRadioItem
              key={membership.workspaceId}
              value={membership.workspaceId}
              className="py-2"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{membership.workspace.name}</div>
                <div className="text-xs capitalize text-muted-foreground">{membership.role}</div>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2" onSelect={handleCreateWorkspace}>
          <Plus className="h-4 w-4" />
          Create workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
