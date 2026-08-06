import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/cbt/auth-store";
import {
  usersRepo,
  topikRepo,
  soalRepo,
  ujianRepo,
  sesiRepo,
  configRepo,
} from "@/lib/cbt/repos";
import { canAccessAdminPath } from "./admin";
import {
  Clock,
  Plus,
  ArrowRight,
  AlertCircle,
  Users,
  BookOpen,
  FileText,
  Activity,
  CalendarClock,
  MonitorPlay,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Key,
  Layers,
  Radio,
  ArrowUpRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: CommandCenter,
});

function CommandCenter() {
  const user = useAuthStore((s) => s.user);
  const now = Date.now();
  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

  // Data fetching & calculations
  const pesertaList = usersRepo.all().filter((u) => u.role === "mahasiswa");
  const soalList = soalRepo.all();
  const semuaUjian = ujianRepo.all();
  const cfg = configRepo.get();
  if (!user) return null;
  const canAccess = (path: string) => canAccessAdminPath(user, path, cfg);

  const newPeserta = pesertaList.filter(u => u.createdAt && (now - u.createdAt) < ONE_WEEK).length;
  const newSoal = soalList.filter(s => s.createdAt && (now - s.createdAt) < ONE_WEEK).length;
  const newUjian = semuaUjian.filter(u => u.createdAt && (now - u.createdAt) < ONE_WEEK).length;

  const counts = {
    peserta: pesertaList.length,
    modul: topikRepo.all().length,
    soal: soalList.length,
    ujian: semuaUjian.length,
    sesi: sesiRepo.all().length,
  };

  const activeExams = semuaUjian.filter(
    (u): u is typeof u & { beginAt: number; endAt: number } =>
      typeof u.beginAt === "number" &&
      typeof u.endAt === "number" &&
      now >= u.beginAt &&
      now <= u.endAt,
  );
  const upcoming = semuaUjian
    .filter((u): u is typeof u & { beginAt: number } => typeof u.beginAt === "number" && now < u.beginAt)
    .sort((a, b) => a.beginAt - b.beginAt);
  const upcomingExamCount = upcoming.length;
  const upcomingExams = upcoming.slice(0, 4);
  const finishedExams = semuaUjian.filter((u) => u.endAt && now > u.endAt);

  const pendingTasks = finishedExams.length > 0 && canAccess("/admin/evaluasi")
    ? [{
        id: "eval-reports",
        title: "Ujian Selesai (Membutuhkan Evaluasi & Rekap)",
        desc: `${finishedExams.length} ujian telah selesai dan siap dianalisis nilainya.`,
        count: finishedExams.length,
        route: "/admin/evaluasi" as const,
        icon: <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      }]
    : [];
  const hasQuickActions = ["/admin/ujian", "/admin/modul", "/admin/peserta/kartu"].some(canAccess);

  // Format Helper for Numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}rb`;
    return num.toString();
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500 pb-16">

      {/* 1. TOP OPERATIONAL STATUS BAR (Neo Brutalism) */}
      <section className="relative overflow-hidden bg-[color:var(--neo-bg)] rounded-[2rem] p-8 sm:p-12 text-[color:var(--neo-text)] border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-white text-black border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)]">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeExams.length > 0 ? "bg-emerald-400" : "bg-gray-400"}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 border border-black ${activeExams.length > 0 ? "bg-emerald-500" : "bg-gray-400"}`}></span>
              </span>
              {activeExams.length > 0
                ? `${activeExams.length} Ujian Sedang Berlangsung`
                : "Sistem CBT Siaga Operasional"}
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-[42px] font-black uppercase leading-[1.1] text-[color:var(--neo-text)] tracking-tight">
              Pusat Kendali CBT Administrasi
            </h1>
            <p className="text-sm sm:text-base font-bold text-[color:var(--neo-text)]/80 max-w-xl">
              Selamat datang kembali, <span className="font-black text-[color:var(--neo-text)]">{user.namaLengkap}</span>. Ringkasan performa dan pengawasan ujian kampus tersedia seketika.
            </p>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            {canAccess("/admin/ujian") && (
              <Button size="lg" className="rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-black uppercase tracking-wide border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)] h-14 px-6 flex items-center gap-3 transition-transform hover:-translate-y-1" asChild>
                <Link to="/admin/ujian">
                  <Plus className="h-5 w-5 stroke-[3]" />
                  Buat Ujian Baru
                </Link>
              </Button>
            )}
            {canAccess("/admin/peserta/online") && (
              <Button size="lg" className="rounded-full bg-white hover:bg-gray-50 text-black font-black uppercase tracking-wide border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)] h-14 px-6 flex items-center gap-3 transition-transform hover:-translate-y-1" asChild>
                <Link to="/admin/peserta/online">
                  <Radio className="h-5 w-5 text-emerald-600 stroke-[3]" />
                  Pantau Peserta
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* 2. EXECUTIVE KPI CARDS GRID */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          label="Total Peserta"
          value={formatNumber(counts.peserta)}
          subtitle="Mahasiswa terdaftar"
          icon={<Users className="h-6 w-6 stroke-[3]" />}
          trend={newPeserta > 0 ? `+${newPeserta} baru` : null}
          trendPositive={true}
        />
        <KpiCard
          label="Total Ujian"
          value={formatNumber(counts.ujian)}
          subtitle={`${activeExams.length} Aktif • ${upcomingExamCount} Mendatang`}
          icon={<MonitorPlay className="h-6 w-6 stroke-[3]" />}
          trend={newUjian > 0 ? `+${newUjian} minggu ini` : null}
          trendPositive={true}
        />
        <KpiCard
          label="Bank Soal"
          value={formatNumber(counts.soal)}
          subtitle="Soal siap ujikan"
          icon={<FileText className="h-6 w-6 stroke-[3]" />}
          trend={newSoal > 0 ? `+${newSoal} baru` : null}
          trendPositive={true}

        />
        <KpiCard
          label="Total Sesi Ujian"
          value={formatNumber(counts.sesi)}
          subtitle={`${counts.modul} Modul Mata Kuliah`}
          icon={<Layers className="h-5 w-5 text-purple-500" />}
        />
      </section>

      {/* 3. MAIN DASHBOARD CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">

        {/* LEFT COLUMN: Main Workflows (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Live Surveillance Panel */}
          <div className="bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)] rounded-xl p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 mb-5 border-b-2 border-black">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[2px_2px_0_0_#000]">
                  <Activity className="h-6 w-6 stroke-[3] text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-black uppercase">Pengawasan Ujian Live</h2>
                  <p className="text-sm font-bold text-black/70">Monitoring real-time kestabilan dan peserta ujian yang berlangsung</p>
                </div>
              </div>
              {activeExams.length > 0 && (
                <span className="px-4 py-1.5 text-sm font-black uppercase rounded-none bg-emerald-200 text-black border-[length:var(--neo-border-width)] border-black shadow-[2px_2px_0_0_#000]">
                  {activeExams.length} Berlangsung
                </span>
              )}
            </div>

            {activeExams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center rounded-none bg-[color:var(--neo-bg)]/20 border-[length:var(--neo-border-width)] border-black border-dashed p-6">
                <div className="h-14 w-14 bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[4px_4px_0_0_#000] flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500 stroke-[3]" />
                </div>
                <h3 className="text-lg font-black text-black uppercase tracking-tight mb-2">Tidak Ada Ujian Aktif Saat Ini</h3>
                <p className={`text-sm font-bold text-black/70 max-w-md ${canAccess("/admin/ujian") ? "mb-6" : ""}`}>
                  Sistem dalam kondisi siaga penuh. Anda dapat mengecek ujian mendatang atau menyiapkan bank soal baru.
                </p>
                {canAccess("/admin/ujian") && (
                  <Button size="lg" className="rounded-full bg-white hover:bg-gray-50 text-black font-black uppercase tracking-wide border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)]" asChild>
                    <Link to="/admin/ujian">Lihat Semua Jadwal Ujian</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {activeExams.map((exam) => (
                  <div key={exam.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] hover:-translate-y-1 shadow-[4px_4px_0_0_#000] transition-all group">
                    <div className="flex items-center gap-5 mb-4 sm:mb-0">
                      <div className="h-12 w-12 bg-emerald-100 border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] text-emerald-600 flex items-center justify-center shrink-0">
                        <Radio className="h-6 w-6 animate-pulse stroke-[3]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-black uppercase leading-tight">{exam.nama}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm font-bold text-black/70">
                          <Clock className="h-4 w-4 stroke-[3]" />
                          <span suppressHydrationWarning>Berakhir pukul {new Date(exam.endAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB</span>
                        </div>
                      </div>
                    </div>
                    {canAccess("/admin/peserta/online") && (
                      <Button size="lg" className="bg-black hover:bg-emerald-500 text-white hover:text-black font-black uppercase tracking-wide border-[length:var(--neo-border-width)] border-black transition-colors rounded-none px-6" asChild>
                        <Link to="/admin/peserta/online">
                          Pantau Peserta <ArrowRight className="ml-2 h-5 w-5 stroke-[3]" />
                        </Link>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Operational Shortcuts Console */}
          <div className="bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)] rounded-xl p-6 sm:p-8">
            <h2 className="text-sm font-black uppercase tracking-widest text-[color:var(--neo-text)] mb-4 px-1">Konsol Aksi Cepat Administrasi</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {!hasQuickActions && (
                <p className="col-span-full text-sm font-bold text-black/70">Tidak ada aksi cepat yang tersedia untuk peran ini.</p>
              )}
              {canAccess("/admin/ujian") && (
                <>
                  <ShortcutCard
                    title="Buat Ujian"
                    desc="Atur jadwal & durasi"
                    icon={<Plus className="h-6 w-6 stroke-[3]" />}
                    href="/admin/ujian"
                  />
                  <ShortcutCard
                    title="Rilis Token"
                    desc="Generate token sesi"
                    icon={<Key className="h-6 w-6 stroke-[3]" />}
                    href="/admin/ujian"
                  />
                </>
              )}
              {canAccess("/admin/modul") && (
                <ShortcutCard
                  title="Bank Soal"
                  desc="Kelola & import soal"
                  icon={<BookOpen className="h-6 w-6 stroke-[3]" />}
                  href="/admin/modul"
                />
              )}
              {canAccess("/admin/peserta/kartu") && (
                <ShortcutCard
                  title="Kartu Peserta"
                  desc="Cetak / eksport kartu"
                  icon={<FileText className="h-6 w-6 stroke-[3]" />}
                  href="/admin/peserta/kartu"
                />
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Urgent Tasks & Schedule (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Urgent Action / Pending Tasks Queue */}
          <div className="bg-red-400 border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)] rounded-xl p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)]">
                <AlertCircle className="h-6 w-6 text-red-600 stroke-[3]" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-black">Perlu Perhatian & Tindakan</h2>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="p-4 rounded-none bg-white border-[length:var(--neo-border-width)] border-black shadow-[4px_4px_0_0_#000] flex items-center gap-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0 stroke-[3]" />
                <div>
                  <p className="text-base font-black text-black uppercase">Semua Antrean Selesai</p>
                  <p className="text-sm font-bold text-black/70">Tidak ada tugas evaluasi tertunda saat ini.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingTasks.map((task) => (
                  <Link key={task.id} to={task.route} className="block p-5 bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] hover:-translate-y-1 shadow-[var(--neo-shadow)] transition-all group rounded-none">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-3 bg-red-100 border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[2px_2px_0_0_#000]">
                        {task.icon}
                      </div>
                      <span className="px-3 py-1 text-sm font-black uppercase rounded-none bg-red-200 text-black border-[length:var(--neo-border-width)] border-black shadow-[2px_2px_0_0_#000]">
                        {task.count} Pending
                      </span>
                    </div>
                    <h3 className="font-black text-black uppercase text-base mb-1">{task.title}</h3>
                    <p className="text-sm font-bold text-black/70 mb-4">{task.desc}</p>
                    <div className="inline-flex items-center text-sm font-black uppercase text-red-700 group-hover:underline">
                      Proses Sekarang <ArrowUpRight className="ml-1 h-5 w-5 stroke-[3]" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Exams Timeline */}
          {upcomingExams.length > 0 && (
            <div className="bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)] rounded-xl p-6 sm:p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[color:var(--neo-bg)] border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)]">
                    <CalendarClock className="h-6 w-6 stroke-[3] text-black" />
                  </div>
                  <h2 className="text-xl font-black uppercase text-[color:var(--neo-text)] tracking-tight">Ujian Mendatang</h2>
                </div>
              </div>

              <div className="space-y-6">
                {upcomingExams.map((exam, i) => (
                  <div key={exam.id}>
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center justify-center w-14 h-14 bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[4px_4px_0_0_#000] shrink-0">
                        <span className="text-[11px] font-black uppercase text-[color:var(--neo-text)]/70 leading-none mb-1">
                          {new Date(exam.beginAt).toLocaleDateString('id-ID', { month: 'short' })}
                        </span>
                        <span className="text-xl font-black text-[color:var(--neo-text)] leading-none">
                          {new Date(exam.beginAt).getDate()}
                        </span>
                      </div>
                      <div className="pt-1">
                        <h3 className="text-base font-black uppercase tracking-tight text-[color:var(--neo-text)] line-clamp-1">{exam.nama}</h3>
                        <p className="text-sm font-bold text-[color:var(--neo-text)]/70 mt-1 flex items-center gap-2">
                          <Clock className="h-4 w-4 stroke-[3]" />
                          {new Date(exam.beginAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB
                        </p>
                      </div>
                    </div>
                    {i < upcomingExams.length - 1 && (
                      <div className="ml-7 w-1 h-6 bg-black my-2"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

// ----------------------------------------------------------------------
// REUSABLE DASHBOARD ARCHITECTURE COMPONENTS
// ----------------------------------------------------------------------

function KpiCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  trendPositive
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend?: string | null;
  trendPositive?: boolean;
}) {
  return (
    <div className="bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)] p-5 transition-transform hover:-translate-y-1">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-black uppercase tracking-widest text-[color:var(--neo-text)]">{label}</span>
        <div className="p-3 bg-[color:var(--neo-bg)] border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[2px_2px_0_0_#000]">
          {icon}
        </div>
      </div>

      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-4xl font-black text-[color:var(--neo-text)] tracking-tight">{value}</span>
        {trend && (
          <span className={`inline-flex items-center text-xs font-black uppercase px-3 py-1 border-[length:var(--neo-border-width)] border-black shadow-[2px_2px_0_0_#000] ${
            trendPositive
              ? "bg-emerald-200 text-emerald-900"
              : "bg-red-200 text-red-900"
          }`}>
            <TrendingUp className="mr-1.5 h-3.5 w-3.5 inline stroke-[3]" />
            {trend}
          </span>
        )}
      </div>

      <p className="text-sm font-bold text-[color:var(--neo-text)]/70">{subtitle}</p>
    </div>
  );
}

function ShortcutCard({
  title,
  desc,
  icon,
  href
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  href: "/admin/ujian" | "/admin/modul" | "/admin/peserta/kartu";
}) {
  return (
    <Link to={href} className="flex flex-col p-4 bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] hover:-translate-y-1 shadow-[var(--neo-shadow)] transition-all group">
      <div className="p-3 bg-[color:var(--neo-bg)] border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[2px_2px_0_0_#000] w-fit mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-sm font-black text-black uppercase leading-tight mb-1">{title}</h3>
      <p className="text-xs font-bold text-black/70 line-clamp-1">{desc}</p>
    </Link>
  );
}
