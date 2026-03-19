import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Play } from 'lucide-react';

const DEFAULT_RULES = [
  { offset_value: 30, offset_unit: 'day', label: '30 days before deadline' },
  { offset_value: 7, offset_unit: 'day', label: '7 days before deadline' },
  { offset_value: 1, offset_unit: 'day', label: '1 day before deadline' },
  { offset_value: 0, offset_unit: 'day', label: 'On deadline day' },
];

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notificationEmail, setNotificationEmail] = useState('');

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile?.notification_email) {
      setNotificationEmail(profile.notification_email);
    }
  }, [profile]);

  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['reminder-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminder_rules')
        .select('*')
        .eq('user_id', user!.id)
        .eq('scope', 'user');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateEmail = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_email: notificationEmail })
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Notification email updated');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => toast.error('Failed to update email'),
  });

  const toggleRule = useMutation({
    mutationFn: async ({ offsetValue, offsetUnit, enabled }: { offsetValue: number; offsetUnit: string; enabled: boolean }) => {
      const existing = rules.find(r => r.offset_value === offsetValue && r.offset_unit === offsetUnit);
      if (existing) {
        const { error } = await supabase
          .from('reminder_rules')
          .update({ enabled })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reminder_rules')
          .insert({
            user_id: user!.id,
            scope: 'user',
            date_type: 'all',
            offset_value: offsetValue,
            offset_unit: offsetUnit,
            channel: 'email',
            enabled,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminder-rules'] }),
    onError: () => toast.error('Failed to update rule'),
  });

  const isRuleEnabled = (offsetValue: number, offsetUnit: string) => {
    const rule = rules.find(r => r.offset_value === offsetValue && r.offset_unit === offsetUnit);
    return rule ? rule.enabled : false;
  };

  if (profileLoading || rulesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground text-sm">Configure how and when you receive contract deadline reminders.</p>
      </div>

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
            <Input
              value={notificationEmail}
              onChange={e => setNotificationEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateEmail.mutate()}
            disabled={updateEmail.isPending || notificationEmail === profile?.notification_email}
          >
            {updateEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Email
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reminder Schedule</CardTitle>
          <CardDescription>Choose when to receive reminders before deadlines</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DEFAULT_RULES.map(rule => (
              <div key={`${rule.offset_value}-${rule.offset_unit}`} className="flex items-center justify-between py-2">
                <span className="text-sm">{rule.label}</span>
                <Switch
                  checked={isRuleEnabled(rule.offset_value, rule.offset_unit)}
                  onCheckedChange={checked =>
                    toggleRule.mutate({ offsetValue: rule.offset_value, offsetUnit: rule.offset_unit, enabled: checked })
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
