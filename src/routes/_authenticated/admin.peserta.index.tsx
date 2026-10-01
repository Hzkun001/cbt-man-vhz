import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Button as AntButton,
  ConfigProvider,
  Empty,
  Flex,
  Input as AntInput,
  Pagination,
  Select as AntSelect,
  Space,
  Table as AntTable,
  Tag,
  Tooltip,
  Typography,
  theme as antdTheme,
  type TableColumnsType,
} from "antd";
import { upsertUserServer, getUsersList, mutateUserServer } from "@/lib/server/users/functions";
import { getUnitAkademikList } from "@/lib/server/akademik/functions";
import { uid } from "@/lib/cbt/storage";
import type { UnitAkademik, User } from "@/lib/cbt/types";

import { AdminPage, AdminPageHeader, AdminPageContent } from "@/components/cbt/AdminPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pencil,
  Trash2,
  Plus,
  Printer,
  Upload,
  Users as UsersIcon,
  Activity,
  Search,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/cbt/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/admin/peserta/")({
  component: PesertaPage,
  loader: async () => {
    const [allUsers, allUnits] = await Promise.all([getUsersList(), getUnitAkademikList()]);
    return { allUsers, allUnits };
  },
});

type PesertaWithPwd = User & { _initialPassword?: string };

function PesertaPage() {
  const { confirm, dialog } = useConfirmDialog();
  const { allUsers, allUnits } = Route.useLoaderData();
  const router = useRouter();

  const peserta = (allUsers as User[]).filter((u: User) => u.role === "mahasiswa");
  const units = allUnits;

  const [editing, setEditing] = useState<PesertaWithPwd | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [filterUnit, setFilterUnit] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [isDark, setIsDark] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const root = document.documentElement;
    const syncColorScheme = () => setIsDark(root.classList.contains("dark"));
    const observer = new MutationObserver(syncColorScheme);
    syncColorScheme();
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  function refresh() {
    setSelectedIds([]);
    router.invalidate();
  }

  async function handleBulkDelete() {
    if (
      !(await confirm({
        title: "Hapus peserta",
        description: `Hapus ${selectedIds.length} peserta terpilih secara permanen?`,
        confirmLabel: "Hapus",
      }))
    )
      return;
    const res = await mutateUserServer({
      data: { action: "bulkRemove", payload: { ids: selectedIds } },
    });
    if (res.ok) {
      toast.success(`${selectedIds.length} peserta berhasil dihapus`);
      refresh();
    } else {
      toast.error(res.error ?? "Gagal menghapus peserta");
    }
  }

  const filtered = peserta.filter(
    (p) =>
      (filterUnit === "all" || p.unitId === filterUnit) &&
      (query === "" ||
        p.namaLengkap.toLowerCase().includes(query.toLowerCase()) ||
        p.username.toLowerCase().includes(query.toLowerCase())),
  );

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, filterUnit]);

  useEffect(() => {
    if (currentPage > Math.ceil(filtered.length / itemsPerPage)) {
      setCurrentPage(Math.max(1, Math.ceil(filtered.length / itemsPerPage)));
    }
  }, [currentPage, filtered.length]);

  async function importExcel(file: File) {
    setIsImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      let added = 0;
      let failed = 0;
      const localUnits = [...units];

      for (const r of rows) {
        const username = String(r.username ?? r.Username ?? "").trim();
        const nama = String(r.nama ?? r.Nama ?? r.namaLengkap ?? "").trim();
        const password = String(r.password ?? r.Password ?? "").trim();
        const unitName = String(r.group ?? r.Group ?? r.kelas ?? r.unit ?? "").trim();
        if (!username || !nama || !password) {
          failed++;
          continue;
        }
        const unit = unitName
          ? localUnits.find((x: UnitAkademik) => x.nama.toLowerCase() === unitName.toLowerCase())
          : undefined;
        if (unitName && !unit) {
          failed++;
          continue;
        }
        const unitId = unit?.id;

        const existingUser = (allUsers as User[]).find((u: User) => u.username === username);
        const userId = existingUser ? existingUser.id : uid("u_");

        const res = await upsertUserServer({
          data: {
            id: userId,
            username,
            namaLengkap: nama,
            role: "mahasiswa",
            allowedTopikIds: existingUser ? existingUser.allowedTopikIds : [],
            unitId: unitId,
            aktif: true,
            createdAt: existingUser ? existingUser.createdAt : Date.now(),
            newPassword: password,
          },
        });
        if (res.ok) {
          added++;
        } else {
          failed++;
        }
      }
      if (failed > 0) {
        toast.warning(`${added} peserta diimport, ${failed} gagal diimport`);
      } else {
        toast.success(`${added} peserta berhasil diimport`);
      }
      refresh();
    } catch (e) {
      toast.error("Gagal memproses file Excel");
    } finally {
      setIsImporting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const res = await mutateUserServer({ data: { action: "remove", payload: { id: deleteId } } });
    if (res.ok) {
      toast.success("Peserta berhasil dihapus");
      refresh();
    } else {
      toast.error(res.error ?? "Gagal menghapus peserta");
    }
    setDeleteId(null);
  }

  const columns: TableColumnsType<User> = [
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
      onCell: () => ({ style: { paddingInlineStart: 20 } }),
      onHeaderCell: () => ({ style: { paddingInlineStart: 20 } }),
      render: (username: string) => <Typography.Text strong>{username}</Typography.Text>,
    },
    {
      title: "Nama Lengkap",
      dataIndex: "namaLengkap",
      key: "namaLengkap",
      render: (nama: string) => <Typography.Text type="secondary">{nama}</Typography.Text>,
    },
    {
      title: "Grup / Kelas",
      key: "unit",
      align: "center",
      render: (_: unknown, peserta: User) => (
        <Tag bordered color="default" className="rounded-full px-3 font-medium">
          {units.find((unit) => unit.id === peserta.unitId)?.nama ?? "-"}
        </Tag>
      ),
    },
    {
      title: "Status",
      key: "status",
      align: "center",
      render: (_: unknown, peserta: User) => (
        <Tag
          bordered
          color={peserta.aktif ? "success" : "default"}
          className="min-w-20 rounded-full px-3"
          icon={
            <span
              className={`mr-1 inline-block size-1.5 rounded-full ${peserta.aktif ? "bg-emerald-500" : "bg-slate-400"}`}
            />
          }
        >
          {peserta.aktif ? "Aktif" : "Nonaktif"}
        </Tag>
      ),
    },
    {
      title: "Aksi",
      key: "actions",
      align: "center",
      render: (_: unknown, peserta: User) => (
        <Space size={4}>
          <Tooltip title="Edit peserta">
            <AntButton
              aria-label={`Edit ${peserta.username}`}
              icon={<Pencil size={17} aria-hidden="true" />}
              onClick={() => {
                setEditing(peserta);
                setOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Hapus peserta">
            <AntButton
              aria-label={`Hapus ${peserta.username}`}
              type="text"
              danger
              icon={<Trash2 size={17} aria-hidden="true" />}
              onClick={() => setDeleteId(peserta.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: "#16a34a", borderRadius: 12, fontFamily: "inherit" },
      }}
    >
      <AdminPage>
        <AdminPageHeader
          title="Akun Peserta"
          description="Kelola data mahasiswa, grup kelas, dan import akun dari Excel."
          action={
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importExcel(f);
                  e.target.value = "";
                }}
              />
              <AntButton
                size="large"
                onClick={() => fileRef.current?.click()}
                disabled={isImporting}
                icon={
                  isImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload size={17} aria-hidden="true" />
                  )
                }
              >
                Import Excel
              </AntButton>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
              <Link to="/admin/akademik">
                <AntButton size="large" icon={<UsersIcon size={17} aria-hidden="true" />}>
                  Unit Akademik
                </AntButton>
              </Link>
              <Link to="/admin/peserta/online">
                <AntButton size="large" icon={<Activity size={17} aria-hidden="true" />}>
                  Live Ujian
                </AntButton>
              </Link>
              <Link to="/admin/peserta/kartu">
                <AntButton size="large" icon={<Printer size={17} aria-hidden="true" />}>
                  Cetak Kartu
                </AntButton>
              </Link>
              <AntButton
                type="primary"
                size="large"
                icon={<Plus size={17} aria-hidden="true" />}
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                Tambah Akun
              </AntButton>
            </>
          }
        />

        <Flex wrap="wrap" gap={12} style={{ marginBottom: 24 }}>
          <AntInput
            allowClear
            aria-label="Cari nama atau username"
            placeholder="Cari nama atau username..."
            prefix={<Search size={17} aria-hidden="true" className="text-slate-500" />}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="!h-12 w-full sm:!w-[27rem]"
          />
          <AntSelect
            aria-label="Filter unit akademik"
            value={filterUnit}
            onChange={setFilterUnit}
            size="large"
            className="w-full sm:w-64"
            options={[
              { value: "all", label: "Semua Unit" },
              ...units.map((unit) => ({ value: unit.id, label: unit.nama })),
            ]}
          />
          {selectedIds.length > 0 && (
            <AntButton
              danger
              icon={<Trash2 size={17} />}
              onClick={handleBulkDelete}
              className="sm:ml-auto"
            >
              Hapus Terpilih ({selectedIds.length})
            </AntButton>
          )}
        </Flex>

        <AdminPageContent className="p-0">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <AntTable<User>
              rowKey="id"
              columns={columns}
              dataSource={filtered}
              size="middle"
              scroll={{ x: 900 }}
              rowSelection={{
                selectedRowKeys: selectedIds,
                preserveSelectedRowKeys: true,
                onChange: (keys) => setSelectedIds(keys.map(String)),
                getCheckboxProps: (peserta) => ({ "aria-label": `Pilih ${peserta.namaLengkap}` }),
              }}
              pagination={{
                current: currentPage,
                pageSize: itemsPerPage,
                total: filtered.length,
                showSizeChanger: false,
                hideOnSinglePage: true,
                showTotal: (total, range) =>
                  `Menampilkan ${range[0]}–${range[1]} dari ${total} peserta`,
              }}
              onChange={(pagination) => setCurrentPage(pagination.current ?? 1)}
              locale={{ emptyText: <Empty description="Tidak ada data peserta yang sesuai." /> }}
            />
          </div>
        </AdminPageContent>

        <PesertaDialog
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          units={units}
          onSaved={refresh}
        />

        <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-rose-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Hapus Peserta
              </DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin menghapus data peserta ini? Tindakan ini tidak dapat
                dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Batal
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Hapus Permanen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {dialog}
      </AdminPage>
    </ConfigProvider>
  );
}

function PesertaDialog({
  open,
  onOpenChange,
  editing,
  units,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: User | null;
  units: UnitAkademik[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    username: "",
    namaLengkap: "",
    unitId: "",
    aktif: true,
    password: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      username: editing?.username ?? "",
      namaLengkap: editing?.namaLengkap ?? "",
      unitId: editing?.unitId ?? "",
      aktif: editing?.aktif ?? true,
      password: "",
    });
  }, [editing, open]);

  async function save() {
    if (!form.username.trim() || !form.namaLengkap.trim()) {
      toast.error("Username dan Nama Lengkap wajib diisi");
      return;
    }

    setIsSaving(true);
    try {
      const res = await upsertUserServer({
        data: {
          id: editing?.id ?? uid("u_"),
          username: form.username.trim(),
          namaLengkap: form.namaLengkap.trim(),
          role: "mahasiswa",
          allowedTopikIds: editing?.allowedTopikIds ?? [],
          unitId: form.unitId === "none" ? undefined : form.unitId || undefined,
          detail: editing?.detail,
          aktif: form.aktif,
          createdAt: editing?.createdAt ?? Date.now(),
          newPassword: form.password.trim() || undefined,
        },
      });

      if (!res.ok) {
        toast.error(res.error ?? "Gagal menyimpan peserta");
        return;
      }

      toast.success(editing ? "Peserta berhasil diperbarui" : "Peserta baru ditambahkan");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Data Peserta" : "Tambah Peserta Baru"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Username</Label>
            <Input
              placeholder="Misal: 19001234"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Nama Lengkap</Label>
            <Input
              placeholder="Masukkan nama lengkap"
              value={form.namaLengkap}
              onChange={(e) => setForm({ ...form, namaLengkap: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Unit Akademik / Kelas</Label>
            <Select value={form.unitId} onValueChange={(v) => setForm({ ...form, unitId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="(Tanpa Unit)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Tidak ada --</SelectItem>
                {units.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{editing ? "Password Baru (Opsional)" : "Password"}</Label>
            <Input
              type="password"
              placeholder={editing ? "Kosongkan jika tidak ingin diubah" : "Masukkan password awal"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Batal
          </Button>
          <Button onClick={save} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {editing ? "Simpan Perubahan" : "Tambahkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
