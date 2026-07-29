import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  downloadBackup,
  importBackup,
  resetAllData,
  backupSummary,
  BackupSchema,
  type Backup,
} from "@/lib/cbt/backup";
import { ensureSeed } from "@/lib/cbt/seed";
import { Download, Upload, Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AdminPage, AdminPageHeader } from "@/components/cbt/AdminPage";

export const Route = createFileRoute("/_authenticated/admin/tools")({
  component: ToolsPage,
});

type ValidationIssue = { path: string; message: string; code?: string };

function ToolsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Backup | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationIssue[] | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const [isRestoring, setIsRestoring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      let json: unknown;
      try {
        json = JSON.parse(String(reader.result));
      } catch {
        toast.error("File bukan JSON yang valid");
        return;
      }
      const parsed = BackupSchema.safeParse(json);
      if (!parsed.success) {
        const issues: ValidationIssue[] = parsed.error.issues.map((iss) => ({
          path: iss.path.length ? iss.path.join(".") : "(root)",
          message: iss.message,
          code: iss.code,
        }));
        setValidationErrors(issues);
        toast.error("Struktur backup tidak valid");
        return;
      }
      setPreview(parsed.data);
      setValidationErrors(null);
    };
    reader.readAsText(f);
  }

  async function handleDownloadBackup() {
    setIsDownloading(true);
    try {
      await downloadBackup();
      toast.success("Pencadangan berhasil diunduh.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunduh backup");
    } finally {
      setIsDownloading(false);
    }
  }

  async function doRestore() {
    if (!preview || isRestoring) return;
    setIsRestoring(true);
    try {
      await importBackup(preview);
      toast.success("Restore berhasil! Memuat ulang...");
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memulihkan backup");
      setIsRestoring(false);
    }
  }

  async function doReset() {
    if (confirmText !== "HAPUS") {
      toast.error("Ketik 'HAPUS' untuk konfirmasi");
      return;
    }
    if (isResetting) return;
    setIsResetting(true);
    try {
      await resetAllData();
      await ensureSeed();
      toast.success("Database berhasil dikosongkan! Memuat data awal...");
      setConfirmReset(false);
      setConfirmText("");
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal melakukan reset database");
      setIsResetting(false);
    }
  }

  async function handleSeed() {
    if (isSeeding) return;
    setIsSeeding(true);
    try {
      await ensureSeed();
      toast.success("Seed data berhasil dimuat.");
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat seed data");
      setIsSeeding(false);
    }
  }

  return (
    <AdminPage className="neo-ready max-w-5xl mx-auto space-y-12 pb-28">
      <AdminPageHeader
        title="Alat Sistem"
        description="Backup, restore, dan pemeliharaan pangkalan data."
      />

      {/* Section 1: Backup & Restore */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Pencadangan Data
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Ekspor dan impor snapshot database.
          </p>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sleek overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          
          {/* Export Backup Row */}
          <div className="flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Unduh Backup</h3>
              <p className="text-xs text-slate-500">Ekspor seluruh data ke file JSON.</p>
            </div>
            <Button onClick={handleDownloadBackup} disabled={isDownloading} className="font-bold shadow-sm h-10 px-6">
              {isDownloading ? "Mengunduh..." : "Unduh JSON"}
            </Button>
          </div>

          {/* Restore Backup Row */}
          <div className="flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Pulihkan Backup</h3>
              <p className="text-xs text-slate-500">Impor data dari file JSON cadangan.</p>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleFile}
              />
              <Button variant="outline" onClick={() => fileRef.current?.click()} className="font-bold h-10 px-6 border-slate-200 dark:border-slate-800">
                Pilih File...
              </Button>
            </div>
          </div>

        </div>
      </section>

      {/* Section 2: Pemeliharaan Database */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Pemeliharaan Data
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Inisialisasi sampel & reset total.
          </p>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sleek overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          
          {/* Seed Data Row */}
          <div className="flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Inisialisasi Data Demo</h3>
              <p className="text-xs text-slate-500">Muat data sampel awal jika database kosong.</p>
            </div>
            <Button variant="outline" onClick={handleSeed} disabled={isSeeding} className="font-bold h-10 px-6 border-slate-200 dark:border-slate-800">
              {isSeeding ? "Memuat..." : "Muat Seed Data"}
            </Button>
          </div>

          {/* Reset Data Row */}
          <div className="flex items-center justify-between p-6 bg-red-50/20 dark:bg-red-950/10 hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-colors">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-red-600 dark:text-red-400">Reset Total Database</h3>
              <p className="text-xs text-slate-500">Hapus seluruh isi database secara permanen.</p>
            </div>
            <Button variant="destructive" onClick={() => setConfirmReset(true)} className="font-bold h-10 px-6 shadow-sm">
              Reset Database
            </Button>
          </div>

        </div>
      </section>

      {/* Preview import Dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && !isRestoring && setPreview(null)}>
        <DialogContent className="rounded-2xl border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Pratinjau Pemulihan</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Data berikut akan menggantikan seluruh isi database saat ini.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 text-xs space-y-3">
              <div className="text-slate-400 font-mono">
                Tanggal Ekspor: {new Date(preview.exportedAt).toLocaleString("id-ID")}
              </div>
              <div className="grid grid-cols-2 gap-2 font-medium">
                {Object.entries(backupSummary(preview)).map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-1">
                    <span className="text-slate-500 capitalize">{k}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" disabled={isRestoring} onClick={() => setPreview(null)} className="font-bold">
              Batal
            </Button>
            <Button onClick={doRestore} disabled={isRestoring} className="font-bold px-6">
              {isRestoring ? "Memulihkan..." : "Terapkan Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset confirm Dialog */}
      <Dialog
        open={confirmReset}
        onOpenChange={(o) => {
          if (!o && !isResetting) {
            setConfirmReset(false);
            setConfirmText("");
          }
        }}
      >
        <DialogContent className="rounded-2xl border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600">Konfirmasi Reset Database</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Seluruh data pengguna, soal, ujian, dan sesi akan terhapus. Ketik <strong className="text-red-600 font-mono">HAPUS</strong> untuk melanjutkan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="confirm" className="text-xs font-bold uppercase tracking-wider text-slate-500">Kata Kunci Konfirmasi</Label>
            <Input
              id="confirm"
              value={confirmText}
              disabled={isResetting}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="HAPUS"
              className="font-mono font-bold text-center h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              disabled={isResetting}
              onClick={() => {
                setConfirmReset(false);
                setConfirmText("");
              }}
              className="font-bold"
            >
              Batal
            </Button>
            <Button variant="destructive" disabled={isResetting} onClick={doReset} className="font-bold px-6">
              {isResetting ? "Mereset..." : "Hapus Semua Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation errors Dialog */}
      <Dialog open={!!validationErrors} onOpenChange={(o) => !o && setValidationErrors(null)}>
        <DialogContent className="max-w-xl rounded-2xl border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> File Backup Tidak Valid
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ditemukan {validationErrors?.length ?? 0} ketidaksesuaian struktur data:
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 text-xs">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-left font-bold text-slate-500">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Path</th>
                  <th className="p-2">Pesan Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {validationErrors?.map((iss, i) => (
                  <tr key={i} className="align-top">
                    <td className="p-2 text-slate-400 font-mono">{i + 1}</td>
                    <td className="p-2 font-mono font-bold text-slate-700 dark:text-slate-300">{iss.path}</td>
                    <td className="p-2 text-slate-600 dark:text-slate-400">{iss.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button onClick={() => setValidationErrors(null)} className="font-bold">Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
