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

      {/* 1. TOP OPERATIONAL STATUS BAR (Neo Brutalism Style) */}
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
          icon={<Layers className="h-6 w-6 stroke-[3]" />}
        />
      </section>

      {/* 3. MAIN DASHBOARD CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Main Workflows */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Live Exams Dashboard */}
          <section className="bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)] rounded-xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[color:var(--neo-accent)] border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)]">
                  <MonitorPlay className="h-8 w-8 stroke-[3] text-[color:var(--neo-text)]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase text-[color:var(--neo-text)] tracking-tight">Live Monitoring</h2>
                  <p className="text-sm font-bold text-[color:var(--neo-text)]/70 mt-1">Pantau ujian yang sedang berlangsung secara real-time</p>
                </div>
              </div>
              {activeExams.length > 0 && (
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-[color:var(--neo-text)] bg-[color:var(--neo-bg)] px-4 py-2 border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)]">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full bg-black opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 bg-black"></span>
                  </span>
                  {activeExams.length} Sesi Aktif
                </div>
              )}
            </div>

            {activeExams.length === 0 ? (
              <div className="text-center py-12 px-4 bg-[color:var(--neo-bg)]/20 rounded-xl border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] border-dashed">
                <MonitorPlay className="h-12 w-12 text-[color:var(--neo-text)]/40 mx-auto mb-4 stroke-[3]" />
                <h3 className="text-lg font-black uppercase text-[color:var(--neo-text)]">Tidak ada ujian berjalan</h3>
                <p className="text-sm font-bold text-[color:var(--neo-text)]/60 mt-2 mb-6">Ujian yang dijadwalkan akan otomatis muncul di sini.</p>
                {canAccess("/admin/ujian") && (
                  <Button variant="outline" className="border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)] font-black uppercase tracking-wide hover:-translate-y-1 transition-transform bg-white text-black" asChild>
                    <Link to="/admin/ujian">Lihat Jadwal Ujian</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {activeExams.map((u) => (
                  <div key={u.id} className="group p-5 bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)] hover:-translate-y-1 hover:bg-[color:var(--neo-bg)] transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-black text-[color:var(--neo-text)] text-lg line-clamp-1 uppercase tracking-tight">
                          {u.nama}
                        </h3>
                        <div className="flex items-center gap-3 mt-3 text-sm text-[color:var(--neo-text)] font-bold">
                          <span className="flex items-center gap-2 bg-white px-3 py-1.5 border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[2px_2px_0_0_#000]">
                            <Clock className="h-4 w-4 stroke-[3]" />
                            {new Date(u.beginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(u.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      {canAccess("/admin/peserta/online") && (
                        <Button size="icon" variant="ghost" className="h-10 w-10 text-[color:var(--neo-text)] hover:bg-white rounded-full shrink-0 border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] opacity-0 group-hover:opacity-100 transition-opacity shadow-[var(--neo-shadow)] bg-[color:var(--neo-bg)]" asChild>
                          <Link to="/admin/peserta/online">
                            <ArrowUpRight className="h-5 w-5 stroke-[3]" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quick Access Grid */}
          {hasQuickActions && (
            <section className="bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)] rounded-xl p-6 sm:p-8">
              <h2 className="text-sm font-black uppercase tracking-widest text-[color:var(--neo-text)] mb-4 px-1">Akses Cepat</h2>
              <div className="grid grid-cols-2 gap-4">
                {canAccess("/admin/ujian") && (
                  <ShortcutCard 
                    title="Ujian" 
                    desc="Buat & atur jadwal" 
                    icon={<MonitorPlay className="h-6 w-6 stroke-[3]" />} 
                    href="/admin/ujian" 
                  />
                )}
                {canAccess("/admin/modul") && (
                  <ShortcutCard 
                    title="Bank Soal" 
                    desc="Manajemen soal" 
                    icon={<BookOpen className="h-6 w-6 stroke-[3]" />} 
                    href="/admin/modul" 
                  />
                )}
                {canAccess("/admin/peserta/kartu") && (
                  <ShortcutCard 
                    title="Kartu" 
                    desc="Cetak kartu ujian" 
                    icon={<FileText className="h-6 w-6 stroke-[3]" />} 
                    href="/admin/peserta/kartu" 
                  />
                )}
              </div>
            </section>
          )}

        </div>

        {/* RIGHT COLUMN: Upcoming & Quick Access */}
        <div className="lg:col-span-4 space-y-8">

          {/* Actionable Alerts & Tasks */}
          {pendingTasks.length > 0 && (
            <section className="bg-red-400 border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)] rounded-xl p-6 sm:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)]">
                  <AlertCircle className="h-6 w-6 text-red-600 stroke-[3]" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-black">Tugas Menunggu</h2>
              </div>
              <div className="space-y-4">
                {pendingTasks.map((task) => (
                  <Link key={task.id} to={task.route} className="flex items-center justify-between p-5 bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] hover:-translate-y-1 shadow-[var(--neo-shadow)] transition-all group rounded-xl">
                    <div className="flex items-center gap-5">
                      <div className="p-3 bg-red-100 border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[2px_2px_0_0_#000]">
                        {task.icon}
                      </div>
                      <div>
                        <h3 className="font-black text-black uppercase text-base">{task.title}</h3>
                        <p className="text-sm font-bold text-black/70 mt-1">{task.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center justify-center bg-red-200 border-[length:var(--neo-border-width)] border-black text-black text-sm font-black px-3 py-1.5 min-w-[3rem] shadow-[2px_2px_0_0_#000]">
                        {task.count}
                      </span>
                      <div className="bg-black text-white p-2 rounded-full border-[length:var(--neo-border-width)] border-black group-hover:bg-red-500 transition-colors">
                        <ArrowRight className="h-5 w-5 stroke-[3]" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          
          {/* Upcoming Schedule */}
          <section className="bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)] rounded-xl p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-[color:var(--neo-bg)] border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)]">
                <CalendarClock className="h-6 w-6 stroke-[3] text-black" />
              </div>
              <h2 className="text-xl font-black uppercase text-[color:var(--neo-text)] tracking-tight">Jadwal Mendatang</h2>
            </div>

            {upcomingExams.length === 0 ? (
              <div className="text-center py-10 bg-[color:var(--neo-bg)]/20 border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] border-dashed rounded-xl">
                <CheckCircle2 className="h-10 w-10 text-[color:var(--neo-text)]/40 mx-auto mb-3 stroke-[3]" />
                <p className="text-sm font-bold uppercase tracking-wider text-[color:var(--neo-text)]/70">Semua ujian terlaksana</p>
              </div>
            ) : (
              <div className="space-y-6">
                {upcomingExams.map((u, i) => (
                  <div key={u.id}>
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center justify-center w-14 h-14 bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[4px_4px_0_0_#000] shrink-0">
                        <span className="text-[11px] font-black uppercase text-[color:var(--neo-text)]/70 leading-none mb-1">
                          {new Date(u.beginAt).toLocaleDateString('id-ID', { month: 'short' })}
                        </span>
                        <span className="text-xl font-black text-[color:var(--neo-text)] leading-none">
                          {new Date(u.beginAt).getDate()}
                        </span>
                      </div>
                      <div className="pt-1">
                        <h3 className="text-base font-black uppercase tracking-tight text-[color:var(--neo-text)] line-clamp-1">{u.nama}</h3>
                        <p className="text-sm font-bold text-[color:var(--neo-text)]/70 mt-1 flex items-center gap-2">
                          <Clock className="h-4 w-4 stroke-[3]" />
                          {new Date(u.beginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    {i < upcomingExams.length - 1 && (
                      <div className="ml-7 w-1 h-6 bg-black my-2"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
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
    <div className="bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)] p-6 transition-transform hover:-translate-y-1 flex flex-col justify-between h-full rounded-xl">
      <div className="flex items-start justify-between mb-6">
        <div className="p-3 bg-[color:var(--neo-bg)] border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[4px_4px_0_0_#000] rounded-xl text-black">
          {icon}
        </div>
      </div>

      <div>
        <p className="text-sm font-black uppercase text-[color:var(--neo-text)] mb-2 tracking-widest">{label}</p>
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-5xl font-black text-[color:var(--neo-text)] tracking-tighter">{value}</span>
          {trend && (
            <span className={`text-xs font-bold px-3 py-1 border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[2px_2px_0_0_#000] uppercase tracking-wider ${trendPositive ? "bg-emerald-300 text-black" : "bg-red-400 text-black"}`}>
              {trendPositive ? <TrendingUp className="inline h-4 w-4 mr-1.5 stroke-[3]" /> : null}
              {trend}
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-[color:var(--neo-text)]/70">{subtitle}</p>
      </div>
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
    <Link to={href} className="flex flex-col p-5 bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)] rounded-xl hover:-translate-y-1 hover:bg-[color:var(--neo-bg)] transition-all group">
      <div className="p-3 bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] rounded-xl w-fit mb-4 group-hover:shadow-[4px_4px_0_0_#000] transition-shadow text-black">
        {icon}
      </div>
      <h3 className="text-base font-black uppercase text-[color:var(--neo-text)] leading-tight mb-1">{title}</h3>
      <p className="text-xs font-bold text-[color:var(--neo-text)]/70 line-clamp-1">{desc}</p>
    </Link>
  );
}
