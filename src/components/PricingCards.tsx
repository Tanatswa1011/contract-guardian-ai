import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Building2 } from 'lucide-react';
import { plans } from '@/config/plans';

interface PricingCardsProps {
  onWaitlistClick: () => void;
  onEnterpriseClick: () => void;
}

export default function PricingCards({ onWaitlistClick, onEnterpriseClick }: PricingCardsProps) {
  return (
    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {plans.map((plan) => (
        <Card
          key={plan.key}
          className={`relative flex flex-col ${plan.highlight ? 'border-foreground' : ''}`}
        >
          {plan.badge && (
            <Badge
              variant={plan.badgeVariant}
              className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 normal-case tracking-normal ${
                plan.highlight ? 'border-foreground bg-foreground text-background' : ''
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
              <Button className="w-full" onClick={onWaitlistClick}>
                {plan.cta}
              </Button>
            ) : (
              <Button className="w-full gap-2" variant="outline" onClick={onEnterpriseClick}>
                <Building2 className="h-4 w-4" />
                {plan.cta}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
