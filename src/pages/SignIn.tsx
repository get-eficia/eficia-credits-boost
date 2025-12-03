import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2, Zap } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const SignIn = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
        title: "Welcome back!",
        description: `Signed in as ${data.user.email}`,
      });

      navigate(isAdmin ? "/admin" : "/app");
    } catch (err: any) {
      console.error("Sign in error:", err);
      toast({
        title: "Sign in failed",
        description: err.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl gradient-bg">
              <Zap className="h-6 w-6 text-accent-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold">Welcome back</h1>
            <p className="mt-2 text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-eficia-teal hover:underline">
                Sign up
              </Link>
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
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
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="mt-4 text-center">
              <a
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Forgot your password?
              </a>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default SignIn;
