import { HeroPhone } from "@/components/landing/HeroPhone";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { PricingSlider } from "@/components/pricing/PricingSlider";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  DollarSign,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

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
          <div className="grid items-center gap-16 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="space-y-8">
              {/* Trusted by logos */}
              <div className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Trusted by
                </p>
                <div className="flex flex-wrap items-center gap-8">
                  <img
                    src="/logos/scalezia.png"
                    alt="Scalezia"
                    className="h-10"
                  />
                  <img
                    src="/logos/entrepreneurs.png"
                    alt="Entrepreneurs.com"
                    className="h-10"
                  />
                  <img
                    src="/logos/edenred.png"
                    alt="Edenred"
                    className="h-10"
                  />
                  <img
                    src="/logos/havas.png"
                    alt="Havas Voyages"
                    className="h-10"
                  />
                  <img
                    src="/logos/cbre.png"
                    alt="CBRE"
                    className="h-10"
                  />
                  <img
                    src="/logos/bigsquad.jpeg"
                    alt="Big Squad"
                    className="h-10"
                  />
                  <img
                    src="/logos/getalead.png"
                    alt="Get A Lead"
                    className="h-10"
                  />
                </div>
              </div>

              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                <span className="block gradient-text-subtle">
                  Find More Phone Numbers
                </span>
                <span className="block text-foreground">cheaper</span>
                <span className="relative block">
                  <span style={{ color: "#171717CC" }}>
                    Without Subscription
                  </span>
                  <span className="shimmer-effect-slow"></span>
                </span>
              </h1>

              <p className="text-lg text-muted-foreground md:text-xl">
                We tested all the providers out there. We built the one we'd
                actually pay for — cheaper, better, no commitment.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link to="/signup">
                  <Button
                    size="lg"
                    className="gradient-bg w-full text-white hover:opacity-90 sm:w-auto"
                  >
                    Start Enriching
                    <ArrowRight className="ml-2 h-5 w-5" />
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

      {/* Pricing Section */}
      <section id="pricing" className="bg-card px-4 py-20 md:py-32">
        <div className="container mx-auto">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 font-display text-4xl font-bold md:text-5xl">
              Simple, <span className="gradient-text">Transparent Pricing</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Pay only for what you enrich. No subscriptions, no hidden fees.
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <PricingSlider compact />
          </div>

          {/* FAQ Section */}
          <div className="mx-auto mt-20 max-w-3xl">
            <h2 className="mb-8 text-center font-display text-2xl font-bold">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              {[
                {
                  q: "How does the credit system work ?",
                  a: "1 credit = 1 phone number found. You only get charged for numbers we actually find in your data.",
                },
                {
                  q: "What information should be included in my file ?",
                  a: "At a minimum, we need the prospect's first and last name and company (LinkedIn profile link if possible). Including the LinkedIn link helps us find more phone numbers with better accuracy.",
                },
                {
                  q: "What file formats do you support ?",
                  a: "We support CSV, XLS, and XLSX files.",
                },
                {
                  q: "How long does enrichment take ?",
                  a: "Most files are processed within a few hours. We guarantee a maximum turnaround of 24 hours.",
                },
                {
                  q: "Do credits expire ?",
                  a: "Credits are valid for two years.",
                },
                {
                  q: "Can I get a full presentation of the tool?",
                  a: "Yes, you can book a call here (link) with our team. The meeting takes less than 10 minutes.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-background p-6"
                >
                  <h3 className="mb-2 font-display font-semibold">{item.q}</h3>
                  <p className="text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Eficia - 3 Cards */}
      <section className="px-4 py-20 md:py-32">
        <div className="container mx-auto">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="mb-4 font-display text-4xl font-bold md:text-5xl">
              Finally, One Platform for{" "}
              <span className="gradient-text">all Enrichment Data</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              The smartest way to enrich your data
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
            {[
              {
                icon: DollarSign,
                title: "Pay Per Use",
                description:
                  "Most providers want to charge you a subscription fee, even though you don't need one. With us, you pay for what you use.",
              },
              {
                icon: Database,
                title: "Waterfall Enrichment",
                description:
                  "All providers sell you waterfall enrichment as if it were an extraordinary feature. It's basic. We find more numbers than any of these providers, and we can prove it.",
              },
              {
                icon: Zap,
                title: "We can even help you scrape your data",
                description: (
                  <>
                    If you waste time making lists, we can show you how to
                    easily scrape data to enrich it later. We can even make
                    these lists for you. Just make an appointment{" "}
                    <a
                      href="https://calendly.com/samuel-get-eficia/30min"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gradient-text hover:opacity-80 font-semibold"
                    >
                      right here
                    </a>
                    .
                  </>
                ),
              },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card p-8"
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl gradient-icon-bg">
                  <item.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="mb-4 font-display text-xl font-bold">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/30 px-4 py-20 md:py-32">
        <div className="container mx-auto">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 font-display text-4xl font-bold md:text-5xl">
              <span className="gradient-text">How It Works</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Three simple steps to enriched data
            </p>
          </div>

          <div className="mx-auto max-w-4xl space-y-6">
            {[
              {
                step: "1",
                title: "Upload Your File",
                description:
                  "Simply upload your CSV or Excel file with the contact information you want to enrich. Drag, drop, done.",
              },
              {
                step: "2",
                title: "We Enrich Your Data",
                description:
                  "We enrich your data using the most reliable sources on the market. With access to more data providers than other tools, we consistently find more phone numbers than FullEnrich, Lusha, Kaspr, or Zeliq.",
              },
              {
                step: "3",
                title: "Download Enriched Results",
                description:
                  "Receive an email notification when complete, then download your enriched file with all the data you need.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-6 rounded-2xl border border-border bg-card p-8"
              >
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl gradient-icon-bg">
                  <span className="font-display text-2xl font-bold text-white">
                    {item.step}
                  </span>
                </div>
                <div>
                  <h3 className="mb-2 font-display text-xl font-bold">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
