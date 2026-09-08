import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ujianRepo, sesiRepo, usersRepo } from "@/lib/cbt/repos";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, ArrowLeft } from "lucide-react";
import { AdminPage, AdminPageContent, AdminPageHeader } from "@/components/cbt/AdminPage";

export const Route = createFileRoute("/_authenticated/admin/leaderboard/$id")({
  component: Leaderboard,
});

function Leaderboard() {
  const { id } = useParams({ from: "/_authenticated/admin/leaderboard/$id" });
  const ujian = ujianRepo.byId(id);
  if (!ujian) return <AdminPage>Tidak ditemukan</AdminPage>;
  const sesis = sesiRepo.all()
    .filter((s) => s.ujianId === id && s.status === "selesai")
    .sort((a, b) => {
      const da = (b.skorTotal ?? 0) - (a.skorTotal ?? 0);
      if (da !== 0) return da;
      return (a.selesaiAt ?? 0) - (a.mulaiAt ?? 0) - ((b.selesaiAt ?? 0) - (b.mulaiAt ?? 0));
    });
  const users = usersRepo.all();
  const podium = sesis.slice(0, 3);

  return (
    <AdminPage className="pb-12">
      <AdminPageHeader
        title={<span className="inline-flex items-center gap-2"><Trophy className="h-5 w-5 text-warning" />Leaderboard</span>}
        description={<span className="inline-flex flex-wrap items-center gap-1.5">{ujian.nama}<span aria-hidden="true">·</span>{sesis.length} peserta selesai</span>}
        action={
          <Button variant="ghost" size="sm" className="h-9" asChild>
            <Link to="/admin/leaderboard"><ArrowLeft className="mr-1 h-4 w-4" />Paket Ujian</Link>
          </Button>
        }
      />

      {sesis.length === 0 ? (
        <AdminPageContent className="p-12 text-center">
          <Trophy className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada peserta yang menyelesaikan ujian.</p>
        </AdminPageContent>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {podium.map((s, i) => {
              const u = users.find((x) => x.id === s.pesertaId);
              const podiumStyle = i === 0
                ? "border-warning/40 bg-warning/5 md:order-2 md:-translate-y-2"
                : i === 1
                  ? "border-border bg-card md:order-1"
                  : "border-primary/20 bg-primary/5 md:order-3";
              const iconStyle = i === 0 ? "bg-warning/15 text-warning" : i === 1 ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary";

              return (
                <AdminPageContent key={s.id} className={`p-5 text-center transition-transform ${podiumStyle}`}>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Peringkat {i + 1}</div>
                  <div className={`mx-auto my-3 flex h-12 w-12 items-center justify-center rounded-full ${iconStyle}`}>
                    <Trophy className="h-6 w-6" />
                  </div>
                  <div className="truncate font-semibold text-foreground">{u?.namaLengkap ?? s.pesertaId}</div>
                  <div className="mt-2 text-2xl font-bold tabular-nums text-primary">{s.skorTotal ?? 0}</div>
                  <div className="text-xs text-muted-foreground">dari {s.maxSkor ?? 0} poin</div>
                </AdminPageContent>
              );
            })}
          </div>

          <AdminPageContent className="overflow-hidden p-0">
            <div className="border-b bg-muted/20 px-4 py-3 sm:px-5">
              <h2 className="text-base font-semibold text-foreground">Peringkat Peserta</h2>
              <p className="mt-1 text-xs text-muted-foreground">Urutan berdasarkan skor tertinggi, lalu waktu pengerjaan tercepat.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-20 p-4 font-medium">Posisi</th>
                    <th className="p-4 font-medium">Peserta</th>
                    <th className="p-4 text-right font-medium">Skor</th>
                    <th className="p-4 text-right font-medium">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {sesis.map((s, i) => {
                    const u = users.find((x) => x.id === s.pesertaId);
                    const dur = s.selesaiAt && s.mulaiAt ? Math.max(0, Math.round((s.selesaiAt - s.mulaiAt) / 1000)) : 0;
                    const mm = Math.floor(dur / 60);
                    const ss = dur % 60;
                    const rankStyle = i === 0 ? "bg-warning/15 text-warning" : i === 1 ? "bg-muted text-muted-foreground" : i === 2 ? "bg-primary/10 text-primary" : "bg-muted/60 text-muted-foreground";

                    return (
                      <tr key={s.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                        <td className="p-4">
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-md font-semibold ${rankStyle}`}>{i + 1}</span>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-foreground">{u?.namaLengkap ?? s.pesertaId}</div>
                          {u?.username && <div className="mt-0.5 text-xs text-muted-foreground">{u.username}</div>}
                        </td>
                        <td className="p-4 text-right font-semibold tabular-nums text-foreground">{s.skorTotal ?? 0}<span className="font-normal text-muted-foreground"> / {s.maxSkor ?? 0}</span></td>
                        <td className="p-4 text-right text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{mm}m {ss}s</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </AdminPageContent>
        </>
      )}
    </AdminPage>
  );
}
