import eficiaLogo from "@/assets/eficia-logo.png";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const SignUp = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: t("signUp.error"),
        description: t("signUp.passwordsDoNotMatch"),
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: t("signUp.error"),
        description: t("signUp.passwordTooShort"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Call the complete-signup Edge Function
      const { data, error } = await supabase.functions.invoke(
        "complete-signup",
        {
          body: {
            email: formData.email,
            password: formData.password,
            phone: formData.phone || undefined,
          },
        }
      );

      console.log("Signup response:", { data, error });

      // Check for errors - Supabase returns errors in the error field for non-2xx responses
      if (error) {
        console.error("Supabase function error:", error);

        // For non-2xx responses, try to read the response from the error context
        let errorData = null;
        const errorContext = (error as any).context;

        // The body might be in different formats depending on the response
        if (errorContext?.body) {
          try {
            // If body is already an object (parsed JSON)
            if (typeof errorContext.body === 'object' && errorContext.body !== null) {
              // Check if it's a ReadableStream
              if (errorContext.body instanceof ReadableStream) {
                const reader = errorContext.body.getReader();
                const chunks: Uint8Array[] = [];
                let done = false;

                while (!done) {
                  const { value, done: streamDone } = await reader.read();
                  if (value) chunks.push(value);
                  done = streamDone;
                }

                const bodyText = new TextDecoder().decode(
                  new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], [] as number[]))
                );
                errorData = JSON.parse(bodyText);
              } else {
                // Already an object, use it directly
                errorData = errorContext.body;
              }
            } else if (typeof errorContext.body === 'string') {
              // Body is a string, parse it
              errorData = JSON.parse(errorContext.body);
            }
          } catch (parseErr) {
            console.error("Failed to parse error body:", parseErr);
          }
        }

        // Check for specific error code (EMAIL_EXISTS for 409 responses)
        if (errorData?.error_code === "EMAIL_EXISTS") {
          toast({
            title: t("signUp.emailAlreadyRegistered"),
            description: t("signUp.emailExistsDescription"),
            variant: "destructive",
          });
          return;
        }

        // Check if error message contains "already exist"
        if (errorData?.error?.toLowerCase().includes("already exist") ||
            error.message?.toLowerCase().includes("already exist")) {
          toast({
            title: t("signUp.emailAlreadyRegistered"),
            description: t("signUp.emailExistsDescription"),
            variant: "destructive",
          });
          return;
        }

        // Generic error fallback
        const errorMsg = errorData?.error || error.message || t("signUp.signUpFailed");
        toast({
          title: t("signUp.signUpFailed"),
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }

      // Success case
      if (!data?.success) {
        console.error("Signup failed - no success flag");
        throw new Error("Signup failed");
      }

      console.log("Account created successfully:", data);

      toast({
        title: t("signUp.accountCreated"),
        description: t("signUp.welcomeMessage"),
      });

      navigate("/signin");
    } catch (err: any) {
      console.error("Signup error:", err);

      // Extract error message from the response
      let errorMessage = t("signUp.somethingWentWrong");

      if (err?.message) {
        errorMessage = err.message;
      }

      toast({
        title: t("signUp.signUpFailed"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center">
              <img
                src={eficiaLogo}
                alt="Eficia Logo"
                className="h-14 object-contain"
              />
            </div>

            <h1 className="font-display text-3xl font-bold">
              {t("signUp.createAccount")}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t("signUp.alreadyHaveAccount")}{" "}
              <Link to="/signin" className="text-eficia-violet hover:underline">
                {t("signUp.signIn")}
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account info */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 font-display text-lg font-semibold">
                {t("signUp.createAccount")}
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">{t("signUp.email")}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="mt-1"
                    placeholder={t("signUp.emailPlaceholder")}
                  />
                </div>
                <div>
                  <Label htmlFor="password">{t("signUp.password")}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="mt-1"
                    placeholder={t("signUp.passwordPlaceholder")}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">{t("signUp.confirmPassword")}</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">{t("signUp.phone")}</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="mt-1"
                    placeholder={t("signUp.phonePlaceholder")}
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gradient-bg text-accent-foreground hover:opacity-90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("signUp.creatingAccount")}
                </>
              ) : (
                t("signUp.createAccount_button")
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("signUp.termsPrefix")}{" "}
            <a href="#" className="text-eficia-violet hover:underline">
              {t("signUp.termsOfService")}
            </a>{" "}
            {t("signUp.and")}{" "}
            <a href="#" className="text-eficia-violet hover:underline">
              {t("signUp.privacyPolicy")}
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
};

export default SignUp;
