import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare, CheckCircle } from 'lucide-react';

export default function NotificationSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Notification Settings</h1>
        <p className="text-muted-foreground text-xs mt-1">Configure how and when you receive contract deadline reminders.</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border flex items-center justify-center">
                <Mail className="h-3.5 w-3.5" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">Email Notifications</CardTitle>
                <CardDescription className="text-xs">Receive deadline reminders via email</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3 w-3 text-success" />
              <span className="text-[10px] text-success font-medium uppercase tracking-wider">Connected</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Notification Email</Label>
            <Input defaultValue="user@company.com" />
          </div>
          <Button variant="outline" size="sm">Send Test Email</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Reminder Schedule</CardTitle>
          <CardDescription className="text-xs mt-1">Choose when to receive reminders before deadlines</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {[
              { label: '30 days before deadline', enabled: true },
              { label: '7 days before deadline', enabled: true },
              { label: '1 day before deadline', enabled: true },
              { label: 'On deadline day', enabled: true },
            ].map((rule, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <span className="text-xs">{rule.label}</span>
                <Switch defaultChecked={rule.enabled} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {['Slack', 'Telegram', 'WhatsApp'].map(channel => (
        <Card key={channel} className="opacity-50">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border flex items-center justify-center">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">{channel}</CardTitle>
                  <CardDescription className="text-xs">Receive reminders via {channel}</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Coming Soon</Badge>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
