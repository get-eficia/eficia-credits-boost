import eficiaLogo from "@/assets/eficia-logo.png";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const SignIn = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("No user returned");

      // On va chercher le profil pour savoir si c'est un admin
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error loading profile for admin status:", profileError);
      }

      const isAdmin = !!profile?.is_admin;

      toast({
        title: t("signIn.welcomeMessage"),
        description: t("signIn.signedInAs", { email: data.user.email }),
      });

      navigate(isAdmin ? "/admin" : "/app");
    } catch (err: any) {
      console.error("Sign in error:", err);
      toast({
        title: t("signIn.signInFailed"),
        description: err.message || t("signIn.invalidCredentials"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: t("signIn.emailSent"),
        description: t("signIn.checkInbox"),
      });

      setShowForgotPassword(false);
      setResetEmail("");
    } catch (err: any) {
      console.error("Reset password error:", err);
      toast({
        title: t("signIn.resetFailed"),
        description: err.message || t("signIn.failedToSendReset"),
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center">
              <img
                src={eficiaLogo}
                alt="Eficia Logo"
                className="h-14 object-contain"
              />
            </div>

            <h1 className="font-display text-3xl font-bold">{t("signIn.welcomeBack")}</h1>
            <p className="mt-2 text-muted-foreground">
              {t("signIn.noAccount")}{" "}
              <Link to="/signup" className="text-eficia-teal hover:underline">
                {t("signIn.signUp")}
              </Link>
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">{t("signIn.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1"
                  placeholder={t("signUp.emailPlaceholder")}
                />
              </div>
              <div>
                <Label htmlFor="password">{t("signIn.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="mt-6 w-full gradient-bg text-accent-foreground hover:opacity-90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("signIn.signingIn")}
                </>
              ) : (
                t("signIn.signIn")
              )}
            </Button>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("signIn.forgotPassword")}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {t("signIn.resetPasswordTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("signIn.resetPasswordDescription")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <Label htmlFor="reset-email">{t("signIn.email")}</Label>
              <Input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder={t("signUp.emailPlaceholder")}
                required
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForgotPassword(false)}
                disabled={resetting}
              >
                {t("signIn.cancel")}
              </Button>
              <Button
                type="submit"
                className="gradient-bg text-accent-foreground hover:opacity-90"
                disabled={resetting}
              >
                {resetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("signIn.sending")}
                  </>
                ) : (
                  t("signIn.sendResetLink")
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SignIn;
