import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button as AntButton, Card as AntCard, ConfigProvider, Empty, Input as AntInput, Select as AntSelect, Tag, theme as antdTheme } from "antd";
import { AdminPage, AdminPageHeader } from "@/components/cbt/AdminPage";
import { topikRepo, modulRepo, soalRepo } from "@/lib/cbt/repos";
import { uid } from "@/lib/cbt/storage";
import type { Soal, TipeSoal, Kesulitan, Jawaban } from "@/lib/cbt/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Pencil, Trash2, Search, CheckCircle2, FolderOutput } from "lucide-react";
import { toast } from "sonner";
import { RichEditor, RichView } from "@/components/cbt/RichEditor";
import { useAuthStore } from "@/lib/cbt/auth-store";
import { isTopikAllowed, visibleTopiks } from "@/lib/cbt/access";
import { useConfirmDialog } from "@/components/cbt/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/admin/topik/$id/soal")({
  component: SoalPage,
});

const TIPE_LABEL: Record<TipeSoal, string> = {
  pg: "Pilihan Ganda", multi: "Multi Jawaban", bs: "Benar-Salah", essay: "Essay",
};
const KES_LABEL: Record<Kesulitan, string> = { mudah: "Mudah", sedang: "Sedang", sulit: "Sulit" };

function SoalPage() {
  const { confirm, dialog } = useConfirmDialog();
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

  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  if (!topik || !modul) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-slate-500 mb-4">Topik tidak ditemukan.</p>
      <Button asChild variant="outline"><Link to="/admin/modul">Kembali ke Bank Soal</Link></Button>
    </div>
  );
  
  if (!allowed) return (
    <div className="flex items-center gap-3 rounded-xl border border-red-200/50 bg-red-50/50 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400 mt-6 max-w-4xl mx-auto">
      Anda tidak memiliki akses ke topik <strong>{topik.nama}</strong>. Hubungi admin.
      <Link to="/admin/modul" className="font-semibold underline ml-2">← Kembali ke Modul</Link>
    </div>
  );

  function refresh() { 
    setSoals(soalRepo.all().filter((s) => s.topikId === topikId)); 
    setSelectedIds([]);
  }
  async function remove(id: string) {
    if (!(await confirm({ title: "Hapus soal", description: "Hapus soal?", confirmLabel: "Hapus" }))) return;
    soalRepo.remove(id); refresh();
  }
  async function handleBulkDelete() {
    if (!(await confirm({ title: "Hapus soal terpilih", description: `Hapus ${selectedIds.length} soal terpilih secara permanen?`, confirmLabel: "Hapus" }))) return;
    selectedIds.forEach((id) => soalRepo.remove(id));
    const res = await soalRepo.flush();
    if (res.ok) {
      toast.success(`${selectedIds.length} soal berhasil dihapus`);
    } else {
      toast.error(`Gagal menghapus soal: ${res.error}`);
    }
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
    <ConfigProvider theme={{ algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm, token: { colorPrimary: "#16a34a", borderRadius: 12, fontFamily: "inherit" } }}>
      <AdminPage className="pb-12">
        <div className="flex flex-wrap items-center gap-4">
          <Button asChild variant="outline" className="w-fit gap-2">
            <Link to="/admin/modul/$id/topik" params={{ id: modul.id }}>
              <ArrowLeft size={16} aria-hidden="true" /> Kembali ke Topik
            </Link>
          </Button>
        <nav aria-label="Navigasi bank soal" className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to="/admin/modul" className="hover:text-primary">Bank Soal</Link>
          <span aria-hidden="true">/</span>
          <Link to="/admin/modul/$id/topik" params={{ id: modul.id }} className="hover:text-primary">{modul.nama}</Link>
          <span aria-hidden="true">/</span>
          <span>Soal</span>
        </nav>
        </div>
        <AdminPageHeader
          title={topik.nama}
          description={`Kelola ${soals.length} soal dalam topik ini.`}
          action={<AntButton type="primary" size="large" icon={<Plus size={17} />} onClick={() => { setEditing(null); setOpen(true); }}>Soal Baru</AntButton>}
        />
        <AntCard styles={{ body: { padding: 16 } }}>
          <div className="flex flex-col gap-3 lg:flex-row">
            <AntInput size="large" allowClear prefix={<Search size={17} className="text-slate-400" />} aria-label="Cari soal" placeholder="Cari kata kunci dalam soal..." value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1" />
            <AntSelect size="large" aria-label="Filter tipe soal" value={tipe} onChange={setTipe} className="w-full lg:w-48" options={[{ value: "all", label: "Semua tipe" }, ...Object.entries(TIPE_LABEL).map(([value, label]) => ({ value, label }))]} />
            <AntSelect size="large" aria-label="Filter kesulitan soal" value={kes} onChange={setKes} className="w-full lg:w-48" options={[{ value: "all", label: "Semua kesulitan" }, ...Object.entries(KES_LABEL).map(([value, label]) => ({ value, label }))]} />
          </div>
        </AntCard>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={shown.length > 0 && shown.every((s) => selectedIds.includes(s.id)) ? true : shown.some((s) => selectedIds.includes(s.id)) ? "indeterminate" : false}
              disabled={shown.length === 0}
              onCheckedChange={(checked) => {
                if (checked) setSelectedIds(Array.from(new Set([...selectedIds, ...shown.map((s) => s.id)])));
                else { const shownIds = new Set(shown.map((s) => s.id)); setSelectedIds(selectedIds.filter((id) => !shownIds.has(id))); }
              }}
            />
            {selectedIds.length > 0 ? `${selectedIds.length} soal terpilih` : `Pilih semua · ${shown.length} soal ditampilkan`}
          </label>
          {selectedIds.length > 0 && <div className="flex flex-wrap gap-2">
            <AntButton onClick={() => setSelectedIds([])}>Batal pilih</AntButton>
            <AntButton icon={<FolderOutput size={16} />} onClick={() => setMoveDialogOpen(true)}>Pindahkan</AntButton>
            <AntButton danger icon={<Trash2 size={16} />} onClick={handleBulkDelete}>Hapus terpilih</AntButton>
          </div>}
        </div>
        <div className="space-y-4">
          {shown.map((s, i) => (
            <AntCard key={s.id} styles={{ body: { padding: 0 } }} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Checkbox aria-label={`Pilih soal ${i + 1}`} checked={selectedIds.includes(s.id)} onCheckedChange={(checked) => setSelectedIds(checked ? [...selectedIds, s.id] : selectedIds.filter((id) => id !== s.id))} />
                  <span className="font-semibold">Soal {i + 1}</span>
                  <Tag>{TIPE_LABEL[s.tipe]}</Tag>
                  <Tag color={s.kesulitan === "mudah" ? "green" : s.kesulitan === "sedang" ? "gold" : "red"}>{KES_LABEL[s.kesulitan]}</Tag>
                </div>
                <div className="flex gap-2">
                  <AntButton aria-label={`Edit soal ${i + 1}`} icon={<Pencil size={16} />} onClick={() => { setEditing(s); setOpen(true); }}>Edit</AntButton>
                  <AntButton danger aria-label={`Hapus soal ${i + 1}`} icon={<Trash2 size={16} />} onClick={() => remove(s.id)}>Hapus</AntButton>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <RichView html={s.detail} />
                {s.tipe !== "essay" && <div className="grid gap-2 xl:grid-cols-2">
                  {s.jawaban.map((j, idx) => (
                    <div key={j.id} className={`flex items-start gap-3 rounded-lg border p-3 ${j.benar ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30" : "border-border bg-muted/20"}`}>
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${j.benar ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>{String.fromCharCode(65 + idx)}</span>
                      <div className="min-w-0 flex-1"><RichView html={j.detail} /></div>
                      {j.benar && <CheckCircle2 aria-label="Jawaban benar" className="h-5 w-5 shrink-0 text-emerald-600" />}
                    </div>
                  ))}
                </div>}
              </div>
            </AntCard>
          ))}
          {shown.length === 0 && <AntCard><Empty description={soals.length === 0 ? "Belum ada soal dalam topik ini." : "Tidak ada soal yang sesuai filter."} /></AntCard>}
        </div>

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
      {dialog}
      </AdminPage>
    </ConfigProvider>
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
                    <Button size="sm" variant="ghost" onClick={() => setJawaban(jawaban.filter((_, i) => i !== idx))}>
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
