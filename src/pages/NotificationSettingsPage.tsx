import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Mail, MessageSquare, Loader2, Play, Hash, Send, HelpCircle, ExternalLink, ChevronDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

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
  const [customDays, setCustomDays] = useState('');
  const [customError, setCustomError] = useState('');

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
        .in('scope', ['user', 'user_custom']);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const customRule = rules.find(r => r.scope === 'user_custom');

  useEffect(() => {
    if (customRule) {
      setCustomDays(String(customRule.offset_value));
    }
  }, [customRule]);

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
      const existing = rules.find(r => r.scope === 'user' && r.offset_value === offsetValue && r.offset_unit === offsetUnit);
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

  const toggleCustom = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (customRule) {
        const { error } = await supabase
          .from('reminder_rules')
          .update({ enabled })
          .eq('id', customRule.id);
        if (error) throw error;
      } else {
        const days = parseInt(customDays, 10);
        if (isNaN(days) || days < 0) return;
        const { error } = await supabase
          .from('reminder_rules')
          .insert({
            user_id: user!.id,
            scope: 'user_custom',
            date_type: 'all',
            offset_value: days,
            offset_unit: 'day',
            channel: 'email',
            enabled,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-rules'] });
      toast.success('Custom reminder updated');
    },
    onError: () => toast.error('Failed to update custom reminder'),
  });

  const saveCustomDays = useMutation({
    mutationFn: async (days: number) => {
      if (customRule) {
        const { error } = await supabase
          .from('reminder_rules')
          .update({ offset_value: days })
          .eq('id', customRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reminder_rules')
          .insert({
            user_id: user!.id,
            scope: 'user_custom',
            date_type: 'all',
            offset_value: days,
            offset_unit: 'day',
            channel: 'email',
            enabled: true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-rules'] });
      toast.success('Custom reminder saved');
    },
    onError: () => toast.error('Failed to save custom reminder'),
  });

  const validateAndSaveCustom = () => {
    const trimmed = customDays.trim();
    if (trimmed === '') {
      setCustomError('Enter a number of days');
      return;
    }
    const num = Number(trimmed);
    if (!Number.isInteger(num) || num < 0) {
      setCustomError('Enter a whole number ≥ 0');
      return;
    }
    setCustomError('');
    saveCustomDays.mutate(num);
  };

  const isRuleEnabled = (offsetValue: number, offsetUnit: string) => {
    const rule = rules.find(r => r.scope === 'user' && r.offset_value === offsetValue && r.offset_unit === offsetUnit);
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

            <div className="border-t pt-4 mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Custom reminder</p>
                  <p className="text-xs text-muted-foreground">Choose your own number of days before the deadline.</p>
                </div>
                <Switch
                  checked={customRule?.enabled ?? false}
                  onCheckedChange={checked => toggleCustom.mutate(checked)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Enter days"
                  value={customDays}
                  onChange={e => {
                    setCustomDays(e.target.value);
                    setCustomError('');
                  }}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">days before deadline</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={validateAndSaveCustom}
                  disabled={saveCustomDays.isPending || customDays === String(customRule?.offset_value ?? '')}
                >
                  {saveCustomDays.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Save
                </Button>
              </div>

              {customError && <p className="text-xs text-destructive">{customError}</p>}

              {customRule?.enabled && customRule.offset_value != null && (
                <p className="text-xs text-muted-foreground italic">
                  Custom reminder will be sent {customRule.offset_value} day{customRule.offset_value !== 1 ? 's' : ''} before deadline
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <SlackSettingsCard profile={profile} />

      {['Telegram', 'WhatsApp'].map(channel => (
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

      <ReminderTestButton />
    </div>
  );
}

function SlackSettingsCard({ profile }: { profile: any }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    if (profile?.slack_webhook_url) {
      setWebhookUrl(profile.slack_webhook_url);
    }
  }, [profile]);

  const isValidWebhookUrl = (url: string) => {
    try {
      new URL(url);
      return url.startsWith('https://hooks.slack.com/');
    } catch {
      return false;
    }
  };

  const saveWebhook = useMutation({
    mutationFn: async () => {
      const trimmed = webhookUrl.trim();
      if (!trimmed) throw new Error('Please enter a Slack webhook URL');
      if (!isValidWebhookUrl(trimmed)) throw new Error('Please enter a valid Slack webhook URL');
      const { error } = await supabase
        .from('profiles')
        .update({ slack_webhook_url: trimmed })
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setUrlError('');
      toast.success('Slack webhook URL saved');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (e) => setUrlError(e.message),
  });

  const toggleSlack = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (enabled && !profile?.slack_webhook_url && !isValidWebhookUrl(webhookUrl.trim())) {
        throw new Error('Save a valid webhook URL first');
      }
      const { error } = await supabase
        .from('profiles')
        .update({ slack_enabled: enabled })
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Slack notifications updated');
    },
    onError: (e) => toast.error(e.message),
  });

  const handleTest = async () => {
    const url = webhookUrl.trim() || profile?.slack_webhook_url;
    if (!url || !isValidWebhookUrl(url)) {
      toast.error('Save a valid webhook URL first');
      return;
    }
    setTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-slack-test', {
        body: { webhook_url: url },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success('Test message sent to Slack!');
      } else {
        toast.error(data?.error || 'Failed to send test message');
      }
    } catch (e: unknown) {
      toast.error(`Slack test failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border bg-muted">
              <Hash className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Slack Notifications</CardTitle>
              <CardDescription>Receive contract reminders in Slack via webhook</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="normal-case text-xs tracking-normal">Pro</Badge>
            <Switch
              checked={profile?.slack_enabled ?? false}
              onCheckedChange={checked => toggleSlack.mutate(checked)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Slack Webhook URL</Label>
          <Input
            value={webhookUrl}
            onChange={e => {
              setWebhookUrl(e.target.value);
              setUrlError('');
            }}
            placeholder="https://hooks.slack.com/services/..."
          />
          {urlError && <p className="text-xs text-destructive">{urlError}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => saveWebhook.mutate()}
            disabled={saveWebhook.isPending || webhookUrl.trim() === (profile?.slack_webhook_url ?? '')}
          >
            {saveWebhook.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Webhook
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testLoading}
          >
            {testLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Send Test
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ReminderTestButton() {
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-contract-reminders');
      if (error) throw error;
      const { sent = 0, skipped = 0, total = 0, errors: errCount = 0 } = data || {};
      toast.success(`Reminders processed: ${sent} sent, ${skipped} skipped, ${errCount} errors (${total} total)`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Reminder test failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-dashed border-yellow-500/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Manual Reminder Test</CardTitle>
            <CardDescription>Trigger send-contract-reminders now (temporary)</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleTest} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Run Reminder Test
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}
