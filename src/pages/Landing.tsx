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
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const Landing = () => {
  const { t } = useTranslation();
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
                  {t("landing.trustedBy")}
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
                  <img src="/logos/cbre.png" alt="CBRE" className="h-10" />
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
                  {t("landing.heroTitle1")}
                </span>
                <span className="block text-foreground">
                  {t("landing.heroTitle2")}
                </span>
                <span className="relative block">
                  <span style={{ color: "#171717CC" }}>
                    {t("landing.heroTitle3")}
                  </span>
                  <span className="shimmer-effect-slow"></span>
                </span>
              </h1>

              <p className="text-lg text-muted-foreground md:text-xl">
                {t("landing.heroDescription")}
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link to="/signup">
                  <Button
                    size="lg"
                    className="gradient-bg w-full text-white hover:opacity-90 sm:w-auto"
                  >
                    {t("landing.startEnriching")}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-eficia-violet" />
                  {t("landing.noSubscription")}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-eficia-violet" />
                  {t("landing.payPerCredit")}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-eficia-violet" />
                  {t("landing.maxDelivery")}
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
              <span
                dangerouslySetInnerHTML={{
                  __html: t("landing.pricingTitle", {
                    interpolation: { escapeValue: false },
                  })
                    .replace(
                      "Transparent Pricing",
                      '<span class="gradient-text">Transparent Pricing</span>'
                    )
                    .replace(
                      "Tarifs simples et transparents",
                      '<span class="gradient-text">Tarifs simples et transparents</span>'
                    ),
                }}
              />
            </h2>
            <p className="text-lg text-muted-foreground">
              {t("landing.pricingDescription")}
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <PricingSlider compact />
          </div>

          {/* FAQ Section */}
          <div className="mx-auto mt-20 max-w-3xl">
            <h2 className="mb-8 text-center font-display text-2xl font-bold">
              {t("landing.faqTitle")}
            </h2>

            <div className="space-y-4">
              {(
                t("landing.faq", { returnObjects: true }) as Array<{
                  q: string;
                  a: string;
                }>
              ).map((item, i) => (
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
              <span
                dangerouslySetInnerHTML={{
                  __html: t("landing.whyChooseTitle", {
                    interpolation: { escapeValue: false },
                  })
                    .replace(
                      "all Enrichment Data",
                      '<span class="gradient-text">all Enrichment Data</span>'
                    )
                    .replace(
                      "toutes les données d'enrichissement",
                      '<span class="gradient-text">toutes les données d\'enrichissement</span>'
                    ),
                }}
              />
            </h2>
            <p className="text-lg text-muted-foreground">
              {t("landing.whyChooseDescription")}
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
            {[
              {
                icon: DollarSign,
                title: t("landing.feature1Title"),
                description: t("landing.feature1Description"),
              },
              {
                icon: Database,
                title: t("landing.feature2Title"),
                description: t("landing.feature2Description"),
              },
              {
                icon: Zap,
                title: t("landing.feature3Title"),
                description: (
                  <>
                    {t("landing.feature3Description")}{" "}
                    <a
                      href="https://calendly.com/samuel-get-eficia/30min"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gradient-text hover:opacity-80 font-semibold"
                    >
                      {t("landing.feature3Link")}
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
              <span className="gradient-text">
                {t("landing.howItWorksTitle")}
              </span>
            </h2>
            <p className="text-lg text-muted-foreground">
              {t("landing.howItWorksDescription")}
            </p>
          </div>

          <div className="mx-auto max-w-4xl space-y-6">
            {[
              {
                step: "1",
                title: t("landing.step1Title"),
                description: t("landing.step1Description"),
              },
              {
                step: "2",
                title: t("landing.step2Title"),
                description: t("landing.step2Description"),
              },
              {
                step: "3",
                title: t("landing.step3Title"),
                description: t("landing.step3Description"),
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
