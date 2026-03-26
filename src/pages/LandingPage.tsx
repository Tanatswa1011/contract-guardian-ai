import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Upload, Brain, Bell, CalendarClock, Sparkles, Mail, HeartPulse, Lock, Scale, ArrowRight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import PricingCards from '@/components/PricingCards';
import WaitlistModal from '@/components/WaitlistModal';
import EnterpriseInquiryModal from '@/components/EnterpriseInquiryModal';

const steps = [
  { icon: Upload, title: 'Upload Your Contract', desc: 'Drag and drop any PDF contract. We support agreements, leases, and SOWs.' },
  { icon: Brain, title: 'AI Extracts Deadlines', desc: 'Our AI identifies renewal dates, notice periods, payment schedules, and more.' },
  { icon: Bell, title: 'Never Miss Again', desc: 'Get email reminders before every critical deadline. Stay ahead, always.' },
];

const features = [
  { icon: CalendarClock, title: 'Deadline Tracking', desc: 'Track renewal, notice, and payment deadlines across all contracts in one place.' },
  { icon: Sparkles, title: 'AI-Powered Extraction', desc: 'Upload a PDF and let AI find key dates, terms, and obligations automatically.' },
  { icon: Mail, title: 'Email Alerts', desc: 'Customizable reminder schedules so you never miss a critical deadline.' },
  { icon: HeartPulse, title: 'Contract Health', desc: 'At-a-glance health badges show which contracts need your attention now.' },
  { icon: Lock, title: 'Secure Storage', desc: 'All contracts stored securely with encryption at rest and in transit.' },
  { icon: Scale, title: 'GDPR Compliant', desc: 'Your data stays yours. Built with privacy by design and full GDPR compliance.' },
];

const faqs = [
  { q: 'What does ContractGuardAI do?', a: 'ContractGuardAI helps you track important contract deadlines like renewals, notice periods, and payments so you never lose money on missed dates.' },
  { q: 'Is there a free plan?', a: 'Yes, you can start with a free plan to track a limited number of contracts.' },
  { q: 'How accurate is the AI extraction?', a: 'Our AI is designed to extract key contract dates and terms with high accuracy, and you can always review and edit the results.' },
  { q: 'Is my data secure?', a: 'Yes. Your data is encrypted in transit and at rest, and access is strictly controlled. We are GDPR compliant.' },
  { q: 'Can I cancel anytime?', a: 'Yes, there are no long-term commitments. You can stop using the service at any time.' },
  { q: 'What happens if I delete my account?', a: 'All your data, including contracts and reminders, will be permanently deleted and cannot be recovered.' },
];


export default function LandingPage() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);

  return (
    <div>
      {/* Hero */}
      <section className="py-24 md:py-36">
        <div className="container text-center max-w-4xl mx-auto">
          <div className="mb-8 inline-flex items-center gap-2 border bg-muted px-4 py-1.5 text-sm font-medium text-muted-foreground">
            <Shield className="h-4 w-4" />
            AI-powered contract management
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight leading-[1.1] md:text-6xl">
            Stop Losing Money on Missed Contract Deadlines
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground/80 leading-relaxed md:text-xl">
            Upload your contracts, let AI extract the critical dates, and get reminded before every renewal, notice period, and payment deadline.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link to="/signup">
              <Button size="lg" className="text-base font-semibold px-8 gap-2">
                Start Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="text-base font-medium px-8">
                See How It Works
              </Button>
            </a>
          </div>
        </div>
      </section>


      {/* How it works */}
      <section id="how-it-works" className="border-y bg-muted py-24">
        <div className="container">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-3">How It Works</h2>
          <p className="text-center text-muted-foreground/80 mb-14 max-w-lg mx-auto">Three simple steps to never miss a contract deadline again.</p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <Card key={i} className="text-center">
                <CardContent className="pt-8 pb-6 px-6">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center border bg-muted">
                    <step.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="mb-2 text-xs font-semibold text-muted-foreground/60 tracking-widest">STEP {i + 1}</div>
                  <h3 className="text-lg font-semibold mb-3">{step.title}</h3>
                  <p className="text-sm text-muted-foreground/80 leading-relaxed">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-3">Everything You Need</h2>
          <p className="text-center text-muted-foreground/80 mb-14 max-w-lg mx-auto">Built for teams who take their contracts seriously.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <Card key={i}>
                <CardContent className="pt-6 pb-5 px-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center border bg-muted">
                    <f.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground/80 leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-y bg-muted py-24">
        <div className="container max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-3">Pricing</h2>
          <p className="text-center text-muted-foreground/80 mb-14 max-w-lg mx-auto">Simple plans for growing teams.</p>
          <PricingCards
            onWaitlistClick={() => setWaitlistOpen(true)}
            onEnterpriseClick={() => setEnterpriseOpen(true)}
          />
        </div>
      </section>


      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="container max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-3">Frequently Asked Questions</h2>
          <p className="text-center text-muted-foreground/80 mb-14 max-w-lg mx-auto">Everything you need to know before getting started.</p>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left font-medium">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground/80 leading-relaxed">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="text-center text-sm text-muted-foreground mt-12">
            Still have questions?{' '}
            <a href="mailto:support@contractguard.cloud" className="underline underline-offset-4 hover:text-foreground transition-colors">
              Contact support
            </a>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted py-24">
        <div className="container text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Ready to Protect Your Contracts?</h2>
          <p className="text-muted-foreground/80 mb-10 leading-relaxed">Start tracking your contracts and never miss a deadline again.</p>
          <Link to="/signup">
            <Button size="lg" className="text-base font-semibold px-8 gap-2">
              Start Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} source="landing_page" />
      <EnterpriseInquiryModal open={enterpriseOpen} onOpenChange={setEnterpriseOpen} source="landing_page" />
    </div>
  );
}
