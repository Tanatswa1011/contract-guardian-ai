import { Mail, MessageSquare, CheckCircle2, Clock, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDemo } from '@/contexts/DemoContext';
import { formatDistanceToNow } from 'date-fns';

export default function DemoNotificationFeed() {
  const { notifications } = useDemo();

  const statusIcon = (s: string) => {
    if (s === 'delivered') return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
    if (s === 'sent') return <Send className="h-3.5 w-3.5 text-muted-foreground" />;
    return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const channelIcon = (ch: string) => {
    if (ch === 'slack') return <MessageSquare className="h-3.5 w-3.5" />;
    return <Mail className="h-3.5 w-3.5" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notification Activity</h1>
        <p className="text-sm text-muted-foreground mt-1">Simulated notification delivery log</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Delivered', count: notifications.filter(n => n.status === 'delivered').length },
          { label: 'Sent', count: notifications.filter(n => n.status === 'sent').length },
          { label: 'Queued', count: notifications.filter(n => n.status === 'queued').length },
        ].map(s => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">{s.label}</div>
              <div className="text-2xl font-bold">{s.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activity Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {notifications.map(n => (
              <div key={n.id} className="flex items-start gap-3 px-6 py-4">
                <div className="mt-0.5 flex items-center gap-1.5">
                  {channelIcon(n.channel)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{n.subject}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{n.contract_title}</span>
                    <span>·</span>
                    <span>{n.sent_to}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1.5">
                    {statusIcon(n.status)}
                    <Badge variant={n.status === 'delivered' ? 'default' : n.status === 'queued' ? 'outline' : 'secondary'} className="text-[10px]">
                      {n.status}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {n.timestamp > new Date() ? 'Scheduled' : formatDistanceToNow(n.timestamp, { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
