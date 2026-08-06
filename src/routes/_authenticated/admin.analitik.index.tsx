
import { createFileRoute, Link } from "@tanstack/react-router";
import { sesiRepo, mataKuliahRepo, semesterRepo, usersRepo, ujianRepo } from "@/lib/cbt/repos";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/lib/cbt/auth-store";
import { AdminPage, AdminPageHeader } from "@/components/cbt/AdminPage";
import { visibleUjians } from "@/lib/cbt/access";
import { BookOpen, BarChart3, ChevronRight, Activity } from "lucide-react";


export const Route = createFileRoute("/_authenticated/admin/analitik/")({
  component: AnalitikIndex,
});


export function AnalitikIndex() {
  const user = useAuthStore((s) => s.user);
  const ujians = visibleUjians(user);
  
  // High level stats
  const semuaUjian = ujianRepo.all();
  const semuaSesi = sesiRepo.all();
  const peserta = usersRepo.all().filter((u) => u.role === "mahasiswa");
  const totalSelesai = semuaSesi.filter((s) => s.status === "selesai").length;

  return (
    <AdminPage className="neo-ready">
      <AdminPageHeader
        title="Analisis & Hasil"
        description="Ringkasan aktivitas ujian, laporan hasil, dan peringkat kelas."
        action={
          <div className="flex items-center gap-6 sm:gap-8 text-sm">
            <div className="flex flex-col items-end">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[color:var(--neo-text)]/70 mb-0.5">Total Ujian</span>
              <span className="text-2xl sm:text-3xl font-black text-[color:var(--neo-text)] tabular-nums leading-none">
                {semuaUjian.length}
              </span>
            </div>
            <div className="w-1.5 h-10 bg-[color:var(--neo-border-color)]" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[color:var(--neo-text)]/70 mb-0.5">Peserta Terdaftar</span>
              <span className="text-2xl sm:text-3xl font-black text-[color:var(--neo-text)] tabular-nums leading-none">
                {peserta.length}
              </span>
            </div>
            <div className="w-1.5 h-10 bg-[color:var(--neo-border-color)]" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[color:var(--neo-text)]/70 mb-0.5">Sesi Selesai</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 tabular-nums leading-none">
                {totalSelesai}
              </span>
            </div>
          </div>
        }
      />

      {/* Data List */}
      <div className="bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[var(--neo-shadow)] rounded-2xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] bg-[color:var(--neo-bg)] text-xs font-black text-black uppercase tracking-widest">
          <div className="col-span-12 sm:col-span-5">Dokumen Ujian</div>
          <div className="hidden sm:block sm:col-span-3">Tingkat Penyelesaian</div>
          <div className="hidden sm:block sm:col-span-2">Rata-rata Skor</div>
          <div className="hidden sm:block sm:col-span-2 text-right">Aksi</div>
        </div>

        {ujians.length === 0 ? (
          <div className="py-24 text-center flex flex-col items-center">
            <Activity className="h-14 w-14 text-black stroke-[2] mb-4" />
            <span className="text-xl text-black font-black uppercase">Belum Ada Ujian</span>
            <span className="text-sm font-bold text-black/70 mt-2">Buat paket ujian baru untuk melihat analisisnya di sini.</span>
          </div>
        ) : (
          <div className="flex flex-col divide-y-[length:var(--neo-border-width)] divide-[color:var(--neo-border-color)]">

            {ujians.map((u) => {
              const sesiLengkap = semuaSesi.filter((s) => s.ujianId === u.id && s.status === "selesai").length;
              const mk = u.mataKuliahId ? mataKuliahRepo.byId(u.mataKuliahId) : null;
              
              const skors = semuaSesi.filter(s => s.ujianId === u.id && s.status === "selesai" && s.skorTotal !== undefined).map(s => s.skorTotal!);
              const avg = skors.length > 0 ? Math.round(skors.reduce((a,b)=>a+b, 0) / skors.length) : 0;
              const maxSkor = u.poinBenar * (u.topicSets || []).reduce((a, b) => a + b.jumlah, 0);

              const progress = peserta.length > 0 ? Math.round((sesiLengkap / peserta.length) * 100) : 0;

              return (
                <Link 
                  key={u.id} 
                  to="/admin/analitik/$id" 
                  params={{ id: u.id }}
                  className="group block transition-colors hover:bg-[color:var(--neo-bg)] cursor-pointer"
                >
                  <div className="grid grid-cols-12 gap-4 px-6 py-5 items-center">
                    
                    {/* Col 1: Exam Info */}
                    <div className="col-span-12 sm:col-span-5 flex items-start gap-4">
                      <div className="mt-1 p-2 bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[2px_2px_0_0_#000]">
                        <BarChart3 className="h-5 w-5 text-black stroke-[3]" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-base text-black truncate group-hover:underline underline-offset-2">
                          {u.nama}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs font-bold text-black/70">
                          {mk ? (
                            <span className="flex items-center gap-1.5">
                              <BookOpen className="h-3.5 w-3.5 stroke-[3]" /> {mk.nama}
                            </span>
                          ) : (
                            <span className="italic">Tanpa mata kuliah</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Col 2: Progress */}
                    <div className="hidden sm:flex sm:col-span-3 flex-col justify-center pr-4">
                      <div className="flex items-center justify-between text-xs font-black text-black mb-2 tabular-nums uppercase">
                        <span>{sesiLengkap} / {peserta.length} Selesai</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-white border-[length:var(--neo-border-width)] border-black rounded-none h-4 shadow-[2px_2px_0_0_#000] overflow-hidden">
                        <div 
                          className={`h-full border-r-[length:var(--neo-border-width)] border-black transition-all duration-500 ease-out ${progress === 100 ? 'bg-emerald-400' : 'bg-yellow-400'}`} 
                          style={{ width: `${progress}%`, borderRightWidth: progress === 100 || progress === 0 ? '0px' : undefined }} 
                        />
                      </div>
                    </div>

                    {/* Col 3: Average */}
                    <div className="hidden sm:flex sm:col-span-2 items-center">
                      <div className="font-black text-lg tabular-nums text-black">
                        {avg} <span className="text-xs text-black/50 font-bold">/ {maxSkor}</span>
                      </div>
                    </div>

                    {/* Col 4: Action */}
                    <div className="hidden sm:flex sm:col-span-2 items-center justify-end">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-black uppercase tracking-wide bg-white border-[length:var(--neo-border-width)] border-[color:var(--neo-border-color)] shadow-[2px_2px_0_0_#000] group-hover:-translate-y-0.5 group-hover:shadow-[4px_4px_0_0_#000] transition-all">
                        Lihat <ChevronRight className="h-4 w-4 stroke-[3]" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

      </div>
    </AdminPage>
  );
}
