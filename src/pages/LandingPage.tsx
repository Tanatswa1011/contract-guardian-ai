import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
  { name: 'Sarah Chen', role: 'COO, TechStart Inc.', text: 'ContractGuard saved us from a $50K auto-renewal we completely forgot about. Paid for itself on day one.' },
  { name: 'Marcus Johnson', role: 'Freelance Consultant', text: 'I manage 30+ client contracts. This tool replaced my messy spreadsheet and actually works.' },
  { name: 'Emily Rodriguez', role: 'Operations Lead, ScaleUp Agency', text: 'The AI extraction is surprisingly accurate. We onboarded 100 contracts in an afternoon.' },
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="py-20 md:py-28">
        <div className="container text-center max-w-3xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
            Trusted by 500+ businesses
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 leading-[1.15]">
            Stop Losing Money on Missed Contract Deadlines
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Upload your contracts, let AI extract the critical dates, and get reminded before every renewal, notice period, and payment deadline.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup">
              <Button size="lg" className="text-sm px-6 gap-2">
                Start Free Trial <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="text-sm px-6">
                See How It Works
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 border-y bg-muted/30">
        <div className="container">
          <h2 className="text-xl font-bold text-center mb-2 tracking-tight">How It Works</h2>
          <p className="text-center text-xs text-muted-foreground mb-10 max-w-md mx-auto">Three steps to never miss a contract deadline again.</p>
          <div className="grid md:grid-cols-3 gap-px bg-border border max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <div key={i} className="bg-card p-8 text-center">
                <div className="mx-auto w-10 h-10 border flex items-center justify-center mb-4">
                  <step.icon className="h-4 w-4 text-foreground" />
                </div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Step {i + 1}</div>
                <h3 className="text-sm font-semibold mb-2">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container">
          <h2 className="text-xl font-bold text-center mb-2 tracking-tight">Everything You Need</h2>
          <p className="text-center text-xs text-muted-foreground mb-10 max-w-md mx-auto">Built for teams who take their contracts seriously.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border max-w-4xl mx-auto">
            {features.map((f, i) => (
              <div key={i} className="bg-card p-6">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-3.5 w-3.5 text-foreground" />
                  <h3 className="text-sm font-semibold">{f.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 border-y bg-muted/30">
        <div className="container">
          <h2 className="text-xl font-bold text-center mb-10 tracking-tight">What Our Users Say</h2>
          <div className="grid md:grid-cols-3 gap-px bg-border border max-w-4xl mx-auto">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-card p-6">
                <p className="text-xs mb-4 text-foreground leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container text-center max-w-xl mx-auto">
          <h2 className="text-xl font-bold mb-3 tracking-tight">Ready to Protect Your Contracts?</h2>
          <p className="text-xs text-muted-foreground mb-6">Join hundreds of businesses that trust ContractGuard to track their critical deadlines.</p>
          <Link to="/signup">
            <Button size="lg" className="text-sm px-6 gap-2">
              Start Free Trial <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
