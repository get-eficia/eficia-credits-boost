import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CreditTransaction,
  EnrichJob,
  formatDate,
  getStatusColor,
  supabase,
} from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileSpreadsheet,
  History,
  Loader2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [jobs, setJobs] = useState<EnrichJob[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/signin");
      return;
    }

    setUser(user);
    await loadData(user.id);
    setLoading(false);
  };

  const loadData = async (userId: string) => {
    // Load profile with credit balance
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("credit_balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Error loading profile:", profileError);
      setCreditBalance(0);
    } else {
      setCreditBalance(profileData?.credit_balance ?? 0);
    }

    // Load jobs (RLS filters by user_id automatically)
    const { data: jobsData, error: jobsError} = await supabase
      .from("enrich_jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (jobsError) {
      console.error("Error loading jobs:", jobsError);
      setJobs([]);
    } else {
      console.log("Loaded jobs:", jobsData);
      setJobs(jobsData || []);
    }

    // Load transactions for this user
    const { data: txData, error: txError } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (txError) {
      console.error("Error loading transactions:", txError);
      setTransactions([]);
    } else {
      setTransactions(txData || []);
    }
  };

  const validateFile = (file: File): boolean => {
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    const isValidType =
      validTypes.includes(file.type) ||
      file.name.endsWith(".csv") ||
      file.name.endsWith(".xls") ||
      file.name.endsWith(".xlsx");

    if (!isValidType) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or Excel file (.csv, .xls, .xlsx)",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasCredits) {
      toast({
        title: "Not enough credits",
        description: "You need credits to upload a file.",
        variant: "destructive",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (validateFile(file)) {
      setSelectedFile(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!hasCredits) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!hasCredits) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!hasCredits) {
      toast({
        title: "Not enough credits",
        description: "You need credits to upload a file.",
        variant: "destructive",
      });
      return;
    }

    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    if (!hasCredits) {
      toast({
        title: "Not enough credits",
        description: "You need credits to upload a file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const filePath = `uploads/${user.id}/${crypto.randomUUID()}/${
        selectedFile.name
      }`;

      const { error: uploadError } = await supabase.storage
        .from("enrich-uploads")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: jobData, error: jobError } = await supabase
        .from("enrich_jobs")
        .insert({
          user_id: user.id,
          original_filename: selectedFile.name,
          original_file_path: filePath,
          status: "uploaded",
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Notify admins about the new upload
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          const { error: functionError } = await supabase.functions.invoke(
            "notify-admin-new-job",
            {
              body: {
                jobId: jobData.id,
                userId: user.id,
                filename: selectedFile.name,
                filePath: filePath,
              },
            }
          );

          if (functionError) {
            console.error(
              "Error calling notification function:",
              functionError
            );
            // Don't fail the upload if notification fails
          }
        }
      } catch (notifError) {
        console.error("Error sending admin notification:", notifError);
        // Continue even if notification fails
      }

      await loadData(user.id);
      setSelectedFile(null);

      toast({
        title: "File uploaded successfully!",
        description: "We will enrich your data within 24 hours maximum.",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCancelFile = () => {
    setSelectedFile(null);
  };

  const handleDownload = async (job: EnrichJob) => {
    // If Google Drive URL is available, open it in new tab
    if (job.enriched_file_url) {
      window.open(job.enriched_file_url, "_blank");
      return;
    }

    // Fallback to old storage download method
    if (!job.enriched_file_path) return;

    const { data, error } = await supabase.storage
      .from("enrich-uploads")
      .download(job.enriched_file_path);

    if (error) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Create download link
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = job.enriched_file_path.split("/").pop() || "enriched.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: EnrichJob["status"]) => {
    switch (status) {
      case "uploaded":
        return <Clock className="h-4 w-4" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const availableCredits = creditBalance;
  const hasCredits = availableCredits > 0;

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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Welcome & Credits */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h1 className="font-display text-2xl font-bold">
              Hi, {user.email?.split("@")[0]}!
            </h1>
            <p className="mt-1 text-muted-foreground">
              Welcome to your enrichment dashboard
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Available Credits
                </p>
                <p className="mt-1 font-display text-4xl font-bold text-eficia-violet">
                  {creditBalance.toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(true)}
                >
                  <History className="mr-2 h-4 w-4" />
                  History
                </Button>
                <Link to="/pricing">
                  <Button
                    size="sm"
                    className="gradient-bg text-accent-foreground hover:opacity-90"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Buy Credits
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="mb-8 rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-xl font-semibold">
            Upload File for Enrichment
          </h2>

          {!hasCredits ? (
            <div className="rounded-lg border border-border bg-secondary/30 p-6 text-center">
              <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
              <p className="font-medium">
                You don’t have any credits available.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Purchase a credit pack to upload a file for enrichment.
              </p>
              <Link to="/pricing">
                <Button className="mt-4 gradient-bg text-accent-foreground hover:opacity-90">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Buy Credits
                </Button>
              </Link>
            </div>
          ) : selectedFile ? (
            <div className="rounded-lg border-2 border-eficia-violet/50 bg-secondary/30 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-10 w-10 text-eficia-violet" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCancelFile}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="gradient-bg text-accent-foreground hover:opacity-90"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-secondary/30 p-12 text-center transition-colors ${
                isDragging
                  ? "border-eficia-violet bg-eficia-violet/10"
                  : "border-border hover:border-eficia-violet/50"
              }`}
            >
              <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-lg font-medium">
                Drop your file here or click to browse
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                Supports CSV, XLS, and XLSX files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="gradient-bg text-accent-foreground hover:opacity-90"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Select File
              </Button>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-eficia-violet" />
            Your file will be processed within 24 hours maximum
          </div>
        </div>

        {/* Jobs List */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-6">
            <h2 className="font-display text-xl font-semibold">
              Your Enrichment Jobs
            </h2>
          </div>

          {jobs.length === 0 ? (
            <div className="p-12 text-center">
              <FileSpreadsheet className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">No enrichment jobs yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload a file to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-6 py-3 text-sm font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="px-6 py-3 text-sm font-medium text-muted-foreground">
                      File
                    </th>
                    <th className="px-6 py-3 text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-6 py-3 text-sm font-medium text-muted-foreground">
                      Numbers Found
                    </th>
                    <th className="px-6 py-3 text-sm font-medium text-muted-foreground">
                      Credits Used
                    </th>
                    <th className="px-6 py-3 text-sm font-medium text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-6 py-4 text-sm">
                        {formatDate(job.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {job.original_filename}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                            job.status
                          )}`}
                        >
                          {getStatusIcon(job.status)}
                          {job.status.charAt(0).toUpperCase() +
                            job.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {job.numbers_found !== null
                          ? job.numbers_found?.toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {job.credited_numbers !== null
                          ? job.credited_numbers?.toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-6 py-4">
                        {job.status === "completed" &&
                        (job.enriched_file_url || job.enriched_file_path) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(job)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {job.status === "error" ? "Failed" : "Pending"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Need more credits CTA */}
        {creditBalance < 100 && (
          <div className="mt-8 rounded-xl gradient-bg p-6 text-center">
            <p className="font-display text-lg font-semibold text-accent-foreground">
              Running low on credits?
            </p>
            <p className="mt-1 text-sm text-accent-foreground/80">
              Top up now to continue enriching your data
            </p>
            <Link to="/pricing">
              <Button variant="secondary" className="mt-4">
                View Credit Packs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </main>

      {/* Credit History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Credit History</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {transactions.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No transactions yet
              </p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                    <span
                      className={`font-display text-lg font-bold ${
                        tx.amount > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
