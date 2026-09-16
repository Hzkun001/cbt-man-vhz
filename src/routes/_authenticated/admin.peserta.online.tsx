import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Clock3, MonitorPlay, RefreshCcw, Search, StopCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { AdminPage, AdminPageContent, AdminPageHeader } from "@/components/cbt/AdminPage";
import { ConfirmDialog } from "@/components/cbt/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actionLiveSesiServer, getLiveOnlineSesis } from "@/lib/server/sesi/functions";

export const Route = createFileRoute("/_authenticated/admin/peserta/online")({
  component: OnlinePage,
  loader: async () => ({ rawSesis: await getLiveOnlineSesis() }),
  validateSearch: (search: Record<string, unknown>) => ({
    ujianId: typeof search.ujianId === "string" ? search.ujianId : undefined,
  }),
});

function fmtSisa(ms: number): string {
  if (ms <= 0) return "00:00";
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type LiveSession = Awaited<ReturnType<typeof getLiveOnlineSesis>>[number];
type PendingAction = { type: "forceSubmit" | "resetPelanggaran"; session: LiveSession } | null;

function OnlinePage() {
  const { rawSesis } = Route.useLoaderData();
  const { ujianId } = Route.useSearch();
  const router = useRouter();
  const pollRef = useRef(0);
  const [now, setNow] = useState(() => Date.now());
  const [search, setSearch] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedExamName = rawSesis.find((session) => session.ujianId === ujianId)?.ujian?.nama;

  useEffect(() => {
    const timer = window.setInterval(() => {
      pollRef.current += 1;
      setNow(Date.now());
      if (pollRef.current % 15 === 0) router.invalidate();
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [router]);

  async function confirmAction() {
    if (!pendingAction || isSubmitting) return;
    const { type, session } = pendingAction;
    setIsSubmitting(true);

    try {
      const result = await actionLiveSesiServer({ data: { sesiId: session.id, action: type } });
      if (!result.ok) {
        toast.error(result.error ?? "Aksi pengawas gagal dijalankan");
        return;
      }
      toast.success(type === "forceSubmit" ? "Ujian peserta berhasil dikumpulkan" : "Catatan pelanggaran berhasil direset");
      setPendingAction(null);
      router.invalidate();
    } catch {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  }

  const { activeCount, sessions, totalPelanggaran, avgProgress } = useMemo(() => {
    const scopedSesis = ujianId
      ? rawSesis.filter((session) => session.ujianId === ujianId)
      : rawSesis;
    const enriched = scopedSesis.map((session: LiveSession) => ({
      session,
      progress: session.totalSoal > 0 ? Math.min(100, (session.dijawab / session.totalSoal) * 100) : 0,
    }));
    const query = search.trim().toLowerCase();

    return {
      activeCount: scopedSesis.length,
      sessions: enriched.filter(({ session }) =>
        !query ||
        (session.user?.namaLengkap ?? "").toLowerCase().includes(query) ||
        (session.ujian?.nama ?? "").toLowerCase().includes(query)),
      totalPelanggaran: scopedSesis.reduce((total: number, session: LiveSession) => total + session.pelanggaran, 0),
      avgProgress: enriched.length > 0
        ? enriched.reduce((total, item) => total + item.progress, 0) / enriched.length
        : 0,
    };
  }, [rawSesis, search, ujianId]);

  const targetName = pendingAction?.session.user?.namaLengkap ?? "peserta ini";
  const isForceSubmit = pendingAction?.type === "forceSubmit";

  return (
    <AdminPage className="pb-12">
      <AdminPageHeader
        title="Peserta Online"
        description={selectedExamName ? `Pantau peserta pada ujian ${selectedExamName}.` : "Pantau peserta yang sedang mengerjakan ujian dan lakukan tindakan pengawasan bila diperlukan."}
      />

      <section aria-label="Ringkasan peserta online" className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Sesi aktif</span><Users className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 text-2xl font-semibold tabular-nums">{activeCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Peserta sedang mengerjakan</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Catatan pelanggaran</span><AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <p className="mt-3 text-2xl font-semibold tabular-nums">{totalPelanggaran}</p>
          <p className="mt-1 text-xs text-muted-foreground">Pindah tab atau keluar layar</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Rata-rata progres</span><Clock3 className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 text-2xl font-semibold tabular-nums">{Math.round(avgProgress)}%</p>
          <p className="mt-1 text-xs text-muted-foreground">Soal terjawab pada sesi aktif</p>
        </div>
      </section>

      <AdminPageContent className="p-0">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Aktivitas peserta</h2>
            <p className="mt-1 text-xs text-muted-foreground">Data diperbarui otomatis setiap 15 detik.</p>
          </div>
          {ujianId && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-md bg-primary/10 px-2 py-1 font-medium text-primary">{selectedExamName ?? "Ujian dipilih"}</span>
              <Link to="/admin/peserta/online" search={{ ujianId: undefined }} className="font-medium text-primary hover:underline">Lihat semua</Link>
            </div>
          )}
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Cari peserta atau ujian" placeholder="Cari peserta atau ujian" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="divide-y">
          {sessions.map(({ session, progress }) => {
            const remaining = session.endsAt ? Math.max(0, session.endsAt - now) : 0;
            const isCritical = remaining > 0 && remaining < 300_000;

            return (
              <article key={session.id} className="grid gap-4 px-4 py-5 transition-colors hover:bg-muted/30 sm:px-5 xl:grid-cols-[minmax(14rem,1.2fr)_minmax(12rem,1fr)_7rem_9rem_auto] xl:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Users className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium text-foreground">{session.user?.namaLengkap ?? "Peserta tidak dikenal"}</h3>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{session.ujian?.nama ?? "Ujian tidak ditemukan"}</p>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{session.dijawab} dari {session.totalSoal} soal</span>
                    <span className="font-medium tabular-nums text-foreground">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Sisa waktu</p>
                  <p className={`mt-1 font-mono text-sm font-medium tabular-nums ${isCritical ? "text-destructive" : "text-foreground"}`}>{fmtSisa(remaining)}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Pengawasan</p>
                  {session.pelanggaran > 0 ? (
                    <span className="mt-1 inline-flex rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">{session.pelanggaran} pelanggaran</span>
                  ) : (
                    <span className="mt-1 inline-flex rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">Normal</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button variant="outline" size="sm" className="h-8 text-xs text-destructive" onClick={() => setPendingAction({ type: "forceSubmit", session })}>
                    <StopCircle className="h-3.5 w-3.5" />Paksa kumpulkan
                  </Button>
                  {session.pelanggaran > 0 && (
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPendingAction({ type: "resetPelanggaran", session })}>
                      <RefreshCcw className="h-3.5 w-3.5" />Reset pelanggaran
                    </Button>
                  )}
                </div>
              </article>
            );
          })}

          {sessions.length === 0 && (
            <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
              <MonitorPlay className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">{search.trim() ? "Peserta tidak ditemukan" : "Belum ada peserta aktif"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{search.trim() ? "Coba gunakan kata kunci lain." : "Sesi akan muncul ketika peserta mulai mengerjakan ujian."}</p>
            </div>
          )}
        </div>
      </AdminPageContent>

      <ConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(open) => !open && !isSubmitting && setPendingAction(null)}
        title={isForceSubmit ? "Paksa Kumpulkan Ujian" : "Reset Catatan Pelanggaran"}
        description={isForceSubmit ? `Ujian ${targetName} akan langsung dikumpulkan dan sesi ditutup.` : `Catatan pelanggaran ${targetName} akan dikembalikan menjadi 0.`}
        confirmLabel={isSubmitting ? "Memproses..." : isForceSubmit ? "Paksa Kumpulkan" : "Reset Pelanggaran"}
        icon={isForceSubmit ? <StopCircle className="h-5 w-5" /> : <RefreshCcw className="h-5 w-5" />}
        destructive={isForceSubmit}
        busy={isSubmitting}
        onConfirm={confirmAction}
      />
    </AdminPage>
  );
}
