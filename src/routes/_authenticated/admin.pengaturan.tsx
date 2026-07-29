import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { configRepo, hydrateRepos } from "@/lib/cbt/repos";
import { ConfigSchema } from "@/lib/cbt/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Upload, 
  Image as ImageIcon, 
  Save, 
  ShieldAlert, 
  Paintbrush, 
  Users, 
  Server, 
  CheckCircle2, 
  ExternalLink,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { AdminPage, AdminPageHeader } from "@/components/cbt/AdminPage";
import { useThemeStore } from "@/lib/cbt/theme-store";

export const Route = createFileRoute("/_authenticated/admin/pengaturan")({
  loader: async () => {
    try {
      await hydrateRepos();
    } catch {
      // Fallback ke cache; jangan brick navigasi saat snapshot gagal.
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
      toast.success("Pengaturan berhasil disimpan ke server.");
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
      toast.error("File harus berupa gambar (PNG, JPG, WEBPS, dll).");
      return;
    }

    try {
      const base64Str = await resizeImage(file, 200);
      setCfg({ ...cfg, appLogo: base64Str });
      toast.success("Logo berhasil diproses dan ditambahkan.");
    } catch {
      toast.error("Gagal memproses gambar logo.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <AdminPage className="neo-ready max-w-6xl mx-auto space-y-10 pb-24">
      <AdminPageHeader
        title="Pengaturan Aplikasi"
        description="Kelola konfigurasi institusi, branding CBT, hak akses role, serta preferensi visual antarmuka."
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

      {/* Section 1: Identitas & Branding Aplikasi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-12 pt-2">
        <div className="space-y-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
            <ImageIcon className="h-4 w-4" /> Branding & Identitas
          </div>
          <h2 id="identitas-heading" className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Identitas Institusi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Informasi ini akan muncul di halaman login peserta, header dasbor, dan cetakan laporan hasil ujian.
          </p>
        </div>

        <div role="region" aria-labelledby="identitas-heading" className="lg:col-span-2 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sleek p-6 sm:p-8 space-y-6">
          
          <div className="space-y-2">
            <Label className="text-slate-900 dark:text-slate-100 font-bold text-xs uppercase tracking-wider">
              Nama Aplikasi / Institusi
            </Label>
            <Input
              value={cfg.appName}
              onChange={(e) => setCfg({ ...cfg, appName: e.target.value })}
              className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium h-11"
              placeholder="Contoh: CBT UNIKOM, SIM-UJIAN MAN"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-900 dark:text-slate-100 font-bold text-xs uppercase tracking-wider">
              Logo Aplikasi
            </Label>
            <div className="flex flex-col sm:flex-row gap-6 items-start bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden shadow-inner">
                {cfg.appLogo ? (
                  <img src={cfg.appLogo} alt="Logo App" className="h-14 w-14 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} onLoad={(e) => (e.currentTarget.style.display = 'block')} />
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                )}
              </div>
              <div className="flex-1 space-y-3 w-full">
                <div className="flex gap-2">
                  <Input
                    value={cfg.appLogo ?? ""}
                    placeholder="https://... atau klik tombol Upload"
                    onChange={(e) => setCfg({ ...cfg, appLogo: e.target.value })}
                    className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-xs h-10"
                  />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden"
                    aria-hidden="true"
                    ref={fileInputRef} 
                    onChange={handleLogoUpload}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="shrink-0 font-bold h-10 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Upload className="h-4 w-4 mr-2 text-primary" /> Upload
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500">Dukungan format PNG/JPG/WebP. Gambar akan dioptimasi otomatis (maksimum 200px).</p>
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
              className="min-h-[80px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium"
              placeholder="Deskripsi singkat mengenai platform ujian..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-900 dark:text-slate-100 font-bold text-xs uppercase tracking-wider">
              Pengumuman di Halaman Login
            </Label>
            <Textarea
              value={cfg.pesanLogin}
              onChange={(e) => setCfg({ ...cfg, pesanLogin: e.target.value })}
              className="min-h-[90px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium"
              placeholder="Tuliskan pesan sambutan atau instruksi penting bagi peserta..."
            />
          </div>

        </div>
      </div>

      <div className="h-px w-full bg-slate-200 dark:bg-slate-800/80 my-8" />

      {/* Section 2: Kebijakan Keamanan Ujian */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-12">
        <div className="space-y-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-amber-600 font-bold text-sm uppercase tracking-wider">
            <ShieldAlert className="h-4 w-4" /> Keamanan & Akses
          </div>
          <h2 id="kebijakan-heading" className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Kebijakan Perangkat
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Pengaturan batasan akses sesi untuk mencegah kecurangan dan menjaga integritas ujian.
          </p>
        </div>

        <div role="region" aria-labelledby="kebijakan-heading" className="lg:col-span-2 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sleek overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          <ToggleRow
            label="Kunci Akses dari Perangkat Mobile"
            desc="Mencegah peserta mengerjakan ujian melalui smartphone atau tablet."
            checked={cfg.mobileLock}
            onChange={(v) => setCfg({ ...cfg, mobileLock: v })}
            disabled
            badge="Versi V2"
          />
          <ToggleRow
            label="Izinkan Multi-Device Simultant"
            desc="Mengizinkan satu akun peserta login aktif dari beberapa perangkat secara bersamaan."
            checked={cfg.multiDevice}
            onChange={(v) => setCfg({ ...cfg, multiDevice: v })}
            disabled
            badge="Versi V2"
          />
        </div>
      </div>

      <div className="h-px w-full bg-slate-200 dark:bg-slate-800/80 my-8" />

      {/* Section 3: Hak Akses Role (RBAC Shortcut) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-12">
        <div className="space-y-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
            <Users className="h-4 w-4" /> Matriks Otorisasi
          </div>
          <h2 id="rbac-heading" className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Hak Akses Role (RBAC)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Atur wewenang dan batasan menu khusus untuk Admin Jurusan dan Evaluator Essay.
          </p>
        </div>

        <div role="region" aria-labelledby="rbac-heading" className="lg:col-span-2 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sleek p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              Kelola Hak Akses Role & Topik
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Pilih menu spesifik (Bank Soal, Hasil, Evaluasi) dan batasan topik mata kuliah yang boleh diakses operator.
            </p>
          </div>
          <Button asChild className="shrink-0 font-bold px-6 h-11 shadow-sm">
            <Link to="/admin/users/roles" className="flex items-center gap-2">
              Atur Hak Akses <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="h-px w-full bg-slate-200 dark:bg-slate-800/80 my-8" />

      {/* Section 4: Tema & Tampilan Antarmuka */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-12">
        <div className="space-y-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-purple-600 font-bold text-sm uppercase tracking-wider">
            <Paintbrush className="h-4 w-4" /> Desain System
          </div>
          <h2 id="tema-heading" className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Tema Visual
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Pilih preferensi estetika antarmuka aplikasi sesuai dengan selera sistem.
          </p>
        </div>

        <div role="region" aria-labelledby="tema-heading" className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Theme: Modern */}
            <button 
              onClick={() => setTheme("default")}
              aria-pressed={theme === "default"}
              className={`text-left p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                theme === "default" 
                  ? "border-primary ring-4 ring-primary/20 bg-primary/5 shadow-md" 
                  : "border-slate-200 dark:border-slate-800 hover:border-primary/40 bg-white dark:bg-slate-950"
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="font-bold text-slate-900 dark:text-white text-base">Modern SaaS</div>
                {theme === "default" && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
              </div>
              <div className="h-24 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 shadow-inner flex flex-col gap-2">
                <div className="w-full h-4 bg-white dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm" />
                <div className="w-2/3 h-4 bg-primary/20 rounded-md" />
              </div>
              <p className="text-xs text-slate-500 mt-4 font-medium">Desain bersih, halus, minimalis khas aplikasi enterprise modern.</p>
            </button>

            {/* Theme: Neobrutalism */}
            <button 
              onClick={() => setTheme("neobrutalism")}
              aria-pressed={theme === "neobrutalism"}
              className={`text-left p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                theme === "neobrutalism" 
                  ? "border-amber-500 ring-4 ring-amber-500/20 bg-amber-500/10 shadow-md" 
                  : "border-slate-200 dark:border-slate-800 hover:border-amber-500/50 bg-white dark:bg-slate-950"
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="font-black uppercase tracking-wider text-slate-900 dark:text-white text-base">Neobrutalism</div>
                {theme === "neobrutalism" && <CheckCircle2 className="h-5 w-5 text-amber-500 shrink-0" />}
              </div>
              <div className="h-24 rounded-xl bg-amber-400 border-2 border-black p-3 shadow-[3px_3px_0_0_rgba(0,0,0,1)] flex flex-col gap-2">
                <div className="w-full h-4 bg-white border-2 border-black" />
                <div className="w-2/3 h-4 bg-black" />
              </div>
              <p className="text-xs text-slate-500 mt-4 font-bold">Warna kontras, garis batas tegas, gaya taktil & ekspresif.</p>
            </button>

          </div>
        </div>
      </div>

      <div className="h-px w-full bg-slate-200 dark:bg-slate-800/80 my-8" />

      {/* Section 5: Informasi Server & Lingkungan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-12">
        <div className="space-y-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-slate-500 font-bold text-sm uppercase tracking-wider">
            <Server className="h-4 w-4" /> Sistem Inframerah
          </div>
          <h2 id="server-heading" className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Informasi Server
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Status runtime sistem dan zona waktu operasional server.
          </p>
        </div>

        <div role="region" aria-labelledby="server-heading" className="lg:col-span-2 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Zona Waktu</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Asia/Jakarta (WIB)</span>
            </div>
            <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Status Database</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Terhubung (Prisma)
              </span>
            </div>
            <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Versi Engine</span>
              <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">v2.4.0-proctoring</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
            <Info className="h-4 w-4 text-slate-400 shrink-0" />
            <span>Jika Anda membutuhkan reset database atau pemulihan berkas, kunjungi modul <Link to="/admin/tools" className="font-bold text-primary hover:underline">Tools & Backup</Link>.</span>
          </div>
        </div>
      </div>

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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-5 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{label}</h3>
          {badge && (
            <span className="rounded-md border border-amber-200/80 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed pr-6">{desc}</p>
      </div>
      <div className="shrink-0 mt-2 sm:mt-0">
        <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} className="data-[state=checked]:bg-emerald-500" />
      </div>
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
