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
      <div>
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground text-sm">Configure how and when you receive contract deadline reminders.</p>
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
            <Badge variant="secondary" className="normal-case tracking-normal">Connected</Badge>
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
              <div key={i} className="flex items-center justify-between py-2">
                <span className="text-sm">{rule.label}</span>
                <Switch defaultChecked={rule.enabled} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon channels */}
      {['Slack', 'Telegram', 'WhatsApp'].map(channel => (
        <Card key={channel} className="bg-muted/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center border bg-muted">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">{channel}</CardTitle>
                  <CardDescription>Receive reminders via {channel}</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="normal-case text-xs tracking-normal">Coming Soon</Badge>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
