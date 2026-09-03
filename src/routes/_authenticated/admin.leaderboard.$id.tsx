import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ujianRepo, sesiRepo, usersRepo } from "@/lib/cbt/repos";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { AdminPage, AdminPageHeader } from "@/components/cbt/AdminPage";

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

  return (
    <AdminPage className="w-full pb-12">
      <AdminPageHeader
        title={<span className="inline-flex items-center gap-2"><Trophy className="h-5 w-5 text-warning" />Leaderboard</span>}
        description={ujian.nama}
        action={<Link to="/admin/leaderboard" className="text-sm text-muted-foreground hover:text-foreground">← Paket ujian</Link>}
      />
      <Card className="w-full">
        <CardContent className="overflow-x-auto p-0">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="border-b bg-muted/40 text-left"><tr><th className="w-16 p-4">#</th><th className="p-4">Peserta</th><th className="p-4">Skor</th><th className="p-4">Waktu</th></tr></thead>
          <tbody>
            {sesis.map((s, i) => {
              const u = users.find((x) => x.id === s.pesertaId);
              const dur = s.selesaiAt && s.mulaiAt ? Math.round((s.selesaiAt - s.mulaiAt) / 1000) : 0;
              const mm = Math.floor(dur / 60), ss = dur % 60;
              return (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="p-4 font-bold">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
                  <td className="p-4">{u?.namaLengkap}</td>
                  <td className="p-4 font-medium">{s.skorTotal} / {s.maxSkor}</td>
                  <td className="p-4 text-xs">{mm}m {ss}s</td>
                </tr>
              );
            })}
            {sesis.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Belum ada peserta selesai.</td></tr>}
          </tbody>
        </table>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
