import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { MessageSquare, Loader2, Play } from 'lucide-react';
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

export default function NotificationSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [customDays, setCustomDays] = useState('');
  const [customError, setCustomError] = useState('');

  const { data: rules = [], isLoading } = useQuery({
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
    onSuccess: () => {
      toast.success('Notification settings updated');
      queryClient.invalidateQueries({ queryKey: ['reminder-rules'] });
    },
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reminder Schedule</CardTitle>
          <CardDescription>Choose when to receive reminders before contract deadlines.</CardDescription>
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

      <ReminderTestCard />
    </div>
  );
}

function ReminderTestCard() {
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-contract-reminders');
      if (error) throw error;
      const { sent = 0, skipped = 0, total = 0, errors: errCount = 0 } = data || {};
      toast.success(`Reminders: ${sent} sent, ${skipped} skipped, ${errCount} errors (${total} total)`);
    } catch (e: unknown) {
      toast.error(`Reminder test failed: ${e instanceof Error ? e.message : String(e)}`);
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
