import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { revokeUserSessionsServer, upsertUserServer, getUsersList, mutateUserServer } from "@/lib/server/users/functions";
import { getUnitAkademikList } from "@/lib/server/akademik/functions";
import { uid } from "@/lib/cbt/storage";
import type { Role, User, UnitAkademik } from "@/lib/cbt/types";
import {
  Button as AntButton,
  ConfigProvider,
  Flex,
  Input as AntInput,
  Select as AntSelect,
  Space,
  Table as AntTable,
  Tag,
  Tooltip,
  Typography,
  theme as antdTheme,
  type TableColumnsType,
} from "antd";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPage, AdminPageHeader, AdminPageContent } from "@/components/cbt/AdminPage";
import { Pencil, Trash2, Plus, LogOut, Search, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
  loader: async () => {
    const [allUsers, units] = await Promise.all([
      getUsersList(),
      getUnitAkademikList()
    ]);
    return { allUsers, units };
  }
});

function UsersPage() {
  const { allUsers, units } = Route.useLoaderData();
  const router = useRouter();
  
  // NOTE: Server-side pagination is recommended for large datasets.
  const users = (allUsers as User[]).filter((u: User) => u.role !== "mahasiswa");

  const [editing, setEditing] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [logoutId, setLogoutId] = useState<string | null>(null);
  
  const [query, setQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [isDark, setIsDark] = useState(false);

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
    router.invalidate();
  }

  const filtered = users.filter((u) =>
    (filterRole === "all" || u.role === filterRole) &&
    (query === "" || u.namaLengkap.toLowerCase().includes(query.toLowerCase()) || u.username.toLowerCase().includes(query.toLowerCase()))
  );

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, filterRole]);


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
      render: (name: string) => <Typography.Text type="secondary">{name}</Typography.Text>,
    },
    {
      title: "Peran",
      dataIndex: "role",
      key: "role",
      align: "center",
      render: (role: Role) => (
        <Tag bordered color="default" className="rounded-full px-3">
          {role === "super_admin" ? "Super Admin" : role === "admin_prodi" ? "Admin Jurusan" : "Evaluator"}
        </Tag>
      ),
    },
    {
      title: "Unit / Jurusan",
      key: "unit",
      render: (_: unknown, user: User) => (
        <Typography.Text type="secondary">
          {user.role === "super_admin" ? "Semua Unit (Global)" : units.find((unit) => unit.id === user.unitId)?.nama ?? "Tanpa Unit"}
        </Typography.Text>
      ),
    },
    {
      title: "Status",
      key: "status",
      align: "center",
      render: (_: unknown, user: User) => (
        <Tag
          bordered
          color={user.aktif ? "success" : "default"}
          className="min-w-20 rounded-full px-3"
          icon={<span className={`mr-1 inline-block size-1.5 rounded-full ${user.aktif ? "bg-emerald-500" : "bg-slate-400"}`} />}
        >
          {user.aktif ? "Aktif" : "Nonaktif"}
        </Tag>
      ),
    },
    {
      title: "Aksi",
      key: "actions",
      align: "center",
      render: (_: unknown, user: User) => (
        <Space size={4}>
          <Tooltip title="Edit pengguna">
            <AntButton
              aria-label={`Edit ${user.username}`}
              icon={<Pencil size={17} aria-hidden="true" />}
              onClick={() => { setEditing(user); setOpen(true); }}
            />
          </Tooltip>
          <Tooltip title="Hentikan sesi">
            <AntButton
              aria-label={`Hentikan sesi ${user.username}`}
              type="text"
              className="!text-amber-600"
              icon={<LogOut size={17} aria-hidden="true" />}
              onClick={() => setLogoutId(user.id)}
            />
          </Tooltip>
          <Tooltip title="Hapus pengguna">
            <AntButton
              aria-label={`Hapus ${user.username}`}
              type="text"
              danger
              icon={<Trash2 size={17} aria-hidden="true" />}
              onClick={() => setDeleteId(user.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  async function confirmDelete() {
    if (!deleteId) return;
    const res = await mutateUserServer({ data: { action: "remove", payload: { id: deleteId } } });
    if (res.ok) {
      toast.success("Pengguna berhasil dihapus");
      refresh();
    } else {
      toast.error(res.error ?? "Gagal menghapus pengguna");
    }
    setDeleteId(null);
  }

  async function confirmLogout() {
    if (!logoutId) return;
    try {
      const res = await revokeUserSessionsServer({ data: { userId: logoutId } });
      if (res.ok) {
        toast.success("Sesi berhasil dihentikan. Pengguna akan ter-logout.");
      } else {
        toast.error(res.error ?? "Gagal menghentikan sesi");
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat menghentikan sesi");
    } finally {
      setLogoutId(null);
    }
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: "#16a34a", borderRadius: 12, fontFamily: "inherit" },
      }}
    >
      <AdminPage>
        <AdminPageHeader
          title="Pengguna Sistem"
          description="Kelola akses akun admin, admin jurusan, dan evaluator."
          action={
            <div className="flex flex-wrap gap-2">
              <Link to="/admin/users/roles">
                <AntButton size="large" icon={<ShieldCheck size={17} aria-hidden="true" />}>
                  Hak Akses Role
                </AntButton>
              </Link>
              <AntButton
                type="primary"
                size="large"
                icon={<Plus size={17} aria-hidden="true" />}
                onClick={() => { setEditing(null); setOpen(true); }}
              >
                Tambah Akun
              </AntButton>
            </div>
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
            aria-label="Filter peran"
            value={filterRole}
            onChange={setFilterRole}
            size="large"
            className="w-full sm:w-56"
            options={[
              { value: "all", label: "Semua Peran" },
              { value: "super_admin", label: "Super Admin" },
              { value: "admin_prodi", label: "Admin Jurusan" },
              { value: "evaluator", label: "Evaluator" },
            ]}
          />
        </Flex>

        <AdminPageContent className="p-0">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <AntTable<User>
              rowKey="id"
              columns={columns}
              dataSource={filtered}
              size="middle"
              scroll={{ x: 900 }}
              pagination={{
                current: currentPage,
                pageSize: itemsPerPage,
                total: filtered.length,
                showSizeChanger: false,
                showTotal: (total, range) => `Menampilkan ${range[0]}–${range[1]} dari ${total} admin`,
              }}
              onChange={(pagination) => setCurrentPage(pagination.current ?? 1)}
              locale={{ emptyText: "Tidak ada data pengguna yang sesuai." }}
            />
          </div>
        </AdminPageContent>

      <UserDialog open={open} onOpenChange={setOpen} editing={editing} onSaved={refresh} units={units} />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Hapus Pengguna
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus akun admin ini secara permanen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={confirmDelete}>Hapus Permanen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Logout Confirmation Dialog */}
      <Dialog open={!!logoutId} onOpenChange={(v) => !v && setLogoutId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-600 flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Hentikan Sesi
            </DialogTitle>
            <DialogDescription>
              Aksi ini akan mengeluarkan (*force logout*) pengguna ini dari semua perangkat yang sedang terhubung. Lanjutkan?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setLogoutId(null)}>Batal</Button>
            <Button onClick={confirmLogout} className="bg-amber-600 hover:bg-amber-700 text-white">Hentikan Sesi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </AdminPage>
    </ConfigProvider>
  );
}

function UserDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
  units,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: User | null;
  onSaved: (user: User) => void;
  units: UnitAkademik[];
}) {
  const [form, setForm] = useState({
    username: "",
    namaLengkap: "",
    role: "admin_prodi" as Role,
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
      role: editing?.role ?? "admin_prodi",
      unitId: editing?.unitId ?? "none",
      aktif: editing?.aktif ?? true,
      password: "",
    });
  }, [editing, open]);

  async function save() {
    if (!form.username.trim() || !form.namaLengkap.trim()) {
      toast.error("Username dan nama wajib diisi");
      return;
    }

    setIsSaving(true);
    try {
      const res = await upsertUserServer({
        data: {
          id: editing?.id ?? uid("u_"),
          username: form.username.trim(),
          namaLengkap: form.namaLengkap.trim(),
          role: form.role,
          aktif: form.aktif,
          allowedTopikIds: editing?.allowedTopikIds ?? [],
          unitId: form.unitId === "none" || !form.unitId ? undefined : form.unitId,
          detail: editing?.detail,
          createdAt: editing?.createdAt ?? Date.now(),
          newPassword: form.password.trim() || undefined,
        },
      });

      if (!res.ok) {
        toast.error(res.error ?? "Gagal menyimpan pengguna");
        return;
      }

      toast.success(editing ? "Pengguna diperbarui" : "Pengguna ditambahkan");
      onSaved(res.user);
      onOpenChange(false);
    } catch (e) {
      toast.error("Terjadi kesalahan sistem saat menyimpan");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Pengguna" : "Pengguna Baru"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Username</Label>
            <Input 
              placeholder="Masukkan username"
              value={form.username} 
              onChange={(e) => setForm({ ...form, username: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <Label>Nama lengkap</Label>
            <Input
              placeholder="Masukkan nama lengkap"
              value={form.namaLengkap}
              onChange={(e) => setForm({ ...form, namaLengkap: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih hak akses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin_prodi">Admin Jurusan</SelectItem>
                <SelectItem value="evaluator">Evaluator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(form.role === "admin_prodi" || form.role === "mahasiswa") && (
            <div className="space-y-2">
              <Label>Unit Akademik (Opsional)</Label>
              <Select value={form.unitId} onValueChange={(v) => setForm({ ...form, unitId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih unit (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">(Tidak Ada Unit)</SelectItem>
                  {units.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>{editing ? "Password baru (kosongkan jika tidak diubah)" : "Password"}</Label>
            <Input
              type="password"
              placeholder={editing ? "Biarkan kosong jika tidak ingin mengubah" : "Masukkan password default"}
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
