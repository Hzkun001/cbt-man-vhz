import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { configRepo, hydrateRepos } from "@/lib/cbt/repos";
import { ConfigSchema, DEFAULT_OBSERVABILITY_CONFIG, ObservabilityConfigSchema, type ObservabilityConfig, type ObservabilityLevel } from "@/lib/cbt/types";
import { getObservabilityConfigServer, getObservabilityLogsServer, saveObservabilityConfigServer, type ObservabilityLogRow } from "@/lib/server/observability";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Image as ImageIcon, Activity, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AdminPage, AdminPageHeader } from "@/components/cbt/AdminPage";
import { useThemeStore } from "@/lib/cbt/theme-store";
import { CheckCircle2 } from "lucide-react";


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
  const [observability, setObservability] = useState<ObservabilityConfig>(DEFAULT_OBSERVABILITY_CONFIG);
  const [observabilityLoaded, setObservabilityLoaded] = useState(false);
  const [observabilityError, setObservabilityError] = useState<string | null>(null);
  const [logs, setLogs] = useState<ObservabilityLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logSeverity, setLogSeverity] = useState<"all" | ObservabilityLevel>("all");
  const { theme, setTheme, font, setFont } = useThemeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setLogsLoading(true);
    Promise.all([
      getObservabilityConfigServer(),
      getObservabilityLogsServer({ data: { limit: 100 } }),
    ])
      .then(([configResult, logsResult]) => {
        if (!active) return;
        if (configResult.ok) {
          setObservability(configResult.config);
          setObservabilityLoaded(true);
          setObservabilityError(null);
        } else {
          setObservabilityError("Pengaturan observability tidak dapat dimuat.");
        }
        if (logsResult.ok) setLogs(logsResult.logs);
      })
      .catch(() => {
        if (active) setObservabilityError("Pengaturan observability tidak dapat dimuat.");
      })
      .finally(() => {
        if (active) setLogsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function refreshLogs() {
    setLogsLoading(true);
    try {
      const result = await getObservabilityLogsServer({ data: { limit: 100 } });
      if (result.ok) setLogs(result.logs);
      else toast.error("Log observability tidak dapat dimuat.");
    } catch {
      toast.error("Log observability tidak dapat dimuat.");
    } finally {
      setLogsLoading(false);
    }
  }

  async function save() {
    const parsed = ConfigSchema.safeParse(cfg);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Konfigurasi tidak valid");
      return;
    }
    const observabilityParsed = ObservabilityConfigSchema.safeParse(observability);
    if (!observabilityParsed.success) {
      toast.error(observabilityParsed.error.issues[0]?.message ?? "Pengaturan observability tidak valid");
      return;
    }
    configRepo.set(parsed.data);
    const [configResult, observabilityResult] = await Promise.all([
      configRepo.flush(),
      observabilityLoaded
        ? saveObservabilityConfigServer({ data: observabilityParsed.data })
        : Promise.resolve({ ok: true as const }),
    ]);
    if (!configResult.ok) {
      toast.error(configResult.error ?? "Pengaturan aplikasi gagal disimpan.");
    } else if (!observabilityResult.ok) {
      toast.error(observabilityResult.error ?? "Pengaturan observability gagal disimpan.");
    } else {
      toast.success("Pengaturan disimpan.");
    }
  }

  const visibleLogs = logs.filter((log) => logSeverity === "all" || log.severity === logSeverity);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (PNG, JPG, dll).");
      return;
    }

    try {
      const base64Str = await resizeImage(file, 200);
      setCfg({ ...cfg, appLogo: base64Str });
      toast.success("Logo berhasil ditambahkan.");
    } catch (err) {
      toast.error("Gagal memproses gambar logo.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <AdminPage className="">
      <AdminPageHeader
        title="Pengaturan Aplikasi"
        description="Konfigurasi institusi, keamanan, browser ujian, dan branding CBT."
        action={
          <Button onClick={save} className="h-10 px-8 shadow-sm">
            Simpan Semua
          </Button>
        }
      />

      {/* Section 1: Identitas Aplikasi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-12">
        <div className="space-y-2 lg:col-span-1">
          <h2 id="identitas-heading" className="text-lg font-semibold text-slate-900 dark:text-white">Identitas Aplikasi</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Informasi ini akan ditampilkan di halaman login dan pada panel atas dasbor aplikasi.
          </p>
        </div>
        <div role="region" aria-labelledby="identitas-heading" className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">

            <div className="space-y-2.5">
              <Label className="text-slate-700 dark:text-slate-300 font-semibold">Nama Aplikasi</Label>
              <Input
                value={cfg.appName}
                onChange={(e) => setCfg({ ...cfg, appName: e.target.value })}
                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="space-y-2.5">
              <Label className="text-slate-700 dark:text-slate-300 font-semibold">Logo Aplikasi</Label>
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
                  {cfg.appLogo ? (
                    <img src={cfg.appLogo} alt="Logo" className="h-12 w-12 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} onLoad={(e) => (e.currentTarget.style.display = 'block')} />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex gap-2">
                    <Input
                      value={cfg.appLogo ?? ""}
                      placeholder="https://... atau klik Upload"
                      onChange={(e) => setCfg({ ...cfg, appLogo: e.target.value })}
                      className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-xs"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      aria-hidden="true"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                    />
                    <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} className="shrink-0 shadow-sm border-slate-200 dark:border-slate-700">
                      <Upload className="h-4 w-4 mr-2" /> Upload
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">Mendukung format PNG/JPG. Gambar akan diubah ukurannya secara otomatis (max 200px).</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <Label className="text-slate-700 dark:text-slate-300 font-semibold">Deskripsi Singkat</Label>
              <Textarea
                value={cfg.appDeskripsi}
                onChange={(e) => setCfg({ ...cfg, appDeskripsi: e.target.value })}
                className="min-h-[80px] bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="space-y-2.5">
              <Label className="text-slate-700 dark:text-slate-300 font-semibold">Pengumuman Halaman Login</Label>
              <Textarea
                value={cfg.pesanLogin}
                onChange={(e) => setCfg({ ...cfg, pesanLogin: e.target.value })}
                className="min-h-[80px] bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                placeholder="Ketik pengumuman atau instruksi untuk peserta..."
              />
            </div>

          </div>
        </div>
      </div>

      <div className="h-px w-full bg-slate-200 dark:bg-slate-800/60 my-10" />

      {/* Section 2: Kebijakan Ujian */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-12">
        <div className="space-y-2 lg:col-span-1">
          <h2 id="kebijakan-heading" className="text-lg font-semibold text-slate-900 dark:text-white">Kebijakan Ujian</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Konfigurasi keamanan dan pembatasan akses perangkat untuk melindungi integritas pelaksanaan ujian.
          </p>
        </div>
        <div role="region" aria-labelledby="kebijakan-heading" className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">

          <ToggleRow
            label="Kunci akses dari perangkat Mobile"
            desc="Mencegah peserta mengakses aplikasi ujian melalui smartphone atau tablet."
            checked={cfg.mobileLock}
            onChange={(v) => setCfg({ ...cfg, mobileLock: v })}
            disabled
            badge="Belum diberlakukan"
          />
          <ToggleRow
            label="Izinkan Multi-Device"
            desc="Mengizinkan satu akun mahasiswa login dari lebih dari satu perangkat pada waktu yang bersamaan."
            checked={cfg.multiDevice}
            onChange={(v) => setCfg({ ...cfg, multiDevice: v })}
            disabled
            badge="Belum diberlakukan"
          />
        </div>
      </div>

      <div className="h-px w-full bg-slate-200 dark:bg-slate-800/60 my-10" />

      {/* Section 3: Observability */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-12">
        <div className="space-y-2 lg:col-span-1">
          <h2 id="observability-heading" className="text-lg font-semibold text-slate-900 dark:text-white">Observability Backend</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Pantau request server dengan request ID, status HTTP, durasi, dan severity tanpa menyimpan isi request.
          </p>
        </div>
        <div role="region" aria-labelledby="observability-heading" className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {observabilityError ? <p role="alert" className="border-b border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{observabilityError}</p> : null}
          <div className="p-6 space-y-6">
            <ToggleRow
              label="Aktifkan observability"
              desc="Merekam metadata request yang sudah disanitasi ke buffer operasional server."
              checked={observability.enabled}
              onChange={(enabled) => setObservability((current) => ({ ...current, enabled }))}
              disabled={!observabilityLoaded}
            />
            <ToggleRow
              label="Tangkap request HTTP"
              desc="Mencatat method, path tersanitasi, status, durasi, dan X-Request-ID."
              checked={observability.captureRequests}
              onChange={(captureRequests) => setObservability((current) => ({ ...current, captureRequests }))}
              disabled={!observabilityLoaded}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 dark:border-slate-800 pt-6">
              <div className="space-y-2">
                <Label htmlFor="observability-level">Minimum severity</Label>
                <Select
                  value={observability.minLevel}
                  onValueChange={(minLevel) => setObservability((current) => ({ ...current, minLevel: minLevel as ObservabilityLevel }))}
                  disabled={!observabilityLoaded}
                >
                  <SelectTrigger id="observability-level"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="observability-sampling">Sampling (%)</Label>
                <Input
                  id="observability-sampling"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={Math.round(observability.sampleRate * 100)}
                  disabled={!observabilityLoaded}
                  onChange={(event) => setObservability((current) => ({ ...current, sampleRate: Math.min(100, Math.max(0, Number(event.target.value) || 0)) / 100 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observability-retention">Retention (hari)</Label>
                <Input
                  id="observability-retention"
                  type="number"
                  min="1"
                  max="365"
                  value={observability.retentionDays}
                  disabled={!observabilityLoaded}
                  onChange={(event) => setObservability((current) => ({ ...current, retentionDays: Math.min(365, Math.max(1, Number(event.target.value) || 1)) }))}
                />
              </div>
            </div>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><Activity className="h-4 w-4" /> Log request terbaru</h3>
                <p className="mt-1 text-xs text-slate-500">Buffer dibatasi 200 log per proses dan hanya dapat dibaca Super Admin.</p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={logSeverity} onValueChange={(value) => setLogSeverity(value as "all" | ObservabilityLevel)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua level</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={refreshLogs} disabled={logsLoading} aria-label="Muat ulang log">
                  <RefreshCw className={`h-4 w-4 ${logsLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Durasi</TableHead>
                  <TableHead>Request ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsLoading && logs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">Memuat log...</TableCell></TableRow>
                ) : visibleLogs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">Belum ada log observability.</TableCell></TableRow>
                ) : visibleLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(log.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</TableCell>
                    <TableCell><Badge variant={log.severity === "error" ? "destructive" : "outline"}>{log.severity}</Badge></TableCell>
                    <TableCell className="min-w-56 font-mono text-xs">{log.method} {log.path}</TableCell>
                    <TableCell>{log.statusCode}</TableCell>
                    <TableCell>{log.durationMs} ms</TableCell>
                    <TableCell className="font-mono text-xs" title={log.requestId}>{log.requestId.slice(0, 12)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-slate-200 dark:bg-slate-800/60 my-10" />

      {/* Section 4: Tema & Tampilan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-12">
        <div className="space-y-2 lg:col-span-1">
          <h2 id="tema-heading" className="text-lg font-semibold text-slate-900 dark:text-white">Tema & Tampilan</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Sesuaikan gaya visual dan nuansa aplikasi. Tema dan tipografi ini akan diterapkan secara global untuk Anda.
          </p>
        </div>
        <div role="region" aria-labelledby="tema-heading" className="lg:col-span-2 space-y-8">

          {/* Pilihan Tema Visual */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gaya Tema Visual</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Theme: Modern (Default) */}
              <button
                type="button"
                onClick={() => setTheme("default")}
                aria-pressed={theme === "default"}
                className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${theme === "default" ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-slate-200 dark:border-slate-800 hover:border-primary/50 bg-white dark:bg-slate-900"}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="font-bold text-slate-900 dark:text-white">Modern (Default)</div>
                  {theme === "default" && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </div>
                <div className="h-20 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 shadow-sm flex flex-col gap-2">
                  <div className="w-full h-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-sm" />
                  <div className="w-2/3 h-3 bg-primary/20 rounded" />
                </div>
                <p className="text-xs text-slate-500 mt-4">Bersih, profesional, standar SaaS modern.</p>
              </button>

              {/* Theme: Neumorphism (Soft UI) */}
              <button
                type="button"
                onClick={() => setTheme("neumorphism")}
                aria-pressed={theme === "neumorphism"}
                className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${theme === "neumorphism" ? "border-primary ring-2 ring-primary/20 bg-[#f0f3f8]" : "border-slate-200 dark:border-slate-800 hover:border-primary/50 bg-[#f0f3f8]/60 dark:bg-slate-900"}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Neumorphism (Soft UI)</div>
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Soft Extruded Surfaces</span>
                  </div>
                  {theme === "neumorphism" && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </div>
                <div className="h-20 rounded-xl bg-[#f0f3f8] border border-white/80 p-2.5 flex flex-col gap-2" style={{ boxShadow: "4px 4px 10px rgba(166, 180, 200, 0.6), -4px -4px 10px rgba(255, 255, 255, 0.9)" }}>
                  <div className="w-full h-3.5 bg-[#f0f3f8] rounded-md border border-white/60" style={{ boxShadow: "inset 2px 2px 4px rgba(166, 180, 200, 0.4), inset -2px -2px 4px rgba(255, 255, 255, 0.8)" }} />
                  <div className="w-2/3 h-3.5 bg-primary/20 rounded-md" style={{ boxShadow: "2px 2px 5px rgba(166, 180, 200, 0.4)" }} />
                </div>
                <p className="text-xs text-slate-500 mt-4">Estetika permukaan timbul lembut dengan bayangan ganda (*dual soft drop-shadow*).</p>
              </button>

            </div>
          </div>

          {/* Pilihan Tipografi / Font */}
          <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-800/80">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pilihan Font & Tipografi</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Font: SN Pro */}
              <button
                type="button"
                onClick={() => setFont("sn-pro")}
                aria-pressed={font === "sn-pro"}
                className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${font === "sn-pro" ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-slate-200 dark:border-slate-800 hover:border-primary/50 bg-white dark:bg-slate-900"}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">SN Pro (Supernotes)</div>
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Modern & Readability</span>
                  </div>
                  {font === "sn-pro" && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm" style={{ fontFamily: "'SN Pro', sans-serif" }}>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Aa Bb Cc 123</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Ujian Berbasis Komputer Modern</div>
                </div>
                <p className="text-xs text-slate-500 mt-3">Font friendly berbasis Nunito yang dioptimalkan khusus untuk membaca soal & antarmuka CBT.</p>
              </button>

              {/* Font: System Default */}
              <button
                type="button"
                onClick={() => setFont("system")}
                aria-pressed={font === "system"}
                className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${font === "system" ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-slate-200 dark:border-slate-800 hover:border-primary/50 bg-white dark:bg-slate-900"}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Sistem Default (Standar Lama)</div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Inter / System Sans</span>
                  </div>
                  {font === "system" && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Aa Bb Cc 123</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Ujian Berbasis Komputer Modern</div>
                </div>
                <p className="text-xs text-slate-500 mt-3">Font sans-serif bawaan sistem operasi (Inter, Segoe UI, Roboto, San Francisco).</p>
              </button>

            </div>
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</h3>
          {badge && (
            <span className="rounded-md border border-amber-200/60 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed pr-6">{desc}</p>
      </div>
      <div className="shrink-0 mt-3 sm:mt-0">
        <Switch aria-label={label} checked={checked} onCheckedChange={onChange} disabled={disabled} className="data-[state=checked]:bg-emerald-500" />
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

        // Use webp for better compression, fallback to png
        resolve(canvas.toDataURL("image/webp", 0.8));
      };
      img.onerror = () => reject(new Error("Invalid image"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
