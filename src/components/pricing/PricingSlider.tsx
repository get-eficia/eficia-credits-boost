import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, supabase } from "@/lib/supabase";
import { ArrowRight, Loader2, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface PricingTier {
  credits: number;
  pricePerCredit: number;
}

const formatNumber = (num: number): string => {
  if (num >= 1000) {
    return num >= 1000000 ? `${num / 1000000}M` : `${num / 1000}k`;
  }
  return num.toString();
};

interface PricingSliderProps {
  showCta?: boolean;
  compact?: boolean;
}

interface CreditPack {
  id: string;
  credits: number;
  price: number;
  price_per_credit: number;
  name: string;
  is_popular: boolean;
}

export const PricingSlider = ({
  showCta = true,
  compact = false,
}: PricingSliderProps) => {
  const { t } = useTranslation();
  const [sliderIndex, setSliderIndex] = useState(1);
  const [amount, setAmount] = useState(200);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [sliderSteps, setSliderSteps] = useState<number[]>([]);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadPricingData();
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);
  };

  const loadPricingData = async () => {
    const { data: packsData, error } = await supabase
      .from("credit_packs")
      .select("id, name, credits, price, price_per_credit, is_popular")
      .eq("is_active", true)
      .order("credits", { ascending: true });

    if (error || !packsData || packsData.length === 0) {
      console.error("Error loading pricing data:", error);
      // Fallback tiers matching new structure
      const fallbackSteps = [50, 100, 200, 500, 1000, 2500, 5000, 10000];
      setSliderSteps(fallbackSteps);
      setPricingTiers(
        fallbackSteps.map((c) => ({
          credits: c,
          pricePerCredit: 0.29 - (c / 10000) * 0.17,
        }))
      );
      setAmount(fallbackSteps[3]); // Default to 500 (Professional)
      setLoading(false);
      return;
    }

    const packs: CreditPack[] = packsData.map((pack: any) => ({
      id: pack.id,
      name: pack.name,
      credits: pack.credits,
      price: pack.price,
      price_per_credit: pack.price_per_credit,
      is_popular: pack.is_popular,
    }));

    const tiers: PricingTier[] = packs.map((pack) => ({
      credits: pack.credits,
      pricePerCredit: pack.price_per_credit,
    }));

    const steps = tiers.map((t) => t.credits);

    setCreditPacks(packs);
    setSliderSteps(steps);
    setPricingTiers(tiers);
    // Default to Professional pack (500 credits) if available
    const defaultIndex = steps.findIndex((s) => s === 500);
    const index =
      defaultIndex >= 0 ? defaultIndex : Math.min(3, steps.length - 1);
    setAmount(steps[index]);
    setSliderIndex(index);
    setLoading(false);
  };

  const getSelectedPack = (): CreditPack | undefined => {
    // Find pack matching the current amount (from slider or custom)
    return (
      creditPacks.find((p) => p.credits === amount) || creditPacks[sliderIndex]
    );
  };

  const handleBuyNow = async () => {
    setPurchasing(true);

    try {
      // Check if user is logged in
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: t("pricing.loginRequired"),
          description: t("pricing.loginRequiredDescription"),
          variant: "destructive",
        });
        navigate("/signin");
        return;
      }

      const selectedPack = getSelectedPack();
      if (!selectedPack) {
        toast({
          title: t("pricing.error"),
          description: t("pricing.selectValidPack"),
          variant: "destructive",
        });
        return;
      }

      // Call the create-checkout edge function
      console.log("Calling create-checkout with pack_id:", selectedPack.id);
      const { data, error } = await supabase.functions.invoke(
        "create-checkout",
        {
          body: { pack_id: selectedPack.id },
        }
      );

      console.log("Response:", { data, error });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(
          error.message || "Failed to send a request to the Edge Function"
        );
      }

      if (data?.url) {
        // Open Stripe Checkout in a new tab with security features
        const stripeWindow = window.open(data.url, '_blank', 'noopener,noreferrer');
        if (!stripeWindow) {
          // Fallback if popup was blocked
          toast({
            title: t("pricing.popupBlocked"),
            description: t("pricing.popupBlockedDescription"),
            variant: "destructive",
          });
        }
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: t("pricing.error"),
        description:
          error instanceof Error ? error.message : t("pricing.checkoutError"),
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const getPricePerCredit = (targetAmount: number): number => {
    if (pricingTiers.length === 0) return 0.29;

    // Trouver le palier le plus proche (inférieur ou égal)
    let selectedTier = pricingTiers[0];
    for (const tier of pricingTiers) {
      if (tier.credits <= targetAmount) {
        selectedTier = tier;
      } else {
        break;
      }
    }
    return selectedTier.pricePerCredit;
  };

  const calculatePrice = (targetAmount: number): number => {
    return targetAmount * getPricePerCredit(targetAmount);
  };

  useEffect(() => {
    if (sliderSteps.length > 0) {
      setAmount(sliderSteps[sliderIndex] || sliderSteps[0]);
    }
  }, [sliderIndex, sliderSteps]);

  const handleSliderChange = (value: number[]) => {
    setSliderIndex(value[0]);
  };

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-border bg-card ${
          compact ? "p-6" : "p-8 md:p-12"
        }`}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const price = calculatePrice(amount);
  const pricePerCredit = getPricePerCredit(amount);
  const isEnterprisePack = amount >= 10000;

  return (
    <div
      className={`rounded-2xl border border-border bg-card ${
        compact ? "p-6" : "p-8 md:p-12"
      }`}
    >
      {/* Amount and Price Display */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <span className="font-display text-4xl font-bold">
            {amount.toLocaleString()}
          </span>
          <span className="ml-2 text-muted-foreground">{t("pricing.numbers")}</span>
        </div>
        <div className="text-right">
          {isEnterprisePack ? (
            <div className="flex flex-col items-end gap-2">
              <a
                href="https://calendly.com/samuel-get-eficia/30min"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="gradient-text border-eficia-violet hover:bg-eficia-violet/10"
                >
                  {t("pricing.talkToSales")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          ) : (
            <>
              <span className="font-display text-4xl font-bold text-eficia-violet">
                {formatPrice(price)}
              </span>
              <p className="text-sm text-muted-foreground">
                {formatPrice(pricePerCredit, { keepDecimals: true })} {t("pricing.perNumber")}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Slider */}
      <div className="mb-2">
        <Slider
          value={[sliderIndex]}
          onValueChange={handleSliderChange}
          min={0}
          max={Math.max(0, sliderSteps.length - 1)}
          step={1}
          className="w-full"
        />
      </div>

      {/* Slider Labels */}
      <div className="mb-8 flex justify-between text-xs text-muted-foreground">
        {sliderSteps.map((step, index) => (
          <span
            key={step}
            className={`cursor-pointer transition-colors hover:text-foreground ${
              index === sliderIndex ? "font-semibold text-eficia-violet" : ""
            }`}
            onClick={() => {
              setSliderIndex(index);
            }}
          >
            {formatNumber(step)}
          </span>
        ))}
      </div>

      {/* Volume Discount Note */}
      <div className="mb-6 rounded-lg bg-eficia-violet/10 p-4 text-center text-sm">
        <span className="text-muted-foreground">
          {t("pricing.volumeDiscountText")}{" "}
        </span>
        <a
          href="https://calendly.com/samuel-get-eficia/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold gradient-text hover:opacity-80"
        >
          {t("pricing.volumeDiscountLink")}
        </a>
      </div>

      {/* CTA Button */}
      {showCta && !isEnterprisePack && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleBuyNow}
            disabled={purchasing || !getSelectedPack()}
            className={`gradient-bg text-accent-foreground hover:opacity-90 ${isLoggedIn ? 'w-full' : 'flex-1'}`}
            size="lg"
          >
            {purchasing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("pricing.processing")}
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                {t("pricing.buyNow")}
              </>
            )}
          </Button>
          {!isLoggedIn && (
            <Link to="/signup" className="flex-1">
              <Button variant="outline" className="w-full" size="lg">
                {t("pricing.getStartedFree")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
};
