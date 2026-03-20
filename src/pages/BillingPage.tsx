import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard, Sparkles } from 'lucide-react';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Progress } from '@/components/ui/progress';
import WaitlistModal from '@/components/WaitlistModal';

const PLAN_DISPLAY: Record<string, { label: string; badge: string }> = {
  free: { label: 'Starter', badge: 'Free' },
  pro: { label: 'Professional', badge: '€15/mo' },
  enterprise: { label: 'Enterprise', badge: 'Custom' },
};

export default function BillingPage() {
  const { plan, contractCount, limits, totalMemberSlots } = usePlanLimits();
  const display = PLAN_DISPLAY[plan] ?? PLAN_DISPLAY.free;
  const usagePercent = limits.maxContracts === Infinity ? 0 : (contractCount / limits.maxContracts) * 100;
  const memberPercent = limits.maxMembers === Infinity ? 0 : (totalMemberSlots / limits.maxMembers) * 100;
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your subscription and usage.</p>
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
              ['Up to 5 contracts', '1 team member', '1 notification email', 'Email reminders', 'AI extraction'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-foreground" />
                  {f}
                </li>
              ))
            ) : plan === 'pro' ? (
              ['Unlimited contracts', 'Up to 5 team members', 'Slack notifications', 'Custom reminders', 'Priority support'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-foreground" />
                  {f}
                </li>
              ))
            ) : (
              ['Unlimited everything', 'Advanced integrations', 'Dedicated support'].map(f => (
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
          {limits.maxMembers !== Infinity && (
            <div className={`space-y-1.5 ${limits.maxContracts === Infinity ? 'pt-2 border-t' : 'pt-1'}`}>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Team members</span>
                <span className="tabular-nums">{totalMemberSlots} / {limits.maxMembers}</span>
              </div>
              <Progress value={memberPercent} className="h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade CTA */}
      {plan === 'free' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-foreground" />
              <div>
                <CardTitle className="text-base">Upgrade to Professional</CardTitle>
                <CardDescription>Unlock unlimited contracts, Slack notifications, and team collaboration.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold">€15</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Get 50% off your first month · Early access
            </p>
            <ul className="space-y-2 mb-6">
              {['Unlimited contracts', 'Slack notifications', 'Up to 5 team members', 'Custom reminder timing'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-foreground" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full gap-2" onClick={() => setWaitlistOpen(true)}>
              <CreditCard className="h-4 w-4" /> Get 50% off your first month
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Manage / Portal placeholder */}
      {plan !== 'free' && (
        <Button variant="outline" className="w-full" disabled>
          Manage Billing (coming soon)
        </Button>
      )}

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Invoices will appear here once billing is active.</p>
          </div>
        </CardContent>
      </Card>

      <WaitlistModal
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
        source="billing_page"
      />
    </div>
  );
}
