import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard } from 'lucide-react';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Progress } from '@/components/ui/progress';

const PLAN_DISPLAY: Record<string, { label: string; badge: string }> = {
  free: { label: 'Starter', badge: 'Free' },
  pro: { label: 'Professional', badge: '$19/mo' },
  enterprise: { label: 'Enterprise', badge: '$49/mo' },
};

export default function BillingPage() {
  const { plan, contractCount, limits, totalMemberSlots } = usePlanLimits();
  const display = PLAN_DISPLAY[plan] ?? PLAN_DISPLAY.free;
  const usagePercent = limits.maxContracts === Infinity ? 0 : (contractCount / limits.maxContracts) * 100;
  const memberPercent = limits.maxMembers === Infinity ? 0 : (totalMemberSlots / limits.maxMembers) * 100;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground text-sm">Manage your subscription and view invoices.</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Current Plan</CardTitle>
              <CardDescription>You're on the {display.label} plan</CardDescription>
            </div>
            <Badge variant="secondary" className="normal-case tracking-normal">{display.badge}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {plan === 'free' ? (
              ['5 contracts', '1 team member', 'Email notifications', 'AI extraction', 'Basic deadline tracking'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-foreground" />
                  {f}
                </li>
              ))
            ) : plan === 'pro' ? (
              ['Unlimited contracts', '5 team members', 'Email + Slack notifications', 'AI extraction', 'Priority support'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-foreground" />
                  {f}
                </li>
              ))
            ) : (
              ['Unlimited contracts', 'Unlimited team members', 'All notification channels', 'AI extraction', 'Dedicated support'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-foreground" />
                  {f}
                </li>
              ))
            )}
          </ul>

          {/* Usage */}
          {limits.maxContracts !== Infinity && (
            <div className="space-y-1.5 pt-2 border-t">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Contract usage</span>
                <span className="tabular-nums">{contractCount} / {limits.maxContracts}</span>
              </div>
              <Progress value={usagePercent} className="h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade */}
      {plan === 'free' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upgrade to Professional</CardTitle>
            <CardDescription>Unlock unlimited contracts and advanced features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold">$19</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-2 mb-6">
              {['Unlimited contracts', 'Slack notifications', 'Advanced deadline tracking', 'Priority support'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-foreground" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full gap-2"><CreditCard className="h-4 w-4" /> Upgrade Now</Button>
          </CardContent>
        </Card>
      )}

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full">Open Billing Portal</Button>
    </div>
  );
}
