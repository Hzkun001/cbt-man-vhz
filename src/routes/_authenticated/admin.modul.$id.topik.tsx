import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button as AntButton, Card as AntCard, ConfigProvider, Empty, Input as AntInput, Tag, theme as antdTheme } from "antd";
import { AdminPage, AdminPageHeader } from "@/components/cbt/AdminPage";
import { modulRepo, topikRepo, soalRepo } from "@/lib/cbt/repos";
import { uid } from "@/lib/cbt/storage";
import type { Topik } from "@/lib/cbt/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, ChevronRight, Lock, Layers, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/cbt/auth-store";
import { allowedTopikIdSet, isUnrestricted } from "@/lib/cbt/access";
import { useConfirmDialog } from "@/components/cbt/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/admin/modul/$id/topik")({
  component: TopikPage,
});

function TopikPage() {
  const { confirm, dialog } = useConfirmDialog();
  const { id: modulId } = useParams({ from: "/_authenticated/admin/modul/$id/topik" });
  const user = useAuthStore((s) => s.user);
  const canEdit = isUnrestricted(user);
  const allowedSet = allowedTopikIdSet(user);
  const modul = modulRepo.byId(modulId);
  const filterMine = (list: Topik[]) =>
    list.filter((t) => t.modulId === modulId && (!allowedSet || allowedSet.has(t.id)));
  const [topiks, setTopiks] = useState<Topik[]>(filterMine(topikRepo.all()));
  const [nama, setNama] = useState("");
  const [editingTopik, setEditingTopik] = useState<Topik | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editNama, setEditNama] = useState("");

  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  if (!modul) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-slate-500 mb-4">Modul tidak ditemukan.</p>
      <Button asChild variant="outline"><Link to="/admin/modul">Kembali ke Bank Soal</Link></Button>
    </div>
  );

  function add() {
    if (!canEdit) return;
    if (!nama.trim()) return;
    topikRepo.upsert({ id: uid("t_"), modulId, nama: nama.trim() });
    setNama(""); setTopiks(filterMine(topikRepo.all())); toast.success("Topik ditambahkan");
  }

  async function remove(id: string) {
    if (!canEdit) return;
    if (soalRepo.all().some((s) => s.topikId === id)) { toast.error("Hapus soal di topik ini dulu"); return; }
    if (!(await confirm({ title: "Hapus topik", description: "Hapus topik?", confirmLabel: "Hapus" }))) return;
    topikRepo.remove(id); setTopiks(filterMine(topikRepo.all()));
    toast.success("Topik dihapus");
  }

  function openEdit(t: Topik) {
    setEditingTopik(t);
    setEditNama(t.nama);
    setEditDialogOpen(true);
  }

  function saveEdit() {
    if (!editingTopik || !editNama.trim()) return;
    topikRepo.upsert({ ...editingTopik, nama: editNama.trim() });
    setTopiks(filterMine(topikRepo.all()));
    toast.success("Nama topik diperbarui");
    setEditDialogOpen(false);
  }

  return (
    <ConfigProvider theme={{ algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm, token: { colorPrimary: "#16a34a", borderRadius: 12, fontFamily: "inherit" } }}>
      <AdminPage className="pb-12">
        <div className="flex flex-wrap items-center gap-4">
          <Button asChild variant="outline" className="w-fit gap-2">
            <Link to="/admin/modul">
              <ArrowLeft size={16} aria-hidden="true" /> Kembali ke Bank Soal
            </Link>
          </Button>
        </div>
        <AdminPageHeader title={modul.nama} description={`Kelola ${topiks.length} topik dan soal dalam modul ini.`} />
        {canEdit ? (
          <AntCard title="Tambah topik">
            <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex flex-col gap-3 sm:flex-row">
              <AntInput size="large" aria-label="Nama topik baru" placeholder="Contoh: Bab 1 — Pengantar" value={nama} onChange={(e) => setNama(e.target.value)} className="flex-1" />
              <AntButton type="primary" size="large" htmlType="submit" disabled={!nama.trim()} icon={<Plus size={17} />}>Tambah Topik</AntButton>
            </form>
          </AntCard>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-400"><Lock size={17} />Mode hanya-baca. Anda dapat melihat topik yang ditugaskan kepada Anda.</div>
        )}
        <div className="flex items-center gap-2 text-sm font-semibold">Daftar topik <Tag>{topiks.length}</Tag></div>
        <div className="grid gap-4 lg:grid-cols-2">
          {topiks.map((t) => {
            const count = soalRepo.all().filter((s) => s.topikId === t.id).length;
            return (
              <AntCard key={t.id} className="h-full" styles={{ body: { padding: 20 } }}>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"><Layers size={21} /></div>
                  <div className="min-w-0 flex-1">
                    <Link to="/admin/topik/$id/soal" params={{ id: t.id }} className="block text-base font-semibold text-foreground hover:text-primary">{t.nama}</Link>
                    <p className="mt-1 text-sm text-muted-foreground">{count} soal terdaftar</p>
                  </div>
                  {canEdit && <div className="flex gap-1">
                    <AntButton type="text" aria-label={`Edit topik ${t.nama}`} icon={<Pencil size={17} />} onClick={() => openEdit(t)} />
                    <AntButton type="text" danger aria-label={`Hapus topik ${t.nama}`} icon={<Trash2 size={17} />} onClick={() => remove(t.id)} />
                  </div>}
                </div>
                <div className="mt-4 flex justify-end border-t border-border pt-4">
                  <Link to="/admin/topik/$id/soal" params={{ id: t.id }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Kelola Soal <ChevronRight size={16} /></Link>
                </div>
              </AntCard>
            );
          })}
          {topiks.length === 0 && <AntCard className="lg:col-span-2"><Empty description="Belum ada topik dalam modul ini." /></AntCard>}
        </div>

      {/* Edit Topik Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Nama Topik</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Nama Topik / Bab</Label>
            <Input
              value={editNama}
              onChange={(e) => setEditNama(e.target.value)}
              placeholder="Ketik nama topik..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Batal</Button>
            <Button onClick={saveEdit}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog}
      </AdminPage>
    </ConfigProvider>
  );
}
