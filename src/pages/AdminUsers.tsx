import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface AdminUser {
  userId: string;
  email: string;
  creditAccountId: string | null;
  balance: number;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [topupInputs, setTopupInputs] = useState<Record<string, string>>({});
  const [savingForUser, setSavingForUser] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/signin");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error checking admin role:", profileError);
        navigate("/app");
        return;
      }

      if (!profile?.is_admin) {
        navigate("/app");
        return;
      }

      setIsAdmin(true);
      await loadUsersWithCredits();
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/app");
    } finally {
      setLoading(false);
    }
  };

  const loadUsersWithCredits = async () => {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, email");

    if (profilesError) {
      console.error("Error loading profiles:", profilesError);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
      return;
    }

    if (!profiles || profiles.length === 0) {
      setUsers([]);
      return;
    }

    const userIds = profiles.map((p) => p.user_id);

    const { data: creditAccounts, error: accountsError } = await supabase
      .from("credit_accounts")
      .select("id, user_id, balance")
      .in("user_id", userIds);

    if (accountsError) {
      console.error("Error loading credit accounts:", accountsError);
      toast({
        title: "Error",
        description: "Failed to load credit accounts",
        variant: "destructive",
      });
      return;
    }

    const accountMap = new Map<string, { id: string; balance: number | null }>(
      (creditAccounts || []).map((acc) => [
        acc.user_id,
        { id: acc.id, balance: acc.balance ?? 0 },
      ])
    );

    const mappedUsers: AdminUser[] = profiles.map((p: any) => {
      const acc = accountMap.get(p.user_id);
      return {
        userId: p.user_id,
        email: p.email,
        creditAccountId: acc?.id ?? null,
        balance: acc?.balance ?? 0,
      };
    });

    setUsers(mappedUsers);
  };

  const handleTopupInputChange = (userId: string, value: string) => {
    setTopupInputs((prev) => ({
      ...prev,
      [userId]: value,
    }));
  };

  const handleAddCredits = async (user: AdminUser) => {
    const rawValue = topupInputs[user.userId];
    const amount = parseInt(rawValue, 10);

    if (!amount || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a positive number of credits.",
        variant: "destructive",
      });
      return;
    }

    setSavingForUser(user.userId);

    try {
      let creditAccountId = user.creditAccountId;
      let currentBalance = user.balance ?? 0;

      if (!creditAccountId) {
        const { data: newAccount, error: createError } = await supabase
          .from("credit_accounts")
          .insert({
            user_id: user.userId,
            balance: 0,
          })
          .select("id, balance")
          .maybeSingle();

        if (createError || !newAccount) {
          throw createError || new Error("Failed to create credit account");
        }

        creditAccountId = newAccount.id;
        currentBalance = newAccount.balance ?? 0;
      }

      const newBalance = currentBalance + amount;

      const { error: updateError } = await supabase
        .from("credit_accounts")
        .update({ balance: newBalance })
        .eq("id", creditAccountId);

      if (updateError) throw updateError;

      const { error: txError } = await supabase
        .from("credit_transactions")
        .insert({
          credit_account_id: creditAccountId,
          amount,
          type: "admin_adjustment",
          description: "Admin manual credit top-up",
        });

      if (txError) throw txError;

      toast({
        title: "Credits added",
        description: `Successfully added ${amount} credits to ${user.email}.`,
      });

      await loadUsersWithCredits();
      setTopupInputs((prev) => ({ ...prev, [user.userId]: "" }));
    } catch (error: any) {
      console.error("Error adding credits:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add credits",
        variant: "destructive",
      });
    } finally {
      setSavingForUser(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h1 className="font-display text-2xl font-bold">Not Authorized</h1>
            <p className="mt-2 text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">All Users</h1>
          <p className="mt-1 text-muted-foreground">
            Manage user credit balances
          </p>
        </div>

        {/* Une seule carte : total users */}
        <div className="mb-8 grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="font-display text-2xl font-bold">{users.length}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-6">
            <h2 className="font-display text-xl font-semibold">
              Users & Credits
            </h2>
          </div>

          {users.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-6 py-3 text-sm font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="px-6 py-3 text-sm font-medium text-muted-foreground">
                      Current Credits
                    </th>
                    <th className="px-6 py-3 text-sm font-medium text-muted-foreground">
                      Add Credits
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.userId}
                      className="border-b border-border last:border-0 hover:bg-secondary/30"
                    >
                      <td className="px-6 py-4 text-sm">{u.email}</td>
                      <td className="px-6 py-4 text-sm">
                        {u.balance.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Credits"
                            value={topupInputs[u.userId] || ""}
                            onChange={(e) =>
                              handleTopupInputChange(u.userId, e.target.value)
                            }
                            className="w-32"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleAddCredits(u)}
                            disabled={
                              savingForUser === u.userId ||
                              !topupInputs[u.userId]
                            }
                          >
                            {savingForUser === u.userId ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>Add credits</>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminUsers;
