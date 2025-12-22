import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  EnrichJob,
  formatDate,
  getStatusColor,
  supabase,
} from "@/lib/supabase";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  FileSpreadsheet,
  Link as LinkIcon,
  Loader2,
  Save,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface JobWithUser extends EnrichJob {
  userEmail?: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [jobs, setJobs] = useState<JobWithUser[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobWithUser | null>(null);
  const [editedJob, setEditedJob] = useState<Partial<EnrichJob>>({});
  const [saving, setSaving] = useState(false);
  const [enrichedFile, setEnrichedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const getStatusLabel = (status: EnrichJob["status"]) => {
    switch (status) {
      case "uploaded":
        return "Enriching";
      case "processing":
        return "Processing";
      case "completed":
        return "Completed";
      case "error":
        return "Error";
    }
  };

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

      // Check admin role uniquement via profiles.is_admin
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
        // Pas admin → on renvoie vers le dashboard
        navigate("/app");
        return;
      }

      setIsAdmin(true);

      await loadJobs();
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/app");
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    // Fetch all jobs
    const { data: jobsData, error: jobsError } = await supabase
      .from("enrich_jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (jobsError) {
      console.error("Error loading jobs:", jobsError);
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      });
      return;
    }

    if (!jobsData || jobsData.length === 0) {
      setJobs([]);
      return;
    }

    // Fetch all profiles to get emails
    const userIds = [...new Set(jobsData.map((job) => job.user_id))];
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, email")
      .in("user_id", userIds);

    if (profilesError) {
      console.error("Error loading profiles:", profilesError);
      // Continue without emails if profiles fail
      const jobsWithoutEmail: JobWithUser[] = jobsData.map((job: any) => ({
        ...job,
        userEmail: "Unknown",
      }));
      setJobs(jobsWithoutEmail);
      return;
    }

    // Create a map of user_id to email
    const emailMap = new Map(
      (profilesData || []).map((profile) => [profile.user_id, profile.email])
    );

    // Combine jobs with emails
    const jobsWithEmail: JobWithUser[] = jobsData.map((job: any) => ({
      ...job,
      userEmail: emailMap.get(job.user_id) || "Unknown",
    }));

    setJobs(jobsWithEmail);
  };

  const handleEditJob = (job: JobWithUser) => {
    setSelectedJob(job);
    setEditedJob({
      status: job.status,
      credited_numbers: job.credited_numbers,
      admin_note: job.admin_note,
      enriched_file_path: job.enriched_file_path,
      enriched_file_url: job.enriched_file_url,
    });
    setEnrichedFile(null);
  };

  const handleSaveJob = async () => {
    if (!selectedJob) return;

    setSaving(true);

    try {
      // Upload enriched file if one was selected
      let enrichedFilePath = editedJob.enriched_file_path;
      if (enrichedFile) {
        setUploadingFile(true);
        const filePath = `enriched/${selectedJob.user_id}/${crypto.randomUUID()}/${enrichedFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from("enrich-uploads")
          .upload(filePath, enrichedFile);

        if (uploadError) {
          console.error("File upload error:", uploadError);
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }

        enrichedFilePath = filePath;
        setUploadingFile(false);
      }

      const updates: any = {
        status: editedJob.status,
        credited_numbers: editedJob.credited_numbers,
        admin_note: editedJob.admin_note,
        enriched_file_path: enrichedFilePath,
        enriched_file_url: editedJob.enriched_file_url,
      };

      // If marking as completed and wasn't completed before
      if (
        editedJob.status === "completed" &&
        selectedJob.status !== "completed"
      ) {
        updates.completed_at = new Date().toISOString();

        // Deduct credits from user's account and create transaction
        if (editedJob.credited_numbers && editedJob.credited_numbers > 0) {
          console.log(
            "Starting credit deduction for user:",
            selectedJob.user_id,
            "amount:",
            editedJob.credited_numbers
          );

          // Get user's current credit balance
          const { data: profile, error: profileFetchError } = await supabase
            .from("profiles")
            .select("credit_balance")
            .eq("user_id", selectedJob.user_id)
            .maybeSingle();

          if (profileFetchError) {
            console.error("Error fetching profile:", profileFetchError);
          }

          console.log("Profile found:", profile);

          if (profile) {
            // Update balance
            const newBalance =
              (profile.credit_balance || 0) - editedJob.credited_numbers;

            console.log(
              "Updating balance from",
              profile.credit_balance,
              "to",
              newBalance
            );

            const { error: balanceError } = await supabase
              .from("profiles")
              .update({ credit_balance: newBalance })
              .eq("user_id", selectedJob.user_id);

            if (balanceError) {
              console.error("Error updating credit balance:", balanceError);
              throw new Error(
                `Failed to update credit balance: ${balanceError.message}`
              );
            }

            console.log("Balance updated successfully");

            // Create credit transaction
            console.log("Creating transaction record...");
            const { error: txError, data: txData } = await supabase
              .from("credit_transactions")
              .insert({
                user_id: selectedJob.user_id,
                amount: -editedJob.credited_numbers,
                type: "enrich_deduction",
                description: `Enrichment job: ${selectedJob.original_filename}`,
                related_job_id: selectedJob.id,
              })
              .select();

            console.log("Transaction insert result:", {
              error: txError,
              data: txData,
            });

            if (txError) {
              console.error("Error creating transaction:", txError);
              throw new Error(
                `Failed to create transaction: ${txError.message}`
              );
            }

            console.log("Transaction created successfully");

            toast({
              title: "Credits Deducted",
              description: `${editedJob.credited_numbers} credits deducted from user's account.`,
            });
          } else {
            console.error("Profile not found for user:", selectedJob.user_id);
          }
        }
      }

      // Update the job
      const { error } = await supabase
        .from("enrich_jobs")
        .update(updates)
        .eq("id", selectedJob.id);

      if (error) throw error;

      // Notify user if job was just completed
      if (
        editedJob.status === "completed" &&
        selectedJob.status !== "completed"
      ) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.access_token) {
            const { data: notifData, error: notifError } = await supabase.functions.invoke("notify-user-job-completed", {
              body: {
                jobId: selectedJob.id,
                userId: selectedJob.user_id,
                filename: selectedJob.original_filename,
                numbersFound: editedJob.credited_numbers || 0,
                creditedNumbers: editedJob.credited_numbers || 0,
                enrichedFileUrl: editedJob.enriched_file_url || null,
              },
            });

            if (notifError) {
              console.error("Error sending user notification:", notifError);
              toast({
                title: "Warning",
                description: "Job updated but user notification failed. Please check logs.",
                variant: "destructive",
              });
            } else {
              console.log("User notification sent successfully:", notifData);
            }
          } else {
            console.error("No session token available for function invocation");
          }
        } catch (notifError) {
          console.error("Exception sending user notification:", notifError);
          // Continue even if notification fails
        }
      }

      await loadJobs();
      setSelectedJob(null);

      toast({
        title: "Job Updated",
        description: "The enrichment job has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error saving job:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save job",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const stats = {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === "uploaded").length,
    error: jobs.filter((j) => j.status === "error").length,
    completed: jobs.filter((j) => j.status === "completed").length,
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
          <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Manage enrichment jobs and process requests
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Users className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
                <p className="font-display text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Enriching</p>
                <p className="font-display text-2xl font-bold">
                  {stats.pending}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Error</p>
                <p className="font-display text-2xl font-bold">
                  {stats.error}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="font-display text-2xl font-bold">
                  {stats.completed}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Jobs Table */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-6">
            <h2 className="font-display text-xl font-semibold">
              All Enrichment Jobs
            </h2>
          </div>

          {jobs.length === 0 ? (
            <div className="p-12 text-center">
              <FileSpreadsheet className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">No jobs yet</p>
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
                      User
                    </th>
                    <th className="px-6 py-3 text-sm font-medium text-muted-foreground">
                      File
                    </th>
                    <th className="px-6 py-3 text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-6 py-3 text-sm font-medium text-muted-foreground">
                      Numbers
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
                      className="border-b border-border last:border-0 hover:bg-secondary/30"
                    >
                      <td className="px-6 py-4 text-sm">
                        {formatDate(job.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm">{job.userEmail}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={async () => {
                            try {
                              const { data, error } = await supabase.storage
                                .from("enrich-uploads")
                                .download(job.original_file_path);

                              if (error) throw error;

                              const url = URL.createObjectURL(data);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = job.original_filename;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            } catch (error: any) {
                              console.error("Download error:", error);
                              toast({
                                title: "Download failed",
                                description: error.message || "Failed to download file",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="flex items-center gap-2 hover:text-eficia-violet transition-colors"
                        >
                          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                          <span className="max-w-[200px] truncate text-sm font-medium underline">
                            {job.original_filename}
                          </span>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                            job.status
                          )}`}
                        >
                          {getStatusLabel(job.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {job.numbers_found !== null
                          ? job.numbers_found?.toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditJob(job)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View / Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Edit Job Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              Edit Enrichment Job
            </DialogTitle>
          </DialogHeader>

          {selectedJob && (
            <div className="space-y-4">
              <div className="rounded-lg bg-secondary/50 p-4">
                <p className="text-sm font-medium">
                  {selectedJob.original_filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  User: {selectedJob.userEmail} • Created:{" "}
                  {formatDate(selectedJob.created_at)}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={editedJob.status}
                    onValueChange={(value) =>
                      setEditedJob((prev) => ({
                        ...prev,
                        status: value as EnrichJob["status"],
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uploaded">Enriching</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="creditedNumbers">Credits to Deduct</Label>
                  <Input
                    id="creditedNumbers"
                    type="number"
                    value={editedJob.credited_numbers || ""}
                    onChange={(e) =>
                      setEditedJob((prev) => ({
                        ...prev,
                        credited_numbers: parseInt(e.target.value) || undefined,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="adminNote">Admin Note</Label>
                <Textarea
                  id="adminNote"
                  value={editedJob.admin_note || ""}
                  onChange={(e) =>
                    setEditedJob((prev) => ({
                      ...prev,
                      admin_note: e.target.value,
                    }))
                  }
                  className="mt-1"
                  rows={3}
                  placeholder="Internal notes about this job..."
                />
              </div>

              <div>
                <Label htmlFor="enrichedFile">
                  Upload Enriched File
                </Label>
                <div className="mt-2">
                  {editedJob.enriched_file_path && !enrichedFile && (
                    <div className="mb-2 flex items-center gap-2 rounded-md bg-green-50 p-2 text-sm text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>File already uploaded</span>
                    </div>
                  )}
                  <Input
                    id="enrichedFile"
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setEnrichedFile(file);
                      }
                    }}
                    className="cursor-pointer"
                  />
                  {enrichedFile && (
                    <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <FileSpreadsheet className="h-4 w-4" />
                      {enrichedFile.name} ({(enrichedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upload the enriched CSV or Excel file for the user to download
                </p>
              </div>

              <div>
                <Label htmlFor="enrichedFileUrl">
                  Google Drive Link (Optional - Legacy)
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="enrichedFileUrl"
                    type="url"
                    value={editedJob.enriched_file_url || ""}
                    onChange={(e) =>
                      setEditedJob((prev) => ({
                        ...prev,
                        enriched_file_url: e.target.value,
                      }))
                    }
                    placeholder="https://drive.google.com/file/d/..."
                    className="flex-1"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Only if you still want to use Google Drive instead of file upload
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setSelectedJob(null)}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveJob}
                  disabled={saving || uploadingFile}
                  className="gradient-bg text-accent-foreground hover:opacity-90"
                >
                  {uploadingFile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading file...
                    </>
                  ) : saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
