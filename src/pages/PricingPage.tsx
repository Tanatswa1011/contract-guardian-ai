import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Building2 } from 'lucide-react';
import WaitlistModal from '@/components/WaitlistModal';
import EnterpriseInquiryModal from '@/components/EnterpriseInquiryModal';

const plans = [
  {
    key: 'free',
    name: 'Starter',
    price: 'Free',
    period: '',
    badge: 'Available now',
    badgeVariant: 'secondary' as const,
    desc: 'For freelancers getting started.',
    features: [
      'Up to 5 contracts',
      '1 team member',
      '1 notification email',
      'Email reminders',
      'AI extraction',
    ],
    cta: 'Start Free',
    ctaAction: 'link' as const,
    highlight: false,
  },
  {
    key: 'pro',
    name: 'Professional',
    price: '€15',
    period: '/month',
    badge: 'Early Access',
    badgeVariant: 'default' as const,
    desc: 'For growing teams and agencies.',
    features: [
      'Unlimited contracts',
      'Slack notifications',
      'Up to 5 team members',
      'Up to 2 notification emails',
      'Custom reminder timing',
      'Priority support',
    ],
    cta: 'Get 50% off your first month',
    ctaAction: 'waitlist' as const,
    highlight: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    badge: null,
    badgeVariant: 'secondary' as const,
    desc: 'For organizations at scale.',
    features: [
      'Unlimited everything',
      'Advanced integrations',
      'Dedicated support',
      'Custom SLA',
    ],
    cta: 'Contact us',
    ctaAction: 'contact' as const,
    highlight: false,
  },
];

export default function PricingPage() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);

  return (
    <div className="py-20">
      <div className="container max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="mb-4 text-4xl font-semibold tracking-tight text-wrap-balance">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-muted-foreground">
            Start free. Upgrade when you need more.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card
              key={plan.key}
              className={`relative flex flex-col ${plan.highlight ? 'border-foreground' : ''}`}
            >
              {plan.badge && (
                <Badge
                  variant={plan.badgeVariant}
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 normal-case tracking-normal ${
                    plan.highlight
                      ? 'border-foreground bg-foreground text-background'
                      : ''
                  }`}
                >
                  {plan.highlight && <Sparkles className="mr-1 h-3 w-3" />}
                  {plan.badge}
                </Badge>
              )}

              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.desc}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                {plan.key === 'pro' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Get 50% off your first month
                  </p>
                )}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.ctaAction === 'link' ? (
                  <Link to="/signup">
                    <Button className="w-full" variant="outline">
                      {plan.cta}
                    </Button>
                  </Link>
                ) : plan.ctaAction === 'waitlist' ? (
                  <Button className="w-full" onClick={() => setWaitlistOpen(true)}>
                    {plan.cta}
                  </Button>
                ) : (
                  <a href="mailto:hello@contractguardai.com">
                    <Button className="w-full gap-2" variant="outline">
                      <Building2 className="h-4 w-4" />
                      {plan.cta}
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <WaitlistModal
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
        source="pricing_page"
      />
    </div>
  );
}
