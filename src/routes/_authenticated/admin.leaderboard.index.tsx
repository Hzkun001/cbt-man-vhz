import { createFileRoute, Link } from "@tanstack/react-router";
import { Card as AntCard, ConfigProvider, Empty, Input as AntInput, Tag, theme as antdTheme } from "antd";
import { useEffect, useState } from "react";
import { ujianRepo, sesiRepo } from "@/lib/cbt/repos";
import { Trophy, ChevronRight, Search, Users } from "lucide-react";
import { AdminPage, AdminPageHeader } from "@/components/cbt/AdminPage";

export const Route = createFileRoute("/_authenticated/admin/leaderboard/")({
  component: LeaderboardIndex,
});

function LeaderboardIndex() {
  const ujian = ujianRepo.all();
  const sesi = sesiRepo.all();
  const [query, setQuery] = useState("");
  const shown = ujian.filter((u) => u.nama.toLowerCase().includes(query.toLowerCase()));
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const syncColorScheme = () => setIsDark(root.classList.contains("dark"));
    const observer = new MutationObserver(syncColorScheme);
    syncColorScheme();
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: "#16a34a", borderRadius: 12, fontFamily: "inherit" },
      }}
    >
      <AdminPage className="flex flex-col gap-6 space-y-0 pb-8">
        <AdminPageHeader title="Leaderboard" description="Pilih paket ujian untuk melihat peringkat peserta." />
        <AntCard styles={{ body: { padding: 16 } }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <AntInput size="large" allowClear aria-label="Cari paket ujian" placeholder="Cari paket ujian..." prefix={<Search size={17} className="text-slate-400" />} value={query} onChange={(e) => setQuery(e.target.value)} className="w-full sm:!w-96" />
            <span className="text-sm text-muted-foreground">{shown.length} paket ujian</span>
          </div>
        </AntCard>
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((u) => {
            const n = sesi.filter((s) => s.ujianId === u.id && s.status === "selesai").length;
            return (
              <AntCard key={u.id} className="h-full overflow-hidden" styles={{ body: { padding: 0 } }}>
                <Link to="/admin/leaderboard/$id" params={{ id: u.id }} className="group flex h-full flex-col gap-4 p-5 text-foreground hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30"><Trophy size={22} aria-hidden="true" /></div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold leading-snug group-hover:text-primary">{u.nama}</h2>
                      <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><Users size={15} aria-hidden="true" />{n} sesi selesai</div>
                    </div>
                    <Tag color={n > 0 ? "green" : "default"}>{n > 0 ? "Hasil tersedia" : "Belum ada hasil"}</Tag>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-border pt-4 text-sm">
                    <span className="font-medium text-primary">Lihat Peringkat</span>
                    <ChevronRight size={17} aria-hidden="true" className="text-muted-foreground group-hover:text-primary" />
                  </div>
                </Link>
              </AntCard>
            );
          })}
          {shown.length === 0 && <AntCard className="lg:col-span-2"><Empty description={ujian.length === 0 ? "Belum ada paket ujian." : "Tidak ada paket ujian yang sesuai pencarian."} /></AntCard>}
        </div>
      </AdminPage>
    </ConfigProvider>
  );
}
