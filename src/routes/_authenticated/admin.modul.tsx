import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { z } from "zod";
import {
  Button as AntButton,
  Card as AntCard,
  ConfigProvider,
  Empty,
  Input as AntInput,
  Select as AntSelect,
  Space,
  Tooltip,
  Typography,
  theme as antdTheme,
} from "antd";
import { modulRepo, topikRepo, soalRepo, mataKuliahRepo } from "@/lib/cbt/repos";
import { uid } from "@/lib/cbt/storage";
import { ModulSchema, TopikSchema, SoalSchema, type Modul } from "@/lib/cbt/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  ChevronRight,
  Upload,
  FileText,
  Download,
  FileUp,
  Lock,
  Pencil,
  AlertTriangle,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/lib/cbt/auth-store";
import { visibleModuls, allowedTopikIdSet, isUnrestricted } from "@/lib/cbt/access";
import { filterModuls } from "@/lib/cbt/modul-filter.mjs";
import { AdminPage, AdminPageHeader, AdminPageContent } from "@/components/cbt/AdminPage";
import { useConfirmDialog } from "@/components/cbt/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/admin/modul")({
  component: ModulRoute,
});

const BankSchema = z.object({
  app: z.literal("cbtman-bank"),
  version: z.literal(1),
  modul: ModulSchema,
  topik: z.array(TopikSchema),
  soal: z.array(SoalSchema),
});
type Bank = z.infer<typeof BankSchema>;

function ModulRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isIndexRoute = pathname === "/admin/modul" || pathname === "/admin/modul/";

  if (!isIndexRoute) {
    return <Outlet />;
  }

  return <ModulPage />;
}

function ModulPage() {
  const { confirm, dialog } = useConfirmDialog();
  const user = useAuthStore((s) => s.user);
  const canEdit = isUnrestricted(user);
  const [moduls, setModuls] = useState<Modul[]>(visibleModuls(user));
  const allowedSet = allowedTopikIdSet(user);
  const mkList = mataKuliahRepo.all();
  const [nama, setNama] = useState("");
  const [mkId, setMkId] = useState<string>("none");
  const [query, setQuery] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [editingModul, setEditingModul] = useState<Modul | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const syncColorScheme = () => setIsDark(root.classList.contains("dark"));
    const observer = new MutationObserver(syncColorScheme);
    syncColorScheme();
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const shown = filterModuls(moduls, query);

  function add() {
    if (!canEdit) return;
    if (!nama.trim()) {
      toast.error("Nama modul wajib diisi");
      return;
    }
    if (mkId === "none" || !mkId) {
      toast.error("Wajib memilih Mata Kuliah untuk modul baru!");
      return;
    }
    modulRepo.upsert({ id: uid("m_"), nama: nama.trim(), aktif: true, mataKuliahId: mkId });
    setNama("");
    setMkId("none");
    setModuls(visibleModuls(user));
    toast.success("Modul ditambahkan");
  }

  async function remove(id: string) {
    if (!canEdit) return;
    const topiks = topikRepo.all().filter((t) => t.modulId === id);
    if (topiks.length) {
      toast.error("Hapus topik di dalam modul ini dulu");
      return;
    }
    if (
      !(await confirm({
        title: "Hapus modul",
        description: "Hapus modul ini?",
        confirmLabel: "Hapus",
      }))
    )
      return;
    modulRepo.remove(id);
    setModuls(visibleModuls(user));
    toast.success("Modul dihapus");
  }

  function exportBank(modul: Modul) {
    let topik = topikRepo.all().filter((t) => t.modulId === modul.id);
    if (!canEdit && allowedSet) {
      topik = topik.filter((t) => allowedSet.has(t.id));
    }
    const tIds = new Set(topik.map((t) => t.id));
    const soal = soalRepo.all().filter((s) => tIds.has(s.topikId));
    const bank: Bank = { app: "cbtman-bank", version: 1, modul, topik, soal };
    const blob = new Blob([JSON.stringify(bank, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${modul.nama.replace(/\s+/g, "_")}.bank.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importBank(file: File) {
    if (!canEdit) {
      toast.error("Import bank JSON hanya untuk admin / operator tanpa batasan topik");
      return;
    }
    try {
      const raw = JSON.parse(await file.text());
      const bank = BankSchema.parse(raw);

      const validMkId = bank.modul.mataKuliahId;
      if (!validMkId || !mkList.some((mk) => mk.id === validMkId)) {
        toast.error(
          "Mata Kuliah pada file import tidak valid atau sudah dihapus. Import dibatalkan.",
        );
        return;
      }

      const newModul = { ...bank.modul, id: uid("m_"), nama: bank.modul.nama + " (import)" };
      const idMap: Record<string, string> = {};
      const newTopik = bank.topik.map((t) => {
        const nid = uid("t_");
        idMap[t.id] = nid;
        return { ...t, id: nid, modulId: newModul.id };
      });
      const newSoal = bank.soal.map((s) => ({
        ...s,
        id: uid("s_"),
        topikId: idMap[s.topikId] ?? s.topikId,
        jawaban: s.jawaban.map((j) => ({ ...j, id: uid("j_") })),
      }));
      modulRepo.upsert(newModul);
      newTopik.forEach((t) => topikRepo.upsert(t));
      newSoal.forEach((s) => soalRepo.upsert(s));
      setModuls(visibleModuls(user));
      toast.success(
        `Bank diimport: ${newModul.nama} — ${newTopik.length} topik, ${newSoal.length} soal`,
      );
    } catch (err) {
      console.error(err);
      toast.error("Gagal: format file tidak valid");
    }
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: "#16a34a", borderRadius: 14, fontFamily: "inherit" },
      }}
    >
      <AdminPage className="flex flex-col gap-6 space-y-0 pb-8">
        <AdminPageHeader
          title="Bank Soal"
          description="Mata Kuliah → Modul → Topik → Soal. Kelola soal sebelum dimasukkan ke paket ujian."
          action={
            canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={importRef}
                  type="file"
                  accept="application/json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importBank(f);
                    e.target.value = "";
                  }}
                />
                <AntButton
                  size="large"
                  onClick={() => importRef.current?.click()}
                  icon={<FileUp size={17} aria-hidden="true" />}
                >
                  Import JSON
                </AntButton>
                <Link to="/admin/modul/import">
                  <AntButton size="large" icon={<Upload size={17} aria-hidden="true" />}>
                    Import Excel
                  </AntButton>
                </Link>
              </div>
            )
          }
        />

        {/* Search */}
        <AntInput
          allowClear
          aria-label="Cari modul"
          placeholder="Cari modul..."
          prefix={<Search size={17} aria-hidden="true" className="text-slate-500" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="!h-12 w-full sm:!w-[27rem]"
        />

        {canEdit && (
          <AntCard
            title={
              <div>
                <Typography.Text strong>Buat Modul Baru</Typography.Text>
                <Typography.Text type="secondary" className="mt-1 block text-sm">
                  Tambahkan modul dan hubungkan dengan mata kuliah.
                </Typography.Text>
              </div>
            }
            styles={{ body: { padding: 20 } }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
              className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
            >
              <div className="space-y-1.5">
                <Typography.Text strong>Nama Modul</Typography.Text>
                <AntInput
                  id="new-module-name"
                  size="large"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Modul Pemrograman Dasar"
                />
              </div>
              <div className="space-y-1.5">
                <Typography.Text strong>Mata Kuliah</Typography.Text>
                <AntSelect
                  aria-label="Mata Kuliah"
                  value={mkId}
                  onChange={setMkId}
                  size="large"
                  className="w-full"
                  options={[
                    { value: "none", label: "Pilih Mata Kuliah", disabled: true },
                    ...mkList.map((mataKuliah) => ({
                      value: mataKuliah.id,
                      label: mataKuliah.nama,
                    })),
                  ]}
                />
              </div>
              <AntButton
                type="primary"
                htmlType="submit"
                size="large"
                icon={<Plus size={17} aria-hidden="true" />}
                disabled={!nama.trim() || mkId === "none"}
              >
                Buat Modul
              </AntButton>
            </form>
          </AntCard>
        )}

        <AdminPageContent className="bg-transparent border-0 p-0 shadow-none">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((m) => {
              const tAll = topikRepo.all().filter((t) => t.modulId === m.id);
              const t = allowedSet ? tAll.filter((x) => allowedSet.has(x.id)) : tAll;
              const tIds = new Set(t.map((x) => x.id));
              const sCount = soalRepo.all().filter((s) => tIds.has(s.topikId)).length;
              const mkName = m.mataKuliahId
                ? mkList.find((x) => x.id === m.mataKuliahId)?.nama
                : null;

              return (
                <AntCard
                  key={m.id}
                  className="group relative flex flex-col justify-between rounded-[20px] hover:border-primary/40 gap-4 overflow-hidden"
                  styles={{
                    body: {
                      display: "flex",
                      flex: 1,
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 16,
                      padding: 20,
                    },
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 dark:bg-primary/10 text-primary group-hover:bg-primary/15 dark:group-hover:bg-primary/20 transition-colors duration-300 ease-spring">
                      <FileText className="h-6 w-6 translate-y-[-0.5px]" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5 pt-1">
                      <Link
                        to="/admin/modul/$id/topik"
                        params={{ id: m.id }}
                        className="text-base font-semibold text-slate-900 dark:text-slate-100 hover:text-primary dark:hover:text-primary transition-colors duration-300 ease-spring line-clamp-2 after:absolute after:inset-0"
                      >
                        {m.nama}
                      </Link>
                      {mkName ? (
                        <div className="relative z-10">
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold tracking-widest uppercase text-slate-500">
                            {mkName}
                          </span>
                        </div>
                      ) : (
                        <div className="relative z-10">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/40 text-[10px] font-bold tracking-wider uppercase text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                            <AlertTriangle className="h-3 w-3" /> Tanpa Mata Kuliah
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-slate-400 translate-y-[-0.5px]" />{" "}
                        {t.length} Topik
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ChevronRight className="w-4 h-4 text-slate-400 translate-y-[-0.5px]" />{" "}
                        {sCount} Soal
                      </span>
                    </div>

                    <div className="flex items-center gap-1 relative z-10">
                      {canEdit && (
                        <Tooltip title="Edit modul">
                          <AntButton
                            aria-label={`Edit modul ${m.nama}`}
                            type="text"
                            icon={<Pencil size={17} />}
                            onClick={() => {
                              setEditingModul(m);
                              setEditDialogOpen(true);
                            }}
                          />
                        </Tooltip>
                      )}
                      <Tooltip title="Export JSON">
                        <AntButton
                          aria-label={`Export JSON ${m.nama}`}
                          type="text"
                          icon={<Download size={17} />}
                          onClick={() => exportBank(m)}
                        />
                      </Tooltip>
                      {canEdit && (
                        <Tooltip title="Hapus modul">
                          <AntButton
                            aria-label={`Hapus modul ${m.nama}`}
                            type="text"
                            danger
                            icon={<Trash2 size={17} />}
                            onClick={() => remove(m.id)}
                          />
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </AntCard>
              );
            })}
            {shown.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-8 dark:border-slate-800">
                <Empty
                  image={<FileText className="mx-auto h-8 w-8 text-slate-300" />}
                  description="Belum ada modul bank soal."
                />
              </div>
            )}
          </div>
        </AdminPageContent>

        <EditModulDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          modul={editingModul}
          mkList={mkList}
          onSaved={() => setModuls(visibleModuls(user))}
        />
        {dialog}
      </AdminPage>
    </ConfigProvider>
  );
}

function EditModulDialog({
  open,
  onOpenChange,
  modul,
  mkList,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modul: Modul | null;
  mkList: ReturnType<typeof mataKuliahRepo.all>;
  onSaved: () => void;
}) {
  const [nama, setNama] = useState(modul?.nama ?? "");
  const [mkId, setMkId] = useState(modul?.mataKuliahId ?? "none");

  // Sync state on open
  useEffect(() => {
    if (open && modul) {
      setNama(modul.nama);
      setMkId(modul.mataKuliahId ?? "none");
    }
  }, [open, modul]);

  function save() {
    if (!modul) return;
    if (!nama.trim()) {
      toast.error("Nama modul tidak boleh kosong");
      return;
    }
    if (mkId === "none" || !mkId) {
      toast.error("Pilih Mata Kuliah yang valid");
      return;
    }
    modulRepo.upsert({
      ...modul,
      nama: nama.trim(),
      mataKuliahId: mkId,
    });
    toast.success("Modul berhasil diperbarui");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Modul Bank Soal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nama Modul</Label>
            <Input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Modul Pemrograman Dasar"
            />
          </div>
          <div className="space-y-2">
            <Label>Mata Kuliah *</Label>
            <Select value={mkId} onValueChange={setMkId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Mata Kuliah" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>
                  Pilih Mata Kuliah
                </SelectItem>
                {mkList.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={save}>Simpan Perubahan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
