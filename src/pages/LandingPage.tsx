import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Upload, Brain, Bell, CheckCircle, ArrowRight, Star } from 'lucide-react';

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
  { name: 'Sarah Chen', role: 'COO, TechStart Inc.', text: 'ContractGuardAI saved us from a $50K auto-renewal we completely forgot about. Paid for itself on day one.', stars: 5 },
  { name: 'Marcus Johnson', role: 'Freelance Consultant', text: 'I manage 30+ client contracts. This tool replaced my messy spreadsheet and actually works.', stars: 5 },
  { name: 'Emily Rodriguez', role: 'Operations Lead, ScaleUp Agency', text: 'The AI extraction is surprisingly accurate. We onboarded 100 contracts in an afternoon.', stars: 5 },
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="container text-center max-w-4xl mx-auto">
          <div className="mb-6 inline-flex items-center gap-2 border bg-muted px-4 py-1.5 text-sm font-medium text-foreground">
            <Shield className="h-4 w-4" />
            Trusted by 500+ businesses
          </div>
          <h1 className="mb-6 text-4xl font-semibold tracking-tight md:text-5xl">
            Stop Losing Money on Missed Contract Deadlines
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Upload your contracts, let AI extract the critical dates, and get reminded before every renewal, notice period, and payment deadline.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link to="/signup">
              <Button size="lg" className="text-base px-8 gap-2">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="text-base px-8">
                See How It Works
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y bg-muted py-20">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">Three simple steps to never miss a contract deadline again.</p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <Card key={i} className="text-center">
                <CardContent className="pt-8 pb-6 px-6">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center border bg-muted">
                    <step.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="mb-2 text-xs font-semibold text-muted-foreground">STEP {i + 1}</div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
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
          <h2 className="text-3xl font-bold text-center mb-4">Everything You Need</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">Built for teams who take their contracts seriously.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <Card key={i}>
                <CardContent className="pt-6 pb-5 px-6">
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
      <section className="border-y bg-muted py-20">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Loved by Teams Everywhere</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <Card key={i}>
                <CardContent className="pt-6 pb-5 px-6">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-muted text-muted-foreground" />
                    ))}
                  </div>
                  <p className="text-sm mb-4 text-foreground">"{t.text}"</p>
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
          <h2 className="text-3xl font-bold mb-4">Ready to Protect Your Contracts?</h2>
          <p className="text-muted-foreground mb-8">Join hundreds of businesses that trust ContractGuardAI to track their critical deadlines.</p>
          <Link to="/signup">
            <Button size="lg" className="text-base px-8 gap-2">
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
