import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { unitAkademikRepo } from "@/lib/cbt/repos";
import { mutateUnitAkademikServer } from "@/lib/server/akademik/functions";
import type { UnitAkademik } from "@/lib/cbt/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, Building2, Library, Users, Search, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirmDialog } from "@/components/cbt/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/admin/akademik/")({
  component: UnitAkademikExplorer,
});

function UnitAkademikExplorer() {
  const [units, setUnits] = useState<UnitAkademik[]>(() => unitAkademikRepo.all());

  const refreshUnits = () => {
    setUnits([...unitAkademikRepo.all()]);
  };

  const fakultasList = units.filter((u) => u.tipe === "fakultas");
  const prodiList = units.filter((u) => u.tipe === "prodi" || u.tipe === "jurusan");
  const kelasList = units.filter((u) => u.tipe === "kelas");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderTree className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Struktur Akademik
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
              Kelola fakultas, program studi, dan kelas yang menjadi dasar pengelompokan peserta ujian.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="fakultas" className="w-full">
        <TabsList className="grid h-auto w-full max-w-xl grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900">
          <TabsTrigger value="fakultas" className="flex min-h-9 items-center justify-center gap-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-950">
            <Building2 className="h-3.5 w-3.5" />
            Fakultas
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
              {fakultasList.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="prodi" className="flex min-h-9 items-center justify-center gap-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-950">
            <Library className="h-3.5 w-3.5" />
            Program Studi
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
              {prodiList.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="kelas" className="flex min-h-9 items-center justify-center gap-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-950">
            <Users className="h-3.5 w-3.5" />
            Kelas / Rombel
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
              {kelasList.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fakultas" className="mt-6">
          <FakultasSection data={fakultasList} onUpdated={refreshUnits} />
        </TabsContent>

        <TabsContent value="prodi" className="mt-6">
          <ProdiSection data={prodiList} fakultas={fakultasList} onUpdated={refreshUnits} />
        </TabsContent>

        <TabsContent value="kelas" className="mt-6">
          <KelasSection data={kelasList} prodi={prodiList} onUpdated={refreshUnits} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------- 1. TAB FAKULTAS ----------------
function FakultasSection({ data, onUpdated }: { data: UnitAkademik[]; onUpdated: () => void }) {
  const { confirm, dialog } = useConfirmDialog();
  const [form, setForm] = useState<{ id: string; nama: string }>({ id: "", nama: "" });
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filtered = data.filter((f) => f.nama.toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    if (!form.nama.trim()) {
      toast.error("Nama Fakultas wajib diisi!");
      return;
    }
    setSubmitting(true);
    const id = form.id || `f_${Date.now()}`;
    const payload: UnitAkademik = {
      id,
      nama: form.nama.trim(),
      tipe: "fakultas",
      parentId: null,
    };

    const res = await mutateUnitAkademikServer({ data: { action: "upsert", payload } });
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error || "Gagal menyimpan fakultas");
      return;
    }

    unitAkademikRepo.upsert(payload);
    onUpdated();
    toast.success(form.id ? "Fakultas diperbarui" : "Fakultas baru ditambahkan");
    setForm({ id: "", nama: "" });
  };

  const remove = async (id: string) => {
    if (!(await confirm({ title: "Hapus fakultas", description: "Hapus Fakultas ini?", confirmLabel: "Hapus" }))) return;
    const res = await mutateUnitAkademikServer({ data: { action: "remove", payload: { id } } });
    if (!res.ok) {
      toast.error(res.error || "Gagal menghapus fakultas");
      return;
    }
    unitAkademikRepo.remove(id);
    onUpdated();
    toast.success("Fakultas dihapus");
  };

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
      <Card className="overflow-hidden border-slate-200 shadow-sm xl:col-span-2 dark:border-slate-800">
        <CardHeader className="flex flex-col items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/50 pb-3 dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:items-center">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Daftar Fakultas ({filtered.length})
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Cari fakultas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filtered.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-3.5 px-5 hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {f.nama}
                    </h4>
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-mono">
                      ID: {f.id}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-500 hover:text-primary"
                    onClick={() => setForm({ id: f.id, nama: f.nama })}
                    aria-label={`Edit ${f.nama}`}
                    title="Edit"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-500 hover:text-destructive"
                    onClick={() => remove(f.id)}
                    aria-label={`Hapus ${f.nama}`}
                    title="Hapus"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Belum ada data fakultas. Tambahkan melalui form di samping.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-3">
          <CardTitle className="text-base font-semibold">
            {form.id ? "Edit Fakultas" : "Tambah Fakultas Baru"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Nama Fakultas *</Label>
            <Input
              placeholder="Contoh: Fakultas Kedokteran"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="text-xs"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={submitting} className="flex-1 text-xs h-9">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {form.id ? "Simpan Perubahan" : "Tambahkan"}
            </Button>
            {form.id && (
              <Button
                variant="outline"
                onClick={() => setForm({ id: "", nama: "" })}
                className="text-xs h-9"
              >
                Batal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {dialog}
    </div>
  );
}

// ---------------- 2. TAB PROGRAM STUDI ----------------
function ProdiSection({
  data,
  fakultas,
  onUpdated,
}: {
  data: UnitAkademik[];
  fakultas: UnitAkademik[];
  onUpdated: () => void;
}) {
  const { confirm, dialog } = useConfirmDialog();
  const [form, setForm] = useState<{ id: string; nama: string; fakultasId: string }>({
    id: "",
    nama: "",
    fakultasId: "none",
  });
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filtered = data.filter((p) => p.nama.toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    if (!form.nama.trim()) {
      toast.error("Nama Program Studi wajib diisi!");
      return;
    }
    if (form.fakultasId === "none" || !form.fakultasId) {
      toast.error("Pilih Fakultas induk!");
      return;
    }
    setSubmitting(true);
    const id = form.id || `p_${Date.now()}`;
    const payload: UnitAkademik = {
      id,
      nama: form.nama.trim(),
      tipe: "prodi",
      parentId: form.fakultasId,
    };

    const res = await mutateUnitAkademikServer({ data: { action: "upsert", payload } });
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error || "Gagal menyimpan program studi");
      return;
    }

    unitAkademikRepo.upsert(payload);
    onUpdated();
    toast.success(form.id ? "Program Studi diperbarui" : "Program Studi baru ditambahkan");
    setForm({ id: "", nama: "", fakultasId: "none" });
  };

  const remove = async (id: string) => {
    if (!(await confirm({ title: "Hapus program studi", description: "Hapus Program Studi ini?", confirmLabel: "Hapus" }))) return;
    const res = await mutateUnitAkademikServer({ data: { action: "remove", payload: { id } } });
    if (!res.ok) {
      toast.error(res.error || "Gagal menghapus program studi");
      return;
    }
    unitAkademikRepo.remove(id);
    onUpdated();
    toast.success("Program Studi dihapus");
  };

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
      <Card className="overflow-hidden border-slate-200 shadow-sm xl:col-span-2 dark:border-slate-800">
        <CardHeader className="flex flex-col items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/50 pb-3 dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:items-center">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Library className="h-4 w-4 text-primary" />
            Daftar Program Studi ({filtered.length})
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Cari program studi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filtered.map((p) => {
              const parentFak = fakultas.find((f) => f.id === p.parentId);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3.5 px-5 hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                      <Library className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {p.nama}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>
                          Fakultas:{" "}
                          <strong className="text-slate-700 dark:text-slate-300 font-medium">
                            {parentFak?.nama || "(Tanpa Fakultas)"}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-slate-500 hover:text-primary"
                      onClick={() =>
                        setForm({ id: p.id, nama: p.nama, fakultasId: p.parentId || "none" })
                      }
                      aria-label={`Edit ${p.nama}`}
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-slate-500 hover:text-destructive"
                      onClick={() => remove(p.id)}
                      aria-label={`Hapus ${p.nama}`}
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Belum ada data program studi. Tambahkan melalui form di samping.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-3">
          <CardTitle className="text-base font-semibold">
            {form.id ? "Edit Program Studi" : "Tambah Program Studi"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Nama Program Studi *</Label>
            <Input
              placeholder="Contoh: S1 Pendidikan Dokter"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Fakultas Induk *</Label>
            <Select
              value={form.fakultasId}
              onValueChange={(val) => setForm({ ...form, fakultasId: val })}
            >
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Pilih Fakultas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>
                  Pilih Fakultas
                </SelectItem>
                {fakultas.map((f) => (
                  <SelectItem key={f.id} value={f.id} className="text-xs">
                    {f.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={submitting} className="flex-1 text-xs h-9">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {form.id ? "Simpan Perubahan" : "Tambahkan"}
            </Button>
            {form.id && (
              <Button
                variant="outline"
                onClick={() => setForm({ id: "", nama: "", fakultasId: "none" })}
                className="text-xs h-9"
              >
                Batal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {dialog}
    </div>
  );
}

// ---------------- 3. TAB KELAS / ROMBEL ----------------
function KelasSection({
  data,
  prodi,
  onUpdated,
}: {
  data: UnitAkademik[];
  prodi: UnitAkademik[];
  onUpdated: () => void;
}) {
  const { confirm, dialog } = useConfirmDialog();
  const [form, setForm] = useState<{ id: string; nama: string; prodiId: string }>({
    id: "",
    nama: "",
    prodiId: "none",
  });
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filtered = data.filter((k) => k.nama.toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    if (!form.nama.trim()) {
      toast.error("Nama Kelas / Rombel wajib diisi!");
      return;
    }
    if (form.prodiId === "none" || !form.prodiId) {
      toast.error("Pilih Program Studi induk!");
      return;
    }
    setSubmitting(true);
    const id = form.id || `k_${Date.now()}`;
    const payload: UnitAkademik = {
      id,
      nama: form.nama.trim(),
      tipe: "kelas",
      parentId: form.prodiId,
    };

    const res = await mutateUnitAkademikServer({ data: { action: "upsert", payload } });
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error || "Gagal menyimpan kelas");
      return;
    }

    unitAkademikRepo.upsert(payload);
    onUpdated();
    toast.success(form.id ? "Kelas diperbarui" : "Kelas baru ditambahkan");
    setForm({ id: "", nama: "", prodiId: "none" });
  };

  const remove = async (id: string) => {
    if (!(await confirm({ title: "Hapus kelas", description: "Hapus Kelas ini?", confirmLabel: "Hapus" }))) return;
    const res = await mutateUnitAkademikServer({ data: { action: "remove", payload: { id } } });
    if (!res.ok) {
      toast.error(res.error || "Gagal menghapus kelas");
      return;
    }
    unitAkademikRepo.remove(id);
    onUpdated();
    toast.success("Kelas dihapus");
  };

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
      <Card className="overflow-hidden border-slate-200 shadow-sm xl:col-span-2 dark:border-slate-800">
        <CardHeader className="flex flex-col items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/50 pb-3 dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:items-center">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Daftar Kelas / Rombel ({filtered.length})
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Cari kelas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filtered.map((k) => {
              const parentProdi = prodi.find((p) => p.id === k.parentId);
              return (
                <div
                  key={k.id}
                  className="flex items-center justify-between p-3.5 px-5 hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {k.nama}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>
                          Prodi:{" "}
                          <strong className="text-slate-700 dark:text-slate-300 font-medium">
                            {parentProdi?.nama || "(Tanpa Prodi)"}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-slate-500 hover:text-primary"
                      onClick={() =>
                        setForm({ id: k.id, nama: k.nama, prodiId: k.parentId || "none" })
                      }
                      aria-label={`Edit ${k.nama}`}
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-slate-500 hover:text-destructive"
                      onClick={() => remove(k.id)}
                      aria-label={`Hapus ${k.nama}`}
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Belum ada data kelas / rombel. Tambahkan melalui form di samping.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-3">
          <CardTitle className="text-base font-semibold">
            {form.id ? "Edit Kelas / Rombel" : "Tambah Kelas Baru"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Nama Kelas / Rombel *</Label>
            <Input
              placeholder="Contoh: Kelas A (2026)"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Program Studi Induk *</Label>
            <Select
              value={form.prodiId}
              onValueChange={(val) => setForm({ ...form, prodiId: val })}
            >
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Pilih Program Studi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>
                  Pilih Program Studi
                </SelectItem>
                {prodi.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={submitting} className="flex-1 text-xs h-9">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {form.id ? "Simpan Perubahan" : "Tambahkan"}
            </Button>
            {form.id && (
              <Button
                variant="outline"
                onClick={() => setForm({ id: "", nama: "", prodiId: "none" })}
                className="text-xs h-9"
              >
                Batal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {dialog}
    </div>
  );
}
