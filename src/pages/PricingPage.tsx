import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    desc: 'For freelancers getting started.',
    features: ['5 contracts', 'AI extraction', 'Email notifications', 'Basic deadline tracking'],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Professional',
    price: '$19',
    period: '/month',
    desc: 'For growing teams and agencies.',
    features: ['Unlimited contracts', 'AI extraction', 'Email notifications', 'Advanced deadline tracking', 'Priority support'],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '$49',
    period: '/month',
    desc: 'For organizations at scale.',
    features: ['Everything in Professional', 'Team collaboration', 'API access', 'WhatsApp alerts (Coming Soon)', 'Dedicated support'],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="py-20">
      <div className="container max-w-5xl mx-auto">
        <div className="mb-12 border-b pb-8 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Pricing</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Simple, Transparent Pricing</h1>
          <p className="text-lg text-muted-foreground">Start free. Upgrade when you need more.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.name} className={`relative flex flex-col ${plan.popular ? 'border-foreground bg-muted/20' : ''}`}>
              {plan.popular && (
                <Badge className="absolute left-5 top-5 px-3">
                  Most Popular
                </Badge>
              )}
              <CardHeader className={`pb-2 text-center ${plan.popular ? 'pt-12' : ''}`}>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.desc}</CardDescription>
                <div className="mt-4 border-t pt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                      <span className={f.includes('Coming Soon') ? 'text-muted-foreground' : ''}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/signup">
                  <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
