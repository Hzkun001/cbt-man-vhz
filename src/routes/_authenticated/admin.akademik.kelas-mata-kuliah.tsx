import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { hydrateRepos, mataKuliahRepo, penawaranRepo, semesterRepo, usersRepo } from "@/lib/cbt/repos";
import { mutatePenawaranMataKuliahServer } from "@/lib/server/akademik/functions";
import { uid } from "@/lib/cbt/storage";
import type { PenawaranMataKuliah } from "@/lib/cbt/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, BookOpen, Users, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfirmDialog } from "@/components/cbt/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/admin/akademik/kelas-mata-kuliah")({
  component: KelasMataKuliahPage,
});

function KelasMataKuliahPage() {
  const { confirm, dialog } = useConfirmDialog();
  const [items, setItems] = useState<PenawaranMataKuliah[]>(penawaranRepo.all());
  const mataKuliah = mataKuliahRepo.all();
  const semester = semesterRepo.all();
  const mahasiswa = usersRepo.all().filter((user) => user.role === "mahasiswa" && user.aktif);
  const pengampu = usersRepo.all().filter((user) => user.role !== "mahasiswa" && user.aktif);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PenawaranMataKuliah>({
    id: "",
    mataKuliahId: "",
    semesterId: undefined,
    kodeKelas: "",
    pengampuIds: [],
    pesertaIds: [],
    createdAt: 0,
  });

  function add() {
    setForm({
      id: uid("po_"),
      mataKuliahId: mataKuliah[0]?.id ?? "",
      semesterId: semester[0]?.id,
      kodeKelas: "",
      pengampuIds: [],
      pesertaIds: [],
      createdAt: Date.now(),
    });
    setOpen(true);
  }

  function edit(item: PenawaranMataKuliah) {
    setForm({ ...item, pengampuIds: [...item.pengampuIds], pesertaIds: [...item.pesertaIds] });
    setOpen(true);
  }

  async function save() {
    if (!form.mataKuliahId) return toast.error("Mata kuliah wajib dipilih.");
    const existing = penawaranRepo.byId(form.id);
    const result = await mutatePenawaranMataKuliahServer({ data: { action: "upsert", payload: form } });
    if (!result.ok) return toast.error(result.error);
    await hydrateRepos();
    const saved = penawaranRepo.byId(form.id);
    if (existing && saved) {
      penawaranRepo.updateMembership({ ...saved, pengampuIds: form.pengampuIds, pesertaIds: form.pesertaIds });
    }
    setItems(penawaranRepo.all());
    setOpen(false);
    toast.success("Kelas mata kuliah disimpan.");
  }

  async function remove(id: string) {
    if (!(await confirm({ title: "Hapus kelas mata kuliah", description: "Hapus kelas mata kuliah ini?", confirmLabel: "Hapus" }))) return;
    const result = await mutatePenawaranMataKuliahServer({ data: { action: "remove", payload: { id } } });
    if (!result.ok) return toast.error(result.error);
    await hydrateRepos();
    setItems(penawaranRepo.all());
    toast.success("Kelas mata kuliah dihapus.");
  }

  const toggle = (key: "pengampuIds" | "pesertaIds", id: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      [key]: checked ? [...current[key], id] : current[key].filter((item) => item !== id),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Kelas Mata Kuliah
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Atur kelas, pengampu, dan peserta yang mengikuti mata kuliah.
          </p>
        </div>
        <Button onClick={add} className="h-9 w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Tambah Kelas
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => {
          const mk = mataKuliah.find((value) => value.id === item.mataKuliahId);
          const smt = semester.find((value) => value.id === item.semesterId);
          return (
            <Card key={item.id} className="border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base text-slate-900 dark:text-slate-100">
                      {mk?.nama ?? "Mata kuliah tidak ditemukan"}
                    </CardTitle>
                    <CardDescription className="mt-1 truncate text-xs">
                      {smt?.nama ?? "Tanpa semester"} · Kelas {item.kodeKelas || "-"}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => edit(item)} aria-label="Edit kelas mata kuliah" title="Edit kelas mata kuliah">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(item.id)} aria-label="Hapus kelas mata kuliah" title="Hapus kelas mata kuliah">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 pt-4">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/60">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Users className="h-3.5 w-3.5" /> Peserta
                  </div>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{item.pesertaIds.length}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/60">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <UserRound className="h-3.5 w-3.5" /> Pengampu
                  </div>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{item.pengampuIds.length}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {items.length === 0 && (
          <Card className="border-dashed border-slate-300 shadow-none dark:border-slate-700 lg:col-span-2">
            <CardContent className="flex min-h-40 flex-col items-center justify-center p-8 text-center">
              <BookOpen className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Belum ada kelas mata kuliah</p>
              <p className="mt-1 text-sm text-slate-500">Tambahkan kelas untuk mulai mengatur peserta dan pengampu.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{penawaranRepo.byId(form.id) ? "Edit Kelas Mata Kuliah" : "Tambah Kelas Mata Kuliah"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <div className="space-y-2">
                <Label htmlFor="academic-offering-course">Mata Kuliah</Label>
                <Select value={form.mataKuliahId} onValueChange={(value) => setForm({ ...form, mataKuliahId: value })}>
                  <SelectTrigger id="academic-offering-course"><SelectValue placeholder="Pilih mata kuliah" /></SelectTrigger>
                  <SelectContent>{mataKuliah.map((item) => <SelectItem key={item.id} value={item.id}>{item.kode} — {item.nama}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="academic-offering-code">Kode Kelas</Label>
                <Input id="academic-offering-code" value={form.kodeKelas} onChange={(event) => setForm({ ...form, kodeKelas: event.target.value })} placeholder="A" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="academic-offering-semester">Semester</Label>
              <Select value={form.semesterId ?? "none"} onValueChange={(value) => setForm({ ...form, semesterId: value === "none" ? undefined : value })}>
                <SelectTrigger id="academic-offering-semester"><SelectValue placeholder="Pilih semester" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Tanpa semester</SelectItem>{semester.map((item) => <SelectItem key={item.id} value={item.id}>{item.nama}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div><Label>Pengampu</Label><p className="text-xs text-slate-500">Pilih admin atau evaluator yang bertanggung jawab.</p></div>
              <div className="grid max-h-36 gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-3 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900/40">
                {pengampu.map((user) => <label key={user.id} className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white dark:hover:bg-slate-800"><Checkbox checked={form.pengampuIds.includes(user.id)} onCheckedChange={(checked) => toggle("pengampuIds", user.id, !!checked)} /><span className="truncate">{user.namaLengkap}</span></label>)}
              </div>
            </div>
            <div className="space-y-2">
              <div><Label>Peserta</Label><p className="text-xs text-slate-500">Pilih mahasiswa yang dapat mengikuti kelas ini.</p></div>
              <div className="grid max-h-52 gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-3 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900/40">
                {mahasiswa.map((user) => <label key={user.id} className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white dark:hover:bg-slate-800"><Checkbox checked={form.pesertaIds.includes(user.id)} onCheckedChange={(checked) => toggle("pesertaIds", user.id, !!checked)} /><span className="truncate">{user.namaLengkap}</span></label>)}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save}>Simpan Kelas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog}
    </div>
  );
}
