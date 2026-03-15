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
    <div className="py-16">
      <div className="container max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-2xl font-bold tracking-tight mb-3">Simple, Transparent Pricing</h1>
          <p className="text-sm text-muted-foreground">Start free. Upgrade when you need more.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-px bg-border border">
          {plans.map((plan) => (
            <div key={plan.name} className="relative flex flex-col bg-card">
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0">
                  <Badge className="w-full justify-center py-1 text-[10px] uppercase tracking-widest">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className={`text-center pb-2 ${plan.popular ? 'pt-10' : ''}`}>
                <CardTitle className="text-sm font-semibold">{plan.name}</CardTitle>
                <CardDescription className="text-xs">{plan.desc}</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
                  <span className="text-xs text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-6">
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <Check className="h-3 w-3 text-foreground mt-0.5 shrink-0" />
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
