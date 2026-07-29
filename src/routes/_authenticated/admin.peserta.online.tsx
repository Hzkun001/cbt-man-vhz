import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";
import { getLiveOnlineSesis, mutateSesiServer } from "@/lib/server/sesi/functions";
import { sesiRepo, ujianRepo, hydrateRepos } from "@/lib/cbt/repos";
import { gradeSesi } from "@/lib/cbt/exam";
import type { SesiUjian } from "@/lib/cbt/types";
import {
  Activity,
  AlertTriangle,
  Users,
  Timer,
  CheckCircle2,
  Search,
  MonitorPlay,
  RefreshCw,
  Clock,
  PlusCircle,
  ShieldAlert,
  StopCircle,
  Info,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminPage, AdminPageHeader, AdminPageContent } from "@/components/cbt/AdminPage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/peserta/online")({
  component: OnlinePage,
  loader: async () => {
    try {
      await hydrateRepos();
    } catch {
      // Fallback cache
    }
    const rawSesis = await getLiveOnlineSesis();
    return { rawSesis };
  },
});

function fmtSisa(ms: number): string {
  if (ms <= 0) return "00:00";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type LiveSession = Awaited<ReturnType<typeof getLiveOnlineSesis>>[number];

function OnlinePage() {
  const { rawSesis } = Route.useLoaderData();
  const router = useRouter();

  const tickRef = useRef(0);
  const [, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [examFilter, setExamFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "aman" | "insiden">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dialog States
  const [targetSesi, setTargetSesi] = useState<LiveSession | null>(null);
  const [dialogMode, setDialogMode] = useState<"forceSubmit" | "addTime" | "reset" | "detail" | null>(null);
  const [extraMinutes, setExtraMinutes] = useState<number>(10);
  const [isProcessing, setIsProcessing] = useState(false);

  // Polling every 10 seconds for real-time monitoring
  useEffect(() => {
    const t = window.setInterval(() => {
      tickRef.current += 1;
      setTick(tickRef.current);
      if (tickRef.current % 10 === 0) {
        router.invalidate();
      }
    }, 1000);
    return () => window.clearInterval(t);
  }, [router]);

  // Manual refresh trigger
  async function handleManualRefresh() {
    setIsRefreshing(true);
    await router.invalidate();
    setTimeout(() => setIsRefreshing(false), 500);
    toast.success("Data berhasil diperbarui");
  }

  // Unique exams list for filtering
  const uniqueExams = useMemo(() => {
    const map = new Map<string, string>();
    rawSesis.forEach((s) => {
      if (s.ujianId && s.ujian?.nama) {
        map.set(s.ujianId, s.ujian.nama);
      }
    });
    return Array.from(map.entries()).map(([id, nama]) => ({ id, nama }));
  }, [rawSesis]);

  // Processed and filtered live sessions
  const { sesis, totalPelanggaran, avgProgress, criticalTimeCount } = useMemo(() => {
    let violations = 0;
    let totalPct = 0;
    let criticalCount = 0;

    const now = Date.now();

    const enriched = rawSesis.map((s: LiveSession) => {
      const progress = s.totalSoal > 0 ? (s.dijawab / s.totalSoal) * 100 : 0;
      violations += s.pelanggaran;
      totalPct += progress;

      const sisaMs = s.endsAt ? Math.max(0, s.endsAt - now) : 0;
      if (sisaMs > 0 && sisaMs < 300000) {
        criticalCount++;
      }

      return {
        s,
        u: s.user,
        ex: s.ujian,
        dijawab: s.dijawab,
        totalSoal: s.totalSoal,
        progress,
        sisaMs,
      };
    });

    const filtered = enriched.filter(({ s, u, ex }) => {
      const matchesSearch =
        (u?.namaLengkap || "").toLowerCase().includes(search.toLowerCase()) ||
        (u?.username || "").toLowerCase().includes(search.toLowerCase()) ||
        (ex?.nama || "").toLowerCase().includes(search.toLowerCase());

      const matchesExam = examFilter === "all" || s.ujianId === examFilter;

      let matchesStatus = true;
      if (statusFilter === "aman") matchesStatus = s.pelanggaran === 0;
      if (statusFilter === "insiden") matchesStatus = s.pelanggaran > 0;

      return matchesSearch && matchesExam && matchesStatus;
    });

    return {
      sesis: filtered,
      totalPelanggaran: violations,
      avgProgress: rawSesis.length > 0 ? totalPct / rawSesis.length : 0,
      criticalTimeCount: criticalCount,
    };
  }, [search, examFilter, statusFilter, rawSesis]);

  // --- ACTIONS --- //

  // Helper to resolve or construct full SesiUjian object
  function getFullSesiObject(liveSesi: LiveSession): SesiUjian {
    const existing = sesiRepo.byId(liveSesi.id);
    if (existing) return existing;

    return {
      id: liveSesi.id,
      ujianId: liveSesi.ujianId,
      pesertaId: liveSesi.pesertaId,
      status: liveSesi.status as SesiUjian["status"],
      mulaiAt: liveSesi.mulaiAt,
      endsAt: liveSesi.endsAt,
      soalIds: [],
      jawabanOrder: {},
      jawaban: [],
      pelanggaran: liveSesi.pelanggaran,
      createdAt: liveSesi.mulaiAt || Date.now(),
    };
  }

  // 1. Force Submit Action
  async function handleForceSubmit() {
    if (!targetSesi) return;
    setIsProcessing(true);
    try {
      const fullSesi = getFullSesiObject(targetSesi);
      const ujian = ujianRepo.byId(targetSesi.ujianId);

      let finalSesi: SesiUjian;
      if (ujian) {
        finalSesi = gradeSesi(fullSesi, ujian);
      } else {
        finalSesi = {
          ...fullSesi,
          status: "selesai",
          selesaiAt: Date.now(),
        };
      }

      const res = await mutateSesiServer({
        data: { action: "upsert", payload: finalSesi },
      });

      if (!res.ok) {
        toast.error(res.error || "Gagal menghentikan ujian di server");
        return;
      }

      sesiRepo.upsert(finalSesi);
      await sesiRepo.flush();

      toast.success(`Ujian untuk ${targetSesi.user?.namaLengkap ?? "Peserta"} berhasil dihentikan & dikumpulkan.`);
      setDialogMode(null);
      setTargetSesi(null);
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan saat menghentikan ujian");
    } finally {
      setIsProcessing(false);
    }
  }

  // 2. Add Extra Time Action
  async function handleAddTime() {
    if (!targetSesi) return;
    setIsProcessing(true);
    try {
      const fullSesi = getFullSesiObject(targetSesi);
      const currentEnds = fullSesi.endsAt || Date.now();
      const newEndsAt = currentEnds + extraMinutes * 60_000;

      const updatedSesi: SesiUjian = {
        ...fullSesi,
        endsAt: newEndsAt,
      };

      const res = await mutateSesiServer({
        data: { action: "upsert", payload: updatedSesi },
      });

      if (!res.ok) {
        toast.error(res.error || "Gagal memperpanjang waktu di server");
        return;
      }

      sesiRepo.upsert(updatedSesi);
      await sesiRepo.flush();

      toast.success(`Waktu berhasil ditambah +${extraMinutes} menit.`);
      setDialogMode(null);
      setTargetSesi(null);
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah waktu");
    } finally {
      setIsProcessing(false);
    }
  }

  // 3. Reset Violations / Session State Action
  async function handleResetSession() {
    if (!targetSesi) return;
    setIsProcessing(true);
    try {
      const fullSesi = getFullSesiObject(targetSesi);
      const updatedSesi: SesiUjian = {
        ...fullSesi,
        pelanggaran: 0,
      };

      const res = await mutateSesiServer({
        data: { action: "upsert", payload: updatedSesi },
      });

      if (!res.ok) {
        toast.error(res.error || "Gagal mereset insiden di server");
        return;
      }

      sesiRepo.upsert(updatedSesi);
      await sesiRepo.flush();

      toast.success(`Insiden pelanggaran untuk ${targetSesi.user?.namaLengkap ?? "peserta"} berhasil dibersihkan.`);
      setDialogMode(null);
      setTargetSesi(null);
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mereset sesi");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <AdminPage className="neo-ready">
      {/* Header with High-Visibility Live Stats */}
      <AdminPageHeader
        title="Pantau Ujian Live"
        description="Monitoring aktivitas, durasi real-time, dan kontrol interaktif peserta ujian online."
        action={
          <div className="flex items-center gap-4 sm:gap-6 text-sm">
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1.5 rounded-full">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Live Sync (10s)</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="h-9 px-3 gap-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Peserta Aktif
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {rawSesis.length}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Insiden
            </div>
            <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-0.5">
              {totalPelanggaran}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Timer className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sisa &lt; 5 Menit
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {criticalTimeCount}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Rata-rata Progress
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {Math.round(avgProgress)}%
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Control Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Cari nama peserta atau username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          {/* Exam Filter */}
          {uniqueExams.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 hidden md:inline">Paket:</span>
              <select
                value={examFilter}
                onChange={(e) => setExamFilter(e.target.value)}
                className="h-10 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-200"
              >
                <option value="all">Semua Paket Ujian</option>
                {uniqueExams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.nama}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === "all"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Semua ({rawSesis.length})
            </button>
            <button
              onClick={() => setStatusFilter("insiden")}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                statusFilter === "insiden"
                  ? "bg-red-500 text-white shadow-sm"
                  : "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Insiden ({totalPelanggaran})
            </button>
          </div>
        </div>
      </div>

      {/* Main List Section */}
      <AdminPageContent className="p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {sesis.map(({ s, u, ex, dijawab, totalSoal, progress, sisaMs }) => {
            const isCritical = sisaMs > 0 && sisaMs < 300000;

            return (
              <div
                key={s.id}
                className="group p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all duration-200 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
              >
                {/* 1. User & Exam Details */}
                <div className="flex items-start gap-4 min-w-0 lg:w-1/3">
                  <div className="flex h-11 w-11 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300">
                    {(u?.namaLengkap || "P")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-primary transition-colors">
                        {u?.namaLengkap ?? "Pengguna"}
                      </h3>
                      {u?.username && (
                        <span className="text-xs text-slate-400 font-mono">({u.username})</span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate flex items-center gap-1.5">
                      <MonitorPlay className="h-3.5 w-3.5 shrink-0" />
                      <span>{ex?.nama ?? "Ujian Tanpa Nama"}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Progress Bar */}
                <div className="flex-1 w-full max-w-md">
                  <div className="flex justify-between items-center text-xs text-slate-500 mb-1.5">
                    <span className="font-medium text-slate-600 dark:text-slate-400">
                      Terjawab: <strong className="text-slate-900 dark:text-white">{dijawab}</strong> dari {totalSoal} Soal
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        progress === 100
                          ? "bg-emerald-500"
                          : progress > 50
                          ? "bg-blue-500"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* 3. Time Remaining & Status Badge */}
                <div className="flex items-center gap-6 shrink-0 justify-between lg:justify-end">
                  <div className="text-left lg:text-right">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                      Sisa Waktu
                    </div>
                    <div
                      className={`font-mono text-base font-extrabold tabular-nums flex items-center gap-1.5 ${
                        isCritical
                          ? "text-red-600 animate-pulse bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-800"
                          : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <Clock className="h-4 w-4 text-slate-400 inline" />
                      {fmtSisa(sisaMs)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                      Status Inisiasi
                    </div>
                    {s.pelanggaran > 0 ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-xs font-bold text-red-600 dark:text-red-400">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        {s.pelanggaran} Insiden
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Aman
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Interactive Proctor Actions (Tombol Pengawas) */}
                <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800/80 justify-end">
                  {/* Extra Time Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTargetSesi(s);
                      setDialogMode("addTime");
                    }}
                    title="Tambah Waktu Ujian"
                    className="h-9 px-2.5 gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-blue-500" />
                    <span>+Waktu</span>
                  </Button>

                  {/* Reset Incident / Session */}
                  {s.pelanggaran > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTargetSesi(s);
                        setDialogMode("reset");
                      }}
                      title="Bersihkan Insiden"
                      className="h-9 px-2.5 gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reset</span>
                    </Button>
                  )}

                  {/* Force Submit Button */}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setTargetSesi(s);
                      setDialogMode("forceSubmit");
                    }}
                    title="Paksa Kumpulkan Ujian"
                    className="h-9 px-3 gap-1.5 text-xs font-bold shadow-sm"
                  >
                    <StopCircle className="h-3.5 w-3.5" />
                    <span>Hentikan</span>
                  </Button>

                  {/* Detail Info Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setTargetSesi(s);
                      setDialogMode("detail");
                    }}
                    title="Lihat Rincian Sesi"
                    className="h-9 w-9 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {sesis.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                <MonitorPlay className="h-8 w-8 stroke-[1.5]" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tidak Ada Peserta Aktif
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">
                Belum ada mahasiswa yang sedang mengerjakan ujian secara online saat ini, atau tidak ada data yang cocok dengan filter pencarian.
              </p>
              {(search || examFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearch("");
                    setExamFilter("all");
                    setStatusFilter("all");
                  }}
                  className="text-xs font-bold"
                >
                  Bersihkan Filter
                </Button>
              )}
            </div>
          )}
        </div>
      </AdminPageContent>

      {/* --- DIALOG 1: FORCE SUBMIT CONFIRMATION --- */}
      <Dialog
        open={dialogMode === "forceSubmit"}
        onOpenChange={(o) => {
          if (!o && !isProcessing) {
            setDialogMode(null);
            setTargetSesi(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2 text-lg">
              <ShieldAlert className="h-5 w-5" /> Hentikan Ujian Peserta?
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300 text-sm">
              Tindakan ini akan menghentikan pengerjaan ujian untuk{" "}
              <strong>{targetSesi?.user?.namaLengkap ?? "Peserta"}</strong> secara langsung. Jawaban yang telah terisi akan otomatis dinilai dan diset ke status <strong>Selesai</strong>.
            </DialogDescription>
          </DialogHeader>

          {targetSesi && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Ujian:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {targetSesi.ujian?.nama}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Soal Terjawab:</span>
                <span className="font-bold text-blue-600">
                  {targetSesi.dijawab} / {targetSesi.totalSoal} Soal
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jumlah Insiden:</span>
                <span className="font-bold text-red-600">
                  {targetSesi.pelanggaran} kali
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={isProcessing}
              onClick={() => {
                setDialogMode(null);
                setTargetSesi(null);
              }}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={isProcessing}
              onClick={handleForceSubmit}
              className="font-bold"
            >
              {isProcessing ? "Memproses..." : "Ya, Hentikan Ujian"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DIALOG 2: ADD EXTRA TIME --- */}
      <Dialog
        open={dialogMode === "addTime"}
        onOpenChange={(o) => {
          if (!o && !isProcessing) {
            setDialogMode(null);
            setTargetSesi(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <PlusCircle className="h-5 w-5 text-blue-500" /> Tambah Waktu Ujian
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300 text-sm">
              Berikan kompensasi perpanjangan durasi waktu pengerjaan ujian untuk{" "}
              <strong>{targetSesi?.user?.namaLengkap ?? "Peserta"}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pilih Durasi Tambahan:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 30].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setExtraMinutes(m)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      extraMinutes === m
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300"
                    }`}
                  >
                    +{m} Mnt
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Atau Masukkan Menit Kustom:
              </label>
              <Input
                type="number"
                min={1}
                max={120}
                value={extraMinutes}
                onChange={(e) => setExtraMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={isProcessing}
              onClick={() => {
                setDialogMode(null);
                setTargetSesi(null);
              }}
            >
              Batal
            </Button>
            <Button
              disabled={isProcessing}
              onClick={handleAddTime}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {isProcessing ? "Menyimpan..." : `Tambahkan +${extraMinutes} Menit`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DIALOG 3: RESET INCIDENTS --- */}
      <Dialog
        open={dialogMode === "reset"}
        onOpenChange={(o) => {
          if (!o && !isProcessing) {
            setDialogMode(null);
            setTargetSesi(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-amber-600">
              <RotateCcw className="h-5 w-5" /> Clean Insiden Pelanggaran?
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300 text-sm">
              Tindakan ini akan mengosongkan statistik kecurangan/pelanggaran untuk{" "}
              <strong>{targetSesi?.user?.namaLengkap}</strong> kembali menjadi <strong>0 Insiden (Aman)</strong>.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={isProcessing}
              onClick={() => {
                setDialogMode(null);
                setTargetSesi(null);
              }}
            >
              Batal
            </Button>
            <Button
              disabled={isProcessing}
              onClick={handleResetSession}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {isProcessing ? "Memproses..." : "Bersihkan Insiden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DIALOG 4: SESSION DETAIL --- */}
      <Dialog
        open={dialogMode === "detail"}
        onOpenChange={(o) => {
          if (!o) {
            setDialogMode(null);
            setTargetSesi(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5 text-blue-500" /> Rincian Sesi Peserta Live
            </DialogTitle>
          </DialogHeader>

          {targetSesi && (
            <div className="space-y-4 py-2 text-sm">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Nama Peserta</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {targetSesi.user?.namaLengkap}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Username / NPM</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {targetSesi.user?.username}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Paket Ujian</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {targetSesi.ujian?.nama}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Waktu Mulai</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {targetSesi.mulaiAt
                      ? new Date(targetSesi.mulaiAt).toLocaleTimeString("id-ID")
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Batas Selesai</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {targetSesi.endsAt
                      ? new Date(targetSesi.endsAt).toLocaleTimeString("id-ID")
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Progres Pengerjaan</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {targetSesi.dijawab} / {targetSesi.totalSoal} Soal (
                    {Math.round((targetSesi.dijawab / (targetSesi.totalSoal || 1)) * 100)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Insiden Terdeteksi</span>
                  <span
                    className={`font-bold ${
                      targetSesi.pelanggaran > 0 ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {targetSesi.pelanggaran} Kali
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => {
                setDialogMode(null);
                setTargetSesi(null);
              }}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
