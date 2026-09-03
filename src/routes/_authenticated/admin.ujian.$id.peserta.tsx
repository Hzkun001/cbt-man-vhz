import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ujianRepo, usersRepo, unitAkademikRepo } from "@/lib/cbt/repos";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Search } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AdminPage, AdminPageContent, AdminPageHeader } from "@/components/cbt/AdminPage";

export const Route = createFileRoute("/_authenticated/admin/ujian/$id/peserta")({
  component: PesertaUjian,
});

function PesertaUjian() {
  const { id } = useParams({ from: "/_authenticated/admin/ujian/$id/peserta" });
  const ujian = ujianRepo.byId(id);
  const [selectedUnit, setSelectedUnit] = useState("all");

  const [search, setSearch] = useState("");

  if (!ujian) return <AdminPage><p className="text-sm text-muted-foreground">Ujian tidak ditemukan.</p></AdminPage>;
  const users = usersRepo.all();
  const units = unitAkademikRepo.all();
  const unitYangIkut = units.filter((u) => ujian.groupIds.includes(u.id));

  const peserta = users.filter(
    (u) =>
      u.role === "mahasiswa" &&
      ujian.groupIds.includes(u.unitId ?? "") &&
      (selectedUnit === "all" || u.unitId === selectedUnit) &&
      (u.namaLengkap.toLowerCase().includes(search.toLowerCase()) || 
       u.username.toLowerCase().includes(search.toLowerCase()))
  );


  return (
    <AdminPage className="mx-auto max-w-6xl pb-12">
      <AdminPageHeader
        title={`Peserta: ${ujian.nama}`}
        description={`${peserta.length} peserta dari ${unitYangIkut.length} unit${ujian.groupIds.length === 0 ? " (belum ditentukan)" : ""}.`}
        action={(
          <Button variant="outline" asChild>
            <Link to="/admin/peserta/kartu"><Printer className="mr-1 h-4 w-4" /> Cetak Kartu</Link>
          </Button>
        )}
      />

      <AdminPageContent>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Peserta yang berhak ikut</h2>
            <p className="mt-1 text-xs text-muted-foreground">Filter daftar berdasarkan unit atau cari nama peserta.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)] sm:items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Unit</label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Unit</SelectItem>
                  {unitYangIkut.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Cari peserta</label>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="search"
                  aria-label="Cari peserta"
                  placeholder="Cari nama atau username..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t pt-3">
            <span className="text-xs font-medium text-muted-foreground">Unit aktif:</span>
            {unitYangIkut.length > 0 ? unitYangIkut.map((u) => (
              <span key={u.id} className="rounded-md bg-accent px-2 py-1 text-xs font-medium">{u.nama}</span>
            )) : (
              <span className="text-xs text-muted-foreground">Belum ada unit peserta</span>
            )}
          </div>
        </CardContent>
      </AdminPageContent>

      <AdminPageContent className="p-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-14 p-4">#</th>
                <th className="p-4">Username</th>
                <th className="p-4">Nama</th>
                <th className="p-4">Unit</th>
                <th className="p-4">Status akun</th>
              </tr>
            </thead>
            <tbody>
              {peserta.map((p, i) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-4 text-muted-foreground">{i + 1}</td>
                  <td className="p-4 font-mono text-xs">{p.username}</td>
                  <td className="p-4 font-medium">{p.namaLengkap}</td>
                  <td className="p-4">{units.find((u) => u.id === p.unitId)?.nama ?? "-"}</td>
                  <td className="p-4">{p.aktif ? "Aktif" : "Nonaktif"}</td>
                </tr>
              ))}
              {peserta.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    Tidak ada peserta untuk ujian ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </CardContent>
      </AdminPageContent>
    </AdminPage>
  );
}
