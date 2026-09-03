import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { z } from "zod";
import { modulRepo, topikRepo, soalRepo, mataKuliahRepo } from "@/lib/cbt/repos";
import { uid } from "@/lib/cbt/storage";
import { ModulSchema, TopikSchema, SoalSchema, type Modul } from "@/lib/cbt/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronRight, Upload, FileText, Download, FileUp, Lock, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuthStore } from "@/lib/cbt/auth-store";
import { visibleModuls, allowedTopikIdSet, isUnrestricted } from "@/lib/cbt/access";
import { filterModuls } from "@/lib/cbt/modul-filter.mjs";
import { AdminPage, AdminPageHeader, AdminPageContent } from "@/components/cbt/AdminPage";

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
  const user = useAuthStore((s) => s.user);
  const canEdit = isUnrestricted(user);
  const [moduls, setModuls] = useState<Modul[]>(visibleModuls(user));
  const allowedSet = allowedTopikIdSet(user);
  const mkList = mataKuliahRepo.all();
  const [nama, setNama] = useState("");
  const [mkId, setMkId] = useState<string>("none");
  const [query, setQuery] = useState("");
  const [editingModul, setEditingModul] = useState<Modul | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const shown = filterModuls(moduls, query);

  function add() {
    if (!canEdit) return;
    if (!nama.trim()) {
      toast.error("Nama modul wajib diisi");
      return;
    }
    modulRepo.upsert({ id: uid("m_"), nama: nama.trim(), aktif: true, mataKuliahId: mkId === "none" ? undefined : mkId });
    setNama("");
    setMkId("none");
    setModuls(visibleModuls(user));
    toast.success("Modul ditambahkan");
  }

  function remove(id: string) {
    if (!canEdit) return;
    const topiks = topikRepo.all().filter((t) => t.modulId === id);
    if (topiks.length) {
      toast.error("Hapus topik di dalam modul ini dulu");
      return;
    }
    if (!confirm("Hapus modul ini?")) return;
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
      if (validMkId && !mkList.some(mk => mk.id === validMkId)) {
        toast.error("Mata Kuliah pada file import sudah dihapus. Import dibatalkan.");
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
    <AdminPage className="">
      <AdminPageHeader
        title="Bank Soal"
        description="Lihat modul, topik, dan jumlah soal dalam satu halaman sebelum dirakit menjadi ujian."
        action={
          canEdit && (
            <div className="flex items-center gap-2">
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
              <Button size="sm" variant="outline" onClick={() => importRef.current?.click()} className="h-9">
                <FileUp className="mr-2 h-4 w-4" /> Import JSON
              </Button>
              <Button size="sm" variant="outline" className="h-9" asChild>
                <Link to="/admin/modul/import"><Upload className="mr-2 h-4 w-4" /> Import Excel</Link>
              </Button>
            </div>
          )
        }
      />

      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari modul..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 pl-9"
        />
      </div>

      {canEdit && (
        <AdminPageContent className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Buat Modul Baru</h2>
            <p className="mt-1 text-xs text-muted-foreground">Mata kuliah bersifat opsional untuk membantu mengelompokkan bank soal.</p>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); add(); }}
            className="grid gap-4 p-4 sm:grid-cols-3 sm:items-start"
          >
            <div className="space-y-1.5">
              <Label htmlFor="new-module-name" className="block h-3.5 text-xs leading-3.5">Nama modul</Label>
              <Input
                id="new-module-name"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Pemrograman Dasar"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-module-course" className="block h-3.5 text-xs leading-3.5">Mata kuliah (opsional)</Label>
              <Select value={mkId} onValueChange={setMkId}>
                <SelectTrigger id="new-module-course">
                  <SelectValue placeholder="Pilih Mata Kuliah" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">(Tanpa Mata Kuliah)</SelectItem>
                  {mkList.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full sm:mt-5" disabled={!nama.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Buat Modul
            </Button>
          </form>
        </AdminPageContent>
      )}

      <AdminPageContent className="bg-transparent border-0 p-0 shadow-none">
        <div className="space-y-3">
          {shown.map((m) => {
            const tAll = topikRepo.all().filter((t) => t.modulId === m.id);
            const t = allowedSet ? tAll.filter((x) => allowedSet.has(x.id)) : tAll;
            const tIds = new Set(t.map((x) => x.id));
            const sCount = soalRepo.all().filter((s) => tIds.has(s.topikId)).length;
            const mkName = m.mataKuliahId ? mkList.find((x) => x.id === m.mataKuliahId)?.nama : null;

            return (
              <AdminPageContent key={m.id} className="overflow-hidden">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <Link to="/admin/modul/$id/topik" params={{ id: m.id }} className="block truncate text-base font-semibold text-slate-900 hover:text-primary dark:text-slate-100 dark:hover:text-primary">
                        {m.nama}
                      </Link>
                      {mkName ? (
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800">
                          {mkName}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800">
                          Umum
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                    <span>{t.length} topik</span>
                    <span>{sCount} soal</span>
                    <Button size="sm" variant="outline" className="h-8" asChild>
                      <Link to="/admin/modul/$id/topik" params={{ id: m.id }}>Kelola Topik</Link>
                    </Button>
                    {canEdit && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => { setEditingModul(m); setEditDialogOpen(true); }} title="Edit Modul">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => exportBank(m)} title="Export JSON">
                      <Download className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => remove(m.id)} title="Hapus">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800">
                  {t.length > 0 ? (
                    <div className="grid gap-px bg-slate-100 sm:grid-cols-2 dark:bg-slate-800">
                      {t.map((topic) => {
                        const questionCount = soalRepo.all().filter((s) => s.topikId === topic.id).length;
                        return (
                          <Link
                            key={topic.id}
                            to="/admin/topik/$id/soal"
                            params={{ id: topic.id }}
                            className="flex items-center justify-between gap-3 bg-white px-4 py-3 text-sm hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900"
                          >
                            <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">{topic.nama}</span>
                            <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                              {questionCount} soal <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="px-4 py-3 text-sm text-muted-foreground">Belum ada topik. Buka modul untuk menambahkannya.</p>
                  )}
                </div>
              </AdminPageContent>
            );
          })}
          {shown.length === 0 && (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[20px]">
              <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                <FileText className="h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium">Belum ada modul bank soal.</p>
              </div>
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
    </AdminPage>
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
    modulRepo.upsert({
      ...modul,
      nama: nama.trim(),
      mataKuliahId: mkId === "none" ? undefined : mkId,
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
            <Label>Mata Kuliah (Opsional)</Label>
            <Select value={mkId} onValueChange={setMkId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Mata Kuliah" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(Tanpa Mata Kuliah)</SelectItem>
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
