import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Upload, Brain, Bell, CheckCircle, ArrowRight } from 'lucide-react';

const steps = [
  { icon: Upload, title: 'Upload Your Contract', desc: 'Drag and drop any PDF contract. We support agreements, leases, and SOWs.' },
  { icon: Brain, title: 'AI Extracts Deadlines', desc: 'Our AI identifies renewal dates, notice periods, payment schedules, and more.' },
  { icon: Bell, title: 'Never Miss Again', desc: 'Get email reminders before every critical deadline. Stay ahead, always.' },
];

const features = [
  { title: 'Deadline Tracking', desc: 'Track renewal, notice, and payment deadlines across all contracts in one place.' },
  { title: 'AI-Powered Extraction', desc: 'Upload a PDF and let AI find key dates, terms, and obligations automatically.' },
  { title: 'Manual Review Tools', desc: 'Easily correct or add missing data with an intuitive editing interface.' },
  { title: 'Email Alerts', desc: 'Customizable reminder schedules so you never miss a critical deadline.' },
  { title: 'Contract Health', desc: 'At-a-glance health badges show which contracts need your attention now.' },
  { title: 'Secure Storage', desc: 'All contracts stored securely with encryption at rest and in transit.' },
];

const testimonials = [
  { name: 'Sarah Chen', role: 'COO, TechStart Inc.', text: 'ContractGuardAI saved us from a $50K auto-renewal we completely forgot about. Paid for itself on day one.' },
  { name: 'Marcus Johnson', role: 'Freelance Consultant', text: 'I manage 30+ client contracts. This tool replaced my messy spreadsheet and actually works.' },
  { name: 'Emily Rodriguez', role: 'Operations Lead, ScaleUp Agency', text: 'The AI extraction is surprisingly accurate. We onboarded 100 contracts in an afternoon.' },
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b py-20 md:py-28">
        <div className="container text-center max-w-4xl mx-auto">
          <div className="mb-6 inline-flex items-center gap-2 border bg-muted px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <Shield className="h-4 w-4" />
            Trusted by 500+ businesses
          </div>
          <h1 className="mb-6 text-4xl font-semibold tracking-tight md:text-6xl">
            Stop Losing Money on Missed Contract Deadlines
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Upload your contracts, let AI extract the critical dates, and get reminded before every renewal, notice period, and payment deadline.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link to="/signup">
              <Button size="lg" className="gap-2 px-8 text-base">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="px-8 text-base">
                See How It Works
              </Button>
            </a>
          </div>
          <div className="mt-12 grid gap-px border bg-border text-left sm:grid-cols-3">
            {[
              { label: 'Portfolio visibility', value: 'One system of record' },
              { label: 'Deadline discipline', value: 'Automated reminders' },
              { label: 'Faster onboarding', value: 'AI-assisted extraction' },
            ].map(item => (
              <div key={item.label} className="bg-background px-5 py-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                <p className="mt-3 text-sm font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b bg-muted/20 py-20">
        <div className="container">
          <h2 className="mb-4 text-center text-3xl font-semibold tracking-tight">How It Works</h2>
          <p className="mx-auto mb-12 max-w-lg text-center text-muted-foreground">
            Three simple steps to never miss a contract deadline again.
          </p>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <Card key={i} className="text-center">
                <CardContent className="px-6 pb-6 pt-8">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center border bg-muted">
                    <step.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Step {i + 1}</div>
                  <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container">
          <h2 className="mb-4 text-center text-3xl font-semibold tracking-tight">Everything You Need</h2>
          <p className="mx-auto mb-12 max-w-lg text-center text-muted-foreground">
            Built for teams who take their contracts seriously.
          </p>
          <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Card key={i}>
                <CardContent className="px-6 pb-5 pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-foreground" />
                    <h3 className="font-semibold">{f.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y bg-muted/20 py-20">
        <div className="container">
          <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight">Trusted by Operations Teams</h2>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <Card key={i}>
                <CardContent className="px-6 pb-5 pt-6">
                  <p className="mb-4 text-sm leading-relaxed text-foreground">"{t.text}"</p>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container text-center max-w-2xl mx-auto">
          <Card>
            <CardContent className="px-8 py-10">
              <h2 className="mb-4 text-3xl font-semibold tracking-tight">Ready to Protect Your Contracts?</h2>
              <p className="mb-8 text-muted-foreground">
                Join hundreds of businesses that trust ContractGuardAI to track their critical deadlines.
              </p>
              <Link to="/signup">
                <Button size="lg" className="gap-2 px-8 text-base">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
