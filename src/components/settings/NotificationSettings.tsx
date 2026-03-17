import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const DEFAULT_RULES = [
  { offset_value: 30, offset_unit: 'day', label: '30 days before deadline' },
  { offset_value: 7, offset_unit: 'day', label: '7 days before deadline' },
  { offset_value: 1, offset_unit: 'day', label: '1 day before deadline' },
  { offset_value: 0, offset_unit: 'day', label: 'On deadline day' },
];

export default function NotificationSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
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
    onSuccess: () => {
      toast.success('Notification settings updated');
      queryClient.invalidateQueries({ queryKey: ['reminder-rules'] });
    },
    onError: () => toast.error('Failed to update rule'),
  });

  const isRuleEnabled = (offsetValue: number, offsetUnit: string) => {
    const rule = rules.find(r => r.offset_value === offsetValue && r.offset_unit === offsetUnit);
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
