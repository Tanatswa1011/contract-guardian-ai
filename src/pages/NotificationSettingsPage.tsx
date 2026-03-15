import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare } from 'lucide-react';

export default function NotificationSettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="border-b pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Settings</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Notification Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure how and when you receive contract deadline reminders.
        </p>
      </div>

      {/* Email */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border bg-muted">
                <Mail className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Email Notifications</CardTitle>
                <CardDescription>Receive deadline reminders via email</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">Connected</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Notification Email</Label>
            <Input defaultValue="user@company.com" />
          </div>
          <Button variant="outline" size="sm">Send Test Email</Button>
        </CardContent>
      </Card>

      {/* Reminder Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reminder Schedule</CardTitle>
          <CardDescription>Choose when to receive reminders before deadlines</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: '30 days before deadline', enabled: true },
              { label: '7 days before deadline', enabled: true },
              { label: '1 day before deadline', enabled: true },
              { label: 'On deadline day', enabled: true },
            ].map((rule, i) => (
              <div key={i} className="flex items-center justify-between border-b py-3 last:border-b-0">
                <span className="text-sm">{rule.label}</span>
                <Switch defaultChecked={rule.enabled} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon channels */}
      {['Slack', 'Telegram', 'WhatsApp'].map(channel => (
        <Card key={channel} className="bg-muted/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center border bg-background">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">{channel}</CardTitle>
                  <CardDescription>Receive reminders via {channel}</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">Coming Soon</Badge>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
