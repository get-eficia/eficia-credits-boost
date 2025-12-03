import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { formatPrice, supabase } from "@/lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export const PricingSlider = ({ showCta = true, compact = false }: PricingSliderProps) => {
  const [sliderIndex, setSliderIndex] = useState(1);
  const [amount, setAmount] = useState(200);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [sliderSteps, setSliderSteps] = useState<number[]>([]);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadPricingData();
  }, []);

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
      setPricingTiers(fallbackSteps.map(c => ({ credits: c, pricePerCredit: 0.29 - (c / 10000) * 0.17 })));
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

    const steps = tiers.map(t => t.credits);

    setCreditPacks(packs);
    setSliderSteps(steps);
    setPricingTiers(tiers);
    // Default to Professional pack (500 credits) if available
    const defaultIndex = steps.findIndex(s => s === 500);
    const index = defaultIndex >= 0 ? defaultIndex : Math.min(3, steps.length - 1);
    setAmount(steps[index]);
    setSliderIndex(index);
    setLoading(false);
  };

  const getSelectedPack = (): CreditPack | undefined => {
    // Find pack matching the current amount (from slider or custom)
    return creditPacks.find(p => p.credits === amount) || creditPacks[sliderIndex];
  };

  const handleBuyNow = async () => {
    setPurchasing(true);
    
    try {
      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Connexion requise",
          description: "Veuillez vous connecter pour acheter des crédits.",
          variant: "destructive",
        });
        navigate("/signin");
        return;
      }

      const selectedPack = getSelectedPack();
      if (!selectedPack) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner un pack de crédits valide.",
          variant: "destructive",
        });
        return;
      }

      // Call the create-checkout edge function
      console.log("Calling create-checkout with pack_id:", selectedPack.id);
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { pack_id: selectedPack.id },
      });

      console.log("Response:", { data, error });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to send a request to the Edge Function");
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
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
      <div className={`flex items-center justify-center rounded-2xl border border-border bg-card ${compact ? "p-6" : "p-8 md:p-12"}`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const price = calculatePrice(amount);
  const pricePerCredit = getPricePerCredit(amount);
  const selectedPack = getSelectedPack();
  const basePricePerCredit = 0.29;
  const savingsPercent = Math.round((1 - pricePerCredit / basePricePerCredit) * 100);

  return (
    <div className={`rounded-2xl border border-border bg-card ${compact ? "p-6" : "p-8 md:p-12"}`}>
      <div className="mb-8 text-center">
        <h3 className="font-display text-2xl font-bold">Calculate Your Price</h3>
        <p className="mt-2 text-muted-foreground">
          Adjust the slider to see how many numbers you want to enrich
        </p>
      </div>

      {/* Pack Name and Popular Badge */}
      {selectedPack && (
        <div className="mb-4 flex items-center justify-center gap-2">
          <span className="font-display text-lg font-semibold text-eficia-violet">
            {selectedPack.name}
          </span>
          {selectedPack.is_popular && (
            <span className="rounded-full bg-eficia-violet px-3 py-1 text-xs font-semibold text-white">
              ⭐ Most Popular
            </span>
          )}
        </div>
      )}

      {/* Amount and Price Display */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <span className="font-display text-4xl font-bold">{amount.toLocaleString()}</span>
          <span className="ml-2 text-muted-foreground">numbers</span>
        </div>
        <div className="text-right">
          <span className="font-display text-4xl font-bold text-eficia-violet">
            {formatPrice(price)}
          </span>
          <p className="text-sm text-muted-foreground">
            {formatPrice(pricePerCredit)} per number
          </p>
          {savingsPercent > 0 && (
            <p className="text-xs font-semibold text-green-600">
              Save {savingsPercent}% vs base price
            </p>
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
          If you want to lower prices because you anticipate a need for volume:{" "}
        </span>
        <Link to="/contact" className="font-medium text-eficia-violet hover:underline">
          book an appointment here
        </Link>
        <span className="text-muted-foreground">, we offer credit packs.</span>
      </div>

      {/* CTA Button */}
      {showCta && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleBuyNow}
            disabled={purchasing || !getSelectedPack()}
            className="flex-1 gradient-bg text-accent-foreground hover:opacity-90" 
            size="lg"
          >
            {purchasing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Buy Now
              </>
            )}
          </Button>
          <Link to="/signup" className="flex-1">
            <Button variant="outline" className="w-full" size="lg">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};
