import { Header } from "@/components/layout/Header";
import { PricingSlider } from "@/components/pricing/PricingSlider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  CreditCard,
  Download,
  FileSpreadsheet,
  History,
  Loader2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Normalize filename by removing accents and special characters
const normalizeFilename = (filename: string): string => {
  // Split filename into name and extension
  const lastDotIndex = filename.lastIndexOf(".");
  const name = lastDotIndex !== -1 ? filename.slice(0, lastDotIndex) : filename;
  const extension = lastDotIndex !== -1 ? filename.slice(lastDotIndex) : "";

  // Remove accents and normalize
  const normalized = name
    .normalize("NFD") // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-zA-Z0-9\s\-_()]/g, "") // Keep only alphanumeric, spaces, hyphens, underscores, parentheses
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim();

  return normalized + extension.toLowerCase();
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showProcessingDialog, setShowProcessingDialog] = useState(false);
  const [shouldReloadOnDialogClose, setShouldReloadOnDialogClose] =
    useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

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
    const { data: jobsData, error: jobsError } = await supabase
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
    // Check file type
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
        title: t("dashboard.invalidFileType"),
        description: t("dashboard.invalidFileDescription"),
        variant: "destructive",
      });
      return false;
    }

    // Check if filename will be normalized (contains accents or special characters)
    const normalizedName = normalizeFilename(file.name);
    if (normalizedName !== file.name) {
      toast({
        title: t("dashboard.filenameNormalized"),
        description: t("dashboard.filenameNormalizedDescription", {
          original: file.name,
          normalized: normalizedName,
        }),
      });
    }

    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasCredits) {
      toast({
        title: t("dashboard.notEnoughCredits"),
        description: t("dashboard.needCreditsDescription"),
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
        title: t("dashboard.notEnoughCredits"),
        description: t("dashboard.needCreditsDescription"),
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

  const handleStartEnrichment = () => {
    if (!selectedFile || !user) return;

    if (!hasCredits) {
      toast({
        title: t("dashboard.notEnoughCredits"),
        description: t("dashboard.needCreditsDescription"),
        variant: "destructive",
      });
      return;
    }

    // Open confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || !user) return;

    // Close confirmation dialog
    setShowConfirmDialog(false);

    // Show processing dialog
    setShowProcessingDialog(true);
    setUploading(true);

    try {
      // Normalize filename to remove accents and special characters
      const normalizedFilename = normalizeFilename(selectedFile.name);

      const filePath = `uploads/${
        user.id
      }/${crypto.randomUUID()}/${normalizedFilename}`;

      const { error: uploadError } = await supabase.storage
        .from("enrich-uploads")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: jobData, error: jobError } = await supabase
        .from("enrich_jobs")
        .insert({
          user_id: user.id,
          original_filename: normalizedFilename,
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
                filename: normalizedFilename,
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

      // Mark that we need to reload data when dialog closes
      setShouldReloadOnDialogClose(true);
      setSelectedFile(null);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: t("dashboard.uploadFailed"),
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
      // Close processing dialog on error
      setShowProcessingDialog(false);
    } finally {
      setUploading(false);
    }
  };

  const handleProcessingDialogClose = async () => {
    setShowProcessingDialog(false);

    // Reload data if upload was successful
    if (shouldReloadOnDialogClose && user) {
      await loadData(user.id);
      setShouldReloadOnDialogClose(false);
    }
  };

  const handleCancelFile = () => {
    setSelectedFile(null);
  };

  const handleDownload = async (job: EnrichJob) => {
    // Priority 1: Download from Supabase Storage if file path exists
    if (job.enriched_file_path) {
      try {
        const { data, error } = await supabase.storage
          .from("enrich-uploads")
          .download(job.enriched_file_path);

        if (error) throw error;

        // Create download link
        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = job.enriched_file_path.split("/").pop() || "enriched.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      } catch (error: any) {
        console.error("Supabase download error:", error);
        toast({
          title: t("dashboard.downloadFailed"),
          description: error.message || "Failed to download file from storage",
          variant: "destructive",
        });
        return;
      }
    }

    // Priority 2: Fallback to Google Drive URL (legacy support)
    if (job.enriched_file_url) {
      window.open(job.enriched_file_url, "_blank");
      return;
    }

    // No file available
    toast({
      title: t("dashboard.noFileAvailable"),
      description: t("dashboard.noFileDescription"),
      variant: "destructive",
    });
  };

  const getStatusIcon = (status: EnrichJob["status"]) => {
    switch (status) {
      case "uploaded":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: EnrichJob["status"]) => {
    switch (status) {
      case "uploaded":
        return t("dashboard.statusEnriching");
      case "processing":
        return t("dashboard.statusProcessing");
      case "completed":
        return t("dashboard.statusCompleted");
      case "error":
        return t("dashboard.statusError");
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
        {/* First Time Here Banner */}
        <div className="mb-8 rounded-xl border border-eficia-violet/20 bg-gradient-to-r from-eficia-violet/5 to-eficia-purple/5 p-8 text-center">
          <h2 className="mb-4 font-display text-2xl font-bold">
            {t("dashboard.firstTimeTitle")}
          </h2>
          <p className="mb-6 text-lg text-muted-foreground">
            {t("dashboard.firstTimeDescription")}
          </p>
          <a
            href="https://calendly.com/samuel-get-eficia/30min"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="gradient-bg text-white hover:opacity-90">
              {t("dashboard.scheduleSession")}
            </Button>
          </a>
        </div>

        {/* Welcome & Credits */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h1 className="font-display text-2xl font-bold">
              {t("dashboard.hi", { email: user.email })}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {t("dashboard.welcomeMessage")}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.availableCredits")}
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
                  {t("dashboard.history")}
                </Button>
                <Button
                  size="sm"
                  className="gradient-bg text-accent-foreground hover:opacity-90"
                  onClick={() => setShowPricingModal(true)}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t("dashboard.buyCredits")}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="mb-8 rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-xl font-semibold">
            {t("dashboard.uploadTitle")}
          </h2>

          {!hasCredits ? (
            <div className="rounded-lg border-2 border-eficia-violet/30 bg-gradient-to-br from-eficia-violet/5 to-eficia-purple/5 p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-eficia-violet/20 to-eficia-purple/20">
                <CreditCard className="h-8 w-8 text-eficia-violet" />
              </div>
              <p className="font-display text-xl font-semibold">
                {t("dashboard.readyToStart")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("dashboard.readyDescription")}
              </p>
              <Button
                className="mt-6 gradient-bg text-accent-foreground hover:opacity-90"
                size="lg"
                onClick={() => setShowPricingModal(true)}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                {t("dashboard.getYourCredits")}
              </Button>
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
                    {t("dashboard.cancel")}
                  </Button>
                  <Button
                    onClick={handleStartEnrichment}
                    disabled={uploading}
                    className="gradient-bg text-accent-foreground hover:opacity-90"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("dashboard.uploading")}
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {t("dashboard.startEnrichment")}
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
                {t("dashboard.dropFile")}
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                {t("dashboard.supportsFormats")}
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
                {t("dashboard.selectFile")}
              </Button>
            </div>
          )}

          <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              <strong>{t("dashboard.noteTitle")}</strong> {t("dashboard.noteDescription")}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-eficia-violet" />
            {t("dashboard.processedWithin24h")}
          </div>
        </div>

        {/* Jobs List */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-6">
            <h2 className="font-display text-xl font-semibold">
              {t("dashboard.yourJobs")}
            </h2>
          </div>

          {jobs.length === 0 ? (
            <div className="p-12 text-center">
              <FileSpreadsheet className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">{t("dashboard.noJobsYet")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("dashboard.uploadToStart")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-6 py-3 text-sm font-medium text-muted-foreground">
                      {t("dashboard.date")}
                    </th>
                    <th className="px-6 py-3 text-sm font-medium text-muted-foreground">
                      {t("dashboard.file")}
                    </th>
                    <th className="px-6 py-3 text-sm font-medium text-muted-foreground">
                      {t("dashboard.status")}
                    </th>
                    <th className="px-6 py-3 text-sm font-medium text-muted-foreground">
                      {t("dashboard.numbersFound")}
                    </th>
                    <th className="px-6 py-3 text-sm font-medium text-muted-foreground">
                      {t("dashboard.action")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <>
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
                            {getStatusLabel(job.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {job.numbers_found !== null
                            ? job.numbers_found?.toLocaleString()
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
                              {t("dashboard.download")}
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {job.status === "error" ? t("dashboard.failed") : t("dashboard.pending")}
                            </span>
                          )}
                        </td>
                      </tr>
                      {job.admin_note && (
                        <tr
                          key={`${job.id}-note`}
                          className="border-b border-border bg-secondary/30"
                        >
                          <td colSpan={6} className="px-6 py-3">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-eficia-violet mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs font-medium text-eficia-violet">
                                  {t("dashboard.adminNote")}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {job.admin_note}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
              {t("dashboard.runningLowTitle")}
            </p>
            <p className="mt-1 text-sm text-accent-foreground/80">
              {t("dashboard.runningLowDescription")}
            </p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => setShowPricingModal(true)}
            >
              {t("dashboard.viewCreditPacks")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

      {/* Credit History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{t("dashboard.creditHistory")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {transactions.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                {t("dashboard.noTransactions")}
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

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dashboard.confirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("dashboard.confirmDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              {t("dashboard.no")}
            </Button>
            <Button
              onClick={handleConfirmUpload}
              className="gradient-bg text-accent-foreground hover:opacity-90"
            >
              {t("dashboard.yes")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Processing Dialog */}
      <Dialog
        open={showProcessingDialog}
        onOpenChange={handleProcessingDialogClose}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("dashboard.processingTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("dashboard.processingDescription")}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Pricing Modal */}
      <Dialog open={showPricingModal} onOpenChange={setShowPricingModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {t("landing.pricingTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("landing.pricingDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <PricingSlider showCta={true} compact={false} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
