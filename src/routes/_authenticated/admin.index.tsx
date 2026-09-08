import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/cbt/auth-store";
import { usersRepo, soalRepo, ujianRepo, sesiRepo, configRepo } from "@/lib/cbt/repos";
import { getExamAvailabilityStatus } from "@/lib/cbt/availability";
import { canAccessAdminPath } from "./admin";
import { ArrowRight, BookOpen, CalendarClock, CheckCircle2, ClipboardCheck, Clock, Plus, Radio, Search, Users } from "lucide-react";
import { AdminPage, AdminPageHeader } from "@/components/cbt/AdminPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: CommandCenter,
});

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
});

function CommandCenter() {
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const semuaUjian = ujianRepo.all();
  const sessions = sesiRepo.all();
  const users = usersRepo.all();
  const cfg = configRepo.get();
  if (!user) return null;
  const canAccess = (path: string) => canAccessAdminPath(user, path, cfg);
  const published = semuaUjian.filter((exam) => exam.status === "published");
  const activeExams = published.filter((exam) => {
    const status = getExamAvailabilityStatus(exam, now);
    return status === "active" || status === "open";
  });
  const upcoming = published
    .filter((exam) => getExamAvailabilityStatus(exam, now) === "upcoming")
    .sort((a, b) => (a.beginAt ?? 0) - (b.beginAt ?? 0));
  const matchesSearch = (exam: { nama: string }) => exam.nama.toLowerCase().includes(search.trim().toLowerCase());
  const shownActive = activeExams.filter(matchesSearch);
  const upcomingExams = upcoming.filter(matchesSearch).slice(0, 4);
  const inProgress = new Set(sessions.filter((s) => s.status === "sedang").map((s) => s.pesertaId)).size;
  const essayIds = new Set(soalRepo.all().filter((s) => s.tipe === "essay").map((s) => s.id));
  const pendingSessions = sessions.filter((s) =>
    s.status === "selesai" && s.jawaban.some((j) => essayIds.has(j.soalId) && typeof j.skor !== "number"),
  );
  const recentSessions = sessions
    .filter((s) => s.status === "selesai" && typeof s.selesaiAt === "number")
    .sort((a, b) => (b.selesaiAt ?? 0) - (a.selesaiAt ?? 0))
    .slice(0, 4);
  const metrics = [
    { label: "Ujian aktif", value: activeExams.length, detail: "Sudah dipublikasikan & tersedia", icon: Radio },
    { label: "Terjadwal", value: upcoming.length, detail: "Ujian mendatang yang terbit", icon: CalendarClock },
    { label: "Sedang mengerjakan", value: inProgress, detail: "Peserta dengan sesi berjalan", icon: Users },
    ...(canAccess("/admin/evaluasi") ? [{ label: "Menunggu koreksi", value: pendingSessions.length, detail: "Lembar dengan essay belum dinilai", icon: ClipboardCheck }] : []),
  ];

  return (
    <AdminPage className="pb-12">
      <AdminPageHeader
        title="Dashboard"
        description={`Selamat datang, ${user.namaLengkap}. Kelola ujian dari persiapan hingga hasil.`}
        action={
          <>
            {canAccess("/admin/peserta/online") && (
              <Button variant="outline" asChild><Link to="/admin/peserta/online"><Radio className="h-4 w-4" />Pantau Peserta</Link></Button>
            )}
            {canAccess("/admin/ujian") && (
              <Button asChild><Link to="/admin/ujian"><Plus className="h-4 w-4" />Buat Ujian</Link></Button>
            )}
          </>
        }
      />

      <section aria-label="Ringkasan ujian" className="overflow-hidden rounded-xl border bg-card text-card-foreground">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-l-4 border-l-primary px-5 py-3">
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-primary">
            <BookOpen className="h-4 w-4" /> CBT / RINGKASAN UJIAN
          </span>
          <span className="text-xs text-muted-foreground">Berdasarkan data yang dimuat</span>
        </div>
        <div className={`grid divide-y sm:grid-cols-2 sm:divide-y-0 ${metrics.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
          {metrics.map(({ label, value, detail, icon: Icon }) => (
            <div key={label} className="min-w-0 p-5 sm:border-r sm:last:border-r-0">
              <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>{label}</span><Icon className="h-4 w-4 shrink-0 text-primary" />
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Operasional ujian</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pantau pelaksanaan dan siapkan jadwal berikutnya.</p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Cari ujian aktif dan mendatang" placeholder="Cari ujian" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-card pl-9" />
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <section aria-labelledby="active-heading" className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
              <h3 id="active-heading" className="flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 rounded-full bg-primary" />Ujian aktif</h3>
              <span className="text-xs text-muted-foreground">{shownActive.length} ujian</span>
            </div>
            <div className="divide-y">
              {shownActive.map((exam) => {
                const examSessions = sessions.filter((s) => s.ujianId === exam.id);
                const working = examSessions.filter((s) => s.status === "sedang").length;
                const completed = examSessions.filter((s) => s.status === "selesai").length;
                return (
                  <div key={exam.id} className="space-y-3 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="break-words text-sm font-semibold">{exam.nama}</h4>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span suppressHydrationWarning>{exam.endAt !== undefined ? `Berakhir ${dateFormat.format(exam.endAt)} WIB` : "Tanpa batas jadwal"}</span>
                        </p>
                      </div>
                      <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">Tersedia</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span><strong className="font-medium text-foreground">{working}</strong> mengerjakan</span>
                        <span><strong className="font-medium text-foreground">{completed}</strong> selesai</span>
                        <span>{exam.durasiMenit} menit</span>
                      </div>
                      {canAccess("/admin/peserta/online") && (
                        <Button variant="outline" size="sm" asChild><Link to="/admin/peserta/online">Pantau Peserta<ArrowRight className="h-3.5 w-3.5" /></Link></Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {shownActive.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <Radio className="mx-auto mb-3 h-7 w-7 text-primary" />
                  <p className="text-sm font-medium">{search.trim() ? "Tidak ada ujian aktif yang cocok" : "Belum ada ujian aktif"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{search.trim() ? "Coba kata kunci lain." : "Ujian yang sudah terbit akan muncul saat jadwalnya dibuka."}</p>
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="activity-heading" className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-5 py-4">
              <h3 id="activity-heading" className="text-sm font-semibold">Penyelesaian terbaru</h3>
              <p className="mt-1 text-xs text-muted-foreground">Sesi ujian terakhir yang diselesaikan peserta.</p>
            </div>
            <div className="divide-y">
              {recentSessions.map((session) => (
                <div key={session.id} className="flex items-start gap-3 px-5 py-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium">{users.find((u) => u.id === session.pesertaId)?.namaLengkap ?? "Peserta"}</p>
                    <p className="mt-0.5 break-words text-xs text-muted-foreground">{semuaUjian.find((exam) => exam.id === session.ujianId)?.nama ?? "Ujian"}</p>
                    <p className="mt-1 text-xs text-muted-foreground" suppressHydrationWarning>{dateFormat.format(session.selesaiAt!)} WIB</p>
                  </div>
                </div>
              ))}
              {recentSessions.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">Belum ada sesi ujian yang selesai.</p>}
            </div>
          </section>
        </div>

        <div className="min-w-0 space-y-5">
          <section aria-labelledby="schedule-heading" className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center gap-2 border-b px-5 py-4">
              <CalendarClock className="h-4 w-4 text-primary" /><h3 id="schedule-heading" className="text-sm font-semibold">Jadwal terdekat</h3>
            </div>
            <div className="divide-y">
              {upcomingExams.map((exam) => (
                <div key={exam.id} className="space-y-2 px-5 py-4">
                  <p className="text-xs font-medium text-primary" suppressHydrationWarning>{dateFormat.format(exam.beginAt!)} WIB</p>
                  <h4 className="break-words text-sm font-medium">{exam.nama}</h4>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{exam.durasiMenit} menit</span>
                    {canAccess("/admin/ujian") && <Link to="/admin/ujian/$id" params={{ id: exam.id }} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Detail ujian<ArrowRight className="h-3 w-3" /></Link>}
                  </div>
                </div>
              ))}
              {upcomingExams.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">{search.trim() ? "Tidak ada jadwal yang cocok." : "Belum ada ujian terjadwal."}</p>}
            </div>
          </section>

          {canAccess("/admin/evaluasi") && (
            <section aria-labelledby="grading-heading" className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <ClipboardCheck className="mb-3 h-5 w-5 text-primary" />
              <h3 id="grading-heading" className="text-sm font-semibold">Koreksi jawaban</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pendingSessions.length > 0 ? `${pendingSessions.length} lembar ujian memiliki jawaban essay yang belum dinilai.` : "Tidak ada jawaban essay yang menunggu penilaian pada data yang dimuat."}</p>
              {pendingSessions.length > 0 && <Button className="mt-4" size="sm" asChild><Link to="/admin/evaluasi">Buka Evaluasi<ArrowRight className="h-3.5 w-3.5" /></Link></Button>}
            </section>
          )}

          <nav aria-label="Akses cepat" className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">Persiapan ujian</h3>
            <div className="space-y-1">
              {canAccess("/admin/modul") && <Link to="/admin/modul" className="flex items-center gap-3 rounded-md px-2 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><BookOpen className="h-4 w-4 text-primary" />Bank Soal<ArrowRight className="ml-auto h-4 w-4" /></Link>}
              {canAccess("/admin/peserta/kartu") && <Link to="/admin/peserta/kartu" className="flex items-center gap-3 rounded-md px-2 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Users className="h-4 w-4 text-primary" />Kartu Peserta<ArrowRight className="ml-auto h-4 w-4" /></Link>}
              {!canAccess("/admin/modul") && !canAccess("/admin/peserta/kartu") && <p className="text-xs text-muted-foreground">Tidak ada akses persiapan untuk peran ini.</p>}
            </div>
          </nav>
        </div>
      </div>
    </AdminPage>
  );
}
