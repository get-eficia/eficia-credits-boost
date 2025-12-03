import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PricingSlider } from '@/components/pricing/PricingSlider';
import { HeroPhone } from '@/components/landing/HeroPhone';
import { 
  Upload, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  ArrowRight,
  Shield,
  Zap,
  Clock
} from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 md:py-32">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-eficia-violet/10 blur-3xl" />
          <div className="absolute -bottom-40 left-0 h-[500px] w-[500px] rounded-full bg-eficia-purple/10 blur-3xl" />
        </div>
        
        <div className="container relative mx-auto">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-8">
              <div className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm">
                <Sparkles className="mr-2 h-4 w-4 text-eficia-violet" />
                <span>Trusted by 500+ companies</span>
              </div>
              
              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                Find More Phone Numbers
                <span className="gradient-text"> Than Any Other Provider</span>
              </h1>
              
              <p className="text-lg text-muted-foreground md:text-xl">
                We tested all the providers. We built the one we'd actually pay for — 
                <span className="font-semibold text-foreground"> cheaper, better, no subscription</span>.
              </p>
              
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link to="/signup">
                  <Button size="lg" className="gradient-bg w-full text-accent-foreground hover:opacity-90 sm:w-auto">
                    Start Enriching
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    See Pricing
                  </Button>
                </Link>
              </div>
              
              <div className="flex flex-wrap gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-eficia-violet" />
                  No subscription
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-eficia-violet" />
                  Pay per credit
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-eficia-violet" />
                  24h max delivery
                </div>
              </div>
            </div>
            
            {/* Hero Phone Animation */}
            <div className="relative hidden lg:flex lg:items-center lg:justify-center">
              <HeroPhone />
            </div>
          </div>
        </div>
      </section>

      {/* Logos section */}
      <section className="border-y border-border bg-card/50 py-12">
        <div className="container mx-auto px-4">
          <p className="mb-8 text-center text-sm font-medium text-muted-foreground">
            TRUSTED BY INNOVATIVE COMPANIES
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60 grayscale md:gap-16">
            {['TechCorp', 'StartupIO', 'FinanceHQ', 'MediaGroup', 'RetailPro'].map((name) => (
              <div key={name} className="font-display text-xl font-bold text-muted-foreground">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-20 md:py-32">
        <div className="container mx-auto">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 font-display text-3xl font-bold md:text-4xl">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Three simple steps to enrich your contact data with verified phone numbers.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Upload,
                step: '01',
                title: 'Upload Your File',
                description: 'Upload your CSV or Excel file with contact information. We support any format.',
              },
              {
                icon: Sparkles,
                step: '02',
                title: 'We Enrich Your Data',
                description: 'Our algorithms search multiple databases to find the most accurate phone numbers.',
              },
              {
                icon: Download,
                step: '03',
                title: 'Download Results',
                description: 'Get your enriched file within 24 hours. Only pay for numbers we actually find.',
              },
            ].map((item, i) => (
              <div 
                key={i} 
                className="group relative rounded-2xl border border-border bg-card p-8 transition-all hover:border-eficia-violet/50 hover:shadow-lg"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary transition-colors group-hover:bg-eficia-violet/10">
                    <item.icon className="h-7 w-7 text-foreground transition-colors group-hover:text-eficia-violet" />
                  </div>
                  <span className="font-display text-4xl font-bold text-border">{item.step}</span>
                </div>
                <h3 className="mb-3 font-display text-xl font-semibold">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-card px-4 py-20 md:py-32">
        <div className="container mx-auto">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 font-display text-3xl font-bold md:text-4xl">
              Simple, <span className="gradient-text">Transparent Pricing</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Pay only for what you enrich. No subscriptions, no hidden fees.
            </p>
          </div>
          
          <div className="mx-auto max-w-3xl">
            <PricingSlider compact />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20 md:py-32">
        <div className="container mx-auto">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Why Companies Choose Eficia
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We've built the enrichment service we always wanted — transparent, affordable, and actually effective.
            </p>
          </div>
          
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              {
                icon: Shield,
                title: 'GDPR Compliant',
                description: 'All data processing is fully compliant with European privacy regulations.',
              },
              {
                icon: Zap,
                title: 'Highest Match Rates',
                description: 'Our multi-source approach consistently delivers 90%+ match rates.',
              },
              {
                icon: Clock,
                title: 'Fast Turnaround',
                description: 'Most files are processed within hours, never more than 24h.',
              },
            ].map((item, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-eficia-violet/10">
                  <item.icon className="h-6 w-6 text-eficia-violet" />
                </div>
                <h4 className="mb-2 font-display text-lg font-semibold">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 md:py-32">
        <div className="container mx-auto">
          <div className="relative overflow-hidden rounded-3xl gradient-bg p-12 text-center md:p-20">
            <div className="relative z-10">
              <h2 className="mb-4 font-display text-3xl font-bold text-accent-foreground md:text-4xl">
                Ready to Enrich Your Data?
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-lg text-accent-foreground/80">
                Join hundreds of companies using Eficia to find accurate phone numbers for their contacts.
              </p>
              <Link to="/signup">
                <Button size="lg" variant="secondary" className="font-semibold">
                  Start Enriching Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            
            {/* Background decoration */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
              <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
