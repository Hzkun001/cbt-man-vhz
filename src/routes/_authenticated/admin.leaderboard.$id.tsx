import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ujianRepo, sesiRepo, usersRepo } from "@/lib/cbt/repos";
import { useEffect, useState } from "react";
import { Card as AntCard, ConfigProvider, Empty, Table, Tag, theme as antdTheme } from "antd";
import { Button } from "@/components/ui/button";
import { AdminPage, AdminPageHeader } from "@/components/cbt/AdminPage";
import { ArrowLeft, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/leaderboard/$id")({
  component: Leaderboard,
});

function Leaderboard() {
  const { id } = useParams({ from: "/_authenticated/admin/leaderboard/$id" });
  const ujian = ujianRepo.byId(id);
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  if (!ujian) return <div className="space-y-4"><p>Paket ujian tidak ditemukan.</p><Button asChild variant="outline"><Link to="/admin/leaderboard"><ArrowLeft size={16} />Kembali ke Leaderboard</Link></Button></div>;
  const sesis = sesiRepo.all()
    .filter((s) => s.ujianId === id && s.status === "selesai")
    .sort((a, b) => {
      const da = (b.skorTotal ?? 0) - (a.skorTotal ?? 0);
      if (da !== 0) return da;
      return (a.selesaiAt ?? 0) - (a.mulaiAt ?? 0) - ((b.selesaiAt ?? 0) - (b.mulaiAt ?? 0));
    });
  const users = usersRepo.all();

  const rows = sesis.map((s, index) => {
    const peserta = users.find((u) => u.id === s.pesertaId);
    const durasi = s.selesaiAt && s.mulaiAt ? Math.round((s.selesaiAt - s.mulaiAt) / 1000) : 0;
    return { id: s.id, peringkat: index + 1, nama: peserta?.namaLengkap ?? "Peserta tidak ditemukan", skor: s.skorTotal, maxSkor: s.maxSkor, waktu: `${Math.floor(durasi / 60)}m ${durasi % 60}s` };
  });

  return (
    <ConfigProvider theme={{ algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm, token: { colorPrimary: "#16a34a", borderRadius: 12, fontFamily: "inherit" } }}>
      <AdminPage className="flex flex-col gap-6 space-y-0 pb-8">
        <div>
          <Button asChild variant="outline" className="w-fit gap-2">
            <Link to="/admin/leaderboard"><ArrowLeft size={16} aria-hidden="true" />Kembali ke Leaderboard</Link>
          </Button>
        </div>
        <AdminPageHeader title={ujian.nama} description="Peringkat berdasarkan skor tertinggi. Skor yang sama diurutkan berdasarkan waktu pengerjaan tercepat." />
        <div className="grid gap-4 sm:grid-cols-3">
          <AntCard><p className="text-sm text-muted-foreground">Sesi selesai</p><p className="mt-2 text-2xl font-semibold">{sesis.length}</p></AntCard>
          <AntCard><p className="text-sm text-muted-foreground">Skor tertinggi</p><p className="mt-2 text-2xl font-semibold">{sesis.length ? `${sesis[0].skorTotal ?? 0} / ${sesis[0].maxSkor}` : "—"}</p></AntCard>
          <AntCard><p className="text-sm text-muted-foreground">Durasi ujian</p><p className="mt-2 text-2xl font-semibold">{ujian.durasiMenit} <span className="text-sm font-normal text-muted-foreground">menit</span></p></AntCard>
        </div>
        <AntCard title={<span className="inline-flex items-center gap-2"><Trophy size={18} className="text-amber-500" aria-hidden="true" />Peringkat Peserta</span>} styles={{ body: { padding: 0 } }} className="overflow-hidden">
          <Table
            rowKey="id"
            dataSource={rows}
            scroll={{ x: 600 }}
            pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
            locale={{ emptyText: <Empty description="Belum ada sesi peserta yang selesai." /> }}
            columns={[
              { title: "Peringkat", dataIndex: "peringkat", width: 120, render: (peringkat: number) => <Tag color={peringkat === 1 ? "gold" : peringkat === 2 ? "blue" : peringkat === 3 ? "orange" : "default"}>#{peringkat}</Tag> },
              { title: "Peserta", dataIndex: "nama", render: (nama: string) => <span className="font-medium">{nama}</span> },
              { title: "Skor", key: "skor", width: 160, render: (_, row) => <span className="font-semibold text-primary">{row.skor ?? 0} <span className="font-normal text-muted-foreground">/ {row.maxSkor}</span></span> },
              { title: "Waktu Pengerjaan", dataIndex: "waktu", width: 180 },
            ]}
          />
        </AntCard>
      </AdminPage>
    </ConfigProvider>
  );
}
