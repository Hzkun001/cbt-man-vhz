import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/cbt/auth-store";
import {
  usersRepo,
  unitAkademikRepo,
  modulRepo,
  soalRepo,
  ujianRepo,
  sesiRepo,
} from "@/lib/cbt/repos";
import { 
  Clock, 
  Plus, 
  ArrowRight, 
  AlertCircle, 
  PlayCircle, 
  Users, 
  BookOpen, 
  FileText, 
  Activity,
  CalendarClock,
  Sparkles,
  BarChart3,
  MonitorPlay,
  ShieldCheck,
  Zap,
  CheckCircle2
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: CommandCenter,
});

function CommandCenter() {
  const user = useAuthStore((s) => s.user)!;
  const now = Date.now();
  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

  // Data fetching
  const pesertaList = usersRepo.all().filter((u) => u.role === "mahasiswa");
  const soalList = soalRepo.all();
  const semuaUjian = ujianRepo.all();
  
  const newPeserta = pesertaList.filter(u => u.createdAt && (now - u.createdAt) < ONE_WEEK).length;
  const newSoal = soalList.filter(s => s.createdAt && (now - s.createdAt) < ONE_WEEK).length;
  const newUjian = semuaUjian.filter(u => u.createdAt && (now - u.createdAt) < ONE_WEEK).length;

  const counts = {
    peserta: pesertaList.length,
    unit: unitAkademikRepo.all().length,
    modul: modulRepo.all().length,
    soal: soalList.length,
    ujian: semuaUjian.length,
    sesi: sesiRepo.all().length,
  };

  const activeExams = semuaUjian.filter((u) => u.beginAt && u.endAt && now >= u.beginAt && now <= u.endAt);
  const upcomingExams = semuaUjian.filter((u) => u.beginAt && now < u.beginAt).slice(0, 4);
  const finishedExams = semuaUjian.filter((u) => u.endAt && now > u.endAt);
  
  const pendingTasks = [];
  if (finishedExams.length > 0) {
    pendingTasks.push({
      id: "eval-reports",
      title: "Ujian Selesai (Butuh Evaluasi)",
      count: finishedExams.length,
      route: "/admin/evaluasi",
      icon: <ShieldCheck className="h-5 w-5" />
    });
  }

  return (
    <div className="w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* 1. HERO SECTION (Neobrutalism Style) */}
      <section className="relative overflow-hidden bg-yellow-400 p-8 sm:p-10 border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-black">
              Selamat datang kembali, <br className="hidden sm:block" />
              <span className="bg-white px-3 py-1 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] inline-block mt-3">{user.namaLengkap}</span>
            </h1>
            <p className="text-black text-base max-w-xl font-bold leading-relaxed border-l-4 border-black pl-4 bg-white/50 p-2 border-r-4 border-y-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] mt-6">
              Pusat kendali ujian interaktif Anda. Pantau ujian secara real-time, kelola bank soal, dan hasilkan laporan performa dengan satu klik.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 shrink-0">
            <Button size="lg" className="font-black uppercase rounded-none border-4 border-black bg-[#a3e635] text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:bg-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] h-14 px-8" asChild>
              <Link to="/admin/ujian">
                <Plus className="mr-2 h-6 w-6 stroke-[3]" /> Jadwalkan Ujian
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="font-black uppercase rounded-none border-4 border-black bg-white text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:bg-yellow-400 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] h-14 px-8" asChild>
              <Link to="/admin/modul">
                <BookOpen className="mr-2 h-6 w-6 stroke-[3]" /> Bank Soal
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 2. STATS GRID (Neobrutalism Cards) */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        <StatCard 
          icon={<Users className="h-6 w-6 stroke-[3]" />} 
          label="Total Peserta" 
          value={counts.peserta} 
          trend={newPeserta > 0 ? `+${newPeserta} baru` : null}
        />
        <StatCard 
          icon={<FileText className="h-6 w-6 stroke-[3]" />} 
          label="Total Ujian" 
          value={counts.ujian} 
          trend={newUjian > 0 ? `+${newUjian} ujian` : null}
        />
        <StatCard 
          icon={<BookOpen className="h-6 w-6 stroke-[3]" />} 
          label="Bank Soal" 
          value={counts.soal} 
          trend={newSoal > 0 ? `+${newSoal} soal` : null}
        />
        <StatCard 
          icon={<Zap className="h-6 w-6 stroke-[3]" />} 
          label="Total Sesi" 
          value={counts.sesi} 
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Main Workflows */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Live Exams Dashboard */}
          <section className="bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 sm:p-8">
            <div className="flex items-center justify-between mb-8 pb-4 border-b-4 border-black">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#a3e635] border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  <MonitorPlay className="h-8 w-8 stroke-[3]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase text-black tracking-tight">Live Monitoring</h2>
                  <p className="text-sm font-bold text-black mt-1">Pantau ujian yang sedang berlangsung secara real-time</p>
                </div>
              </div>
              {activeExams.length > 0 && (
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-black bg-yellow-400 px-4 py-2 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full bg-black opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 bg-black"></span>
                  </span>
                  {activeExams.length} Aktif
                </div>
              )}
            </div>

            {activeExams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border-4 border-dashed border-black bg-yellow-400">
                <div className="h-16 w-16 bg-white border-4 border-black flex items-center justify-center text-black mb-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                  <PlayCircle className="h-8 w-8 stroke-[3]" />
                </div>
                <h3 className="text-xl font-black uppercase text-black mb-3 bg-white px-4 py-1 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">Sistem Siaga</h3>
                <p className="text-sm font-bold text-black max-w-sm mb-8 bg-white/70 p-3 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  Belum ada ujian yang berjalan saat ini. Anda dapat bersantai atau mulai menjadwalkan ujian berikutnya.
                </p>
                <Button className="font-black uppercase rounded-none border-4 border-black bg-[#a3e635] text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:bg-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] px-8 h-12" asChild>
                  <Link to="/admin/ujian">Buat Ujian Baru</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-6">
                {activeExams.map((exam) => (
                  <div key={exam.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:bg-yellow-400 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-all duration-100">
                    <div className="flex items-center gap-5 mb-4 sm:mb-0">
                      <div className="flex h-14 w-14 items-center justify-center bg-[#a3e635] border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                        <Activity className="h-7 w-7 stroke-[3]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black uppercase text-black mb-2">{exam.nama}</h3>
                        <div className="flex items-center gap-3 text-sm font-bold text-black bg-white px-3 py-1.5 border-4 border-black inline-flex shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                          <Clock className="h-5 w-5 stroke-[3]" /> Berakhir {new Date(exam.endAt!).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                        </div>
                      </div>
                    </div>
                    <Button className="w-full sm:w-auto font-black uppercase bg-black text-white rounded-none border-4 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:bg-white hover:text-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all h-12 px-6" asChild>
                      <Link to="/admin/peserta/online">
                        Pantau Peserta <ArrowRight className="ml-3 h-5 w-5 stroke-[3]" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* RIGHT COLUMN: Secondary Workflows & Info */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Action Required */}
          <section className="bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6 pb-4 border-b-4 border-black">
              <div className="p-2 bg-yellow-400 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                <AlertCircle className="h-6 w-6 stroke-[3]" />
              </div>
              <h2 className="text-xl font-black uppercase text-black tracking-tight">Perlu Perhatian</h2>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="flex items-start gap-4 p-5 bg-[#a3e635] border-4 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                <div className="bg-white border-4 border-black p-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  <CheckCircle2 className="h-6 w-6 stroke-[3] text-black" />
                </div>
                <div>
                  <p className="text-lg font-black uppercase text-black">Semua Terkendali</p>
                  <p className="text-sm font-bold text-black mt-1">Tidak ada tugas yang tertunda.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingTasks.map((task) => (
                  <Link key={task.id} to={task.route} className="flex flex-col p-5 bg-yellow-400 border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-all group">
                    <div className="flex justify-between items-start mb-5">
                      <div className="bg-white border-4 border-black p-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)] text-black">
                        {task.icon}
                      </div>
                      <div className="bg-black text-white text-xs font-black uppercase tracking-wider px-3 py-1.5 shadow-[4px_4px_0_0_rgba(0,0,0,1)] border-2 border-white">
                        {task.count} antrean
                      </div>
                    </div>
                    <h3 className="font-black uppercase text-black text-xl mb-3">{task.title}</h3>
                    <p className="text-sm font-bold text-black flex items-center bg-white px-3 py-1.5 border-4 border-black inline-flex shadow-[4px_4px_0_0_rgba(0,0,0,1)] w-fit group-hover:bg-[#a3e635]">
                      Selesaikan sekarang <ArrowRight className="ml-2 h-5 w-5 stroke-[3]" />
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Upcoming Schedule */}
          {upcomingExams.length > 0 && (
            <section className="bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 sm:p-8">
              <div className="flex items-center gap-4 mb-6 pb-4 border-b-4 border-black">
                <div className="p-2 bg-yellow-400 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  <CalendarClock className="h-6 w-6 stroke-[3]" />
                </div>
                <h2 className="text-xl font-black uppercase text-black tracking-tight">Ujian Mendatang</h2>
              </div>
              
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[24px] top-4 bottom-4 w-1.5 bg-black"></div>
                
                <div className="space-y-8 relative">
                  {upcomingExams.map((exam) => (
                    <div key={exam.id} className="flex gap-6 group cursor-default">
                      <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center bg-[#a3e635] border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                        <div className="h-4 w-4 bg-black group-hover:scale-150 transition-transform duration-300"></div>
                      </div>
                      <div className="pt-1 pb-2">
                        <h3 className="text-base font-black uppercase text-black leading-none mb-3 bg-white px-2 py-1 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] inline-block">{exam.nama}</h3>
                        <p className="text-xs font-bold text-black bg-yellow-400 px-3 py-1.5 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex items-center gap-2 w-fit">
                          <Clock className="h-4 w-4 stroke-[3]" /> 
                          <span suppressHydrationWarning>{new Date(exam.beginAt!).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" })} • {new Date(exam.beginAt!).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* System Info */}
          <section className="bg-yellow-400 border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 sm:p-8">
            <h2 className="text-lg font-black uppercase tracking-wider text-black mb-6 border-b-4 border-black pb-3">
              Informasi Sistem
            </h2>
            <div className="space-y-5 text-sm font-bold">
              <div className="flex justify-between items-center border-b-4 border-black pb-4 border-dashed">
                <span className="text-black uppercase">Database</span>
                <span className="text-black bg-white px-3 py-1 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex items-center gap-2">
                  <div className="h-3 w-3 bg-[#a3e635] border-2 border-black"></div> SQLite Local
                </span>
              </div>
              <div className="flex justify-between items-center border-b-4 border-black pb-4 border-dashed">
                <span className="text-black uppercase">Engine</span>
                <span className="text-black bg-white px-3 py-1 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">Prisma ORM</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-black uppercase">Version</span>
                <span className="text-black bg-white px-3 py-1 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">v1.2.0</span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

// Reusable Stat Card Component (Neobrutalism)
function StatCard({ icon, label, value, trend }: { icon: React.ReactNode, label: string, value: number, trend?: string | null }) {
  return (
    <div className="bg-white p-5 sm:p-6 border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-all duration-100 flex flex-col justify-between h-full">
      <div className="flex items-start justify-between mb-6">
        <h3 className="text-xs font-black uppercase tracking-wider text-black bg-yellow-400 px-3 py-1.5 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] text-center">{label}</h3>
        <div className="text-black bg-[#a3e635] p-2 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          {icon}
        </div>
      </div>
      <div>
        <div className="flex items-end gap-3 mt-4">
          <span className="text-4xl md:text-5xl font-black text-black tracking-tight">{value}</span>
          {trend && (
            <span className="text-xs font-black text-black bg-[#a3e635] px-2 py-1 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] mb-2 inline-block">
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

