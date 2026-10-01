import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button as AntButton, Card as AntCard, Empty, Tag, ConfigProvider, Input as AntInput, Segmented, theme as antdTheme } from "antd";
import { ujianRepo, sesiRepo, mataKuliahRepo, penawaranRepo } from "@/lib/cbt/repos";
import { useAuthStore } from "@/lib/cbt/auth-store";
import { uid } from "@/lib/cbt/storage";
import type { Ujian } from "@/lib/cbt/types";
import {
  Plus,
  BarChart3,
  PlayCircle,
  Clock,
  CheckCircle2,
  Users,
  ArrowUpRight,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { visibleUjians } from "@/lib/cbt/access";
import { AdminPage, AdminPageHeader } from "@/components/cbt/AdminPage";

export const Route = createFileRoute("/_authenticated/admin/ujian")({
	component: UjianRoute,
});

function UjianRoute() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isIndexRoute = pathname === "/admin/ujian" || pathname === "/admin/ujian/";
  if (!isIndexRoute) return <Outlet />;
  return <UjianList />;
}

function UjianList() {
  const user = useAuthStore((s) => s.user)!;
  const navigate = useNavigate();
  const [list, setList] = useState<Ujian[]>(visibleUjians(user));
  const [activeTab, setActiveTab] = useState<"semua" | "persiapan" | "berlangsung" | "selesai">("semua");
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const syncColorScheme = () => setIsDark(root.classList.contains("dark"));
    const observer = new MutationObserver(syncColorScheme);
    syncColorScheme();
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  async function add() {
    if (isAdding) return;
    setIsAdding(true);
    const u: Ujian = {
      id: uid("ex_"),
      nama: "Ujian Baru",
      status: "draft",
      deskripsi: "",
      durasiMenit: 30,
      poinBenar: 1,
      poinSalah: 0,
      poinKosong: 0,
      tokenAktif: false,
      ipRange: "",
      groupIds: [],
      topicSets: [],
      showResult: true,
      showResultDetail: false,
      fullscreenWajib: true,
      maxPindahTab: 3,
      blokirShortcut: true,
      mode: "online",
      allowCalculator: false,
      allowNilaiNormal: false,
      createdBy: user.id,
      createdAt: Date.now(),
    };
    ujianRepo.upsert(u);
    const result = await ujianRepo.flush();
    setIsAdding(false);
    if (!result.ok) {
      toast.error(result.error || "Gagal membuat ujian");
      return;
    }
    toast.success("Ujian baru dibuat");
    navigate({ to: "/admin/ujian/$id", params: { id: u.id } });
  }

  const now = Date.now();
  
  const filteredList = list.filter(u => 
    u.nama.toLowerCase().includes(search.toLowerCase())
  );

  const persiapan = filteredList.filter(
    (u) => u.status === "draft" || !u.beginAt || !u.endAt || u.beginAt > now,
  );
  const berlangsung = filteredList.filter(
    (u) => u.status === "published" && u.beginAt && u.endAt && u.beginAt <= now && u.endAt >= now,
  );
  const selesai = filteredList.filter(
    (u) => u.status === "published" && u.endAt && u.endAt < now,
  );

  const renderRow = (u: Ujian, type: "persiapan" | "berlangsung" | "selesai") => {
    const sesiCount = sesiRepo.all().filter((s) => s.ujianId === u.id).length;
    const soalCount = u.topicSets.reduce((a, b) => a + b.jumlah, 0);
    const mk = u.mataKuliahId ? mataKuliahRepo.byId(u.mataKuliahId) : null;
    const kelas = u.penawaranId ? penawaranRepo.byId(u.penawaranId) : undefined;

    return (
      <AntCard key={u.id} className="h-full overflow-hidden" styles={{ body: { padding: 20 } }}>
        <Link to="/admin/ujian/$id" params={{ id: u.id }} className="group block rounded-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${type === "berlangsung" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40" : type === "persiapan" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
            {type === "persiapan" ? <Clock size={22} /> : type === "berlangsung" ? <PlayCircle size={22} /> : <CheckCircle2 size={22} />}
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            <Tag color={type === "berlangsung" ? "green" : type === "persiapan" ? "gold" : "default"}>{type === "persiapan" ? "Persiapan" : type === "berlangsung" ? "Berlangsung" : "Selesai"}</Tag>
            <Tag>{u.status === "published" ? "Dipublikasikan" : "Draft"}</Tag>
          </div>
        </div>
        <div className="mt-4">
          <h2 className="text-base font-semibold leading-snug group-hover:text-primary">{u.nama}</h2>
          <div className="mt-2 flex min-h-5 flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {mk && <span>{mk.nama}</span>}
            {kelas && <span>Kelas {kelas.kodeKelas || "-"} · {kelas.pesertaIds.length} peserta terdaftar</span>}
            {!mk && !kelas && <span>Paket ujian umum</span>}
          </div>
        </div>
        <div className="my-4 grid grid-cols-3 divide-x divide-border rounded-lg bg-muted/40 py-3 text-sm">
          <div className="flex flex-col items-center gap-1"><span className="font-semibold">{soalCount}</span><span className="text-xs text-muted-foreground">Soal</span></div>
          <div className="flex flex-col items-center gap-1"><span className="font-semibold">{u.durasiMenit} menit</span><span className="text-xs text-muted-foreground">Durasi</span></div>
          <div className="flex flex-col items-center gap-1"><span className="font-semibold">{sesiCount}</span><span className="text-xs text-muted-foreground">Sesi peserta</span></div>
        </div>
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <Link to="/admin/ujian/$id" params={{ id: u.id }} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Buka Paket <ArrowUpRight size={16} /></Link>
          <div className="flex flex-wrap gap-2">
            {type === "berlangsung" && <Link to="/admin/peserta/online" search={{ ujianId: u.id }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"><PlayCircle size={15} />Pantau</Link>}
            {type === "selesai" && <Link to="/admin/analitik/$id" params={{ id: u.id }} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted"><BarChart3 size={15} />Analitik</Link>}
            <Link to="/admin/ujian/$id/peserta" params={{ id: u.id }} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted"><Users size={15} />Peserta</Link>
          </div>
        </div>
      </AntCard>
    );
  };

  const tabs = [
    { id: "semua", label: "Semua Paket", count: filteredList.length },
    { id: "persiapan", label: "Persiapan", count: persiapan.length },
    { id: "berlangsung", label: "Berlangsung", count: berlangsung.length },
    { id: "selesai", label: "Selesai", count: selesai.length },
  ] as const;

  const currentList = 
    activeTab === "persiapan" ? persiapan :
    activeTab === "berlangsung" ? berlangsung :
    activeTab === "selesai" ? selesai : filteredList;

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: "#16a34a", borderRadius: 12, fontFamily: "inherit" },
        components: {
          Segmented: {
            itemHoverBg: isDark ? "rgba(74, 222, 128, 0.1)" : "rgba(22, 163, 74, 0.08)",
            itemHoverColor: isDark ? "#86efac" : "#15803d",
            itemActiveBg: isDark ? "rgba(74, 222, 128, 0.16)" : "rgba(22, 163, 74, 0.14)",
            itemSelectedBg: isDark ? "rgba(22, 163, 74, 0.22)" : "#dcfce7",
            itemSelectedColor: isDark ? "#86efac" : "#166534",
          },
        },
      }}
    >
    <AdminPage className="flex flex-col gap-6 space-y-0 pb-8">
      
      <AdminPageHeader
        title="Manajemen Paket Ujian"
        description="Kelola pembuatan ujian, soal, dan akses peserta."
        action={
          <AntButton type="primary" onClick={add} loading={isAdding} size="large" icon={<Plus size={17} aria-hidden="true" />}>Paket Baru</AntButton>
        }
      />

      {/* Toolbar & Filters */}
      <AntCard styles={{ body: { padding: 16 } }}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <Segmented
          value={activeTab}
          onChange={(value) => setActiveTab(value as typeof activeTab)}
          options={tabs.map((tab) => ({
            value: tab.id,
            label: <span className="inline-flex items-center gap-2 whitespace-nowrap">{tab.label}<span className="inline-flex h-5 min-w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 px-1.5 text-[10px] leading-none dark:bg-slate-700">{tab.count}</span></span>,
          }))}
          className="max-w-full overflow-x-auto"
          size="large"
        />
        
        <div className="w-full md:w-72 px-1.5 md:px-0 pb-1.5 md:pb-0">
          <AntInput
            allowClear
            aria-label="Cari ujian"
            prefix={<Search size={17} aria-hidden="true" className="text-slate-500" />}
            placeholder="Cari ujian..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="large"
          />
        </div>
      </div>

      </AntCard>

      <div className="flex items-center justify-between text-sm">
        <h2 className="font-semibold">Daftar Paket Ujian</h2>
        <span className="text-muted-foreground">{currentList.length} paket ditampilkan</span>
      </div>
      {/* Daftar paket */}
      <div>
        {currentList.length === 0 ? (
          <AntCard><Empty description="Tidak ada paket ujian yang sesuai pencarian atau kategori ini." /></AntCard>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {currentList.map(u => {
              const status = u.status === "draft" || !u.beginAt || !u.endAt || u.beginAt > now
                ? "persiapan"
                : u.beginAt <= now && u.endAt >= now
                  ? "berlangsung"
                  : "selesai";
              return renderRow(u, status);
            })}
          </div>
        )}
      </div>
    </AdminPage>
    </ConfigProvider>
  );
}
