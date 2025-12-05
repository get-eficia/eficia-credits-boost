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
  Loader2,
  Save,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

interface JobWithUser extends EnrichJob {
  userEmail?: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [jobs, setJobs] = useState<JobWithUser[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobWithUser | null>(null);
  const [editedJob, setEditedJob] = useState<Partial<EnrichJob>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

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
      total_rows: job.total_rows,
      numbers_found: job.numbers_found,
      credited_numbers: job.credited_numbers,
      admin_note: job.admin_note,
      enriched_file_path: job.enriched_file_path,
    });
  };

  const handleSaveJob = async () => {
    if (!selectedJob) return;

    setSaving(true);

    try {
      const updates: any = {
        status: editedJob.status,
        total_rows: editedJob.total_rows,
        numbers_found: editedJob.numbers_found,
        credited_numbers: editedJob.credited_numbers,
        admin_note: editedJob.admin_note,
        enriched_file_path: editedJob.enriched_file_path,
      };

      // If marking as completed and wasn't completed before
      if (
        editedJob.status === "completed" &&
        selectedJob.status !== "completed"
      ) {
        updates.completed_at = new Date().toISOString();

        // Deduct credits from user's account and create transaction
        if (editedJob.credited_numbers && editedJob.credited_numbers > 0) {
          // Get user's credit account
          const { data: creditAccount } = await supabase
            .from("credit_accounts")
            .select("id, balance")
            .eq("user_id", selectedJob.user_id)
            .maybeSingle();

          if (creditAccount) {
            // Update balance
            const newBalance =
              (creditAccount.balance || 0) - editedJob.credited_numbers;
            await supabase
              .from("credit_accounts")
              .update({ balance: newBalance })
              .eq("id", creditAccount.id);

            // Create credit transaction
            await supabase.from("credit_transactions").insert({
              credit_account_id: creditAccount.id,
              amount: -editedJob.credited_numbers,
              type: "enrich_deduction",
              description: `Enrichment job: ${selectedJob.original_filename}`,
              related_job_id: selectedJob.id,
            });

            toast({
              title: "Credits Deducted",
              description: `${editedJob.credited_numbers} credits deducted from user's account.`,
            });
          }
        }
      }

      // Update the job
      const { error } = await supabase
        .from("enrich_jobs")
        .update(updates)
        .eq("id", selectedJob.id);

      if (error) throw error;

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedJob) return;

    setUploadingFile(true);

    try {
      const filePath = `enriched/${selectedJob.id}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("enrich-uploads")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      setEditedJob((prev) => ({
        ...prev,
        enriched_file_path: filePath,
      }));

      toast({
        title: "File attached",
        description: "Enriched file has been uploaded and attached to the job.",
      });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Stats
  const stats = {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === "uploaded").length,
    processing: jobs.filter((j) => j.status === "processing").length,
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
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="font-display text-2xl font-bold">
                  {stats.pending}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Loader2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Processing</p>
                <p className="font-display text-2xl font-bold">
                  {stats.processing}
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
                      Credits
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
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                          <span className="max-w-[200px] truncate text-sm font-medium">
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
                      <SelectItem value="uploaded">Uploaded</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="totalRows">Total Rows</Label>
                  <Input
                    id="totalRows"
                    type="number"
                    value={editedJob.total_rows || ""}
                    onChange={(e) =>
                      setEditedJob((prev) => ({
                        ...prev,
                        total_rows: parseInt(e.target.value) || undefined,
                      }))
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="numbersFound">Numbers Found</Label>
                  <Input
                    id="numbersFound"
                    type="number"
                    value={editedJob.numbers_found || ""}
                    onChange={(e) =>
                      setEditedJob((prev) => ({
                        ...prev,
                        numbers_found: parseInt(e.target.value) || undefined,
                      }))
                    }
                    className="mt-1"
                  />
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
                <Label>Enriched File</Label>
                <div className="mt-1 flex items-center gap-2">
                  {editedJob.enriched_file_path ||
                  selectedJob.enriched_file_path ? (
                    <span className="flex-1 truncate rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                      {editedJob.enriched_file_path ||
                        selectedJob.enriched_file_path}
                    </span>
                  ) : (
                    <span className="flex-1 text-sm text-muted-foreground">
                      No file attached
                    </span>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                  >
                    {uploadingFile ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setSelectedJob(null)}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveJob}
                  disabled={saving}
                  className="gradient-bg text-accent-foreground hover:opacity-90"
                >
                  {saving ? (
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
