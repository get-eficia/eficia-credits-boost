import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { PricingSlider } from "@/components/pricing/PricingSlider";
import { Sparkles } from "lucide-react";

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="px-4 py-20">
        <div className="container mx-auto">
          {/* Header */}
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm">
              <Sparkles className="mr-2 h-4 w-4 text-eficia-violet" />
              <span>Simple, transparent pricing</span>
            </div>
            <h1 className="mb-4 font-display text-4xl font-bold md:text-5xl">
              Simple, <span className="gradient-text">Transparent Pricing</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Pay only for what you enrich. No subscriptions, no hidden fees.
            </p>
          </div>

          {/* Pricing Slider */}
          <div className="mx-auto max-w-3xl">
            <PricingSlider />
          </div>

          {/* FAQ */}
          <div className="mx-auto mt-20 max-w-3xl">
            <h2 className="mb-8 text-center font-display text-2xl font-bold">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              {[
                {
                  q: "How does the credit system work?",
                  a: "You buy credits upfront and use them for enrichment jobs. 1 credit = 1 phone number found. You only get charged for numbers we actually find in your data.",
                },
                {
                  q: "Do credits expire?",
                  a: "No, credits never expire. Use them whenever you need to enrich your data.",
                },
                {
                  q: "What file formats do you support?",
                  a: "We support CSV, XLS, and XLSX files. Your file should contain columns with names, emails, or company information.",
                },
                {
                  q: "How long does enrichment take?",
                  a: "Most files are processed within a few hours. We guarantee a maximum turnaround of 24 hours.",
                },
                {
                  q: "Can I get a refund?",
                  a: "Unused credits can be refunded within 30 days of purchase. Contact our support team.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-6"
                >
                  <h3 className="mb-2 font-display font-semibold">{item.q}</h3>
                  <p className="text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
