import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { configRepo, hydrateRepos } from "@/lib/cbt/repos";
import { ConfigSchema } from "@/lib/cbt/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Upload, Image as ImageIcon, Save, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AdminPage, AdminPageHeader } from "@/components/cbt/AdminPage";
import { useThemeStore } from "@/lib/cbt/theme-store";

export const Route = createFileRoute("/_authenticated/admin/pengaturan")({
  loader: async () => {
    try {
      await hydrateRepos();
    } catch {
      // Fallback
    }
  },
  component: PengaturanPage,
});

function PengaturanPage() {
  const [cfg, setCfg] = useState(configRepo.get());
  const { theme, setTheme } = useThemeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    setIsSaving(true);
    try {
      const parsed = ConfigSchema.safeParse(cfg);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Konfigurasi tidak valid");
        setIsSaving(false);
        return;
      }
      configRepo.set(parsed.data);
      await configRepo.flush();
      toast.success("Pengaturan berhasil disimpan.");
    } catch {
      toast.error("Gagal menyimpan pengaturan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar.");
      return;
    }

    try {
      const base64Str = await resizeImage(file, 200);
      setCfg({ ...cfg, appLogo: base64Str });
      toast.success("Logo berhasil ditambahkan.");
    } catch {
      toast.error("Gagal memproses gambar logo.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <AdminPage className="neo-ready max-w-5xl mx-auto space-y-12 pb-28">
      <AdminPageHeader
        title="Pengaturan"
        description="Konfigurasi sistem, branding institusi, dan hak akses."
        action={
          <Button 
            onClick={save} 
            disabled={isSaving}
            className="h-11 px-8 font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Simpan Pengaturan
              </>
            )}
          </Button>
        }
      />

      {/* Section 1: Identitas Institusi */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Identitas Institusi
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Branding utama aplikasi dan pengumuman.
          </p>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sleek p-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-slate-900 dark:text-slate-100 font-bold text-xs uppercase tracking-wider">
              Nama Aplikasi / Institusi
            </Label>
            <Input
              value={cfg.appName}
              onChange={(e) => setCfg({ ...cfg, appName: e.target.value })}
              className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium h-11"
              placeholder="CBT-MAN"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-900 dark:text-slate-100 font-bold text-xs uppercase tracking-wider">
              Logo Aplikasi
            </Label>
            <div className="flex items-center gap-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden">
                {cfg.appLogo ? (
                  <img src={cfg.appLogo} alt="Logo" className="h-12 w-12 object-contain" />
                ) : (
                  <ImageIcon className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                )}
              </div>
              <div className="flex-1 flex items-center gap-3">
                <Input
                  value={cfg.appLogo ?? ""}
                  placeholder="URL logo atau unggah berkas"
                  onChange={(e) => setCfg({ ...cfg, appLogo: e.target.value })}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-xs h-10"
                />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden"
                  ref={fileInputRef} 
                  onChange={handleLogoUpload}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()} 
                  className="shrink-0 font-bold h-10 border-slate-200 dark:border-slate-700"
                >
                  <Upload className="h-4 w-4 mr-2" /> Upload
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-900 dark:text-slate-100 font-bold text-xs uppercase tracking-wider">
              Deskripsi Singkat
            </Label>
            <Textarea
              value={cfg.appDeskripsi}
              onChange={(e) => setCfg({ ...cfg, appDeskripsi: e.target.value })}
              className="min-h-[70px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-900 dark:text-slate-100 font-bold text-xs uppercase tracking-wider">
              Pengumuman Login
            </Label>
            <Textarea
              value={cfg.pesanLogin}
              onChange={(e) => setCfg({ ...cfg, pesanLogin: e.target.value })}
              className="min-h-[80px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium"
              placeholder="Instruksi untuk peserta di halaman depan..."
            />
          </div>
        </div>
      </section>

      {/* Section 2: Hak Akses Role */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Hak Akses Role
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Matriks wewenang Admin Jurusan & Evaluator.
          </p>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sleek p-8 flex items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              Atur Akses Menu & Topik
            </h3>
            <p className="text-xs text-slate-500">
              Konfigurasi pembatasan menu dan mata kuliah per peran pengguna.
            </p>
          </div>
          <Button asChild className="shrink-0 font-bold px-6 h-11 shadow-sm">
            <Link to="/admin/users/roles" className="flex items-center gap-2">
              Kelola RBAC <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Section 3: Tema Visual */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Tema Visual
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Pilihan antarmuka pengguna.
          </p>
        </div>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Theme: Modern */}
            <button 
              onClick={() => setTheme("default")}
              className={`text-left p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                theme === "default" 
                  ? "border-primary ring-4 ring-primary/10 bg-primary/5 shadow-md" 
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-950"
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-slate-900 dark:text-white text-base">Modern SaaS</span>
                {theme === "default" && <CheckCircle2 className="h-5 w-5 text-primary" />}
              </div>
              <div className="h-20 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 shadow-inner flex flex-col gap-2">
                <div className="w-full h-3.5 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800" />
                <div className="w-2/3 h-3.5 bg-primary/20 rounded" />
              </div>
            </button>

            {/* Theme: Neobrutalism */}
            <button 
              onClick={() => setTheme("neobrutalism")}
              className={`text-left p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                theme === "neobrutalism" 
                  ? "border-amber-500 ring-4 ring-amber-500/10 bg-amber-500/10 shadow-md" 
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-950"
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <span className="font-black uppercase tracking-wider text-slate-900 dark:text-white text-base">Neobrutalism</span>
                {theme === "neobrutalism" && <CheckCircle2 className="h-5 w-5 text-amber-500" />}
              </div>
              <div className="h-20 rounded-xl bg-amber-400 border-2 border-black p-3 shadow-[3px_3px_0_0_rgba(0,0,0,1)] flex flex-col gap-2">
                <div className="w-full h-3.5 bg-white border-2 border-black" />
                <div className="w-2/3 h-3.5 bg-black" />
              </div>
            </button>

          </div>
        </div>
      </section>

      {/* Section 4: Kebijakan Keamanan */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Kebijakan Sesi
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Batasan perangkat & multi-device.
          </p>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sleek overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          <ToggleRow
            label="Kunci Akses Perangkat Mobile"
            desc="Mencegah ujian diakses dari smartphone/tablet."
            checked={cfg.mobileLock}
            onChange={(v) => setCfg({ ...cfg, mobileLock: v })}
            disabled
            badge="Versi V2"
          />
          <ToggleRow
            label="Izinkan Multi-Device"
            desc="Mengizinkan akun login bersamaan di multi perangkat."
            checked={cfg.multiDevice}
            onChange={(v) => setCfg({ ...cfg, multiDevice: v })}
            disabled
            badge="Versi V2"
          />
        </div>
      </section>
    </AdminPage>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
  disabled = false,
  badge,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{label}</h3>
          {badge && (
            <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

async function resizeImage(file: File, maxWidthOrHeight: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          if (width > height) {
            height = Math.round((height * maxWidthOrHeight) / width);
            width = maxWidthOrHeight;
          } else {
            width = Math.round((width * maxWidthOrHeight) / height);
            height = maxWidthOrHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/webp", 0.8));
      };
      img.onerror = () => reject(new Error("Invalid image"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
