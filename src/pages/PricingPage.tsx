import { useState } from 'react';
import WaitlistModal from '@/components/WaitlistModal';
import EnterpriseInquiryModal from '@/components/EnterpriseInquiryModal';
import PricingCards from '@/components/PricingCards';

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

        <PricingCards
          onWaitlistClick={() => setWaitlistOpen(true)}
          onEnterpriseClick={() => setEnterpriseOpen(true)}
        />
      </div>

      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} source="pricing_page" />
      <EnterpriseInquiryModal open={enterpriseOpen} onOpenChange={setEnterpriseOpen} source="pricing_page" />
    </div>
  );
}
