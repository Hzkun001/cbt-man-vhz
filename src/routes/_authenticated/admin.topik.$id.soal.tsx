import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { topikRepo, modulRepo, soalRepo } from "@/lib/cbt/repos";
import { uid } from "@/lib/cbt/storage";
import type { Soal, TipeSoal, Kesulitan, Jawaban } from "@/lib/cbt/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Search, BookOpen, CheckCircle2, FolderOutput, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { RichEditor, RichView } from "@/components/cbt/RichEditor";
import { useAuthStore } from "@/lib/cbt/auth-store";
import { isTopikAllowed, visibleTopiks } from "@/lib/cbt/access";
import { ConfirmDialog } from "@/components/cbt/ConfirmDialog";
import { AdminPage, AdminPageContent, AdminPageHeader } from "@/components/cbt/AdminPage";

export const Route = createFileRoute("/_authenticated/admin/topik/$id/soal")({
  component: SoalPage,
});

const TIPE_LABEL: Record<TipeSoal, string> = {
  pg: "Pilihan Ganda", multi: "Multi Jawaban", bs: "Benar-Salah", essay: "Essay",
};
const KES_LABEL: Record<Kesulitan, string> = { mudah: "Mudah", sedang: "Sedang", sulit: "Sulit" };

function SoalPage() {
  const { id: topikId } = useParams({ from: "/_authenticated/admin/topik/$id/soal" });
  const topik = topikRepo.byId(topikId);
  const modul = topik ? modulRepo.byId(topik.modulId) : null;
  const user = useAuthStore((s) => s.user);
  const allowed = isTopikAllowed(user, topikId);
  const [soals, setSoals] = useState<Soal[]>(soalRepo.all().filter((s) => s.topikId === topikId));
  const [query, setQuery] = useState("");
  const [tipe, setTipe] = useState<string>("all");
  const [kes, setKes] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Soal | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [targetTopikId, setTargetTopikId] = useState<string>("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  if (!topik || !modul) return (
    <AdminPage className="flex flex-col items-center py-20 text-center">
      <p className="mb-4 text-muted-foreground">Topik tidak ditemukan.</p>
      <Button asChild variant="outline"><Link to="/admin/modul"><ArrowLeft className="mr-2 h-4 w-4" />Kembali ke Bank Soal</Link></Button>
    </AdminPage>
  );
  
  if (!allowed) return (
    <AdminPage>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
        <span>Anda tidak memiliki akses ke topik <strong>{topik.nama}</strong>. Hubungi admin.</span>
        <Link to="/admin/modul" className="font-semibold underline">Kembali ke Modul</Link>
      </div>
    </AdminPage>
  );

  function refresh() { 
    setSoals(soalRepo.all().filter((s) => s.topikId === topikId)); 
    setSelectedIds([]);
  }
  function remove(id: string) {
    setDeleteId(id);
  }
  async function confirmDelete() {
    if (!deleteId) return;
    soalRepo.remove(deleteId);
    const res = await soalRepo.flush();
    if (res.ok) toast.success("Soal dihapus");
    setDeleteId(null);
    refresh();
  }
  function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    setBulkDeleteOpen(true);
  }
  async function confirmBulkDelete() {
    selectedIds.forEach((id) => soalRepo.remove(id));
    const res = await soalRepo.flush();
    if (res.ok) {
      toast.success(`${selectedIds.length} soal berhasil dihapus`);
    } else {
      toast.error(`Gagal menghapus soal: ${res.error}`);
    }
    setBulkDeleteOpen(false);
    refresh();
  }

  async function handleBulkMove() {
    if (!targetTopikId) {
      toast.error("Pilih topik tujuan terlebih dahulu");
      return;
    }
    const targetTopik = topikRepo.byId(targetTopikId);
    if (!targetTopik) return;

    selectedIds.forEach((id) => {
      const s = soalRepo.byId(id);
      if (s) {
        soalRepo.upsert({ ...s, topikId: targetTopikId });
      }
    });

    const res = await soalRepo.flush();
    if (res.ok) {
      toast.success(`${selectedIds.length} soal berhasil dipindahkan ke ${targetTopik.nama}`);
      setMoveDialogOpen(false);
      setTargetTopikId("");
      refresh();
    } else {
      toast.error(`Gagal memindahkan soal: ${res.error}`);
    }
  }

  const shown = soals.filter((s) =>
    (tipe === "all" || s.tipe === tipe) &&
    (kes === "all" || s.kesulitan === kes) &&
    (query === "" || s.detail.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <AdminPage className="pb-12">
      <AdminPageHeader
        title={topik.nama}
        description={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            {modul.nama}<span aria-hidden="true">·</span>{soals.length} soal
          </span>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" className="h-9" asChild>
              <Link to="/admin/modul"><ArrowLeft className="mr-1 h-4 w-4" />Bank Soal</Link>
            </Button>
            <Button variant="outline" size="sm" className="h-9" asChild>
              <Link to="/admin/modul/import" search={{ topikId }}><FolderOutput className="mr-2 h-4 w-4" />Import Excel</Link>
            </Button>
            <Button size="sm" className="h-9" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />Soal Baru
            </Button>
          </div>
        }
      />

      <AdminPageContent className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-9"
              placeholder="Cari kata kunci dalam soal…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Select value={tipe} onValueChange={setTipe}>
              <SelectTrigger className="h-9 w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua tipe</SelectItem>
                {Object.entries(TIPE_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={kes} onValueChange={setKes}>
              <SelectTrigger className="h-9 w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua kesulitan</SelectItem>
                {Object.entries(KES_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </AdminPageContent>

      {selectedIds.length > 0 && (
        <AdminPageContent className="border-primary/20 bg-primary/5 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-sm font-medium">
            <Checkbox
              checked={shown.length > 0 && shown.every((s) => selectedIds.includes(s.id))}
              onCheckedChange={(c) => {
                if (c) {
                  const newSelected = new Set([...selectedIds, ...shown.map((s) => s.id)]);
                  setSelectedIds(Array.from(newSelected));
                } else {
                  const shownIds = new Set(shown.map((s) => s.id));
                  setSelectedIds(selectedIds.filter((id) => !shownIds.has(id)));
                }
              }}
              aria-label="Pilih semua soal yang ditampilkan"
            />
            <span>{selectedIds.length} soal terpilih</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedIds([])} className="h-8 text-xs">
                Batal
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMoveDialogOpen(true)} className="h-8 text-xs">
                <FolderOutput className="mr-1.5 h-3.5 w-3.5" />Pindah ({selectedIds.length})
              </Button>
              <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="h-8 text-xs">
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />Hapus ({selectedIds.length})
              </Button>
            </div>
          </div>
        </AdminPageContent>
      )}

      <AdminPageContent className="overflow-hidden p-0">
        {shown.map((s, i) => (
          <article key={s.id} className="border-b last:border-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <Checkbox
                  checked={selectedIds.includes(s.id)}
                  onCheckedChange={(c) => {
                    if (c) setSelectedIds([...selectedIds, s.id]);
                    else setSelectedIds(selectedIds.filter((id) => id !== s.id));
                  }}
                  aria-label={`Pilih soal ${i + 1}`}
                />
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 font-mono text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <Badge variant="secondary">{TIPE_LABEL[s.tipe]}</Badge>
                <Badge variant="outline" className={s.kesulitan === "mudah" ? "border-success/30 bg-success/10 text-success" : s.kesulitan === "sedang" ? "border-warning/30 bg-warning/10 text-warning" : "border-destructive/30 bg-destructive/10 text-destructive"}>
                  {KES_LABEL[s.kesulitan]}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-8" onClick={() => { setEditing(s); setOpen(true); }} aria-label={`Edit soal ${i + 1}`} title={`Edit soal ${i + 1}`}>
                  <Pencil className="h-3.5 w-3.5 sm:mr-2" /> <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-destructive hover:bg-destructive/10" onClick={() => remove(s.id)} aria-label={`Hapus soal ${i + 1}`} title={`Hapus soal ${i + 1}`}>
                  <Trash2 className="h-3.5 w-3.5 sm:mr-2" /> <span className="hidden sm:inline">Hapus</span>
                </Button>
              </div>
            </div>

            <div className="space-y-5 p-4 sm:p-6">
              <div className="prose max-w-none text-foreground prose-p:leading-relaxed prose-headings:tracking-tight dark:prose-invert">
                <RichView html={s.detail} />
              </div>

              {s.tipe !== "essay" && (
                <div className="grid gap-3">
                  {s.jawaban.map((j, idx) => (
                    <div key={j.id} className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${j.benar ? "border-success/30 bg-success/5" : "border-border bg-card hover:border-primary/30"}`}>
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-sm font-semibold ${j.benar ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <div className={`flex-1 pt-1 text-sm font-medium ${j.benar ? "text-success" : "text-foreground"}`}>
                        <RichView html={j.detail} className="inline" />
                      </div>
                      {j.benar && <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-success" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}

        {shown.length === 0 && (
          <div className="border-dashed p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Belum ada soal</h3>
            <p className="mt-1 text-sm text-muted-foreground">Gunakan tombol “Soal Baru” untuk mulai menambahkan soal.</p>
          </div>
        )}
      </AdminPageContent>

      <SoalDialog open={open} onOpenChange={setOpen} editing={editing} topikId={topikId} onSaved={refresh} />
      
      {/* Move Selected Questions Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pindahkan Soal Terpilih</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-500">
              Pindahkan <strong>{selectedIds.length} soal</strong> ke topik lain dalam bank soal Anda.
            </p>
            <div className="space-y-2">
              <Label>Topik Tujuan *</Label>
              <Select value={targetTopikId} onValueChange={setTargetTopikId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih topik tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {visibleTopiks(user)
                    .filter((t) => t.id !== topikId)
                    .map((t) => {
                      const m = modulRepo.byId(t.modulId);
                      return (
                        <SelectItem key={t.id} value={t.id}>
                          {m ? `${m.nama} → ` : ""}{t.nama}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleBulkMove} disabled={!targetTopikId}>
              Pindahkan Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Hapus Soal"
        description="Apakah Anda yakin ingin menghapus soal ini secara permanen?"
        onConfirm={confirmDelete}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Hapus Soal Terpilih"
        description={`Apakah Anda yakin ingin menghapus ${selectedIds.length} soal terpilih secara permanen?`}
        onConfirm={confirmBulkDelete}
      />
    </AdminPage>
  );
}

function SoalDialog({
  open, onOpenChange, editing, topikId, onSaved,
}: { open: boolean; onOpenChange: (v: boolean) => void; editing: Soal | null; topikId: string; onSaved: () => void }) {
  const [detail, setDetail] = useState(editing?.detail ?? "");
  const [tipe, setTipe] = useState<TipeSoal>(editing?.tipe ?? "pg");
  const [kesulitan, setKesulitan] = useState<Kesulitan>(editing?.kesulitan ?? "sedang");
  const [pembahasan, setPembahasan] = useState(editing?.pembahasan ?? "");
  const [audioFileId, setAudioFileId] = useState<string | undefined>(editing?.audioFileId);
  const [audioPlayOnce, setAudioPlayOnce] = useState(editing?.audioPlayOnce ?? false);
  const [jawaban, setJawaban] = useState<Jawaban[]>(
    editing?.jawaban ?? [
      { id: uid("j_"), detail: "", benar: false },
      { id: uid("j_"), detail: "", benar: false },
      { id: uid("j_"), detail: "", benar: false },
      { id: uid("j_"), detail: "", benar: false },
    ],
  );

  const editingId = editing?.id ?? "new";
  const [lastInit, setLastInit] = useState<string>("");
  if (open && lastInit !== editingId) {
    setLastInit(editingId);
    setDetail(editing?.detail ?? "");
    setTipe(editing?.tipe ?? "pg");
    setKesulitan(editing?.kesulitan ?? "sedang");
    setPembahasan(editing?.pembahasan ?? "");
    setAudioFileId(editing?.audioFileId);
    setAudioPlayOnce(editing?.audioPlayOnce ?? false);
    setJawaban(editing?.jawaban ?? [
      { id: uid("j_"), detail: "", benar: false },
      { id: uid("j_"), detail: "", benar: false },
      { id: uid("j_"), detail: "", benar: false },
      { id: uid("j_"), detail: "", benar: false },
    ]);
  }

  function setTipeWithDefaults(t: TipeSoal) {
    setTipe(t);
    if (t === "bs") {
      setJawaban([
        { id: uid("j_"), detail: "Benar", benar: false },
        { id: uid("j_"), detail: "Salah", benar: false },
      ]);
    } else if (t === "essay") {
      setJawaban([]);
    } else if (jawaban.length < 2) {
      setJawaban([
        { id: uid("j_"), detail: "", benar: false },
        { id: uid("j_"), detail: "", benar: false },
      ]);
    }
  }

  function save() {
    if (!detail.trim()) { toast.error("Pertanyaan kosong"); return; }
    if (tipe !== "essay") {
      if (jawaban.length < 2) { toast.error("Minimal 2 opsi jawaban"); return; }
      if (!jawaban.some((j) => j.benar)) { toast.error("Tandai minimal 1 jawaban benar"); return; }
      if (tipe === "pg" && jawaban.filter((j) => j.benar).length !== 1) {
        toast.error("Pilihan ganda hanya boleh 1 jawaban benar"); return;
      }
    }
    const soal: Soal = {
      id: editing?.id ?? uid("s_"),
      topikId, detail, tipe, kesulitan, pembahasan,
      audioFileId, audioPlayOnce,
      jawaban,
      createdAt: editing?.createdAt ?? Date.now(),
    };
    soalRepo.upsert(soal);
    toast.success("Soal disimpan");
    onSaved(); onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit Soal" : "Soal Baru"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tipe</Label>
              <Select value={tipe} onValueChange={(v) => setTipeWithDefaults(v as TipeSoal)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TIPE_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label>Kesulitan</Label>
              <Select value={kesulitan} onValueChange={(v) => setKesulitan(v as Kesulitan)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(KES_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select></div>
          </div>
          <div><Label>Pertanyaan</Label><RichEditor value={detail} onChange={setDetail} placeholder="Tulis pertanyaan… gunakan $x^2$ untuk rumus." minHeight={120} /></div>

          <div className="rounded border p-3 space-y-2">
            <Label className="text-xs">Audio (opsional) — pakai ID dari File Manager</Label>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded border px-2 py-1 font-mono text-xs"
                placeholder="f_xxxxxx (kosongkan untuk hapus)"
                value={audioFileId ?? ""}
                onChange={(e) => setAudioFileId(e.target.value.trim() || undefined)}
              />
              <label className="flex items-center gap-1 text-xs">
                <Checkbox checked={audioPlayOnce} onCheckedChange={(v) => setAudioPlayOnce(!!v)} />
                Play once
              </label>
            </div>
          </div>

          {tipe !== "essay" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label>Opsi jawaban</Label>
                {tipe !== "bs" && <Button size="sm" variant="outline" onClick={() => setJawaban([...jawaban, { id: uid("j_"), detail: "", benar: false }])}>+ opsi</Button>}
              </div>
              {jawaban.map((j, idx) => (
                <div key={j.id} className="flex gap-2 rounded border p-2">
                  <div className="flex flex-col items-center gap-1 pt-2 text-xs">
                    <span className="font-mono">{String.fromCharCode(65 + idx)}</span>
                    <Checkbox checked={j.benar} onCheckedChange={(v) => {
                      const next = jawaban.map((x, i) => {
                        if (tipe === "pg" || tipe === "bs") return { ...x, benar: i === idx ? !!v : false };
                        return i === idx ? { ...x, benar: !!v } : x;
                      });
                      setJawaban(next);
                    }} />
                  </div>
                  <div className="flex-1"><RichEditor value={j.detail} onChange={(html) => {
                    setJawaban(jawaban.map((x, i) => i === idx ? { ...x, detail: html } : x));
                  }} minHeight={50} /></div>
                  {tipe !== "bs" && (
                    <Button size="sm" variant="ghost" onClick={() => setJawaban(jawaban.filter((_, i) => i !== idx))} aria-label={`Hapus opsi jawaban ${idx + 1}`} title={`Hapus opsi jawaban ${idx + 1}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div><Label>Pembahasan (opsional)</Label><RichEditor value={pembahasan} onChange={setPembahasan} minHeight={70} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={save}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
