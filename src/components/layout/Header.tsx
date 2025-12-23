import eficiaLogo from "@/assets/eficia-logo.png";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { LogOut, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface UserWithRole extends User {
  isAdmin?: boolean;
}

export const Header = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkAdminStatus(session.user);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        checkAdminStatus(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (authUser: User) => {
    // On regarde simplement dans la table profiles
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("user_id", authUser.id) // ⚠️ colonne user_id dans ta table
      .maybeSingle();

    if (error) {
      console.error("Error loading profile for admin status:", error);
    }

    setUser({
      ...authUser,
      // si pas de profil ou erreur → false par défaut
      isAdmin: !!profile?.is_admin,
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-background/60 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center">
          <img src={eficiaLogo} alt="Eficia" className="h-14 w-auto" />
        </Link>

        {/* Center link - Desktop only */}
        <a
          href="https://calendly.com/samuel-get-eficia/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:block text-base font-semibold transition-colors hover:opacity-90"
          dangerouslySetInnerHTML={{
            __html: t("header.askFreeTrial", {
              interpolation: { escapeValue: false },
            }).replace(
              "free-trial",
              '<span class="gradient-text">free-trial</span>'
            ),
          }}
        />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <LanguageSwitcher />
          {user ? (
            <>
              {/* Dashboard visible uniquement si NON admin */}
              {!user.isAdmin && (
                <Link
                  to="/app"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("header.dashboard")}
                </Link>
              )}
              {user.isAdmin && (
                <>
                  <Link
                    to="/admin"
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("header.admin")}
                  </Link>
                  <Link
                    to="/admin/users"
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("header.allUsers")}
                  </Link>
                </>
              )}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("header.logout")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link to="/signin">
                <Button variant="ghost" size="sm">
                  {t("header.signIn")}
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  size="sm"
                  className="gradient-bg text-accent-foreground hover:opacity-90"
                >
                  {t("header.getStarted")}
                </Button>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-background p-4 md:hidden">
          <nav className="flex flex-col gap-4">
            <div className="flex justify-center pb-2">
              <LanguageSwitcher />
            </div>
            <a
              href="https://calendly.com/samuel-get-eficia/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-semibold"
              onClick={() => setMobileMenuOpen(false)}
              dangerouslySetInnerHTML={{
                __html: t("header.askFreeTrial", {
                  interpolation: { escapeValue: false },
                }).replace(
                  "free-trial",
                  '<span class="gradient-text">free-trial</span>'
                ),
              }}
            />
            {user ? (
              <>
                {/* Dashboard visible uniquement si NON admin */}
                {!user.isAdmin && (
                  <Link
                    to="/app"
                    className="text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("header.dashboard")}
                  </Link>
                )}

                {user.isAdmin && (
                  <>
                    <Link
                      to="/admin"
                      className="text-sm font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t("header.admin")}
                    </Link>
                    <Link
                      to="/admin/users"
                      className="text-sm font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t("header.allUsers")}
                    </Link>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="justify-start"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("header.logout")}
                </Button>
              </>
            ) : (
              <>
                <Link to="/signin" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full">
                    {t("header.signIn")}
                  </Button>
                </Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    size="sm"
                    className="w-full gradient-bg text-accent-foreground"
                  >
                    {t("header.getStarted")}
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
